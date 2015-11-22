/**
 * 管道处理
 * 事件列表：
 *      finish_pipeline(err, link):处理完一个管道请求
 * 监听列表：
 *      pipe(link, info, callback(err)): 接收一个管道请求
 */

var util = require('util');
var events = require('events');
var async = require('async');
var _ = require('underscore')._;

var default_settings = {
    path: false//管道文件所在的路径，默认在实例的pipe下
    ,pipe: []//加载的管道器
};

var pipeline = function(engine, settings, init_callback){
    this.engine = engine;
    this.settings = _.defaults(settings, default_settings);
    engine.logger.silly('[ PIPELINE ] init ', this.settings);
    var self = this;
    var pipe_path = self.settings.path ? self.settings.path : self.engine.instance_name+'/pipe';
    event_init(this);
    async.map(this.settings.pipe, function(pipe_name, callback){
        var err = null;
        try{
            var pipe = require('../'+pipe_path+'/'+pipe_name+'.js')(self.engine.settings);
        }catch(e){
            self.engine.logger.debug(e);
            self.engine.logger.error('[ PIPELINE ] pipe init error :', pipe_name);
            err = self.engine.error.PIPELINE_PIPE_INIT_ERROR;
        }
        callback(err, {name: pipe_name, pipe: pipe});
    },function(err, result){
        self.pipe_list = result;
        init_callback(err, self);
    });
};
util.inherits(pipeline, events.EventEmitter);

function event_init(pipeline){
pipeline.on('pipe', function(link, info, callback){
    var self = this;
    this.engine.logger.info("[ PIPELINE ] pipe ", link, info);
    async.reduce(this.pipe_list, info, function(info, pipe_map, callback){
        self.engine.logger.silly("[ PIPELINE ] pipe", pipe_map.name);
        var err = null;
        //依次传入管道中，如果返回false则结束后续管道处理
        try{
            info = pipe_map.pipe(info);
            if(_.isNull(info) || info === false) err = self.engine.error.PIPELINE_PIPE_END;
        }catch (e){
            self.engine.logger.debug(e);
            self.engine.logger.error('[ PIPELINE ] pipe exec error :', pipe_map.name);
            err = self.engine.error.PIPELINE_PIPE_EXEC_ERROR;
        }
        callback(err, info);
    },function(err, result){
        if(err == self.engine.error.PIPELINE_PIPE_END) err = null;
        callback(err);
        self.emit('finish_pipeline', err, link);
    });
});
}

module.exports = pipeline;
