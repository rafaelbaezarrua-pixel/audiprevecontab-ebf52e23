const fs = require('fs');
const path = 'c:/AUDIPREVE CONTABILIDADE/audiprevecontab-112f76a5/src/pages/GestorAlertasPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// The problematic block looks like multiple closing divs followed by )}
// We need to find the specific pattern of 'else' block closing
// If we have an extra </div>, we remove it.

// Let's look for the pattern around line 440-455
// and remove one </div> from the end of the templates section.

const searchPattern = /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>/;
const correctReplacement = '</div>\n                   </div>\n                </div>\n             </div>\n           )}\n         </div>';

if (searchPattern.test(content)) {
    console.log("Pattern found, applying fix...");
    content = content.replace(searchPattern, correctReplacement);
    fs.writeFileSync(path, content);
} else {
    console.log("Pattern not found exactly. Trying more flexible approach.");
    // Let's find the 'card-premium p-6' block inside the else part
    // and ensure it has the correct number of closing divs.
    
    // Actually, let's just use a simpler marker.
    const splitKey = 'Salvar Template da Equipe"}';
    const parts = content.split(splitKey);
    if (parts.length > 1) {
        let suffix = parts[1];
        // After "Salvar Template da Equipe"}", we expect:
        // </button>
        // </div> (flex)
        // </div> (space-y-4)
        // </div> (card-premium)
        // </div> (space-y-6 - else container)
        // )}
        // </div> (lg:col-span-2)
        
        // My current broken file has one extra.
        // Let's rebuild the suffix.
        const newSuffix = `\n                          </button>\n                       </div>\n                    </div>\n                 </div>\n              </div>\n           )} \n        </div>`;
        
        // Find the next </div> sidebar section to not delete too much
        const sidebarMarker = '{/* Sidebar Direita: Categorias Nativas */}';
        const restOfFile = suffix.split(sidebarMarker);
        
        if (restOfFile.length > 1) {
             content = parts[0] + splitKey + newSuffix + '\n\n        ' + sidebarMarker + restOfFile[1];
             fs.writeFileSync(path, content);
             console.log("Fix applied via split method.");
        }
    }
}
