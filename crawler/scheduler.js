/**
 * 实例调度器，处理单个实例调度
 * 事件列表：
 *      finish_init(err):初始化完成
 *      init_queue(queue_length):初始化一个时间分片
 *      finish_queue():结束一个时间分片
 * 监听列表：
 *      start(callback): 启动
 *      stop(callback)：关闭
 *      push(url, meta):
 */

var util = require('util');
var events = require('events');
var async = require('async');

var scheduler = function(engine, settings){
    events.EventEmitter.call(this);
    this.started = false;
    this.engine = engine;
    this.settings = settings;
    var self = this;
    this.engine.on('finish_init', function(){
        self.engine.emit('downloader', function(downloader){
            self.downloader = downloader;
            self.downloader.on('finish_download', self.download);
        });
        self.engine.emit('instance', function(instance){
            self.instance = instance;
        });
    });
    //同时开启多少个下载队列
    this.queue = async.queue(function(task, callback){
        self.downloader.emit('download', task.url, task.meta);
        callback();
    }, this.settings.parallel);
    this.queue.empty(function(){
        if(!self.instance.length){
            self.finish_queue();
        }
        self.download();
    });
};
util.inherits(scheduler, events.EventEmitter);

scheduler.prototype.download = function(){
    var url_info = this.instance.shift();
    this.queue.push({url: url_info[0], meta: url_info[1]});
};

scheduler.prototype.init_queue = function(){
    this.instance.init_queue();
    if(!this.instance.length) this.logger.error('[ INSTANCE ] instance has 0 queue length after init_queue!');
    this.emit('init_queue', this.instance.length);
};

scheduler.prototype.finish_queue = function(){
    if(!this.start) return ;
    this.emit('finish_queue');
    this.init_queue();
};

scheduler.on('stop',function(callback){
    this.queue.kill();
    callback();
});

scheduler.on('start',function(callback){
    if (this.started) {
        return this.logger.warn('[ EVENT ] scheduler is running! not need start again!');
    }
    this.queue.statted = true;
    this.started = true;
    this.download();
    callback();
});

scheduler.on('push', function(url, meta){
    this.instance.push([url, meta]);
});

module.exports = scheduler;