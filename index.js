const VERSION = "v1.0.0";
const TAG = "NES:main";
const CONFIG = "./config/NotEnoughStaff.json";
const CONFIG_FOLDER = "./config";

let debug = require("debug")(TAG);
let chalk = require("chalk");
let fs = require("fs");
let uuid = require("uuid");
let Phantom = require("phantom");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let NaverAccount = require("./authorize/naver-account.js");
let PluginManager = require("./plugin/plugin-manager.js");
let plogger = require("./phantom-additional/logger.js").getLogger();
let pcallback = require("./phantom-additional/callback.js");
let PhantomRender = require("./phantom-additional/render.js");

class NotEnoughStaff {
  constructor() {
    console.log(chalk.cyan("NotEnoughStaff " + VERSION + " loading..."));

    this.isAlive = false;
    this.config = {};
    this._defaultConfig = {
      enablePluginName: ["example-plugin"],
      minDelay: 2000,
      maxErrorCount: 5
    };
    this.account = null;
    this.plugin = null;
    this.phantom = null;
    this.ppage = null;
    this.rpage = null;
    this.tickErrorCount = 0;

    this._lastRequest = null;
    this._currentTimeoutToken;

    this.tick = () => {
      if(this.isAlive) {
        let that = this;
        this._lastRequest = Date.now();
        this.plugin.doTick().then(() => {
          let delay = (that.config.minDelay - (Date.now() - that._lastRequest));
          that._currentTimeoutToken = setTimeout(this.tick, delay < 0 ? 0 : delay);
        }, (errObj) => {
          let err = errObj[0], plugin = errObj[1] || {};
          console.warn(TAG + " Error occur during tick on Plugin("+plugin.name+")\n", err);
          if(++this.tickErrorCount === this.config.maxErrorCount) {
            console.error(chalk.red(TAG + " tickErrorCount reach max! ticking force stopped!"));
            this.isAlive = false;
          }else {
            let delay = (that.config.minDelay - (Date.now() - that._lastRequest));
            that._currentTimeoutToken = setTimeout(this.tick, delay < 0 ? 0 : delay);
          }
        });
      }
    };
  }

  toString() {
    return "[NotEnoughStaff object]";
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

  checkConfig() {
    debug("checking config...");
    let keys = Object.getOwnPropertyNames(this._defaultConfig);
    keys.map(element => {if(this.config[element] === undefined) this.config[element] = this._defaultConfig[element];});

    if(parseInt(this.config.minDelay) == this.config.minDelay) {
      this.config.minDelay = 2000;
    }
  }

  start() {
    //start progress
    this.isAlive = true;

    pcallback.registerEvent({uuid: uuid.v4(), command: "&onError", callback: msg => {
      plogger.warn("Req: " + msg);
    }});

    pcallback.registerEvent({uuid: uuid.v4(), command: "&onUrlChanged", callback: url => {
      plogger.info("Req - URL change: " + url);
    }});

    pcallback.registerEvent({uuid: uuid.v4(), command: "&tick-onError", callback: msg => {
      plogger.warn("Tic: " + msg);
    }});

    let that = this;
    console.log(chalk.cyan("NotEnoughStaff " + VERSION + " starting..."));
    return this.phantom.createPage()
    .then(page => {
      that.ppage = page;
      that.plugin.setTickPage(page);
      //userAgent for Chrome ver54.0.2840.87
      page.setting("userAgent", "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36");
      page.setting("javascriptEnable", true);
      page.setting("loadImages", true);
      page.property("onAlert", function(msg) {
        console.log("&tick-onAlert", msg);
      });
      page.property("onConsoleMessage", function(msg) {
        console.log("&tick-onConsoleMessage", msg);
      });
      page.property("onError", function(msg) {
        console.log("&tick-onError", msg);
      });
      page.property("onLoadStarted", function() {
        console.log("&tick-onLoadStarted");
      });
      page.property("onLoadFinished", function(status) {
        console.log("&tick-onLoadFinished", status);
      });
      page.property("onUrlChanged", function(url) {
        console.log("&tick-onUrlChanged", url);
      });
      debug("phantom tickPage created");
      return this.phantom.createPage();
    })
    .then(page => {
      that.rpage = page;
      that.plugin.setRequestPage(page);
      //userAgent for Chrome ver54.0.2840.87
      page.setting("userAgent", "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36");
      page.setting("javascriptEnable", true);
      page.setting("loadImages", true);
      page.property("onAlert", function(msg) {
        console.log("&onAlert", msg);
      });
      page.property("onConsoleMessage", function(msg) {
        console.log("&onConsoleMessage", msg);
      });
      page.property("onError", function(msg) {
        console.log("&onError", msg);
      });
      page.property("onLoadStarted", function() {
        console.log("&onLoadStarted");
      });
      page.property("onLoadFinished", function(status) {
        console.log("&onLoadFinished", status);
      });
      page.property("onUrlChanged", function(url) {
        console.log("&onUrlChanged", url);
      });
      debug("phantom requestPage created");
      return that.account.doLogin(that.rpage);
    })
    .then(() => {
      debug("naver login successful");
      //ticking start
      that.lastRequest = Date.now();
      this.tick();
      return true;
    })
    .catch(err => {
      console.error(chalk.red("Error occur during phantom execute\n"), err);
      return PhantomRender(that.rpage, "NES-debug.jpeg")
      .then(fileName => {
        console.error("debug page-img created: /screenshot/" + fileName);
        that.stop(); //TODO: make nes.stop to Promise
        return false;
      });
    });
  }

  stop() {
    console.log(chalk.magenta("NotEnoughStaff " + VERSION + " shutdown..."));
    //stop progress
    this.isAlive = false;
    console.log(chalk.magenta("clearing timeout..."));
    try {clearTimeout(this.currentTimeoutToken);}catch(err) {console.log(err);}
    console.log(chalk.magenta("Phantom object exiting..."));
    this.phantom.exit();
  }

  request(nameOrUUID, options, callbackPromise) {
    return this.plugin.doRequest(nameOrUUID, options, callbackPromise);
  }
}

exports.create = () => {return new Promise(function(resolve) {
  let instance = new NotEnoughStaff();

  let secondLoad = () => {return NaverAccount.create()
  .then(accountInstance => {
    debug("NaverAccount instance load success");
    instance.account = accountInstance;
    return Phantom.create([], {
      logger: plogger
    });
  })
  .then(phantomInstance => {
    debug("Phantom instance load success");
    instance.phantom = phantomInstance;
    return PluginManager.create(instance.config.enablePluginName);
  })
  .then(pluginManagerInstance => {
    debug("PluginManager instance load success");
    instance.plugin = pluginManagerInstance;
    debug("instance load finished");
    resolve(instance);
  });};


  if(instance.existsConfig()) {
    instance.loadConfig().then(() => {
      instance.checkConfig();
      return secondLoad();
    })
    .catch(() => {
      resolve(instance);
    });
  }else {
    instance.config = instance._defaultConfig;
    instance.saveConfig()
    .then(() => {
      return secondLoad();
    })
    .catch(() => {
      resolve(instance);
    });
  }

});};
