var redis = require('redis');

var instance = function(engine, settings){
    this.engine = engine;
    this.settings = settings;
    this.length = 0;
    this.queue = [];
};

instance.prototype.shift = function(){
    this.length -= 1;
    return this.queue.shift();
};

instance.prototype.push = function(url_info){
    this.length += 1;
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