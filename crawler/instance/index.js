var instance = function(engine, settings){
    this.engine = engine;
    this.settings = settings;
    this.url_length = 0;
};

instance.prototype.length = function(){
    return this.url_length;
};

instance.prototype.shift = function(){
    this.url_length -= 1;
    return url_info;
};

instance.prototype.push = function(url_info){
    this.url_length += 1;
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