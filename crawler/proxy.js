/**
 * 蜘蛛工厂，调度链接所需的蜘蛛
 * 监听列表：
 *      proxy(callback(err, host, port, callback(err, milliseconds))): 获取一个代理信息，并且下载后回调该callback
 *      set(host, port, callback(err)): 设置一个新的代理信息
 *      start(name, callback(err, length)): 将未验证代理开启一个新的队列进行验证
 *      get(name, callback(err, info)): 从验证队列中获取一个代理
 * 代理格式：
 *      ip:port  timestamp:某个时刻后才能被使用，在获取后会更新该数值，保证多进程间不调用同一个代理地址
 */

var util = require('util');
var events = require('events');
var async = require('async');
var redis = require('redis');
var _ = require('underscore')._;

var default_settings = {
    redis: false
    ,key: 'crawler_proxy'//在redis中代理集合的key
    ,waring_num: 15//代理告警限制，还剩多少代理后发出警报
    ,download_times: 10//每个代理下载几次重新获取新代理，避免被封
};

var proxy = function(engine, settings, init_callback){
    events.EventEmitter.call(this);
    this.engine = engine;
    this.settings = _.defaults(settings, default_settings);
    engine.logger.silly('[ PROXY ] init ', this.settings);
    event_init(this);
    this.able = false;
    if(_.isUndefined(this.settings.redis)) {
        engine.logger.warning('[ PROXY ] proxy redis has not settings, proxy is Unavailable');
        init_callback();
    }else if(!this.settings.redis){
        engine.logger.info('[ PROXY ] proxy is close');
        init_callback();
    }else{
        this.key = settings.key;
        this.set_key = this.key+'_set';
        this.redis = redis.createClient(settings.redis.port, settings.redis.host, settings.redis.option);
        this.proxy_list = [];
        this.able = true;
        var self = this;
        updateLength(self, function(err, length){
            init_callback(err, self);
        });
    }
};
util.inherits(proxy, events.EventEmitter);

//更新代理列表数量
function updateLength(self, callback){
    self.redis.zcard(self.key, function(err, result){
        if(err){
            self.engine.logger.debug(err);
            self.able = false;
        }else{
            self.length = result;
            //发送告警
            if(self.length < self.settings.waring_num)
                self.engine.logger.warn('[ PROXY ] proxy num is ', self.length);
        }
        callback(err, result);
    });
}

//解析代理数据格式
function parseProxy(info){
    if(_.isObject(info)){
        return info;
    }
    var object = info.split(':');
    return {host: object[0], port: object[1], info:info, times:0, error:0, score:0};
}

//代理结果回写代理状态
function callbackProxy(self, object){
    return function(err, milliseconds){
        var time_stamp = parseInt(new Date().getTime()/1000);
        object.times+=1;
        if(err){
            object.error+=1;
        }
        //将下载时间累加
        object.score += milliseconds;
        //下载完重新进入代理队列
        if(self.settings.download_times != object.times)
            return self.proxy_list.push(object);
        else{
            //调整该代理的优先级
            if(self.settings.download_times == object.error){
                return self.redis.zrem(self.key, object.info);
            }else{
                return self.redis.zadd(self.key, time_stamp + object.score/ self.settings.download_times, object.info);
            }
        }

    }
}

function event_init(proxy){
proxy.on('proxy', function(next_callback){
    var self = this;
    this.engine.logger.info('[ PROXY ] proxy list', self.proxy_list);
    async.waterfall([
        function(callback){
            if(self.proxy_list.length) return callback(self.engine.error.PROXY_ENOUGH, self.proxy_list.pop());
            callback(null);
        },
        function(callback){
            //获取时间戳最小的代理，保证每个代理都能被获取到
            self.redis.zrange(self.key, 0, 0, 'WITHSCORES', callback);
        },
        function(result, callback){
            //保证不会在多进程中都获取到同一个代理
            self.redis.zadd(self.key, 9999999999, result[0]);
            var info = parseProxy(result[0]);
            self.engine.logger.silly('[ PROXY ] proxy parse:', info);
            // self.proxy_list.push(info);
            updateLength(self, function(err, length){
                callback(err, info);
            });
        }
    ], function(err,info){
        if(err && err != self.engine.error.PROXY_ENOUGH){
            self.engine.logger.debug(e);
            self.engine.logger.error('[ PROXY ] proxy get error');
            return next_callback(err);
        }
        // var info = self.proxy_list.pop();
        self.engine.logger.silly('[ PROXY ] proxy ', info);
        next_callback(null, info.host, info.port, callbackProxy(self, info));
    });
});
proxy.on('set', function(host, port, score, callback){
    var self = this;
    var time_stamp = parseInt(new Date().getTime()/1000);
    if(score>0){
        self.redis.zadd(self.key, time_stamp + score, host+':'+port, function(err, result){
            if(callback) callback(err);
        });
    }else{
        self.redis.sadd(self.set_key, host+':'+port, function(err, result){
            if(callback) callback(err);
        });
    }

});
proxy.on('copy', function(name, callback){
   var self = this;
    self.engine.logger.info('[ PROXY ] proxy copy ', name);
    self.redis.exists(name, function(err, result){
       if(result){
           self.engine.logger.info('[ PROXY ] set %s exists, get length', name, result);
           self.redis.scard(name, function(err, result){
               self.engine.logger.info('[ PROXY ] set get length:', result);
               callback(err, result);
           })
       }else{
           self.engine.logger.info('[ PROXY ] set %s not exists, copy set', name);
           self.redis.sunionstore(name, self.set_key, function(err, result){
               self.engine.logger.info('[ PROXY ] copy set, get length');
               self.redis.scard(name, function(err, result){
                   self.engine.logger.info('[ PROXY ] set get length:', result);
                  callback(err, result);
               });
           });
       }
    });
});
proxy.on('get', function(name, callback){
    var self = this;
    self.redis.spop(name, function(err, result){
        if(err){
            callback(err);
        }else if(!result){
            self.engine.logger.info('[ PROXY ] set is empty');
            self.redis.del(name, function(_, result){
                self.engine.logger.info('[ PROXY ] set is delete');
                callback(err);
            })
        }else{
            var info = parseProxy(result);
            self.engine.logger.info('[ PROXY ] get proxy:', info);
            callback(err, info);
        }
    });
})
}

module.exports = proxy;
