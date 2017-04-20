/**
 * Created by gaojie on 15/3/22.
 * 收集新的代理地址，存入redis，供爬虫的代理模块使用
 */
var redis = require('redis');

var instance = function(engine, settings){
    this.engine = engine;
    this.settings = settings;
    this.queue = [];
    this.proxy_length = 0;
    var self = this;
    this.engine.on('finish_init', function(){
        self.engine.emit('proxy', function(err, proxy){
            self.proxy = proxy;
        });
    });
    this.getProxy = function(link, meta){
        return new Promise((resolve, reject)=>{
            self.proxy.emit('get', 'proxy_test', function(err, info){
                if(err) return reject(err);
                resolve(info);
            });
        }).catch((err)=>{
            throw err;
        })
    };
};

instance.prototype.length = function*(){
    return this.proxy_length;
};

instance.prototype.shift = function*(){
    if(!this.queue.length){
        for(var i in this.settings.start_url){
            yield this.push(this.settings.start_url[i]);
        }
    }

    let info = this.queue.shift();
    let proxy = yield this.getProxy(info.link, info.meta);
    if(!proxy){
        this.proxy_length = 0;
        throw new Error('代理为空');
    }
    info.meta.proxy = proxy;
    this.proxy_length -= 1;
    return info;
};

instance.prototype.push = function*(url_info){
    return this.queue.push(url_info);
};

instance.prototype.init_queue = function*(){
    var self = this;
    var length_init = function(){
        return new Promise((resolve, reject)=>{
            self.proxy.emit('copy', 'proxy_test', function(err, length){
                if(!err){
                    self.proxy_length = length;
                    resolve(length);
                }else{
                    reject(err);
                }
            });
        }).catch((err)=>{
            self.engine.logger.debug(err);
        });
    };
    yield length_init();
};

module.exports = instance;