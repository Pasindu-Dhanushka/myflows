import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST?.trim() || 'localhost';
    const port = Number.parseInt(process.env.SMTP_PORT ?? '1025', 10);
    const secure = process.env.SMTP_SECURE === 'true';

    const user = process.env.SMTP_USER?.trim();
    const password = process.env.SMTP_PASSWORD?.trim();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && password
        ? {
            auth: {
              user,
              pass: password,
            },
          }
        : {}),
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    expiresInMinutes: number,
  ): Promise<void> {
    const from =
      process.env.SMTP_FROM?.trim() || 'BizFlows <no-reply@bizflows.local>';

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Reset your BizFlows password',
      text: [
        'A password reset was requested for your BizFlows account.',
        '',
        `Reset your password: ${resetUrl}`,
        '',
        `This link expires in ${expiresInMinutes} minutes.`,
        '',
        'If you did not request this reset, you can ignore this email.',
      ].join('\n'),
      html: `
        <h2>Reset your BizFlows password</h2>

        <p>
          A password reset was requested for your BizFlows account.
        </p>

        <p>
          <a href="${resetUrl}">Reset password</a>
        </p>

        <p>
          This link expires in ${expiresInMinutes} minutes.
        </p>

        <p>
          If you did not request this reset, you can safely ignore this email.
        </p>
      `,
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const webOrigin = process.env.WEB_ORIGIN?.trim() || 'http://localhost:3000';

    const verificationUrl = `${webOrigin}/verify-email?token=${encodeURIComponent(token)}`;

    const from =
      process.env.SMTP_FROM?.trim() || 'BizFlows <no-reply@bizflows.local>';

    await this.transporter.sendMail({
      from,
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
