#!/usr/local/bin/node

/**
 * 命令行解析器
 */

var program = require('commander');
var crawler = require('./crawler/core.js');

function daemon(){
    var new_arg_array = [];
    for(var i=1;i<process.argv.length;i++){
        var arg = process.argv[i];
        if(arg !='-d' && arg !='daemon') new_argv.push(process.argv[i]);
    }
    var d = require('child_process').spawn(process.argv[0], new_arg_array,{
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
    });
    d.unref();
    d.on('error',function(code,signal){
        d.kill(signal);
        d = require('child_process').spawn(process.argv[0], new_arg_array)
    });
    d.on('exit', function(code){});
}

/* 基本设置 */
program
    .version('1.0.0');

/* 启动实例 */
program
    .command('start <instance>')
    .description('start one instance')
    .option('-d, --daemon', 'run in backend')
    .action(function(instance, options){
        if(options.d){
            return daemon();
        }
        crawler(instance).start(options);
//    }).on('--help',function(){
//        console.log('  Examples:');
//        console.log('');
//        console.log('    $ start proxy');
    });

/* 停止实例 */
program
    .command('stop <instance>')
    .description('stop one instance')
    .action(function(instance, options){
        crawler(instance).stop(options);
    });

/* 监控实例 */
program
    .command('status <instance>')
    .description('show status for instance running')
    .option('-p, --process <simple>', "one process status")
    .option('-l, --list', "show instance running process")
    .action(function(instance, options){
        crawler(instance).status(options);
    });

/* web统计实例 */
program
    .command('monitor')
    .description('open web console to status crawler')
    .option('-d, --daemon', 'run in backend')
    .action(function(options){
        if(options.d){
            return daemon();
        }
        require('./monitor').master();
    });

/* 启动代理端口，用于转发实例命令 */
program
    .command('translate')
    .description('translate instance on this host')
    .option('-d, --daemon', 'run in backend')
    .action(function(options){
        if(options.d){
            return daemon();
        }
        require('./monitor').slave();
    });

program
    .command('*')
    .action(function(options){
        program.help();
    });

program.parse(process.argv);

//如果没有任何参数则直接输出帮助
if(process.argv.length <= 2){
    program.help();
}