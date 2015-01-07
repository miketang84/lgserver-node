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
8. 日志记录
