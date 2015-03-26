/**
 * spider的结构
 * @param factory
 * @returns {}
 */

var spider;
spider = function (factory) {
    return {
        download: function(url, meta){
            return {};
        },
        index: function (url, meta, $) {
            factory.emit('url', url, meta);
            factory.emit('pipe', info);
        }
    }
};

module.exports = spider;