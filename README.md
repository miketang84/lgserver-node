**lgsever-node**

功能需求
========
1. daemon 后台运行(forever);
2. msgpack 库引入，作为与bamboo的传输内容协议；
3. zmq 库监听；
4. tcp socket 监听；
5. 读取配置；
6. 记录全局的 conn 对象，在返回的时候找到对应的，发回去；
7. 解析url和headers;
8. 日志记录;
9. 监控;
10. 命令行参数（传入不同的配置文件）;
11. 读取body，处理文件上传;
12. 清理CONNS表，防止内存泄漏；

简化之处
========
1. 不提供静态文件服务能力；
2. 简化配置，不提供多routes功能；
3. 不向handler发送disconnect事件；


依赖
====
1. zmq;
2. msgpack;
3. node-uuid;


问题
====
TODO：


用法
====
```
    node index.js
```

性能
====
```
mike@mike-T410s:~/GIT/wrk$ Running 30s test @ http://127.0.0.1:8888/123/eee?fff=22
  1 threads and 40 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    14.11ms    1.38ms  35.17ms   87.30%
    Req/Sec     2.87k   330.59     3.40k    60.20%
  84941 requests in 30.00s, 13.69MB read
Requests/sec:   2831.39
Transfer/sec:    467.29KB
```
