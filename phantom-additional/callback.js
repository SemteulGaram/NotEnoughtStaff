let debug = require("debug")("NES:pcallback");
let events = [];
let lastUrl = "", tickLastUrl = "";

exports.event = function(str, obj) {
  let cmd = str.split(" ");
  events.map(element => {if(element.command === cmd[0]) element.callback(str.substring(element.command.length+1, str.length), obj);});
};

//example evt: {uuid: "uuid-string", command: "&yourCommand", callback: function(fullCommandStr)}
exports.registerEvent = function(evt) {
  debug("registered: " + evt.command + " ("+evt.uuid+")");
  events.push(evt);
};

exports.unregisterEvent = function(uuid) {
  for(let i in events) {
    if(events[i].uuid === uuid) {
      debug("unregistered: " + events[i].command + " ("+events[i].uuid+")");
      events.splice(i, 1);
      return true;
    }
  }
  debug("fail unregistered(not found): (" + uuid + ")");
  return false;
};

exports.getLastUrl = () => {return lastUrl;};
exports.getTickLastUrl = () => {return tickLastUrl;};

exports.registerEvent({uuid: "00000001", command: "&onUrlChanged", callback: url => {lastUrl = url;}});
exports.registerEvent({uuid: "00000002", command: "&tick-onUrlChanged", callback: url => {tickLastUrl = url;}});
