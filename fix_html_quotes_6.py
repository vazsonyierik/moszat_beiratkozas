import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Úgy tűnik az előző script amit megírtam és le is futtattam egy másik fixálásra (fix_html_quotes_3.py) már ezt csinálta!
# De én a submit ELŐTT ezt lefuttattam, viszont mégis jött a className object error.
# Nézzük meg, mik az AKTUÁLIS className interpolációk a fájlban.
matches = re.findall(r'className="(\${[^}]+})"', content)
print("With quotes and ${}", matches)

matches2 = re.findall(r'className=\${([^}]+)}', content)
print("Unquoted ${}", matches2)
