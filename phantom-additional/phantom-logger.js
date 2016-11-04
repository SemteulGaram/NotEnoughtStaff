let pdebug = require("debug")("NES:phantom");

let pcallback = require("./phantom-callback.js");
let logLevel = 1;

//this is not a just logger
//if needed some time it a callback

exports.getLogger = () => {return {
  debug: msg => {
    if(logLevel > 0) return;
    pdebug(msg);
  },
  info: msg => {
    //detect callback
    if(msg[0] === "&") {
      pcallback.event(msg);
      return;
    }
    if(logLevel > 1) return;
    pdebug(msg);
  },
  warn: msg => {
    if(logLevel > 2) return;
    pdebug("WARN: " + msg);
  },
  error: msg => {
    if(logLevel > 3) return;
    pdebug("ERROR: " + msg);
  },
  fatal: msg => {
    if(logLevel > 4) return;
    pdebug("FATAL: " + msg);
  }
}};
