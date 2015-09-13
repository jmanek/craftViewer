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
const async = require('async');
class Craft {

	
	constructor() {
		// this.craft;

	}


	// //Takes in a .craft file and populates craft with with part/val entries
	parse(craftPath, cb){
		ConfigNode.parse(craftPath, (err, node) => {
			if (err) cb (err);
			this.parts = node;
			cb();
		});
		// let options = {
		// 		scriptPath: process.cwd(),
		// 		args:[craftPath]
		// };
		// PythonShell.run('craftToJSON.py', options, (err, results) => {
			// console.log(results.join('\n'));
				// const craft = JSON.parse(results.join('\n'));
				// console.log(craft);
			// if (err) {
			// 	cb(err);
			// } else {
			// 	// const craft = JSON.parse(results.join('\n'));
			// 	// this.info = craft.VESSEL;
			// 	cb(false);
			// }
	}

	center() {
		// let box;
		// this.mesh.traverse(function(obj){
		// 	var geometry = obj.geometry;
		// 	if (!geometry) return;
		// 	geometry.computeBoundingBox();
		// 	const objBox = geometry.boundingBox.clone();
		// 	objBox.applyMatrix4(obj.matrixWorld);
		// 	if (box) {
		// 		console.log(objBox.center());
		// 		box = box.union(objBox);
		// 		console.log(box.center());
		// 	} else {
		// 		console.log('nobox');
		// 		box = objBox;
		// 	}
		// });
		// console.log(box.center());
		// console.log(box.center());
		// this.mesh.position.sub(box.center());
		const box = new THREE.Box3().setFromObject(this.mesh);
		scene.setTarget(box.center());
	}

	loadParts(){

		//Create Part objects
		for(let part in this.parts){
			if (part.indexOf('PART') === -1) continue;
			const name = this.parts[part].part.split('_').shift().replace(/\./g, '_');
			console.log(name);
			if (_.contains(['strutConnector, fuelLine, launchClamp1'], name)) {
				this.parts[part] = new Part(this.parts[part], name);
				// this.parts[part] = new CompoundPart(this.parts[part], name);
			} else {
				this.parts[part] = new Part(this.parts[part], name);
			}
		}
		this.mesh = new THREE.Object3D();
		scene.add(this.mesh);
		//Load mesh for each part
		async.forEachOf(this.parts, (part, partName, cb) => {
			if (partName.indexOf('PART') === -1) return cb();
			part.load(this.mesh, (err) => { 
				if (err) {
					console.log('Error loading part');
					console.log(partName);
					console.log(part)
				}
				cb(err)
			}); 
		}, (err) => {
			if (err) console.log(err)
			this.center();
		});
	}

}

