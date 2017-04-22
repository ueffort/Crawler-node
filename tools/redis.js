/**
 * Created by gaojie on 17-2-17.
 */

var redis = require('redis');
var commands = require('redis-commands');

var Redis = function(config){
  this.client = redis.createClient(config);
};

commands.list.forEach(function (command) {
  Redis.prototype[command] = function(){
    var ctx = this;
    var arg = [];
    for(var key in arguments) {
      arg.push(arguments[key]);
    }
    return new Promise((resolve, reject)=>{
      arg.push(function(err, result){
        if(err){
          reject(err);
        }else{
          resolve(result);
        }
      });
      redis.RedisClient.prototype[command].apply(ctx.client, arg);
    })
  }
});

var RedisSub = function(config){
  this.client = redis.createClient(config);
};
RedisSub.prototype.channelMap = {};
RedisSub.prototype.isSub = false;
RedisSub.prototype.sub = function (channel, callBack, key) {
  if (!this.channelMap[channel]) {
    this.client.subscribe(channel);
    this.channelMap[channel] = []
  }
  this.channelMap[channel].push([key, callBack]);
  if (!this.isSub) {
    this.client.on('message', (channel, message) => {
      let actionList = this.channelMap[channel];
      for (let i = 0; i < actionList.length; i++) {
        let action = actionList[i];
        action[1](message)
      }
    })
  }
};
RedisSub.prototype.unSub = function (channel, key) {
  let actionList = this.channelMap[channel];
  for (let i = 0; i < actionList.length; i++) {
    let action = actionList[i];
    if (action[0] === key) {
      actionList.splice(i, 1);
      break
    }
  }
};
Redis.prototype.pub = function (channel, message) {
  this.client.publish(channel, message)
};

// module.exports = new Redis(config.redis);
//
// module.exports.redisSub = new RedisSub(config.redis);
module.exports.Redis = Redis;
module.exports.RedisSub = RedisSub;
// module.exports = Redis;
