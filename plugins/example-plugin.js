let debug = require("debug")("NES:example-plugin");

class ExamplePlugin {
  constructor(control) {
    this.control = control;
    debug("loaded!");
  }

  tick(page) {
    return new Promise(function(resolve) {
      debug(page.title);
      resolve();
    });
  }

  request(page, options) {
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
            /*global ghtInitialData*/
            //get Naver username
            return ghtInitialData.sUserNickName;
          });
        })
        .then(result => {
          resolve(result);
        });
      });
    default:
      return new Promise(function(resolve, reject) {
        reject(new Error("Unknown option:" + options[0]));
      });
    }
  }
}

exports.create = (uuid, control) => {
  return new Promise(function(resolve) {
    resolve(new ExamplePlugin(control));
  });
};
