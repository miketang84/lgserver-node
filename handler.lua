
--require 'daemon'
--daemon.daemonize('nochdir,nostdfds,noumask0')

dofile('settings.lua')

print('handler start.')
print('pull_in_addr', pull_in_addr)
print('push_out_addr', push_out_addr)

local cmsgpack = require 'cmsgpack'
local zmq = require'bamboo.lib.zmqev'
local ev = require'ev'
local loop = ev.Loop.default
local ctx = zmq.init(loop, 1)

require 'lglib'

local push_channel = ctx:push()
push_channel:connect(push_out_addr)

-- define response handler
local function pull_handler(sock, data)
--	print(push_out_addr, data)
    
    local msg = cmsgpack.unpack(data)
--    fptable(msg)
    

	-- 这里，我们就做一个简单的转发而已, data里面是什么都不用知道
	push_channel:send(data)

end

local pull_channel = ctx:pull(pull_handler)
pull_channel:connect(pull_in_addr)

loop:loop()

print('== Aborted! ==')
