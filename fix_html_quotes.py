import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Emlékeztető a szabályból:
# "When passing dynamic variables to HTML attributes (like className or key) in htm, you must always use explicit double quotes for string interpolation (e.g., className=\"px-2 ${dynamicColor}\", key=\"${item.id}\"). Never pass objects or unquoted template literal backticks as attribute values, as this causes React 'Objects are not valid as a React child' crashes."

# Itt a Fragment child-ok a hiba forrásai.
# "The above error occurred in the <Fragment> component: at div" - valószínűleg egy div attribútum.
# A "deadlines" tab-on egy form-ban vannak a radiók:
# <input type="radio" name="deadlinePhaseFilter" value="all" checked=${deadlinePhaseFilter === 'all'} ...

# Mi a probléma a radióknál? "checked=${deadlinePhaseFilter === 'all'}"? Ezt Reactban egy propertyként adjuk át, nem string interpolációként. boolean értéket kell adni neki. Htm ezt `${boolean}`-el fogadja. Nincs idézőjel.
# Itt valószínűleg nem ez a hiba.
# De van ez:
# return html`<span className="${'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + bgColor}">${phaseName}: ${daysLabel}</span>`;
# A fenti idézőjeles, tehát OK.

# Nézzük meg, hol van a hibás div!
# "at div, at div, at AdminPanel..."

# Keresünk valami unquoted `className=${valami}` dolgot:
# pl. `className=${...}`
matches = re.findall(r'className=\${([^}]+)}', content)
print(matches)

# Lehet, hogy van valahol className=${valami} string interpoláció dupla idézőjel nélkül
