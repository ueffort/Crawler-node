/**
 * 蜘蛛工厂，调度链接所需的蜘蛛
 * 事件列表：
 *
 * 监听列表：
 *      proxy(callback(host,port)): 获取一个代理信息
 */

var util = require('util');
var events = require('events');
var async = require('async');

var proxy = function(engine, settings){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = settings;

};

proxy.on('proxy', function(callback){
    callback(host, url);
});

module.exports = proxy;
