'use strict';

var craft = new Craft();
function loadCraft() {
	craft.parse(process.cwd() + '/kerbalx.craft', function (err) {
		if (err) {
			console.log(err);
		} else {
			console.log('.craft loaded');
			craft.loadParts();
		}
	});
}
loadCraft();
// craft.parse('E:\\projects\\CraftViewer\\Kerbal X.craft');
//# sourceMappingURL=main.js.map
