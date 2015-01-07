lgsever-node

功能需求
========
1. daemon 后台运行(forever);
2. msgpack 库引入，作为与bamboo的传输内容协议；
3. zmq 库监听；
4. tcp socket 监听；
5. 读取配置；
6. 记录全局的 conn 对象，在返回的时候找到对应的，发回去；
7. 解析url和headers，读取body;
8. 日志记录;
9. 监控;
10. 命令行参数（传入不同的配置文件）;



依赖
====
1. zmq;
2. msgpack;
3. node-uuid;


问题
====
TODO：
1. 连接断开时的事件响应，清理CONNS表；


用法
====
```
    node index.js
```
