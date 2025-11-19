function renderReviewEmailHtml(customerName) {
  const name = (customerName || '').trim() || 'Cliente';
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Grazie per il tuo ordine - Pizza Spartaco</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; }
    table { border-collapse: collapse; }
    .email-container { max-width: 600px; margin: 0 auto; }
    .btn-review:hover { opacity: 0.9; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content { padding: 16px !important; }
    }
  </style>
 </head>
 <body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4">
    <tr>
      <td align="center">
        <table class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" bgcolor="#d62828" style="padding: 20px 10px;">
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">Pizza Spartaco</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #ffe6e6;">Grazie per aver ordinato da noi!</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" class="content" style="padding: 24px 32px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; color: #333333;">Ciao <strong>${name}</strong>,</p>
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                grazie per aver effettuato un ordine sul nostro sito! Speriamo che la tua esperienza con
                <strong>Pizza Spartaco</strong> sia stata all’altezza delle tue aspettative.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                La tua opinione per noi è davvero <strong>importantissima</strong>: ci aiuta a migliorare ogni giorno
                e permette anche ad altre persone di scegliere con più sicurezza.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                Ti andrebbe di dedicarci un minuto per lasciare una recensione su Google?
                Anche poche parole fanno la differenza. 🙏
              </p>
              <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  <td align="center" bgcolor="#d62828" style="border-radius: 4px;">
                    <a href="https://www.google.com/search?q=Pizza+Spartaco+Recensioni"
                       target="_blank"
                       class="btn-review"
                       style="display: inline-block; padding: 12px 24px; font-size: 15px; color: #ffffff; text-decoration: none; font-weight: bold;">
                      Lascia una recensione su Google
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #777777; line-height: 1.5; text-align: center;">
                Se il pulsante non dovesse funzionare, copia e incolla questo link nel tuo browser:<br>
                <a href="https://www.google.com/search?q=Pizza+Spartaco+Recensioni"
                   target="_blank"
                   style="color: #d62828; word-break: break-all;">
                  https://www.google.com/search?q=Pizza+Spartaco+Recensioni
                </a>
              </p>
              <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #777777; line-height: 1.5;">
                Grazie ancora per averci scelto!<br>
                A presto,<br>
                <strong>Il team di Pizza Spartaco</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#f4f4f4" style="padding: 12px 10px;">
              <p style="margin: 0; font-size: 11px; color: #999999;">
                Ricevi questa email perché hai effettuato un ordine sul nostro sito.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
 </body>
 </html>`;
}

module.exports = { renderReviewEmailHtml };
