var redis = require('redis');

var instance = function(engine){
    this.engine = engine;
    this.settings = engine.settings;
    this.length = 0;
};

instance.prototype.shift = function(){
    this.length -= 1;
    return url_info;
};

instance.prototype.push = function(url_info){
    this.length += 1;
};

instance.prototype.init_queue = function(){
    /**
     * 通过配置文件添加初始化链接
     * [
     *      [url, {type: index, spider: taobao}]
     * ]
     */
    for(var i in this.settings.start_url){
        this.push(this.settings.start_url[i]);
    }
};

module.exports = instance;