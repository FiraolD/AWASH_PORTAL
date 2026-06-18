import { sendEmail, emailTemplates } from '../lib/emailService.js';

export const EmailService = {
  sendWelcomeEmail: async (email: string, name: string) => {
    await sendEmail(
      email,
      emailTemplates.welcome(name, email).subject,
      emailTemplates.welcome(name, email).html
    );
  },

  sendPasswordResetEmail: async (email: string, name: string, token: string) => {
    await sendEmail(
      email,
      emailTemplates.passwordReset(name, token).subject,
      emailTemplates.passwordReset(name, token).html
    );
  },

  sendPolicyCreatedEmail: async (email: string, name: string, policyNumber: string) => {
    await sendEmail(
      email,
      emailTemplates.policyCreated(name, policyNumber).subject,
      emailTemplates.policyCreated(name, policyNumber).html
    );
  },

  sendClaimSubmittedEmail: async (email: string, name: string, claimNumber: string) => {
    await sendEmail(
      email,
      emailTemplates.claimSubmitted(name, claimNumber).subject,
      emailTemplates.claimSubmitted(name, claimNumber).html
    );
  },

  sendStatusUpdateEmail: async (email: string, name: string, type: string, reference: string, status: string) => {
    await sendEmail(
      email,
      emailTemplates.statusUpdate(name, type, reference, status).subject,
      emailTemplates.statusUpdate(name, type, reference, status).html
    );
  },
};