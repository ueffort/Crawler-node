/**
 * Created by gaojie on 2017/4/17.
 */

var spider = function(factory){
  return {
    download: function*(link, meta){
      return {
        timeout: 2,//超时设置为空
        // format: meta.type=='list'?'txt':'jquery'
      };
    },
    index: function*(link , meta, $){
      $('tr', $('#list')).each(function(i, tr){
        var ip = $('[data-title="IP"]', tr);
        var port = $('[data-title="PORT"]', tr);
        if(ip && port){
          var info = {
            host: ip.text(),
            port: port.text()
          };
          factory.emit('pipe', link, info);
        }
      });
      var last = $('ul li a:last', $('#list')).attr('href');
      var last_num = last.match(/\d+/g);
      for(var i=2;i<=last_num;i++){
        factory.emit('link', factory.absoluteLink(link, last.replace(last_num.toString(), i.toString())), {type: 'list'});
      }

    },
    list: function*(link, meta, $){
      $('tr', $('#list')).each(function(i, tr){
        var ip = $('[data-title="IP"]', tr);
        var port = $('[data-title="PORT"]', tr);
        if(ip && port){
          var info = {
            host: ip.text(),
            port: port.text()
          };
          factory.emit('pipe', link, info);
        }
      });
    }
  }
};

module.exports = spider;
