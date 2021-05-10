"use strict";
/**
 * cc-compiler - Attacher.ts
 * Attacher for Compiler
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
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var event_emitter_es6_1 = __importDefault(require("event-emitter-es6"));
var child_process_1 = require("child_process");
var node_pty_1 = require("node-pty");
var util_1 = require("util");
var Attacher = /** @class */ (function (_super) {
    __extends(Attacher, _super);
    /**
    * Creates an Attacher instance.
    * @param {AttacherOptions} opts - Options object
    * @param {String} opts.containerName - Name of docker container
    */
    function Attacher(opts) {
        var _this = _super.call(this) || this;
        // Parameter checks
        if (!opts.containerName || typeof opts.containerName !== "string")
            throw "Required param 'containerName' missing or invalid.";
        _this.opts = opts;
        return _this;
    }
    /**
     * Attach function
     */
    Attacher.prototype.attach = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var attached, logs, logger, sentDone, done, e_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        attached = false, logs = "";
                        logger = child_process_1.exec("docker logs " + this.opts.containerName + " -f");
                        (_a = logger.stdout) === null || _a === void 0 ? void 0 : _a.on("data", function (d) {
                            setTimeout(function () { if (!attached && !logger.killed) {
                                _this.emit("inc", { out: d });
                            } }, 10); // Only start sending data to user once it is confirmed that container does exist.
                            logs += d;
                        });
                        sentDone = false;
                        done = function () { if (!sentDone) {
                            sentDone = true;
                            _this._cleanUp();
                            logger.kill(1);
                            return _this.emit("done");
                        } };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, util_1.promisify(child_process_1.exec)("docker ps -a | grep " + this.opts.containerName)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _b.sent();
                        if (logs) {
                            return [2 /*return*/, done()];
                        }
                        logger.kill(1);
                        return [2 /*return*/, this.emit("error", "No container with name '" + this.opts.containerName + "' found.")];
                    case 4:
                        // Container is now guaranteed to exist
                        // Creates a pseudo-tty shell (For colours, arrow keys and other basic terminal functionalities)
                        this.process = node_pty_1.spawn("docker", ["attach", this.opts.containerName], { name: 'xterm-256color', cols: 32, rows: 200 });
                        // Handles data coming from docker attach
                        this.process.onData(function (e) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                attached = true;
                                if (!logger.killed) {
                                    logger.kill();
                                }
                                if (e.substr(0, 25) === "Error: No such container:") {
                                    return [2 /*return*/, done()];
                                } // Handles race condition that compiler has already been destroyed upon attach
                                if (e === "You cannot attach to a stopped container, start it first\r\n") {
                                    return [2 /*return*/, done()];
                                } // Handles race condition that compiler was in the midst of getting destroyed upon attach
                                this.emit("inc", { out: e });
                                return [2 /*return*/];
                            });
                        }); });
                        this.emit("attached");
                        child_process_1.exec("docker wait " + this.opts.containerName, done);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handles STDIN to the running program.
     * @param {string} text - Text to push to the program
     */
    Attacher.prototype.push = function (text) {
        var _a;
        try {
            (_a = this.process) === null || _a === void 0 ? void 0 : _a.write(text);
        }
        catch (e) {
            console.warn(e);
        }
    };
    // Stops compilation and kills the docker process
    Attacher.prototype.stop = function () {
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
    Attacher.prototype.resize = function (_a) {
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
    Attacher.prototype._cleanUp = function () {
        var _a;
        try {
            (_a = this.process) === null || _a === void 0 ? void 0 : _a.kill("1");
        }
        catch (e) { }
    };
    return Attacher;
}(event_emitter_es6_1.default));
exports.default = Attacher;
