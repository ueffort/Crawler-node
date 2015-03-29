/**
 * http://www.proxy.com.ru
 * Created by gaojie on 15/3/22.
 */

var spider = function(factory){
    return {
        download: function(url, meta){
            return {};
        },
        index: function(link , meta, $){
            var info = $('title').text();
            factory.emit('pipe', link, meta, info);
        }
    }
};

module.exports = spider;
