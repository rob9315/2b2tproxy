const mineflayer = require('mineflayer')
const mc = require('minecraft-protocol')
const config = require('./config');

connections = []

proxyServer = mc.createServer({
    "version": config.version,
    "online-mode": config.server.online_mode,
    "host": config.server.host,
    "port": config.server.port,
    "encryption": true
})

proxyServer.on('login', (data) => {
    var { verifyToken, username, version, uuid } = data;
    if (!connections[uuid]) {
        connections[uuid] = {};
    }
    if (!connections[uuid].proxyClient) {
        connections[uuid].proxyClient = data
    }
    if (!connections[uuid].bot) {
        connections[uuid].bot = mineflayer.createBot({
            accessToken: verifyToken,
            username: username,
            version: version,
            host: config.client.host,
            port: config.client.port,
        });
    } else {
        var { bot, proxyClient } = connections[uuid]
        send({
            meta: { name: 'login' },
            data: {
                difficulty: bot.game.difficulty,
                dimension: bot.game.dimension,
                entityId: bot.entity.id,
                gameMode: bot.game.gameMode,
                levelType: bot.game.levelType,
                maxPlayers: bot.game.maxPlayers,
                reducedDebugInfo: true,
            }
        },
            proxyClient,
        );
        // send({
        //     meta: { name: 'success' },
        //     data: {
        //         uuid: uuid,
        //         username: username
        //     },
        //     proxyClient
        // })
        send({
            meta: { name: 'spawn_entity' },
            data: {
                entityId: bot.entity.id,
                objectUUID: uuid,
                type: 'player',
                x: bot.entity.position.x,
                y: bot.entity.position.y,
                z: bot.entity.position.z,
                pitch: bot.entity.pitch,
                yaw: bot.entity.yaw,
                objectData: bot.entity.metadata,
                velocityX: 0,
                velocityY: 0,
                velocityZ: 0
            },
        }, proxyClient)
        send(
            { meta: { name: 'held_item_slot' }, data: { slot: bot.quickBarSlot } },
            proxyClient
        );
        send(
            {
                meta: { name: 'position' },
                data: {
                    //flags: bot._client.flags,
                    pitch: bot.entity.pitch,
                    teleportId: bot.entity.id,
                    x: bot.entity.position.x,
                    y: bot.entity.position.y,
                    yaw: bot.entity.yaw,
                    z: bot.entity.position.z,
                },
            },
            proxyClient
        );
        sendChunks(connections[uuid])
    }
    connections[uuid].proxyClient.on('packet', (data, meta) => send({ data, meta }, connections[uuid].bot._client))
    connections[uuid].bot._client.on('packet', (data, meta) => use({ data, meta }, connections[uuid]))
})

function send(
    { data, meta }, sender, ignoreFilter = false
) {
    if (!ignoreFilter, !config.blacklist.includes(meta.name)) {
        sender.write(meta.name, data)
    }
}

function use({ data, meta }, connection) {
    send({ data, meta }, connection.proxyClient)
}

function sendChunks(connection) {
    var columnArray = connection.bot.world.getColumns();
    for (const x in columnArray) {
        if (columnArray.hasOwnProperty(x)) {
            const chunk = columnArray[x];
            if (chunk) {
                var { column, chunkX, chunkZ } = chunk
                send(buildChunkPacket({ chunkX, chunkZ, column }), connection.proxyClient);
            }

        }
    }
}

function buildChunkPacket({ chunkX, chunkZ, column }) {
    var meta = { name: 'map_chunk' };
    console.log(column);
    var data = {
        x: chunkX,
        z: chunkZ,
        groundUp: true,
        bitMap: column.getMask(),
        chunkData: column.dump(),
        blockEntities: [],
    };
    return { data, meta };
}