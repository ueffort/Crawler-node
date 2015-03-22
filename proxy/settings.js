module.exports={
    downloader:{
        proxy: false
    },
    pipeline:{
        pipe: []
    },
    scheduler:{
        loop: false//是否自动循环抓取
    },
    start_url: [
        ['proxy.com.ru', {type: 'index'}]
    ]
};
