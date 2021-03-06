#buys-crawler
==============================
# 架构说明
* 启动器：
    * 根据不同的instance启动任务
    * 统计实例的状态（通过在redis设定instance状态）
    * 保持该instance的相关配置及服务池，作为每个instance的核心控制器
    * 处理进程通信
* 下载器：
    * 通过代理，js等设置获取页面
    * 设定传递的headers，cookie
    * 对页面进行编码处理，解码压缩页面
    * 根据http协议处理对应的页面情况
    * 返回一个类jquery对象给蜘蛛分析页面
* 蜘蛛工厂：
    * 获取完整的页面信息
    * 通过链接所属的`网站`及`标签`找寻对应的蜘蛛处理
    * 将分析好的数据发送：
        * 链接：链接所属的网站及标签给调度器
        * 垂直爬虫信息：爬虫信息的类型给管道工厂
* 管道：
    * 垂直爬虫信息：依次传入每个handler
* 调度器：
    * 根据配置信息，启动下载器
    * 获取队列头，将链接（网站，标签信息）传递到下载器
    * 对管道传入的链接信息进行入队操作
    * 每次队列为空执行时间分片的初始化操作
    * 将以上事件传递到队列实例处理
        * 写入队列
        * 获取队列头
        * 初始化队列
* 实例：
    * 蜘蛛：根据网站及标签
    * 管道：根据信息类型
    * 队列：每个实例一个
* 存储：全局用redis作为存储：队列，实例状态，链接爬虫记录
    

# 目录说明
* crawler:爬虫核心
    * tools:工具类
    * spider:基本爬虫实例
    * pip:基本管道实例
    * queue:基本队列实例
    * core.js:启动器，用户控制每个实例
    * downloader.js:下载器
    * scheduler.js:核心调度器
    * spider.js:蜘蛛工厂，调度蜘蛛
    * pipeline.js:管道
* ext:实例处理所需的扩展类，工具类
* monitor:web监控服务
* proxy:一个特殊实例，用于抓取代理ip供爬虫使用（实例模版）
    * spider:根据网站写不同的蜘蛛
    * pip:存储管道
    * queue.js:每个实例需要一个定制供scheduler用于队列处理和初始化分片队列
    * setting.js:每个实例的配置文件

# 配置说明：
1. 配置一共分为3层:
    * 全局实例配置，settings.js
    * 实例配置，$instance/settings.js
    * 蜘蛛的下载配置，每个蜘蛛可以根据当前抓取链接动态传递配置信息，$instance/spider/spider.js
      ```
      download: function(url, meta){
            return {};
      }
      ```
2. 实例配置会覆盖全局实例配置
3. 全局配置，实例配置：
    * 全局配置节点：`scheduler`,`downloader`,`proxy`,`logger`,`redis`：`redis`和实例无关
    * 蜘蛛下载配置，同`downloader`节点
    * 配置项在不同对象内部default_settings
    * 实例配置特殊项：`start_url`,`pipeline`,`spider`

