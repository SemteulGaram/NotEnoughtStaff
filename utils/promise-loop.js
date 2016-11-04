//Loops for promise
//http://stackoverflow.com/questions/24660096/correct-way-to-write-loops-for-promise
let Promise = require("bluebird");

let promiseFor = Promise.method(function(condition, action, value) {
    value = value || 0;
    if (!condition(value)) return value;
    return action(value).then(promiseFor.bind(null, condition, action));
});

module.exports = promiseFor;

/*
promiseFor(function(count) {
    return count < 10;
}, function(count) {
    return db.getUser(email)
             .then(function(res) {
                 logger.log(res);
                 return ++count;
             });
}, 0).then(console.log.bind(console, 'all done'));
*/
