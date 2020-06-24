// Type definitions for cc-compiler 3.0.2
// Project: https://github.com/codecollab-io/cc-compiler
// Definitions by: Carl Voller <https://github.com/Portatolova>
// TypeScript Version: 3.0

import { EventEmitter } from 'events';

interface CompilerOptions {
    timeOut: number;
    langNum: number;
    mainFile: string;
    pathToFiles: string;
    containerName: string;
}

interface AttacherOptions {
    pathToFiles: string;
    containerName: string;
}

declare class Compiler extends EventEmitter {
    opts: CompilerOptions;
    stdinQueue: Array<string>;

    constructor(options: CompilerOptions);

    exec(): void;

    push(text: string): void;

    stop(): void;

    _cleanUp(): void;

    on(event: 'launched', callback: () => void): void;
    on(event: 'inc', callback: (data: { out: string; err: string }) => void): void;
    on(event: 'done', callback: (data: { out: string; err: string, time: string, timedOut: boolean }) => void): void;
    on(event: 'error', callback: (err: any) => void): void;

}

declare class Attacher extends EventEmitter {
    opts: AttacherOptions;
    stdinQueue: Array<string>;

    constructor(options: AttacherOptions);

    attach(): void;

    push(text: string): void;

    stop(): void;

    on(event: 'attached', callback: () => void): void;
    on(event: 'inc', callback: (data: { out: string; err: string }) => void): void;
    on(event: 'done', callback: (data: { out: string; err: string, time: string, timedOut: boolean }) => void): void;
    on(event: 'error', callback: (err: any) => void): void;
}