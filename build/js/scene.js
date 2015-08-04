'use strict';

var scene;
(function () {
	scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	var controls = new THREE.OrbitControls(camera);
	controls.damping = 0.2;
	controls.addEventListener('change', render);
	var renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
	// var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	// var cube = new THREE.Mesh( geometry, material );
	// scene.add( cube );

	camera.position.z = 10;

	var render = function render() {
		requestAnimationFrame(render);

		// cube.rotation.x += 0.1;
		// cube.rotation.y += 0.1;

		renderer.render(scene, camera);
	};

	render();
})();
//# sourceMappingURL=scene.js.map
