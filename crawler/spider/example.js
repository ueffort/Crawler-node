/**
 * spider的结构
 * @param factory
 * @returns {}
 */

var spider = function (factory) {
    return {
        download: function*(link, meta){
            return {};
        },
        index: function*(link, meta, $) {
            factory.emit('link', link, meta);
            factory.emit('pipe', link, 'info');
        }
    }
};

module.exports = spider;