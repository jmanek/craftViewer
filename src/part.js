const parts = require('./build/stockParts.json');

class Part {
	
	constructor(data, name) {

		this.name = name;

		this.pos = data.pos.split(',');
		this.pos = [for (v of this.pos) parseFloat(v)];

		this.rot = data.rot.split(',');
		this.rot = [for (v of this.rot) parseFloat(v)];
	}

	//Handles lhs => rhs
	//http://answers.unity3d.com/storage/temp/12048-lefthandedtorighthanded.pdf
	posVec(vec){
		vec = [for (v of vec) parseFloat(v)];
		const vec3 = new THREE.Vector3(vec[0], vec[1], vec[2]);
		// vec3.setZ(-1.0*vec3.z);
		return vec3
		// return new THREE.Vector3(vec[0], vec[1], vec[2]);
	}
	scaleVec(vec){
		return new THREE.Vector3(vec[0], vec[1], vec[2]);
	}
	rhsVec3(vec) {
		return new THREE.Vector3(vec[0], vec[1], -vec[2]);
	}
	rhsQuat(quat) {
		// return new THREE.Quaternion(quat[2], quat[3], quat[0], quat[1]);
		// return new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
		let rot = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
		rot = new THREE.Matrix4().makeRotationFromQuaternion(rot);
		rot.elements[2] = -1.0*rot.elements[2]
		rot.elements[6] = -1.0*rot.elements[6]
		rot.elements[8] = -1.0*rot.elements[8]
		rot.elements[9] = -1.0*rot.elements[9]
		return new THREE.Quaternion().setFromRotationMatrix(rot);
	}
	rotQuat(quat) {
		console.log('quat');
		console.log(quat);
		quat = [for (q of quat) parseFloat(q)];
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

	vec3(vec){
		// const v = new THREE.Vector3(vec[0], vec[1], vec[2]);
		// vec = [for (v of vec) parseFloat(v)];
		// const vec3 = new THREE.Vector3(-1.0*vec[0], vec[1], vec[2]);
		// vec3.setZ(-1.0*vec3.z);

		return new THREE.Vector3(vec[0], vec[1], vec[2]);
	}

	face3(f) {
		return new THREE.Face3(f[0], f[1], f[2])
	}



	createMeshObj(geometry, model) {
		let mesh
		if (!geometry) {
			mesh = new THREE.Object3D();
		}

	}



	createSubMesh(model, parent){
		let mesh;
		if (model.verts.length == 0 || model.collider) {
			mesh = new THREE.Object3D();
		} else {
			
			const geometry = new THREE.Geometry();
			for (let v of model.verts){
				geometry.vertices.push(this.vec3(v));
			}
			for (let f of model.faces){
				geometry.faces.push(this.face3(f))
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
		
		// console.log(mesh.position);
		// console.log(mesh.scale);

		parent.add(mesh)
		for (let child of model.children) {
			this.createSubMesh(child, mesh);
		}
	}

	createGeometry(model) {
		const geometry = new THREE.Geometry();
		for (let v of model.verts){
			geometry.vertices.push(this.vec3(v));
		}
		for (let f of model.faces){
			geometry.faces.push(this.face3(f));
		}
		return geometry;
	}

	createMaterial(model) {
		return new THREE.MeshPhongMaterial( { color: 0xdddddd, specular: 0x009900, shininess: 30, shading: THREE.FlatShading, side:THREE.BackSide} );
		// return new THREE.MeshPhongMaterial( {color:0xdddddd, side:THREE.DoubleSide} );
	}


	createMesh(model, parent, root=null){
		// let geo = createGeometry(model);
		// let mat = createMat(model);
		let mesh;
		if (model.verts.length == 0 || model.collider) {
			mesh = new THREE.Object3D();
		} else {
			const geometry = this.createGeometry(model);
			const material = this.createMaterial(model);
			mesh = new THREE.Mesh(geometry, material);
		}
		
		model.localScale = [for (rot of model.localScale) parseFloat(rot)];
		mesh.scale.set(model.localScale[0], model.localScale[1], model.localScale[2]);
		model.localRot = [for (rot of model.localRot) parseFloat(rot)];
		mesh.quaternion.set(model.localRot[0], model.localRot[1], model.localRot[2], model.localRot[3]);
		model.localPos = [for (rot of model.localPos) parseFloat(rot)];
		mesh.position.set(model.localPos[0], model.localPos[1], model.localPos[2]);

		parent.add(mesh);

		for (let child of model.children) {
			this.createMesh(child, mesh);
		}
		
		if (root) this.mesh = mesh;

		// mesh.rotation.x -= 90;
		// this.mesh.quaternion.multiply(this.rotQuat((this.rot)));
		// mesh.scale
	}


	load(parent, cb) {

		fileManager.loadPart(this.name, (err, mu, partInfo) => {
			if (err) {
				console.log(err);
				return cb(err);
			}
			this.createMesh(mu, parent, true);

			this.mesh.scale.set(partInfo.scale, partInfo.scale, partInfo.scale);
			// this.mesh.rotation.copy(this.rhsQuat(this.rot));
			this.mesh.position.copy(this.rhsVec3(this.pos));

			cb();
		});
	}
}


class CompoundPart extends Part {
	
	constructor(data, name) {

		super(data, name);
	}
}