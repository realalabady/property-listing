import "server-only";
import { escapeHtml } from "./transport";
import { WAZI_COLORS } from "@/constants/brand";

/**
 * Shared Arabic/RTL shell for every transactional email the app sends.
 *
 * Email clients are not browsers: Outlook has no flexbox or grid, most clients
 * strip <style> blocks, and none of them will load our next/font faces. So this
 * is deliberately table-based with fully inline styles and a system Arabic font
 * stack. Keep it that way when editing.
 *
 * `renderEmail` returns the HTML and the plain-text alternative from the same
 * input so the two can never drift apart the way the old hand-written
 * templates did.
 */

/** A CTA button. Rendered as a padded table cell so Outlook honours it. */
export interface EmailAction {
  label: string;
  url: string;
}

/** One paragraph of body copy, or a label/value table. */
export type EmailBlock =
  | { kind: "text"; value: string }
  /** Renders as a bordered two-column table (label on the right in RTL). */
  | { kind: "rows"; rows: Array<[label: string, value: string]> }
  /** A tinted callout for expiry warnings and security notes. */
  | { kind: "note"; value: string }
  /** The raw URL under a CTA, for clients that don't render the button. */
  | { kind: "url"; value: string }
  /** Checklist of capabilities or next steps. */
  | { kind: "list"; items: string[] };

export interface RenderEmailInput {
  /** App name, from `MailTransport.appName`. Used in the header and footer. */
  appName: string;
  /** <h1> of the email and the basis of the plain-text title. */
  heading: string;
  /**
   * One-line summary shown by inboxes in the preview strip next to the
   * subject. Without it clients scrape the first visible text, which is
   * usually the logo alt text.
   */
  preheader: string;
  /** Body copy shown ABOVE the CTA button. */
  blocks: EmailBlock[];
  action?: EmailAction;
  /**
   * Blocks shown BELOW the CTA — the "if the button doesn't work, copy this
   * link" fallback belongs here, otherwise it reads before the button it is
   * meant to be a fallback for.
   */
  afterAction?: EmailBlock[];
  /** Why this person is receiving the mail. An anti-phishing signal. */
  footNote: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Single quotes are load-bearing: this is interpolated into `style="..."`
 * attributes, so double quotes here would close the attribute early and every
 * declaration after `font-family` would be silently dropped — which is exactly
 * how the CTA lost its white text and fell back to default link styling.
 */
const FONT_STACK = `Tahoma, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

function textBlock(value: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.85;color:${WAZI_COLORS.onWhite};">${escapeHtml(
    value,
  )}</p>`;
}

function noteBlock(value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
      <tr>
        <td style="padding:12px 16px;background:#f6f2fa;border-right:3px solid ${WAZI_COLORS.purple};border-radius:6px;font-size:14px;line-height:1.8;color:${WAZI_COLORS.onWhite};">${escapeHtml(
          value,
        )}</td>
      </tr>
    </table>`;
}

function rowsBlock(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value]) => `<tr>
          <td style="padding:10px 12px;border:1px solid #e8e8ec;background:#fafafa;font-weight:bold;font-size:14px;color:#333;width:35%;">${escapeHtml(
            label,
          )}</td>
          <td style="padding:10px 12px;border:1px solid #e8e8ec;font-size:14px;color:${WAZI_COLORS.onWhite};">${escapeHtml(
            value,
          )}</td>
        </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 20px;">${body}</table>`;
}

/**
 * The raw link under a button. `word-break` matters here: long reset URLs
 * overflow the 600px shell on mobile otherwise.
 */
function urlBlock(value: string): string {
  const safe = escapeHtml(value);
  // Must be a real <a> with an explicit colour: clients auto-linkify bare URLs
  // and paint them their own default blue, which clashes with the purple CTA.
  return `<p style="margin:0 0 16px;font-size:12px;line-height:1.7;word-break:break-all;" dir="ltr"><a href="${safe}" style="color:#7b7b86;text-decoration:underline;">${safe}</a></p>`;
}

/**
 * Checklist. Built from table rows rather than <ul>, because Outlook's list
 * margins are unreliable; the tick is the U+2713 text glyph, not an emoji, so
 * it inherits our colour instead of rendering as a colour-font image.
 */
function listBlock(items: string[]): string {
  const rows = items
    .map(
      (item) => `<tr>
          <td width="26" style="padding:0 0 10px;vertical-align:top;">
            <span style="display:inline-block;width:18px;height:18px;border-radius:9px;background:#e3f7f4;color:${WAZI_COLORS.green};font-size:12px;line-height:18px;text-align:center;font-weight:bold;">&#10003;</span>
          </td>
          <td style="padding:0 0 10px;font-size:14px;line-height:1.75;color:${WAZI_COLORS.onWhite};">${escapeHtml(
            item,
          )}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${rows}</table>`;
}

function renderBlocks(blocks: EmailBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "text":
          return textBlock(block.value);
        case "note":
          return noteBlock(block.value);
        case "rows":
          return rowsBlock(block.rows);
        case "url":
          return urlBlock(block.value);
        case "list":
          return listBlock(block.items);
      }
    })
    .join("\n");
}

function renderAction(action: EmailAction): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
      <tr>
        <td style="border-radius:10px;background:${WAZI_COLORS.purple};">
          <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:13px 30px;font-family:${FONT_STACK};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(
            action.label,
          )}</a>
        </td>
      </tr>
    </table>`;
}

/** The logo lockup: a purple rounded tile plus the wordmark. */
function renderHeader(appName: string): string {
  return `<tr>
      <td style="padding:24px 32px;background:#faf8fc;border-bottom:1px solid #ececf1;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:44px;height:44px;background:${WAZI_COLORS.purple};background-image:linear-gradient(135deg, ${WAZI_COLORS.purple} 0%, ${WAZI_COLORS.blue} 100%);border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;font-weight:bold;line-height:44px;color:#ffffff;">&#1585;</td>
            <td style="padding-right:12px;font-family:${FONT_STACK};font-size:19px;font-weight:bold;color:${WAZI_COLORS.purple};">${escapeHtml(
              appName,
            )}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderEmail(input: RenderEmailInput): RenderedEmail {
  const { appName, heading, preheader, blocks, action, afterAction, footNote } =
    input;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f7;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e8ee;font-family:${FONT_STACK};" dir="rtl">
        <tr>
          <td style="height:4px;line-height:4px;font-size:0;background:${WAZI_COLORS.purple};background-image:linear-gradient(90deg, ${WAZI_COLORS.purple} 0%, ${WAZI_COLORS.blue} 55%, ${WAZI_COLORS.green} 100%);">&nbsp;</td>
        </tr>
        ${renderHeader(appName)}
        <tr>
          <td style="padding:28px 32px 8px;">
            <h1 style="margin:0 0 16px;font-size:21px;line-height:1.5;font-weight:bold;color:#1d1b22;">${escapeHtml(
              heading,
            )}</h1>
            ${renderBlocks(blocks)}
            ${action ? renderAction(action) : ""}
            ${afterAction?.length ? renderBlocks(afterAction) : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 28px;border-top:1px solid #ececf1;">
            <p style="margin:0 0 6px;font-size:12px;line-height:1.8;color:#9a9aa4;">${escapeHtml(
              footNote,
            )}</p>
            <p style="margin:0;font-size:12px;color:#b4b4bd;">&copy; ${new Date().getFullYear()} ${escapeHtml(
              appName,
            )}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const textParts: string[] = [heading, ""];
  const pushBlocks = (list: EmailBlock[]) => {
  for (const block of list) {
    switch (block.kind) {
      case "text":
      case "note":
      case "url":
        textParts.push(block.value, "");
        break;
      case "rows":
        textParts.push(
          ...block.rows.map(([label, value]) => `${label}: ${value}`),
          "",
        );
        break;
      case "list":
        textParts.push(...block.items.map((item) => `- ${item}`), "");
        break;
    }
  }
  };

  pushBlocks(blocks);
  if (action) {
    textParts.push(`${action.label}: ${action.url}`, "");
  }
  if (afterAction?.length) pushBlocks(afterAction);
  textParts.push("---", footNote);

  return { html, text: textParts.join("\n").trim() };
}
