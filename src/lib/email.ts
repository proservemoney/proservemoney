import nodemailer from 'nodemailer';
import { MailtrapTransport } from 'mailtrap';

// Configure Mailtrap transport
const TOKEN = "5faef5bedf8ae80ef82a58e155ad8d1f";

const transport = nodemailer.createTransport(
  MailtrapTransport({
    token: TOKEN,
  })
);

const sender = {
  address: "hello@demomailtrap.co",
  name: "ProserveMoney",
};

/**
 * Send a verification email to a user
 * 
 * @param email - The recipient's email address
 * @param token - The verification token
 * @param name - The recipient's name
 * @returns A promise that resolves when the email is sent
 */
export async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  // Log for debugging
  console.log(`[Email Service] Sending verification email to ${email} for ${name} with token ${token}`);
  
  // For development, also log the verification link
  const verificationLink = `http://localhost:3000/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  console.log(`[Email Service] Verification link: ${verificationLink}`);
  
  try {
    // Send email via Mailtrap
    await transport.sendMail({
      from: sender,
      to: [email],
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${name},</h2>
          <p>Thank you for registering with ProserveMoney. To complete your registration, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>Or copy and paste the following link in your browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
          <p>This link will expire in 30 minutes.</p>
          <p>If you did not sign up for a ProserveMoney account, you can safely ignore this email.</p>
          <p>Best regards,<br>The ProserveMoney Team</p>
        </div>
      `,
      category: "Email Verification",
    });

    console.log(`[Email Service] Email sent successfully to ${email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send verification email:', error);
    throw error;
  }
}

/**
 * Send a verification code email for email verification or 2FA
 * 
 * @param email - The recipient's email address
 * @param code - The verification code (typically a 6-digit number)
 * @param name - The recipient's name
 * @param purpose - The purpose of the code (default is email verification)
 * @returns A promise that resolves when the email is sent
 */
export async function sendVerificationCodeEmail(
  email: string, 
  code: string, 
  name: string,
  purpose: 'Email Verification' | 'Login Verification' = 'Email Verification'
): Promise<void> {
  // Log for debugging
  console.log(`[Email Service] Sending ${purpose} code to ${email} for ${name} with code ${code}`);
  
  // Different subject and content based on purpose
  const subject = purpose === 'Login Verification' 
    ? 'Your Login Verification Code' 
    : 'Verify your email address';
    
  const intro = purpose === 'Login Verification'
    ? 'To complete your login, please use the following verification code:'
    : 'To verify your email address, please use the following code:';
    
  const validityText = purpose === 'Login Verification'
    ? 'This code is valid for 10 minutes.'
    : 'This code is valid for 30 minutes.';
  
  try {
    // Send email via Mailtrap
    await transport.sendMail({
      from: sender,
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${name},</h2>
          <p>${intro}</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f2f2f2; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; display: inline-block; border-radius: 4px;">
              ${code}
            </div>
          </div>
          <p>${validityText}</p>
          <p>If you did not request this code, please ignore this email or contact support if you have concerns.</p>
          <p>Best regards,<br>The ProserveMoney Team</p>
        </div>
      `,
      category: purpose,
    });

    console.log(`[Email Service] Verification code email sent successfully to ${email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send verification code email:', error);
    throw error;
  }
}

/**
 * Send a test email to verify Mailtrap configuration
 * 
 * @param email - The recipient's email address
 * @returns A promise that resolves when the email is sent
 */
export async function sendTestEmail(email: string): Promise<void> {
  try {
    await transport.sendMail({
      from: sender,
      to: [email],
      subject: "ProserveMoney - Email Service Test",
      text: "Congratulations! Your Mailtrap email configuration is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Service Test</h2>
          <p>Congratulations! Your Mailtrap email configuration is working correctly.</p>
          <p>This is a test email sent from the ProserveMoney application.</p>
          <p>Best regards,<br>The ProserveMoney Team</p>
        </div>
      `,
      category: "Test Email",
    });

    console.log(`[Email Service] Test email sent successfully to ${email}`);
  } catch (error) {
    console.error('[Email Service] Failed to send test email:', error);
    throw error;
  }
} 