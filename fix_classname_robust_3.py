import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# I am having issues with the exact string matches because of spaces or newlines or escaped strings.
# Let's use regex with a replacement function that doesn't care about the internals.
# We want to replace `className="${`valami`}"` with `className="valami"`.

def fix_classname(match):
    # This captures the part INSIDE the double quotes: ${`...`}
    inner = match.group(1)

    # Let's strip the leading `${` and trailing `}`
    if inner.startswith('${`') and inner.endswith('`}'):
        content_inside = inner[3:-2] # Removes `${` and `}`
        # Wait, if we remove `${` and `}`, we just have a raw string.
        # BUT this raw string contains other `${...}` things, because it was a template literal!
        # Actually, in htm, if you have className="foo ${bar} baz", it works perfectly!
        # So we just return `className="` + content_inside + `"`
        return 'className="' + content_inside + '"'

    return match.group(0) # Unchanged

# Find all className="..." where inside the quotes it is exactly ${`...`}
# We need DOTALL in case there are newlines, though there shouldn't be.
content = re.sub(r'className="(\${`.*?`})"', fix_classname, content, flags=re.DOTALL)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
