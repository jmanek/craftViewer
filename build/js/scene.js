'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Scene = (function () {
	function Scene() {
		_classCallCheck(this, Scene);

		this.scene = new THREE.Scene();
		this.setRenderer();
		this.setCamera();
		this.setLights();
		this.setListeners();
		this.start();
	}

	// cube.rotation.x += 0.1;
	// cube.rotation.y += 0.1;

	//# sourceMappingURL=scene.js.map

	_createClass(Scene, [{
		key: 'setRenderer',
		value: function setRenderer() {
			this.renderer = new THREE.WebGLRenderer({ alpha: true });
			this.renderer.setClearColor(0x000000, 0);
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			document.body.appendChild(this.renderer.domElement);
		}
	}, {
		key: 'setCamera',
		value: function setCamera() {
			this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
			this.camera.position.z = 5;
			this.controls = new THREE.OrbitControls(this.camera);
			this.controls.damping = 0.2;
			this.controls.addEventListener('change', this.render);
		}
	}, {
		key: 'setLights',
		value: function setLights() {
			var scene = this.scene;
			var directionalLight = new THREE.DirectionalLight(0xffffff, .5);
			directionalLight.position.set(0, 1, 0);
			scene.add(directionalLight);
			directionalLight = new THREE.DirectionalLight(0xffffff, .5);
			directionalLight.position.set(0, -1, 0);
			scene.add(directionalLight);
			directionalLight = new THREE.DirectionalLight(0xffffff, .2);
			directionalLight.position.set(1, 0, 0);
			scene.add(directionalLight);
			directionalLight = new THREE.DirectionalLight(0xffffff, .2);
			directionalLight.position.set(-1, 0, 0);
			scene.add(directionalLight);
			directionalLight = new THREE.DirectionalLight(0xffffff, .2);
			directionalLight.position.set(0, 0, -1);
			scene.add(directionalLight);
			directionalLight = new THREE.DirectionalLight(0xffffff, .2);
			directionalLight.position.set(0, 0, 1);
			scene.add(directionalLight);
		}
	}, {
		key: 'setListeners',
		value: function setListeners() {
			var _this = this;

			window.addEventListener('resize', function () {
				_this.camera.aspect = window.innerWidth / window.innerHeight;
				_this.camera.updateProjectionMatrix();
				_this.renderer.setSize(window.innerWidth, window.innerHeight);
			}, false);
		}
	}, {
		key: 'start',
		value: function start() {
			var scene = this.scene;
			var camera = this.camera;
			var renderer = this.renderer;

			var render = undefined;
			this.render = render = function () {
				requestAnimationFrame(render);
				renderer.render(scene, camera);
			};
			render();
		}
	}, {
		key: 'add',
		value: function add(obj) {
			this.scene.add(obj);
		}
	}, {
		key: 'setTarget',
		value: function setTarget(obj) {
			this.controls.target = obj;
			this.controls.update();
		}

		// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		// var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		// var cube = new THREE.Mesh( geometry, material );
		// scene.add( cube );

	}]);

	return Scene;
})();
//# sourceMappingURL=scene.js.map
