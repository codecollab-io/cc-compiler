# cc-compiler

[![](https://img.shields.io/npm/v/@portatolova/cc-compiler.svg)](https://github.com/Portatolova/cc-compiler)
[![](https://img.shields.io/bundlephobia/min/@portatolova/cc-compiler.svg)](https://github.com/Portatolova/cc-compiler)

The [`CodeCollab`](https://codecollab.io) compiler used for running untrusted code. Currently supports 18 different languages.

This package allows you to run untrusted code in a collaborative environment. Multiple users can run code together simply by attaching themselves to an already running docker container. You can start this docker container using the {Compiler} included in this package or simply attach to an already existing docker container using the {Attacher}.

NOTE: This package uses [`node-pty`](https://github.com/microsoft/node-pty) to create a pseudo-tty. As such, escape sequences are not removed from the program output. It is highly recommended you use this library with [`xterm.js`](https://github.com/xtermjs/xterm.js) or any other terminal emulator that is able to process escape sequences.

## Prerequisites
1. Docker
2. Docker daemon running that doesn't require sudo access.

## Install
Using NPM:
```
$ npm install @portatolova/cc-compiler
```
This package requires that you build the included docker image.
Navigate to the package directory and type the following command in the "setup" directory to install the docker image.
```
$ ./setup.sh
```

It is recommend that u build this image on any computer running on x86 architecture. There is no guarantees the image will work as intended on ARM devices.

## Usage

This package comes with a Compiler and an Attacher:
```Javascript
const Compiler = require("@portatolova/cc-compiler").Compiler;
const Attacher = require("@portatolova/cc-compiler").Attacher;
```

### Compiler
The compiler class is used to initialise and run the untrusted user code.

```Javascript
// Initialises the compiler
let compiler = new Compiler(options);

compiler.exec();                    // Starts the compiler
compiler.push(data);                // Sends data into the running program
compiler.stop();                    // Stops the compiler
```

#### Options
  * `options.langNum` Index of language to Compile in (More info below)
  * `options.mainFile` The file in the compilation directory that will be ran during compilation
  * `options.pathToFiles` The compilation directory. (Where the files are stored) The path must be an absolute path and not a relative path.
  * `options.containerName` Name of the docker container created for compilation
  * `options.folderName` (OPTIONAL) Name of directory where code will be moved to. Defaults to "code" 

`compiler.exec()` Starts compilation.

`compiler.push(data: string)` Pipes data into the program's STDIN stream.

`compiler.resize(size: { cols: number, rows: number })` Resizes the underlying pseudo-tty.

`compiler.stop()` Stops compilation.

#### `options.langNum`:
Each language has an index or "langNum" used to identify it. Here are the langNums and their associated languages. (NOTE: There is no index 7)

    * 0 - Python 3.7
    * 1 - NodeJS
    * 2 - CoffeeScript
    * 3 - Typescript
    * 4 - C++
    * 5 - C
    * 6 - C#
    * 8 - Python 2.7
    * 9 - Bash Shell
    * 10 - Java
    * 11 - Swift
    * 12 - Golang
    * 13 - PHP
    * 14 - Ruby
    * 15 - Perl
    * 16 - Kotlin
    * 17 - Elixir
    * 18 - Scala

#### `options.pathToFiles`:
Starting from v4.0.0, you do not need to have a specific folder structure. Simply set `options.pathToFiles` to where your code is stored and it will be mounted into the docker container as `options.folderName`. If `options.folderName` is not specified, `code` is used instead.


### Attacher
The attacher class is used to attach to an existing docker container.

```Javascript
// Initialises the attacher
let attacher = new Attacher(options);

attacher.attach();                  // Attaches to the compiler
attacher.push(data);                // Sends data into the running program
attacher.stop();                    // Stops the compiler
```

#### Options
  * `options.pathToFiles` The compilation directory. (Where the files are stored) The path must be an absolute path and not a relative path.
  * `options.containerName` Name of the docker container created for compilation

`attacher.attach()` Attach to an existing compiler.

`attacher.push()` Pipes data into the program's STDIN stream.

`attacher.resize(size: { cols: number, rows: number })` Resizes the underlying pseudo-tty.

`attacher.stop()` Stops compilation.

### Events
Both the Compiler and Attach can emit 3 events.
* `error` emitted whenever the compiler encountered an error.
* `inc` emitted whenever the running program outputs anything to STDOUT or STDERR.
* `done` emitted when the program is finished running or it has timed out.

The Compiler also has an additional event
* `launched` emitted when the program has launched successfully.

## Example
This example runs code stored in /Users/carlvoller/test using Python 3.9. The compiler is listening for a "launched" event in which afterwards, it will attach the attacher to the compiler. The attacher then listens for "inc" and "done" events for program output and errors as well as for when compilation finishes. It then prints all output to the console.
```Javascript
const Compiler = require("../index").Compiler;
const Attacher = require("../index").Attacher;

// Initialise Compiler
let comp = new Compiler({
    langNum: 0,
    mainFile: "main.py",
    pathToFiles: "/Users/carlvoller/test",
    containerName: "Test1",
    folderName: "My Code"
});

// Initialise Attacher
let attach = new Attacher({
    pathToFiles: "/Users/carlvoller/test",
    containerName: "Test1"
});

comp.exec(); // Start Compiler

// Listen for events
comp.on("launched", () => {
    console.log("Compiler has been launched.");

    // Attach the attacher
    attach.attach();
});

// Listen for data coming out from the program. STDERR is coloured red with escape sequences.
attach.on("inc", (inc) => {
    let output = inc.out;
    console.log(`"Program output: ${output}`);
});

// Listen for when the program finishes running OR timed out
attach.on("done", (done) => {
    let output   = done.out
        timedOut = done.timedOut;   // Did the program time out. (Took > 1 minute)
    console.log(`"Program output: ${output}`);
    console.log(`"Program time out status: ${timedOut}`);
});

// Listen for any errors during initialisation
comp.on("error", (err) => console.log("An error occurred: ", err));
attach.on("error", (err) => console.log("An error occurred: ", err));
```