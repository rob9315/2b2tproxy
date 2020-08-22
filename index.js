const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const config = require('./config.json');
const { version } = require('os');

proxyServer = mc.createServer(config.serverOptions);
let client;
let newProxyClient;

proxyServer.on('login', (nPC) => {
	newProxyClient = nPC;
	newProxyClient.on('end', () => {
		newProxyClient = undefined;
	});
});

proxyServer.on('login', (data) => {
	if (!client) {
		var { verifyToken, username, version } = data;
		client = mineflayer.createBot({
			accessToken: verifyToken,
			username: username,
			version: version,
			host: config.host,
			port: config.port,
		});
		client._client.on('packet', (data, meta) =>
			send({ data, meta }, newProxyClient)
		);

		client.on('spawn', function () {
			console.log(client.world.getColumns());
		});
	} else {
		send({
			meta: { name: 'login' },
			data: {
				difficulty: client.game.difficulty,
				dimension: client.game.dimension,
				entityId: client.entity.id,
			},
		});
	}
});

function send({ data, meta }, sender, ignoreFilter = false) {
	if (
		sender &&
		(ignoreFilter || (meta && !config.badPackets.includes(meta.name)))
	) {
		sender.write(meta.name, data);
	}
}
