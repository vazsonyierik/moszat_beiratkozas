/**
 * js/constants.js
 * * This file contains constant values like select options used in forms.
 * JAVÍTÁS: A végzettségek listája frissítve a megadott kép alapján.
 * MÓDOSÍTÁS: A "Válassz..." opciók letiltva a legördülő listákban, hogy ne legyenek kiválaszthatók.
 */

export const documentTypeOptions = [
    { value: '', label: 'Válassz...', disabled: true },
    { value: 'Magyar személyigazolvány', label: 'Magyar személyigazolvány' },
    { value: 'Külföldi személyigazolvány', label: 'Külföldi személyigazolvány' },
    { value: 'Magyar útlevél', label: 'Magyar útlevél' },
    { value: 'Külföldi útlevél', label: 'Külföldi útlevél' }
];

export const educationOptions = [
    { value: "", label: "Válassz...", disabled: true },
    { value: "Általános iskolai végzettség", label: "Általános iskolai végzettség" },
    { value: "Középfokú végzettség és gimnáziumi érettségi (gimnázium)", label: "Középfokú végzettség és gimnáziumi érettségi (gimnázium)" },
    { value: "Középfokú végzettség és középfokú szakképesítés (szakgimnázium, szakképző iskola, szakiskola)", label: "Középfokú végzettség és középfokú szakképesítés (szakgimnázium, szakképző iskola, szakiskola)" },
    { value: "Középfokú végzettség és középfokú szakképzettség (technikum)", label: "Középfokú végzettség és középfokú szakképzettség (technikum)" },
    { value: "Felsőfokú végzettségi szint és felsőfokú szakképzettség (felsőoktatási intézmény)", label: "Felsőfokú végzettségi szint és felsőfokú szakképzettség (felsőoktatási intézmény)" },
    { value: "Felsőoktatási szakképzés (felsőoktatási intézmény)", label: "Felsőoktatási szakképzés (felsőoktatási intézmény)" }
];

export const prefixOptions = [
    { value: "", label: "Nincs" },
    { value: "dr.", label: "dr." },
    { value: "Dr.", label: "Dr." }
];

export const budapestDistricts = Array.from({ length: 23 }, (_, i) => `${(i + 1).toString().padStart(2, '0')}. kerület`);
