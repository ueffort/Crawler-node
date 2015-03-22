module.exports={
    'logger': {
        console: {
            level: 'silly',
            colorize: true
        }
    },
    'redis': {
        'host': '127.0.0.1',
        'port': '6379'
    },
    'proxy': {
        'redis': {
            'host': '127.0.0.1',
            'port': '6379',
            'key': 'proxy'
        },
        'waring_num': 15,//代理告警限制，还剩多少代理后发出警报
        'fail_times': 5//每个代理允许失败的次数
    },
    'scheduler': {
        'parallel': 4
    }
};
