import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# I am completely failing to replace these strings via Python. Let's just use sed to do an inline regex replacement that strips out `${` and `}` for all classNames.

# Pattern: className="${`  -> className="
# And the trailing `}" -> "

content = re.sub(r'className="\${`([^`]*)`}"', r'className="\1"', content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
