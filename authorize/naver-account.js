const TAG = "NES:naver-account";

let chalk = require("chalk");
let debug = require("debug")(TAG);
let fs = require("fs");
let format = require("string-format");
let uuid = require("uuid");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let Captcha = require("./captcha.js");
let pcallback = require("../phantom-additional/callback.js");
let MouseClick = require("../utils/mouse-click.js");

const CONFIG = "./config/NaverAccount.json";
const CONFIG_FOLDER = "./config";


class NaverAccount {
  constructor() {
    this.config = {};
  }

  existsConfig() {
    return fs.existsSync(CONFIG);
  }

  loadConfig() {
    let that = this;
    return new Promise(function(resolve, reject) {
      if(that.existsConfig()) {
        fs.readFileAsync(CONFIG, "utf-8")
        .then(data => {
          that.config = JSON.parse(data);
          resolve();
        }, err => {
          reject(err);
        });
      }else {
        reject(new Error("config file not exists"));
      }
    });
  }

  saveConfig() {
    let that = this;
    return new Promise(function(resolve, reject) {
      //save progress
      let save = () => {
        return fs.writeFileAsync(CONFIG, JSON.stringify(that.config), "utf-8")
        .then(_ => {
          debug("save config");
          resolve(_);
        });
      };

      //check parent folder and mkdir progress
      if(!fs.existsSync(CONFIG_FOLDER)) {
        fs.mkdirAsync(CONFIG_FOLDER)
        .then(() => {
          debug("made config folder");
          return save();
        })
        .catch(err => {
          reject(err);
        });
      }else {
        //if folder exists just save
        save();
      }
    });

  }

  hasIdentify() {
    return (this.config.id && this.config.pw);
  }

  setIdentify(id, pw) {
    this.config.id = id;
    this.config.pw = pw;
  }

  doLogin(phantomPage) {
    //doing login naver
    let that = this;
    return new Promise((resolve, reject) => {
      if(!that.hasIdentify()) {
        reject(new Error("Id or Password is undefined"));
        return;
      }
      debug("connect to https://nid.naver.com/nidlogin.login ...");
      phantomPage.open("https://nid.naver.com/nidlogin.login")
      .then(status => {
        debug("connect status: " + chalk.cyan(status));
        if(status === "fail") reject(new Error("connection status is fail"));

        return that._loginCheck(phantomPage);
      })
      .then(() => resolve())
      .catch(hasProblem => {
        if(hasProblem) {
          if(hasProblem[0]) reject(hasProblem[0]);
          //detect captcha
          else if(hasProblem[1]) {
            //detected captcha one more login
            return Captcha(phantomPage) //wait user input...
            .then(answer => {
              return that._loginCheck(phantomPage, answer);
            }, err => {
              debug("unknown Captcha inner error occur");
              reject(err);
            })
            .then(() => resolve());
          //never happen
          }else {
            reject("wtf(What the Terrible Fail) error occur!");
          }
        }else {
          reject("login timeout");
        }
      });
    });
  }

  _loginCheck(phantomPage, captcha) {
    let that = this;
    return new Promise(function(resolve, reject) {
      phantomPage.property("title")
      .then(title => {
        debug(format("login checking... (page: {0}, captcha: {1})", title, captcha || "undefined"));
      }, ()=>{});
      phantomPage.evaluate(function(id, pw, click, captcha) {
        //if has captcha fill it
        if(captcha) document.querySelector("input#chptcha").setAttribute("value", captcha);
        //fill id
        document.querySelector("input#id").setAttribute("value", id);
        //fill password
        document.querySelector("input#pw").setAttribute("value", pw);

        //click login button
        click(document.querySelector("input[type=submit]"));
        try {
          //add device? - true
          click(document.querySelector("span[class=btn_upload] > a"));
          //stay login? - false
          click(document.querySelector("span[class=btn_cancel3] > a"));
        }catch(err) {
          console.error(err);
        }
      }, that.config.id, that.config.pw, MouseClick, captcha)
      .then(() => {
        let eventUUID = uuid.v4();
        //login timeout 10sec
        let id = setTimeout(() => {
          pcallback.unregisterEvent(eventUUID);
          //only debug
          phantomPage.property("title")
          .then(title => {
            debug(format("not response from callback. checking problem... (page: {0})", title));
          }, ()=>{});
          phantomPage.evaluate(function() {
            //has error?
            var hasErr = document.querySelector("#err_common");
            //has captcha?
            //wtf naver why c"h"ptcha? it is "captcha"!
            var hasCaptcha = document.querySelector("#chptcha");
            console.log("&log hasError: " + hasErr);
            console.log("&log hasCaptcha: " + hasCaptcha);
            return [hasErr ? hasErr.innerText : false, hasCaptcha ? hasCaptcha : false];
          })
          .then(hasProblem => {
            if(hasProblem[0] || hasProblem[1]) reject(hasProblem);
            else reject(false);
          });
        }, 10000);
        pcallback.registerEvent({uuid: eventUUID, command: "&onLoadFinished", callback: () => {
          if(pcallback.getLastUrl() === "http://www.naver.com/") {
            clearTimeout(id);
            pcallback.unregisterEvent(eventUUID);
            resolve();
          }
        }});
      });
    });
  }
}

exports.create = () => {return new Promise(function(resolve) {
  let instance = new NaverAccount();
  if(fs.existsSync(CONFIG)) {
    debug("constructor with config...");
    instance.loadConfig()
    .then(() => {
      debug("finish load config");
      resolve(instance);
    }, err => {
      console.warn(chalk.yellow(TAG + " config load fail\n"), err);
      resolve(instance);
    });
  }else {
    debug("constructor without config...");
    resolve(instance);
  }
});};
