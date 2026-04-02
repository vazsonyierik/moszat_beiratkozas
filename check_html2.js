import fs from 'fs';
const html = fs.readFileSync('js/idopont.js', 'utf8');
console.log(html.substring(html.indexOf('<!-- Right Column (Span 1)'), html.indexOf('<!-- Right Column (Span 1)') + 1000));
