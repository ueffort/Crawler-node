/**
 * 实例调度器，处理单个实例调度
 * 事件列表：
 *      finish_init(err):初始化完成
 *      finish_queue(loop):结束一个时间分片,是否自动循环抓取
 * 监听列表：
 *      start(callback(err)): 启动
 *      stop(callback(err))：关闭
 *      push(url, meta):将url入队操作
 *      init_queue(callback(err, queue_length))：初始化一个时间分片
 */

var util = require('util');
var events = require('events');
var async = require('async');

var scheduler = function(engine, settings, init_callback){
    events.EventEmitter.call(this);
    this.started = false;
    this.engine = engine;
    this.settings = settings;
    var self = this;
    this.engine.on('finish_init', function(){
        self.engine.emit('downloader', function(downloader){
            self.downloader = downloader;
        });
        self.engine.emit('instance', function(instance){
            self.instance = instance;
        });
    });
    //同时开启多少个下载队列
    this.queue = async.queue(function(task, callback){
        self.downloader.emit('download', task.url, task.meta, callback);
    }, this.settings.parallel);
    this.queue.empty(function(){
        if(!self.instance.length){
            self.started = false;
            //一次只能由一个实例进程进行时间片的关闭级初始化操作
            //todo 对于抓取元素，得在最后次pipe操作后才能触发finish_queue事件
            self.emit('finish_queue', self.settings.loop);
        }else {
            var url_info = self.instance.shift();
            self.queue.push({url: url_info[0], meta: url_info[1]});
        }
    });
    init_callback(null, this);
};
util.inherits(scheduler, events.EventEmitter);

scheduler.on('init_queue', function(callback){
    if(!this.instance.length) this.instance.init_queue();
    if(!this.instance.length) this.logger.error('[ INSTANCE ] instance has 0 queue length after init_queue!');
    callback(null, this.instance.length);
});

scheduler.on('stop',function(callback){
    this.queue.kill();
    callback(null);
});

scheduler.on('start',function(callback){
    if (this.started) {
        return this.logger.warn('[ EVENT ] scheduler is running! not need start again!');
    }
    this.queue.statted = true;
    this.started = true;
    callback(null);
});

scheduler.on('push', function(url, meta){
    this.instance.push([url, meta]);
});

module.exports = scheduler;