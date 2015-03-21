/**
 * Created by gaojie on 15/3/20.
 * 核心调节:完成整体对象的初始化，并提供全局获取其他对象的接口
 * 事件列表：
 *      finish_init:初始化结束
 * 监听列表：
 *      instance(callback(instance))：获取实例
 *      scheduler(callback(scheduler))：获取调度器
 *      downloader(callback(downloader)): 获取下载器
 *      proxy(callback(proxy))：获取代理工具
 *      spider(callback(spider))：蜘蛛实例
 *      pipeline(callback(pipeline))：进行数据管道操作
 */

var util = require('util');
var events = require('events');
var async = require('async');
var winton = require('winton');

var engine = function(crawler){
    events.EventEmitter.call(this);
    this.crawler = crawler;
    this.instance_name = crawler.instance_name;
    this.need_init = 1;//自身需要init
    this.finish_init = 0;
    var self = this;
    async.series([function(){
        //instance
        try{
            self.instance_settings = require('../'+self.instance_name+'/settings.js');
            self.instance = require('../'+self.instance_name+'/index.js')(engine);
        }catch(e){
            self.crawler.logger.error('[ CONFIG ] instance(%s) not exists', self.instance_name);
        }
        if (!self.instance_settings) self.crawler.logger.error('[ CONFIG ] instance(%s) settings is null', self.instance_name);
        self.settings = _.extend(self.instance_settings, self.crawler.settings);
        winton.loggers.add(self.instance_name, self.settings.logger);
        self.logger = winton.loggers.get(instance);
    },function(){
        self.scheduler = require('./scheduler.js')(self, self.settings.scheduler);
    },function(){
        self.downloader = require('./downloader.js')(self, self.settings.downloader);
    },function(){
        self.proxy = require('./proxy.js')(self, self.settings.proxy);
        listen_init(self, self.proxy);
    },function(){
        self.spider = require('./spider.js')(self, self.settings.spider);
    },function(){
        self.pipeline = require('./pipeline.js')(self, self.settings.pipeline);
        listen_init(self, self.proxy);
    }],function(err, result){
        self.init_process();
    });
};
util.inherits(engine, events.EventEmitter);

//对需要异步初始化的对象，提供异步初始化监听接口
var listen_init = function(engine, object){
    engine.need_init += 1;
    object.on('finish_init', engine.init_process);
};

engine.prototype.init_process = function(){
    this.finish_init += 1;
    if(this.finish_init == this.need_init) this.emit('finish_init');
};

engine.on('instance', function(callback){
    return callback(this.instance);
});

engine.on('scheduler',function(callback){
    return callback(this.scheduler);
});

engine.on('downloader', function(callback){
    return callback(this.downloader);
});

engine.on('proxy', function(callback){
    return callback(this.proxy);
});

engine.on('spider', function(callback){
    return callback(this.spider);
});

engine.on('pipeline', function(callback){
    return callback(this.pipeline);
});

module.exports = engine;