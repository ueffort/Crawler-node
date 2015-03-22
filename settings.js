//var winston = require('winston');

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
            'hash_key': 'proxy'
        }
    },
    'scheduler': {
        'parallel': 4
    }
};
