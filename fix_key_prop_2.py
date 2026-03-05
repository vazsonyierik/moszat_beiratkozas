import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Eltávolítunk egy elrontott idézőjelet a template literálból
content = content.replace('key="${`ellipsis-${index}"`}', 'key="ellipsis-${index}"')

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
