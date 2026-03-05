import re
with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

content = content.replace('className="p-2 rounded-full border-2 transition-colors ${isSelected ? `${color}" border-transparent` : \'border-gray-300 bg-white\'}`}', 'className="p-2 rounded-full border-2 transition-colors ${isSelected ? color + \' border-transparent\' : \'border-gray-300 bg-white\'}"')
content = content.replace('className="w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}"/ >', 'className="w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}" />')

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
