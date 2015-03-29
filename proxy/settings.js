module.exports={
    downloader:{
        proxy: false
    },
    pipeline:{
        pipe: ['url_format']
    },
    scheduler:{
        loop: false//是否自动循环抓取
    },
    start_url: [
        ['http://proxy.com.ru', {type: 'index'}]
    ]
};
