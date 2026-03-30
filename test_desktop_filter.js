const selectedCategories = { consultation: false, medical: false, firstaid: false };
const selectedModules = { mod1: true, mod2: false, mod3: false, mod4: false };

console.log("noFiltersActive logic check:");
const noFiltersActive =
    !selectedCategories.medical &&
    !selectedCategories.firstaid &&
    !selectedCategories.consultation &&
    !selectedModules.mod1 &&
    !selectedModules.mod2 &&
    !selectedModules.mod3 &&
    !selectedModules.mod4;

console.log("noFiltersActive =", noFiltersActive);

const c = {name: 'Valami Modul'}
const isMedical = false;
const isFirstAid = false;
const isConsultation = false;
const isModule = true;

if (noFiltersActive) {
    console.log("Pushed (no filters)");
} else {
    if (isMedical && selectedCategories.medical) console.log("Pushed Medical");
    else if (isFirstAid && selectedCategories.firstaid) console.log("Pushed First Aid");
    else if (isConsultation && selectedCategories.consultation) console.log("Pushed Consultation");
    else if (isModule) {
        console.log("Checking modules...");
        const name = c.name.toLowerCase();
        const isMod1 = name.includes('1. ') || name.includes('1.modul') || name.includes('első') || name.includes('1. nap');
        const isMod2 = name.includes('2. ') || name.includes('2.modul') || name.includes('második') || name.includes('2. nap');
        const isMod3 = name.includes('3. ') || name.includes('3.modul') || name.includes('harmadik') || name.includes('3. nap');
        const isMod4 = name.includes('4. ') || name.includes('4.modul') || name.includes('negyedik') || name.includes('4. nap');

        if (
            (isMod1 && selectedModules.mod1) ||
            (isMod2 && selectedModules.mod2) ||
            (isMod3 && selectedModules.mod3) ||
            (isMod4 && selectedModules.mod4) ||
            (!isMod1 && !isMod2 && !isMod3 && !isMod4 && (selectedModules.mod1 || selectedModules.mod2 || selectedModules.mod3 || selectedModules.mod4))
        ) {
            console.log("Pushed Module");
        } else {
            console.log("Module NOT pushed");
        }
    } else {
        console.log("NOT Pushed at all");
    }
}
