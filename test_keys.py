import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Replace all key="${something}" back to key=${something} to see if it fixes the crash
# because the original bug happened before I added quotes to all keys.
content = re.sub(r'key="\${(.*?)}"', r'key=${\1}', content)
content = content.replace('key="ellipsis-${index}"', 'key=${`ellipsis-${index}`}')

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
