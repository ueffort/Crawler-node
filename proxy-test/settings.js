/**
 * Created by gaojie on 2017/4/19.
 */
module.exports={
  logger: {
    console: {
      level: 'info',
      colorize: true
    }
  },
  downloader:{
    proxy: false
  },
  pipeline:{
    pipe: ['store']
  },
  scheduler:{
    loop: true,
    parallel: 5,//同时开启多少个下载work
    frequency: false,//每分钟的下载频率限制，最高下载数限制
    retry: 1 // 失败重试次数
  },
  //抓取起始列表
  start_url: [
    {link: 'http://www.sina.com/favicon.ico', meta: {type: 'ico'}}
  ]
};
