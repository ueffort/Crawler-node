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

var proxy = function(engine, settings){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = settings;

};

proxy.on('proxy', function(callback){
    this.emit('warning', this.length);
    callback(host, url);
});

proxy.on('timeout', function(){

});

module.exports = proxy;
