import { SendEmailError } from '@bc/notifications/domain/errors';
import type { Email_Service, EmailOptions } from '@bc/notifications/domain/services/email.service';
import { CorrelationLogger } from '@libs/nestjs-common';
import { Injectable, Optional } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

/**
 * SMTP Email Service Adapter
 *
 * This is an adapter in hexagonal architecture - it implements the Email_Service port
 * for production use by actually sending emails via SMTP.
 *
 * Environment variables required:
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_SECURE: Use TLS (true for port 465, false for others) (default: false)
 * - SMTP_USER: SMTP authentication username
 * - SMTP_PASS: SMTP authentication password
 *
 * Example for Gmail:
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_SECURE=false
 * SMTP_USER=your-email@gmail.com
 * SMTP_PASS=your-app-password
 *
 * To switch to this service, update notifications.module.ts:
 * - Change: useClass: Email_InMemoryService
 * - To:     useClass: Email_SmtpService
 */
@Injectable()
export class Email_SmtpService implements Email_Service {
  private readonly logger = new CorrelationLogger(Email_SmtpService.name);

  constructor(@Optional() private transporter?: Transporter) {
    this.transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.logger.log(`SMTP Email Service initialized with host: ${process.env.SMTP_HOST}`);
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      if (!this.transporter) throw new Error('SMTP transporter not configured');

      const from = process.env.SMTP_FROM || 'noreply@example.com';

      this.logger.log(`Sending email to ${options.to.toValue()} from ${from}...`);

      const info = await this.transporter.sendMail({
        from,
        to: options.to.toValue(),
        subject: options.subject.toValue(),
        text: options.body.toValue(),
        html: options.body.toValue(),
      });

      this.logger.log(`✅ Email sent successfully. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to.toValue()}:`, error);
      throw new SendEmailError(options.to.toValue(), error);
    }
  }
}
