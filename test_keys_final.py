import re
with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Let's fix the bug right here.
# The user's image shows: found: object with keys {key}.
# And we know that `key=${...}` translates to an object assignment in `htm` if it's dynamic!
# We must use `key="${...}"`!

def fix_key(match):
    inner = match.group(1)
    if inner.startswith('`') and inner.endswith('`'):
        inner_no_backticks = inner[1:-1]
        return f'key="{inner_no_backticks}"'
    return f'key="${{{inner}}}"'

content = re.sub(r'key=\${([^}]+)}', fix_key, content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
