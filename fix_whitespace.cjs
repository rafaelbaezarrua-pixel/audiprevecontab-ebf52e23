const fs = require('fs');
const path = require('path');

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
    const filePath = path.join(pagesDir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern created by me:
    // <div className="space-y-6 animate-fade-in relative pb-10">
    //   {/* Background decoration elements */}
    //   <div className="absolute -top-24 -right-24 ...
    
    // We want to move the absolute div to the end of the container to avoid space-y-6 margin on the header
    
    const divStart = '<div className="space-y-6 animate-fade-in relative pb-10">';
    const bgDivPattern = /\{?\/[*] Background decoration elements [*]\/\}?\s*<div\s+className=['"]absolute\s+-top-24[^>]+>\s*<\/div>/;

    if (content.includes(divStart)) {
        let match = content.match(bgDivPattern);
        if (match) {
            let bgDiv = match[0];
            // Remove it from current position (likely right after the start div)
            content = content.replace(bgDiv, '');
            
            // Find the last </div> before the end of the return statement or file
            // Usually the main wrapper ends with </div>\n  );\n};
            // This is tricky. Let's look for the matching closing tag.
            // Since we know the structure I created is predictable:
            
            let parts = content.split(divStart);
            if (parts.length > 1) {
                // The main content is in parts[1...].
                // We want to insert bgDiv just before the LAST </div> of the main structure.
                // Or easier: insert it right before the last closing div of the whole return block.
                
                let lastIdx = content.lastIndexOf('</div>');
                if (lastIdx > -1) {
                    content = content.substring(0, lastIdx) + '  ' + bgDiv + '\n    ' + content.substring(lastIdx);
                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log('Fixed spacing in', f);
                }
            }
        }
    }
});
