import nodemailer from "nodemailer";

// Configuração do transporte de email via SMTP
// Usa variáveis de ambiente para credenciais
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM ?? smtpUser ?? "noreply@performancemeta.sbs";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  resetLink: string
): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.error("[Email] SMTP não configurado. Variáveis SMTP_HOST, SMTP_USER, SMTP_PASS são necessárias.");
    return false;
  }

  const smtpFrom = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@performancemeta.sbs";

  try {
    await transporter.sendMail({
      from: `"Meta Dashboard" <${smtpFrom}>`,
      to: toEmail,
      subject: "Recuperação de Senha — Meta Dashboard",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:32px;text-align:center;">
                      <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;margin:0 auto 16px;display:inline-flex;align-items:center;justify-content:center;">
                        <span style="font-size:28px;">🎯</span>
                      </div>
                      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Meta Dashboard</h1>
                      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;">Painel de Gestão de Metas</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:32px;">
                      <h2 style="color:#f1f5f9;margin:0 0 12px;font-size:18px;">Recuperação de Senha</h2>
                      <p style="color:#94a3b8;margin:0 0 24px;font-size:14px;line-height:1.6;">
                        Olá, <strong style="color:#e2e8f0;">${toName}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta.
                      </p>
                      <p style="color:#94a3b8;margin:0 0 24px;font-size:14px;line-height:1.6;">
                        Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong style="color:#e2e8f0;">1 hora</strong>.
                      </p>
                      <!-- CTA Button -->
                      <div style="text-align:center;margin:32px 0;">
                        <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
                          Redefinir Minha Senha
                        </a>
                      </div>
                      <p style="color:#64748b;margin:0 0 8px;font-size:12px;line-height:1.6;">
                        Se o botão não funcionar, copie e cole este link no seu navegador:
                      </p>
                      <p style="color:#3b82f6;margin:0 0 24px;font-size:12px;word-break:break-all;">
                        ${resetLink}
                      </p>
                      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
                      <p style="color:#475569;margin:0;font-size:12px;line-height:1.6;">
                        Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanecerá a mesma.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:rgba(0,0,0,0.2);padding:16px 32px;text-align:center;">
                      <p style="color:#475569;margin:0;font-size:11px;">
                        © 2025 Meta Dashboard · performancemeta.sbs
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    console.log(`[Email] Email de recuperação enviado para ${toEmail}`);
    return true;
  } catch (err) {
    console.error("[Email] Erro ao enviar email:", err);
    return false;
  }
}
