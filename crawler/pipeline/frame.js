/**
 * pipe的基本结构，接收参数，返回处理函数
 * @param factory
 * @returns {Function}
 */

var pipe = function(factory){
    return function*(info){
        return true;
    };
};

module.exports = pipe;