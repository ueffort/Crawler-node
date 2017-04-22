module.exports={
    logger: {
        console: {
            level: 'silly',
            colorize: true
        }
    },
    redis: {
        host: '180.76.132.5',
        port: '6379',
        option: {
            auth_pass: 'TVHFRY7u53'
        }
    },
    proxy: {
        redis: {
            host: '180.76.132.5',
            port: '6379',
            option: {
                auth_pass: 'TVHFRY7u53'
            }
        },
        key: 'crawler_proxy',
        waring_num: 15,//代理告警限制，还剩多少代理后发出警报
        download_times: 10//每个代理下载几次重新获取新代理，避免被封
    },
    scheduler: {
        parallel: 4,//同时开启多少个下载work
        frequency: 10,//每分钟的下载频率限制，最高下载数限制
        retry: 1 // 失败重试次数
    },
    downloader: {
        timeout: 10//下载超时时间
    }
};
