/**
 * 管道处理
 * 事件列表：
 *      finish_pipe(err, link):处理完一个管道请求
 * 监听列表：
 *      pipe(link, meta, info): 接收一个管道请求
 */

var util = require('util');
var events = require('events');
var async = require('async');

var default_settings = {
    path: false//管道文件所在的路径，默认在实例的pipe下
    ,pipe: []//加载的管道器
};

var pipeline = function(engine, settings, init_callback){
    this.engine = engine;
    this.settings = _.extend(default_settings, settings);
    var self = this;
    var pipe_path = self.settings.path ? self.settings.path : self.engine.instance_name+'/pipe';
    async.map(this.settings.pipe, function(pipe_name, callback){
        //todo 判断管道文件是否存在
        var pipe = require('../'+pipe_path+'/'+pipe_name+'.js')(self.engine.settings);
        callback(null, pipe);
    },function(err, result){
        self.pipe_list = result;
        init_callback(err, self);
    });
};

pipeline.on('pipe', function(link, meta, info){
    var self = this;
    async.reduce(this.pipe_list, info, function(info, pipe, callback){
        //依次传入管道中，如果返回false则结束后续管道处理
        info = pipe(info);
        callback(!info ? true : null, info);
    },function(err, result){
        self.emit('finish_pipe', err, link);
    });
});

module.exports = pipeline;
