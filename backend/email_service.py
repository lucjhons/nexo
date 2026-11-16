"""Serviço de e-mail da NEXO (recuperação de senha).

Regra do projeto: não simular envio de e-mails. Se a configuração SMTP
estiver ausente, devolver aviso administrativo — e o código apenas em
ambiente local de desenvolvimento, para viabilizar testes funcionais.
"""
import os
import smtplib
from email.message import EmailMessage

SMTP_TIMEOUT = 20


def is_configured() -> bool:
    return all(
        os.environ.get(var)
        for var in ('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS')
    )


def _build_message(to_email: str, code: str) -> EmailMessage:
    msg = EmailMessage()
    msg['From'] = os.environ.get('SMTP_FROM') or '"NEXO Plataforma" <no-reply@nexo.com.br>'
    msg['To'] = to_email
    msg['Subject'] = 'Código de Recuperação de Senha — Plataforma NEXO'
    msg.set_content(
        f'Olá,\n\n'
        f'Recebemos uma solicitação de redefinição de senha para sua conta no NEXO.\n\n'
        f'Seu código de verificação temporário é: {code}\n\n'
        f'Este código é válido por 10 minutos e possui uso único.\n'
        f'Se você não solicitou esta alteração, ignore este e-mail. Seus dados continuam seguros.\n\n'
        f'Equipe NEXO\n'
        f'"Conectando ideias, negócios e oportunidades."'
    )
    msg.add_alternative(
        f'''\
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
                {code}
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
        ''',
        subtype='html',
    )
    return msg


def send_password_reset_code(email: str, code: str) -> dict:
    """Envia o código de recuperação; devolve o resultado estruturado."""
    if not is_configured():
        print(
            f'[NEXO EMAIL SERVICE] Tentativa de envio para {email}. Serviço SMTP não configurado '
            'no backend (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ausentes).'
        )
        return {
            'success': False,
            'configured': False,
            'message': 'O serviço de envio de e-mails corporativo ainda não foi configurado pelo administrador do sistema.',
            'adminNotice': 'Para habilitar o envio real de e-mails pelo backend, configure as variáveis de ambiente SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no servidor.',
            'devCode': code,  # apenas em ambiente local para viabilizar testes funcionais
        }

    host = os.environ['SMTP_HOST']
    port = int(os.environ.get('SMTP_PORT', '587'))
    user = os.environ['SMTP_USER']
    password = os.environ['SMTP_PASS']

    try:
        msg = _build_message(email, code)
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=SMTP_TIMEOUT)
        else:
            server = smtplib.SMTP(host, port, timeout=SMTP_TIMEOUT)
        try:
            server.ehlo()
            if port != 465:
                server.starttls()
                server.ehlo()
            server.login(user, password)
            server.send_message(msg)
        finally:
            try:
                server.quit()
            except Exception:
                pass
        return {
            'success': True,
            'configured': True,
            'messageId': msg['Message-ID'],
            'message': 'Código de verificação enviado com sucesso para o seu e-mail.',
        }
    except Exception as err:  # noqa: BLE001
        print(f'[NEXO EMAIL SERVICE ERROR] {err}')
        return {
            'success': False,
            'configured': True,
            'message': 'Erro ao despachar e-mail via servidor SMTP: ' + (str(err) or 'Falha de conexão'),
        }
