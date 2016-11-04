let NotEnoughStaff = require("../index.js");
let debug = require("debug")("NES:test");
let fs = require("fs");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let nes;
NotEnoughStaff.create()
.then(instance => {
  nes = instance;
  instance.start().then(success => {
    debug(success);
    instance.request("example-plugin", ["topRankSearchWord"])
    .then(result => {
      debug(result);
    })
    .catch(err => {
      debug("err", err);
    });
    setTimeout(() => {

    }, 5000);
  })
  .catch(err => {
    debug("instance err", err);
  });
});
