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
	
	fs.writeFileSync(`${this.opts.pathToFiles}/logfile.txt`, "");
	fs.writeFileSync(`${this.opts.pathToFiles}/errors`, "");
	
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
	let [dataLen, errLen] = [0, 0];
	let isReadingInc = false,
		isReadingErr = false;

	this.checkStatus = setInterval(() => {
		// Check if docker container is still running
		exec(`docker ps | grep ${this.opts.containerName}`, (err, out) => {

			// Checks if docker container has been launched. If so, emit launched event.
			if (out && !isLaunched) { isLaunched = !0; this.emit("launched"); return initWatchers(); }

			if (!out && isLaunched) {
				readFile(`${this.opts.pathToFiles}/logfile.txt`, false);
				readFile(`${this.opts.pathToFiles}/errors`, true);
				
				this.emit("done", { err: "", out: "", time: "", timedOut: false });
				this.process = null;
				return this._cleanUp();
			}
		});
	}, 100);

	let initWatchers = () => {
		let ltimeOut = !1,
			eTimeOut = !1;
		
		// Read files on launch incase program has already outputted data before watchers are attached
		readFile(`${this.opts.pathToFiles}/logfile.txt`, false);
		readFile(`${this.opts.pathToFiles}/errors`, true);
		
		// Create an FS.Watcher object to watch for file changes on /logfile.txt
		this.logWatcher = fs.watch(this.opts.pathToFiles + "/logfile.txt", (ev, name) => {
			if(name && !ltimeOut && !isReadingInc) {
				ltimeOut = setTimeout(() => { ltimeOut = false; }, 100);
				
				readFile(`${this.opts.pathToFiles}/logfile.txt`, false);
			}
		});

		// Create an FS.Watcher object to watch for file changes on /errors
		this.errWatcher = fs.watch(this.opts.pathToFiles + "/errors", (ev, name) => {
			if(name && !eTimeOut && !isReadingErr) {
				eTimeOut = setTimeout(() => { eTimeOut = false }, 100);

				readFile(`${this.opts.pathToFiles}/errors`, true);
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
				if (!out) { out = ""; } else { if(isErr) { errLen += l } else { dataLen += l }; }

				// If there was no change in {out}, just return.
				if (out === "") { return isReading(false); }

				// If change was present & isLaunched is still false, set isLaunched to true.
				if (!isLaunched && out !== "") { isLaunched = true; this.emit("launched");	}

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
Compiler.prototype.stop = function () {
	if (this.process) {

		// Kill processes
		this.process.kill();

		exec(`docker rm -f ${this.opts.containerName}`);
		
	}
}

/**
 * Cleans up after compilation ends.
 */
Compiler.prototype._cleanUp = function() {
	
	this.logWatcher.close();
	this.errWatcher.close();

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