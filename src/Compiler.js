/**
 * cc-compiler - Compiler.js
 * The main compiler
 * 
 * Author: Carl Ian Voller
 */

const EventEmitter = require('events');
const exec = require("child_process").exec;
const fs = require('fs');
const streamWrite = require('@rauschma/stringio').streamWrite;
const compilers = require("./langList.json");

/**
 * Creates a compiler instance.
 * @param {Object} opts - Options object
 * @param {Number} opts.timeOut - Time before stopping compilation
 * @param {Number} opts.langNum - Index of Language to compile file in
 * @param {String} opts.mainFile - File to execute on compilation
 * @param {String} opts.pathToFiles - Absolute path to location of files
 * @param {String} opts.containerName	- Name of docker container
 */
function Compiler(opts) {
	if (!(this instanceof Compiler)) return new Compiler(opts);

	// Parameter checks
	if (!opts || opts === {}) throw "Options are required to run the compiler.";
	if (!opts.timeOut || typeof opts.timeOut !== "number") throw "Required param 'timeOut' missing or invalid.";
	if ((!opts.langNum && opts.langNum !== 0) || typeof opts.langNum !== "number") throw "Required param 'langNum' missing or invalid.";
	if (!opts.mainFile || typeof opts.mainFile !== "string") throw "Required param 'mainFile' missing or invalid.";
	if (!opts.pathToFiles || typeof opts.pathToFiles !== "string") throw "Required param 'pathToFiles' missing or invalid.";
	if (!opts.containerName || typeof opts.containerName !== "string") throw "Required param 'containerName' missing or invalid.";

	// Copy payload script into code directory.
	fs.copyFileSync(`${__dirname}/payload/script.sh`, `${opts.pathToFiles}/script.sh`);

	exec(`chmod -R 777 ${opts.pathToFiles}`);

	this.opts = opts;
	this.stdinQueue = [];

	EventEmitter.call(this);
}

module.exports = Compiler;

Compiler.prototype = Object.create(EventEmitter.prototype);
Compiler.prototype.constructor = Compiler;

/**
 * Compilation function 
 */
Compiler.prototype.exec = function () {
	const runner = compilers[this.opts.langNum];
	let cmd = `${__dirname}/scripts/runner.sh `
          + `${this.opts.timeOut}s ${this.opts.containerName} `
          + `--name ${this.opts.containerName} -e 'NODE_PATH=/usr/local/lib/node_modules' `
          + `--cpus=0.25 -m 200m -iv '${this.opts.pathToFiles}':/usercode cc-compiler `
          + `/usercode/script.sh ${runner[0]} "${this.opts.mainFile}" ${runner[1]} `;
	this.process = exec(cmd);

	/**
	 * Compilation variables
	 * @param {Boolean} isLaunched - Compiler launch state
	 * @param {Number} count - Seconds elapsed from start of compilation
	 * @param {Number} dataLen / @param {Number} errLen - Length of already read data from output files.
	 * @param {Boolean} isReadingInc - If program is in the process of reading the output files.
	 */
	let isLaunched = false;
	let count = 0;
	let [dataLen, errLen] = [0, 0];
	let isReadingInc = false;

	this.checkInterval = setInterval(() => {

		// Check if docker container is still running
		exec(`docker ps | grep ${this.opts.containerName}`, (err, out) => {

			// Checks if docker container has been launched. If so, emit launched event.
			if (out && isLaunched === false) { isLaunched = true; this.emit("launched"); }

			// Checks if compiler has been stopped or should be stopped.
			if ((!out && isLaunched) || count > this.timeOut) {
				clearInterval(this.checkInterval);

				fs.open(this.opts.pathToFiles + "/completed", "r", (err, fd) => {

					// completed failed to open, meaning it was not created and compilation actually didn't finish.
					if (err) { return this.emit("done", { err: "\nCompiler stopped.\n", out: "", time: count, timedOut: true }); }

					if (fd) {
						fs.read(fd, new Buffer(100000), 0, 100000, dataLen, (err, l1, b1) => {
							if (err) { return this.emit("error", err); }
							if (count < this.opts.timeOut) {

								// Compilation didn't time out, check for new errors
								fs.open(this.opts.pathToFiles + "/errors", "r", (err, fd) => {
									if (err || !fd) { return this.emit("error", err); }
									fs.read(fd, new Buffer(100000), 0, 100000, errLen, (err, l2, b2) => {

										// Convert Buffers to Strings, return result in done event.
										let out = b1.toString("utf8", 0, l1);
										let time = `${Math.round(count * 10) / 10}\n`;
										try { time = fs.readFileSync(this.opts.pathToFiles + "/time", "utf8"); } catch (e) { };
										let errors = b2.toString("utf8", 0, l2);
										return this.emit("done", { err: errors, out: out, time: time, timedOut: false });
									});
								});
							} else {

								// Compilation timed out. Check if program has anymore output to be displayed.
								fs.open(this.opts.pathToFiles + "/logfile.txt", "r", (err, fd) => {

									// If an error occurred when reading logfile.txt, means the file is probably too big to be read or simply can't be read.
									if (err) { console.error(err); return this.emit("error", "Output was too large to be read."); }

									fs.read(fd, new Buffer(100000), 0, 100000, dataLen, (err, l1, b1) => {

										// Check error files for any additional errors.
										fs.open(this.opts.pathToFiles + "/errors", "r", (err, fd) => {
											if (err || !fd) { return this.emit("error", err); }
											fs.read(fd, new Buffer(100000), 0, 100000, errLen, (err, l2, b2) => {

												// Convert Buffers to Strings, return result in done event.
												let out = b1.toString("utf8", 0, l1);
												let time = `${Math.round(count * 10) / 10}\n`;
												try { time = fs.readFileSync(this.opts.pathToFiles + "/time", "utf8"); } catch (e) { };
												let errors = b2.toString("utf8", 0, l2);
												errors += "\nExecution Timed Out.\nAny changes made was not saved.\n";
												return this.emit("done", { err: errors, out: out, time: time, timedOut: true });
											});
										});
									});
								});
							}
						});
					} else {

						// Compilation timed out. Check if program has anymore output to be displayed.
						fs.open(this.opts.pathToFiles + "/logfile.txt", "r", (err, fd) => {

							// If an error occurred when reading logfile.txt, means the file is probably too big to be read or simply can't be read.
							if (err) { console.error(err); return this.emit("error", "Output was too large to be read."); }

							fs.read(fd, new Buffer(100000), 0, 100000, dataLen, (err, l1, b1) => {

								// Check error files for any additional errors.
								fs.open(this.opts.pathToFiles + "/errors", "r", (err, fd) => {
									if (err || !fd) { return this.emit("error", err); }
									fs.read(fd, new Buffer(100000), 0, 100000, errLen, (err, l2, b2) => {

										// Convert Buffers to Strings, return result in done event.
										let out = b1.toString("utf8", 0, l1);
										let time = `${Math.round(count * 10) / 10}\n`;
										try { time = fs.readFileSync(this.opts.pathToFiles + "/time", "utf8"); } catch (e) { };
										let errors = b2.toString("utf8", 0, l2);
										errors += "\nExecution Timed Out.\nAny changes made was not saved.\n";
										return this.emit("done", { err: errors, out: out, time: time, timedOut: true });
									});
								});
							});
						});
					}

				});
			} else {

				// Compilation is not finished and neither has it timed out yet.
				// logfile.txt is read per interval for any new changes. If there are any, Compiler will emit an "inc" event.

				if (isReadingInc) { return; }

				// Set isReadingInc = true so files wouldn't be read multiples times at once.
				isReadingInc = true;

				fs.open(this.opts.pathToFiles + "/logfile.txt", "r", (err, fd) => {

					// Ignore errors and try again at the next interval.
					if (err || !fd) { return isReadingInc = false; }

					fs.read(fd, new Buffer(100000), 0, 100000, dataLen, (err, l1, b1) => {

						// Check error file for errors.
						fs.open(this.opts.pathToFiles + "/errors", "r", (err, fd) => {

							// Ignore errors and try again at the next interval.
							if (err || !fd) { return isReadingInc = false; }

							fs.read(fd, new Buffer(100000), 0, 100000, errLen, (err, l2, b2) => {

								let out = b1.toString("utf8", 0, l1);
								if (!out) { out = ""; } else { dataLen += l1; }

								let errors = b2.toString("utf8", 0, l2);
								if (!errors) { errors = "" } else { errLen += l2; }

								// If there was no change in both {out} and {errors}, just return.
								if (out === "" && errors === "") { return isReadingInc = false; }

								// If change was present & isLaunched is still false, set isLaunched to true.
								if (!isLaunched && (out !== "" || errors !== "")) { isLaunched = true; this.emit("launched");	}

								this.emit("inc", { err: errors, out: out });

								isReadingInc = false;
							});
						});
					});
				});
			}
		});
		count += 0.1;
	}, 100);
}

/**
 * Handles STDIN to the running program.
 * @param {string} text - Text to push to the program
 */
Compiler.prototype.push = async function (text) {
	this.stdinQueue.push(text);
	let newStdinQueue = [];
	if (this.process) {
		for (let i = 0; i < this.stdinQueue.length; i++) {
			try { await streamWrite(this.process.stdin, this.stdinQueue[i] + "\n"); } catch (e) {
				newStdinQueue.push(this.stdinQueue[i]);
			}
		}
		this.stdinQueue = newStdinQueue;
	}
}

/**
 * Stops compilation and kills the docker process
 */
Compiler.prototype.stop = function () {
	if (this.process) {

		// Kill process and clear intervals.
		this.process.kill();

		const cmd = `./scripts/stop.sh ${this.opts.containerName}`;
		exec(cmd);
		
		clearInterval(this.interval);
	}
}