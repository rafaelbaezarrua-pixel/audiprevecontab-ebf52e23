const fs = require('fs');
const content = fs.readFileSync('lint_report_final_check.json', 'utf8');
const lines = content.split('\n');
const jsonStart = lines.findIndex(line => line.startsWith('['));
if (jsonStart === -1) {
  console.error('Could not find start of JSON array');
  process.exit(1);
}
const jsonContent = lines.slice(jsonStart).join('\n');
try {
  const results = JSON.parse(jsonContent);
  results.filter(r => r.errorCount > 0).forEach(r => {
    console.log(`FILE: ${r.filePath}`);
    r.messages.filter(m => m.severity === 2).forEach(m => {
      console.log(`  ${m.line}:${m.column} - ${m.message} (${m.ruleId})`);
    });
  });
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
  process.exit(1);
}
