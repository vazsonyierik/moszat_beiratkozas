import { db, collection, addDoc, serverTimestamp } from '../firebase.js';

const lastNames = ['Kovács', 'Nagy', 'Szabó', 'Tóth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh'];
const firstNamesMale = ['Bence', 'Máté', 'Levente', 'Dávid', 'Balázs', 'Ádám', 'Tamás', 'Péter', 'Zoltán', 'Gábor'];
const firstNamesFemale = ['Anna', 'Hanna', 'Luca', 'Zsófia', 'Lili', 'Eszter', 'Réka', 'Dóra', 'Viktória', 'Nóra'];
const cities = ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár'];
const streets = ['Kossuth Lajos utca', 'Petőfi Sándor utca', 'Ady Endre út', 'Béke tér', 'Szabadság út', 'Fő utca'];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateRandomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}.`;
};

const generateStudentId = () => {
    // Format: 9342/26/0101/XXXX
    return `9342/26/0101/${getRandomInt(1000, 9999)}`;
};

export const generateTestStudents = async (count = 20) => {
    const students = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const isFemale = Math.random() > 0.5;
        const firstName = isFemale ? getRandomElement(firstNamesFemale) : getRandomElement(firstNamesMale);
        const lastName = getRandomElement(lastNames);

        // Age Logic
        const isUnder18 = Math.random() > 0.6; // 40% under 18
        const minAge = isUnder18 ? 16 : 18;
        const maxAge = isUnder18 ? 17 : 45;
        const birthYear = now.getFullYear() - getRandomInt(minAge, maxAge);
        const birthDateObj = generateRandomDate(new Date(birthYear, 0, 1), new Date(birthYear, 11, 31));
        const birthDateStr = formatDate(birthDateObj);

        // Status Logic
        const statuses = ['new', 'paid', 'enrolled', 'completed', 'expired'];
        const statusType = getRandomElement(statuses);

        let statusData = {};
        const regDate = generateRandomDate(new Date(now.getFullYear(), now.getMonth() - 6, 1), now); // Registered in last 6 months

        if (statusType === 'paid') {
            statusData = { status_paid: true };
        } else if (statusType === 'enrolled') {
            statusData = {
                status_paid: true,
                status_enrolled: true,
                enrolledAt: regDate, // Simply reuse date for simplicity or add few days
                studentId: generateStudentId(),
                studentIdAssignedAt: regDate
            };
        } else if (statusType === 'completed') {
            statusData = {
                status_paid: true,
                status_enrolled: true,
                enrolledAt: new Date(regDate.getTime() - 10000000),
                studentId: generateStudentId(),
                studentIdAssignedAt: new Date(regDate.getTime() - 10000000),
                courseCompletedAt: regDate
            };
        } else if (statusType === 'expired') {
            const expiredTypes = ['expired_unpaid', 'expired_not_started', 'expired_elearning_incomplete'];
            statusData = { status: getRandomElement(expiredTypes) };
        }

        // Exam Results Logic
        let examResults = [];
        if (statusData.status_enrolled || statusData.courseCompletedAt) {
            const hasExam = Math.random() > 0.3;
            if (hasExam) {
                const subjects = ['Közlekedési alapismeretek', 'Forgalmi vezetés'];
                const results = ['Megfelelt', 'Nem megfelelt', 'Nem jelent meg', 'Kiírva'];

                const subject = getRandomElement(subjects);
                const result = getRandomElement(results);
                const examDate = generateRandomDate(regDate, new Date(now.getTime() + 1000000000)); // Some in future

                // Format exam date: YYYY.MM.DD. HH:MM
                const y = examDate.getFullYear();
                const m = String(examDate.getMonth() + 1).padStart(2, '0');
                const d = String(examDate.getDate()).padStart(2, '0');
                const h = String(getRandomInt(8, 16)).padStart(2, '0');
                const min = String(getRandomElement([0, 30])).padStart(2, '0');

                examResults.push({
                    subject: subject,
                    date: `${y}.${m}.${d}. ${h}:${min}`,
                    result: result,
                    location: 'Budapest, Petzvál utca',
                    importedAt: new Date().toISOString()
                });
            }
        }

        // Guardian
        const guardianData = isUnder18 ? {
            guardian_name: `${getRandomElement(lastNames)} ${getRandomElement(isFemale ? firstNamesMale : firstNamesFemale)}`, // Just random parent name
            guardian_email: `szulo${getRandomInt(100,999)}@test.com`,
            guardian_phone: `+36 30 ${getRandomInt(1000000, 9999999)}`
        } : {};

        const student = {
            current_prefix: '',
            current_lastName: lastName,
            current_firstName: firstName,
            current_secondName: '',
            birth_prefix: '',
            birth_lastName: lastName,
            birth_firstName: firstName,
            birth_secondName: '',
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(1, 99)}@test.com`,
            phone_number: `+36 20 ${getRandomInt(1000000, 9999999)}`,

            birthDate: birthDateStr,
            birth_country: 'Magyarország',
            birth_city: getRandomElement(cities),
            nationality: 'magyar',

            permanent_address_zip: getRandomInt(1000, 9999).toString(),
            permanent_address_city: getRandomElement(cities),
            permanent_address_street: getRandomElement(streets),
            permanent_address_streetType: 'utca',
            permanent_address_houseNumber: getRandomInt(1, 100).toString(),
            residenceIsSame: true,

            education: 'Gimnázium',
            documentType: 'Személyi igazolvány',
            documentNumber: `${getRandomInt(100000, 999999)}${getRandomElement(['AA', 'BB', 'CC'])}`,
            documentExpiry: formatDate(generateRandomDate(now, new Date(now.getFullYear() + 5, 0, 1))),

            registeredBy: 'admin_generator',
            createdAt: regDate,
            ...statusData,
            ...guardianData,
            examResults: examResults,

            megjegyzes: Math.random() > 0.7 ? 'Teszt generált megjegyzés.' : ''
        };

        students.push(student);
    }

    // Save to Firestore
    const promises = students.map(student => addDoc(collection(db, 'registrations_test'), student));
    await Promise.all(promises);

    return students.length;
};
