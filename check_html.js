import fs from 'fs';
const html = fs.readFileSync('js/idopont.js', 'utf8');
console.log(html.substring(html.indexOf('<div className="grid grid-cols-1 lg:grid-cols-3 gap-y-8 gap-x-8 relative z-10">'), html.indexOf('<!-- Right Column (Span 1): Filters & Cart -->') + 200));
