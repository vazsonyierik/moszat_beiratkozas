import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Fix the nested backtick string `key="${`ellipsis-${index}"`}` which is a syntax error in js template literals.
content = content.replace('key="${`ellipsis-${index}"`}"', 'key="ellipsis-${index}"')
content = content.replace('key="${`ellipsis-${index}"`}', 'key="ellipsis-${index}"')


with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
