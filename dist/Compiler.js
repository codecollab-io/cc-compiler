"use strict";
/**
 * cc-compiler - Compiler.ts
 * The main compiler
 *
 * Author: Carl Ian Voller
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var event_emitter_es6_1 = __importDefault(require("event-emitter-es6"));
var child_process_1 = require("child_process");
var node_pty_1 = require("node-pty");
var langList_json_1 = __importDefault(require("./langList.json"));
var Compiler = /** @class */ (function (_super) {
    __extends(Compiler, _super);
    /**
     * Creates a compiler instance.
     * @param {CompilerOptions} opts - Options object
     * @param {Number} opts.langNum - Index of Language to compile file in
     * @param {String} opts.mainFile - File to execute on compilation
     * @param {String} opts.pathToFiles - Absolute path to location of files
     * @param {String} opts.containerName	- Name of docker container
     * @param {String} opts.folderName (OPTIONAL) - Name of folder where files are stored within the container. If left blank, "code" is used instead.
     */
    function Compiler(opts) {
        var _this = _super.call(this) || this;
        // Parameter checks
        if ((!opts.langNum && opts.langNum !== 0) || typeof opts.langNum !== "number")
            throw "Required param 'langNum' missing or invalid.";
        if (!opts.mainFile || typeof opts.mainFile !== "string")
            throw "Required param 'mainFile' missing or invalid.";
        if (!opts.pathToFiles || typeof opts.pathToFiles !== "string")
            throw "Required param 'pathToFiles' missing or invalid.";
        if (!opts.containerName || typeof opts.containerName !== "string")
            throw "Required param 'containerName' missing or invalid.";
        _this.opts = opts;
        _this.folderName = opts.folderName || "code";
        return _this;
    }
    /**
     * Compilation function
     */
    Compiler.prototype.exec = function () {
        var _this = this;
        var runner = langList_json_1.default[this.opts.langNum];
        child_process_1.exec("chmod -R 777 " + this.opts.pathToFiles + ";chown -R cc-user:cc-user /usercode");
        // Arguments for docker run command
        var args = ["run", "--rm", "--name", this.opts.containerName, "-e", "TERM=xterm-256color", "--cpus=0.25", "--memory=200m",
            "-itv", this.opts.pathToFiles + ":/usercode/" + this.opts.folderName, "--workdir", "/usercode/" + this.opts.folderName, "cc-compiler", "/bin/bash"];
        // Creates a pseudo-tty shell (For colours, arrow keys and other basic terminal functionalities)
        this.process = node_pty_1.spawn("docker", args, { name: 'xterm-256color', cols: 32, rows: 200 });
        // Used for certain step2 commands
        var _ = this.opts.mainFile.split(".");
        _.pop();
        var fileWithoutExt = _.join(".");
        // Handles automatic terminal logic such as sending run commands
        var arrow = "\u001b[1;3;31m>> \u001b[0m", step1 = runner[0] + " " + this.opts.mainFile + "\r", step2 = runner[1] ? runner[1].replace("{}", fileWithoutExt) + "\r" : "", sentStep1 = false, sentStep2 = !step2, // If there isn't a step2 command, we assume it has already been sent
        receivedFinalArrow = false;
        // Handles terminal output and stdin
        this.process.onData(function (e) {
            var _a;
            _this.emit("inc", { out: e });
            // Stop container once all steps have been sent and program is done.
            if (e.includes(arrow) && sentStep1 && sentStep2) {
                return child_process_1.exec("docker rm -f " + _this.opts.containerName);
            }
            if (!sentStep1 && e === arrow) {
                return setTimeout(function () {
                    var _a;
                    if (sentStep1) {
                        return;
                    }
                    sentStep1 = true;
                    (_a = _this.process) === null || _a === void 0 ? void 0 : _a.write(step1);
                }, 100);
            }
            if (!sentStep2 && sentStep1 && e.includes(arrow)) {
                return setTimeout(function () {
                    var _a;
                    if (sentStep2) {
                        return;
                    }
                    sentStep2 = true;
                    (_a = _this.process) === null || _a === void 0 ? void 0 : _a.write(step2);
                }, 100);
            }
            // Undo any stdin writen between steps if there is a step2.
            if (!sentStep2 && sentStep1 && !e.includes(arrow) || receivedFinalArrow) {
                return (_a = _this.process) === null || _a === void 0 ? void 0 : _a.write(String.fromCharCode(127));
            }
        });
        var isLaunched = false, // Has the docker container started
        sentDone = false; // Has the "done" event been emitted, if so, don't send another one.
        this.checkInterval = setInterval(function () {
            // Check if docker container is still running
            child_process_1.exec("docker ps | grep " + _this.opts.containerName, function (_, out) {
                // Checks if docker container has been launched. If so, emit launched event.
                if (out && !isLaunched) {
                    isLaunched = !0;
                    _this.emit("launched");
                    return;
                }
                // Timeout code execution after one minute.
                var timedOut = out.indexOf("minute") > -1;
                if (((!out && isLaunched) || timedOut) && !sentDone) {
                    _this.emit("done", { out: "", timedOut: timedOut });
                    sentDone = true;
                    return _this._cleanUp();
                }
            });
        }, 500);
    };
    /**
     * Handles STDIN to the running program.
     * @param {string} text - Text to push to the program
     */
    Compiler.prototype.push = function (text) {
        var _a;
        try {
            (_a = this.process) === null || _a === void 0 ? void 0 : _a.write(text);
        }
        catch (e) {
            console.warn(e);
        }
    };
    // Stops compilation and kills the docker process
    Compiler.prototype.stop = function () {
        var _this = this;
        var _a;
        try {
            (_a = this.process) === null || _a === void 0 ? void 0 : _a.kill("1");
        }
        catch (e) {
            console.warn(e);
        } // Kill processes
        setTimeout(function () { return child_process_1.exec("docker rm -f " + _this.opts.containerName); }, 200); // Remove docker container
    };
    // Resizes pseudo-tty
    Compiler.prototype.resize = function (_a) {
        var _b;
        var cols = _a.cols, rows = _a.rows;
        try {
            (_b = this.process) === null || _b === void 0 ? void 0 : _b.resize(cols, rows);
        }
        catch (e) {
            console.warn(e);
        }
    };
    // Cleans up after compilation ends.
    Compiler.prototype._cleanUp = function () {
        var _a;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        try {
            (_a = this.process) === null || _a === void 0 ? void 0 : _a.kill("1");
        }
        catch (e) { }
    };
    return Compiler;
}(event_emitter_es6_1.default));
exports.default = Compiler;
