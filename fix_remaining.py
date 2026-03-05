import re
with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

content = content.replace('className="`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? \'z-10 bg-indigo-50 border-indigo-500 text-indigo-600\' : \'bg-white border-gray-300 text-gray-500 hover:bg-gray-50\'}', 'className="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? \'z-10 bg-indigo-50 border-indigo-500 text-indigo-600\' : \'bg-white border-gray-300 text-gray-500 hover:bg-gray-50\'}')

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
