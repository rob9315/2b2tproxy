module.exports = { ini, input, login };

//* import
const config = require('../config.json');
const Chunk = require('prismarine-chunk')(config.version);
const World = require('prismarine-world');
const Vec3 = require('vec3');
const log = require('./log');
const { saveChunk } = require('./functions');

//* storage variables
var world = World();
var client;

function ini(c) {
	client = c;
}

function input(packet) {
	relay(packet);
	var { data, meta } = packet;
	switch (meta.name) {
		case 'login':
			saveData(data);
			setDimension();
			break;
		case 'map_chunk':
			saveChunk(data);
			break;
		case 'unload_chunk':
			unloadChunk(data);
			break;
		case 'block_change':
			blockChange(data);
			break;
		case 'game_state_change':
			saveData(packet, 'reason');
			break;
		case 'respawn':
			saveData(packet);
			setDimension();
			break;
		case 'update_time':
			savePacket();
		default:
			if (!config.bad_packets.includes(meta.name)) {
				saveData(data);
			}
	}
	break;
}

function login(newProxyClient) {
	statusReport(newProxyClient);
	newProxyClient.on('packet', (data, meta) => send({ data, meta }, client));
	proxyClient = newProxyClient;
	newProxyClient.on('end', () => {
		proxyClient = undefined;
	});
}

function saveChunk(data) {
	var { x, z, bitMap, chunkData, groundUp } = data;
	var chunk = new Chunk();
	chunk.load(chunkData, bitMap, this.dimension, groundUp);
	world.setColumn(x, z, chunk);
}

function unloadChunk(data) {
	world.unloadColumn(data.x, data.z);
}

function blockChange(data) {
	world.setBlockStateId(data.location, data.type);
}

function saveData(data, excludedData = {}) {
	for (const property in data) {
		if (data.hasOwnProperty(property) && !excludedData.includes(property)) {
			client[property] = data[property];
		}
	}
}

function setDimension() {
	client.dimension = {
		'-1': 'minecraft:nether',
		0: 'minecraft:overworld',
		1: 'minecraft:the_end',
	}[client.dimension];
}

function send({ data, meta }, sender) {
	if (!config.bad_packets.includes(meta.name)) {
		sender.write(meta.name, data);
	}
}

function statusReport(newProxyClient) {
	buildSendIt(newProxyClient);
	sendChunks(newProxyClient);
}

function sendChunks(newProxyClient) {
	columnArray = world.getColumns();
	for (const x in columnArray) {
		if (columnArray.hasOwnProperty(x)) {
			const arr = columnArray[x];
			for (const z in arr) {
				if (arr.hasOwnProperty(z)) {
					const chunk = arr[z];
					if (chunk) {
						send(buildChunkPacket({ x, z, chunk }), newProxyClient);
					}
				}
			}
		}
	}
}

function buildSendIt(nPC) {
	send(
		{
			data: {
				difficulty: client.difficulty,
				dimension: client.dimension,
				entityId: client.entityId,
				gameMode: client.gameMode,
				levelType: client.levelType,
				maxPlayers: client.maxPlayers,
				reducedDebugInfo: client.reducedDebugInfo,
			},
			meta: { name: 'login' },
		},
		nPC
	);
	send(
		{
			data: {
				flags: client.flags,
				flyingSpeed: client.flyingSpeed,
				walkingSpeed: client.walkingSpeed,
			},
			meta: { name: 'abilities' },
		},
		nPC
	);
	send({ data: { slot: client.slot }, meta: { name: 'held_item_slot' } }, nPC);
	send(
		{
			data: {
				flags: client.flags,
				pitch: client.pitch,
				teleportId: client.teleportId,
				x: client.x,
				y: client.y,
				yaw: client.yaw,
				z: client.z,
			},
			meta: { name: 'position' },
		},
		nPC
	);
	send({ data: client.worldBorder, meta: { name: 'world_border' } }, nPC);
	send({ data: client.updateTime, meta: { name: 'update_time' } }, nPC);
	send({ data: client.advancements, meta: { name: 'advancements' } }, nPC);
}

function buildChunkPacket({ x, z, chunk }) {
	var meta = { name: 'map_chunk' };
	var data = {
		x: x,
		z: z,
		groundUp: true,
		bitMap: chunk.getMask(),
		chunkData: chunk.dump(),
		blockEntities: [],
	};
	return { data, meta };
}

function savePacket({ data, meta }) {
	var toadd = true;
	client.packets.forEach((packet, index) => {
		if (packet.meta.name == meta.name) {
			client.packets[index] = { data, meta };
			toadd = false;
		}
	});
	if (toadd) {
		client.packets.push({ data, meta });
	}
}
