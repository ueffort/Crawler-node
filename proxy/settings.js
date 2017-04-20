module.exports={
    downloader:{
        proxy: true
    },
    pipeline:{
        pipe: ['store']
    },
    scheduler:{
        loop: false, //是否自动循环抓取
        frequency: false,//每分钟的下载频率限制，最高下载数限制
        retry: -1, //
    },
    //抓取起始列表
    start_url: [
      // {link: 'http://proxy.com.ru', meta: {type: 'index'}},
      {link: 'http://www.kuaidaili.com/free/inha/', meta: {type: 'index'}}
    ]
};
