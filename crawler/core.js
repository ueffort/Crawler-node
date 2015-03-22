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

/**
 * redis格式：统计信息
 * {
 *  $instance_name:{//每个instance拥有一个hkey,哈希表
 *      download:下载的总次数
 *      pipe:抓取信息总次数
 *      current_download:当前时间分片下载的次数
 *      current_start_time:当前时间分片的启动时间
 *      current_run_time:当前分片的实际运行时间
 *      init_time:第一次运行时间
 *      times:总运行次数（一个分片算一次）
 *
 *  }
 *  $instance_time:[//每次分片的运行情况，列表
 *      {//json字符串
 *          download:下载的总次数
 *          start:启动时间
 *          run:运行时间
 *          pipe:抓取信息的总次数
 *      }
 *  ]
 *  $instance_$process:{//每个运行中的process都拥有一个hkey，哈希表，设定有效期
 *      status:0,1//当前进程状态
 *      start:启动时间
 *      download:该进程的下载次数
 *      pipe:该进程的抓取信息次数
 *      queue:当前的下载队列状态，几个在运行中
 *
 *  }
 *  proxy:(//总的代理列表，有序集合
 *      ip:port score://根据score的正序获取一个代理，每调用一次则减少部分分值，如果失败则降低该代理的分值，如果成功则提高该代理的分值，对于分值为负数的则移除
 *  )
 * }
 * @param instance_name
 * @returns {{start: Function, stop: Function, status: Function}}
 */

var core = function(instance_name){
    this.instance_name = instance_name;
    this.start_seconds = new Date().getMilliseconds();
    this.logger = logger;
    this.store = store;
    this.settings = settings;
    var engine = new (require('./engine.js'))(this);
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
            store.hget(self.instance_name, 'status', function(error, value){

            });
        }
    };
};

module.exports = core;
