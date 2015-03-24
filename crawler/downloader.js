/**
 * 下载器，根据蜘蛛需求启动不同的下载器
 * 事件列表：
 *      finish_download(err, url):完成一个下载
 * 监听列表：
 *      download(url, meta, queue_callback): 接收一个下载请求
 */

var util = require('util');
var events = require('events');
var async = require('async');

var downloader = function(engine, settings, init_callback){
    events.EventEmitter.call(this);
    this.engine = engine;
    var self = this;
    this.engine.on('finish_init', function(){
        if(settings.proxy) self.engine.emit('proxy', function(proxy){
            self.proxy = proxy;
        });
    });
    init_callback(null, this);
};
util.inherits(downloader, events.EventEmitter);

var download = function(settings, url, callback){

};

downloader.on('download', function(url, meta, queue_callback){
    var self = this;
    this.engine.emit('spider', function(spider){
        spider.emit('spider', url, meta, function(settings, spider_function){
            download(settings, url, function(err, $){
                queue_callback();
                self.emit('finish_download', err, url);
                if(!err) spider_function($);
            });
        });
    });
});

module.exports = downloader;