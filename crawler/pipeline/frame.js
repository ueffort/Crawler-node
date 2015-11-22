/**
 * pipe的基本结构，接收参数，返回处理函数
 * @param settings
 * @returns {Function}
 */

var pipe = function(settings){
    return function(info){
        return true;
    };
};

module.exports = pipe;