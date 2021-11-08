const world = await require('./mod1');

exports.hi = function() {
    console.log("hello" + world);
};