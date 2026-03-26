import re

with open('js/idopont.js', 'r') as f:
    content = f.read()

# Make sure standard input classes are used. Let's see if the fields changed names in my previous regex.
print(content.find('placeholder="Kovács"'))
