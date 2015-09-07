var scene;
(function() {
	scene = new THREE.Scene();

	var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
	camera.position.z = 10;
	var controls = new THREE.OrbitControls( camera );
	controls.damping = 0.2;
	controls.addEventListener( 'change', render );

	var renderer = new THREE.WebGLRenderer({alpha: true});
	renderer.setClearColor( 0x000000, 0 ); 
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	
	var directionalLight = new THREE.DirectionalLight( 0xffffff, .5 );
	directionalLight.position.set( 0, 1, 0 );
	scene.add( directionalLight );
	directionalLight = new THREE.DirectionalLight( 0xffffff, .5 );
	directionalLight.position.set( 0, -1, 0 );
	scene.add( directionalLight );
	directionalLight = new THREE.DirectionalLight( 0xffffff, .2 );
	directionalLight.position.set( 1, 0, 0 );
	scene.add( directionalLight );
	directionalLight = new THREE.DirectionalLight( 0xffffff, .2 );
	directionalLight.position.set( -1, 0, 0 );
	scene.add( directionalLight );
	directionalLight = new THREE.DirectionalLight( 0xffffff, .2 );
	directionalLight.position.set( 0, 0, -1 );
	scene.add( directionalLight );
	directionalLight = new THREE.DirectionalLight( 0xffffff, .2 );
	directionalLight.position.set( 0, 0, 1 );
	scene.add( directionalLight );
	// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
	// var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	// var cube = new THREE.Mesh( geometry, material );
	// scene.add( cube );



	function onWindowResize(){

	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();

	    renderer.setSize( window.innerWidth, window.innerHeight );
	}
	window.addEventListener( 'resize', onWindowResize, false );

	var render = function () {
		requestAnimationFrame( render );

		// cube.rotation.x += 0.1;
		// cube.rotation.y += 0.1;

		renderer.render(scene, camera);
	};
	render();

})();
