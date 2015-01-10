var http = require("http");
var url = require("url");
var msgpack = require('msgpack');
var zmq = require('zmq');
var uuid = require('node-uuid');
var assert = require('assert');

// load the config file
var arguments = process.argv.splice(2);
var config = {};
var config_file = arguments[0]; 
if (!config_file) {
    config = require('./config').config;
}
else {
    config = require('./'+config_file).config;
}

// assert basic configuration
assert.ok(config.send_spec, 'Missing send_spec in config file.');
assert.ok(config.recv_spec, 'Missing recv_spec in config file.');
assert.ok(config.addr, 'Missing addr in config file.');
assert.ok(config.port, 'Missing port in config file.');


var CONNS = {}
var CH_PUSH;
var CH_PULL;

var makeChannel = function () {
    console.log("===========================");
    console.log('config is:', config);
    console.log("===========================");
    var send_spec = config.send_spec;
    var recv_spec = config.recv_spec;
    CH_PUSH = zmq.socket('push');
    CH_PUSH.bind(send_spec);
    CH_PULL = zmq.socket('pull');
    CH_PULL.bind(recv_spec);
}
makeChannel ();

var makeUuid = function () {
    return uuid.v1();
}

var recordConn = function (response) {
    var uuid = makeUuid();
    CONNS[uuid] = response;

    return uuid;
}

var refreshResponse = function (uuid, response) {
    CONNS[uuid] = response;
}

var removeConn = function (key) {
    console.log('remove connection ', key);
    delete CONNS[key]; 
}


var wrap = function (res) {
    res.code = res.code || 200;
    res.status = res.status || "OK";
    res.headers = res.headers || {};
    res.headers['content-type'] = res.headers['content-type'] || 'text/plain';
    if (res.data) {
        res.headers['content-length'] = res.data.length;
    }
    else {
        delete res.headers['content-length'];
    }
    return res;
}

var pushRequest = function (conn_id, forward_req) {
    forward_req.meta.conn_id = conn_id; 
    CH_PUSH.send(msgpack.pack(forward_req));
}

var responseData = function (conn_id, data) {
    var response = CONNS[conn_id];
    if (response) {
        response.writeHead (data.code, data.headers);
        response.write(data.data);
        response.end();
    }
}

function retreiveBody(request, response, callback) {
    if (typeof callback !== 'function') return null;

    var queryData = [];
    request.on('data', function(data) {
        queryData.push(data);
        if (queryData.length > 1e6) {
            queryData = [];
            response.writeHead(413, {'Content-Type': 'text/plain'}).end();
            request.connection.destroy();
        }
    });

    request.on('end', function() {
        callback(queryData.join());
    });

}



function start() {
    function onRequest(request, response) {
        //console.log('new request...')
        var url_obj = url.parse(request.url);
        //console.log(url_obj);
        var headers = request.headers;
        //console.log(headers);
        var remote_ip = headers['x-forwarded-for'] || request.connection.remoteAddress;

        var forward_req = {
            headers: {},
            meta: {}
        };

        for (var key in headers) {
            forward_req.headers[key] = headers[key];
        }
        forward_req.headers['remote_ip'] = remote_ip;
        forward_req.url = request.url;
        forward_req.method = request.method;
        forward_req.version = request.httpVersion;
        forward_req.path = url_obj['pathname'];
        

        var processCallback = function (body) {
            if (body)
                forward_req.body = body;

            // custom event type, used to record the connection key
            if (request.connection.listeners('record').length == 0) {
                // first, record the connection 
                var conn_id = recordConn(response);
                pushRequest(conn_id, forward_req);

                // register a callback to return conn_id for next request on the same keep-alive connection
                request.connection.on('record', function () {
                    //console.log('--> call record callback');

                    return conn_id;
                });
            
                // nodejs default registered two callbacks arealdy on 'close' event
                request.connection.on('close', function () {
                    console.log('--> connection closed')
                    removeConn(conn_id);
                });

                // nodejs default registered one callback arealdy on 'timeout' event
                request.connection.on('timeout', function () {
                    console.log('--> connection timeout')
                    removeConn(conn_id);
                });

           }
            else {
                var conn_id = request.connection.listeners('record')[0](); 
                //console.log('conn key: ', conn_id);
                refreshResponse(conn_id, response);
                pushRequest(conn_id, forward_req);

            }
        

        };


        if (request.method == 'POST') {
            retreiveBody(request, response, processCallback);
        }
        else {
            processCallback(null);
        }

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

    setInterval(function () {
        console.log('Current CONNS length: ', Object.keys(CONNS).length);
    }, 5000);

    var server = http.createServer(onRequest)
    server.listen(config.port);
    server.on('clientError', function () {
        // we need to clear CONNS when client connection aborts.
        // how to do???
    });
}

exports.start = start;

