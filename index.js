/**
 * cc-compiler
 * A docker-based compiler to run untrusted user code.
 * 
 * Author: Carl Ian Voller
 */

const Compiler = require("./src/Compiler");
const Attacher = require("./src/Attacher");

module.exports = {
    Compiler: Compiler,
    Attacher: Attacher
}