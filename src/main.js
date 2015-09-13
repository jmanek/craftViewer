const scene = new Scene();
const craft = new Craft();
const fileManager = new FileManager('E:/Program Files/Steam/steamapps/common/Kerbal Space Program/GameData/Squad/');

function loadCraft() {
	craft.parse(process.cwd() + '/kerbal X.craft', (err) => {
		if (err) {
			console.log(err);
		} else {
			console.log('.craft loaded');
			craft.loadParts();

		}
		
	});
}


fileManager.findParts((err) => {
	if (err) console.log(err);
	loadCraft();
});
// loadCraft();
