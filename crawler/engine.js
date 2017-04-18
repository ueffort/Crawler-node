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

var downloader = require('./downloader');
var pipeline = require('./pipeline');
var proxy = require('./proxy');
var scheduler = require('./scheduler');
var spider = require('./spider');
//全局错误列表
//每个模块的第一位错误序号不同
var error_list = {
    //base error
    CORE_ERROR: 1
    ,CORE_WAIT_INSTANCE_PROCESS: 2
    ,CORE_INIT_INSTANCE_PROCESS: 3
    ,ENGINE_INIT_ERROR: 611//初始化出错
    ,ENGINE_INIT_INSTANCE_ERROR: 601
    //scheduler error
    ,SCHEDULER_START_ERROR: 111
    ,SCHEDULER_END_ERROR: 112
    ,SCHEDULER_START_AGAIN: 113
    ,SCHEDULER_PUSH_ERROR: 114
    ,SCHEDULER_QUEUE_ERROR: 115
    ,SCHEDULER_NO_NEED_LOOP_QUEUE: 116
    ,SCHEDULER_QUEUE_EMPTY: 117
    ,SCHEDULER_PAUSE_ERROR: 118
    ,SCHEDULER_RESUME_ERROR: 119
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
    ,PIPELINE_PIPE_END: 413
    //proxy error
    ,PROXY_ENOUGH: 501

};
var engine = function(crawler){
    events.EventEmitter.call(this);
    this.crawler = crawler;
    this.logger = crawler.logger;
    this.instance_name = crawler.instance_name;
    this.inited = false;
    event_init(this);
};
util.inherits(engine, events.EventEmitter);

//外部触发初始化，保证能先进行事件监听
engine.prototype.init = function(){
    if(this.inited) return ;
    var self = this;
    async.series({
            instance: function(callback){
                try{
                    var instance_settings = require('../'+self.instance_name+'/settings.js');
                    if (!instance_settings) callback('[ CONFIG ] instance settings is null', self.instance_name);
                    self.settings = self.assign(instance_settings, self.crawler.settings);
                    self.crawler.logger.info('[ CONFIG ]', self.settings);
                    winston.loggers.add(self.instance_name, self.settings.logger);
                    self.logger = winston.loggers.get(self.instance);
                    var instance = new (require('../'+self.instance_name+'/index.js'))(self, self.settings);
                }catch(e){
                    self.crawler.logger.error('[ CONFIG ] instance init error', self.instance_name);
                    callback(e);
                    return
                }
                callback(null, instance);
            },
            scheduler: function(callback){
                new scheduler(self, self.settings.scheduler ? self.settings.scheduler : {}, callback);
            },
            downloader: function(callback){
                new downloader(self, self.settings.downloader ? self.settings.downloader : {}, callback);
            },
            proxy: function(callback){
                new proxy(self, self.settings.proxy ? self.settings.proxy : {}, callback);
            },
            spider: function(callback){
                new spider(self, self.settings.spider ? self.settings.spider : {}, callback);
            },
            pipeline: function(callback){
                new pipeline(self, self.settings.pipeline ? self.settings.pipeline : {}, callback);
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
                self.emit('finish_init', err);
            }else{
                self.service = results;
                self.inited = true;
                self.emit('finish_init');
                self.emit('start_event');
            }
        }
    );
};


//避免日后的扩展需求，对核心对象都通过异步调用
//内部尽可能的对各个对象实现解偶
function event_init(engine){
async.each(['instance', 'scheduler', 'downloader', 'proxy', 'spider', 'pipeline'],
    function(item, callback){
        engine.on(item, function (callback) {
            if (!this.inited)
                this.once('finish_init', function (err) {
                    callback(err, this.service[item]);
                });
            else
                callback(null, this.service[item]);
        });
        callback(null);
    },function(err){
        if(err){
            //todo 初始化失败
        }
    }
);
}

engine.prototype.error = error_list;
engine.prototype.assign = function(obj, def){
  if (obj == undefined) {
    return def;
  } else if (def == undefined) {
    return obj;
  }
  if(obj && !(obj instanceof Object)){
    return obj;
  }
  var c = def;
  for (var i in obj) {
    c[i] = this.assign(obj[i], def[i])
  }
  return c
};

module.exports = engine;