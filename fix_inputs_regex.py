import re

with open('js/idopont.js', 'r') as f:
    content = f.read()

# I will replace the <form> inside CheckoutModal with my new inputs since the regex failed earlier
old_form = r'<form onSubmit=\$\{handleSubmit\} className="space-y-4">.*?<\/form>'

new_form = """<form onSubmit=${handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Vezetéknév</label>
                                <input
                                    type="text"
                                    value=${lastName}
                                    onChange=${e => setLastName(e.target.value)}
                                    className="w-full p-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                    required
                                    placeholder="Kovács"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Keresztnév</label>
                                <input
                                    type="text"
                                    value=${firstName}
                                    onChange=${e => setFirstName(e.target.value)}
                                    className="w-full p-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                    required
                                    placeholder="János"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">E-mail cím</label>
                            <input
                                type="email"
                                value=${email}
                                onChange=${e => setEmail(e.target.value)}
                                className="w-full p-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                required
                                placeholder="pelda@email.hu"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">E-mail megerősítése</label>
                            <input
                                type="email"
                                value=${emailConfirm}
                                onChange=${e => setEmailConfirm(e.target.value)}
                                className="w-full p-3.5 bg-gray-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                required
                                placeholder="pelda@email.hu"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled=${isSubmitting}
                                className="w-full py-4 sm:py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 text-[15px]"
                            >
                                ${isSubmitting ? html`<span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span> Küldés folyamatban...` : 'Jelentkezés véglegesítése'}
                            </button>
                            <button
                                type="button"
                                onClick=${() => onClose()}
                                disabled=${isSubmitting}
                                className="w-full mt-3 py-3 text-gray-500 hover:text-gray-900 rounded-2xl font-bold transition-all active:scale-[0.98] bg-transparent sm:hidden"
                            >
                                Mégse
                            </button>
                        </div>
                    </form>"""

content = re.sub(old_form, new_form, content, flags=re.DOTALL)

with open('js/idopont.js', 'w') as f:
    f.write(content)
print("Form applied!")
