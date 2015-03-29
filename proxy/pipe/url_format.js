/**
 * Created by gaojie on 15/3/22.
 */

var pipe = function(settings){
    return function(info){
        console.log(info);
    };
};

module.exports = pipe;