// src/services/email.ts
// Email notification service using Nodemailer

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using Nodemailer.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'Attendance System'}" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    // Non-blocking — don't throw, just log
  }
}

/**
 * Send OTP for password reset / email verification.
 */
export async function sendOTPEmail(email: string, otp: string, name: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Your OTP - Attendance System',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Attendance System</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0 0;">Security Verification</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b; margin-top: 0;">Hello, ${name}!</h2>
          <p style="color: #64748b;">Your One-Time Password (OTP) for verification is:</p>
          <div style="background: #f1f5f9; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #3b82f6;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `,
  });
}

/**
 * Send leave status notification to employee.
 */
export async function sendLeaveStatusEmail(
  email: string,
  name: string,
  leaveType: string,
  status: 'approved' | 'rejected',
  fromDate: string,
  toDate: string,
  reason?: string
): Promise<void> {
  const color = status === 'approved' ? '#10b981' : '#ef4444';
  const statusText = status === 'approved' ? 'Approved ✓' : 'Rejected ✗';

  await sendEmail({
    to: email,
    subject: `Leave Request ${statusText} - Attendance System`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: ${color}; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Leave ${statusText}</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your <strong>${leaveType}</strong> leave request has been <strong style="color: ${color};">${status}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; color: #64748b;">From</td><td style="padding: 8px; font-weight: 600;">${fromDate}</td></tr>
            <tr style="background: #f8fafc;"><td style="padding: 8px; color: #64748b;">To</td><td style="padding: 8px; font-weight: 600;">${toDate}</td></tr>
            ${reason ? `<tr><td style="padding: 8px; color: #64748b;">Reason</td><td style="padding: 8px;">${reason}</td></tr>` : ''}
          </table>
        </div>
      </div>
    `,
  });
}
