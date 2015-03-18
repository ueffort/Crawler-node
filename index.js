#!/usr/local/bin/node

/**
 * 全局控制器
 */

var program = require('commander');

/* 基本设置 */
program
    .version('1.0.0')

/* 启动实例 */
program
    .command('start <instance>')
    .description('start one instance')
    .option('-d, --daemon', 'run in backend')
    .action(function(instance, options){
        console.log('start '+instance);
//    }).on('--help',function(){
//        console.log('  Examples:');
//        console.log('');
//        console.log('    $ start proxy');
    });

/* 监控实例 */
program
    .command('status [instance]')
    .description('show status for instance running')
    .alias('monitor')
    .option('-s, --simple <simple>', "one variable status")
    .action(function(instance, options){
        console.log('status '+instance+':'+options.simple);
    });

program.parse(process.argv);
