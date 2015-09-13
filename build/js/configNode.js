'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var fs = require('fs');

var ConfigNode = (function () {
	function ConfigNode() {
		_classCallCheck(this, ConfigNode);
	}

	_createClass(ConfigNode, null, [{
		key: 'addNode',

		//Takes a node and turns it into a js object, recursively adding child nodes
		value: function addNode(data, i) {

			var line = undefined;
			var node = {};
			var brackets = 0;
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
						} else if (!data[i + 1]) {
							break;
							//Handle child nodes, next line is always an open bracket
						} else if (data[i + 1].indexOf('{') !== -1) {
								//.cfgs & .crafts don't require unique nodes
								if (node[line]) line += Math.random().toString(36).substring(7);

								var _addNode = this.addNode(data, i);

								var _addNode2 = _slicedToArray(_addNode, 2);

								node[line] = _addNode2[0];
								i = _addNode2[1];
							}
			}
			return [node, i];
		}
	}, {
		key: 'parse',
		value: function parse(path, cb) {
			var _this = this;

			fs.readFile(path, 'utf8', function (err, data) {
				if (err) cb(err);
				//Remove CR for windows, split by newline
				data = data.replace(/\r/g, '').split('\n');
				cb(err, _this.addNode(data, -1)[0]);
			});
		}
	}]);

	return ConfigNode;
})();
//# sourceMappingURL=configNode.js.map
