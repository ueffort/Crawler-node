var winston = require('winston');

module.exports={
    'logger': {
        'level': 'silly'
        'transports':[
            new (winston.transports.Console)({level: 'silly'});
        ]
    },
    'redis': {
        'host': '127.0.0.1',
        'port': '6379'
    }
};
