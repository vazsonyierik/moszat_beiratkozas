// N/A, since I don't have direct firestore credentials here
// I'll just check what the user meant by "ha modul számra van kattintva akkor nem szűr le semmit, viszont ha pl az orvosira akkor leszűri".
// Oh, the logic is:
// In the UI, the module filter buttons are initially unselected (false).
// If we click "1. modul", selectedModules.mod1 becomes true.
// `noFiltersActive` becomes false.
// If the course is 1. modul, `isMod1` is true. `selectedModules.mod1` is true. It PUSHES it.
// If the course is "Orvosi", `isMedical` is true. `selectedCategories.medical` is FALSE. It DOES NOT PUSH it.
// So if the user clicks "1. modul", ONLY "1. modul" will be displayed! (And Orvosi, etc. will disappear!)
// Is this what they meant by "nem szűr le semmit" (it filters down to nothing)?
// Wait, if no 1. modul exists in the DB, it filters down to nothing.
// But wait! Look at the naming pattern!
