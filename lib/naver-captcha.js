let chalk = require("chalk");
let readline = require("readline");

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let question = Promise.promisify(function(question, callback) {
  rl.question(question, function(answer) {callback(null, answer);});
});

module.exports = (phantomPage) => {
  return new Promise(function(resolve, reject) {
    PhantomRender(phantomPage, "Captcha.jpeg")
    .then(fileName => {
      return question(chalk.bgWhite.black("Please see the [./screenshot/" + fileName + "] and type a valid captcha>"));
    }, err => {
      reject(err);
    })
    .then(answer => {
      resolve(answer);
    });
  });
};
