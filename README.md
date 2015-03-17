#buys-crawler

# 目录说明
* crawler:爬虫核心
    * tools:工具类
    * spider:基本爬虫实例
    * pip:基本管道实例
    * queue:基本队列实例
    * core.js:启动器，用户控制每个实例
    * downloader.js:下载器
    * scheduler.js:核心调度器
    * spider_factory.js:蜘蛛工厂，调度蜘蛛
    * pip_factory.js:管道工厂，调度管道
* ext:实例处理所需的扩展类，工具类
* monitor:web监控服务
* proxy:一个特殊实例，用于抓取代理ip供爬虫使用（实例模版）
    * spider:根据网站写不同的蜘蛛
    * pip:存储管道
    * queue.js:每个实例需要一个定制供scheduler用于队列处理和初始化分片队列
    * setting.js:每个实例的配置文件


