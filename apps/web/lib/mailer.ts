import { Resend } from "resend";

export async function sendAlertEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const nodemailer = await import("nodemailer");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT ?? 1025);
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    return transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "alerts@housing.local",
      to,
      subject,
      text,
    });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "Ireland Housing Explorer <onboarding@resend.dev>",
    to: [to],
    subject,
    text,
  });

  if (error) throw new Error(error.message);
}
