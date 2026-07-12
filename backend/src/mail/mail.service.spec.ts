import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

function configWith(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('MailService (spec 8)', () => {
  it("répond 503 avec un message explicite quand SMTP n'est pas configuré", async () => {
    const service = new MailService(configWith({}));
    expect(service.available).toBe(false);
    await expect(
      service.send({ to: ['a@b.ci'], subject: 's', text: 't', attachments: [] }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('envoie via le transport JSON de test et retourne un messageId', async () => {
    const service = new MailService(
      configWith({ SMTP_JSON_TRANSPORT: 'true', MAIL_FROM: 'ao@sirius.ci' }),
    );
    expect(service.available).toBe(true);
    const result = await service.send({
      to: ['client@ageroute.ci'],
      cc: ['direction@sirius.ci'],
      subject: 'Proposition',
      text: 'Ci-joint notre proposition.',
      attachments: [{ filename: 'doc.docx', content: Buffer.from('PK') }],
    });
    expect(result.messageId).toBeTruthy();
  });
});
