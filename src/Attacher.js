/**
 * cc-compiler - Attacher.js
 * Attacher for compiler
 * 
 * Author: Carl Ian Voller
 */

const EventEmitter = require('events');
const exec = require("child_process").exec;
const fs = require('fs');
const streamWrite = require('@rauschma/stringio').streamWrite;

/**
* Creates an Attacher instance.
* @param {Object} opts - Options object
* @param {String} opts.containerName	- Name of docker container
*/
function Attacher(opts) {
    if (!(this instanceof Attacher)) return new Attacher(opts);

    // Parameter checks
    if (!opts || opts === {}) throw "Options are required to run the attacher.";
    if (!opts.pathToFiles || typeof opts.pathToFiles !== "string") throw "Required param 'pathToFiles' missing or invalid.";
    if (!opts.containerName || typeof opts.containerName !== "string") throw "Required param 'containerName' missing or invalid.";

    this.opts = opts;
    this.stdinQueue = [];

    EventEmitter.call(this);
}

module.exports = Attacher;

Attacher.prototype = Object.create(EventEmitter.prototype);
Attacher.prototype.constructor = Attacher;

/**
 * Attach function 
 */
Attacher.prototype.attach = function () {

    // Check if there is a docker container to connect to.
    exec(`docker ps | grep '${this.opts.containerName}'`, (err, out) => {
        if (err || !out) { return this.emit("error", `No container with name '${this.opts.containerName}' found.`); }

        // Bind this.process to the docker container process.
        this.process = exec(`docker attach '${this.opts.containerName}'`);

        /**
         * Compilation variables
         * @param {Boolean} isCompleted - Has compilation finished
         * @param {Number} dataLen / @param {Number} errLen - Length of already read data from output files.
         * @param {Boolean} isReadingInc - If program is in the process of reading the output files.
         */
        let isCompleted = false;
        let [dataLen, errLen] = [0, 0];
        let isReadingInc = false;

        this.checkInterval = setInterval(() => {

            // Checks each interval if container is still running
            exec(`docker ps | grep ${this.opts.containerName}`, (err, out) => {
                if (out === "") {
                    if (isCompleted) { return; }
                    isCompleted = true;
                    clearInterval(this.checkInterval);
                    fs.open(this.opts.pathToFiles + "/completed", "r", (err, fd) => {

                        // completed failed to open, meaning it was not created and compilation was actually stopped elsewhere.
                        if (err) { return this.emit("done", { err: "\nCompiler stopped.\n", out: "", time: count, timedOut: true }); }

                        fs.read(fd, new Buffer(100000), 0, 100000, dataLen, (err, l1, b1) => {

                            // Check error file for errors.
                            fs.open(this.opts.pathToFiles + "/errors", "r", (err, fd) => {

                                // Ignore errors and try again at the next interval.
                                if (err || !fd) { return this.emit("error", err); }

                                fs.read(fd, new Buffer(100000), 0, 100000, errLen, (err, l2, b2) => {

                                    // Convert Buffers to Strings, return result in done event.
                                    let out = b1.toString("utf8", 0, l1);
                                    let time = ``;
                                    try { time = fs.readFileSync(this.opts.pathToFiles + "/time", "utf8"); } catch (e) { };
                                    let errors = b2.toString("utf8", 0, l2);
                                    return this.emit("done", { err: errors, out: out, time: time, timedOut: false });

                                });
                            });
                        });

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

                                    this.emit("inc", { err: errors, out: out });

                                    isReadingInc = false;
                                });
                            });
                        });
                    });
                }
            });
        }, 100);
    });
}

/**
 * Handles STDIN to the running program.
 * @param {string} text - Text to push to the program
 */
Attacher.prototype.push = async function (text) {
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
Attacher.prototype.stop = function () {
	if (this.process) {

		// Kill process and clear intervals.
		this.process.kill();

		const cmd = `./scripts/stop.sh ${this.opts.containerName}`;
		exec(cmd);

		clearInterval(this.interval);
	}
}