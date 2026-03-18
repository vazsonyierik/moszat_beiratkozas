const admin = require('firebase-admin');
admin.initializeApp({ projectId: "moszat-jelentkezes" });

const { sendEmail } = require('./utils.js');
const templates = require('./emailTemplates.js');

(async () => {
    const studentData = {
        id: 'test1234',
        email: 'test@example.com',
        current_firstName: 'Test',
        current_lastName: 'User',
        birthDate: '2000.01.01.'
    };

    const template = templates.registrationConfirmation(studentData);
    console.log("Template ID:", template.id);

    try {
        await sendEmail(studentData, template, true);
        console.log("SendEmail finished.");
    } catch (e) {
        console.error("Error expected (since DB is not real):", e.message);
    }
})();
