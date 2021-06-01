"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    "compilers": [
        ["python3.9", ""],
        ["node", ""],
        ["coffee", ""],
        ["ts-node", ""],
        ["g++ -std=c++17 -O2 -Wall -m64", "./a.out"],
        ["gcc", "./a.out"],
        ["mcs -out:main.exe", "mono ./main.exe"],
        [],
        ["python2.7", ""],
        ["bash", ""],
        ["javac", "java {}"],
        ["swift", ""],
        ["go run", ""],
        ["php", ""],
        ["ruby", ""],
        ["perl", ""],
        ["kotlinc -include-runtime -d a.jar", "java -jar a.jar"],
        ["elixir", ""],
        ["scalac", "scala {}"] // Scala
    ], "interactive": [
        "python3.9",
        "node",
        "coffee",
        "ts-node",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "php -a",
        "irb",
        "perl -de1",
        "",
        "",
        "scala" // Scala
    ]
};
