/**
 * js/actions.js
 * This file contains functions for logging admin actions to Firestore.
 */
import { db, collection, addDoc, serverTimestamp } from './firebase.js';

/**
 * Logs an action performed by an administrator.
 * @param {string} adminEmail - The email of the admin performing the action.
 * @param {string} action - A description of the action (e.g., "Státuszváltás: Fizetve").
 * @param {string} studentName - The name of the student affected by the action.
 * @param {string} studentId - The ID of the student document.
 */
export const logAdminAction = async (adminEmail, action, studentName, studentId) => {
    if (!adminEmail) {
        console.error("Admin email is missing, cannot log action.");
        return;
    }
    try {
        await addDoc(collection(db, "admin_logs"), {
            timestamp: serverTimestamp(),
            adminEmail,
            action,
            studentName: studentName || 'N/A',
            studentId: studentId || 'N/A'
        });
    } catch (error) {
        console.error("Error writing admin log:", error);
    }
};
