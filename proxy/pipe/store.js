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
        if(info.host == 'undefined' || info.port == 'undefined' || !info.host || !info.port) return false;
        self.proxy.emit('set', info.host, info.port, 0);
    };
};

module.exports = pipe;