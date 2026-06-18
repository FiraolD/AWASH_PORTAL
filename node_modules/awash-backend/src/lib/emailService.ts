import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const emailTemplates = {
  welcome: (name: string, email: string) => ({
    subject: 'Welcome to Awash Insurance',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A3E6F;">Welcome to Awash Insurance!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for joining Awash Insurance. Your account has been successfully created.</p>
        <p>You can now:</p>
        <ul>
          <li>Purchase insurance policies online</li>
          <li>File and track claims</li>
          <li>Make premium payments</li>
          <li>Access your policy documents</li>
        </ul>
        <p>To get started, please log in to your dashboard.</p>
        <br>
        <p>Best regards,<br>Awash Insurance Team</p>
      </div>
    `,
  }),
  
  passwordReset: (name: string, resetToken: string) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A3E6F;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" style="display: inline-block; padding: 10px 20px; background-color: #1A3E6F; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Awash Insurance Team</p>
      </div>
    `,
  }),
  
  policyCreated: (name: string, policyNumber: string) => ({
    subject: 'Policy Created Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A3E6F;">Policy Created Successfully</h2>
        <p>Dear ${name},</p>
        <p>Your policy has been created successfully.</p>
        <p><strong>Policy Number:</strong> ${policyNumber}</p>
        <p>You can view your policy details in your dashboard.</p>
        <br>
        <p>Best regards,<br>Awash Insurance Team</p>
      </div>
    `,
  }),
  
  claimSubmitted: (name: string, claimNumber: string) => ({
    subject: 'Claim Submitted Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A3E6F;">Claim Submitted Successfully</h2>
        <p>Dear ${name},</p>
        <p>Your claim has been submitted successfully.</p>
        <p><strong>Claim Number:</strong> ${claimNumber}</p>
        <p>Our team will review your claim and update you on the status.</p>
        <br>
        <p>Best regards,<br>Awash Insurance Team</p>
      </div>
    `,
  }),
  
  statusUpdate: (name: string, type: string, reference: string, status: string) => ({
    subject: `${type} Status Update`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A3E6F;">${type} Status Updated</h2>
        <p>Dear ${name},</p>
        <p>Your ${type.toLowerCase()} <strong>${reference}</strong> has been updated to: <strong>${status}</strong></p>
        <p>Log in to your dashboard for more details.</p>
        <br>
        <p>Best regards,<br>Awash Insurance Team</p>
      </div>
    `,
  }),
};

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Awash Insurance" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}