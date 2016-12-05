let debug = require("debug")("NES-P:post-checker");
let format = require("string-format");
let fs = require("fs");

const CONFIG = "PostChecker.json";

class PostChecker {
  constructor(uuid, controller) {
    this.uuid = uuid;
    this.controller = controller;
    this.config = {};
    this.defaultConfig = {
      board: []
    };
    this.workQueue = [];
  }

  tick(page) {
    let that = this;
    return new Promise(function(resolve, reject) {
      resolve(that, page);
      reject();
    });
  }

  request(page, options) {
    let that = this;
    switch(options[0]) {
    case "addBoard":// [board_id]
      break;
    case "addCheckPattern": // []
      break;
    case "getPost": // [post_id]
      return new Promise(function(resolve, reject) {
        let uuid = that.controller.createUUID(), someErrorMsg = false;
        that.controller.registerEvent({uuid: uuid, command: "&onAlert", callback: function(msg) {
          someErrorMsg = msg;
        }});
        page.open(format("http://cafe.naver.com/minecraftpe/{0}", options[1]))
        .then(success => {
          that.controller.unregisterEvent(uuid);
          if(someErrorMsg) {
            reject(new Error(someErrorMsg));
          }
          if(success === "fail") {
            reject(new Error("unknown load fail"));
          }
          return page.property("content");
        })
        .then(content => {
          resolve(content);
        })
        .catch(err => {
          that.controller.unregisterEvent(uuid);
          reject(err);
        });
      });
    default:
      return new Promise(function(resolve, reject) {
        reject(new Error("Undefined method: " + options[0]));
      });
    }
  }

  existsConfig() {
    return fs.existsSync(format("{0}/{1}", this.controller.CONFIG_FOLDER, CONFIG));
  }

  loadConfig() {
    let that = this;
    return new Promise(function(resolve, reject) {
      if(that.existsConfig()) {
        fs.readFileAsync(format("{0}/{1}", this.controller.CONFIG_FOLDER, CONFIG), "utf-8")
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
        return fs.writeFileAsync(format("{0}/{1}", this.controller.CONFIG_FOLDER, CONFIG), JSON.stringify(that.config), "utf-8")
        .then(() => {
          debug("save config");
          resolve();
        });
      };

      //check parent folder and mkdir progress
      if(!fs.existsSync(that.controller.CONFIG_FOLDER)) {
        fs.mkdirAsync(that.controller.CONFIG_FOLDER)
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
}

class Board {
  constructor(id, readableTitle) {
    this.id = id;
    this.title = readableTitle;
  }

  toString() {
    return "[object Board]";
  }

  static stringify(obj) {
    if(!(obj instanceof Board)) {
      throw new Error("object must instance of Board");
    }

    let innerData = {
      type: "board",
      id: this.id,
      title: this.readableTitle
    };

    return JSON.stringify(innerData);
  }

  static parse(str) {

    let data = JSON.parse(str);

    if(data.type !== "board") {
      throw new Error("string must instance of stringify Board object");
    }

    return new Board(data.id, data.title);
  }
}

class Post {
  constructor(id, readableTitle, author, dateMill) {
    this.id = id;
    this.title = readableTitle;
    this.author = author || null;
    this.date = dateMill || null;
  }

  toString() {
    return "[object Post]";
  }

  static stringify(obj) {
    if(!(obj instanceof Post)) {
      throw new Error("object must instanceof Post");
    }

    let innerData = {
      type: "post",
      id: this.id,
      title: this.title,
      author: this.author,
      date: this.date,
    };

    return JSON.stringify(innerData);
  }

  static parse(str) {

    let data = JSON.parse(str);

    if(data.type !== "post") {
      throw new Error("string must instance of stringify Post object");
    }

    return new Post(data.id, data.title, data.author, data.date);
  }

  refresh() {
    return new Promise(function(resolve, reject) {

    });
  }
}

class CheckPattern {
  constructor(what) {

  }

  toString() {
    return "[object CheckPattern]";
  }
}

exports.create = (uuid, controller) => {
  let that = this;
  return new Promise(function(resolve) {
    debug("create instance");
    let instance = new PostChecker(uuid, controller);
    instance.loadConfig()
    .then(() => {
      resolve(instance);
    }, () => {
      that.config = that.defaultConfig;
      instance.saveConfig()
      .then(() => {
        resolve(instance);
      })
      .catch(() => {
        resolve(instance);
      });
    });
  });
};
