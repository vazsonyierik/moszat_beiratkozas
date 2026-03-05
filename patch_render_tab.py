import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# 1. Add TabButton
tab_button_match = """<${TabButton} tabName="archived" label="Archivált" />
                            </div>"""
tab_button_replacement = """<${TabButton} tabName="archived" label="Archivált" />
                                <${TabButton} tabName="deadlines" label="Határidők" />
                            </div>"""

content = content.replace(tab_button_match, tab_button_replacement)

# 2. Add Tab content block
expired_tab_match = """${activeTab === 'expired' && html`
                        <div key="expired-tab">"""

deadlines_tab_content = """${activeTab === 'deadlines' && html`
                        <div key="deadlines-tab">
                            <div className="mb-6 p-4 bg-white rounded-lg border shadow-sm flex flex-col gap-4">
                                <div className="flex items-center gap-6">
                                    <span className="font-medium text-sm text-gray-700 min-w-[150px]">Fázis szűrés:</span>
                                    <div className="flex items-center gap-5 flex-wrap">
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlinePhaseFilter" value="all" checked=${deadlinePhaseFilter === 'all'} onChange=${(e) => setDeadlinePhaseFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">Összes</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlinePhaseFilter" value="1" checked=${deadlinePhaseFilter === '1'} onChange=${(e) => setDeadlinePhaseFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">1. Fázis</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlinePhaseFilter" value="2" checked=${deadlinePhaseFilter === '2'} onChange=${(e) => setDeadlinePhaseFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">2. Fázis</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlinePhaseFilter" value="3" checked=${deadlinePhaseFilter === '3'} onChange=${(e) => setDeadlinePhaseFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">3. Fázis</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlinePhaseFilter" value="4" checked=${deadlinePhaseFilter === '4'} onChange=${(e) => setDeadlinePhaseFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">4. Fázis</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-medium text-sm text-gray-700 min-w-[150px]">Státusz szűrés:</span>
                                    <div className="flex items-center gap-5 flex-wrap">
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlineStatusFilter" value="all" checked=${deadlineStatusFilter === 'all'} onChange=${(e) => setDeadlineStatusFilter(e.target.value)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                                            <span className="ml-2 text-sm">Összes</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlineStatusFilter" value="ok" checked=${deadlineStatusFilter === 'ok'} onChange=${(e) => setDeadlineStatusFilter(e.target.value)} className="h-4 w-4 text-green-600 focus:ring-green-500" />
                                            <span className="ml-2 text-sm">Rendben (>30 nap)</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlineStatusFilter" value="warning" checked=${deadlineStatusFilter === 'warning'} onChange=${(e) => setDeadlineStatusFilter(e.target.value)} className="h-4 w-4 text-orange-600 focus:ring-orange-500" />
                                            <span className="ml-2 text-sm">Veszélyeztetett (<=30 nap)</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="radio" name="deadlineStatusFilter" value="expired" checked=${deadlineStatusFilter === 'expired'} onChange=${(e) => setDeadlineStatusFilter(e.target.value)} className="h-4 w-4 text-red-600 focus:ring-red-500" />
                                            <span className="ml-2 text-sm">Letelt</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <${StudentTable}
                                adminUser=${user}
                                key="deadline_students"
                                title="Határidők"
                                students=${filteredDeadlineStudents}
                                onStatusChange=${handleStatusChangeRequest}
                                onShowDetails=${setViewingStudent}
                                onEditDetails=${setEditingStudent}
                                onDelete=${handleDeleteRequest}
                                onRestore=${handleRestoreRequest}
                                onArchive=${handleArchiveRequest}
                                allowArchive=${true}
                                onCommentSave=${handleCommentSave}
                                allowRestore=${true}
                                allowIdEditing=${true}
                                paginated=${true}
                                showDayCounter=${false}
                                showDeadlineBadge=${true}
                            />
                        </div>
                    `}
                    ${activeTab === 'expired' && html`
                        <div key="expired-tab">"""

content = content.replace(expired_tab_match, deadlines_tab_content)


with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
