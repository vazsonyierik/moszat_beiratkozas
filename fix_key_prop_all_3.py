import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Wait, the user specifically reported:
# "Warning: Each child in a list should have a unique 'key' prop."
# and
# "Uncaught Error: Objects are not valid as a React child (found: object with keys {key})."

# If an object is found with keys {key}, that literally means an object shaped exactly like `{ key: "something" }` is being injected directly into the HTML tree.
# Where do we inject such an object?
# AdminIcons / StudentIcons lists:
# ```
# const adminIcons = [
#     reg.registeredBy === 'admin' && { Icon: Icons.AdminUserIcon, color: "bg-slate-500", title: "Admin által rögzített", key: 'adminReg' },
#     utils.hasMedicalCertificate(reg) && { Icon: Icons.MedicalIcon, color: "bg-pink-500", title: "Orvosi igazolás leadva", key: 'med' },
#     // ...
# ].filter(Boolean);
# ```
# Are we rendering this array directly anywhere?
# `${adminIcons.map(...)}`
# If we used `${adminIcons}`, it would print the objects. But we use map.
# And they are filtered: `.filter(Boolean)`.

# Let's search for `{key}` in the code! Maybe I created one by mistake?
