const fs = require('fs');
const jsCode = fs.readFileSync('js/idopont.js', 'utf8');

// The logic inside idopont.js:
// selectedModules represents filters. If selectedModules.mod1 is true, we want to SHOW it.
// The problem is that previously, when no filters are active, they are all false.
// If the user clicks "1. modul", selectedModules.mod1 becomes true.
// The code checks: if (noFiltersActive) push else ...
// If one filter is active, noFiltersActive = false.
// Then it checks: if (isModule) { ... }
//
// Let's re-verify the logic.
