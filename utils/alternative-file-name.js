let fs = require("fs");

module.exports = function(dir, name, maxIndex) {
  if(fs.existsSync(dir + "/" + name)) {
    return getNextFileName(dir, name, 2, maxIndex);
  }else {
    return name;
  }
};

function getNextFileName(dir, name, repeat, maxIndex) {
  if(repeat > maxIndex && maxIndex) return false;
  let splitName = splitExtention(name);
  let path = dir + "/" + splitName[0] + " ("+repeat+")" + splitName[1];
  if(fs.existsSync(path)) {
    return getNextFileName(dir, name, ++repeat);
  }else {
    return splitName[0] + " ("+repeat+")" + splitName[1];
  }
}

function splitExtention(fileName) {
  let dot = fileName.lastIndexOf(".");
  return [fileName.substring(0, dot), fileName.substring(dot, fileName.length)];
}
