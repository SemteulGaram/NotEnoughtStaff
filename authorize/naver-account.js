const TAG = "NES:naver-account";

let debug = require("debug")(TAG);
let fs = require("fs");
let chalk = require("chalk");
let uuid = require("uuid");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let pcallback = require("../phantom-additional/phantom-callback.js");

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
      }

      //check parent folder and mkdir progress
      if(!fs.existsSync(CONFIG_FOLDER)) {
        fs.mkdirAsync(CONFIG_FOLDER)
        .then(_ => {
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
        if(status === "fail") {
          reject(new Error("connection status is fail"));
          return;
        }
        return phantomPage.evaluate(function(id, pw, click) {
          //fill form
          document.querySelector("input#id").setAttribute("value", id);
          document.querySelector("input#pw").setAttribute("value", pw);

          //login button
          click(document.querySelector("input[type=submit]"));
          try {
            //add device? - true
            click(document.querySelector("span[class=btn_upload] > a"));
            //stay login? - false
            click(document.querySelector("span[class=btn_cancel3] > a"));
          }catch(err) {
            console.error(err);
          }
        }, that.config.id, that.config.pw, require("../utils/mouse-click.js"));
      })
      .then(_ => {
        let eventUUID = uuid.v4();
        let id = setTimeout(() => {
          pcallback.unregisterEvent(eventUUID);
          reject("login timeout");
        }, 10000);
        pcallback.registerEvent({uuid: eventUUID, command: "&onLoadFinished", callback: success => {
          if(pcallback.getLastUrl() === "http://www.naver.com/") {
            clearTimeout(id);
            pcallback.unregisterEvent(eventUUID);
            resolve(phantomPage);
          }
        }});
      })
      .catch(err => {
        reject(err);
      });
    });
  }
}

exports.create = () => {return new Promise(function(resolve, reject) {
  let instance = new NaverAccount();
  if(fs.existsSync(CONFIG)) {
    debug("constructor with config...");
    instance.loadConfig()
    .then(_ => {
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
})};
