/**
 * 管理实例运行状态，处理进程信号
 * 支持分布式的实例启动
 * 监听scheduler的调度事件，用户更新实例的运行状态
 * 触发scheduler的事件
 */

var winton = require('winton');
var redis = require('redis');
var os = require('os');
var crypto = require('crypto');

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
 *      current_pipe:当前时间分片的抓取总次数
 *      current_start_time:当前时间分片的启动时间
 *      current_run_seconds:当前分片的实际运行时间,所有进程的运行时间总和
 *      current_init_length:初始化队列长度
 *      init_time:第一次运行时间
 *  }
 *  $instance_time:[//每次分片的运行情况，列表
 *      {//json字符串
 *          download:下载的总次数
 *          pipe:抓取信息的总次数
 *          start_time:启动时间
 *          run_seconds:运行时间
 *          init_length:初始化队列长度
 *          end_time:结束事件
 *      }
 *  ]
 *  $instance_$process:{//每个运行中的process都拥有一个hkey，哈希表，设定有效期
 *      stats:0,1,2,3//当前进程状态,0:启动中 1:运行中，2关闭中，3暂停中，4队列为空停止中，5初始化队列中，6可重新执行
 *      start_time:启动时间
 *      download:该进程的下载次数
 *      pipe:该进程的抓取信息次数
 *      queue:当前的下载队列状态，几个在运行中
 *      last_heart_time:最后次心跳检测时间
 *      host_info:运行的主机信息（hostname,pid）
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
    this.start_time = new Date().getMilliseconds();
    this.logger = logger;
    this.store = store;
    this.settings = settings;
    this.stats = 0;
    var engine = new (require('./engine.js'))(this);
    var self = this;
    return {
        start:function(options){
            self.host_info = os.hostname+':'+process.pid;
            self.process_name = self.instance_name+'_'+ crypto.createHash('md5').update(self.host_info).digest('hex').slice(0,5);
            async.waterfall([
                //监听初始化事件
                function(callback) {
                    engine.on('finish_init',function(){
                        callback(null);
                    });
                },
                //初始化完毕
                function(callback) {
                    engine.emit('scheduler', function(scheduler){
                        callback(null, scheduler);
                    });
                    engine.emit('downloader', function(downloader){
                        downloader.on('finish_download', function(url){
                            self.store.hincrby(self.instance_name, 'download', 1);
                            self.store.hincrby(self.process_name, 'download', 1);
                            self.store.hincrby(self.instance_name, 'current_pipe', 1);
                            engine.logger.info('[ DOWNLOAD ] %s', url);
                        });
                    });
                    engine.emit('pipeline', function(pipeline){
                        pipeline.on('finish_pipeline', function(error, url){
                            if(error){
                                engine.logger.warn('[ PIPELINE ] %s', url);
                            }else{
                                self.store.hincrby(self.instance_name, 'pipe', 1);
                                self.store.hincrby(self.process_name, 'pipe', 1);
                                self.store.hincrby(self.instance_name, 'current_pipe', 1);
                                engine.logger.info('[ PIPELINE ] %s', url);
                            }
                        });
                    });
                },
                //获取scheduler
                function(scheduler, callback) {
                    scheduler.emit('start',function(){
                        self.store.hset(self.process_name, 'stats', 1);
                        self.stats = 1;
                    });
                    //设定退出逻辑
                    process.on('exit',function(){
                        scheduler.emit('stop',function(){
                            self.store.delete('status_'+self.instance_name);
                            self.store.end();
                        });
                    });
                    scheduler.on('finish_queue', function(loop){
                        callback(null);
                    });
                },
                //队列执行为空
                function(callback){
                    self.store.hset(self.process_name, 'stats', 4);
                    self.stats = 4;
                    self.store.keys(self.instance_name+'_*', callback);
                },
                //获取所有进程列表
                function(process_list, callback){
                    async.filter(process_list, function(process_name, callback){
                        if(process_name == self.process_name) return callback(false);
                        self.store.hget(process_name, 'stats', function(error, result){
                            callback(result != 4);
                        });
                    }, function(running_process){
                        //所有进程都执行完毕
                        if(running_process) return callback(1, process_list);//中断async
                        //注册为初始化进程
                        self.store.hset(self.process_name, 'stats', 5);
                        self.stats = 5;
                        async.map(['download','pipe','start_time','run_seconds','init_length'],function(item,callback){
                            self.store.hget(self.instance_name, item, function(error, result){
                                callback(error, result);
                            });
                        },function(err, result){
                            callback(err, process_list, result)
                        });
                    });
                },
                //获取所有单个时间分片的数据
                function(process_list, result, callback){
                    self.store.rpush(self.instance_name+'_time',JSON.stringify({
                        download:result[0],
                        pipe:result[1],
                        start_time:result[2],
                        run_seconds:result[3],
                        init_length:result[4],
                        end_time:new Date().getMilliseconds()
                    }));
                    self.store.hset(self.instance_name, 'current_download', 0);
                    self.store.hset(self.instance_name, 'current_pipe', 0);
                    self.store.hset(self.instance_name, 'current_start_time', 0);
                    self.store.hset(self.instance_name, 'current_run_time', 0);
                    self.store.hset(self.instance_name, 'current_init_length', 0);
                    engine.emit('scheduler', function(scheduler){
                        if(scheduler.settings.loop) return callback(2, process_list);//中断async
                        scheduler.emit('init_queue', function(length){
                            callback(null, process_list, length);
                        });
                    });

                },
                //单个进程执行初始化队列操作
                function(process_list, length, callback){
                    self.store.hset(self.instance_name, 'current_init_length', length);
                    self.store.hset(self.instance_name, 'current_start_time', new Date().getMilliseconds());
                    for(var i in process_list){
                        //恢复所有进程的状态
                        self.store.hset(process_list[i], 'stats', 6);
                        self.stats = 6;
                    }
                    callback(null);
                }
            ], function (err, process_list) {
                if(err == 2){//不需要循环，退出进程
                    for(var i in process_list){
                        //关闭所有进程
                        self.store.hset(process_list[i], 'stats', 2);
                        self.stats = 2;
                    }
                    self.engine.logger('[ SCHEDULER ] finish queue, no need loop crawler, first exit');
                    process.exit();
                }
            });
            self.store.exists(self.instance_name, function(error, result){
                if(error){
                    self.store.hset(self.instance_name, 'init_time', self.start_time);
                }
            });
            self.store.hset(self.process_name, 'stats', 0);
            self.store.hset(self.process_name, 'start_time', self.start_time);
            self.store.hset(self.process_name, 'host_info', self.host_info);
            self.store.expire(self.process_name, 300);
            //保持redis的状态统计
            setInterval(function(){
                if(self.stats == 1) self.store.hincrby(self.instance_name, 'current_run_seconds', 1);
                self.store.hget(self.process_name, 'stats', function(error, result){
                    if(result == 6){//可恢复状态
                        self.engine.emit('scheduler', function(scheduler){
                            scheduler.emit('start', function(){
                                self.store.hset(self.process_name, 'stats', 1);
                                self.stats = 1;
                            });
                        });
                    }else if(result == 2){//关闭状态,手动关闭
                        self.engine.logger('[ SCHEDULER ] stats is 2, need close, auto exit');
                    }
                });
                self.engine.emit('scheduler', function(scheduler){
                    self.store.hset(self.process_name, 'queue', scheduler.queue.running());
                });
                self.store.hset(self.process_name, 'last_heart_time', new Date().getMilliseconds());
                self.store.expire(self.process_name, 300);
            },1000);
        },
        stop:function(options){
            var self = this;
            store.exists(self.instance_name, function(error, value){
                if(!value) return console.log(self.instance_name+'is not exist');
                store.keys(self.instance_name+'_*',function(error, result){
                    if(error){
                        console.log(self.instance_name+':is not running');
                    } else {
                        for (var i in result) {
                            store.hset(result[i], 'stats', 2);
                        }
                        setTimeout(function(){
                            store.keys(self.instance_name+'_*', function(error, result){
                                if(error){
                                    console.log(self.instance_name+':stoped');
                                }else {
                                    console.log(self.instance_name + ':running  %s', result.length);
                                }
                            })
                        },2000);
                    }
                });
            })
        },
        status:function(options){
            var self = this;
            store.hkeys(self.instance_name, function(error, result){
                if(!result) return console.log(self.instance_name+'is not exist');
                for(var i in result){
                    store.hget(self.instance_name, result[i], function(e, r){
                        console.log(result[i]+'='+r);
                    });
                }
            });
            if(options.process == '*'){
                store.keys(self.instance_name+'_*', function(error, result){
                    for(var i in result){
                        console.log('process_name:%s', result[i]);
                    }
                });
            }else if(options.process){
                var process_name = self.instance_name+'_'+options.process;
                store.hkeys(process_name, function(error, result){
                    if(!result) return console.log(options.process+'is not exist');
                    console.log(options.process+':');
                    for(var i in result){
                        store.hget(process_name, result[i], function(e, r){
                            console.log(result[i]+'='+r);
                        });
                    }
                });
            }
        }
    };
};

module.exports = core;
