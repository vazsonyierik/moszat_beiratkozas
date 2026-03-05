with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

content = content.replace("allowArchive = false, showDeadlineBadge = false, showDeadlineBadge = false", "allowArchive = false, showDeadlineBadge = false")

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
