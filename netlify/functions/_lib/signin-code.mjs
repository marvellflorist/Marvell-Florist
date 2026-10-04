/**
 * The sign-in code: minted by Supabase, delivered by Brevo.
 *
 * Both doors into the account need this and they need it to behave identically,
 * so it lives here rather than twice:
 *
 *   /api/account/request-code   an existing account asking to be let back in
 *   /api/account/register       a new account finishing the form
 *
 * What is deliberately NOT here is any decision about whether the address is
 * allowed a code. That belongs to the caller, because the two callers answer
 * it differently: request-code refuses an address with no account,
 * register has just made the row it is about to verify. Putting the check here
 * would collapse that distinction, which is the bug this module was split out
 * during.
 *
 * Nothing in this file logs, stores or returns the code. The length is
 * reported, measured from the real code rather than assumed, because the
 * interface sizes its field from it and Supabase's OTP length is a project
 * setting.
 */

import { sendTransactionalEmail } from "./brevo.mjs";
import { config as settings } from "./env.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * One face, and no second.
 *
 * The name is the wordmark itself, served as an image, because a webfont is
 * the one thing an email client is most likely to throw away: Gmail strips
 * @font-face outright, and what arrived instead was the name set in a plain
 * sans, which is not the name. Every other word, the code included, is
 * Helvetica, where a digit is unambiguous at a glance.
 *
 * Both images live under /email/ rather than /assets/, and that separation is
 * the point. /assets/ is the website's working directory: files move, get
 * renamed and get replaced there as the site is built. An email is read long
 * after it is sent, from a client that will refetch the image years later,
 * so its images need a shelf nothing routinely tidies. /email/ is that shelf.
 * Nothing on the site links to it and no page depends on it.
 *
 * Absolute, and pointed at the public origin, never at settings.siteOrigin.
 * Gmail fetches through its own image proxy, which has no route to localhost.
 *
 * Both are also sized: the PNG is flattened onto white rather than left
 * transparent, because Gmail's mobile dark mode inverts the card behind it
 * and black letters on a transparent ground simply vanish. The JPEG is
 * baseline rather than progressive, which older clients decode more reliably.
 */
/**
 * Neither image is cropped or rescaled. Both are shipped at their native
 * pixel size and the display box below is a true fraction of it, so the
 * client does the scaling and the mark keeps its proportions exactly.
 *
 * The wordmark is 1200x144, which is 25:3, and its letterforms run right to
 * the edge of the canvas with no transparent margin at all. That is why the
 * display box has to stay on that ratio: any height rounded off a width that
 * is not a multiple of 25 squashes the glyphs at the boundary, which reads as
 * a crop. 250x30 is the multiple nearest the size we want.
 *
 * Breathing room around the mark belongs to the layout, not to the file, so
 * it comes from the card's own padding rather than from baked-in margin.
 */
const WORDMARK = { path: "/email/logo.png", width: 250, height: 30 };
const PHOTOGRAPH = { path: "/email/my-marvell-welcome.jpg", width: 520, height: 347 };

/**
 * Read at send time rather than at import time.
 *
 * A module-level constant would bake in whatever the environment looked like
 * when the function was first loaded, which is the wrong moment: it is the
 * send that needs the origin, and freezing it there makes the setting
 * impossible to exercise.
 */
function assetUrl({ path }) {
  return `${settings.emailAssetOrigin}${path}`;
}
const TEXT_STACK = "Helvetica Neue, Helvetica, Arial, sans-serif";

/**
 * Every image carries width and height as attributes as well as in the style.
 *
 * A client with images turned off draws the box from the attributes, so the
 * message keeps its shape instead of collapsing into a stack of text; a
 * client with images on scales to max-width and ignores them.
 */
function image({ src, alt, width, height, block = false }) {
  const display = block ? "block" : "inline-block";
  return `<img src="${src}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" `
    + `style="display:${display};width:100%;max-width:${width}px;height:auto;`
    + `border:0;outline:none;text-decoration:none;">`;
}

/** What an account is actually for. Sentences, not a bulleted list. */
const BENEFITS = [
  "Follow your orders as they are made and delivered, and keep your order history in one place.",
  "Save the pieces you love, share them, and hear what we would suggest beside them.",
  "Know first about new collections, seasonal releases and what is happening in the workroom.",
  "Keep your details and preferences ready, so ordering takes a moment."
];

const PARAGRAPH = `margin:0 0 20px;font-family:${TEXT_STACK};font-size:15px;line-height:1.7;color:#211d19;`;
const QUIET = `margin:0;font-family:${TEXT_STACK};font-size:12px;line-height:1.7;color:#817970;`;

/**
 * The wordmark, and the card it sits on.
 *
 * Both messages open the same way and close on the same quiet line, so the
 * two share a shell and differ only in what goes between. The wordmark's
 * alt text is the name, so an account holder who blocks images still reads
 * who wrote to them before anything else.
 */
function shell(contents) {
  return `
    <div style="background:#f8f6f2;padding:36px 16px;font-family:${TEXT_STACK};color:#211d19;">
      <div style="max-width:520px;margin:0 auto;background:#fff;">
        <div style="padding:46px 40px 32px;text-align:center;">
          ${image({ ...WORDMARK, src: assetUrl(WORDMARK), alt: "Marvell Florist" })}
        </div>
${contents}
      </div>
    </div>
  `;
}

/**
 * The code, set as the last word of the sentence that asks for it.
 *
 * Not a panel and not a button. A line drawn around the text is a form, and
 * a row of asterisks is a specification. Neither is how we speak.
 */
function codeLine(ask, code) {
  return `<p style="margin:28px 0 24px;font-family:${TEXT_STACK};font-size:15px;line-height:1.7;color:#211d19;">`
    + `${escapeHtml(ask)} <strong style="font-family:${TEXT_STACK};font-weight:700;letter-spacing:.08em;">`
    + `${escapeHtml(code)}</strong></p>`;
}

/**
 * Signing back in: the code, and almost nothing else.
 *
 * Somebody already has an account. They are not being sold one, they are
 * being let back in, and the only thing they came to this message for is the
 * eight digits. No photograph, no list of what an account is for. Whatever
 * sits between the wordmark and the code is time spent looking for it.
 *
 * They are greeted without a name rather than with a guess: request-code
 * knows the address and nothing more.
 */
function signInBody({ code, link, email }) {
  return shell(`
        <div style="padding:8px 40px 46px;">
          <p style="${PARAGRAPH}">Dear Customer,</p>
          <p style="${PARAGRAPH}">Your sign-in code for My Marvell.</p>
          ${codeLine("To sign in, please enter the following verification code:", code)}
          <p style="${PARAGRAPH}">Your account is registered with the following information:</p>
          <p style="${PARAGRAPH}">Username: <a href="mailto:${escapeHtml(email)}" style="color:#211d19;">${escapeHtml(email)}</a></p>
          <p style="${PARAGRAPH}">You can also <a href="${escapeHtml(link)}" style="color:#211d19;">open your account from this email</a>.</p>
          <p style="${QUIET}">This code expires shortly. We will never ask you for it by phone, by message or by reply. If you did not request it, you can ignore this email and nothing will change.</p>
        </div>`);
}

/**
 * Finishing a new account: the photograph, the greeting, and the code.
 *
 * This one is allowed to be a welcome, because it is the first thing Marvell
 * has ever sent this person. It still carries the code, and it has to: the
 * account does not exist until the code is entered, so an activation mail
 * without one would be an invitation to a door that cannot open.
 *
 * `name` is used when we have it, which is registration.
 */
function welcomeBody({ code, link, email, name = "" }) {
  const greeting = name ? `Dear ${escapeHtml(name)},` : "Dear Customer,";
  const benefits = BENEFITS.map((line) => `<p style="${PARAGRAPH}">${escapeHtml(line)}</p>`).join("");

  return shell(`
        ${image({ ...PHOTOGRAPH, src: assetUrl(PHOTOGRAPH), alt: "", block: true })}

        <div style="padding:38px 40px 46px;">
          <p style="${PARAGRAPH}">${greeting}</p>
          <p style="${PARAGRAPH}">Welcome to Marvell Florist.</p>
          <p style="${PARAGRAPH}">Enjoy a more personal experience with Marvell.</p>
          ${benefits}
          ${codeLine("To finish creating your account, please enter the following verification code:", code)}
          <p style="${PARAGRAPH}">Your account will be registered with the following information:</p>
          <p style="${PARAGRAPH}">Username: <a href="mailto:${escapeHtml(email)}" style="color:#211d19;">${escapeHtml(email)}</a></p>
          <p style="${PARAGRAPH}">You can also <a href="${escapeHtml(link)}" style="color:#211d19;">open My Marvell from this email</a>.</p>
          <p style="${QUIET}">This code expires shortly. If you did not request it, you can ignore this email.</p>
        </div>`);
}

function emailBody(message) {
  return message.registering ? welcomeBody(message) : signInBody(message);
}

/**
 * The plain text, which is not a fallback.
 *
 * It is what a screen reader, a watch and a blocked-image inbox actually
 * read, so it carries the same two shapes: the sign-in note is short because
 * the message is short, and the welcome says what the account is for.
 */
function emailText({ code, link, email, name = "", registering = false }) {
  const greeting = name ? `Dear ${name},` : "Dear Customer,";
  const lines = registering
    ? [
        greeting,
        "",
        "Welcome to Marvell Florist.",
        "",
        "Enjoy a more personal experience with Marvell.",
        "",
        BENEFITS.join("\n\n"),
        "",
        `To finish creating your account, please enter the following verification code: ${code}`,
        "",
        "Your account will be registered with the following information:",
        "",
        `Username: ${email}`,
        "",
        `You can also open My Marvell from this email: ${link}`,
        "",
        "This code expires shortly. If you did not request it, you can ignore this email."
      ]
    : [
        greeting,
        "",
        "Your sign-in code for My Marvell.",
        "",
        `To sign in, please enter the following verification code: ${code}`,
        "",
        "Your account is registered with the following information:",
        "",
        `Username: ${email}`,
        "",
        `You can also open your account from this email: ${link}`,
        "",
        "This code expires shortly. We will never ask you for it by phone, by message or by reply. If you did not request it, you can ignore this email and nothing will change."
      ];
  return ["MARVELL FLORIST", "", ...lines].join("\n");
}

/**
 * Generates a one-time code for an address Supabase already knows, and mails
 * it. Returns the code's length, and nothing else about it.
 *
 * The link in the mail is ours, not Supabase's: Supabase's own action link
 * finishes with the session in a URL fragment, where page script, history and
 * referrers can all reach it. Ours is exchanged for httpOnly cookies
 * server-side by /api/account/confirm.
 *
 * Throws if the address has no auth user. Every caller has already decided
 * that question and created the user if it was theirs to create, so reaching
 * that branch is a bug rather than an ordinary outcome.
 */
export async function sendSignInCode(serviceClient, email, next = "/", { name = "", registering = false } = {}) {
  const link = await serviceClient.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;

  const code = link.data?.properties?.email_otp;
  const hash = link.data?.properties?.hashed_token;
  if (!code || !hash) throw new Error("supabase returned no sign-in code");

  const confirm = new URL("/api/account/confirm", settings.siteOrigin);
  confirm.searchParams.set("token_hash", hash);
  confirm.searchParams.set("next", next);

  const message = { code, link: confirm.toString(), email, name, registering };

  await sendTransactionalEmail({
    to: email,
    subject: registering ? "Your Marvell account verification code" : "Your Marvell account sign-in code",
    sender: settings.brevoAccountSender,
    html: emailBody(message),
    text: emailText(message)
  });

  return { codeLength: code.length };
}

/** Only a path on this site. An open redirect on a sign-in link is a gift. */
export function safeNext(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw.slice(0, 200);
}
