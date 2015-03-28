/**
 * 实例调度器，处理单个实例调度
 * 事件列表：
 *      finish_queue(err, loop):结束一个时间分片,是否自动循环抓取
 * 监听列表：
 *      start(callback(err)): 启动
 *      stop(callback(err))：关闭
 *      push(link, meta, callback(err)):将url入队操作
 *      init_queue(callback(err, queue_length))：初始化一个时间分片
 */

var util = require('util');
var events = require('events');
var async = require('async');
var _ = require('underscore')._;

var default_settings = {
    parallel: 4//同时开启多少个下载work
    ,frequency: 10//每分钟的下载频率限制，最高下载数限制
    ,loop: false//下载队列完成后，是否重新开始
};

var scheduler = function(engine, settings, init_callback){
    events.EventEmitter.call(this);
    this.started = false;
    this.engine = engine;
    this.settings = _.extend(default_settings, settings);
    engine.logger.silly('[ SCHEDULER ] init');
    var self = this;
    this.engine.on('finish_init', function(){
        self.engine.emit('downloader', function(err, downloader){
            self.downloader = downloader;
        });
        self.engine.emit('instance', function(err, instance){
            self.instance = instance;
        });
    });
    if(!this.settings.parallel) this.settings.parallel = 1;
    //单个下载的时间限制
    var download_time_limit = this.settings.frequency ?
        parseInt(60000 / this.settings.frequency / this.settings.parallel) : 0;
    //同时开启多少个下载队列
    this.queue = async.queue(function(task, callback){
        self.downloader.emit('download', task.url, task.meta, function(err, milliseconds){
            if(err){
                //todo 针对下载错误
            }
            if(download_time_limit > milliseconds)
                setTimeout(callback, download_time_limit - milliseconds);
            else
                callback();
        });
    }, this.settings.parallel);
    this.queue.empty(function(){
        if(!self.instance.length){
            self.started = false;
            self.emit('finish_queue', null, self.settings.loop);
        }else {
            var url_info = null;
            try{
                url_info = self.instance.shift();
            }catch(e){
                self.engine.logger.debug(e);

            }
            self.queue.push({url: url_info[0], meta: url_info[1]});
        }
    });
    init_callback(null, this);
};
util.inherits(scheduler, events.EventEmitter);

scheduler.on('init_queue', function(callback){
    var err = null;
    try{
        if(!this.instance.length) this.instance.init_queue();
    }catch(e){
        this.engine.logger.debug(e);
    }
    if(!this.instance.length) {
        this.engine.logger.error('[ SCHEDULER ] instance has 0 queue length after init_queue!');
        err = this.engine.error.SCHEDULER_QUEUE_ERROR;
    }
    callback(err, this.instance.length);
});

scheduler.on('stop',function(callback){
    this.engine.logger.info("[ SCHEDULER ] stop");
    this.queue.kill();
    callback(null);
});

scheduler.on('start',function(callback){
    this.engine.logger.info("[ SCHEDULER ] start");
    var err = null;
    if (this.started) {
        this.logger.warn('[ SCHEDULER ] scheduler is running! not need start again!');
        err = this.engine.error.SCHEDULER_START_AGAIN;
    }else if(!this.queue){
        this.logger.error('[ SCHEDULER ] queue is error!');
        err = this.engine.error.SCHEDULER_START_ERROR;
    }else{
        this.queue.statted = true;
        this.started = true;
    }
    callback(err);
});

scheduler.on('push', function(link, meta, callback){
    this.engine.logger.info("[ SCHEDULER ] pull %s %s", link, meta);
    var err = null;
    try{
        this.instance.push([link, meta]);
    }catch(e){
        this.engine.logger.debug(e);
        this.engine.logger.error('[ SCHEDULER ] instance can not push link!');
        err = this.engine.error.SCHEDULER_PUSH_ERROR;
    }
    callback(err);
});

module.exports = scheduler;