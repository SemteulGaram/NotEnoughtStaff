let debug = require("debug")("NES:example-plugin");

class ExamplePlugin {
  constructor(control) {
    this.control = control;
    debug("loaded!");
  }

  tick(page) {
    let that = this;
    return new Promise(function(resolve, reject) {
      let secondLoad = ()=>{
        return page.property("title")
        .then(title => {
          debug("Tick - title: " + title);
          //param: true: page use done tick move to next plugin, false: page is still working on this tick(this tick will call again on next tick)
          resolve(true);
        }, err => reject(err));
      };

      if(that.control.getLastTickUrl() === "") {
        debug("Tick - page is blank. try to open http://section.blog.naver.com/ ...");
        page.open("http://section.blog.naver.com/")
        .then(() => {
          return secondLoad();
        });
      }else {
        secondLoad();
      }

    });
  }

  request(page, options) {
    switch(options[0]) {
    case "getNickname":
      return new Promise(function(resolve, reject) {
        debug("Req - open naver me...");
        page.open("http://me.naver.com/index.nhn")
        .then(status => {
          debug("Req - connected: " + status);
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
