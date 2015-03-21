/**
 * 蜘蛛工厂，调度链接所需的蜘蛛
 * 事件列表：
 * 监听列表：
 *      spider(url, meta, callback): 获取一个蜘蛛实例
 *      parse(url, meta,
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
    var domain = meta['domain'];
    if(!domain in this.spider_list){
        this.spider_list[domain] = require('../'+self.engine.instance_name+'/spider/'+domain+'.js')(this);
    }
    callback(this.spider_list[domain]);
});

spider.on('pipe', function(url, meta, info){
    //对url进行入队操作，否则就进入管道分析
    if(info){
        this.engine.emit('pipeline', function(pipeline){
            pipeline.emit('pipe', url, meta, info);
        });
    }else{
        //根据url获取domain，用于下载器中获取对应的spider
        meta['domain'] = url;
        this.engine.emit('scheduler', function(scheduler){
            scheduler.emit(url, meta);
        });
    }
});

spider.on('');

module.exports = spider;
