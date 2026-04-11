import nodemailer from "nodemailer";

export async function sendAlertEmail({
  to,
  subject,
  text
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false
  });

  return transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "alerts@housing.local",
    to,
    subject,
    text
  });
}
