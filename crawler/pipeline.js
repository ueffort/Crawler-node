/**
 * 管道处理
 * 事件列表：
 *      finish_pipe(err):处理完一个管道请求
 *      finish_init(err):初始化完成
 * 监听列表：
 *      pipe(url, meta, info): 接收一个管道请求
 */

var util = require('util');
var events = require('events');
var async = require('async');
var _ = require('underscore')._;

var pipeline = function(engine, settings){
    this.engine = engine;
    this.settings = settings;
    var self = this;
    async.map(this.settings, function(pipe_name, callback){
        //todo 判断管道文件是否存在
        var pipe = require('../'+self.engine.instance_name+'/pipe/'+pipe_name+'.js')(self.engine.settings);
        callback(null, pipe);
    },function(err, result){
        self.pipe_list = result;
        self.emit('finish_init', err);
    });
};

pipeline.on('pipe', function(url, meta, info){
    var self = this;
    async.reduce(this.pipe_list, info, function(info, pipe, callback){
        //依次传入管道中，如果返回false则结束后续管道处理
        info = pipe(info);
        callback(!info ? true : null, info);
    },function(err, result){
        self.emit('finish_pipe', err);
    });
});

module.exports = pipeline;
