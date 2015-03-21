/**
 * 下载器，根据蜘蛛需求启动不同的下载器
 * 事件列表：
 *      finish_download:完成一个下载
 * 监听列表：
 *      download(url, meta): 接收一个下载请求
 */

var util = require('util');
var events = require('events');
var async = require('async');
var _ = require('underscore')._;

var downloader = function(engine, settings){
    events.EventEmitter.call(this);
    this.engine = engine;
    var self = this;
    this.engine.on('finish_init', function(){
        if(settings.proxy) self.engine.emit('proxy', function(proxy){
            self.proxy = proxy;
        });
    });
};
util.inherits(downloader, events.EventEmitter);

downloader.prototype.download = function(url, callback){
   callback();
};

downloader.on('download', function(url, meta){
    var self = this;
    this.engine.emit('spider', function(spider){
        spider.emit('spider', url, meta, function(spider){
            if(spider.js){

            }else{
                self.download(url, function($){
                    spider(url, meta, $);
                })
            }
        });
    })
});

module.exports = downloader;