const glob = require('glob');
const path = require('path');

class FileManager {

	constructor(kerbalDir) {
		this.kerbalDir = kerbalDir;
	}

	findParts(cb) {
		this.parts = {};
		glob(this.kerbalDir + '**/*.cfg', (err, cfgs) => {
			if (err) cb(err);
			async.each(cfgs, (cfg, cb) => {
				ConfigNode.parse(cfg, (err, node) => {
					if (err) return cb(err);
					if (!node.PART) return cb();
					const part = {};
					part.model = path.join(path.dirname(cfg), node.PART.model || "model.mu");
					part.scale = parseFloat(node.PART.rescaleFactor || '1.25');
					this.parts[(node.PART.name || node.name).replace(/\./g, '_')] = part
					cb();
				});
			}, (err) => {
				console.log(this.parts);
				cb(err);
			});
		});
	}

	loadPart(part, cb){
		if (!this.parts || !this.parts[part]) return cb('cfg not found for: ' + part);
		part = this.parts[part]
		let options = {
				scriptPath: process.cwd(),
				args:[part.model]
		};
		
		PythonShell.run('muParser.py', options, (err, results) => { 
			cb(err, JSON.parse(results[0]), part); 
		});
	}
}