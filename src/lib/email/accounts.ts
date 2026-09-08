import "server-only";
import {
  dispatch,
  type DispatchInput,
  type EmailResult,
} from "./send";

/**
 * Account-lifecycle emails: a person gets an account, or their company goes
 * live. Grouped in one module because they share the same shape (welcome +
 * set-your-password CTA) and differ only in copy.
 *
 * None of these ever carry the generated temporary password. The password is
 * returned in the API response for the admin to hand over out-of-band; the
 * email carries a single-use reset link instead. Mailing a working credential
 * is the thing that makes an email indistinguishable from a phish.
 */

interface AccountEmailBase {
  to: string;
  name?: string | null;
  companyName: string;
  /** Branded reset URL, or null when the account already had a password. */
  resetUrl?: string | null;
  /** Where to sign in once the password is set. */
  loginUrl: string;
}

function greeting(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `مرحباً ${trimmed}،` : "مرحباً،";
}

/**
 * Blocks shared by every "your account is ready" email: either a
 * set-your-password CTA (new account) or a plain sign-in CTA (existing one).
 */
function credentialBlocks(resetUrl?: string | null) {
  if (!resetUrl) return [];
  return [
    {
      kind: "note" as const,
      value:
        "لأمان حسابك، اختر كلمة المرور بنفسك من الرابط أدناه. الرابط صالح لمدة ساعة واحدة.",
    },
  ];
}

/** The "button didn't work" fallback, rendered BELOW the CTA. */
function fallbackLinkBlocks(url: string) {
  return [
    { kind: "text" as const, value: "إذا لم يعمل الزر، انسخ الرابط التالي:" },
    { kind: "url" as const, value: url },
  ];
}

export interface EmployeeWelcomeInput extends AccountEmailBase {
  roleLabel: string;
}

/** Sent when a company creates an employee account directly (not an invite). */
export function buildEmployeeWelcomeEmail(
  input: EmployeeWelcomeInput,
): DispatchInput {
  const target = input.resetUrl ?? input.loginUrl;
  return {
    to: input.to,
    subject: `تم إنشاء حسابك في ${input.companyName}`,
    heading: "تم إنشاء حسابك",
    preheader: `أضافتك ${input.companyName} إلى فريقها. اختر كلمة المرور للبدء.`,
    blocks: [
      { kind: "text", value: greeting(input.name) },
      {
        kind: "text",
        value: `تمت إضافتك إلى فريق ${input.companyName} ويمكنك الآن الوصول إلى لوحة التحكم.`,
      },
      {
        kind: "rows",
        rows: [
          ["الشركة", input.companyName],
          ["الصلاحية", input.roleLabel],
          ["البريد الإلكتروني", input.to],
        ],
      },
      ...credentialBlocks(input.resetUrl),
    ],
    action: {
      label: input.resetUrl ? "تعيين كلمة المرور والدخول" : "تسجيل الدخول",
      url: target,
    },
    afterAction: fallbackLinkBlocks(target),
    footNote: `تلقيت هذه الرسالة لأن ${input.companyName} أنشأت لك حساباً على المنصة. إذا لم تكن تتوقع ذلك، تجاهل الرسالة أو تواصل مع مسؤول الشركة.`,
  };
}

export async function sendEmployeeWelcomeEmail(
  input: EmployeeWelcomeInput,
): Promise<EmailResult> {
  return dispatch(buildEmployeeWelcomeEmail(input));
}

/** Sent when a super-admin provisions the owner account for a company. */
export function buildOwnerWelcomeEmail(
  input: AccountEmailBase,
): DispatchInput {
  const target = input.resetUrl ?? input.loginUrl;
  return {
    to: input.to,
    subject: `حساب مالك ${input.companyName} جاهز`,
    heading: `حساب مالك ${input.companyName} جاهز`,
    preheader: "حسابك كمالك للشركة جاهز. اختر كلمة المرور للبدء.",
    blocks: [
      { kind: "text", value: greeting(input.name) },
      {
        kind: "text",
        value: `تم إنشاء حسابك كمالك لشركة ${input.companyName}. من لوحة التحكم يمكنك إضافة فريقك، ونشر العقارات، ومتابعة العملاء المحتملين.`,
      },
      {
        kind: "rows",
        rows: [
          ["الشركة", input.companyName],
          ["الصلاحية", "مالك الشركة"],
          ["البريد الإلكتروني", input.to],
        ],
      },
      ...credentialBlocks(input.resetUrl),
    ],
    action: {
      label: input.resetUrl
        ? "تعيين كلمة المرور والدخول"
        : "الدخول إلى لوحة التحكم",
      url: target,
    },
    afterAction: fallbackLinkBlocks(target),
    footNote:
      "تلقيت هذه الرسالة لأن حساب مالك شركة أُنشئ بهذا البريد الإلكتروني. إذا لم تكن تتوقع ذلك، تجاهل الرسالة.",
  };
}

export async function sendOwnerWelcomeEmail(
  input: AccountEmailBase,
): Promise<EmailResult> {
  return dispatch(buildOwnerWelcomeEmail(input));
}

/**
 * Sent when a super-admin flips a company to `active` (or restores it).
 * The moment the workspace actually becomes usable.
 */
export function buildCompanyActivatedEmail(input: {
  to: string;
  name?: string | null;
  companyName: string;
  loginUrl: string;
}): DispatchInput {
  return {
    to: input.to,
    subject: `تم تفعيل حساب ${input.companyName}`,
    heading: "تم تفعيل حساب شركتك",
    preheader: `${input.companyName} أصبحت مفعّلة ويمكن لفريقك الدخول الآن.`,
    blocks: [
      { kind: "text", value: greeting(input.name) },
      {
        kind: "text",
        value: `يسعدنا إبلاغك بأن حساب ${input.companyName} أصبح مفعّلاً. يمكنك الآن أنت وفريقك الدخول إلى لوحة التحكم واستخدام جميع المزايا المتاحة في باقتكم.`,
      },
      { kind: "text", value: "ننصح بالبدء بهذه الخطوات:" },
      {
        kind: "list",
        items: [
          "أضف أعضاء فريقك وحدّد صلاحيات كل واحد منهم.",
          "انشر أول عقار مع الصور والموقع على الخريطة.",
          "تابع العملاء المحتملين من لوحة المبيعات أولاً بأول.",
        ],
      },
    ],
    action: { label: "الدخول إلى لوحة التحكم", url: input.loginUrl },
    footNote: `تلقيت هذه الرسالة لأنك مالك حساب ${input.companyName} على المنصة.`,
  };
}

/** Sent to a customer (property seeker) right after they sign up. */
export function buildCustomerWelcomeEmail(input: {
  to: string;
  name?: string | null;
  appUrl: string;
}): DispatchInput {
  return {
    to: input.to,
    subject: "تم إنشاء حسابك — ابدأ البحث عن عقارك",
    heading: "أهلاً بك",
    preheader: "تم إنشاء حسابك بنجاح. ابدأ بالبحث عن عقارك التالي.",
    blocks: [
      { kind: "text", value: greeting(input.name) },
      {
        kind: "text",
        value: "تم إنشاء حسابك بنجاح. من حسابك يمكنك:",
      },
      {
        kind: "list",
        items: [
          "حفظ عمليات البحث والرجوع إليها في أي وقت.",
          "متابعة العقارات التي تهمك ومعرفة أي تغيّر في سعرها.",
          "التواصل مباشرة مع شركات عقارية موثوقة دون وسيط.",
        ],
      },
    ],
    action: { label: "ابدأ البحث", url: input.appUrl },
    footNote:
      "تلقيت هذه الرسالة لأنه تم إنشاء حساب بهذا البريد الإلكتروني. إذا لم تكن أنت، تجاهل الرسالة.",
  };
}

export async function sendCompanyActivatedEmail(
  input: Parameters<typeof buildCompanyActivatedEmail>[0],
): Promise<EmailResult> {
  return dispatch(buildCompanyActivatedEmail(input));
}

export async function sendCustomerWelcomeEmail(
  input: Parameters<typeof buildCustomerWelcomeEmail>[0],
): Promise<EmailResult> {
  return dispatch(buildCustomerWelcomeEmail(input));
}
