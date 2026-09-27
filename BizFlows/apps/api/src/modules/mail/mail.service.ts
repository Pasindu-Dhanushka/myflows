import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

    const verificationUrl = `${webOrigin}/verify-email?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your BizFlows email address',

      text: `Verify your email by opening this link: ${verificationUrl}`,

      html: `
        <h2>Verify your BizFlows email address</h2>

        <p>Thanks for creating your BizFlows account.</p>

        <p>
          <a href="${verificationUrl}">
            Verify email address
          </a>
        </p>

        <p>This verification link expires in 1 hour.</p>
      `,
    });
  }
}