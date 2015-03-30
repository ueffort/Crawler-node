/**
 * http://www.proxy.com.ru
 * Created by gaojie on 15/3/22.
 */

var spider = function(factory){
    return {
        download: function(link, meta){
            return {
                timeout: -1//超时设置为空
            };
        },
        index: function(link , meta, $){
            $('tr').each(function(i, tr){
                var td_list = $('td', tr);
                if(td_list.length == 5 && parseInt($(td_list[2]).text()) > 0){
                    var info = {
                        host: $(td_list[1]).text(),
                        port: $(td_list[2]).text()
                    };
                    factory.emit('pipe', link, info);
                }else if(td_list.length == 1){
                    $('a', td_list[0]).each(function(i, a){
                        var href = $(a).attr('href');
                        if(/list/.test(href))
                            factory.emit('link', factory.absoluteLink(link, href), {type: 'list'});
                    });
                }
            });
        },
        list: function(link, meta, $){
            $('tr').each(function(i, tr){
                var td_list = $('td', tr);
                if(td_list.length == 5 && parseInt($(td_list[2]).text()) > 0){
                    var info = {
                        host: $(td_list[1]).text(),
                        port: $(td_list[2]).text()
                    };
                    factory.emit('pipe', link, info);
                }
            });
        }
    }
};

module.exports = spider;
