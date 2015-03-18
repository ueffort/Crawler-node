var winton = require('winton');
var redis = require('redis');
var _ = require('underscore')._;

try{
    /* 必要的初始化操作 */
    var settings = require('../settings.js');
    var logger = new (winton.Logger)({
        settings.logger
    });
    var store = redis.createClient(settings.redis.port, settings.redis.host);
}catch(e){
    console.log(e);
}

var core = function(instance){
    this.instance_name = instance;
    this.start_seconds = new Date().getMilliseconds();
    try{
        this.settings = require('../'+instance+'/settings.js');
    }catch(e){
        logger.error('[ CONFIG ] instance(%s) not exists', instance);
    }
    if (!this.settings) logger.error('[ CONFIG ] instance(%s) settings is null', instance);
    this.settings = _.extend(this.settings, settings);
    this.logger = new (winton.Logger)({this.settings.logger});
    return {
        start:function(options){
            var self = this;
            self.scheduler = require('./scheduler.js');
            self.downloader = require('./downloader.js');
            self.scheduler.start(self);
            setInterval(function(){
                store.set('status_'+self.instance_name,start_seconds,1000);
            },500);
            process.on('exit',function(){
                store.delete('status_'+self.instance_name);
                store.end();
            });
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
            store.get('status_'+self.instance_name, function(error, value){i
                if(!value){
                    var s = 'is not running';
                }else{
                    var s = 'start '+new Date(self.start_seconds).toLocaleString();
                }
                console.log(self.instance_name+':'+s);
            });

        }
    };
}

module.exports = core;
