//* imports
const mc = require('minecraft-protocol');
const config = require('./config.json');
const { username, password } = require('./secret.json');
const { ini, input, login } = require('./src/logic');
const log = require('./src/log');

process.setMaxListeners(0);
require('events').EventEmitter.defaultMaxListeners = 0;

client = mc.createClient(config.clientOptions);
ini(client);
client.on('packet', (data, meta) => input({ data, meta }));

proxyserver = mc.createServer(config.serverOptions);

proxyserver.on('login', (newProxyClient) => login(newProxyClient));
