import json
import re
import StringIO
import sys
def convertCraft(craftFile):
	with open(craftFile) as craft:
		craftOut = StringIO.StringIO('')
		craftOut.write(checkNL('{\n'))
		craftOut.write(checkNL('\"VESSEL\":\n'))
		craftOut.write(checkNL('{\n'))

		notPart = True
		partcount = 1
		nextLine = craft.readline()
		while 1:
			line = nextLine
			nextLine = craft.readline()
			if not nextLine:
				craftOut.write(checkNL(line))
				craftOut.write(checkNL('}\n'))
				craftOut.seek(0)
				print(craftOut.read())
				return

			
			if notPart:
				line = re.sub('(\s)*=(\s)*', ': ', line)
				if 'PART' in nextLine:
					craftOut.write(checkNL(makeString(line)))
					craftOut.write(checkNL('},\n'))
					notPart = False
				else:
					craftOut.write(checkNL(makeString(line)).replace('\n', ',\n'))
			else:
				if 'PART' in line and 'PARTDATA' not in line:
					craftOut.write(checkNL(makeKeyString(line.replace('\n', str(partcount) + ':\n'))))
					partcount += 1
					moduleCount = 1
				elif '=' not in line and '{' not in line and '}' not in line:
					if 'MODULE' in line:
						craftOut.write(checkNL(makeKeyString(line.replace('\n', str(moduleCount) + ':\n'))))
						moduleCount += 1
					else:
						craftOut.write(checkNL(makeKeyString(line.replace('\n', ':\n'))))
				elif '{' in line:
					craftOut.write(checkNL(line))
				elif '}' in line:
					if '}' in nextLine:
						craftOut.write(checkNL(line))
					else:
						craftOut.write(checkNL(line.replace('\n', ',\n')))
				else:
					line = re.sub('(\s)*=', ': ', line)
					if '}' in nextLine:
						craftOut.write(checkNL(makeString(line)))
					else:
						craftOut.write(checkNL(makeString(line)).replace('\n', ',\n'))
def checkNL(line):
	return line if '\n' in line else line + '\n'

def makeString(line):

	field = re.search(':(.*)', line).group(0)
	


	field = re.sub(':(\s)*', '', field)
	field = '\"' + field + '\"'
	key = re.search('.*:', line).group(0).replace(':', '').replace(' ', '').replace('\t', '')
	key = '\"' + key + '\":'
	for i in range (0, line.count('\t')):
		key = '\t' + key
		
	return key+field
def makeKeyString(line):

	key = re.search('.*:', line).group(0).replace(':', '').replace(' ', '').replace('\t', '')
	key = '\"' + key + '\":'
	for i in range (0, line.count('\t')):
		key = '\t' + key

	return key

if __name__ == '__main__':
	# print sys.argv[0]
	convertCraft(str(sys.argv[1]))
#convertCraft('C:\Users\\Jesse\\Google Drive\\models\\Kerbal Space Program\\Orders\\54f15a79aa70c5e8be2d32f7.craft')