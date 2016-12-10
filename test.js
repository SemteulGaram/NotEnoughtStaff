const log = require("./lib/logger.js").create("NES:test");
const NotEnoughStaff = require("./lib/not-enough-staff.js");
log.d("test started");

let nes;

NotEnoughStaff.create({
  logLevel: 0,
  autoStart: true
})
.then(instance => {
  nes = instance;
  log.i("test finished");
  //log.i(nes);
})
.then(() => setTimeout(() => {nes.stop();}, 3000));
