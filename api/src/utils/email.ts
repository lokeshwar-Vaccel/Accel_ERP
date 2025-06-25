import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = (to: string, subject: string, html: string) => {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html
  });
};