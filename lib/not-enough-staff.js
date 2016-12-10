global.Promise = require("bluebird");

const format = require("string-format");
const fs = require("fs");
Promise.promisifyAll(fs);
const path = require("path");
const phantom = require("phantom");
const uuid = require("uuid");
const logger = require("./logger.js");
const log = logger.create("NES:main");
const plog = logger.createForPhantom("NES:phantom");
const promiseLoop = require("./utils/promise-loop.js");
const shortUUID = require("./utils/short-uuid.js");
const Config = require("./utils/config.js");
const pcb = require("./phantom-callback");

const CONFIG_FOLDER = "./config";
const CONFIG = "NotEnoughStaff.json";

const LOG_FOLDER = "./logs";

class NotEnoughStaff {
  constructor(options) {
    // variable initial
    this.varReset();

    // check options
    // default: true (this variable handling on exports.create)
    this.autoStart = options.autoStart !== false;
  }

  // readable name
  toString() {return "[object NotEnoughStaff]";}

  // variable reset
  varReset() {
    this.isAlive = false;
    this._defaultConfig = {
      naver_id: null,
      naver_pw: null,
      requestDelay: 2000,
      requestDelayPerPage: 3000
    };
    this.config = new Config(path.join(CONFIG_FOLDER, CONFIG),
      this._defaultConfig);
    this.pages = {};
    this.pageUUIDs = [];
  }

  // [Promise] reset phantom instance and return
  phantomReset() {
    const that = this;
    return new Promise(function(resolve, reject) {
      if(that.pinstance) {
        log.d("exit privious phantom instance");
        // try stop privious instance
        /* eslint no-empty: off */
        try {typeof that.pinstance.close === "function"
          && that.pinstance.exit();}catch(err){}
      }

      log.d("create new phantom instance...");

      phantom.create([], {logger: plog})
      .then(instance => {
        that.pinstance = instance;
        resolve(instance);
      })
      .catch(err => {
        log.f("phantom instance create fail");
        reject(err);
      });
    });
  }

  // [Promise] get phantom instance
  getPhantom() {
    const that = this;
    if(this.pinstance)
      return new Promise(function(resolve) {resolve(that.pinstance);});
    else return this.phantomReset();
  }

  // [Promise] create page instance and return uuid
  createPage() {
    return this.getPhantom()
    .then(instance => {
      return instance.createPage();
    })
    .then(page => {
      const uid = uuid.v4();

      // userAgent for Chrome ver54.0.2840.87
      page.setting("userAgent", "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36");
      page.setting("javascriptEnable", true);
      page.setting("loadImages", true);
      // callback
      page.property("onAlert", function(msg, uid) {
        console.log("&onAlert", uid, msg);
      }, uid);
      page.property("onConsoleMessage", function(msg, uid) {
        console.log("&onConsoleMessage", uid, msg);
      }, uid);
      page.property("onError", function(msg, uid) {
        console.log("&onError", uid, msg);
      }, uid);
      page.property("onLoadStarted", function(uid) {
        console.log("&onLoadStarted", uid);
      }, uid);
      page.property("onLoadFinished", function(status, uid) {
        console.log("&onLoadFinished", uid, status);
      }, uid);
      page.property("onUrlChanged", function(url, uid) {
        console.log("&onUrlChanged", uid, url);
      }, uid);

      pcb.registerEvent({
        uuid: uuid.v4(),
        pageUUID: uid,
        command: "&onError",
        callback: msg => {
          plog.d(format("[{0} page inner ERROR] {1}", shortUUID(uid), msg));
        }
      });

      this.pages[uid] = page;
      log.d(format("page created: {0}", shortUUID(uid)));

      return uid;
    });
  }

  // [Promise] get page
  getPage(uid) {
    const that = this;
    return new Promise(function(resolve, reject) {
      if(that.pages[uid]) resolve(that.pages[uid]);
      else {
        const reason = format("page instance not exists: {0}", shortUUID(uid));
        log.e(reason);
        reject(new Error(reason));
      }
    });
  }

  // [Promise] process start
  start() {
    const that = this;
    return new Promise(function(resolve, reject) {
      that.isAlive = true;

      log.i("NotEnoughStaff now start...");

      // load config first
      that.config.exists()
      .then(() => {
        return that.config.load();
      }, () => {
        // config not exists
        return that.config.save()
        .then(() => {
          return that.config.load();
        });
      })
      .then(() => {
        // create phantom instance
        return that.getPhantom();
      })
      .then(() => {
        log.d("create pages...");
        // create 3 pages
        return promiseLoop((i) => {return i<3;}, (i) => {
          return that.createPage()
          .then(uid => {
            that.pageUUIDs[i] = uid;
            return ++i;
          });
        });
      })
      .then(() => {
        log.d("create naver-account instance...");
        return require("./naver-authorize.js").create(that.config);
      })
      .then(NAccount => {
        log.i(format("login to NAVER (id:{0})", that.config.get("naver_id")));
        return NAccount.doLogin(that.pageUUIDs[0], that.pages[that.pageUUIDs[0]]);
      })
      .then(() => {

      })
      .then(() => {
        // return instance
        resolve(that);
      })
      .catch(err => log.f(err));
    });
  }

  // process stop
  stop() {
    this.isAlive = false;
    log.i("NotEnoughStaff stop...");
    log.d("phantom instance closing...");
    this.pinstance.exit();
    this.pinstance = null;
    this.config.save();
  }
}

exports.create = (options) => {
  if(Number.isInteger(options.logLevel)) logger.logLevel(options.logLevel);

  log.d("create new instance:", options || "(no-options)");

  return new Promise(function(resolve, reject) {
    const instance = new NotEnoughStaff(options);

    // is autostart?
    if(instance.autoStart) resolve(instance.start());
    // or just return instance
    else resolve(instance);
  });
};
