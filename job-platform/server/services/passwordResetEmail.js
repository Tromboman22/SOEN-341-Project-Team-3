const RESEND_API_URL = "https://api.resend.com/emails";

export const isPasswordResetEmailConfigured = () =>
  Boolean(
    process.env.RESEND_API_KEY &&
      process.env.PASSWORD_RESET_FROM &&
      process.env.CLIENT_URL
  );

export const createPasswordResetUrl = (token) => {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) throw new Error("CLIENT_URL is not configured");

  const url = new URL("/reset-password", clientUrl);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("CLIENT_URL must use HTTP or HTTPS");
  url.searchParams.set("token", token);
  return url.toString();
};

export const sendPasswordResetEmail = async ({ to, token }) => {
  const { RESEND_API_KEY, PASSWORD_RESET_FROM } = process.env;
  if (!RESEND_API_KEY || !PASSWORD_RESET_FROM)
    throw new Error("Password reset email is not configured");

  const resetUrl = createPasswordResetUrl(token);
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: PASSWORD_RESET_FROM,
      to: [to],
      subject: "Reset your CareerConnect password",
      text: `Use this link to reset your password. It expires in 1 hour:\n\n${resetUrl}`,
      html: `<p>Use the link below to reset your CareerConnect password. It expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
    }),
  });

  if (!response.ok)
    throw new Error(`Email provider returned HTTP ${response.status}`);
};
