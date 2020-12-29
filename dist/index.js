"use strict";
/**
 * cc-compiler
 * A docker-based compiler to run untrusted user code.
 *
 * Author: Carl Ian Voller
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attacher = exports.Compiler = void 0;
var Compiler_1 = __importDefault(require("./Compiler"));
exports.Compiler = Compiler_1.default;
var Attacher_1 = __importDefault(require("./Attacher"));
exports.Attacher = Attacher_1.default;
