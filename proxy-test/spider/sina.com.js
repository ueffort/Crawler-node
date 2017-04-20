/**
 * Created by gaojie on 2017/4/17.
 */

var spider = function(factory){
  var self = this;

  return {
    download: function*(link, meta){
      factory.emit('link', link, Object.assign({}, meta));
      return {
        timeout: 2,//超时设置为空
        proxy: meta.proxy,
        format: 'binary'
      };
    },
    ico: function*(link, meta, image, response){
      factory.emit('pipe', link, {proxy: meta.proxy, duration: meta.duration});
    }
  }
};

module.exports = spider;
