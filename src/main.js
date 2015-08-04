
var craft = new Craft();
craft.parse('E:\\projects\\CraftViewer\\test.craft', (err) => {
	if (err) {
		console.log(err);
	} else {
		console.log('.craft loaded');
		craft.loadParts();

	}
	
});
// craft.parse('E:\\projects\\CraftViewer\\Kerbal X.craft');	