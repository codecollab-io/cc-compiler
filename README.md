# cc-compiler

[![](https://img.shields.io/npm/v/@portatolova/cc-compiler.svg)](https://github.com/Portatolova/cc-compiler)
[![](https://img.shields.io/bundlephobia/min/@portatolova/cc-compiler.svg)](https://github.com/Portatolova/cc-compiler)

The [`CodeCollab`](https://codecollab.io) compiler used for running untrusted code. Currently supports 17 different languages.

## Prerequisites
1. Docker
2. Docker daemon running that doesn't require sudo access.

## Install
Using NPM:
```
$ npm install @portatolova/cc-compiler
```
This package comes with a dockerfile.
Navigate to the package and type the following command to install the docker image.
```
$ docker build -t 'cc-compiler' - < Dockerfile
```

## Usage

This package comes with a Compiler and an Attacher:
```Javascript
const Compiler = require("@portatolova/cc-compiler").Compiler;
const Attacher = require("@portatolova/cc-compiler").Attacher;
```

### Compiler
The compiler class is used to initialise and run the untrusted user code. This should be ran and executed before any attachment can take place.

```Javascript
// Initialises the compiler
let compiler = new Compiler(options);

compiler.exec();                    // Starts the compiler
compiler.push(data);                // Sends data into the running program
compiler.stop();                    // Stops the compiler
```

#### Options
  * `options.timeOut` Max time in seconds that program is allowed to run
  * `options.langNum` Index of language to Compile in (More info below)
  * `options.mainFile` The file in the compilation directory that will be ran during compilation
  * `options.pathToFiles` The compilation directory. (Where the files are stored) The path must be an absolute path and not a relative path.
  * `options.containerName` Name of the docker container created for compilation

`compiler.exec()` Starts compilation.

`compiler.push()` Pipes data into the program's STDIN stream.

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
    * 17 - Clojure
    * 18 - Scala

#### `options.pathToFiles`:
There is a specific structure that the specified directory needs to have. Here is the structure:

```
anyFolderName
    | - code
         | - fileOne.py
         | - fileTwo.py
         ...
```

So when specifying a directory to `options.pathToFiles`, you should enter:
```Javascript
...
pathToFiles: "/path/to/directory/anyFolderName"
...
```

### Attacher
The attacher class is used to attach to an existing docker container.

```Javascript
// Initialises the compiler
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

`attacher.stop()` Stops compilation.

### Events
Both the Compiler and Attach can emit 3 events.
* `error` emitted whenever the compiler encountered an error.
* `inc` emitted whenever the running program outputs anything to STDOUT or STDERR.
* `done` emitted when the program is finished running or it has timed out.

The Compiler also has an additional event
* `launched` emitted when the program has launched successfully.

