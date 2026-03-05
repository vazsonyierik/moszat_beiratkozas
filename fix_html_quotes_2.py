import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Ezek mind `className=${...}` ahol backtick stringek vannak!
# De ez működött korábban. A user mondta:
# "When passing dynamic variables to HTML attributes (like className or key) in htm, you must always use explicit double quotes for string interpolation (e.g., className=\"px-2 ${dynamicColor}\", key=\"${item.id}\"). Never pass objects or unquoted template literal backticks as attribute values, as this causes React 'Objects are not valid as a React child' crashes."

# Tehát `className=${'foo'}` az egy string objektum (esetleg), ha `${`foo`}`-t adunk, a React megpróbálja objektumként értelmezni!
# Vagy nem... De meg kell csinálnunk az idézőjeleket az összes ilyennél is, ha megkövetelik:
# Pl: className="${...}"
# Cseréljük az összes `className=${...}`-t `className="${...}"`-ra.

content = re.sub(r'className=\${([^}]+)}', r'className="${\1}"', content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
