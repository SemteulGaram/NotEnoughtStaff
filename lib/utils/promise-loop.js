//Loops for promise
//http://stackoverflow.com/questions/24660096/correct-way-to-write-loops-for-promise
const Promise = require("bluebird");

const promiseLoop = Promise.method(function(hasNext, action, value) {
  value = value || 0;
  if (!hasNext(value)) return value;
  return action(value).then(promiseLoop.bind(null, hasNext, action));
});

module.exports = promiseLoop;

/*
promiseLoop((count) => {
  return count < 10;
}, (count) => {
  return db.getUser(email)
  .then(((res) => {
    logger.log(res);
      return ++count;
    );
}).then(console.log.bind(console, 'all done'));
*/
