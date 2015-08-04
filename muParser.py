from mu import Mu
import json
import jsonpickle
import sys 

class MuJS:

    def createObject(self, muObj):
        self.getTransform(muObj.transform)
        self.getMesh(muObj)
        self.getChildren(muObj.children)

    def getMesh(self, muobj):
        mumesh = None
        # if hasattr(muobj, "collider") and hasattr(muobj, 'shared_mesh'):
            # print 'Has Collider and shared_mesh'
            # return None
        self.verts = []
        self.uvs = []
        self.faces = []
        if hasattr(muobj, 'shared_mesh'):
            mumesh = muobj.shared_mesh
        elif hasattr(muobj, 'skinned_mesh_renderer'):
            mumesh = muobj.skinned_mesh_renderer
        if mumesh is not None:
            if hasattr(mumesh, 'submeshes'):
                for submesh in mumesh.submeshes:
                    for face in submesh:
                        self.faces.append((face[0], face[1], face[2]))
                self.verts = mumesh.verts
                self.uvs = mumesh.uvs

    def getTransform(self, tr):
        if 'collider' in tr.name.lower() or 'proxy' in tr.name.lower() or 'col' in tr.name.lower():
            self.collider = True
        self.name = tr.name
        self.localPos = tr.localPosition
        self.localRot = tr.localRotation
        self.localScale = tr.localScale

    def getChildren(self, children):
        self.children = []
        for child in children:
            self.children.append(MuJS(child, self))
            
    def getJSON(self):
        return jsonpickle.encode(self, unpicklable=False)

    def __init__(self, muObj, parent=None):
        self.createObject(muObj)

    
    
   

def readJSON(filepath):
    mu = Mu()
    if not mu.read(filepath):
        print 'File not found'
        # print filepath

    js = MuJS(mu.obj)
    print js.getJSON()
    with open('test.json', 'w+') as jsf:
        json.dump(json.loads(js.getJSON()), jsf, indent=4)

if __name__ == '__main__':
    readJSON(str(sys.argv[1]))