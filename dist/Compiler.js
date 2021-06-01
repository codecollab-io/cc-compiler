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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var langList_1 = __importDefault(require("./langList"));
var findFilesInDir_1 = __importDefault(require("./findFilesInDir"));
var dockerode_1 = __importDefault(require("dockerode"));
var node_pty_1 = require("node-pty");
var Docker = new dockerode_1.default({ socketPath: '/var/run/docker.sock' });
var Compiler = /** @class */ (function (_super) {
    __extends(Compiler, _super);
    /**
     * Creates a compiler instance.
     * @param {CompilerOptions} opts - Options object
     * @param {Number} opts.langNum - Index of Language to compile file in
     * @param {String} opts.pathToFiles - Absolute path to location of files
     * @param {String} opts.containerName - Name of docker container & committed image on container exit.
     * @param {String} opts.mainFile (OPTIONAL) - File to execute on compilation. If left blank, will initialise Interactive mode or Bash shell.
     * @param {{ rows: number, cols: number }} opts.dimensions (OPTIONAL) - Pseudo-tty dimensions. If left blank, will use { rows: 200, cols: 80 }
     * @param {String} opts.folderName (OPTIONAL) - Name of folder where files are stored within the container. If left blank, "code" is used instead.
     */
    function Compiler(opts) {
        var _this = _super.call(this) || this;
        // Parameter checks
        if ((!opts.langNum && opts.langNum !== 0) || typeof opts.langNum !== "number")
            throw "Required param 'langNum' missing or invalid.";
        if (!opts.pathToFiles || typeof opts.pathToFiles !== "string")
            throw "Required param 'pathToFiles' missing or invalid.";
        if (!opts.containerName || typeof opts.containerName !== "string")
            throw "Required param 'containerName' missing or invalid.";
        opts.dimensions = opts.dimensions || { rows: 200, cols: 80 };
        _this.opts = opts;
        _this.folderName = opts.folderName || "code";
        return _this;
    }
    /**
     * Connect to docker container. This will check if there is an existing
     * docker container with the same name running. If there is, it will attach to that running container.
     * Otherwise, it will call this._createContainer()
     */
    Compiler.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var container, alreadyStarted, err_1, e_1, cmd, ttyCmd;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        alreadyStarted = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 8]);
                        container = Docker.getContainer(this.opts.containerName);
                        return [4 /*yield*/, container.inspect()];
                    case 2:
                        _a.sent();
                        alreadyStarted = true;
                        return [3 /*break*/, 8];
                    case 3:
                        err_1 = _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this._createContainer()];
                    case 5:
                        container = _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_1 = _a.sent();
                        container = Docker.getContainer(this.opts.containerName);
                        alreadyStarted = true;
                        return [3 /*break*/, 7];
                    case 7: return [3 /*break*/, 8];
                    case 8:
                        cmd = alreadyStarted ? "echo he; docker logs " + this.opts.containerName + "; docker attach " + this.opts.containerName : "echo no; docker attach $(docker start " + this.opts.containerName + ");";
                        ttyCmd = ["-c", "" + cmd];
                        this.container = container;
                        this.process = node_pty_1.spawn("bash", ttyCmd, __assign({ name: 'xterm-256color' }, this.opts.dimensions));
                        this.process.onData(function (e) {
                            _this.emit("inc", e);
                        });
                        this.process.onExit(function (e) {
                            _this.emit("inc", "\n\n[Process exited with code " + e.exitCode + "]");
                            _this._onExit(container);
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Runs when the docker container exits.
     * @param {dockerode.Container} container
     */
    Compiler.prototype._onExit = function (container) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, container.commit({ repo: "proj_" + this.opts.containerName })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, container.remove()];
                    case 2:
                        _a.sent();
                        this.emit("done");
                        return [2 /*return*/];
                }
            });
        });
    };
    Compiler.prototype._createContainer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isInteractive, compiler, toCompile, Image, e_2, container;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isInteractive = !this.opts.mainFile;
                        compiler = !isInteractive ? langList_1.default.compilers[this.opts.langNum][0] : (langList_1.default.interactive[this.opts.langNum] || "/bin/bash");
                        toCompile = this.opts.mainFile ? this.opts.langNum === 4 ? findFilesInDir_1.default(this.opts.pathToFiles, this.opts.pathToFiles, ".cpp").join(" ") : this.opts.mainFile : "";
                        Image = "cc-compiler";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Docker.getImage("proj_" + this.opts.containerName).inspect()];
                    case 2:
                        _a.sent();
                        Image = "proj_" + this.opts.containerName;
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [4 /*yield*/, Docker.createContainer({
                            Image: Image,
                            Tty: true,
                            AttachStdin: true,
                            AttachStdout: true,
                            AttachStderr: true,
                            name: this.opts.containerName,
                            Cmd: isInteractive ? [compiler] : [compiler, toCompile],
                            OpenStdin: true,
                            StdinOnce: false,
                            WorkingDir: "/home/cc-user/" + this.opts.folderName,
                            HostConfig: {
                                Binds: [this.opts.pathToFiles + ":/home/cc-user/" + this.opts.folderName]
                            }
                        })];
                    case 5:
                        container = _a.sent();
                        return [2 /*return*/, container];
                }
            });
        });
    };
    /**
     * @deprecated
     * Resizing the tty WILL cause terminal formatting glitches.
     */
    Compiler.prototype.resize = function (_a) {
        var _b;
        var cols = _a.cols, rows = _a.rows;
        try {
            (_b = this.process) === null || _b === void 0 ? void 0 : _b.resize(cols, rows);
        }
        catch (e) { }
    };
    /**
     * Handles STDIN to the running program.
     * @param {string} text - Text to push to the program
     */
    Compiler.prototype.push = function (text) {
        if (!this.process) {
            return;
        }
        try {
            this.process.write(text);
        }
        catch (e) {
            console.warn(e);
        }
    };
    // Kills the docker container
    Compiler.prototype.stop = function () {
        var _a;
        if (!this.process) {
            return;
        }
        try {
            (_a = this.container) === null || _a === void 0 ? void 0 : _a.kill();
        }
        catch (e) {
            console.warn(e);
        }
    };
    return Compiler;
}(events_1.EventEmitter));
exports.default = Compiler;
