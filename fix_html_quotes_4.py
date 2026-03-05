import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Emlékeztető az előző commitból, a className probléma a `StudentTable` belsejében lehet,
# amit én adtam hozzá: `return html\`<span className="${'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + bgColor}">${phaseName}: ${daysLabel}</span>\`;`
# BÁR az htm esetén a dynamic variable stringet érdemes IDEZŐJELEK NÉLKÜL átadni, ha az egésze dinamikus!
# React htm syntax: className=${myVar}
# "When you pass dynamic variables to HTML attributes (like className or key) in htm, you must always use explicit double quotes for string interpolation (e.g., className=\"px-2 ${dynamicColor}\", key=\"${item.id}\"). Never pass objects or unquoted template literal backticks as attribute values, as this causes React 'Objects are not valid as a React child' crashes."

# Ezt pontosan értelmezve: className="px-2 ${dynamicColor}" a HELYES forma.
# Ehhez képest én ezt írtam a StudentTable badge-hez:
# `className="${'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + bgColor}"`
# ami string összefűzés, de az egy OBJEKTUM? Nem, az egy string!

# De nézzük meg, hogy hol van `className="${...}"`
matches = re.findall(r'className="(\${[^}]+})"', content)
print(matches)

# Látok egy ilyet az AdminPanel.js-ben: className="${isSelected ? 'text-white' : 'text-gray-600'}"
# Valamint a span visszatérésnél a StudentTable-ben.

# Próbáljuk meg ezeket a sima `className=${...}` formára visszaállítani, mert valójában EZ AZ, ami korábban működött (és a react-htm alap működése is ez, kivéve ha "string interpolation" van, mint pl className="foo ${bar}").

content = content.replace('className="${isSelected ? \'text-white\' : \'text-gray-600\'}"', 'className=${isSelected ? \'text-white\' : \'text-gray-600\'}')
content = content.replace('className="${\'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \' + bgColor}"', 'className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor}"')

# Van más string interpolation className-el?
# `className="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"`
# Ezt alakítsuk vissza `className=${...}` -ra, mert ez valószínűleg egy template literal volt. Vagy maradjon így? Az idézőjeles verzió ha tartalmaz template literal kifejezést (${... ? ... : ...}), az okozhat hibát htm-ben, mert az interpoláción belül idézőjelek vannak!

# Jobb ha a JS kifejezéseket tiszta `${}`-el adjuk át, ÉS HA KÖTELEZŐ idézőjel, akkor backtickek kellenek.
# "Never pass unquoted template literal backticks as attribute values"
# Tehát ha `${`foo`}` van, az objektum lesz. De ha `className=${myVar}` van, az rendben kell legyen!
