/**
 * 下载器，根据蜘蛛需求启动不同的下载器
 * 事件列表：
 *      finish_download(err, link):完成一个下载
 * 监听列表：
 *      download(link, meta, queue_callback(err, milliseconds)): 接收一个下载请求
 */

var util = require('util');
var events = require('events');
var async = require('async');
var urlUtil =  require("url");
var http = require('http');
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');
try { var unzip = require('zlib').unzip } catch(e) { /* unzip not supported */ }
var _ = require('underscore')._;
var env = require('jsdom').env;
var jquery = require('jquery');

var default_settings = {
    timeout: 10//下载的超时时间
    ,headers:{
        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36"
        ,"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        ,"Accept-Encoding":"gzip"
        ,"Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6"
        ,"Cookie":""//可以是object对象
    }//请求头
    ,format: "html"//下载后的处理格式，html：页面(默认)，传递jquery对象；txt：基本文本，转换编码，不处理；binary：2进制，不处理；js：动态页面，传递jquery对象，可以交互
    ,encoding: false//下载页面的编码
    ,proxy: false//是否开启代理下载
};

var downloader = function(engine, settings, init_callback){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = _.extend(default_settings, settings);
    var self = this;
    this.engine.on('finish_init', function(){
        self.engine.emit('proxy', function(proxy){
            self.proxy = proxy;
        });
    });
    init_callback(null, this);
};
util.inherits(downloader, events.EventEmitter);

//转换cookie为字符串
var transformCookie = function(cookie){
    if(_.isObject()){
        var cookie_list = [];
        for(var i=0; i<cookie.length; i++){
            cookie_list.push(cookie[i]['name']+'='+cookie[i]['value']);
        }
        return cookie_list.join(';');
    }
    return cookie;
};

//获取页面编码
var getEncoding = function(headers){
    var page_encoding = 'UTF-8';
    //get the encoding from header
    if(headers['content-type']!=undefined){
        var mts = new RegExp("^.*?charset\=(.+)$","ig").exec(headers['content-type']);
        if (mts != null)
            page_encoding = mts[1];
    }
    return page_encoding.toLowerCase().replace('\-','');
};

var download = function(self, settings, link, meta, finish_callback){
    if(meta['redirect']) link = meta['redirect'];

    var host = null,
        port = null,
        path = null;
    if(settings.proxy){
        host = settings.proxy.host;
        port = settings.proxy.port;
        path = link;
    }else{
        var url_object = urlUtil.parse(link);
        host = url_object['hostname'];
        port = url_object['port'];
        path = url_object['path'];
    }

    var headers = settings.headers;
    if(headers['Cookie']) headers['Cookie'] = transformCookie(headers["Cookie"]);
    var options = {
        host: host,
        port: port,
        path: path,
        method: settings['method'],
        headers: headers
    };

    var request = http.request(options, function(response) {
        var meta = {};
        meta['status'] = response.statusCode;
        if(parseInt(response.statusCode)==301||parseInt(response.statusCode)==302){
            if(response.headers['location']){
                meta['redirect'] = urlUtil.resolve(link, response.headers['location']);
            }
        }

        var compressed = /gzip|deflate/.test(response.headers['content-encoding']);

        var bufferHelper = new BufferHelper();

        response.on('data', function (chunk) {
            bufferHelper.concat(chunk);
        });

        response.on('end', function () {
            if(settings['encoding'])
                meta['encoding'] = settings['encoding'];
            else
                meta['encoding'] = getEncoding(response.headers);
            var content = '';
            async.waterfall([
                //是否需要解压缩
                function(callback){
                    if(!compressed || typeof unzip == 'undefined'){
                        callback(null, bufferHelper.toBuffer());
                    }else {
                        unzip(bufferHelper.toBuffer(), callback);
                    }
                },
                //根据格式返回信息
                function(buff, callback){
                    //二进制，不处理
                    //todo 根据响应头判断格式
                    if(settings['format']=='binary') return callback(null, buff);
                    content = iconv.decode(buff, meta['encoding']);
                    if(settings['format']=='html'){
                        //返回jquery对象
                        env(content, function (err, window) {
                            var $ = jquery(window);
                            callback(err, $);
                        });
                    }else{
                        //文本格式，直接返回
                        callback(null, content);
                    }
                }
            ],function(err, result){
                if(err){

                }else
                    finish_callback(err, result);
            });
        });
    });
    request.setTimeout(settings.timeout*1000,function(){
        finish_callback(self.engine.error.TIME_OUT);
    });

    request.on('error', function(err) {
        finish_callback(err);
    });
    request.end();
};

//完整下载完成callback函数
var callbackDownload = function(queue_callback, spider_function, link, callback){
    var start_date = new Date();
    return function(err, $){
        queue_callback(err, new Date() - start_date);
        self.emit('finish_download', err, link);
        if(!err) spider_function($);
        callback(err);
    }
};

//接收下载请求
downloader.on('download', function(link, meta, queue_callback){
    var self = this;
    async.waterfall([
        function(callback){
            self.engine.emit('spider', callback);
        },
        function(spider, callback){
            spider.emit('spider', link, meta, callback);
        },
        //获取蜘蛛处理函数，判断代理，开始下载
        function(settings, spider_function, callback){
            settings = _.extend(self.settings, settings);
            if(settings.proxy){
                self.proxy.emit('proxy', function(err, host, port, proxy_callback){
                    if(err) return callback(err);
                    settings.proxy = {
                        host: host,
                        port: port
                    };
                    download(self, settings, link, meta, callbackDownload(function(err, milliseconds){
                        queue_callback(err, milliseconds);
                        proxy_callback(err, milliseconds);
                    }, spider_function, link, callback));
                });
            }else
                download(self, settings, link, meta, callbackDownload(queue_callback, spider_function, link, callback));
        }
    ], function(err){
        if(err){

        }
    });
});

module.exports = downloader;