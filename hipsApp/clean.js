const fs = require('fs');
const path = require('path');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  if (filePath.endsWith('layout.tsx')) return;

  // Solo quitamos la prop 'active' de <AppNav>
  content = content.replace(/<AppNav\s+active=[\"'][^\"']+[\"']\s*\/>/g, '<AppNav />');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

const files = findFiles(path.join(__dirname), /\.tsx$/);
files.forEach(processFile);
console.log('Cleanup complete.');
