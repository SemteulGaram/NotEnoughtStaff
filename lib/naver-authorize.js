const chalk = require("chalk");
const fs = require("fs");
Promise.promisifyAll(fs);
const format = require("string-format");
const uuid = require("uuid");
const log = require("./logger.js").create("NES:naver-authorize");
const pcb = require("./phantom-callback.js");
const captcha = require("./naver-captcha.js");
const mouseClick = require("./utils/mouse-click.js");

class NaverAccount {
  constructor(config) {
    this.config = config;
  }

  hasIdentify() {
    return this.config.get("naver_id") && this.config.get("naver_pw");
  }

  doLogin(uid, phantomPage) {
    //doing login naver
    const that = this;
    return new Promise((resolve, reject) => {
      if(!that.hasIdentify()) {
        reject(new Error("naver id or password is null"));
        return;
      }
      log.i("try naver login...");
      log.d("connect to https://nid.naver.com/nidlogin.login ...");
      phantomPage.open("https://nid.naver.com/nidlogin.login")
      .then(status => {
        log.d(format("connect status: {0}" + status));
        if(status === "fail") reject(new Error("connection fail"));

        return that._loginCheck(uid, phantomPage);
      })
      .then(() => resolve())
      .catch(hasProblem => {
        if(hasProblem) {
          //detect normal error
          if(hasProblem[0]) reject(hasProblem[0]);
          //detect captcha
          else if(hasProblem[1]) {
            //detected captcha. login again
            return captcha(phantomPage) //wait user input...
            .then(answer => {
              return that._loginCheck(uid, phantomPage, answer);
            }, err => {
              log.e("unknown Captcha inner error occur");
              reject(err);
            })
            .then(() => resolve());
          //never happen
          }else {
            log.f(hasProblem);
            reject("unknown error occur");
          }
        }else {
          reject("login timeout");
        }
      });
    });
  }

  _loginCheck(uid, phantomPage, captcha) {
    const that = this;
    return new Promise(function(resolve, reject) {
      phantomPage.property("title")
      .then(title => {
        log.d(format("login checking... (page: {0}, captcha: {1})", title, captcha || "undefined"));
      }, ()=>{});
      phantomPage.evaluate(function(id, pw, click, captcha, pid) {
        console.log("debug inner login progressing...");
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
        console.log("debug inner login progress finished");
      }, that.config.get("naver_id"), that.config.get("naver_pw"), mouseClick, captcha, uid)
      .then(() => {
        const loadFinishUUID = uuid.v4();
        const urlChangeUUID = uuid.v4();
        let lastUrl;
        //login timeout 10sec
        const timeoutId = setTimeout(() => {
          pcb.unregisterEvent(loadFinishUUID);
          pcb.unregisterEvent(urlChangeUUID);
          //only debug
          phantomPage.property("title")
          .then(title => {
            log.w(format("not response from callback. checking problem... (page: {0})", title));
          }, ()=>{});
          phantomPage.evaluate(function(pid) {
            // has error?
            var hasErr = document.querySelector("#err_common");
            // has captcha?
            // NAVER... c"h"ptcha...? it is "captcha"!
            var hasCaptcha = document.querySelector("#chptcha");
            console.log("debug hasError: "+hasErr);
            console.log("debug hasCaptcha: "+hasCaptcha);
            return [hasErr ? hasErr.innerText : false, hasCaptcha ? hasCaptcha : false];
          }, uid)
          .then(hasProblem => {
            if(hasProblem[0] || hasProblem[1]) reject(hasProblem);
            else reject(false);
          });
        }, 10000);

        pcb.registerEvent({
          uuid: urlChangeUUID, pageUUID: uid,
          command: "&onUrlChanged",
          callback: url => {
            lastUrl = url;
          }
        });

        pcb.registerEvent({uuid: loadFinishUUID, pageUUID: uid,
          command: "&onLoadFinished",
          callback: () => {
            // login finish when url changed to "http://www.naver.com/" 
            if(lastUrl === "http://www.naver.com/") {
              clearTimeout(timeoutId);
              pcb.unregisterEvent(loadFinishUUID);
              pcb.unregisterEvent(urlChangeUUID);
              resolve();
            }
          }
        });

      });
    });
  }
}

exports.create = config => {return new Promise(function(resolve) {
  const instance = new NaverAccount(config);
  // do noting
  resolve(instance);
});};
