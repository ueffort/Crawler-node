/**
 * 蜘蛛工厂，调度链接所需的蜘蛛
 * 事件列表：
 *      warning(this.length):如果代理列表有限，则触发报警
 * 监听列表：
 *      proxy(callback(host,port)): 获取一个代理信息
 *      timeout():代理超时，降低该代理的权重
 */

var util = require('util');
var events = require('events');
var async = require('async');
var redis = require('redis');

var proxy = function(engine, settings){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = settings;
    this.key = settings.redis.key;
    this.redis = redis.createClient(settings.redis.port, settings.redis.host);
    var self = this;
    this.redis.zcount(this.key, function(err, result){
        self.length = result;
    });
};

proxy.prototype.parseProxy = function(info){
    info = info.split(':');
    return {host: info[0], port: info[1]};
};

proxy.on('proxy', function(callback){
    var self = this;
    this.redis.zrange(this.key, 0, 1, function(err, result){
        var info = self.parseProxy(result[0]);
        self.redis.zincrby(self.key, result[0], -100);
        callback(result.host, result.port);
    });
});

proxy.on('timeout', function(){
    var self = this;
    if(this.length < this.settings.waring_num) this.emit('warning', this.length);
});

module.exports = proxy;
