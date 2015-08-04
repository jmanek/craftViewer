'use strict';

var craft = new Craft();
craft.parse('E:\\projects\\CraftViewer\\test.craft', function (err) {
	if (err) {
		console.log(err);
	} else {
		console.log('.craft loaded');
		craft.loadParts();
	}
});
// craft.parse('E:\\projects\\CraftViewer\\Kerbal X.craft');
//# sourceMappingURL=main.js.map
