/**
 * 蜘蛛工厂，调度链接所需的蜘蛛
 * 函数列表：
 *      parseUrl(present, target):根据当前url返回页面中的url完整格式
 *      topDomain(url):返回url的顶级域名
 * 事件列表：
 *      empty(err):爬虫任务执行完毕
 * 监听列表：
 *      spider(link, meta, callback(err, settings, spider_function(result, response))): 获取一个蜘蛛实例,object根据format判断
 *      pipe(info):进行管道处理,
 *      link(link, meta):进行url入队处理
 * meta格式：
 * {
 *  encoding：在下载中被设置，可以是下载配置传递或者页面自动解析
 *  spider：该链接的spider，可以手动设置，否则默认为链接的顶级域名
 *  redirect：下载重定向链接，遇到301或者302时自动设置
 *  type：spider处理该链接的类型，需手动设置
 * }
 */

var util = require('util');
var events = require('events');
var async = require('async');
var url =  require("url");
var co = require('co');
var _ = require('underscore')._;

var default_settings = {
    path:false//蜘蛛文件所在的路径，默认在实例的spider下
};

var spider = function(engine, settings, init_callback){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = _.defaults(settings, default_settings);
    this.spider_list = {};
    this.running = 0;
    engine.logger.silly('[ SPIDER ] init ', this.settings);
    event_init(this);
    init_callback(null, this);
};
util.inherits(spider, events.EventEmitter);

//根据当前url返回页面中url的完整格式
spider.prototype.absoluteLink = function(present, target){
    return url.resolve(present, target);
};

//返回当前链接的顶级域名
spider.prototype.topDomain = function(domain){
    if(!domain) throw 'domain is null';
    for(var b = domain.split('.'),
            c = /com|edu|gov|int|mil|net|org|biz|info|pro|name|museum|coop|aero|xxx|idv/,
            d = b.length - 1,
            f= b.length - 1,
            e = 0;
    d > -1;
    d--){
       if (c.test(b[d])){
           f = d;
           break;
       } else {
           /\d+/.test(b[d]) && e++;
       }
    }
    b.length == e && (f = 1);
    return b.slice(f - 1).join('.');
};

function event_init(spider){
spider.on('spider', function(link, meta, callback){
    this.engine.logger.info('[ SPIDER ] spider ', link, meta);
    var self = this;
    var err = null;
    //根据url获取domain
    if(!meta['spider']) meta['spider'] = this.topDomain(url.parse(link).hostname);
    var spider_name = meta['spider'];
    if(_.isUndefined(this.spider_list[spider_name])){
        try{
            var spider_path = this.settings.path ? this.settings.path : this.engine.instance_name+'/spider';
            this.spider_list[spider_name] = require('../'+spider_path+'/'+spider_name+'.js')(this);
        }catch(e){
            this.engine.logger.debug(e);
            this.engine.logger.error('[ SPIDER ] spider init error :', spider_name);
            err = this.engine.error.SPIDER_INIT_ERROR;
            return callback(err);
        }

    }
    var spider = this.spider_list[spider_name];
    if(_.isUndefined(spider[meta['type']])){
        this.engine.logger.error('[ SPIDER ] ', spider_name,' spider have not ',meta['type'],' type');
        err = this.engine.error.SPIDER_TYPE_ERROR;
        return callback(err);
    }
    co(spider.download(link, meta)).catch((err)=>{
        this.engine.logger.debug(err);
        this.engine.logger.error('[ SPIDER ] spider download init error:', spider_name);
        callback(err);
    }).then((setting)=>{
      callback(err, setting, function(result, response, milliseconds){
        self.running += 1;
        meta.duration = milliseconds;
        co(spider[meta['type']](link, meta, result, response)).catch((err)=>{
          return err;
        }).then((err)=>{
          self.running -= 1;
          if(self.running == 0) self.emit('empty', err);
        });

      });
    });
});

spider.on('pipe', function(link, info){
    var self = this;
    this.running += 1;
    this.engine.logger.info('[ SPIDER ] pipe ', info);
    this.engine.emit('pipeline', function(err, pipeline){
        pipeline.emit('pipe', link, info, function(err){
            self.running -= 1;
            if(self.running == 0) self.emit('empty', err);
        });
    });
});

spider.on('link', function(link, meta){
    var self = this;
    this.running += 1;
    this.engine.logger.info('[ SPIDER ] link ', link, meta);
    if(!meta['type']){
        this.engine.logger.warn('[ SPIDER ] meta type is required ');
        return
    }

    this.engine.emit('scheduler', function(err, scheduler){
        scheduler.emit('push', link, meta, function(err){
            self.running -= 1;
            if(self.running == 0) self.emit('empty', err);
        });
    });
});
}

module.exports = spider;
