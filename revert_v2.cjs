const fs = require('fs');
const path = require('path');
const targetClasses = 'space-y-6 animate-fade-in relative pb-10';

const lines = fs.readFileSync('diagnostic.txt', 'utf8').split('\n');
lines.forEach(line => {
    if (line.startsWith('|') && line.includes('Diferente')) {
        let parts = line.split('|');
        if (parts.length >= 3) {
            let p = parts[1].trim();
            if (p) {
                let file = path.join('src/pages', p + 'Page.tsx');
                let atual = parts[2].trim();
                
                if (atual && atual !== 'NOT FOUND' && atual !== 'NO MATCH') {
                    if (fs.existsSync(file)) {
                        let content = fs.readFileSync(file, 'utf8');
                        let rIndex = content.lastIndexOf('return (');
                        if (rIndex === -1) rIndex = content.lastIndexOf('return(');
                        if (rIndex > -1) {
                            let before = content.substring(0, rIndex);
                            let after = content.substring(rIndex);
                            // reverted
                            after = after.replace('<div className="' + targetClasses + '"', '<div className="' + atual + '"');
                            fs.writeFileSync(file, before + after, 'utf8');
                            console.log('REVERTIDO: ' + p);
                        }
                    }
                }
            }
        }
    }
});
