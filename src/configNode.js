const fs = require('fs');

class ConfigNode {

	//Takes a node and turns it into a js object, recursively adding child nodes
	static addNode(data, i) {

		let line;
		let node = {};
		let brackets = 0;
		while (true) {
			i += 1;
			line = data[i];
			if (!line && line !== '') break;
			line = line.trim();
			if (line.indexOf('//') !== -1) {
				continue;
			//Properties are key = value
			} else if (line.indexOf('=') !== -1) {
				line = line.split('=');
				node[line[0].trim()] = line[1].trim();	
			} else if (line.indexOf('{') !== -1) {
				brackets += 1;
			//Could probably just check for this and not count brackets?
			} else if (line.indexOf('}') !== -1) {
				brackets -= 1;
				if (brackets === 0) break;
			} else if (!data[i+1]) {
				break;
			//Handle child nodes, next line is always an open bracket
			} else if (data[i+1].indexOf('{') !== -1) {
				//.cfgs & .crafts don't require unique nodes
				if (node[line]) line += Math.random().toString(36).substring(7);
				[node[line], i] = this.addNode(data, i);
			}
		}
		return [node, i];		
	}

	static parse(path, cb) {
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) cb(err);
			//Remove CR for windows, split by newline
			data = data.replace(/\r/g, '').split('\n');
			cb(err, this.addNode(data, -1)[0]);
		});
	}
} 