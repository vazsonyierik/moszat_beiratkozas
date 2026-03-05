import re
with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

content = content.replace('className="w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}"/', 'className="w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}"')
content = content.replace('className="${isSelected ? \'text-white\' : \'text-gray-600\'}" }"', 'className="${isSelected ? \'text-white\' : \'text-gray-600\'}"')


with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
