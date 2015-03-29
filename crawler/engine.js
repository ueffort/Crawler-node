/**
 * Created by gaojie on 15/3/20.
 * 核心调节:完成整体对象的初始化，并提供全局获取其他对象的接口
 * 函数列表：
 *      init：初始化
 * 事件列表：
 *      finish_init(err):初始化结束
 * 监听列表：
 *      instance(callback(err, instance))：获取实例
 *      scheduler(callback(err, scheduler))：获取调度器
 *      downloader(callback(err, downloader)): 获取下载器
 *      proxy(callback(err, proxy))：获取代理工具
 *      spider(callback(err, spider))：蜘蛛实例
 *      pipeline(callback(err, pipeline))：进行数据管道操作
 * 错误格式：调用engine.error下的属性
 */

var util = require('util');
var events = require('events');
var async = require('async');
var winston = require('winston');
var _ = require('underscore')._;
//全局错误列表
//每个模块的第一位错误序号不同
var error_list = {
    //base error
    CORE_ERROR: 1
    ,CORE_WAIT_INSTANCE_PROCESS: 2
    ,ENGINE_INIT_ERROR: 611//初始化出错
    ,ENGINE_INIT_INSTANCE_ERROR: 601
    //scheduler error
    ,SCHEDULER_START_ERROR: 111
    ,SCHEDULER_END_ERROR: 112
    ,SCHEDULER_START_AGAIN: 113
    ,SCHEDULER_PUSH_ERROR: 114
    ,SCHEDULER_QUEUE_ERROR: 115
    ,SCHEDULER_NO_NEED_INIT_QUEUE: 116
    ,SCHEDULER_QUEUE_EMPTY: 117
    //downloader error
    ,DOWNLOADER_DOWNLOAD_ERROR: 211
    ,DOWNLOADER_DEPEND_ERROR: 212
    ,DOWNLOADER_TIME_OUT: 201//下载超时
    //spider error
    ,SPIDER_INIT_ERROR: 301
    ,SPIDER_TYPE_ERROR: 302
    //pipeline error
    ,PIPELINE_PIPE_INIT_ERROR: 411
    ,PIPELINE_PIPE_EXEC_ERROR: 412
    //proxy error
    ,PROXY_ENOUGH: 501

};
var engine = function(crawler){
    events.EventEmitter.call(this);
    this.crawler = crawler;
    this.instance_name = crawler.instance_name;
    this.inited = false;
    var self = this;
    event_init(this);
};
util.inherits(engine, events.EventEmitter);

//外部触发初始化，保证能先进行事件监听
engine.prototype.init = function(){
    if(this.inited) return ;
    this.crawler.logger.silly('[ ENGINE ] init', this.instance_name);
    var self = this;
    async.series({
            instance: function(callback){
                try{
                    var instance_settings = require('../'+self.instance_name+'/settings.js');
                    if (!instance_settings) callback('[ CONFIG ] instance settings is null', self.instance_name);
                    self.settings = _.extend(instance_settings, self.crawler.settings);
                    self.crawler.logger.info('[ CONFIG ]', self.settings);
                    winston.loggers.add(self.instance_name, self.settings.logger);
                    self.logger = winston.loggers.get(self.instance);
                    var instance = new (require('../'+self.instance_name+'/index.js'))(self, self.settings);
                }catch(e){
                    self.crawler.logger.error('[ CONFIG ] instance init error', self.instance_name);
                    callback(e);
                }
                callback(null, instance);
            },
            scheduler: function(callback){
                try{
                    var scheduler = new (require('./scheduler.js'))(self, self.settings.scheduler ? self.settings.scheduler : {}, callback);
                }catch(e){
                    callback(e);
                }
            },
            downloader: function(callback){
                try{
                    var downloader = new (require('./downloader.js'))(self, self.settings.downloader ? self.settings.downloader : {}, callback);
                }catch(e){
                    callback(e);
                }
            },
            proxy: function(callback){
                try{
                    var proxy = new (require('./proxy.js'))(self, self.settings.proxy ? self.settings.proxy : {}, callback);
                }catch(e){
                    callback(e);
                }
            },
            spider: function(callback){
                try{
                    var spider = new (require('./spider.js'))(self, self.settings.spider ? self.settings.spider : {}, callback);
                }catch(e){
                    callback(e);
                }
            },
            pipeline: function(callback){
                try{
                    var pipeline = new (require('./pipeline.js'))(self, self.settings.pipeline ? self.settings.pipeline : {}, callback);
                }catch(e){
                    callback(e);
                }
            }
        },
        function(err, results) {
            if(err){
                if(!_.isNumber(err)){
                    self.logger.debug(err);
                    err = error_list.ENGINE_INIT_INSTANCE_ERROR;
                }else{
                    err = error_list.ENGINE_INIT_ERROR;
                    self.logger.error('[ ENGINE ] engine init error:', err);
                }
            }else{
                self.service = results;
                self.inited = true;
            }
            self.emit('finish_init', err);
        }
    );
};


//避免日后的扩展需求，对核心对象都通过异步调用
//内部尽可能的对各个对象实现解偶
function event_init(engine){
engine.on('instance', function(callback){
    return callback(null, this.service.instance);
});

engine.on('scheduler',function(callback){
    return callback(null, this.service.scheduler);
});

engine.on('downloader', function(callback){
    return callback(null ,this.service.downloader);
});

engine.on('proxy', function(callback){
    return callback(null ,this.service.proxy);
});

engine.on('spider', function(callback){
    return callback(null, this.service.spider);
});

engine.on('pipeline', function(callback){
    return callback(null, this.service.pipeline);
});
}

engine.prototype.error = error_list;

module.exports = engine;