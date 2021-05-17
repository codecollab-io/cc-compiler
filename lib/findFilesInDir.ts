import path from "path";
import fs from "fs";

/**
 * Find all files recursively in specific folder with specific extension, e.g:
 * findFilesInDir('./project/src', '.html') ==> ['./project/src/a.html','./project/src/build/index.html']
 * @param  {String} startPath    Path relative to this file or other file which requires this files
 * @param  {String} filter       Extension name, e.g: '.html'
 * @return {Array}               Result files with path string in an array
 */
function findFilesInDir(startPath: string, originalPath: string, filter: string): Array<string> {

    let results: Array<string> = [];

    if (!fs.existsSync(startPath)){
        return results;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            results = results.concat(findFilesInDir(filename, originalPath, filter)); //recurse
        }
        else if (filename.indexOf(filter) >= 0) {
            results.push(filename.slice(originalPath.length + 1, filename.length));
        }
    }
    return results;
}

export default findFilesInDir;