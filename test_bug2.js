const courses = [
    {name: "Valamilyen tréning"},
    {name: "1. nap"},
    {name: "2. modul"},
    {name: "Másik tréning"}
];

const selectedCategories = { consultation: false, medical: false, firstaid: false };
const selectedModules = { mod1: true, mod2: false, mod3: false, mod4: false };

const desktopFilteredCourses = [];

courses.forEach(c => {
    const isMedical = false;
    const isFirstAid = false;
    const isConsultation = false;
    const isModule = true;

    const noFiltersActive = false;

    if (noFiltersActive) {
        desktopFilteredCourses.push(c);
    } else {
        if (isModule) {
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
                desktopFilteredCourses.push(c);
            }
        }
    }
});
console.log(desktopFilteredCourses);
