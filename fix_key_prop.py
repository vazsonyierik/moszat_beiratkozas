import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Emlékszünk, hogy "When you pass dynamic variables to HTML attributes (like className or key) in htm, you must always use explicit double quotes for string interpolation"
# "key" prop with dynamic values like ${opt.key} should be key="${opt.key}"

content = re.sub(r'key=\${(.*?)}', r'key="${\1}"', content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
