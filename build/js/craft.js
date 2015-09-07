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
var EOL = require('os').EOL;

var Craft = (function () {
	function Craft() {
		_classCallCheck(this, Craft);
	}
	// this.craft;

	// //Takes in a .craft file and populates craft with with part/val entries
	// //Need to rewrite .craft parser in js

	_createClass(Craft, [{
		key: 'parse',
		value: function parse(craftPath, cb) {
			var _this = this;

			var options = {
				scriptPath: process.cwd(),
				args: [craftPath]
			};
			PythonShell.run('craftToJSON.py', options, function (err, results) {
				console.log(results.join('\n'));
				var craft = JSON.parse(results.join('\n'));
				console.log(craft);
				if (err) {
					cb(err);
				} else {
					// const craft = JSON.parse(results.join('\n'));
					_this.info = craft.VESSEL;
					_this.parts = _.omit(craft, 'VESSEL');
					cb(false);
				}
			});
		}
	}, {
		key: 'loadParts',
		value: function loadParts() {
			var _this2 = this;

			//Create Part objects
			for (var part in this.parts) {
				var _name = this.parts[part].part.split('_').shift();
				console.log(_name);
				if (_.contains(['strutConnector, fuelLine, launchClamp1'], _name)) {
					this.parts[part] = new Part(this.parts[part], _name);
					// this.parts[part] = new CompoundPart(this.parts[part], name);
				} else {
						this.parts[part] = new Part(this.parts[part], _name);
					}
			}
			this.mesh = new THREE.Object3D();
			this.mesh.position.set(this.parts.PART1.pos[0], this.parts.PART1.pos[1], this.parts.PART1.pos[2]);
			scene.add(this.mesh);
			//Load mesh for each part

			var _loop = function (part) {
				_this2.parts[part].load(_this2.mesh, function (err) {
					if (err) {
						console.log('Error loading part');
						console.log(err);
					}
					if (part === 'PART1') {
						_this2.mesh.position.set(0, 0, 0);
					}
				});
			};

			for (var part in this.parts) {
				_loop(part);
			}
		}
	}]);

	return Craft;
})();
//# sourceMappingURL=craft.js.map
