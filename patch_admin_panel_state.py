import re

with open('js/AdminPanel.js', 'r') as f:
    content = f.read()

# 1. Hozzáadjuk a state változókat
state_hook_pos = content.find('const [expiredFilter, setExpiredFilter] = useState(\'all\');')
state_code = """const [deadlinePhaseFilter, setDeadlinePhaseFilter] = useState('all');
    const [deadlineStatusFilter, setDeadlineStatusFilter] = useState('all');
    """

if state_hook_pos != -1:
    content = content[:state_hook_pos] + state_code + content[state_hook_pos:]


# 2. Hozzáadjuk a useMemo-t a filteredExpiredStudents után
expired_students_end_pos = content.find('}, [allExpiredRegistrations, expiredFilter]);')
if expired_students_end_pos != -1:
    end_of_block = expired_students_end_pos + len('}, [allExpiredRegistrations, expiredFilter]);')

    use_memo_code = """

    const filteredDeadlineStudents = useMemo(() => {
        let students = registrations.filter(reg => reg.deadlineInfo && reg.deadlineInfo.shiftedDate);

        if (deadlinePhaseFilter !== 'all') {
            students = students.filter(reg =>
                reg.deadlineInfo.activePhase &&
                reg.deadlineInfo.activePhase.includes('Phase ' + deadlinePhaseFilter)
            );
        }

        if (deadlineStatusFilter !== 'all') {
            students = students.filter(reg => {
                const daysRemaining = calculateDaysRemaining(reg.deadlineInfo.shiftedDate);
                if (daysRemaining === null) return false;

                if (deadlineStatusFilter === 'ok') {
                    return daysRemaining > 30;
                } else if (deadlineStatusFilter === 'warning') {
                    return daysRemaining <= 30 && daysRemaining >= 0;
                } else if (deadlineStatusFilter === 'expired') {
                    return daysRemaining < 0;
                }
                return true;
            });
        }

        return students.sort((a, b) => {
            const daysA = calculateDaysRemaining(a.deadlineInfo.shiftedDate);
            const daysB = calculateDaysRemaining(b.deadlineInfo.shiftedDate);
            if (daysA === null && daysB === null) return 0;
            if (daysA === null) return 1;
            if (daysB === null) return -1;
            return daysA - daysB;
        });
    }, [registrations, deadlinePhaseFilter, deadlineStatusFilter]);"""

    content = content[:end_of_block] + use_memo_code + content[end_of_block:]

with open('js/AdminPanel.js', 'w') as f:
    f.write(content)
