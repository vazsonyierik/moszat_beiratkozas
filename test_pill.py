import re
with open('js/idopont.js', 'r') as f:
    c = f.read()

print(c.find('Tovább a jelentkezéshez'))
