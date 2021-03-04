/**
 * cc-compiler - Attacher.ts
 * Attacher for Compiler
 * 
 * Author: Carl Ian Voller
 */

import EventEmitter from "event-emitter-es6";
import { exec } from "child_process";
import { spawn, IPty } from "node-pty";
import { AttacherOptions } from "../types";
import { promisify as p } from "util";

class Attacher extends EventEmitter {

    opts: AttacherOptions;
    process?: IPty;

    /**
    * Creates an Attacher instance.
    * @param {AttacherOptions} opts - Options object
    * @param {String} opts.containerName - Name of docker container
    */
    constructor(opts: AttacherOptions) {
        super();

        // Parameter checks
        if (!opts.containerName || typeof opts.containerName !== "string") throw "Required param 'containerName' missing or invalid.";

        this.opts = opts;
    }

    /**
     * Attach function 
     */
    async attach() {
        let attached: boolean = false,  // Is the pseudo-tty attached to the running container
            logs: string = "";          // Stores logs of compiler output.

        // Attempt to retrieve logs of running container.
        // This is to prevent race conditions where while checking if container exists,
        // the compiler outputs something that the attacher did not catch and hence is not outputted to the user.
        let logger = exec(`docker logs ${this.opts.containerName} -f`);

        logger.stdout?.on("data", (d) => {
            setTimeout(() => { if(!attached && !logger.killed) { this.emit("inc", { out: d }); } }, 10);   // Only start sending data to user once it is confirmed that container does exist.
            logs += d;
        });

        let sentDone = false;  // Has the "done" event already been emitted (prevents multiple "done" events)
        let done = () => { if(!sentDone) { sentDone = true; this._cleanUp(); logger.kill(1); return this.emit("done"); } }

        // grep returns exit code 1 on no matches which throws an error. If an error occurred, means there is no existing container with that name.
        try { await p(exec)(`docker ps -a | grep ${this.opts.containerName}`) } catch (e) {
            if (logs) { return done(); }
            logger.kill(1);
            return this.emit("error", `No container with name '${this.opts.containerName}' found.`);
        }

        // Container is now guaranteed to exist

        // Creates a pseudo-tty shell (For colours, arrow keys and other basic terminal functionalities)
        this.process = spawn("docker", ["attach", this.opts.containerName], { name: 'xterm-256color', cols: 32, rows: 200 });

        // Handles data coming from docker attach
        this.process.onData(async (e) => {
            attached = true;
            if (!logger.killed) { logger.kill(); }
            if (e.substr(0, 25) === "Error: No such container:") { return done(); }                         // Handles race condition that compiler has already been destroyed upon attach
            if (e === "You cannot attach to a stopped container, start it first\r\n") { return done(); }    // Handles race condition that compiler was in the midst of getting destroyed upon attach
            this.emit("inc", { out: e });
        });

        this.emit("attached");

        exec(`docker wait ${this.opts.containerName}`, done);
    }

    /**
     * Handles STDIN to the running program.
     * @param {string} text - Text to push to the program
     */
    push(text: string) {
        try { this.process?.write(text); } catch (e) { console.warn(e); }
    }

    // Stops compilation and kills the docker process
    stop() {
        try { this.process?.kill("1"); } catch (e) { console.warn(e); }           // Kill processes
        setTimeout(() => exec(`docker rm -f ${this.opts.containerName}`), 200); // Remove docker container
    }

    // Resizes pseudo-tty
    resize({ cols, rows }: { cols: number, rows: number }) {
        try { this.process?.resize(cols, rows); } catch (e) { console.warn(e); }
    }

    // Cleans up after compilation ends.
    _cleanUp() {
        try { this.process?.kill("1"); } catch (e) { }
    }
}

export default Attacher;