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
        this.emit("attached");

        /**
         * Compilation variables
         * @param {Boolean} isCompleted - Has compilation finished
         * @param {Number} dataLen / @param {Number} errLen - Length of already read data from output files.
         * @param {Boolean} isReadingInc - If program is in the process of reading the output files.
         */

        let [dataLen, errLen] = [0, 0];
        let isReadingInc = false,
            isReadingErr = false,
            isWatching = false,
            sentDone = false;

        this.checkStatus = setInterval(() => {
            // Check if docker container is still running
            exec(`docker ps | grep ${this.opts.containerName}`, (err, out) => {

                let timedOut = out.indexOf("minute") > -1;

                if (out && !isWatching && !timedOut) { isWatching = true; return initWatchers(); }

                if ((!out || timedOut) && !sentDone) {
                    sentDone = true;
                    readFile(`${this.opts.pathToFiles}/logfile.txt`, false);
                    readFile(`${this.opts.pathToFiles}/errors`, true);
                    
                    this._cleanUp();

                    let time = "";
                    if(fs.existsSync(`${this.opts.pathToFiles}/time`)) { time = fs.readFileSync(`${this.opts.pathToFiles}/time`, 'utf-8'); }
                    
                    return this.emit("done", { err: "", out: "", time: time, timedOut: timedOut });
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
            if ((isErr && isReadingErr) || (!isErr && isReadingInc)) { return; }

            let isReading = (b) => { if (isErr) { isReadingErr = b; } else { isReadingInc = b; } }

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

                    let incObj = {};
                    incObj[isErr ? 'err' : 'out'] = out;

                    if(this.process) { this.emit("inc", incObj); }

                    isReading(false);
                });
            });
        }
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
Attacher.prototype.stop = function () {
    if (this.process) {

        // Kill process and clear intervals.
        this.process.kill();

        fs.appendFileSync(`${this.opts.pathToFiles}/errors`, '\nCompiler Stopped.\n');

        setTimeout(() => exec(`docker rm -f ${this.opts.containerName}`), 200);

    }
}

/**
 * Cleans up after compilation ends.
 */
Attacher.prototype._cleanUp = function() {
	
	//this.logWatcher.close();
    //this.errWatcher.close();
    
    clearInterval(this.checkStatus);

    this.process = null;
    this.checkStatus = null;

}