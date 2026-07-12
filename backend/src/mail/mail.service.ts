import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

/**
 * Envoi d'emails via SMTP (spec 8 — diffusion des livrables).
 * Configuration par variables d'environnement ; sans configuration, les
 * endpoints d'envoi répondent 503 avec un message explicite.
 * SMTP_JSON_TRANSPORT=true : transport de test (aucun email réel envoyé).
 */
@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from =
      config.get<string>('MAIL_FROM') ?? 'propositions-ao@localhost';

    if (config.get('SMTP_JSON_TRANSPORT') === 'true') {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else if (config.get<string>('SMTP_HOST')) {
      this.transporter = nodemailer.createTransport({
        host: config.get<string>('SMTP_HOST'),
        port: Number(config.get('SMTP_PORT') ?? 587),
        secure: config.get('SMTP_SECURE') === 'true',
        auth: config.get<string>('SMTP_USER')
          ? {
              user: config.get<string>('SMTP_USER'),
              pass: config.get<string>('SMTP_PASS'),
            }
          : undefined,
      });
    } else {
      this.transporter = null;
    }
  }

  get available(): boolean {
    return this.transporter !== null;
  }

  async send(options: {
    to: string[];
    cc?: string[];
    subject: string;
    text: string;
    attachments: MailAttachment[];
  }): Promise<{ messageId: string | null }> {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        "L'envoi d'email n'est pas configuré : définissez SMTP_HOST (et SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM) dans l'environnement.",
      );
    }
    const info = await this.transporter.sendMail({
      from: this.from,
      to: options.to.join(', '),
      cc: options.cc?.length ? options.cc.join(', ') : undefined,
      subject: options.subject,
      text: options.text,
      attachments: options.attachments,
    });
    return { messageId: info.messageId ?? null };
  }
}
