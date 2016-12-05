let debug = require("debug")("NES:log-file");
let fs = require("fs");
let format = require("string-format");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let AlternativeFileName = require("../utils/alternative-file-name.js");

const LOG_DIR = "./logs";

module.exports = function(fileName, content, options) {
  debug("write log file request: " + fileName);
  options = options || {
    overwrite: false
  };

  return new Promise(function(resolve, reject) {
    fs.statAsync(format("{0}/{1}", LOG_DIR, fileName))
    .then(() => {
      //exists
      if(options.overwrite) {
        debug("overwrite file...");
        return fs.unlinkAsync(format("{0}/{1}", LOG_DIR, fileName))
        .then(() => {
          return fs.writeFileAsync(format("{0}/{1}", LOG_DIR, fileName), content, "utf-8");
        });
      }else {
        fileName = AlternativeFileName(LOG_DIR, fileName, 9999);
        if(!fileName) reject("log's alternative names index out of range(9999)");
        debug(format("file exists. change file name to ({0})", fileName));

        return fs.writeFileAsync(format("{0}/{1}", LOG_DIR, fileName), content, "utf-8");
      }
    }, () => {
      //not exists
      //check folder exists
      fs.statAsync(LOG_DIR)
      .then(() => {
        //folder exists
        return fs.writeFileAsync(format("{0}/{1}", LOG_DIR, fileName), content, "utf-8");
      }, () => {
        fs.mkdirAsync(LOG_DIR)
        .then(() => {
          return fs.writeFileAsync(format("{0}/{1}", LOG_DIR, fileName), content, "utf-8");
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
