import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// ---------------------------------------------------------------------------
// Individual email functions
// ---------------------------------------------------------------------------
export async function sendVerificationEmail(to, firstName, token) {
    const verificationUrl = `${process.env.API_URL || 'http://localhost:5001'}/api/auth/verify-email?token=${token}`;
    const html = `
    <h1>Welcome to Awash Insurance</h1>
    <p>Hello ${firstName},</p>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verificationUrl}">Verify Email</a>
    <p>This link expires in 24 hours.</p>
  `;
    await transporter.sendMail({
        from: `"Awash Insurance" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Verify Your Email – Awash Insurance',
        html,
    });
}
export async function sendWelcomeEmail(to, fullName) {
    await transporter.sendMail({
        from: `"Awash Insurance" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Welcome to Awash Insurance!',
        html: `<h1>Welcome, ${fullName}!</h1><p>Your account has been created successfully.</p>`,
    });
}
export async function sendPasswordResetEmail(to, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
        from: `"Awash Insurance" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Password Reset – Awash Insurance',
        html: `<p>Click the link below to reset your password:</p><a href="${resetUrl}">Reset Password</a>`,
    });
}
export async function sendClaimSubmittedEmail(to, claimNumber) {
    await transporter.sendMail({
        from: `"Awash Insurance" <${process.env.SMTP_USER}>`,
        to,
        subject: `Claim ${claimNumber} Submitted – Awash Insurance`,
        html: `<p>Your claim <strong>${claimNumber}</strong> has been submitted and is being processed.</p>`,
    });
}
export async function sendStatusUpdateEmail(to, fullName, entity, entityNumber, status) {
    await transporter.sendMail({
        from: `"Awash Insurance" <${process.env.SMTP_USER}>`,
        to,
        subject: `${entity} ${entityNumber} – Status Update`,
        html: `<p>Hello ${fullName},</p><p>Your ${entity.toLowerCase()} <strong>${entityNumber}</strong> is now <strong>${status}</strong>.</p>`,
    });
}
export async function sendPolicyCreatedEmail(to, fullName, policyNumber) {
    await transporter.sendMail({
        from: `"Awash Insurance" <${process.env.SMTP_USER}>`,
        to,
        subject: `Policy ${policyNumber} Created – Awash Insurance`,
        html: `<p>Hello ${fullName},</p><p>Your policy <strong>${policyNumber}</strong> has been created.</p>`,
    });
}
// ---------------------------------------------------------------------------
// EmailService class (for backward compatibility)
// ---------------------------------------------------------------------------
export class EmailService {
}
EmailService.sendVerificationEmail = sendVerificationEmail;
EmailService.sendWelcomeEmail = sendWelcomeEmail;
EmailService.sendPasswordResetEmail = sendPasswordResetEmail;
EmailService.sendClaimSubmittedEmail = sendClaimSubmittedEmail;
EmailService.sendStatusUpdateEmail = sendStatusUpdateEmail;
EmailService.sendPolicyCreatedEmail = sendPolicyCreatedEmail;
