const fs = require('fs');
let content = fs.readFileSync('js/idopont.js', 'utf8');

// 1. Fix ReferenceError isFirstAid
content = content.replace(/const isCompletelyFull = isFull && isFirstAid;/g, "const isCompletelyFull = isFull && course.category === 'firstaid';");

// 2. MobileFilterModal Draft State
// Mivel már egy csomószor próbáltam lecserélni az INLINE mobile modal-t és nem ment, most regex-szel cserélem a html literalban lévő stringeket!
content = content.replace(
    /onClick=\${\(\) => setSelectedModules\(prev => \({ \.\.\.prev, mod1: !prev\.mod1 }\)\)}\s*className=\${\`px-2\.5 py-1\.5/g,
    'onClick=${() => setDraftModules(prev => ({ ...prev, mod1: !prev.mod1 }))} className={`px-2.5 py-1.5'
);
content = content.replace(
    /onClick=\${\(\) => setSelectedModules\(prev => \({ \.\.\.prev, mod2: !prev\.mod2 }\)\)}\s*className=\${\`px-2\.5 py-1\.5/g,
    'onClick=${() => setDraftModules(prev => ({ ...prev, mod2: !prev.mod2 }))} className={`px-2.5 py-1.5'
);
content = content.replace(
    /onClick=\${\(\) => setSelectedModules\(prev => \({ \.\.\.prev, mod3: !prev\.mod3 }\)\)}\s*className=\${\`px-2\.5 py-1\.5/g,
    'onClick=${() => setDraftModules(prev => ({ ...prev, mod3: !prev.mod3 }))} className={`px-2.5 py-1.5'
);
content = content.replace(
    /onClick=\${\(\) => setSelectedModules\(prev => \({ \.\.\.prev, mod4: !prev\.mod4 }\)\)}\s*className=\${\`px-2\.5 py-1\.5/g,
    'onClick=${() => setDraftModules(prev => ({ ...prev, mod4: !prev.mod4 }))} className={`px-2.5 py-1.5'
);

content = content.replace(
    /onClick=\${\(\) => toggleCategory\('consultation'\)}/g,
    'onClick=${() => toggleDraftCategory(\'consultation\')}'
);
content = content.replace(
    /onClick=\${\(\) => toggleCategory\('medical'\)}/g,
    'onClick=${() => toggleDraftCategory(\'medical\')}'
);
content = content.replace(
    /onClick=\${\(\) => toggleCategory\('firstaid'\)}/g,
    'onClick=${() => toggleDraftCategory(\'firstaid\')}'
);

content = content.replace(
    /onClick=\${\(\) => setTimeFilter\('all'\)}/g,
    'onClick=${() => setDraftTimeFilter(\'all\')}'
);
content = content.replace(
    /onClick=\${\(\) => setTimeFilter\('am'\)}/g,
    'onClick=${() => setDraftTimeFilter(\'am\')}'
);
content = content.replace(
    /onClick=\${\(\) => setTimeFilter\('pm'\)}/g,
    'onClick=${() => setDraftTimeFilter(\'pm\')}'
);

// Update button texts
content = content.replace(
    /className="flex-1 px-4 py-2\.5 bg-\[#e09900\] hover:bg-\[#c98900\] text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-center text-sm"\s*>\s*Eredmények mutatása/g,
    `className="flex-1 px-4 py-2.5 bg-[#e09900] hover:bg-[#c98900] text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-center text-sm">Szűrés`
);

// Inject draft states to StudentAppointmentsApp! (This is easier than refactoring out the modal again)
const stateInjectionStr = `
    const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'am', 'pm'

    // Draft states for mobile filter
    const [draftCategories, setDraftCategories] = useState({ consultation: false, medical: false, firstaid: false });
    const [draftModules, setDraftModules] = useState({ mod1: false, mod2: false, mod3: false, mod4: false });
    const [draftTimeFilter, setDraftTimeFilter] = useState('all');

    const toggleDraftCategory = (cat) => setDraftCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
`;
content = content.replace(/const \[timeFilter, setTimeFilter\] = useState\('all'\); \/\/ 'all', 'am', 'pm'/g, stateInjectionStr);

// Sync draft state on open
content = content.replace(
    /onClick=\${\(\) => setIsMobileFilterModalOpen\(true\)}/g,
    `onClick=\${() => {
                        setDraftCategories(selectedCategories);
                        setDraftModules(selectedModules);
                        setDraftTimeFilter(timeFilter);
                        setIsMobileFilterModalOpen(true);
                    }}`
);

// Apply on filter button click
content = content.replace(
    /onClick=\${\(\) => setIsMobileFilterModalOpen\(false\)}\s*className="flex-1 px-4 py-2\.5 bg-\[#e09900\] hover:bg-\[#c98900\] text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-center text-sm">\s*Szűrés/g,
    `onClick=\${() => {
                                    setSelectedCategories(draftCategories);
                                    setSelectedModules(draftModules);
                                    setTimeFilter(draftTimeFilter);
                                    setIsMobileFilterModalOpen(false);
                                }}
                                className="flex-1 px-4 py-2.5 bg-[#e09900] hover:bg-[#c98900] text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-center text-sm">
                                Szűrés`
);

// Clear draft state
content = content.replace(
    /onClick=\${\(\) => {\s*setSelectedCategories\({ consultation: false, medical: false, firstaid: false }\);\s*setSelectedModules\({ mod1: false, mod2: false, mod3: false, mod4: false }\);\s*setTimeFilter\('all'\);\s*}}/g,
    `onClick=\${() => {
                                    setDraftCategories({ consultation: false, medical: false, firstaid: false });
                                    setDraftModules({ mod1: false, mod2: false, mod3: false, mod4: false });
                                    setDraftTimeFilter('all');
                                }}`
);

// We need to replace the variables in the inline mobile modal rendering with draft variables
// Easiest is just replace them all if they are inside the isMobileFilterModalOpen block
// But instead, we do targeted replaces inside the Mobile Modal block:
const modalRegex = /\${isMobileFilterModalOpen && html`([\s\S]*?)<\/div>\s*<\/div>\s*`}/;
const match = content.match(modalRegex);
if(match) {
    let block = match[0];
    block = block.replace(/selectedModules/g, 'draftModules');
    block = block.replace(/selectedCategories/g, 'draftCategories');
    block = block.replace(/timeFilter ===/g, 'draftTimeFilter ===');
    content = content.replace(match[0], block);
}

fs.writeFileSync('js/idopont.js', content);
