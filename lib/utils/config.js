const debug = require("debug")("stgr-utils:config");
const format = require("string-format");
const fs = require("fs");
Promise.promisifyAll(fs);
const path = require("path");

class Config {
  constructor(configPath, defaultConfig, configValidate = () => {return [true, "no-reason"];}) {
    this.defaultConfig = defaultConfig;
    this.config = {};
    this.configPath = configPath;
    this.configValidate = configValidate;
  }

  // [Promise] check config exists
  exists() {
    return fs.statAsync(this.configPath);
  }

  // [Promise] load config
  load() {
    const that = this;
    return new Promise(function(resolve, reject) {
      debug(format("[{0}] config loading...", path.basename(that.configPath)));

      // check config file exists
      that.exists()
      .then(() => {
        fs.readFileAsync(that.configPath, "utf-8")
        .then(data => {
          try {
            that.config = JSON.parse(data);
            debug(format("[{0}] config loaded", path.basename(that.configPath)));
            that.check()
            .then(v => resolve(v))
            .catch(err => reject(err));
          }catch(err) {
            // parsing error
            debug(format("[{0}] config parse fail: {1}", path.basename(that.configPath), err));
            reject(err);
          }
        }, err => {
          // fs error
          debug(format("[{0}] config load fail: {1}", path.basename(that.configPath), err));
          reject(err);
        });
      })
      // file not exists
      .catch(() => {
        debug(format("[{0}] config file not exists", path.basename(that.configPath)));
        reject(new Error("config file not exists"));
      });
    });
  }

  // [Promise] save config
  save() {
    const that = this;
    return new Promise(function(resolve, reject) {
      debug(format("[{0}] config saving...", path.basename(that.configPath)));

      //save progress
      let data;
      let save = () => {
        try {
          data = JSON.stringify(that.config);
        }catch(err) {
          debug(format("[{0}] config stringify fail: {1}", path.basename(that.configPath), err));
          reject(err);
          return;
        }
        return fs.writeFileAsync(that.configPath, data,
          "utf-8")
        .then(() => {
          debug(format("[{0}] config saved", path.basename(that.configPath)));
          resolve();
        })
        // fs error
        .catch(err => {
          debug(format("[{0}] config file writing fail: {1}", path.basename(that.configPath), err));
          reject(err);
        });
      };

      // check parent folder and mkdir progress
      fs.statAsync(path.dirname(that.configPath))
      // exists
      .then(() => {
        save();
      })
      // not exists
      .catch(() => {
        fs.mkdirAsync(path.dirname(that.configPath))
        .then(() => {
          debug(format("[{0}] config folder made", path.basename(that.configPath)));
          return save();
        })
        .catch(err => {
          reject(err);
        });
      });
    });
  }

  // [Promise] check config is valid
  check() {
    const that = this;
    return new Promise(function(resolve, reject) {
      debug(format("[{0}] checking config...", path.basename(that.configPath)));

      let somethingWrong = false;

      // check all keys
      Object.getOwnPropertyNames(that.defaultConfig).forEach(v => {
        if(that.config[v] === undefined) {
          that.config[v] = that.defaultConfig[v];
          somethingWrong = true;
        }
      });

      let prime = () => {
        const check = that.configValidate(that.defaultConfig, that.config);
        if(check[0]) {
          resolve(check[1]);
        }else {
          reject(check[1]);
        }
      };

      if(somethingWrong) {
        // save changes
        return that.save()
        .then(() => prime())
        .catch(err => reject(err));
      }else {
        // or just resolve
        prime();
      }


    });
  }

  // get config
  get(key) {
    return this.config[key];
  }

  // set config
  set(key, value, noSave) {
    this.config[key] = value;
    if(!noSave) this.saveConfig();
  }
}

module.exports = Config;
