/**
 * Created by gaojie on 15/4/1.
 */

var redis = require('redis');
var store = redis.createClient(6379, '127.0.0.1');
var store1 = redis.createClient(6379, '127.0.0.1');
store.on('message', function(channel, message){
    console.log(channel, message);
});
store.subscribe('123');
store1.pubsub('CHANNELS', function(err, result){
    console.log(err , result);
});
store1.publish('123', 1);