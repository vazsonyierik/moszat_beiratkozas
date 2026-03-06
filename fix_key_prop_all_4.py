import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Look at this:
# ```
# ${iconFilterOptions.map(({ key, Icon, title, color }) => {
#    const isSelected = selectedIconFilters.includes(key);
#    return html`
#        <div key=${key}>
# ```
# Is this the object with keys {key}? No, `key` is a primitive value here (string like 'medical').
# But wait... What if `{key}` IS an object, e.g. `<div key={{key}}>`?
# No, it's `key=${key}`.

# Let's revisit: "When passing dynamic variables to HTML attributes (like className or key) in htm, you must always use explicit double quotes for string interpolation (e.g., className=\"px-2 ${dynamicColor}\", key=\"${item.id}\"). Never pass objects or unquoted template literal backticks as attribute values, as this causes React 'Objects are not valid as a React child' crashes."

# THE ERROR EXACTLY MATCHES THIS SENTENCE!
# I quote: "Never pass objects or unquoted template literal backticks as attribute values, as this causes React 'Objects are not valid as a React child' crashes."
# AND I JUST REMOVED THE QUOTES.
# I had: `key="${reg.id}"` and I changed it to `key=${reg.id}`.
# AND BEFORE THAT: I had `key="${reg.id}"` everywhere but it still crashed.

# WHY did it crash?
# Because I HAD nested backticks: `key="${`ellipsis-${index}`}"` !
# "Never pass unquoted template literal backticks as attribute values"
# I fixed the backticks but I left `key="something"` alone.

# The user explicitly said: "When passing dynamic variables to HTML attributes (like className or key) in htm, you must always use explicit double quotes for string interpolation (e.g., className=\"px-2 ${dynamicColor}\", key=\"${item.id}\")."
# My last commit I *reverted* `key="${reg.id}"` to `key=${reg.id}`!
# No wait! I DID NOT revert it in my first "fix: resolve react crash by applying explicit quotes to htm key properties" commit! I ADDED QUOTES to keys.
# Let's check the git diff for what was the state when the user reported the crash.

import subprocess
res = subprocess.run(["git", "show", "HEAD:js/AdminPanel.js"], capture_output=True, text=True)
content = res.stdout
matches = re.findall(r'key="\${.*?}"', content)
print("Quoted keys in HEAD:", len(matches))
matches2 = re.findall(r'key=\${.*?}', content)
print("Unquoted keys in HEAD:", len(matches2))
