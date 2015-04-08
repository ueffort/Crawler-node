/**
 * Created by gaojie on 15/4/1.
 */
var async = require('async');
var _ = require('underscore')._;

var change_process_stats = function(self, stats){
    self.store.hset(self.process_name, 'stats', stats);
    self.stats = stats;
};

//执行关闭操作，并发送通知
var exit = function(self, return_stats, channel){
    self.store.del(self.process_name);
    self.engine.emit('scheduler', function(err, scheduler){
        if(err && channel) return store.publish(channel, 0);
        scheduler.emit('stop',function(err){
            if(err){
                //todo 处理退出失败
            }
            if(channel) store.publish(channel, err ? 0 : 1);
            process.exit(return_stats);
        });
    });
};

//创建时间分片记录并初始化instance队列
var queue_init = function(self, scheduler, callback){
    logger.silly('[ CORE ] queue is empty, start init!');
    var field_list = ['current_download', 'current_pipe', 'current_start_time', 'current_run_seconds', 'current_init_length'];
    async.waterfall([
        function(callback){
            //获取所有单个时间分片的数据
            async.map(field_list, function(item,callback){
                self.store.hget(self.instance_name, item, function(err, result){
                    callback(err, result);
                });
            }, function(err, result){
                //非初次初始化，记录时间分片信息
                if(!_.isUndefined(result[4]) && result[4] > 0){
                    self.logger.silly('[ CORE ] finish time!', result);
                    self.store.rpush(self.instance_time_list, JSON.stringify({
                        download:result[0],
                        pipe:result[1],
                        start_time:result[2],
                        run_seconds:result[3],
                        init_length:result[4],
                        end_time:new Date().getMilliseconds()
                    }));
                }
                //初始化时间片信息
                async.each(field_list,function(item, callback){
                    self.store.hset(self.instance_name, item, 0);
                    callback(null);
                },function(err){
                    callback(err);
                });
            });
        }, function(callback){
            //单个进程执行初始化队列操作
            scheduler.emit('init_queue', function(err, length){
                if(err) return callback(err);
                self.store.hset(self.instance_name, 'current_init_length', length);
                self.store.hset(self.instance_name, 'current_start_time', new Date().getMilliseconds());
                callback(null);
            });
        }
    ], function(err){
        callback(err);
    });
};

//全局事件初始化，并执行start
var event_init = function(self, option){
    //组件初始化操作
    async.waterfall([
        //监听初始化事件
        function(callback) {
            self.engine.on('finish_init', function(err){
                if(err){
                    callback(err);
                }else{
                    self.engine.emit('downloader', callback);
                }
            });
            //绑定事件后初始化
            self.engine.init();
        },
        //初始化完毕
        function(downloader, callback) {
            downloader.on('finish_download', function (err, url) {
                if (!err) {
                    async.each([[self.instance_name, 'download'],
                        [self.instance_name, 'current_download']
                    ], function (item, callback) {
                        self.store.hincrby(item[0], item[1], 1);
                        callback();
                    }, function (err) {
                        if (err) self.engine.logger.debug(err);
                    });
                    self.download += 1;
                    self.engine.logger.silly('[ CORE ] download finish %s', url);
                }
            });
            self.engine.emit('pipeline', callback);
        },
        function(pipeline, callback){
            pipeline.on('finish_pipeline', function(err, url){
                if(!err){
                    async.each([[self.instance_name, 'pipe'],
                        [self.instance_name, 'current_pipe']
                    ], function(item, callback){
                        self.store.hincrby(item[0], item[1], 1);
                        callback();
                    },function(err){
                        if(err) self.engine.logger.debug(err);
                    });
                    self.pipe += 1;
                    self.engine.logger.silly('[ CORE ] pipeline finish %s', url);
                }
            });
            self.engine.emit('scheduler', callback);
        },
        //获取scheduler
        function(scheduler, callback) {
            async.each(['finish_queue', 'wait_queue'], function(item, callback){
                scheduler.on(item, function(err){
                    async.waterfall([
                        function(callback){
                            change_process_stats(self, 3);
                            //获取所有进程列表
                            self.store.pubsub('CHANNELS', self.instance_process_list, function(err, process_list){
                                logger.silly('[ CORE ] process_list ', process_list);
                                process_list = _.filter(process_list, function(i,item){
                                    return item != self.process_name;
                                });
                                async.map(process_list, function(item, callback){
                                    self.store.hget(item, 'stats', callback);
                                },function(err, result){
                                    _.each(result, function(i, stats){
                                        if(stats == 1) callback(self.engine.error.CORE_WAIT_INSTANCE_PROCESS);
                                        if(stats == 4) callback(self.engine.error.CORE_INIT_INSTANCE_PROCESS);
                                    });
                                    callback(null, process_list);
                                });
                            });
                        },
                        function(process_list, callback){
                            //锁定所有进程
                            _.each(process_list, function(i, item){
                                self.store.publish(item, 'lock');
                            });
                            //注册为初始化进程
                            change_process_stats(self, 4);
                            queue_init(self, scheduler, function(err){
                                if (err) {
                                    _.each(process_list, function (i, item) {
                                        self.store.publish(item, 'stop');
                                    });
                                }else{
                                    //恢复所有进程的状态
                                    _.each(process_list, function(i, item){
                                        self.store.publish(item, 'unlock');
                                    });
                                    change_process_stats(self, 1);
                                }
                                callback(err);
                            });
                        }
                    ], function(err) {
                        if (err == self.engine.error.SCHEDULER_NO_NEED_LOOP_QUEUE
                            || self == self.engine.error.SCHEDULER_QUEUE_ERROR) {
                            self.engine.logger.info('[ CORE ] finish queue, no need loop crawler, exec exit');
                            exit(self);
                        } else if (err == self.engine.error.CORE_WAIT_INSTANCE_PROCESS) {
                            err = null;
                            self.engine.logger.info('[ CORE ] instance has running process, wait!');
                        }else if(err == self.engine.error.CORE_INIT_INSTANCE_PROCESS){
                            err = null;
                            self.engine.logger.info('[ CORE ] instance init process runing, wait!');
                        }
                    })
                });
                callback(null);
            }, function(err){
                scheduler.emit('start', function(err){
                    if(err) {
                        exit(self,1);
                    }else{
                        change_process_stats(self, 1);
                    }
                });
                callback(err);
            });
        }
    ], function (err) {
        if(err && !_.isNumber(err)){
            self.engine.logger.debug(err);
            err = self.engine.error.CORE_ERROR;
        }
        if(err){
            self.engine.logger.error('[ CORE ] event init  has error(%s),exit', err);
            exit(self,1);
        }
    });
};

module.exports = {
    change_process_stats: change_process_stats,
    exit: exit,
    queue_init: queue_init,
    event_init: event_init
}