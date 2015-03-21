/**
 * 管理实例运行状态，处理进程信号
 * 支持分布式的实例启动
 * 监听scheduler的调度事件，用户更新实例的运行状态
 * 触发scheduler的事件
 */

var winton = require('winton');
var redis = require('redis');

try{
    /* 必要的初始化操作 */
    var settings = require('../settings.js');
    winton.loggers.add('core', settings.logger);
    var logger = winton.loggers.get('core');
    var store = redis.createClient(settings.redis.port, settings.redis.host);
}catch(e){
    console.log(e);
    process.exit(1);
}

var core = function(instance_name){
    this.instance_name = instance_name;
    this.start_seconds = new Date().getMilliseconds();
    this.logger = logger;
    this.store = store;
    this.settings = settings;
    var engine = require('./engine.js')(this);
    return {
        start:function(options){
            var self = this;
            engine.on('finish_init', function(){
                engine.emit('scheduler', function(scheduler){
                    scheduler.emit('start',function(queue_length){

                    });
                    scheduler.on('start_download',function(url, meta){

                    });
                    scheduler.on('stop_download', function(url, meta){

                    });
                    //设定退出逻辑
                    process.on('exit',function(){
                        scheduler.emit('stop',function(){
                            self.store.delete('status_'+self.instance_name);
                            self.store.end();
                        });
                    });
                });
            });
            //保持redis的状态统计
            setInterval(function(){
                self.store.set('status_'+self.instance_name, self.start_seconds,1000);
            },500);

        },
        stop:function(){
            var self = this;
            store.get('status_'+self.instance_name, function(error, value){
                if(!value) return console.log(self.instance_name+':is not running');
                store.set('stop_'+self.instance_name,1);
                setTimeout(function(){
                    store.get('status_'+self.instance_name, function(error, value){
                        if(value) return;
                        console.log(self.instance_name+':stoped');
                    })
                },2000);
            })
        },
        status:function(options){
            var self = this;
            store.get('status_'+self.instance_name, function(error, value){
                var s = null;
                if(!value){
                    s = 'is not running';
                }else{
                    s = 'start '+new Date(self.start_seconds).toLocaleString();
                }
                console.log(self.instance_name+':'+s);
            });
        }
    };
}

module.exports = core;
