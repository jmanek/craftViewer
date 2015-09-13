'use strict';

class Scene {
	constructor() {
		this.scene = new THREE.Scene();
		this.setRenderer();
		this.setCamera();
		this.setLights();
		this.setListeners();
		this.start();
	}

	setRenderer() {
		this.renderer = new THREE.WebGLRenderer({ alpha: true });
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(this.renderer.domElement);
	}

	setCamera() {
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.z = 5;
		this.controls = new THREE.OrbitControls(this.camera);
		this.controls.damping = 0.2;
		this.controls.addEventListener('change', this.render);
	}

	setLights() {
		const scene = this.scene;
		let directionalLight = new THREE.DirectionalLight(0xffffff, .5);
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

	setListeners() {
		window.addEventListener('resize', () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		}, false);
	}

	start() {
		const [scene, camera, renderer] = [this.scene, this.camera, this.renderer];
		let render;
		this.render = render = function() {
			requestAnimationFrame(render);
			renderer.render(scene, camera);
		}
		render();
	}

	add(obj) {
		this.scene.add(obj);
	}

	setTarget(obj) {
		this.controls.target = obj;
		this.controls.update();
	}


	// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
	// var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	// var cube = new THREE.Mesh( geometry, material );
	// scene.add( cube );

}


		// cube.rotation.x += 0.1;
		// cube.rotation.y += 0.1;

//# sourceMappingURL=scene.js.map
