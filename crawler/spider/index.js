/**
 * spider的结构
 * @param factory
 * @returns {}
 */

var spider;
spider = function (factory) {
    return {
        download: {},
        index: function (url, meta, $) {
            factory.emit('url', url, meta);
            factory.emit('pipe', info);
        }
    }
};

module.exports = spider;