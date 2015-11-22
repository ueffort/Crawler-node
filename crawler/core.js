/**
 * 管理实例运行状态，处理进程信号
 * 支持分布式的实例启动
 * 监听scheduler的调度事件，用户更新实例的运行状态
 * 触发scheduler的事件
 */

var winston = require('winston');
var redis = require('redis');
var os = require('os');
var crypto = require('crypto');
var async = require('async');
var _ = require('underscore')._;
var util = require('util');

var logic = require('./tools/logic.js');

try{
    /* 必要的初始化操作 */
    var settings = require('../settings.js');
    winston.loggers.add('core', JSON.parse(JSON.stringify(settings.logger)));
    var logger = winston.loggers.get('core');
    var store = redis.createClient(settings.redis.port, settings.redis.host);
    var subscription = redis.createClient(settings.redis.port, settings.redis.host);
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
 *  $instance|time:[//每次分片的运行情况，列表
 *      {//json字符串
 *          download:下载的总次数
 *          pipe:抓取信息的总次数
 *          start_time:启动时间
 *          run_seconds:运行时间
 *          init_length:初始化队列长度
 *          end_time:结束事件
 *      }
 *  ]
 *  crawler_proxy:(//总的代理列表，有序集合
 *      ip:port score://根据score的正序获取一个代理
 *  )
 * }
 *
 * 进程事件处理，通过redis的订阅/发布实现
 *  每个进程订阅1个频道
 *      $instance_name.$process
 *  对进程的操作可以通过发送消息到
 *      模式频道：$instance_name.*
 *      具体频道：$instance_name.$process
 *  进程的响应消息都会发送到
 *      $message.$instance_name.$process
 *  可以订阅1个频道
 *      模式频道：$message.$instance_name.*
 *      具体频道：$message.$instance_name.$process
 *  message列表：
 *      pause：暂停进程，返回值：1成功，0失败
 *      lock：锁定并暂停进程状态，返回值：1成功，0失败
 *      unlock：解锁并恢复进程状态，返回值：1成功，0失败
 *      resume：恢复进程，返回值：1成功，0失败
 *      stop：停止进程，返回值：1成功，0失败
 *      status：进程当前状态，返回值（json）
 *          {
 *              stats:0,1,2,3//当前进程状态,0:启动中 1:运行中，2暂停中，3队列为空停止中，4初始化队列中
 *              start_time:启动时间
 *              download:该进程的下载次数
 *              pipe:该进程的抓取信息次数
 *              queue:当前的下载队列状态，几个在运行中
 *              host_info:运行的主机信息（hostname,pid）
 *          }
 * 日志记录：
 *      调用者判断错误，传递错误（更改为自身错误）
 *      自身监听者及触发自身写日志
 *
 *      系统错误和第三方类库错误，使用debug输出错误
 *      基本事件监听发送info日志，单个函数内的多次日志写silly
 *
 */

//生成固定的进程名，监听频道名
function make_process(instance_name, process_name, host_info){
    if(!process_name) process_name = crypto.createHash('md5').update(host_info).digest('hex').slice(0,5);
    return instance_name+'.'+process_name;
}

var core = function(instance_name){
    var self = {};
    self.instance_name = instance_name;
    self.instance_process_list = instance_name+'.*';
    self.instance_time_list = instance_name+'|time';
    self.start_time = new Date().getMilliseconds();
    self.logger = logger;
    self.store = store;
    self.lock = false;
    self.settings = settings;
    self.stats = 0;
    self.download = 0;
    self.pipe = 0;
    self.engine = new (require('./engine.js'))(self);
    return {
        start:function(options){
            self.host_info = os.hostname+':'+process.pid;
            self.process_name = make_process(instance_name, null, self.host_info);
            logic.event_init(self, options);
            //开始进程信息初始化
            store.exists(self.instance_name, function(error, result){
                if(!result){
                    store.hset(self.instance_name, 'init_time', self.start_time);
                }
            });
            subscription.on('message', function(channel, message){
                var response_channel = message + '.' + self.process_name;
                logger.info('[ MESSAGE ] accept message:', message);
                if(message == 'stop'){
                    if(self.lock) return store.publish(response_channel, 0);
                    logic.exit(self, 0, response_channel);
                }else if(message == 'pause'){
                    if(self.lock) return store.publish(response_channel, 0);
                    self.engine.emit('scheduler',function(err, scheduler){
                        scheduler.emit('pause', function(err){
                            if(!err) logic.change_process_stats(self, 2);
                            store.publish(response_channel, err ? 0 : 1);
                        });
                    });
                }else if(message == 'resume'){
                    if(self.lock) return store.publish(response_channel, 0);
                    self.engine.emit('scheduler', function(err, scheduler){
                        scheduler.emit('resume', function(err){
                            if(!err) logic.change_process_stats(self, 1);
                            store.publish(response_channel, err ? 0 : 1);
                        })
                    });
                }else if(message == 'status'){
                    self.engine.emit('scheduler', function(err, scheduler){
                        store.publish(response_channel, JSON.stringify({
                            stats: self.stats,
                            start_time: self.start_time,
                            host_info: self.host_info,
                            download: self.download,
                            pipe: self.pipe,
                            lock: self.lock,
                            queue: scheduler.queue.running()
                        }));
                    });
                }else if(message == 'lock'){
                    if(self.lock){
                        logger.warn('[ CORE ] core is locked !');
                        return store.publish(response_channel, 0);
                    }
                    self.lock = true;
                    self.engine.emit('scheduler',function(err, scheduler){
                        scheduler.emit('pause', function(err){
                            if(!err) logic.change_process_stats(self, 2);
                            store.publish(response_channel, err ? 0 : 1);
                        });
                    });
                }else if(message == 'unlock'){
                    if(!self.lock){
                        logger.warn('[ CORE ] core not lock!');
                        return store.publish(response_channel, 0);
                    }
                    self.lock = false;
                    self.engine.emit('scheduler',function(err, scheduler){
                        scheduler.emit('resume', function(err){
                            if(!err) logic.change_process_stats(self, 1);
                            store.publish(response_channel, err ? 0 : 1);
                        });
                    });
                    store.publish(response_channel, 1);
                }
            });
            subscription.subscribe(self.process_name);
            logic.change_process_stats(self, 0);
            //保持redis的状态统计
            setInterval(function(){
                if(self.stats == 1) store.hincrby(self.instance_name, 'current_run_seconds', 1);
                store.expire(self.process_name, 10);
            },1000);
        },
        stop:function(options){
            store.pubsub('CHANNELS', self.instance_process_list, function(err, result){
                if(err){
                    logger.error(err);
                    process.exit();
                }else if(result.length == 0){
                    logger.info(self.instance_name+':is not running');
                    process.exit();
                }
                logger.info(self.instance_name+':', result);
                var process_length = result.length;
                var stop_length = 0;
                subscription.on('pmessage', function(pattern, channel, message){
                    if(message == 1){
                        logger.info(channel+':stoped');
                        stop_length+=1;
                    }else if(message == 2){
                        logger.info(channel+':waiting');
                    }else{
                        logger.info(channel+':return->'+message);
                    }
                    if(process_length == stop_length){
                        logger.info(self.instance_name+': all stop');
                        process.exit();
                    }
                });
                subscription.psubscribe('stop.'+self.instance_process_list);
                _.each(result, function(item){
                    store.publish(item, 'stop');
                });
            });
        },
        status:function(options){
            if(options.list){
                store.pubsub('CHANNELS', self.instance_process_list, function(err, result){
                    if(err){
                        logger.error(err);
                    }else if(result.length == 0){
                        logger.info(self.instance_name+':is not running');
                    }else{
                        logger.info('process_name:', result);
                    }
                    process.exit();
                });
            }else if(options.process){
                var process_name = make_process(instance_name, options.process);
                store.pubsub('NUMSUB', process_name, function(err, result){
                    if(err){
                        logger.error(err);
                        process.exit();
                    }else if(result[1] == 0){
                        logger.info(process_name+':is not exist');
                        process.exit();
                    }else{
                        subscription.on('message', function(pattern, channel, message){
                            logger.info(message);
                            process.exit();
                        });
                        subscription.psubscribe('status.'+process_name);
                        store.publish(process_name, 'status');
                    }

                });
            }else{
                store.hkeys(self.instance_name, function(err, result){
                    if(err){
                        logger.error(err);
                        process.exit();
                    }else if(!result){
                        logger.info(self.instance_name+'is not exist');
                        process.exit();
                    }else{
                        async.each(result, function(item, callback){
                            store.hget(self.instance_name, item, function(err, result){
                                logger.info(item+':'+result);
                                callback();
                            });
                        },function(err){
                            process.exit(0);
                        });
                    }

                });
            }
        }
    };
};

module.exports = core;
