export default {
    "compilers": [
        [ "python3.9", ""],                                                     // Python 3.9
        [ "node", ""],                                                          // NodeJS
        [ "coffee", ""],                                                        // Coffeescript
        [ "ts-node", ""],                                                       // Typescript
        [ "g++ -std=c++17 -O2 -Wall -m64", "./a.out"],                          // C++
        [ "gcc", "./a.out"],                                                    // C
        [ "mcs -out:main.exe", "mono ./main.exe"],                              // C#
        [ ],
        [ "python2.7", ""],                                                     // Python 2.7
        [ "bash", ""],                                                          // Bash
        [ "javac", "java {}"],                                                  // Java
        [ "swift", ""],                                                         // Swift 5.3.1
        [ "go run", ""],                                                        // Golang
        [ "php", ""],                                                           // PHP 7.4
        [ "ruby", ""],                                                          // Ruby
        [ "perl", ""],                                                          // Perl
        [ "kotlinc -include-runtime -d a.jar", "java -jar a.jar"],              // Kotlin (BETA)
        [ "elixir", ""],                                                        // Elixir
        [ "scalac", "scala {}"]                                                 // Scala
    ], "interactive": [
        "python3.9",            // Python 3.9
        "node",                 // NodeJS
        "coffee",               // Coffeescript
        "ts-node",              // Typescript
        "",                     // C++
        "",                     // C
        "",                     // C#
        "",
        "",                     // Python 2.7
        "",                     // Bash
        "",                     // Java
        "",                     // Swift 5.3.1 (REPL not supported as it requires priviledges for some reason)
        "",                     // Golang
        "php -a",               // PHP 7.4
        "irb",                  // Ruby
        "perl -de1",            // Perl
        "",                     // Kotlin (BETA) (REPL not supported due to existing errors in compiler)
        "",                     // Elixir
        "scala"                 // Scala
    ]
}