/**
 * Created by gaojie on 15/4/22.
 */
module.exports={
    downloader:{
        proxy: false
    },
    pipeline:{
        pipe: ['dict']
    },
    scheduler:{
        loop: false//是否自动循环抓取
    },
    //抓取起始列表
    start_url: [
        ['http://pinyin.sogou.com/dict/', {type: 'index'}]
    ]
};
