/**
 * Created by gaojie on 15/3/22.
 */
var redis = require('redis');

var pipe = function(settings){
    this.key = settings.proxy_store.key;
    this.redis = redis.createClient(settings.proxy_store.redis.port, settings.proxy_store.redis.host);
    var self = this;
    return function(info){
        if(info.host == 'undefined' || info.port == 'undefined') return false;
        self.redis.zadd(self.key, 0, info.host+':'+info.port);
    };
};

module.exports = pipe;