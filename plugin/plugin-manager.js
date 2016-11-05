let TAG = "NES:plugin-manager";

let debug = require("debug")(TAG);
let chalk = require("chalk");
let fs = require("fs");
let uuid = require("uuid");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let PromiseLoop = require("../utils/promise-loop.js");
let PhantomCallback = require("../phantom-additional/callback.js");

class PluginManager {
  constructor() {
    this.pluginInstance = [];
    this.tickIndex = 0;
    this.ppage = null;
  }

  addPlugin(name) {
    debug("plugin adding... : " + name);
    let that = this;
    return new Promise(function(resolve, reject) {
      try {
        let iuuid = uuid.v4();
        require("../plugins/" + name + ".js").create(iuuid, {
          registerCallback: PhantomCallback.registerEvent,
          unregisterCallback: PhantomCallback.unregisterEvent,
          createUUID: uuid.v4
        }).then(instance => {
          that.pluginInstance.push({uuid: iuuid, name: name, instance: instance});
          resolve(iuuid);
        });
      }catch(err) {
        console.warn(chalk.yellow(TAG + " Plugin add fail: " + name), err);
        reject(err);
      }
    });
  }

  removePlugin(name) {
    for(let i in this.pluginInstance) {
      if(this.pluginInstance[i].name === name) {
        debug("plugin removed: " + name);
        this.pluginInstance.splice(i, 1);
        return true;
      }
    }
    debug("plugin remove fail(not found): " + name);
    return false;
  }

  removePluginFromUUID(uuid) {
    for(let i in this.pluginInstance) {
      if(this.pluginInstance[i].uuid === uuid) {
        debug("plugin removed: " + this.pluginInstance[i].name);
        this.pluginInstance.splice(i, 1);
        return true;
      }
    }
    debug("plugin remove fail(not found): " + uuid);
    return false;
  }

  _findIndex(nameOrUUID) {
    for(let i in this.pluginInstance) {
      if(this.pluginInstance[i].name === nameOrUUID || this.pluginInstance[i].uuid === nameOrUUID) {
        return i;
      }
    }
    debug("plugin findIndex fail(not found): " + name);
    return false;
  }

  setTickPage(page) {
    this.ppage = page;
  }

  setRequestPage(page) {
    this.rpage = page;
  }

  doTick(_loopCount) {
    let that = this;
    //if don't have page instance
    if(!this.ppage)
      return new Promise(function(resolve, reject) {
        reject(new Error("PluginManager doesn't have phantom page instance"));
      });
    if(this.tickIndex >= this.pluginInstance.length) {
      //No plugins
      if(this.pluginInstance.length === 0)
        return new Promise(function(resolve) {resolve();});
      this.tickIndex = 0;
    }

    if(typeof this.pluginInstance[this.tickIndex].instance.tick !== "function") {
      _loopCount = _loopCount || 1;
      //Every plugin doesn't have tick function
      if(_loopCount >= this.pluginInstance.length)
        return new Promise(function(resolve) {resolve();});
      //loop to next
      return this.doTick(++_loopCount);
    }

    return new Promise(function(resolve, reject) {
      return that.pluginInstance[that.tickIndex].instance.tick(that.ppage).then(finish => {
        if(finish) that.tickIndex++;
        resolve();
      })
      .catch(err => {
        reject(err, that.pluginInstance[that.tickIndex]);
      });
    });
  }

  doRequest(nameOrUUID, options) {
    debug("request("+nameOrUUID+") " + options);
    //if don't have page instance
    if(!this.rpage) {
      return new Promise(function(_, reject) {
        reject(new Error("PluginManager doesn't have phantom page instance"));
      });
    }

    //find plugin
    let i = this._findIndex(nameOrUUID);
    if(i === false) {
      return new Promise(function(_, reject) {
        reject(new Error("Unknown plugin name or uuid: " + nameOrUUID));
      });
    }

    //execute
    let that = this;
    return new Promise(function(resolve, reject) {
      if(typeof that.pluginInstance[i].instance.request !== "function") {
        reject(new Error("Plugin("+nameOrUUID+") don't have request function"));
      }else {
        that.pluginInstance[i].instance.request(that.rpage, options).then(returnOptions => {
          resolve(returnOptions);
        });
      }
    });
  }
}

exports.create = list => {
  return new Promise(function(resolve, reject) {
    list = list || [];
    let instance = new PluginManager();

    PromiseLoop(function(count) {
      return count < list.length;
    }, function(count) {
      return instance.addPlugin(list[count])
      .then(() => {return ++count;});
    })
    .then(() => resolve(instance), err => reject(err));
  });
};
