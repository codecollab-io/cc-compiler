// Type definitions for cc-compiler 3.0.2
// Project: https://github.com/codecollab-io/cc-compiler
// Definitions by: Carl Voller <https://github.com/Portatolova>
// TypeScript Version: 3.0

import { EventEmitter } from 'events';
import { IPty } from "node-pty";

interface CompilerOptions {
    langNum: number;
    mainFile: string;
    pathToFiles: string;
    containerName: string;
    folderName?: string;
}

interface AttacherOptions {
    pathToFiles: string;
    containerName: string;
}

declare class Compiler extends EventEmitter {
    opts: CompilerOptions;
    process?: IPty;

    constructor(options: CompilerOptions);

    exec(): void;

    push(text: string): void;

    stop(): void;

    _cleanUp(): void;

    resize(size: { cols: number; rows: number }): void;

    on(event: 'launched', callback: () => void): this;
    on(event: 'inc', callback: (data: { out: string; err: string }) => void): this;
    on(event: 'done', callback: (data: { out: string; err: string, time: string, timedOut: boolean }) => void): this;
    on(event: 'error', callback: (err: any) => void): this;

}

declare class Attacher extends EventEmitter {
    opts: AttacherOptions;
    process?: IPty;

    constructor(options: AttacherOptions);

    attach(): void;

    push(text: string): void;

    stop(): void;

    _cleanUp(): void;

    resize(size: { cols: number; rows: number }): void;

    on(event: 'attached', callback: () => void): this;
    on(event: 'inc', callback: (data: { out: string; err: string }) => void): this;
    on(event: 'done', callback: (data: { out: string; err: string, time: string, timedOut: boolean }) => void): this;
    on(event: 'error', callback: (err: any) => void): this;
}