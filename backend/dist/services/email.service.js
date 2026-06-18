import { sendEmail, emailTemplates } from '../lib/emailService.js';
export const EmailService = {
    sendWelcomeEmail: async (email, name) => {
        await sendEmail(email, emailTemplates.welcome(name, email).subject, emailTemplates.welcome(name, email).html);
    },
    sendPasswordResetEmail: async (email, name, token) => {
        await sendEmail(email, emailTemplates.passwordReset(name, token).subject, emailTemplates.passwordReset(name, token).html);
    },
    sendPolicyCreatedEmail: async (email, name, policyNumber) => {
        await sendEmail(email, emailTemplates.policyCreated(name, policyNumber).subject, emailTemplates.policyCreated(name, policyNumber).html);
    },
    sendClaimSubmittedEmail: async (email, name, claimNumber) => {
        await sendEmail(email, emailTemplates.claimSubmitted(name, claimNumber).subject, emailTemplates.claimSubmitted(name, claimNumber).html);
    },
    sendStatusUpdateEmail: async (email, name, type, reference, status) => {
        await sendEmail(email, emailTemplates.statusUpdate(name, type, reference, status).subject, emailTemplates.statusUpdate(name, type, reference, status).html);
    },
};
