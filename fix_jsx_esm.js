import fs from 'fs';

const path = 'c:/AUDIPREVE CONTABILIDADE/audiprevecontab-112f76a5/src/pages/GestorAlertasPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// The problematic block has many closing divs followed by )}
// specifically at lines 445-450

const marker = 'Salvar Template da Equipe"}';
const sidebarMarker = '{/* Sidebar Direita: Categorias Nativas */}';

const parts = content.split(marker);
if (parts.length > 1) {
    const afterMarker = parts[1];
    const subParts = afterMarker.split(sidebarMarker);
    if (subParts.length > 1) {
        // Correct closing structure for the 'else' (templates) block
        // after the button, it should be:
        // </button> (already there before marker)
        // </div> (flex justify-end) 
        // </div> (space-y-4)
        // </div> (card-premium)
        // </div> (space-y-6 inside else)
        // )} (end of ternary)
        // </div> (lg:col-span-2)
        
        const newClosing = '\n                          </button>\n                       </div>\n                    </div>\n                 </div>\n              </div>\n           )}\n         </div>\n\n        ';
        
        const newContent = parts[0] + marker + newClosing + sidebarMarker + subParts[1];
        fs.writeFileSync(path, newContent);
        console.log("SUCCESS: GestorAlertasPage.tsx fixed.");
    } else {
        console.log("ERROR: Sidebar marker not found.");
    }
} else {
    console.log("ERROR: Button marker not found.");
}
