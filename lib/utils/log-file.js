const debug = require("debug")("stgr-utils:log-file");
const format = require("string-format");
const fs = require("fs");
Promise.promisifyAll(fs);
const AlternativeFileName = require("./alternative-file-name.js");

module.exports = function(dirPath, fileName, content, options) {
  debug("write log file request: " + fileName);

  options = options || {};

  options.overwrite = options.overwrite || false;
  options.maxFile |= options.maxFile || 9999;

  return new Promise(function(resolve, reject) {
    fs.statAsync(format("{0}/{1}", dirPath, fileName))
    .then(() => {
      //exists
      if(options.overwrite) {
        debug("overwrite file...");
        return fs.unlinkAsync(format("{0}/{1}", dirPath, fileName))
        .then(() => {
          return fs.writeFileAsync(format("{0}/{1}", dirPath, fileName), content, "utf-8");
        });
      }else {
        fileName = AlternativeFileName(dirPath, fileName, options.maxFile);
        if(!fileName) {
          reject(format("log's alternative names index out of range({0})", options.maxFile));
          return;
        }
        debug(format("file exists. change file name to ({0})", fileName));

        return fs.writeFileAsync(format("{0}/{1}", dirPath, fileName), content, "utf-8");
      }
    }, () => {
      //not exists
      //check folder exists
      fs.statAsync(dirPath)
      .then(() => {
        //folder exists
        return fs.writeFileAsync(format("{0}/{1}", dirPath, fileName), content, "utf-8");
      }, () => {
        fs.mkdirAsync(dirPath)
        .then(() => {
          return fs.writeFileAsync(format("{0}/{1}", dirPath, fileName), content, "utf-8");
        }, err => {
          reject(err);
        });
      });

    })
    .then(() => {
      resolve();
    }, err => {
      reject(err);
    });
  });
};
