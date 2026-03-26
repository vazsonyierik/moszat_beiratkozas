import re

with open('js/idopont.js', 'r') as f:
    content = f.read()

# 1. Update the Scroll Lock Logic for iOS in StudentAppointmentsApp
old_scroll_lock_regex = r'    useEffect\(\(\) => \{\n        if \(isCheckoutOpen\) \{\n            document\.body\.style\.overflow = \'hidden\';\n            document\.body\.style\.overscrollBehavior = \'none\';\n        \} else \{\n            document\.body\.style\.overflow = \'\';\n            document\.body\.style\.overscrollBehavior = \'\';\n        \}\n        return \(\) => \{\n            document\.body\.style\.overflow = \'\';\n            document\.body\.style\.overscrollBehavior = \'\';\n        \};\n    \}, \[isCheckoutOpen\]\);'

new_scroll_lock = """    // Robust iOS body scroll lock
    useEffect(() => {
        if (isCheckoutOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
        };
    }, [isCheckoutOpen]);"""

content = re.sub(old_scroll_lock_regex, new_scroll_lock, content, flags=re.DOTALL)

# 2. Add `onRemoveItem` parameter to `CheckoutModal` definition:
old_def = r'const CheckoutModal = \(\{ cart, onClose, onBook, isTestView \}\) => \{'
new_def = r'const CheckoutModal = ({ cart, onClose, onBook, isTestView, onRemoveItem }) => {'
content = re.sub(old_def, new_def, content)

# 3. Add the selected courses layout inside `CheckoutModal` (the custom summary block with Remove button)
old_selected = r'''                <div className="p-4 sm:p-6 bg-indigo-50 border-b border-indigo-100 max-h-48 overflow-y-auto shrink-0 custom-scrollbar">\n                    <p className="font-semibold text-indigo-900 mb-2">Kiválasztott időpontok \(\$\{cart\.length\}\):</p>\n                    <ul className="space-y-2">\n                        \$\{cart\.map\(\(item, index\) => html`\n                            <li key=\$\{index\} className="text-sm text-indigo-800 bg-white p-2\.5 rounded-lg border border-indigo-200 flex justify-between items-center gap-2">\n                                <div className="flex-1">\n                                    <span className="font-semibold block">\$\{item\.course\.name\} \$\{item\.isWaitlist \? html`<span className="text-xs text-yellow-700 bg-yellow-100 px-1 py-0\.5 rounded ml-1">\(Várólista\)</span>` : ''\}</span>\n                                    <span className="text-indigo-600/80">\$\{item\.course\.date\} | \$\{item\.course\.startTime\}</span>\n                                </div>\n                            </li>\n                        `\)\}\n                    </ul>\n                </div>'''

new_selected = """                <div className="px-5 sm:px-6 py-4 bg-gray-50/50 border-b border-gray-100 max-h-48 overflow-y-auto shrink-0 custom-scrollbar">
                    <p className="font-bold text-gray-500 mb-3 text-[11px] tracking-wider uppercase">Kiválasztott időpontok (${cart.length})</p>
                    <ul className="space-y-2.5">
                        ${cart.map((item, index) => html`
                            <li key=${index} className="bg-white p-3 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 flex justify-between items-center gap-3">
                                <div className="flex-1">
                                    <span className="font-bold text-gray-900 text-sm block">
                                        ${item.course.name}
                                        ${item.isWaitlist ? html`<span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md ml-1.5 uppercase tracking-wider">Várólista</span>` : ''}
                                    </span>
                                    <span className="text-gray-500 text-xs font-medium mt-1 flex items-center gap-1">
                                        <${Icons.CalendarIcon} size=${12} className="text-gray-400" />
                                        ${item.course.date.replace(/-/g, '. ')}. <span className="text-indigo-600 font-semibold">${item.course.startTime}</span>
                                    </span>
                                </div>
                                ${onRemoveItem ? html`
                                    <button
                                        type="button"
                                        onClick=${() => onRemoveItem(item.course.id)}
                                        className="text-red-400 hover:text-red-600 bg-red-50/50 hover:bg-red-100 rounded-full p-2 transition-colors shrink-0 active:scale-90"
                                        title="Eltávolítás"
                                    >
                                        <${Icons.XIcon} size=${16} />
                                    </button>
                                ` : ''}
                            </li>
                        `)}
                    </ul>
                </div>"""

content = re.sub(old_selected, new_selected, content, flags=re.DOTALL)

with open('js/idopont.js', 'w') as f:
    f.write(content)
print("Changes applied!")
