/**
 * Created by gaojie on 15/3/22.
 * 收集新的代理地址，存入redis，供爬虫的代理模块使用
 */
var redis = require('redis');

var instance = function(engine, settings){
    this.engine = engine;
    this.settings = settings;
    this.queue = [];
};

instance.prototype.length = function(){
    return this.queue.length;
};

instance.prototype.shift = function(){
    return this.queue.shift();
};

instance.prototype.push = function(url_info){
    return this.queue.push(url_info);
};

instance.prototype.init_queue = function(){
    /**
     * 通过配置文件添加初始化链接
     * [
     *      [url, {type: index, spider: domain}]
     * ]
     */
    for(var i in this.settings.start_url){
        this.push(this.settings.start_url[i]);
    }
};

module.exports = instance;