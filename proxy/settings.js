module.exports={
    downloader:{
        proxy: false
    },
    pipeline:{
        pipe: ['store']
    },
    scheduler:{
        loop: false//是否自动循环抓取
    },
    //抓取起始列表
    start_url: [
        ['http://proxy.com.ru', {type: 'index'}]
    ],
    //代理存储设置
    proxy_store:{
        redis: {
            host: '192.168.59.103',
            port: '6379'
        },
        key: 'crawler_proxy'
    }
};
