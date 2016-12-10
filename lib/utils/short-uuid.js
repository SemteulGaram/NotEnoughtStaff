module.exports = (uid) => {
  const str = ""+uid;
  if(str.match(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/)) {
    return str.substring(0, 8);
  }else {
    return "(Unknown UUID[" + str + "])";
  }
};
