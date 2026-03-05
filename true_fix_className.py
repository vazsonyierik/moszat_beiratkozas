import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# I see what happened. The find and replace I did earlier FAILED to replace those items because of single/double quote mismatches or escaped characters in my string replace script.

# Use regex to do a robust cleanup of `className="${`...`}"` to `className="..."`

def replace_backticks_in_classname(match):
    inner = match.group(1)
    # Remove leading and trailing backticks
    if inner.startswith('`') and inner.endswith('`'):
        inner = inner[1:-1]
    # Replace any inner string interpolations ${} with standard html format. Wait, if it's already inside className="...", ${} is correct for htm!
    # So `className="${`foo ${bar}`}"` becomes `className="foo ${bar}"`
    return f'className="{inner}"'

content = re.sub(r'className="\${([^}]+(?:}[^}]*)*)}"', replace_backticks_in_classname, content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
