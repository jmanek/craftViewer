'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var glob = require('glob');
var path = require('path');

var FileManager = (function () {
	function FileManager(kerbalDir) {
		_classCallCheck(this, FileManager);

		this.kerbalDir = kerbalDir;
	}

	_createClass(FileManager, [{
		key: 'findParts',
		value: function findParts(cb) {
			var _this = this;

			this.parts = {};
			glob(this.kerbalDir + '**/*.cfg', function (err, cfgs) {
				if (err) cb(err);
				async.each(cfgs, function (cfg, cb) {
					ConfigNode.parse(cfg, function (err, node) {
						if (err) return cb(err);
						if (!node.PART) return cb();
						var part = {};
						part.model = path.join(path.dirname(cfg), node.PART.model || "model.mu");
						part.scale = parseFloat(node.PART.rescaleFactor || '1.25');
						_this.parts[(node.PART.name || node.name).replace(/\./g, '_')] = part;
						cb();
					});
				}, function (err) {
					console.log(_this.parts);
					cb(err);
				});
			});
		}
	}, {
		key: 'loadPart',
		value: function loadPart(part, cb) {
			if (!this.parts || !this.parts[part]) return cb('cfg not found for: ' + part);
			part = this.parts[part];
			var options = {
				scriptPath: process.cwd(),
				args: [part.model]
			};

			PythonShell.run('muParser.py', options, function (err, results) {
				cb(err, JSON.parse(results[0]), part);
			});
		}
	}]);

	return FileManager;
})();
//# sourceMappingURL=fileManager.js.map
