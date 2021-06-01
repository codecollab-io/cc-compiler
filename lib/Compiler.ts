/**
 * cc-compiler - Compiler.ts
 * The main compiler
 * 
 * Author: Carl Ian Voller
 */

import { EventEmitter } from "events";
import { CompilerOptions } from "../types";
import langList from "./langList";
import findFilesInDir from "./findFilesInDir";
import dockerode from "dockerode";
import { spawn, IPty } from "node-pty";
import { exec as e, ChildProcess } from "child_process";

const Docker = new dockerode({ socketPath: '/var/run/docker.sock' });
 
class Compiler extends EventEmitter {

    opts: CompilerOptions;
    folderName: string;
    private process?: IPty;
    private container?: dockerode.Container;

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
    constructor(opts: CompilerOptions) {
        super();

        // Parameter checks
        if ((!opts.langNum && opts.langNum !== 0) || typeof opts.langNum !== "number") throw "Required param 'langNum' missing or invalid.";
        if (!opts.pathToFiles || typeof opts.pathToFiles !== "string") throw "Required param 'pathToFiles' missing or invalid.";
        if (!opts.containerName || typeof opts.containerName !== "string") throw "Required param 'containerName' missing or invalid.";

        opts.dimensions = opts.dimensions || { rows: 200, cols: 80 };

        this.opts = opts;
        this.folderName = opts.folderName || "code";
    }

    /**
     * Connect to docker container. This will check if there is an existing
     * docker container with the same name running. If there is, it will attach to that running container.
     * Otherwise, it will call this._createContainer()
     */
    async connect() {
        let container: dockerode.Container,
            alreadyStarted = false;
        try {
            container = Docker.getContainer(this.opts.containerName);
            await container.inspect();
            alreadyStarted = true;
        } catch(err) {
            try {
                container = await this._createContainer();
            } catch(e) {
                container = Docker.getContainer(this.opts.containerName);
                alreadyStarted = true;
            }
        }

        let cmd = `docker attach ${this.opts.containerName}`;
        let ttyCmd = ["-c", `${cmd}`]
        this.container = container;
        this.process = spawn("bash", ttyCmd, { name: 'xterm-256color', ...this.opts.dimensions });
        this.process.onData((e) => {
            this.emit("inc", e);
        });

        this.process.onExit((e) => {
            this.emit("inc", `\n\n[Process exited with code ${e.exitCode}]`);
            this._onExit(container);
        });
    }

    /**
     * Runs when the docker container exits.
     * @param {dockerode.Container} container 
     */
    private async _onExit(container: dockerode.Container) {
        await container.commit({ repo: `proj_${this.opts.containerName}` });
        await container.remove();
        this.emit("done");
    }

    private async _createContainer() {
        let isInteractive = !this.opts.mainFile;
        let compiler = !isInteractive ? langList.compilers[this.opts.langNum][0] : (langList.interactive[this.opts.langNum] || "/bin/bash");
        let toCompile = this.opts.mainFile ? this.opts.langNum === 4 ? findFilesInDir(this.opts.pathToFiles, this.opts.pathToFiles, ".cpp").join(" ") : this.opts.mainFile : "";
        let Image = "cc-compiler";
        try { await Docker.getImage(`proj_${this.opts.containerName}`).inspect(); Image = `proj_${this.opts.containerName}` } catch(e) {}
        let container = await Docker.createContainer({
            Image,
            Tty: true,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            name: this.opts.containerName,
            Cmd: isInteractive ? [compiler] : [compiler, toCompile],
            OpenStdin: true,
            StdinOnce: false,
            WorkingDir: `/home/cc-user/${this.opts.folderName}`,
            HostConfig: {
                Binds: [`${this.opts.pathToFiles}:/home/cc-user/${this.opts.folderName}`]
            }
        });
        return container;
    }

    /**
     * @deprecated
     * Resizing the tty WILL cause terminal formatting glitches.
     */
    resize({ cols, rows }: { cols: number, rows: number }) {
        try { this.process?.resize(cols, rows); } catch(e) {}
    }

    /**
     * Handles STDIN to the running program.
     * @param {string} text - Text to push to the program
     */
    push (text: string) {
        if (!this.process) { return; }
        try { this.process.write(text); } catch(e) { console.warn(e); }
    }

    // Kills the docker container
    stop () {
        if (!this.process) { return; }
        try { this.container?.kill(); } catch(e) { console.warn(e); }
    }
}

export default Compiler;