const fs = require('fs');
const path = require('path');
const targetClasses = 'space-y-6 animate-fade-in relative pb-10';
const files = fs.readdirSync('src/pages').filter(f => f.endsWith('.tsx'));
const results = [];
files.forEach(f => {
  const content = fs.readFileSync(path.join('src/pages', f), 'utf8');
  let rIndex = content.lastIndexOf('return (');
  if (rIndex > -1) {
    let sub = content.substring(rIndex, rIndex + 200);
    let divMatch = sub.match(/<div\s+className=['"`]([^'"`]+)['"`]/);
    if (divMatch) {
      const cls = divMatch[1];
      const isOk = cls === targetClasses;
      console.log(f.padEnd(35) + ' | ' + cls.padEnd(65) + ' | ' + (isOk ? 'OK' : 'DIFF'));
    }
  }
});
