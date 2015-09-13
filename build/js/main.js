'use strict';

var scene = new Scene();
var craft = new Craft();
var fileManager = new FileManager('E:/Program Files/Steam/steamapps/common/Kerbal Space Program/GameData/Squad/');

function loadCraft() {
	craft.parse(process.cwd() + '/kerbal X.craft', function (err) {
		if (err) {
			console.log(err);
		} else {
			console.log('.craft loaded');
			craft.loadParts();
		}
	});
}

fileManager.findParts(function (err) {
	if (err) console.log(err);
	loadCraft();
});
// loadCraft();
//# sourceMappingURL=main.js.map
