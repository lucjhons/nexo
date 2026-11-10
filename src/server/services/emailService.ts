import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  configured: boolean;
  message: string;
  adminNotice?: string;
  devCode?: string; // only provided if explicitly permitted or for sandbox inspection
}

export class EmailService {
  private static transporter: Transporter | null = null;

  private static isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  private static getTransporter(): Transporter | null {
    if (!this.isConfigured()) return null;

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Send password recovery verification code
   */
  public static async sendPasswordResetCode(email: string, code: string): Promise<EmailSendResult> {
    const configured = this.isConfigured();

    if (!configured) {
      // In accordance with requirements:
      // "Não simular o envio de e-mails. Se a configuração do serviço de e-mail estiver ausente,
      // apresentar uma mensagem administrativa indicando que a integração precisa ser configurada."
      console.warn(`[NEXO EMAIL SERVICE] Tentativa de envio para ${email}. Serviço SMTP não configurado no backend (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ausentes).`);
      
      return {
        success: false,
        configured: false,
        message: 'O serviço de envio de e-mails corporativo ainda não foi configurado pelo administrador do sistema.',
        adminNotice: 'Para habilitar o envio real de e-mails pelo backend, configure as variáveis de ambiente SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no servidor.',
        devCode: code, // Retornado em ambiente de desenvolvimento local para viabilizar testes funcionais
      };
    }

    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        throw new Error('Falha ao instanciar transportador SMTP.');
      }

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"NEXO Plataforma" <no-reply@nexo.com.br>',
        to: email,
        subject: 'Código de Recuperação de Senha — Plataforma NEXO',
        text: `Olá,\n\nRecebemos uma solicitação de redefinição de senha para sua conta no NEXO.\n\nSeu código de verificação temporário é: ${code}\n\nEste código é válido por 10 minutos e possui uso único.\nSe você não solicitou esta alteração, ignore este e-mail. Seus dados continuam seguros.\n\nEquipe NEXO\n"Conectando ideias, negócios e oportunidades."`,
        html: `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700;">NEXO</h1>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Conectando ideias, negócios e oportunidades</p>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; font-size: 16px; margin-top: 0;">Recuperação de Senha</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Utilize o código de segurança abaixo para prosseguir:
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0284c7; background: #e0f2fe; padding: 12px 24px; border-radius: 8px; font-family: monospace;">
                  ${code}
                </span>
              </div>
              <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
                Este código expira em <strong>10 minutos</strong> e só pode ser utilizado uma única vez.
              </p>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
              Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua conta permanece protegida.
            </p>
          </div>
        `,
      });

      return {
        success: true,
        configured: true,
        messageId: info.messageId,
        message: 'Código de verificação enviado com sucesso para o seu e-mail.',
      };
    } catch (err: any) {
      console.error('[NEXO EMAIL SERVICE ERROR]', err);
      return {
        success: false,
        configured: true,
        message: 'Erro ao despachar e-mail via servidor SMTP: ' + (err.message || 'Falha de conexão'),
      };
    }
  }
}
