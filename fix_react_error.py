import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Keresünk valami olyan attribútumot, ami interpolált objektum vagy hibás key a StudentTable render blokkban.
# "Objects are not valid as a React child" tipikusan akkor jön fel htm-ben,
# ha egy template literal interpolációba `className=${'valami ' + valami}` kerül `className="${'valami ' + valami}"` helyett.
# De mi ezt már megcsináltuk a badge-nél:
# return html`<span className="${'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + bgColor}">${phaseName}: ${daysLabel}</span>`;
# Ugyanakkor látszik a hibában egy Object with keys {key}.
# Vajon a "key" propot rosszul interpoláltuk a "deadlines" tab div-jében?
#
# Eredeti:
# ${activeTab === 'deadlines' && html`
#                         <div key="deadlines-tab">
# Ezt nem interpoláltuk.
#
# Nézzük meg az összes key propot:
# grep -n "key=" js/AdminPanel.js
