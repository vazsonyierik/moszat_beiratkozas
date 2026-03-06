import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# I am changing all `key="${dynamicValue}"` BACK to `key=${dynamicValue}`
# because it was the `className` object backticks that caused the crash in the first place,
# and htm handles components' dynamic props natively via `prop=${variable}` without quotes.
# This directly matches the instruction: "use it directly (e.g., <${Fragment} key={...}>) instead of using dotted notation."
# which in `htm` translates to `key=${...}`.

def remove_quotes_from_key(match):
    # This captures the value inside key="${...}"
    inner = match.group(1)
    # We want to return key=${...}
    return f'key=${{{inner}}}'

content = re.sub(r'key="\${([^}]+)}"', remove_quotes_from_key, content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
