import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# I see it again. Look at the grep output!
# className="${`ml-2 ${!reg.status_paid ? 'text-gray-400' : ''}`}"
# The internal string HAS backticks, but my regex was too specific.

# Let's do a pure string search and replace for each one found in grep:

str1 = 'className="${`ml-2 ${!reg.status_paid ? \'text-gray-400\' : \'\'}`}"'
res1 = 'className="ml-2 ${!reg.status_paid ? \'text-gray-400\' : \'\'}"'
content = content.replace(str1, res1)

str2 = 'className="${`transition-all duration-300 ease-in-out grid ${openCommentId === reg.id ? \'grid-rows-[1fr]\' : \'grid-rows-[0fr]\'}`}"'
res2 = 'className="transition-all duration-300 ease-in-out grid ${openCommentId === reg.id ? \'grid-rows-[1fr]\' : \'grid-rows-[0fr]\'}"'
content = content.replace(str2, res2)

str3 = 'className="${`container mx-auto px-4 sm:px-6 lg:px-8 py-8 ${containerBgClass}`}"'
res3 = 'className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 ${containerBgClass}"'
content = content.replace(str3, res3)

str4 = 'className="${`p-4 sm:p-6 lg:p-8 rounded-xl ${viewTestDataType ? \'bg-red-100/50\' : \'bg-gray-50\'}`}"'
res4 = 'className="p-4 sm:p-6 lg:p-8 rounded-xl ${viewTestDataType ? \'bg-red-100/50\' : \'bg-gray-50\'}"'
content = content.replace(str4, res4)

str5 = 'className="${`w-8 h-4 rounded-full p-0.5 transition-colors ${testEmailsEnabled ? \'bg-green-500\' : \'bg-gray-300\'}`}"'
res5 = 'className="w-8 h-4 rounded-full p-0.5 transition-colors ${testEmailsEnabled ? \'bg-green-500\' : \'bg-gray-300\'}"'
content = content.replace(str5, res5)

str6 = 'className="${`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${testEmailsEnabled ? \'translate-x-4\' : \'translate-x-0\'}`}"'
res6 = 'className="w-3 h-3 bg-white rounded-full shadow transform transition-transform ${testEmailsEnabled ? \'translate-x-4\' : \'translate-x-0\'}"'
content = content.replace(str6, res6)

str7 = 'className="${`w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}`}"'
res7 = 'className="w-5 h-5 transform transition-transform ${isFilterVisible ? \'rotate-180\' : \'\'}"'
content = content.replace(str7, res7)

str8 = 'className="${`transition-all duration-500 ease-in-out overflow-hidden ${isFilterVisible ? \'max-h-96\' : \'max-h-0\'}`}"'
res8 = 'className="transition-all duration-500 ease-in-out overflow-hidden ${isFilterVisible ? \'max-h-96\' : \'max-h-0\'}"'
content = content.replace(str8, res8)

str9 = 'className="${`p-2 rounded-full border-2 transition-colors ${isSelected ? `${color} border-transparent` : \'border-gray-300 bg-white\'}`}"'
# In str9, there is a nested template literal string: `${color} border-transparent` which translates in htm into pure python-style concat or string inside expression
res9 = 'className="p-2 rounded-full border-2 transition-colors ${isSelected ? color + \' border-transparent\' : \'border-gray-300 bg-white\'}"'
content = content.replace(str9, res9)

# Now, write back
with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
