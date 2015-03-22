/**
 * spider的结构
 * @param factory
 * @returns {{js: boolean, index: Function}}
 */

var spider = function(factory){
    return {
        js: false,
        index: function(url , meta, $){
            factory.emit('queue', url, meta);
            factory.emit('pipe', info);
        }
    }
};

module.exports = spider;