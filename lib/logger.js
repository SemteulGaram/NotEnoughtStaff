const chalk = require("chalk");
const format = require("string-format");
// phantom-callback instance (prevent for redefine)
let pcb;

// 0: DEBUG;
// 1: INFO;
// 2: WARN;
// 3: ERROR;
// 4: FATAL;
// 5: NO_LOG;
let level = 1;
let plevel = 2;

exports.create = (prefix, style) => {
  return new Logger(prefix, style);
};

exports.createForPhantom = (prefix, style) => {
  return new PhantomLogger(prefix, style);
};

exports.logLevel = (lv) => {
  level = lv;
};



/* eslint no-console: "off" */
class Logger {
  constructor(prefix, styles) {
    this.styles = [];

    if(Array.isArray(styles) && styles.length > 0) {
      this.styles.push(...styles.filter(isValidstyle));
    }else if(typeof styles === "string" && isValidstyle(styles)) {
      this.styles.push(styles);
    }

    if(this.styles.length === 0) {
      this.styles.push(...getNextDefaultstyle());
    }

    this.prefix = applyChalkStyle(this.styles, ""
      + (prefix ? format("[{0}]", prefix) : "[unknown]"));
  }

  d(...args) {this.debug(...args);}
  i(...args) {this.info(...args);}
  w(...args) {this.warn(...args);}
  e(...args) {this.error(...args);}
  f(...args) {this.fatal(...args);}

  debug(...args) {
    if(level > 0) return;
    console.log(getDateString(), this.prefix + chalk.styles.gray.open,
      ...args, chalk.styles.gray.close);
  }

  info(...args) {
    if(level > 1) return;
    console.log(getDateString(), this.prefix, ...args);
  }

  warn(...args) {
    if(level > 2) return;
    console.log(getDateString(), this.prefix, chalk.styles.yellow.open
      + "WARN", ...args, chalk.styles.yellow.close);
  }

  error(...args) {
    if(level > 1) return;
    console.log(getDateString(), this.prefix, chalk.styles.red.open
      + "ERROR", ...args, chalk.styles.red.close);
  }

  fatal(...args) {
    if(level > 0) return;
    console.log(getDateString(), this.prefix, chalk.styles.bgRed.open
      + chalk.styles.black.open + "FATAL", ...args, chalk.styles.black.close
      + chalk.styles.bgRed.close);
  }
}

/* eslint no-console: "off" */
class PhantomLogger extends Logger {
  debug(...args) {
    if(plevel > 0) return;
    console.log(getDateString(), this.prefix + chalk.styles.gray.open,
      ...args, chalk.styles.gray.close);
  }

  info(...args) {
    if(!pcb) pcb = require("./phantom-callback.js");
    const str = args.join(" ");
    if(str[0] === "&") pcb.event(str);
    if(plevel > 1) return;
    console.log(getDateString(), this.prefix, ...args);
  }

  warn(...args) {
    if(plevel > 2) return;
    console.log(getDateString(), this.prefix, chalk.styles.yellow.open
      + "WARN", ...args, chalk.styles.yellow.close);
  }

  error(...args) {
    if(plevel > 1) return;
    console.log(getDateString(), this.prefix, chalk.styles.red.open
      + "ERROR", ...args, chalk.styles.red.close);
  }

  fatal(...args) {
    if(plevel > 0) return;
    console.log(getDateString(), this.prefix, chalk.styles.bgRed.open
      + chalk.styles.black.open + "FATAL", ...args, chalk.styles.black.close
      + chalk.styles.bgRed.close);
  }
}

function isValidstyle(style) {
  if(typeof style === "string" && typeof chalk[style] === "function") return true;
  selfLogger.w(format("Unknown style: {0}", style));
  return false;
}

let currentStyleIndex = 0;
const defaultStyles = [["red"], ["yellow"], ["green"], ["blue"], ["cyan"], ["magenta"],
  /*["white", "bgRed"],*/ ["white", "bgYellow"], ["white", "bgGreen"], ["white", "bgBlue"]];
function getNextDefaultstyle() {
  if(currentStyleIndex >= defaultStyles.length) currentStyleIndex = 0;
  return defaultStyles[currentStyleIndex++];
}

function applyChalkStyle(styles, str) {
  styles.forEach(v => {str = chalk[v](str);});
  return str;
}

function getDateString() {
  const dt = new Date();
  return format(/*"{0}.{1}.{2}|"*/"{3}:{4}:{5}.{6}", dt.getFullYear(), numFix(dt.getMonth()+1, 2), numFix(dt.getDate(), 2),
    numFix(dt.getHours(), 2), numFix(dt.getMinutes(), 2), numFix(dt.getSeconds(), 2), numFix(dt.getMilliseconds(), 3));
}

function numFix(num, length) {
  return (Array(length).join("0") + num).slice(-length);
}

const selfLogger = new Logger("stgr-web:logger", "gray");
