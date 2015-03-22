/**
 * 蜘蛛工厂，调度链接所需的蜘蛛
 * 事件列表：
 * 监听列表：
 *      spider(url, meta, callback(js, parse_function($))): 获取一个蜘蛛实例
 *      pipe(info):进行管道处理,
 *      queue(url, meta):进行入队处理
 */

var util = require('util');
var events = require('events');
var async = require('async');
var _ = require('underscore')._;

var spider = function(engine, settings){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = settings;
    this.spider_list = {};
};

spider.on('spider', function(url, meta, callback){
    var spider_name = meta['spider'];
    if(!spider_name in this.spider_list){
        this.spider_list[spider_name] = require('../'+this.engine.instance_name+'/spider/'+spider_name+'.js')(this);
    }
    var spider = this.spider_list[spider_name];
    callback(spider.js, function($){
        spider[meta['type']](url, meta, $);
    });
});

spider.on('pipe', function(info){
    this.engine.emit('pipeline', function(pipeline){
        pipeline.emit('pipe', info);
    });
});

spider.on('queue', function(url, meta){
    //根据url获取domain，用于下载器中获取对应的spider
    if(!meta['spider']) meta['spider'] = url;
    this.engine.emit('scheduler', function(scheduler){
        scheduler.emit(url, meta);
    });
});

module.exports = spider;
