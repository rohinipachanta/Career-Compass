import { Resend } from "resend";

// Lazy — only instantiated when actually sending (so missing key doesn't crash the server)
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// The "from" address — once you verify a domain on Resend you can change this
// to something like "Winsync <reminders@winsync.app>"
const FROM_ADDRESS = process.env.RESEND_FROM || "Winsync <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "https://winsync-production-42ae.up.railway.app";

export async function sendWeeklyReminderEmail(
  toEmail: string,
  username: string,
  winCount: number
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping weekly reminder email");
    return;
  }

  const resend = getResend();

  const greeting = winCount === 0
    ? `Hey ${username}, it's been a quiet week — that's okay!`
    : winCount === 1
    ? `Hey ${username}, you logged 1 win this week — nice start!`
    : `Hey ${username}, you logged ${winCount} wins this week — great work!`;

  const bodyMessage = winCount === 0
    ? `Even quiet weeks have wins hiding in them — a kind Slack message, a problem you unblocked, feedback you gave someone. Take 2 minutes to log one.`
    : `Keep the momentum going. The more you log now, the easier your next performance review will be.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your weekly Winsync recap</title>
</head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:#2d2d2d;padding:28px 36px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#f5e6c8;letter-spacing:-0.5px;">⚡ Winsync</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a0a0a0;">Your weekly wins recap</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a1a;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">${bodyMessage}</p>

              ${winCount > 0 ? `
              <div style="background:#faf9f7;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">This week</p>
                <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#2d2d2d;">${winCount} win${winCount !== 1 ? "s" : ""} logged</p>
              </div>
              ` : ""}

              <a href="${APP_URL}"
                 style="display:inline-block;background:#2d2d2d;color:#f5e6c8;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">
                Log a win now →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #f0ede8;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You're receiving this because you enabled weekly reminders on Winsync.<br/>
                To turn them off, open the app → Settings → Weekly Reminder.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: winCount === 0
      ? "⚡ Don't let this week slip by — log a win"
      : `⚡ You logged ${winCount} win${winCount !== 1 ? "s" : ""} this week!`,
    html,
  });

  if (error) {
    console.error(`[email] Failed to send reminder to ${toEmail}:`, error);
    throw new Error(error.message);
  }

  console.log(`[email] Weekly reminder sent to ${toEmail}`);
}

export async function sendTestEmail(toEmail: string, username: string): Promise<void> {
  return sendWeeklyReminderEmail(toEmail, username, 3);
}

export async function sendMidweekNudgeEmail(
  toEmail: string,
  username: string,
  day: "Wednesday" | "Friday"
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping midweek nudge email");
    return;
  }

  const resend = getResend();

  const isWednesday = day === "Wednesday";

  const subject = isWednesday
    ? `⚡ Midweek check-in — what's gone well so far?`
    : `⚡ End of week — any wins to capture before the weekend?`;

  const headline = isWednesday
    ? `Hey ${username}, it's Wednesday!`
    : `Hey ${username}, week's almost done!`;

  const body = isWednesday
    ? `Midweek is a great time to log anything that's gone well before it slips from memory — a problem you solved, feedback you received, something you shipped or unblocked.`
    : `Before you close your laptop, take 2 minutes to capture any wins from this week. The small stuff counts too — an email that got a great response, a decision you made, someone you helped.`;

  const cta = isWednesday ? "Log a midweek win →" : "Capture this week's wins →";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:#2d2d2d;padding:28px 36px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#f5e6c8;letter-spacing:-0.5px;">⚡ Winsync</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a0a0a0;">${day} nudge</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 12px;font-size:19px;font-weight:700;color:#1a1a1a;">${headline}</p>
              <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">${body}</p>

              <a href="${APP_URL}"
                 style="display:inline-block;background:#7c5c3a;color:#f5e6c8;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">
                ${cta}
              </a>

              <p style="margin:28px 0 0;font-size:13px;color:#999;line-height:1.6;">
                The more you log throughout the week, the less you'll scramble at review time. Every entry counts.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #f0ede8;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You're receiving this because you enabled weekly reminders on Winsync.<br/>
                To turn them off, open the app → Settings → Weekly Reminder.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject,
    html,
  });

  if (error) {
    console.error(`[email] Failed to send ${day} nudge to ${toEmail}:`, error);
    throw new Error(error.message);
  }

  console.log(`[email] ${day} nudge sent to ${toEmail}`);
}
