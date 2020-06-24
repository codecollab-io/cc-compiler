const Compiler = require("../index").Compiler;
const Attacher = require("../index").Attacher;

let comp = new Compiler({
    timeOut: 60,
    langNum: 0,
    mainFile: "main.py",
    pathToFiles: "/Users/carlvoller/Desktop/CodeCollab/cc-compiler/test/test",
    containerName: "lmaoeksdee"
});

comp.exec();

let attach = new Attacher({
    pathToFiles: "/Users/carlvoller/Desktop/CodeCollab/cc-compiler/test/test",
    containerName: "lmaoeksdee"
})

attach.on("error", (err) => console.log(err));
attach.on("inc", (inc) => console.log(inc));
attach.on("done", (done) => console.log(done));
comp.on("launched", () => attach.attach());

let count = 0;

let int = setInterval(() => {
    if(count === 9) { attach.stop(); return clearInterval(int); }
    attach.push(count);
    count += 1;
}, 1000)