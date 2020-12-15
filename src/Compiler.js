/**
 * cc-compiler - Compiler.js
 * The main compiler
 * 
 * Author: Carl Ian Voller
 */

const EventEmitter = require('events');
const e = require('express');
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

	this.opts = opts;
	this.stdinQueue = [];
	this.isLaunched = false;

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

	// Copy payload script into code directory and create output files.
	fs.copyFileSync(`${__dirname}/payload/script.sh`, `${this.opts.pathToFiles}/script.sh`);
	if(this.opts.langNum === 10) { fs.copyFileSync(`${__dirname}/payload/javaRunner.sh`, `${this.opts.pathToFiles}/javaRunner.sh`); }
	fs.writeFileSync(`${this.opts.pathToFiles}/logfile.txt`, "");
	fs.writeFileSync(`${this.opts.pathToFiles}/errors`, "");

	exec(`chmod -R 777 ${this.opts.pathToFiles}`);
	
	let cmd = `${__dirname}/scripts/runner.sh `
		  + `${this.opts.timeOut}s ${this.opts.containerName} `
          + `--name ${this.opts.containerName} -e 'NODE_PATH=/usr/local/lib/node_modules' `
          + `--cpus=0.25 -m 200m -iv '${this.opts.pathToFiles}':/usercode cc-compiler `
          + `/usercode/script.sh ${runner[0]} "${this.opts.mainFile}" ${runner[1]} `;
	this.process = exec(cmd, (e) => { if(e && !e.killed && e.code !== 137) { this.emit("error", e.message); return this._cleanUp(); }});

	/**
	 * Compilation variables
	 * @param {Boolean} isLaunched - Compiler launch state
	 * @param {Number} count - Seconds elapsed from start of compilation
	 * @param {Number} dataLen / @param {Number} errLen - Length of already read data from output files.
	 * @param {Boolean} isReadingInc - If program is in the process of reading the output files.
	 */
	this.isLaunched = false;
	let [dataLen, errLen] = [0, 0];
	let isReadingInc = false,
		isReadingErr = false,
		sentDone = false;

	this.checkStatus = setInterval(() => {
		// Check if docker container is still running
		exec(`docker ps | grep ${this.opts.containerName}`, (err, out) => {

			// Checks if docker container has been launched. If so, emit launched event.
			if (out && !this.isLaunched) { this.isLaunched = !0; this.emit("launched"); return initWatchers(); }

			let timedOut = out.indexOf("minute") > -1;
			if (((!out && this.isLaunched) || timedOut) && !sentDone) {
				readFile(`${this.opts.pathToFiles}/logfile.txt`, false);
				readFile(`${this.opts.pathToFiles}/errors`, true);

				let time = "";
				if(fs.existsSync(`${this.opts.pathToFiles}/time`)) { time = fs.readFileSync(`${this.opts.pathToFiles}/time`, 'utf-8'); }
				
				this.emit("done", { err: "", out: "", time: time, timedOut: timedOut });
				sentDone = true;
				this.process = null;
				return this._cleanUp();
			}
		});
	}, 100);

	let initWatchers = () => {
		let lastLogStamp = 0,
            lastErrStamp = 0;
		
		// Read files on launch incase program has already outputted data before watchers are attached
		readFile(`${this.opts.pathToFiles}/logfile.txt`, false);
		readFile(`${this.opts.pathToFiles}/errors`, true);
		
		// Create an FS.Watcher object to watch for file changes on /logfile.txt
		this.logWatcher = fs.watch(this.opts.pathToFiles + "/logfile.txt", (ev, name) => {
			let stamp = new Date().getTime();
			lastLogStamp = stamp;
			if (name && !isReadingInc) {
				setTimeout(() => {
					if(lastLogStamp === stamp) {
						readFile(`${this.opts.pathToFiles}/logfile.txt`, false);
					}
				}, 50);
			}
		});

		// Create an FS.Watcher object to watch for file changes on /errors
		this.errWatcher = fs.watch(this.opts.pathToFiles + "/errors", (ev, name) => {
			let stamp = new Date().getTime();
			lastErrStamp = stamp;
			if (name && !isReadingErr) {
				setTimeout(() => {
					if(lastErrStamp === stamp) {
						readFile(`${this.opts.pathToFiles}/errors`, true);
					}
				}, 50);
			}
		});
	}

	let readFile = (path, isErr) => {

		// Check if file is already being read.
		if (isErr && isReadingErr || !isErr && isReadingInc) { return; }

		let isReading = (b) => { if(isErr) { isReadingErr = b; } else { isReadingInc = b; } }

		isReading(true);

		fs.open(path, "r", (err, fd) => {
					
			// Ignore errors and try again at the next interval.
			if (err || !fd) { return isReading(false); }

			fs.read(fd, Buffer.alloc(100000), 0, 100000, (isErr ? errLen : dataLen), (err, l, b) => {

				let out = b.toString("utf8", 0, l);
				if (!out) { out = ""; } else {
					if (out !== "\nCompiler Stopped.\n") {
						if (isErr) { errLen += l } else { dataLen += l };
					}
				}

				// If there was no change in {out}, just return.
				if (out === "") { return isReading(false); }

				// If change was present & isLaunched is still false, set isLaunched to true.
				if (!this.isLaunched && out !== "") { this.isLaunched = true; this.emit("launched");	}

				let incObj = {};
				incObj[isErr ? 'err' : 'out'] = out;

				if(this.process) { this.emit("inc", incObj); }

				isReading(false);
			});
		});
	}
}

/**
 * Handles STDIN to the running program.
 * @param {string} text - Text to push to the program
 */
Compiler.prototype.push = async function (text) {
	this.stdinQueue.push(text);
	let newStdinQueue = [];
	if (this.process && this.isLaunched) {
		for (let i = 0; i < this.stdinQueue.length; i++) {
			try {
                await streamWrite(this.process.stdin, this.stdinQueue[i] + "\n");
            } catch (e) {
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
	if (this.process && this.isLaunched) {

		// Kill processes
		this.process.kill();

		try { fs.appendFileSync(`${this.opts.pathToFiles}/errors`, '\nCompiler Stopped.\n'); } catch(e) { console.error(e); }

        setTimeout(() => exec(`docker rm -f ${this.opts.containerName}`), 200);
		
	}
}

/**
 * Cleans up after compilation ends.
 */
Compiler.prototype._cleanUp = function() {
	
	try { this.logWatcher.close(); } catch(e) {}
	try { this.errWatcher.close(); } catch(e) {}

	clearInterval(this.checkStatus);

	// Wait 200ms so any attached clients have time to detect the stop.
	setTimeout(() => {
		try { fs.unlinkSync(`${this.opts.pathToFiles}/completed`); } catch(e) {}
		try { fs.unlinkSync(`${this.opts.pathToFiles}/logfile.txt`); } catch(e) {}
		try { fs.unlinkSync(`${this.opts.pathToFiles}/time`); } catch(e) {}
		try { fs.unlinkSync(`${this.opts.pathToFiles}/errors`); } catch(e) {}
		try { fs.unlinkSync(`${this.opts.pathToFiles}/script.sh`); } catch(e) {}
	}, 200);
}