let NotEnoughStaff = require("../index.js");
let debug = require("debug")("NES:test");
let format = require("string-format");
let fs = require("fs");
let Promise = require("bluebird");
Promise.promisifyAll(fs);

let LogFile = require("../utils/log-file.js");

let nes;
NotEnoughStaff.create((alertLevel, message, thumbUrl, targetUrl) => {
  debug(format("[Level:{0}] {1} {2} {3}", alertLevel, message, thumbUrl, targetUrl));
})
.then(instance => {
  nes = instance;
  instance.start().then(success => {
    debug(success + " " + nes.isAlive);
    if(success === "fail") return;

    // instance.request("nes-example-plugin", ["getNickname"])
    // .then(result => {
    //   debug(result);
    //   return instance.request("nes-example-plugin", ["sendAlert"]);
    // })
    // .then(() => {})
    // .catch(err => {
    //   debug("err", err);
    // });

    instance.request("nes-post-checker", ["getPost", 1347])
    .then(content => {
      LogFile("testContent.html", content, {overwrite: false})
      .then(() => {
        debug("log finish");
      })
      .catch(err => {
        debug("error occur while logging");
        debug(err);
      });
      instance.renderReq("testContent.jpeg")
      .then(() => {
        debug("render finish");
      }, err => {
        debug("error occur while rendering");
        debug(err);
      });
    })
    .catch(err => {
      debug(err);
    });
  })
  .catch(err => {
    debug("instance err", err);
  });
});
