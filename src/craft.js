// function parseCraft(craft, cb){
// 	let PythonShell = require('python-shell');
// 	let options = {
// 			scriptPath: 'E:\\projects\\CraftViewer\\',
// 			args:[craft]
// 		};
// 	PythonShell.run('craftToJSON.py', options, function(err, results){
// 		if (err) {
// 			console.log(err);
// 			cb(err);
// 		} else {
// 		console.log(results);
// 		 cb(null, JSON.parse(results.join('\n')));
// 		}
// 	});
// }

const PythonShell = require('python-shell');
const _ = require('underscore');
class Craft {

	
	constructor() {
		// this.craft;

	}


	// //Takes in a .craft file and populates craft with with part/val entries
	// //Need to rewrite .craft parser in js
	parse(craftPath, cb){
		let options = {
				scriptPath: 'E:\\projects\\CraftViewer\\',
				args:[craftPath]
		};
		PythonShell.run('craftToJSON.py', options, (err, results) => {
			if (err) {
				cb(err);
			} else {
				const craft = JSON.parse(results.join('\n'));
				this.info = craft.VESSEL;
				this.parts = _.omit(craft, 'VESSEL');
				cb(false);
			}
		});
	}

	loadParts(){

		//Create Part objects
		for(let part in this.parts){
			const name = this.parts[part].part.split('_').shift();
			console.log(name);
			if (_.contains(['strutConnector, fuelLine, launchClamp1'], name)) {
				this.parts[part] = new Part(this.parts[part], name);
				// this.parts[part] = new CompoundPart(this.parts[part], name);
			} else {
				this.parts[part] = new Part(this.parts[part], name);
			}
		}
		this.mesh = new THREE.Object3D();
		this.mesh.position.set( this.parts.PART1.pos[0], this.parts.PART1.pos[1], this.parts.PART1.pos[2] );
		scene.add(this.mesh);
		//Load mesh for each part
		for(let part in this.parts){
			this.parts[part].load(this.mesh, (err) => {
				if (err) {
					console.log('Error loading part');
					console.log(err);
				}
			});
		}
		this.mesh.position.y -= 30;

	}

}

