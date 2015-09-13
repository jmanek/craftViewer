'use strict';

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var parts = require('./build/stockParts.json');

var Part = (function () {
	function Part(data, name) {
		var _this = this;

		_classCallCheck(this, Part);

		this.name = name;

		this.pos = data.pos.split(',');
		this.pos = (function () {
			var _pos = [];
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = _this.pos[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var v = _step.value;

					_pos.push(parseFloat(v));
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator['return']) {
						_iterator['return']();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			return _pos;
		})();

		this.rot = data.rot.split(',');
		this.rot = (function () {
			var _rot = [];
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = _this.rot[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var v = _step2.value;

					_rot.push(parseFloat(v));
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2['return']) {
						_iterator2['return']();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}

			return _rot;
		})();
	}

	//Handles lhs => rhs
	//http://answers.unity3d.com/storage/temp/12048-lefthandedtorighthanded.pdf

	_createClass(Part, [{
		key: 'posVec',
		value: function posVec(vec) {
			vec = (function () {
				var _vec = [];
				var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = vec[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var v = _step3.value;

						_vec.push(parseFloat(v));
					}
				} catch (err) {
					_didIteratorError3 = true;
					_iteratorError3 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion3 && _iterator3['return']) {
							_iterator3['return']();
						}
					} finally {
						if (_didIteratorError3) {
							throw _iteratorError3;
						}
					}
				}

				return _vec;
			})();
			var vec3 = new THREE.Vector3(vec[0], vec[1], vec[2]);
			// vec3.setZ(-1.0*vec3.z);
			return vec3;
			// return new THREE.Vector3(vec[0], vec[1], vec[2]);
		}
	}, {
		key: 'scaleVec',
		value: function scaleVec(vec) {
			return new THREE.Vector3(vec[0], vec[1], vec[2]);
		}
	}, {
		key: 'rhsVec3',
		value: function rhsVec3(vec) {
			return new THREE.Vector3(vec[0], vec[1], -vec[2]);
		}
	}, {
		key: 'rhsQuat',
		value: function rhsQuat(quat) {
			// return new THREE.Quaternion(quat[2], quat[3], quat[0], quat[1]);
			// return new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
			var rot = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
			rot = new THREE.Matrix4().makeRotationFromQuaternion(rot);
			rot.elements[2] = -1.0 * rot.elements[2];
			rot.elements[6] = -1.0 * rot.elements[6];
			rot.elements[8] = -1.0 * rot.elements[8];
			rot.elements[9] = -1.0 * rot.elements[9];
			return new THREE.Quaternion().setFromRotationMatrix(rot);
		}
	}, {
		key: 'rotQuat',
		value: function rotQuat(quat) {
			console.log('quat');
			console.log(quat);
			quat = (function () {
				var _quat = [];
				var _iteratorNormalCompletion4 = true;
				var _didIteratorError4 = false;
				var _iteratorError4 = undefined;

				try {
					for (var _iterator4 = quat[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
						var q = _step4.value;

						_quat.push(parseFloat(q));
					}
				} catch (err) {
					_didIteratorError4 = true;
					_iteratorError4 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion4 && _iterator4['return']) {
							_iterator4['return']();
						}
					} finally {
						if (_didIteratorError4) {
							throw _iteratorError4;
						}
					}
				}

				return _quat;
			})();
			console.log(quat);
			// quat = new THREE.Quaternion(quat[2], quat[3], quat[0], quat[1]);
			// console.log(quat);
			// return quat;
			// let q = new THREE.Quaternion(-1.0*quat[0], quat[1], quat[2], -1.0*quat[3]);
			// // var q = new THREE.Quaternion( -qx, qy, qz, -qw );

			// let v = new THREE.Euler(); 
			// v.setFromQuaternion( q );

			// v.y += Math.PI; // Y is 180 degrees off

			// v.z *= -1; // flip Z
			// return q.setFromEuler(v);
		}
	}, {
		key: 'vec3',
		value: function vec3(vec) {
			// const v = new THREE.Vector3(vec[0], vec[1], vec[2]);
			// vec = [for (v of vec) parseFloat(v)];
			// const vec3 = new THREE.Vector3(-1.0*vec[0], vec[1], vec[2]);
			// vec3.setZ(-1.0*vec3.z);

			return new THREE.Vector3(vec[0], vec[1], vec[2]);
		}
	}, {
		key: 'face3',
		value: function face3(f) {
			return new THREE.Face3(f[0], f[1], f[2]);
		}
	}, {
		key: 'createMeshObj',
		value: function createMeshObj(geometry, model) {
			var mesh = undefined;
			if (!geometry) {
				mesh = new THREE.Object3D();
			}
		}
	}, {
		key: 'createSubMesh',
		value: function createSubMesh(model, parent) {
			var mesh = undefined;
			if (model.verts.length == 0 || model.collider) {
				mesh = new THREE.Object3D();
			} else {

				var geometry = new THREE.Geometry();
				var _iteratorNormalCompletion5 = true;
				var _didIteratorError5 = false;
				var _iteratorError5 = undefined;

				try {
					for (var _iterator5 = model.verts[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
						var v = _step5.value;

						geometry.vertices.push(this.vec3(v));
					}
				} catch (err) {
					_didIteratorError5 = true;
					_iteratorError5 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion5 && _iterator5['return']) {
							_iterator5['return']();
						}
					} finally {
						if (_didIteratorError5) {
							throw _iteratorError5;
						}
					}
				}

				var _iteratorNormalCompletion6 = true;
				var _didIteratorError6 = false;
				var _iteratorError6 = undefined;

				try {
					for (var _iterator6 = model.faces[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
						var f = _step6.value;

						geometry.faces.push(this.face3(f));
					}
				} catch (err) {
					_didIteratorError6 = true;
					_iteratorError6 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion6 && _iterator6['return']) {
							_iterator6['return']();
						}
					} finally {
						if (_didIteratorError6) {
							throw _iteratorError6;
						}
					}
				}

				mesh = new THREE.Mesh(geometry);
			}

			model.localScale = (function () {
				var _model$localScale = [];
				var _iteratorNormalCompletion7 = true;
				var _didIteratorError7 = false;
				var _iteratorError7 = undefined;

				try {
					for (var _iterator7 = model.localScale[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
						var rot = _step7.value;

						_model$localScale.push(parseFloat(rot));
					}
				} catch (err) {
					_didIteratorError7 = true;
					_iteratorError7 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion7 && _iterator7['return']) {
							_iterator7['return']();
						}
					} finally {
						if (_didIteratorError7) {
							throw _iteratorError7;
						}
					}
				}

				return _model$localScale;
			})();
			mesh.scale.set(model.localScale[0], model.localScale[1], model.localScale[2]);
			// mesh.quaternion.set(this.rotQuat(model.localRot));
			// mesh.position.set(this.posVec(model.localPos));
			model.localRot = (function () {
				var _model$localRot = [];
				var _iteratorNormalCompletion8 = true;
				var _didIteratorError8 = false;
				var _iteratorError8 = undefined;

				try {
					for (var _iterator8 = model.localRot[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
						var rot = _step8.value;

						_model$localRot.push(parseFloat(rot));
					}
				} catch (err) {
					_didIteratorError8 = true;
					_iteratorError8 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion8 && _iterator8['return']) {
							_iterator8['return']();
						}
					} finally {
						if (_didIteratorError8) {
							throw _iteratorError8;
						}
					}
				}

				return _model$localRot;
			})();
			mesh.quaternion.set(model.localRot[0], model.localRot[1], model.localRot[2], model.localRot[3]);
			model.localPos = (function () {
				var _model$localPos = [];
				var _iteratorNormalCompletion9 = true;
				var _didIteratorError9 = false;
				var _iteratorError9 = undefined;

				try {
					for (var _iterator9 = model.localPos[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
						var rot = _step9.value;

						_model$localPos.push(parseFloat(rot));
					}
				} catch (err) {
					_didIteratorError9 = true;
					_iteratorError9 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion9 && _iterator9['return']) {
							_iterator9['return']();
						}
					} finally {
						if (_didIteratorError9) {
							throw _iteratorError9;
						}
					}
				}

				return _model$localPos;
			})();
			mesh.position.set(model.localPos[0], model.localPos[1], model.localPos[2]);

			// console.log(mesh.position);
			// console.log(mesh.scale);

			parent.add(mesh);
			var _iteratorNormalCompletion10 = true;
			var _didIteratorError10 = false;
			var _iteratorError10 = undefined;

			try {
				for (var _iterator10 = model.children[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
					var child = _step10.value;

					this.createSubMesh(child, mesh);
				}
			} catch (err) {
				_didIteratorError10 = true;
				_iteratorError10 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion10 && _iterator10['return']) {
						_iterator10['return']();
					}
				} finally {
					if (_didIteratorError10) {
						throw _iteratorError10;
					}
				}
			}
		}
	}, {
		key: 'createGeometry',
		value: function createGeometry(model) {
			var geometry = new THREE.Geometry();
			var _iteratorNormalCompletion11 = true;
			var _didIteratorError11 = false;
			var _iteratorError11 = undefined;

			try {
				for (var _iterator11 = model.verts[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
					var v = _step11.value;

					geometry.vertices.push(this.vec3(v));
				}
			} catch (err) {
				_didIteratorError11 = true;
				_iteratorError11 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion11 && _iterator11['return']) {
						_iterator11['return']();
					}
				} finally {
					if (_didIteratorError11) {
						throw _iteratorError11;
					}
				}
			}

			var _iteratorNormalCompletion12 = true;
			var _didIteratorError12 = false;
			var _iteratorError12 = undefined;

			try {
				for (var _iterator12 = model.faces[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
					var f = _step12.value;

					geometry.faces.push(this.face3(f));
				}
			} catch (err) {
				_didIteratorError12 = true;
				_iteratorError12 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion12 && _iterator12['return']) {
						_iterator12['return']();
					}
				} finally {
					if (_didIteratorError12) {
						throw _iteratorError12;
					}
				}
			}

			return geometry;
		}
	}, {
		key: 'createMaterial',
		value: function createMaterial(model) {
			return new THREE.MeshPhongMaterial({ color: 0xdddddd, specular: 0x009900, shininess: 30, shading: THREE.FlatShading, side: THREE.BackSide });
			// return new THREE.MeshPhongMaterial( {color:0xdddddd, side:THREE.DoubleSide} );
		}
	}, {
		key: 'createMesh',
		value: function createMesh(model, parent) {
			var root = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

			// let geo = createGeometry(model);
			// let mat = createMat(model);
			var mesh = undefined;
			if (model.verts.length == 0 || model.collider) {
				mesh = new THREE.Object3D();
			} else {
				var geometry = this.createGeometry(model);
				var material = this.createMaterial(model);
				mesh = new THREE.Mesh(geometry, material);
			}

			model.localScale = (function () {
				var _model$localScale2 = [];
				var _iteratorNormalCompletion13 = true;
				var _didIteratorError13 = false;
				var _iteratorError13 = undefined;

				try {
					for (var _iterator13 = model.localScale[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
						var rot = _step13.value;

						_model$localScale2.push(parseFloat(rot));
					}
				} catch (err) {
					_didIteratorError13 = true;
					_iteratorError13 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion13 && _iterator13['return']) {
							_iterator13['return']();
						}
					} finally {
						if (_didIteratorError13) {
							throw _iteratorError13;
						}
					}
				}

				return _model$localScale2;
			})();
			mesh.scale.set(model.localScale[0], model.localScale[1], model.localScale[2]);
			model.localRot = (function () {
				var _model$localRot2 = [];
				var _iteratorNormalCompletion14 = true;
				var _didIteratorError14 = false;
				var _iteratorError14 = undefined;

				try {
					for (var _iterator14 = model.localRot[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
						var rot = _step14.value;

						_model$localRot2.push(parseFloat(rot));
					}
				} catch (err) {
					_didIteratorError14 = true;
					_iteratorError14 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion14 && _iterator14['return']) {
							_iterator14['return']();
						}
					} finally {
						if (_didIteratorError14) {
							throw _iteratorError14;
						}
					}
				}

				return _model$localRot2;
			})();
			mesh.quaternion.set(model.localRot[0], model.localRot[1], model.localRot[2], model.localRot[3]);
			model.localPos = (function () {
				var _model$localPos2 = [];
				var _iteratorNormalCompletion15 = true;
				var _didIteratorError15 = false;
				var _iteratorError15 = undefined;

				try {
					for (var _iterator15 = model.localPos[Symbol.iterator](), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
						var rot = _step15.value;

						_model$localPos2.push(parseFloat(rot));
					}
				} catch (err) {
					_didIteratorError15 = true;
					_iteratorError15 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion15 && _iterator15['return']) {
							_iterator15['return']();
						}
					} finally {
						if (_didIteratorError15) {
							throw _iteratorError15;
						}
					}
				}

				return _model$localPos2;
			})();
			mesh.position.set(model.localPos[0], model.localPos[1], model.localPos[2]);

			parent.add(mesh);

			var _iteratorNormalCompletion16 = true;
			var _didIteratorError16 = false;
			var _iteratorError16 = undefined;

			try {
				for (var _iterator16 = model.children[Symbol.iterator](), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
					var child = _step16.value;

					this.createMesh(child, mesh);
				}
			} catch (err) {
				_didIteratorError16 = true;
				_iteratorError16 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion16 && _iterator16['return']) {
						_iterator16['return']();
					}
				} finally {
					if (_didIteratorError16) {
						throw _iteratorError16;
					}
				}
			}

			if (root) this.mesh = mesh;

			// mesh.rotation.x -= 90;
			// this.mesh.quaternion.multiply(this.rotQuat((this.rot)));
			// mesh.scale
		}
	}, {
		key: 'load',
		value: function load(parent, cb) {
			var _this2 = this;

			fileManager.loadPart(this.name, function (err, mu, partInfo) {
				if (err) {
					console.log(err);
					return cb(err);
				}
				_this2.createMesh(mu, parent, true);

				_this2.mesh.scale.set(partInfo.scale, partInfo.scale, partInfo.scale);
				// this.mesh.rotation.copy(this.rhsQuat(this.rot));
				_this2.mesh.position.copy(_this2.rhsVec3(_this2.pos));

				cb();
			});
		}
	}]);

	return Part;
})();

var CompoundPart = (function (_Part) {
	_inherits(CompoundPart, _Part);

	function CompoundPart(data, name) {
		_classCallCheck(this, CompoundPart);

		_get(Object.getPrototypeOf(CompoundPart.prototype), 'constructor', this).call(this, data, name);
	}

	return CompoundPart;
})(Part);
//# sourceMappingURL=part.js.map
