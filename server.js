var http = require("http");
var url = require("url");
var msgpack = require('msgpack');
var zmq = require('zmq');
var uuid = require('node-uuid');

var config = require('./config');


var CONNS = {}
var CH_PUSH;
var CH_PULL;

var bindZmq = function () {
    var send_spec = config.send_spec;
    var recv_spec = config.recv_spec;
    CH_PUSH = zmq.socket('push');
    CH_PUSH.bind(send_spec);
    CH_PULL = zmq.socket('pull');
    CH_PULL.bind(recv_spec);
}
bindZmq();

var makeUuid = function () {
    return uuid.v1();
}

var recordConn = function (request, response) {
    var uuid = makeUuid();
    CONNS[uuid] = [request, response];

    return uuid;
}

var removeConn = function (key) {
    delete CONNS[key]; 
}


var wrap = function (res) {
    res.code = res.code || 200;
    res.status = res.status || "OK";
    res.headers = res.headers || {};
    res.headers['content-type'] = res.headers['content-type'] || 'text/plain';
    res.headers['content-length'] = res.headers['content-length'] || body.length;
}

var pushRequest = function (forward_req, request, response) {
    CH_PULL.send(msgpack.pack(forward_req));
}

var responseData = function (conn_id, data) {
    var conn_obj = CONNS[conn_id];
    if (conn_obj) {
        var response = conn_obj[1];
        
        response.writeHead (data.code, data.headers);
        response.write(data.data);
        response.end();
    }
}

function start() {
    function onRequest(request, response) {
        console.log("Request received.");
        var url_obj = url.parse(request.url);
        //console.log(url_obj);
        var headers = request.headers;
        //console.log(headers);
        var remote_ip = headers['x-forwarded-for'] || request.connection.remoteAddress;

        var forward_req = {
            headers = {},
            meta = {}
        };

        for (var key in headers) {
            forward_req.headers[key] = headers[key];
        }
        forward_req.headers['path'] = forward_req.headers['pathname'];
        forward_req.version = request.httpVersion;
        forward_req.method = request.method;
        var conn_id = recordConn(request, response);
        forward_req.meta.conn_id = conn_id; 

        response.on('close', function () {
            removeConn(conn_id);
        });


        pushRequest(forward_req);

    }

    // listen to the returned zmq pull channel
    CH_PULL.on('message', function(msg) {
        var res;
        try{
            res = msgpack.unpack(msg);
        } catch(e) {
            res = {};
        }       
        
        if (res.meta) {
            res = wrap(res);
            // we can respond many connections one time
            if (res.meta.conns && res.meta.conns.length > 0) {
                for (var i in res.conns) {
                    var conn_id = res.conns[i];
                    responseData(conn_id, res);
                }
            }
            else {
                var conn_id = res.meta.conn_id;
                responseData(conn_id, res);
            }
        }
    });     


    var server = http.createServer(onRequest)
    server.listen(config.port);
    server.on('clientError', function () {
        // we need to clear CONNS when client connection aborts.
        // how to do???
    });
    console.log("Server has started.");
}

exports.start = start;

