const config = require('../config.json');

//* sends a packet, less bulky
function send({ meta, data }, sender) {
	if (!config.bad_packets.includes(meta.name)) {
		sender.write(meta.name, data);
	}
}
