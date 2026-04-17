const fs = require('fs');
const path = require('path');
const targetClasses = 'space-y-6 animate-fade-in relative pb-10';
const files = fs.readdirSync('src/pages').filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  const content = fs.readFileSync(path.join('src/pages', f), 'utf8');
  const match = content.match(/return\s*\([\s\S]{0,100}?<div\s+className=|"([^|"]+)|"/);
  // doing simpler
  let rIndex = content.lastIndexOf('return (');
  if (rIndex > -1) {
    let sub = content.substring(rIndex, rIndex + 200);
    let classMatch = sub.match(/className=|"([^|"]+)|"/);
    if (classMatch) {
      const cls = classMatch[1];
      const isOk = cls === targetClasses;
      console.log(f.padEnd(30) + ' | ' + cls.padEnd(50) + ' | ' + (isOk ? 'OK' : 'DIFF'));
    }
  }
});

