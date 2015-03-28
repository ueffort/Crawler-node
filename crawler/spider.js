/**
 * 蜘蛛工厂，调度链接所需的蜘蛛
 * 函数列表：
 *      parseUrl(present, target):根据当前url返回页面中的url完整格式
 *      topDomain(url):返回url的顶级域名
 * 事件列表：
 * 监听列表：
 *      spider(link, meta, callback(err, settings, spider_function(result, response))): 获取一个蜘蛛实例,object根据format判断
 *      pipe(info):进行管道处理,
 *      url(link, meta):进行url入队处理
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
var urlUtil =  require("url");
var _ = require('underscore')._;

var default_settings = {
    path:false//蜘蛛文件所在的路径，默认在实例的spider下
};

var spider = function(engine, settings, init_callback){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = _.extend(default_settings, settings);
    this.spider_list = {};
    engine.logger.silly('[ SPIDER ] init');
    init_callback(null, this);
};

//根据当前url返回页面中url的完整格式
spider.prototype.absoluteLink = function(present, target){
    return urlUtil.resolve(present, target);
    //如果是绝对链接，直接返回
    if(target.indexOf('http')==0)
        return target;
    var target_obj = url.parse(target);
    var present_obj = url.parse(present);
    //根路径
    var a = ['protocol', 'auth', 'host', 'port', 'hostname'];
    for(var i=0;i< a.length;i++){
        target_obj[a[i]] = present_obj[a[i]];
    }
    //相对路径
    if(target.indexOf('/')!=0){
        var path = present_obj.pathname.slice(0, present_obj.pathname.lastIndexOf('/') + 1);
        var b = ['pathname', 'path', 'href'];
        for(var i=0;i< b.length;i++){
            target_obj[b[i]] = path+target_obj[b[i]];
        }
    }
    return target_obj.format();
};

//返回当前链接的顶级域名
spider.prototype.topDomain = function(domain){
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

spider.on('spider', function(link, meta, callback){
    this.engine.logger.info('[ SPIDER ] spider %s %s', link, meta);
    var err = null;
    var spider_name = meta['spider'];
    if(!spider_name in this.spider_list){
        try{
            var spider_path = this.settings.path ? this.settings.path : this.engine.instance_name+'/spider';
            this.spider_list[spider_name] = require('../'+spider_path+'/'+spider_name+'.js')(this);
        }catch(e){
            this.engine.logger.debug(e);
            this.engine.logger.error('[ SPIDER ] spider init error :%s', spider_name);
            err = this.engine.error.SPIDER_INIT_ERROR;
            return callback(err);
        }

    }
    var spider = this.spider_list[spider_name];
    if(_.isUndefined(spider[meta['type']])){
        this.engine.logger.error('[ SPIDER ] %s spider have not %s type', spider_name, meta['type']);
        err = this.engine.error.SPIDER_TYPE_ERROR;
        return callback(err);
    }
    callback(err, spider.download(link, meta), function(result, response){
        spider[meta['type']](link, meta, result, response);
    });
});

spider.on('pipe', function(info){
    this.engine.logger.info('[ SPIDER ] pipe %s', info);
    this.engine.emit('pipeline', function(err, pipeline){
        pipeline.emit('pipe', info);
    });
});

spider.on('url', function(link, meta){
    this.engine.logger.info('[ SPIDER ] url %s %s', link, meta);
    //根据url获取domain，用于下载器中获取对应的spider
    if(!meta['spider']) meta['spider'] = this.topDomain(url.parse(link).hostname);
    this.engine.emit('scheduler', function(err, scheduler){
        scheduler.emit(link, meta);
    });
});

module.exports = spider;
