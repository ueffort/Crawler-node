module.exports={
    downloader:{
        proxy: false
    },
    pipeline:{
        pipe: ['store']
    },
    scheduler:{
        loop: false, //是否自动循环抓取
        retry: -1, //
    },
    //抓取起始列表
    start_url: [
      // {link: 'http://proxy.com.ru', meta: {type: 'index'}},
      {link: 'http://www.kuaidaili.com/free/inha/', meta: {type: 'index'}}
    ]
};
