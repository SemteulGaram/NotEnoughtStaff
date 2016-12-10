const format = require("string-format");
const shortUUID = require("./utils/short-uuid.js");
const logger = require("./logger.js");
const log = logger.create("NES:phantom-callback");
const innerLog = logger.create("NES:phantom-page");
const events = [];

exports.event = function(str) {
  const cmd = str.split(" ");
  if(cmd.length >= 3 && cmd[0] === "&onConsoleMessage" && typeof innerLog[cmd[2]] === "function") {
    innerLog[cmd[2]](format("[page: {0}] {1}", shortUUID(cmd[1]), cmd.splice(3, cmd.length - 3).join(" ")));
  }

  events.forEach(element => {
    if(cmd.length >= 2 && element.pageUUID === cmd[1] && element.command === cmd[0])
      element.callback(str.substring(
        cmd[0].length + cmd[1].length + 2, str.length));
  });
};

//example evt: {uuid: "uuid-string", pageUUID: "page-uuid", command: "&yourCommand", callback: function(fullCommandStr)}
exports.registerEvent = function(evt) {
  log.d(format("event registered: ({2} page) - {0} ({1})",
    evt.command, shortUUID(evt.uuid), shortUUID(evt.pageUUID)));
  events.push(evt);
};

exports.unregisterEvent = function(uid) {
  for(let i in events) {
    if(events[i].uuid === uid) {
      log.d(format("event unregistered: ({2} page) - {0} ({1})",
        events[i].command, shortUUID(events[i].uuid), shortUUID(events[i].pageUUID)));
      events.splice(i, 1);
      return true;
    }
  }
  log.d(format("fail unregistered(not found): ({0})", shortUUID(uid)));
  return false;
};
