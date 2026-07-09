// Vercel serverless function: sends an SMS via Twilio's REST API.
// Required env vars (set in Vercel -> Settings -> Environment Variables):
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER   (a Twilio phone number in E.164 format, e.g. +15551234567)

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `+1${digits}`; // assume US number
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, message } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ error: "Missing 'to' or 'message'" });
  }

  if (typeof message !== "string" || message.length > 480) {
    return res.status(400).json({ error: "Message must be a string under 480 characters" });
  }

  const toNumber = normalizePhone(to);
  if (!toNumber) {
    return res.status(400).json({ error: "Enter a valid phone number, e.g. (555) 123-4567" });
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.error("send-sms: missing Twilio env vars");
    return res.status(500).json({ error: "SMS is not configured on the server yet" });
  }

  try {
    const body = new URLSearchParams({
      To: toNumber,
      From: TWILIO_FROM_NUMBER,
      Body: message,
    });

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio error:", data);
      return res.status(twilioRes.status).json({ error: data.message || "Failed to send SMS" });
    }

    return res.status(200).json({ success: true, sid: data.sid });
  } catch (err) {
    console.error("send-sms error:", err);
    return res.status(500).json({ error: err.message });
  }
}
