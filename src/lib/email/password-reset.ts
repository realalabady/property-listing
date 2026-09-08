import "server-only";
import {
  dispatch,
  type DispatchInput,
  type EmailResult,
} from "./send";

interface PasswordResetEmailInput {
  to: string;
  name?: string | null;
  /** Branded URL from `buildPasswordResetUrl` — never a firebaseapp.com link. */
  resetUrl: string;
}

/**
 * Self-service "I forgot my password" email.
 *
 * Deliberately says the password has NOT changed yet: someone who receives
 * this without asking for it should be reassured, not alarmed into clicking.
 */
export function buildPasswordResetEmail(
  input: PasswordResetEmailInput,
): DispatchInput {
  const name = input.name?.trim();
  return {
    to: input.to,
    subject: "إعادة تعيين كلمة المرور",
    heading: "إعادة تعيين كلمة المرور",
    preheader: "رابط إعادة تعيين كلمة المرور الخاص بك صالح لمدة ساعة واحدة.",
    blocks: [
      { kind: "text", value: name ? `مرحباً ${name}،` : "مرحباً،" },
      {
        kind: "text",
        value:
          "وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه لاختيار كلمة مرور جديدة.",
      },
      {
        kind: "note",
        value:
          "هذا الرابط صالح لمدة ساعة واحدة ويُستخدم مرة واحدة فقط. لم يتم تغيير كلمة المرور الحالية بعد.",
      },
    ],
    action: { label: "تعيين كلمة مرور جديدة", url: input.resetUrl },
    afterAction: [
      { kind: "text", value: "إذا لم يعمل الزر، انسخ الرابط التالي:" },
      { kind: "url", value: input.resetUrl },
    ],
    footNote:
      "تلقيت هذه الرسالة لأن أحدهم طلب إعادة تعيين كلمة المرور لهذا البريد. إذا لم تكن أنت، تجاهل الرسالة — حسابك آمن ولم يتغيّر شيء.",
  };
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
): Promise<EmailResult> {
  return dispatch(buildPasswordResetEmail(input));
}
