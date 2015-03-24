/**
 * http://www.proxy.com.ru
 * Created by gaojie on 15/3/22.
 */

var spider = function(factory){
    return {
        download:{

        },
        index: function(url , meta, $){
            var info = $('title');
            factory.emit('pipe', url, meta, info);
        }
    }
};

module.exports = spider;
