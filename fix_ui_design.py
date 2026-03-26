import re

with open('js/idopont.js', 'r') as f:
    content = f.read()

# 1. Floating pill button logic in StudentAppointmentsApp (instead of bottom sheet cart)
# The previous version had a `<div className="fixed bottom-0 ... bg-white ... pb-[env(safe-area-inset-bottom)]">` for mobile summary.
# I need to replace that block.

old_bottom_sheet = r'            \{\/\* Mobile Bottom Sheet Cart \*\/\}\n            \$\{activeTab === \'kresz\' && cart\.length > 0 && html`\n                <div \n                    className=\$\{`fixed bottom-0 left-0 right-0 bg-white shadow-\[0_-10px_40px_rgba\(0,0,0,0\.1\)\] z-40 transition-transform duration-300 ease-in-out \$\{isMobileCartOpen \? \'translate-y-0\' : \'translate-y-full\'\} sm:hidden pb-\[env\(safe-area-inset-bottom\)\]`\}\n                    style=\$\{\{ \n                        touchAction: \'none\'\n                    \}\}\n                >\n.*?                </div>\n            `\}\n'

new_floating_pill = """            {/* Floating Pill Button for Mobile/Desktop */}
            {activeTab === 'kresz' && cart.length > 0 && html`
                <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-[env(safe-area-inset-bottom)]">
                    <button
                        onClick=${() => setIsCheckoutOpen(true)}
                        className="pointer-events-auto bg-indigo-600 hover:bg-indigo-700 text-white pl-2 pr-6 py-2.5 rounded-full font-bold shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex items-center gap-4 active:scale-95 transition-transform border border-indigo-400/50 backdrop-blur-sm"
                    >
                        <span className="bg-indigo-800 text-white text-sm w-9 h-9 rounded-full flex items-center justify-center font-black shadow-inner">
                            ${cart.length}
                        </span>
                        <span className="text-[15px] tracking-wide">Tovább a jelentkezéshez &rarr;</span>
                    </button>
                </div>
            `}
"""

content = re.sub(old_bottom_sheet, new_floating_pill, content, flags=re.DOTALL)

# Let's also remove the `isMobileCartOpen` state logic which we no longer need.
content = re.sub(r'    const \[isMobileCartOpen, setIsMobileCartOpen\] = useState\(false\);\n', '', content)
content = re.sub(r'    const \[startY, setStartY\] = useState\(0\);\n    const \[currentY, setCurrentY\] = useState\(0\);\n', '', content)

# 2. Add `onRemoveItem={handleRemoveFromCart}` to `CheckoutModal` invocation
content = content.replace(
    '<${CheckoutModal} cart=${cart} onClose=${handleCheckoutClose} onBook=${handleBook} isTestView=${isTestView} />',
    '<${CheckoutModal} cart=${cart} onClose=${handleCheckoutClose} onBook=${handleBook} isTestView=${isTestView} onRemoveItem=${handleRemoveFromCart} />'
)

with open('js/idopont.js', 'w') as f:
    f.write(content)
print("Floating pill applied!")
