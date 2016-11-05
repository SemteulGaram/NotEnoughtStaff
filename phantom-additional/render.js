let debug = require("debug")("NES:prender");
let fs = require("fs");
let format = require("string-format");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let AlternativeFileName = require("../utils/alternative-file-name.js");

const SCREENSHOT_DIR = "./screenshot";

module.exports = function(phantomPage, fileName, options, overwrite) {
  phantomPage.property("title")
  .then(title => {
    debug(format("page render request (page: {0}, file: {1})", title, fileName));
  }, () => {});
  return new Promise(function(resolve, reject) {
    options = options || {format: "jpeg", quality: 100};
    fileName = fileName ? fileName : ("untitled." + options.format);

    return fs.statAsync(SCREENSHOT_DIR + "/" + fileName)
    .then(() => {
      //exists
      if(overwrite) {
        return fs.unlinkAsync(SCREENSHOT_DIR + "/" + fileName)
        .then(() => {
          return phantomPage.render(SCREENSHOT_DIR + "/" + fileName, options);
        });
      }else {
        fileName = AlternativeFileName(SCREENSHOT_DIR, fileName, 9999);
        if(!fileName) reject(new Error("screenshot's alternative names index out of range(9999)"));
      }

      return phantomPage.render(SCREENSHOT_DIR + "/" + fileName, options);
    }, () => {
      //not exists
      return phantomPage.render(SCREENSHOT_DIR + "/" + fileName, options);
    })
    .then(() => {
      resolve(fileName);
    });
  });
};
