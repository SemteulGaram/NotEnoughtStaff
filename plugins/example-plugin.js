let debug = require("debug")("NES:example-plugin");

class ExamplePlugin {
  constructor(control) {
    this.control = control;
    debug("loaded!");
  }

  tick(page) {
    return new Promise(function(resolve, reject) {
      //debug("recive tick!");
      resolve();
    });
  }

  request(page, options) {
    let that = this;
    switch(options[0]) {
      case "topRankSearchWord":
        return new Promise(function(resolve, reject) {
          debug("open naver main...");
          page.open("http://me.naver.com/index.nhn")
          .then(status => {
            debug("connected: " + status);
            if(status === "fail") {
              reject(new Error("connection fail"));
            }
            return page.evaluate(function() {
              return ghtInitialData.sUserNickName;
            });
          })
          .then(result => {
            resolve(result);
          });
        });
        break;
      default:
        return new Promise(function(resolve, reject) {
          reject(new Error("Unknown option:" + options[0]));
        });
    }
  }
}

exports.create = (uuid, control) => {
  return new Promise(function(resolve, reject) {
    resolve(new ExamplePlugin(control));
  });
}
