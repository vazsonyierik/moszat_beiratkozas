import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# Eltávolítjuk a rosszul beszedett badge logikát, és újraírjuk a Helyes formátumban

badge_bad_match = """${(() => {
                                                if (showDeadlineBadge && reg.deadlineInfo && reg.deadlineInfo.shiftedDate && reg.deadlineInfo.activePhase) {
                                                    const daysRemaining = calculateDaysRemaining(reg.deadlineInfo.shiftedDate);
                                                    if (daysRemaining !== null) {
                                                        let bgColor = 'bg-gray-100 text-gray-800';
                                                        if (daysRemaining < 0) bgColor = 'bg-red-100 text-red-800';
                                                        else if (daysRemaining <= 30) bgColor = 'bg-orange-100 text-orange-800';
                                                        else bgColor = 'bg-green-100 text-green-800';

                                                        const phaseMatch = reg.deadlineInfo.activePhase.match(/Phase (\\\\d+)/);
                                                        const phaseNumber = phaseMatch ? phaseMatch[1] : '';
                                                        const phaseName = phaseNumber ? `${phaseNumber}. Fázis` : 'Határidő';

                                                        const daysLabel = daysRemaining < 0 ? `Letelt (${Math.abs(daysRemaining)} napja)` : `${daysRemaining} nap van hátra`;

                                                        return html`<span className="${'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + bgColor}">${phaseName}: ${daysLabel}</span>`;
                                                    }
                                                }

                                                if (!showDayCounter) return null;

                                                // JAVÍTÁS: Hiányzó 'let' kulcsszavak pótlása
                                                let days = null;"""

content = content.replace(badge_bad_match, """${(() => {
                                                    if (!showDayCounter) return null;

                                                // JAVÍTÁS: Hiányzó 'let' kulcsszavak pótlása
                                                let days = null;""")

badge_match = """${(() => {
                                                    if (!showDayCounter) return null;

                                                // JAVÍTÁS: Hiányzó 'let' kulcsszavak pótlása
                                                let days = null;"""

badge_replacement = """${(() => {
                                                if (showDeadlineBadge && reg.deadlineInfo && reg.deadlineInfo.shiftedDate && reg.deadlineInfo.activePhase) {
                                                    const daysRemaining = calculateDaysRemaining(reg.deadlineInfo.shiftedDate);
                                                    if (daysRemaining !== null) {
                                                        let bgColor = 'bg-gray-100 text-gray-800';
                                                        if (daysRemaining < 0) bgColor = 'bg-red-100 text-red-800';
                                                        else if (daysRemaining <= 30) bgColor = 'bg-orange-100 text-orange-800';
                                                        else bgColor = 'bg-green-100 text-green-800';

                                                        const phaseMatch = reg.deadlineInfo.activePhase.match(/Phase (\\d+)/);
                                                        const phaseNumber = phaseMatch ? phaseMatch[1] : '';
                                                        const phaseName = phaseNumber ? `${phaseNumber}. Fázis` : 'Határidő';

                                                        let daysLabel = '';
                                                        if (daysRemaining < 0) {
                                                            daysLabel = `Letelt (${Math.abs(daysRemaining)} napja)`;
                                                        } else {
                                                            daysLabel = `${daysRemaining} nap van hátra`;
                                                        }

                                                        return html`<span className="${'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + bgColor}">${phaseName}: ${daysLabel}</span>`;
                                                    }
                                                }

                                                if (!showDayCounter) return null;

                                                // JAVÍTÁS: Hiányzó 'let' kulcsszavak pótlása
                                                let days = null;"""

content = content.replace(badge_match, badge_replacement)

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
