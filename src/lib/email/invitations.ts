import "server-only";
import {
  dispatch,
  type DispatchInput,
  type EmailResult,
} from "./send";

interface InvitationEmailInput {
  to: string;
  inviteeName?: string | null;
  companyName: string;
  invitedByEmail?: string | null;
  suggestedLoginUrl: string;
  acceptApiUrl: string;
  /** Branded reset URL from `buildPasswordResetUrl`, when the account is new. */
  passwordResetLink?: string | null;
  expiresAtIso?: string | null;
}

/** @deprecated Use `EmailResult` from ./send. Kept for existing importers. */
export type InvitationEmailResult = EmailResult;

function displayDate(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // Arabic-Saudi long date; the invitee should not have to parse a UTC string.
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

export function buildInvitationEmail(
  input: InvitationEmailInput,
): DispatchInput {
  const expiresText = displayDate(input.expiresAtIso);
  const target = input.passwordResetLink ?? input.suggestedLoginUrl;

  const rows: Array<[string, string]> = [
    ["الشركة", input.companyName],
    ["البريد الإلكتروني", input.to],
  ];
  if (input.invitedByEmail) {
    rows.push(["الدعوة من", input.invitedByEmail]);
  }
  return {
    to: input.to,
    subject: `دعوة للانضمام إلى ${input.companyName}`,
    heading: "لديك دعوة للانضمام",
    preheader: `${input.companyName} دعتك للانضمام إلى فريقها على المنصة.`,
    blocks: [
      {
        kind: "text",
        value: input.inviteeName?.trim()
          ? `مرحباً ${input.inviteeName.trim()}،`
          : "مرحباً،",
      },
      {
        kind: "text",
        value: `تمت دعوتك للانضمام إلى فريق ${input.companyName} على المنصة.`,
      },
      { kind: "rows", rows },
      ...(expiresText
        ? [
            {
              kind: "note" as const,
              value: `هذه الدعوة صالحة حتى ${expiresText}.`,
            },
          ]
        : []),
    ],
    action: {
      label: input.passwordResetLink
        ? "تعيين كلمة المرور والانضمام"
        : "قبول الدعوة",
      url: target,
    },
    afterAction: [
      { kind: "text", value: "إذا لم يعمل الزر، انسخ الرابط التالي:" },
      { kind: "url", value: target },
    ],
    footNote: `تلقيت هذه الرسالة لأن ${input.companyName} دعتك للانضمام إلى فريقها. إذا لم تكن تتوقع هذه الدعوة، تجاهل الرسالة.`,
  };
}

export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<EmailResult> {
  return dispatch(buildInvitationEmail(input));
}
