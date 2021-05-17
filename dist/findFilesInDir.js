"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
/**
 * Find all files recursively in specific folder with specific extension, e.g:
 * findFilesInDir('./project/src', '.html') ==> ['./project/src/a.html','./project/src/build/index.html']
 * @param  {String} startPath    Path relative to this file or other file which requires this files
 * @param  {String} filter       Extension name, e.g: '.html'
 * @return {Array}               Result files with path string in an array
 */
function findFilesInDir(startPath, originalPath, filter) {
    var results = [];
    if (!fs_1.default.existsSync(startPath)) {
        return results;
    }
    var files = fs_1.default.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
        var filename = path_1.default.join(startPath, files[i]);
        var stat = fs_1.default.lstatSync(filename);
        if (stat.isDirectory()) {
            results = results.concat(findFilesInDir(filename, originalPath, filter)); //recurse
        }
        else if (filename.indexOf(filter) >= 0) {
            results.push(filename.slice(originalPath.length + 1, filename.length));
        }
    }
    return results;
}
exports.default = findFilesInDir;
