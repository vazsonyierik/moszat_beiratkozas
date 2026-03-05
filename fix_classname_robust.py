import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Ezt próbáltam csinálni az előző scriptel, de a regex nem vitte végig az egész file-on azokat az eseteket, amikben belül kapcsos zárójelek voltak (pl. `className="${`foo ${bar}`}"`).
# Csináljuk meg manuálisan.

content = content.replace('className="${`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? \'z-10 bg-indigo-50 border-indigo-500 text-indigo-600\' : \'bg-white border-gray-300 text-gray-500 hover:bg-gray-50\'}`}"', 'className="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? \'z-10 bg-indigo-50 border-indigo-500 text-indigo-600\' : \'bg-white border-gray-300 text-gray-500 hover:bg-gray-50\'}"')
content = content.replace('className="${`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}"', 'className="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number ? \'z-10 bg-indigo-50 border-indigo-500 text-indigo-600\' : \'bg-white border-gray-300 text-gray-500 hover:bg-gray-50\'}"')

content = content.replace('className="${`ml-2 ${!reg.status_paid ? \'text-gray-400\' : \'\'}`}"', 'className="ml-2 ${!reg.status_paid ? \'text-gray-400\' : \'\'}"')

content = content.replace('className="${`transition-all duration-300 ease-in-out grid ${openCommentId === reg.id ? \'grid-rows-[1fr]\' : \'grid-rows-[0fr]\'}`}"', 'className="transition-all duration-300 ease-in-out grid ${openCommentId === reg.id ? \'grid-rows-[1fr]\' : \'grid-rows-[0fr]\'}"')

content = content.replace('className="${`container mx-auto px-4 sm:px-6 lg:px-8 py-8 ${containerBgClass}`}"', 'className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 ${containerBgClass}"')

content = content.replace('className="${`p-4 sm:p-6 lg:p-8 rounded-xl ${viewTestDataType ? \'bg-red-100/50\' : \'bg-gray-50\'}`}"', 'className="p-4 sm:p-6 lg:p-8 rounded-xl ${viewTestDataType ? \'bg-red-100/50\' : \'bg-gray-50\'}"')

content = content.replace('className="${`w-8 h-4 rounded-full p-0.5 transition-colors ${testEmailsEnabled ? \'bg-green-500\' : \'bg-gray-300\'}`}"', 'className="w-8 h-4 rounded-full p-0.5 transition-colors ${testEmailsEnabled ? \'bg-green-500\' : \'bg-gray-300\'}"')

content = content.replace('className="${`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${testEmailsEnabled ? \'translate-x-4\' : \'translate-x-0\'}`}"', 'className="w-3 h-3 bg-white rounded-full shadow transform transition-transform ${testEmailsEnabled ? \'translate-x-4\' : \'translate-x-0\'}"')

content = content.replace('className="${`w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}`}"', 'className="w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}"')

content = content.replace('className="${`transition-all duration-500 ease-in-out overflow-hidden ${isFilterVisible ? \'max-h-96\' : \'max-h-0\'}`}"', 'className="transition-all duration-500 ease-in-out overflow-hidden ${isFilterVisible ? \'max-h-96\' : \'max-h-0\'}"')

content = content.replace('className="${`p-2 rounded-full border-2 transition-colors ${isSelected ? `${color} border-transparent` : \'border-gray-300 bg-white\'}`}"', 'className="p-2 rounded-full border-2 transition-colors ${isSelected ? color + \' border-transparent\' : \'border-gray-300 bg-white\'}"')

# A fentiek egyike sem jött be az előbb string replace-el, valószínűleg a multiline vagy sortörések miatt.
# Helyettesítsük sima find / slice segítségével vagy regexx-el de jobban paraméterezve

import re
# Remove the wrapping ` from inside ${ } in className="..."
def fixer(m):
    return 'className="' + m.group(1).replace('`', '') + '"'

content = re.sub(r'className="\${`([^`]*)`}"', fixer, content)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
