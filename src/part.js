const parts = require('./build/stockParts.json');

class Part {
	
	constructor(data, name) {

		this.name = name;

		this.pos = data.pos.split(',');

		this.rot = data.rot.split(',');
	}

	//Handles lhs => rhs
	//http://answers.unity3d.com/storage/temp/12048-lefthandedtorighthanded.pdf
	posVec(vec){
		vec = [for (v of vec) parseFloat(v)];
		const vec3 = new THREE.Vector3(vec[0], vec[1], vec[2]);
		vec3.setZ(-1.0*vec3.z);
		return vec3
		// return new THREE.Vector3(vec[0], vec[1], vec[2]);
	}
	scaleVec(vec){
		return new THREE.Vector3(vec[0], vec[1], vec[2]);
	}
	rotQuat(quat) {
		console.log('quat');
		console.log(quat);
		quat = [for (q of quat) parseFloat(q)];
		console.log(quat);
		let rot = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
		rot = new THREE.Matrix4().makeRotationFromQuaternion(rot);
		rot.elements[2] = -1.0*rot.elements[2]
		rot.elements[6] = -1.0*rot.elements[6]
		rot.elements[8] = -1.0*rot.elements[8]
		rot.elements[9] = -1.0*rot.elements[9]
		return new THREE.Quaternion().setFromRotationMatrix(rot);
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

	threeVec(vec){
		// const v = THREE.Vector3(vec[0], vec[1], vec[2]);
		vec = [for (v of vec) parseFloat(v)];
		const vec3 = new THREE.Vector3(-1.0*vec[0], vec[1], vec[2]);
		// vec3.setZ(-1.0*vec3.z);
		return vec3
	}


	createSubMesh(model, parent){
		let mesh;
		if (model.verts.length == 0) {
			mesh = new THREE.Object3D();
		} else {
			
			const geometry = new THREE.Geometry();
			for (let v of model.verts){
				geometry.vertices.push(this.threeVec(v));
			}
			for (let f of model.faces){
				geometry.faces.push( new THREE.Face3(f[0], f[1], f[2]))
			}
			mesh = new THREE.Mesh(geometry);
		}

		parent.add(mesh)
		
		model.localScale = [for (rot of model.localScale) parseFloat(rot)];
		mesh.scale.set(model.localScale[0], model.localScale[1], model.localScale[2]);
		// mesh.quaternion.set(this.rotQuat(model.localRot));
		// mesh.position.set(this.posVec(model.localPos));
		model.localRot = [for (rot of model.localRot) parseFloat(rot)];
		mesh.quaternion.set(model.localRot[0], model.localRot[1], model.localRot[2], model.localRot[3]);
		model.localPos = [for (rot of model.localPos) parseFloat(rot)];
		mesh.position.set(model.localPos[0], model.localPos[1], model.localPos[2]);
		
		// console.log(mesh.position);
		// console.log(mesh.scale);

		for (let child of model.children) {
			this.createSubMesh(child, mesh);
		}
	}

	createMesh(model, parent){
		if (model.collider) { return; }
		let mesh;
		if (model.verts.length == 0) {
			mesh = new THREE.Object3D();
		} else {
			const geometry = new THREE.Geometry();
			for (let v of model.verts){
				geometry.vertices.push(this.threeVec(v));
			}
			for (let f of model.faces){
				geometry.faces.push( new THREE.Face3(f[0], f[1], f[2]))
			}
			mesh = new THREE.Mesh(geometry);
		}
		
		model.localScale = [for (rot of model.localScale) parseFloat(rot)];
		mesh.scale.set(model.localScale[0], model.localScale[1], model.localScale[2]);
		// mesh.quaternion.set(this.rotQuat(model.localRot));
		// mesh.position.set(this.posVec(model.localPos));
		model.localRot = [for (rot of model.localRot) parseFloat(rot)];
		mesh.quaternion.set(model.localRot[0], model.localRot[1], model.localRot[2], model.localRot[3]);
		model.localPos = [for (rot of model.localPos) parseFloat(rot)];
		mesh.position.set(model.localPos[0], model.localPos[1], model.localPos[2]);


		this.mesh = mesh;
		parent.add(this.mesh);

		for (let child of model.children) {
			this.createSubMesh(child, this.mesh);
		}
		
		// mesh.rotation.x -= 90;
		this.mesh.quaternion.multiply(this.rotQuat((this.rot)));
		// mesh.scale
		this.mesh.position.copy(this.posVec(this.pos));
	}


	load(parent, cb) {
		let muPath = 'E:\\Program Files\\Steam\\steamapps\\common\\Kerbal Space Program' + parts[this.name]; 
		let options = {
				scriptPath: 'E:\\projects\\CraftViewer\\',
				args:[muPath]
		};
		PythonShell.run('muParser.py', options, (err, results) => {
			// console.log(err);
			// console.log(results);
			if (err) {
				console.log('ee');
				cb(err);
			} else {
				// console.log(JSON.parse(results[0]));
				this.createMesh(JSON.parse(results[0]), parent);
				// this.info = craft.VESSEL;
				// this.parts = _.omit(craft, 'VESSEL');
				cb(false);
			}
		});
	}
}


class CompoundPart extends Part {
	
	constructor(data, name) {

		super(data, name);
	}
}