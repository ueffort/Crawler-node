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
        index: function (link, meta, $) {
            factory.emit('url', link, meta);
            factory.emit('pipe', link, meta, 'info');
        }
    }
};

module.exports = spider;