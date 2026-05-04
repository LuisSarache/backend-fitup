import nodemailer from "nodemailer";
import { env } from "./env";

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  const port = Number(env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export async function sendPasswordReset(to: string, link: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mailer] SMTP não configurado. Link de reset:", link);
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM ?? "FitUp <noreply@fitup.app>",
    to,
    subject: "Recuperação de senha — FitUp",
    html: `<p>Clique no link para redefinir sua senha: <a href="${link}">${link}</a></p><p>O link expira em 15 minutos.</p>`,
  });
}
