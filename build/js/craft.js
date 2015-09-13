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

'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var PythonShell = require('python-shell');
var _ = require('underscore');
var async = require('async');

var Craft = (function () {
	function Craft() {
		_classCallCheck(this, Craft);
	}
	// this.craft;

	// //Takes in a .craft file and populates craft with with part/val entries

	_createClass(Craft, [{
		key: 'parse',
		value: function parse(craftPath, cb) {
			var _this = this;

			ConfigNode.parse(craftPath, function (err, node) {
				if (err) cb(err);
				_this.parts = node;
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
	}, {
		key: 'center',
		value: function center() {
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
			var box = new THREE.Box3().setFromObject(this.mesh);
			scene.setTarget(box.center());
		}
	}, {
		key: 'loadParts',
		value: function loadParts() {
			var _this2 = this;

			//Create Part objects
			for (var part in this.parts) {
				if (part.indexOf('PART') === -1) continue;
				var _name = this.parts[part].part.split('_').shift().replace(/\./g, '_');
				console.log(_name);
				if (_.contains(['strutConnector, fuelLine, launchClamp1'], _name)) {
					this.parts[part] = new Part(this.parts[part], _name);
					// this.parts[part] = new CompoundPart(this.parts[part], name);
				} else {
						this.parts[part] = new Part(this.parts[part], _name);
					}
			}
			this.mesh = new THREE.Object3D();
			scene.add(this.mesh);
			//Load mesh for each part
			async.forEachOf(this.parts, function (part, partName, cb) {
				if (partName.indexOf('PART') === -1) return cb();
				part.load(_this2.mesh, function (err) {
					if (err) {
						console.log('Error loading part');
						console.log(partName);
						console.log(part);
					}
					cb(err);
				});
			}, function (err) {
				if (err) console.log(err);
				_this2.center();
			});
		}
	}]);

	return Craft;
})();
//# sourceMappingURL=craft.js.map
