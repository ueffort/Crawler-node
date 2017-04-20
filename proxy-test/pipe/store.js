/**
 * Created by gaojie on 15/3/22.
 */
var redis = require('redis');

var pipe = function(factory){
    var self = this;
    factory.engine.emit('proxy', function(err, proxy){
        self.proxy = proxy;
    });
    return function*(info){
        if(info.proxy == 'undefined' || info.duration == 'undefined' || !info.proxy || !info.duration) return false;
        self.proxy.emit('set', info.proxy.host, info.proxy.port, info.duration);
    };
};

module.exports = pipe;