import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Replace all unquoted key=${...} with quoted key="${...}"
# Example: key=${opt.key} -> key="${opt.key}"

def quote_key(match):
    # match.group(0) is the whole match like `key=${opt.key}`
    # match.group(1) is the inner content like `opt.key`
    inner = match.group(1)

    # Check if there are backticks inside the inner, if so we need to be careful
    # e.g., key=${`ellipsis-${index}`} -> key="ellipsis-${index}"
    if inner.startswith('`') and inner.endswith('`'):
        inner_no_backticks = inner[1:-1]
        return f'key="{inner_no_backticks}"'

    return f'key="${{{inner}}}"'

# We find key=${something} but we shouldn't match key="search_results"
content = re.sub(r'key=\${([^}]+)}', quote_key, content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
