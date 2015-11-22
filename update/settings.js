module.exports={
    downloader:{
        proxy: true
    },
    pipeline:{
        pipe: [],
        path: 'common/pipe'//更改默认的管道实例路径，用于多个实例间共用pipe
    },
    spider:{
        path: 'common/spider'//更改默认的蜘蛛实例路径，用于多个实例间共用spider
    },
    scheduler:{
        loop: true//是否自动循环抓取
    }
};
