import re

with open('js/AdminPanel.js', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Handle className="${`...`}" where inside there might be ${...} but we want to strip the `${` and `}` wrapper.
    # It's specifically a pattern where className begins with `className="${`` and ends with ``}"`

    if 'className="${`' in line:
        # manual replace
        line = line.replace('className="${`', 'className="')
        # We also need to remove the matching `}" at the end of the class string.
        line = line.replace('`}"', '"')

    new_lines.append(line)

with open('js/AdminPanel.js', 'w') as f:
    f.writelines(new_lines)
