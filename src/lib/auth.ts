import { betterAuth } from "better-auth";
import { emailOTP, magicLink } from "better-auth/plugins";
import { Pool } from "pg";

export function authConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL &&
    process.env.RESEND_API_KEY &&
    process.env.AUTH_EMAIL_FROM,
  );
}
async function sendEmail(email: string, subject: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM, to: [email], subject, text }),
  });
  if (!response.ok) throw new Error("The sign-in email could not be delivered.");
}
export function createAuth() {
  return betterAuth({
    appName: "Substition",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: new Pool({ connectionString: process.env.DATABASE_URL, max: 3 }),
    trustedOrigins: [process.env.BETTER_AUTH_URL!],
    emailAndPassword: { enabled: false },
    session: { expiresIn: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    rateLimit: { enabled: true, window: 60, max: 20, storage: "database" },
    plugins: [
      magicLink({
        storeToken: "hashed",
        expiresIn: 300,
        rateLimit: { window: 60, max: 3 },
        sendMagicLink: async ({ email, url }) =>
          sendEmail(
            email,
            "Your Substition sign-in link",
            `Sign in to Substition: ${url}\n\nThis link expires in 5 minutes. It does not unlock your device vault. If you did not request it, ignore this email.`,
          ),
      }),
      emailOTP({
        storeOTP: "hashed",
        expiresIn: 300,
        otpLength: 6,
        allowedAttempts: 3,
        sendVerificationOTP: async ({ email, otp }) =>
          sendEmail(
            email,
            "Your Substition sign-in code",
            `Your code is ${otp}. It expires in 5 minutes. Never share it. Your local vault passphrase is separate.`,
          ),
      }),
    ],
  });
}
let auth: ReturnType<typeof createAuth> | null = null;
export function getAuth() {
  if (!authConfigured()) return null;
  return (auth ??= createAuth());
}
