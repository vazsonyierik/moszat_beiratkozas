import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

helper_code = """
const calculateDaysRemaining = (targetTimestamp) => {
    if (!targetTimestamp) return null;
    const targetDate = targetTimestamp.toDate ? targetTimestamp.toDate() : new Date(targetTimestamp.seconds * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
};

"""

# Insert after imports, before components
insert_pos = content.find('const React = window.React;')
if insert_pos != -1:
    content = content[:insert_pos] + helper_code + content[insert_pos:]

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
