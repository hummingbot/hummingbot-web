// Server code only: importing this from a client component fails the build
// instead of shipping secrets' code paths to the browser.
import "server-only"
import { Resend } from "resend"
import { marked } from "marked"
import { DEFAULT_EMAIL_SIGNATURE } from "./email-signature"

// Resend client - only initialize if API key is set. Lazy so standalone tsx
// scripts that call dotenv's config() before sending (after this module's
// imports are already evaluated) still see the API key: env vars aren't
// read until the first send, not at import time.
let _resend: Resend | null | undefined
export function getResend(): Resend | null {
  if (_resend === undefined) {
    _resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  }
  return _resend
}

// Get app URL for links
const getAppUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Escapes user-generated text (names, strategy titles) dropped into HTML
// bodies, and everything the helpers below interpolate. Unescaped, a strategy
// titled "XRPL <> Kraken" swallows the sentence around it, and one titled with
// markup puts links or a fake form in an email sent from our own address.
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

// Simple email wrapper - clean plain-text style matching broadcast emails
const simpleEmailWrapper = (content: string, options: { preHeaderText?: string; unsubscribeUrl?: string } = {}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Botcamp</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #1a1a1a; background-color: #ffffff; margin: 0; padding: 40px 20px;">
  ${options.preHeaderText ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(options.preHeaderText)}</div>` : ''}

  <div style="max-width: 600px; margin: 0 auto;">
    ${content}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 13px; color: #666666;">
      <p style="margin: 0;">
        <a href="https://www.botcamp.xyz/" style="color: #666666; text-decoration: none;">Botcamp</a> · Learn Algorithmic Trading
      </p>
      <p style="margin: 8px 0 0 0;">
        <a href="mailto:operations@botcamp.xyz" style="color: #666666; text-decoration: underline;">Contact us</a>
        ${options.unsubscribeUrl ? ` · <a href="${options.unsubscribeUrl}" style="color: #666666; text-decoration: underline;">Unsubscribe</a>` : ''}
      </p>
    </div>
  </div>
</body>
</html>`

// Simple link-style button
const simpleButton = (text: string, href: string) => `
  <p style="margin: 24px 0;">
    <a href="${escapeHtml(href)}" style="display: inline-block; background: #0da57a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
      ${escapeHtml(text)}
    </a>
  </p>`

// Plain-link CTA — matches the broadcast/newsletter style (a colored inline
// link, no button box). Used by the welcome-series emails instead of
// simpleButton, which is reserved for one-off transactional emails
// (password reset, verification) where a single heavier CTA makes sense.
const simpleLink = (text: string, href: string) => `
  <p style="margin: 16px 0;">
    <a href="${escapeHtml(href)}" style="color: #0da57a; font-weight: 600; text-decoration: none;">${escapeHtml(text)}</a>
  </p>`

// Simple highlight box for important info (verification codes, amounts, etc.)
const highlightBox = (label: string, value: string) => `
  <div style="margin: 20px 0; padding: 16px 20px; background: #f5f5f5; border-radius: 6px;">
    <p style="margin: 0 0 4px 0; color: #666666; font-size: 14px;">${escapeHtml(label)}</p>
    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">${escapeHtml(value)}</p>
  </div>`

// Signature - shared with the admin broadcast composer via DEFAULT_EMAIL_SIGNATURE.
// Rendered from the same Markdown so every email carries one consistent footer.
const signature = () => `
  <div style="margin: 30px 0 0 0; font-size: 14px; color: #666666;">
    ${marked.parse(DEFAULT_EMAIL_SIGNATURE, { async: false, gfm: true, breaks: true }) as string}
  </div>`

// Plain text signature for text-only emails - derived from the same Markdown
const textSignature = () =>
  "\n" +
  DEFAULT_EMAIL_SIGNATURE
    .replace(/\[([^\]]+)\]\(mailto:[^)]+\)/g, "$1") // email links -> just the address
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2") // other links -> "label: url"
    .replace(/\*\*/g, "") // drop bold markers

// Email templates
export const emailTemplates = {
  purchaseConfirmation: (params: {
    userName: string
    courseName: string
    courseUrl: string
    amount: string
    note?: string
  }) => ({
    subject: `Your enrollment in ${params.courseName} is confirmed`,
    text: `Hi ${params.userName},

Thank you for your purchase! You now have full access to ${params.courseName}.

Amount paid: ${params.amount}
${params.note ? `\n${params.note}\n` : ""}
Start learning now: ${params.courseUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Thank you for your purchase! You now have full access to <strong>${escapeHtml(params.courseName)}</strong>.</p>

      ${highlightBox("Amount paid", params.amount)}

      ${params.note ? `<p>${escapeHtml(params.note)}</p>` : ""}

      ${simpleButton("Start Learning Now →", params.courseUrl)}

      ${signature()}
    `, { preHeaderText: `You now have access to ${params.courseName}. Start learning today!` }),
  }),

  freeEnrollmentConfirmation: (params: {
    userName: string
    courseName: string
    courseUrl: string
  }) => ({
    subject: `You're enrolled in ${params.courseName}`,
    text: `Hi ${params.userName},

You're now enrolled in ${params.courseName}! This course is completely free.

Start learning now: ${params.courseUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>You're now enrolled in <strong>${escapeHtml(params.courseName)}</strong>. This course is completely free!</p>

      ${simpleButton("Start Learning Now →", params.courseUrl)}

      ${signature()}
    `, { preHeaderText: `You're enrolled in ${params.courseName}. Start learning today!` }),
  }),

  passwordReset: (params: { userName: string; resetUrl: string }) => ({
    subject: "Reset your password",
    text: `Hi ${params.userName},

We received a request to reset your password. Click the link below to create a new password:

${params.resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>We received a request to reset your Botcamp password. Click the button below to create a new password:</p>

      ${simpleButton("Reset Password →", params.resetUrl)}

      <p style="color: #666666;"><strong>This link will expire in 1 hour.</strong></p>

      <p style="color: #666666;">Didn't request this? You can safely ignore this email. If you're concerned about your account security, reply to this email.</p>

      ${signature()}
    `, { preHeaderText: "This link expires in 1 hour. Click to reset your password." }),
  }),

  welcomeEmail: (params: { userName: string; courseUrl: string }) => ({
    subject: "Welcome to Botcamp!",
    text: `Hi ${params.userName},

Welcome to Botcamp. You're now part of a community of builders learning to design, test, and deploy algorithmic trading strategies.

Start Here
Your first stop is Intro to Algo Trading — a free, beginner course covering the fundamentals: market making, order types, and how bots actually work. No trading or coding experience required, so there's no excuse not to start today.

Start Intro to Algo Trading: ${params.courseUrl}

As you get going, we'll introduce you to everything else Botcamp offers — more courses, live cohorts, and hackathons where you can put what you learn to the test.

Welcome to Botcamp, and welcome to the Hummingbot community.

Best,
The Botcamp Team
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Welcome to Botcamp. You're now part of a community of builders learning to design, test, and deploy algorithmic trading strategies.</p>

      <p><strong>Start Here</strong><br/>
      Your first stop is Intro to Algo Trading — a free, beginner course covering the fundamentals: market making, order types, and how bots actually work. No trading or coding experience required, so there's no excuse not to start today.</p>

      ${simpleLink("Start Intro to Algo Trading", params.courseUrl)}

      <p>As you get going, we'll introduce you to everything else Botcamp offers — more courses, live cohorts, and hackathons where you can put what you learn to the test.</p>

      <p>Welcome to Botcamp, and welcome to the Hummingbot community.</p>

      <p>Best,<br/>The Botcamp Team</p>

      ${signature()}
    `, { preHeaderText: "Start your algorithmic trading journey today." }),
  }),

  welcomeDay3: (params: { userName: string; courseUrl: string; unsubscribeUrl?: string }) => ({
    subject: "Getting Started Is the Hard Part — Let's Fix That",
    text: `Hi ${params.userName},

Whether you've already started Intro to Algo Trading or haven't opened it yet, here's a quick look at what's covered early on. Each lesson is short — most take 10-15 minutes, so there's no need to block off a whole afternoon.

In the First Few Lessons
- Market Making Basics — how bots quote both sides of a market, and why that spread is where the profit lives
- Order Types — the building blocks every strategy uses
- How Bots Actually Run — from backtest to live deployment

Go to the Course: ${params.courseUrl}

Best,
The Botcamp Team
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Whether you've already started Intro to Algo Trading or haven't opened it yet, here's a quick look at what's covered early on. Each lesson is short — most take 10-15 minutes, so there's no need to block off a whole afternoon.</p>

      <p><strong>In the First Few Lessons</strong></p>
      <ul>
        <li><strong>Market Making Basics</strong> — how bots quote both sides of a market, and why that spread is where the profit lives</li>
        <li><strong>Order Types</strong> — the building blocks every strategy uses</li>
        <li><strong>How Bots Actually Run</strong> — from backtest to live deployment</li>
      </ul>

      ${simpleLink("Go to the Course", params.courseUrl)}

      <p>Best,<br/>The Botcamp Team</p>

      ${signature()}
    `, { preHeaderText: "A quick look at what's covered early in Intro to Algo Trading.", unsubscribeUrl: params.unsubscribeUrl }),
  }),

  // Names the current prize pool only when `hackathon` is passed (i.e. one is
  // actually live in the DB — see getLiveHackathonForWelcomeEmail). Falls back
  // to durable, number-free copy otherwise, so this stays accurate between
  // hackathon cycles without needing a separate evergreen template.
  welcomeDay7: (params: {
    userName: string
    unsubscribeUrl?: string
    hackathon?: { title: string; prizePool: string }
  }) => ({
    subject: params.hackathon
      ? `Compete for a Share of ${params.hackathon.prizePool} With Botcamp`
      : "Put What You're Learning to the Test",
    text: `Hi ${params.userName},

Ready to put what you're learning to work? ${
      params.hackathon
        ? `The ${params.hackathon.title} is Botcamp's hackathon — a real trading competition where you build a strategy, apply to compete under a sponsor team, and see how it performs live.`
        : `Botcamp runs hackathons throughout the year — real trading competitions where you build a strategy, apply to compete under a sponsor team, and see how it performs live.`
    }

How It Works
- Two build paths — go rule-based with a Controller, or LLM-driven with an Agent.
- Apply to a sponsor team — each hackathon partners with a handful of exchanges, and you apply directly to the team you want to build for.
- If your agent is selected, it trades live in a dedicated, fully-funded environment — you're never risking your own money.
- No entry fee to apply.
- Winners are judged on real performance — trading volume, P&L, and community input all factor in.
${params.hackathon ? `\nRight now there's ${params.hackathon.prizePool} on the table for the ${params.hackathon.title}.\n` : ""}
See What's Live: ${getAppUrl()}/hackathons/active

Any questions? Head to the #hackathon channel on Discord.

Join the Hummingbot Discord: https://discord.gg/hummingbot

Best,
The Botcamp Team
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Ready to put what you're learning to work? ${
        params.hackathon
          ? `The <strong>${escapeHtml(params.hackathon.title)}</strong> is Botcamp's hackathon — a real trading competition where you build a strategy, apply to compete under a sponsor team, and see how it performs live.`
          : `Botcamp runs hackathons throughout the year — real trading competitions where you build a strategy, apply to compete under a sponsor team, and see how it performs live.`
      }</p>

      <p><strong>How It Works</strong></p>
      <ul>
        <li><strong>Two build paths</strong> — go rule-based with a Controller, or LLM-driven with an Agent.</li>
        <li><strong>Apply to a sponsor team</strong> — each hackathon partners with a handful of exchanges, and you apply directly to the team you want to build for.</li>
        <li><strong>If your agent is selected</strong>, it trades live in a dedicated, fully-funded environment — you're never risking your own money.</li>
        <li><strong>No entry fee</strong> to apply.</li>
        <li><strong>Winners are judged on real performance</strong> — trading volume, P&L, and community input all factor in.</li>
      </ul>

      ${params.hackathon ? `<p>Right now there's <strong>${escapeHtml(params.hackathon.prizePool)}</strong> on the table for the ${escapeHtml(params.hackathon.title)}.</p>` : ""}

      ${simpleLink("See What's Live", `${getAppUrl()}/hackathons/active`)}

      <p>Any questions? Head to the <strong>#hackathon</strong> channel on Discord.</p>

      ${simpleLink("Join the Hummingbot Discord", "https://discord.gg/hummingbot")}

      <p>Best,<br/>The Botcamp Team</p>

      ${signature()}
    `, { preHeaderText: params.hackathon ? `Compete for a share of ${params.hackathon.prizePool}.` : "Botcamp runs hackathons — here's how to get in on one.", unsubscribeUrl: params.unsubscribeUrl }),
  }),

  welcomeDay14: (params: { userName: string; unsubscribeUrl?: string }) => ({
    subject: "Ready to Level Up? Here's How",
    text: `Hi ${params.userName},

Ready to go deeper? Botcamp cohorts are live, multi-week programs where you build a real trading strategy alongside other members, with feedback from mentors along the way.

Explore Cohorts: ${getAppUrl()}/education

Hear From a Builder
"Botcamp helped me utilize Hummingbot to its fullest, and I finally grasped the nuances of the cross-exchange market making strategy." — Toby, Botcamp member
Watch Toby's Story: https://www.youtube.com/watch?v=QPnOPPoXcrM

Want to Hear More?
Botpod is our live show where we talk trading, building, and what's happening in the community. Tune In: https://www.youtube.com/@Hummingbot

Best,
The Botcamp Team
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Ready to go deeper? Botcamp cohorts are live, multi-week programs where you build a real trading strategy alongside other members, with feedback from mentors along the way.</p>

      ${simpleLink("Explore Cohorts", `${getAppUrl()}/education`)}

      <p><strong>Hear From a Builder</strong><br/>
      "Botcamp helped me utilize Hummingbot to its fullest, and I finally grasped the nuances of the cross-exchange market making strategy." — Toby, Botcamp member<br/>
      <a href="https://www.youtube.com/watch?v=QPnOPPoXcrM" style="color: #0da57a;">Watch Toby's Story</a></p>

      <p><strong>Want to Hear More?</strong><br/>
      Botpod is our live show where we talk trading, building, and what's happening in the community.
      <a href="https://www.youtube.com/@Hummingbot" style="color: #0da57a;">Tune In</a></p>

      <p>Best,<br/>The Botcamp Team</p>

      ${signature()}
    `, { preHeaderText: "Cohorts are live, multi-week — and here's how Toby used one.", unsubscribeUrl: params.unsubscribeUrl }),
  }),

  // Moved here from the original Day 7 slot when the series was reorganized
  // to introduce the hackathon (with its prize pool) earlier, at Day 7.
  welcomeDay21: (params: { userName: string; unsubscribeUrl?: string }) => ({
    subject: "Explore Strategies from the Botcamp Community",
    text: `Hi ${params.userName},

Take a look at what other Botcamp builders have shipped — real strategies, running on real exchanges, built by people who started exactly where you are now.

Browse Strategies: ${getAppUrl()}/strategies

If you've been working through Intro to Algo Trading, keep going — the fundamentals you're learning are exactly what these builders started with too.

Join the Conversation
Most of the building happens out loud, on Discord. Ask questions, share what you're working on, or just see what everyone else is up to.

Join the Hummingbot Discord: https://discord.gg/hummingbot

Best,
The Botcamp Team
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Take a look at what other Botcamp builders have shipped — real strategies, running on real exchanges, built by people who started exactly where you are now.</p>

      ${simpleLink("Browse Strategies", `${getAppUrl()}/strategies`)}

      <p>If you've been working through Intro to Algo Trading, keep going — the fundamentals you're learning are exactly what these builders started with too.</p>

      <p><strong>Join the Conversation</strong><br/>
      Most of the building happens out loud, on Discord. Ask questions, share what you're working on, or just see what everyone else is up to.</p>

      ${simpleLink("Join the Hummingbot Discord", "https://discord.gg/hummingbot")}

      <p>Best,<br/>The Botcamp Team</p>

      ${signature()}
    `, { preHeaderText: "Real strategies from real Botcamp builders.", unsubscribeUrl: params.unsubscribeUrl }),
  }),

  welcomeDay28: (params: { userName: string; unsubscribeUrl?: string }) => ({
    subject: "Four Weeks In — Here's the Full Picture",
    text: `Hi ${params.userName},

It's been four weeks since you joined Botcamp. Here's everything available to you, whether you've dug into all of it yet or are just getting started.

Everything Botcamp Offers
- Intro to Algo Trading — free, no experience required. Covers market making, order types, and how bots actually run — the fundamentals every strategy builds on.
- Cohorts — live, multi-week programs where you build a real trading strategy from scratch, with feedback from mentors and a group of peers doing the same thing.
- Agent Builders Cup — our hackathon, open to any builder. Pick a sponsor, build a Controller or an Agent, and compete for real prizes.
- Discord Community — where builders actually talk: live debugging help, hackathon teams coordinating in #hackathon, and mentors active daily.
- Botpod — our live show where we talk trading, building, and what's happening across the community.

Explore Everything Botcamp Offers: ${getAppUrl()}/education

Keep building — we'll be sending updates, spotlights, and what's new every couple weeks.

Best,
The Botcamp Team
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>It's been four weeks since you joined Botcamp. Here's everything available to you, whether you've dug into all of it yet or are just getting started.</p>

      <p><strong>Everything Botcamp Offers</strong></p>
      <ul>
        <li><strong>Intro to Algo Trading</strong> — free, no experience required. Covers market making, order types, and how bots actually run — the fundamentals every strategy builds on.</li>
        <li><strong>Cohorts</strong> — live, multi-week programs where you build a real trading strategy from scratch, with feedback from mentors and a group of peers doing the same thing.</li>
        <li><strong>Agent Builders Cup</strong> — our hackathon, open to any builder. Pick a sponsor, build a Controller or an Agent, and compete for real prizes.</li>
        <li><strong>Discord Community</strong> — where builders actually talk: live debugging help, hackathon teams coordinating in #hackathon, and mentors active daily.</li>
        <li><strong>Botpod</strong> — our live show where we talk trading, building, and what's happening across the community.</li>
      </ul>

      ${simpleLink("Explore Everything Botcamp Offers", `${getAppUrl()}/education`)}

      <p>Keep building — we'll be sending updates, spotlights, and what's new every couple weeks.</p>

      <p>Best,<br/>The Botcamp Team</p>

      ${signature()}
    `, { preHeaderText: "Four weeks in — here's the full picture of what Botcamp offers.", unsubscribeUrl: params.unsubscribeUrl }),
  }),

  passwordChanged: (params: { userName: string; loginUrl: string }) => ({
    subject: "Your password has been changed",
    text: `Hi ${params.userName},

Your Botcamp password was successfully changed.

If you made this change, no further action is needed. You can sign in with your new password at: ${params.loginUrl}

If you didn't make this change, please contact us immediately as your account may have been compromised.
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Your Botcamp password was successfully changed.</p>

      <p>If you made this change, no further action is needed. You can now sign in with your new password.</p>

      ${simpleButton("Sign In →", params.loginUrl)}

      <p style="color: #666666;"><strong>Didn't make this change?</strong> Please reply to this email immediately as your account may have been compromised.</p>

      ${signature()}
    `, { preHeaderText: "Your password was successfully changed." }),
  }),

  // Email verification template
  emailVerification: (params: { userName: string; verifyUrl: string }) => ({
    subject: "Verify your email address",
    text: `Hi ${params.userName},

Please verify your email address by clicking the link below:

${params.verifyUrl}

This link will expire in 24 hours.

If you didn't create a Botcamp account, you can safely ignore this email.
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Thanks for signing up for Botcamp! Please verify your email address to complete your registration.</p>

      ${simpleButton("Verify Email Address →", params.verifyUrl)}

      <p style="color: #666666;"><strong>This link will expire in 24 hours.</strong></p>

      <p style="color: #666666;">If you didn't create a Botcamp account, you can safely ignore this email.</p>

      ${signature()}
    `, { preHeaderText: "Click to verify your email and complete your registration." }),
  }),

  // Passwordless authentication: Magic link + 6-digit code
  verificationCode: (params: {
    userName?: string
    code: string
    magicLink: string
    isNewUser: boolean
  }) => ({
    subject: "Your sign-in code",
    text: `${params.userName ? `Hi ${params.userName},` : "Hi,"}

${params.isNewUser ? "Welcome to Botcamp! " : ""}Your sign-in code is: ${params.code}

Or click this link to sign in:
${params.magicLink}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>${params.userName ? `Hi ${escapeHtml(params.userName)},` : "Hi,"}</p>

      <p>${params.isNewUser ? "Welcome to Botcamp! " : ""}Enter the code below to sign in to your Botcamp account:</p>

      ${highlightBox("Your verification code", params.code)}

      <p style="color: #666666;">Or click the button below to sign in automatically:</p>

      ${simpleButton("Sign In to Botcamp →", params.magicLink)}

      <p style="color: #666666;"><strong>This code expires in 10 minutes.</strong></p>

      <p style="color: #666666;">If you didn't request this code, you can safely ignore this email.</p>

      ${signature()}
    `, { preHeaderText: `Your verification code is ${params.code}. Expires in 10 minutes.` }),
  }),

  // Hackathon registration confirmation
  hackathonRegistration: (params: {
    userName: string
    hackathonName: string
    hackathonUrl: string
    startDate?: string
  }) => ({
    subject: `You're registered for ${params.hackathonName}`,
    text: `Hi ${params.userName},

You're registered for ${params.hackathonName}!

${params.startDate ? `The hackathon starts on ${params.startDate}.` : ''}

What's next:
- Make sure you have your trading strategy ready
- Keep an eye on your email for hackathon updates
- Join the #botcamp channels in Discord to connect with other participants

View hackathon details: ${params.hackathonUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>You're registered for <strong>${escapeHtml(params.hackathonName)}</strong>!</p>

      ${params.startDate ? highlightBox("Hackathon starts", params.startDate) : ''}

      <p><strong>What's Next</strong></p>
      <ul>
        <li>Make sure you have your trading strategy ready</li>
        <li>Keep an eye on your email for hackathon updates</li>
        <li>Join the <a href="https://discord.gg/hummingbot" style="color: #0da57a;">#botcamp channels in Discord</a> to connect with other participants</li>
      </ul>

      ${simpleButton("View Hackathon →", params.hackathonUrl)}

      ${signature()}
    `, { preHeaderText: `You're registered for ${params.hackathonName}. Good luck!` }),
  }),

  // Strategy comment notification — sent to authors + the commenting admin
  strategyComment: (params: {
    recipientName: string
    recipientType: "author" | "commenter"
    commenterName: string
    strategyTitle: string
    strategyUrl: string
    commentText: string
    commentHtml: string
  }) => {
    const isAuthor = params.recipientType === "author"
    const intro = isAuthor
      ? `${escapeHtml(params.commenterName)} left a comment on your strategy <strong>${escapeHtml(params.strategyTitle)}</strong>:`
      : `Your comment on <strong>${escapeHtml(params.strategyTitle)}</strong> has been posted. The strategy's authors have been notified.`
    const introText = isAuthor
      ? `${params.commenterName} left a comment on your strategy "${params.strategyTitle}":`
      : `Your comment on "${params.strategyTitle}" has been posted. The strategy's authors have been notified.`
    const subject = isAuthor
      ? `New comment on ${params.strategyTitle}`
      : `Your comment on ${params.strategyTitle}`
    const buttonLabel = isAuthor ? "View Strategy →" : "View Comment →"

    return {
      subject,
      text: `Hi ${params.recipientName},

${introText}

${params.commentText}

View the strategy: ${params.strategyUrl}
${textSignature()}`,
      html: simpleEmailWrapper(`
        <p>Hi ${escapeHtml(params.recipientName)},</p>

        <p>${intro}</p>

        <blockquote style="margin: 20px 0; padding: 12px 20px; border-left: 3px solid #0da57a; background: #f5f5f5; color: #1a1a1a; font-style: italic;">
          ${params.commentHtml}
        </blockquote>

        ${simpleButton(buttonLabel, params.strategyUrl)}

        ${signature()}
      `, { preHeaderText: `${params.commenterName} commented on ${params.strategyTitle}` }),
    }
  },

  // Strategy status change (DRAFT/SUBMITTED/CHANGES_REQUESTED/APPROVED/CERTIFIED)
  strategyStatusUpdate: (params: {
    userName: string
    strategyTitle: string
    strategyUrl: string
    statusLabel: string
    message: string
  }) => ({
    subject: `${params.strategyTitle} is now ${params.statusLabel}`,
    text: `Hi ${params.userName},

${params.message}

Strategy: ${params.strategyTitle}
Status: ${params.statusLabel}

View it: ${params.strategyUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>${escapeHtml(params.message)}</p>

      ${highlightBox(params.strategyTitle, params.statusLabel)}

      ${simpleButton("View Strategy →", params.strategyUrl)}

      ${signature()}
    `, { preHeaderText: `${params.strategyTitle} is now ${params.statusLabel}` }),
  }),

  // Condor agent version reviewed (NEEDS_REVIEW / APPROVED / REJECTED). The reviewer note
  // and fixes are free text (an admin's, the review's), so they're escaped.
  agentVersionStatusUpdate: (params: {
    userName: string
    agentTitle: string
    version: number
    statusLabel: string
    message: string
    reviewNote: string | null
    fixes: string[]
    agentUrl: string
  }) => {
    const title = `${params.agentTitle} v${params.version}`
    return {
      subject: `${title} is ${params.statusLabel.toLowerCase()}`,
      text: `Hi ${params.userName},

${params.message}
${params.reviewNote ? `\nReviewer note: ${params.reviewNote}\n` : ""}${params.fixes.length ? `\nWhat to fix:\n${params.fixes.map((f) => `- ${f}`).join("\n")}\n` : ""}
Agent: ${title}
Status: ${params.statusLabel}

View it: ${params.agentUrl}
${textSignature()}`,
      html: simpleEmailWrapper(`
        <p>Hi ${escapeHtml(params.userName)},</p>

        <p>${escapeHtml(params.message)}</p>

        ${params.reviewNote ? `<p><strong>Reviewer note:</strong> ${escapeHtml(params.reviewNote)}</p>` : ""}

        ${params.fixes.length ? `<p><strong>What to fix:</strong></p><ul>${params.fixes.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}

        ${highlightBox(title, params.statusLabel)}

        ${simpleButton("View Agent →", params.agentUrl)}

        ${signature()}
      `, { preHeaderText: `${title} is ${params.statusLabel.toLowerCase()}` }),
    }
  },

  // Sent to an agent's authors when a reviewer suggests changes to its
  // page's text; they accept or dismiss each one from the editor.
  agentPageSuggestions: (params: {
    userName: string
    agentTitle: string
    fieldLabels: string[]
    note: string | null
    agentUrl: string
  }) => {
    const fields = params.fieldLabels.join(", ")
    return {
      subject: `Suggested changes to ${params.agentTitle}`,
      text: `Hi ${params.userName},

Botcamp's review suggested changes to your agent's page: ${fields}.
${params.note ? `\nReviewer note: ${params.note}\n` : ""}
Open the agent to see each suggestion next to your text, then accept or dismiss it.

View it: ${params.agentUrl}
${textSignature()}`,
      html: simpleEmailWrapper(`
        <p>Hi ${escapeHtml(params.userName)},</p>

        <p>Botcamp&rsquo;s review suggested changes to your agent&rsquo;s page: <strong>${escapeHtml(fields)}</strong>.</p>

        ${params.note ? `<p><strong>Reviewer note:</strong> ${escapeHtml(params.note)}</p>` : ""}

        <p>Open the agent to see each suggestion next to your text, then accept or dismiss it.</p>

        ${simpleButton("Review the Suggestions →", params.agentUrl)}

        ${signature()}
      `, { preHeaderText: `Suggested changes to ${params.agentTitle}` }),
    }
  },

  // Sent to admins when an agent version passes the AI review and
  // waits for their final check before Condor can clone it.
  agentAwaitingAdmin: (params: {
    adminName: string
    uploaderName: string
    agentTitle: string
    version: number
    adminUrl: string
  }) => {
    const title = `${params.agentTitle} v${params.version}`
    return {
      subject: `Agent to check: ${title}`,
      text: `Hi ${params.adminName},

${params.uploaderName} uploaded ${title}. It passed the AI security review and is waiting for your final check before Condor can clone it.

Review it: ${params.adminUrl}
${textSignature()}`,
      html: simpleEmailWrapper(`
        <p>Hi ${escapeHtml(params.adminName)},</p>

        <p><strong>${escapeHtml(params.uploaderName)}</strong> uploaded <strong>${escapeHtml(title)}</strong>. It passed the AI security review and is waiting for your final check before Condor can clone it.</p>

        ${simpleButton("Review Agent →", params.adminUrl)}

        ${signature()}
      `, { preHeaderText: `${title} is waiting for your check` }),
    }
  },

  // Sent to the creator right after a new strategy is created
  strategyCreated: (params: {
    userName: string
    strategyTitle: string
    strategyUrl: string
  }) => ({
    subject: `${params.strategyTitle} has been created`,
    text: `Hi ${params.userName},

Your strategy, ${params.strategyTitle}, has been created on Botcamp. It's saved as a draft — keep working on it from your dashboard, and submit it for review whenever you're ready.

View it: ${params.strategyUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>Your strategy, <strong>${escapeHtml(params.strategyTitle)}</strong>, has been created on Botcamp. It's saved as a draft — keep working on it from your dashboard, and submit it for review whenever you're ready.</p>

      ${simpleButton("View Strategy →", params.strategyUrl)}

      ${signature()}
    `, { preHeaderText: `${params.strategyTitle} has been created on Botcamp` }),
  }),

  // Sent to Botcamp admins right after a new strategy is created
  strategyCreatedAdmin: (params: {
    adminName: string
    authorNames: string
    strategyTitle: string
    adminUrl: string
  }) => ({
    subject: `New strategy created: ${params.strategyTitle}`,
    text: `Hi ${params.adminName},

${params.authorNames} just created a new strategy on Botcamp: ${params.strategyTitle}. It's currently a draft.

View it: ${params.adminUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.adminName)},</p>

      <p><strong>${escapeHtml(params.authorNames)}</strong> just created a new strategy on Botcamp: <strong>${escapeHtml(params.strategyTitle)}</strong>. It's currently a draft.</p>

      ${simpleButton("View Strategy →", params.adminUrl)}

      ${signature()}
    `, { preHeaderText: `New strategy created: ${params.strategyTitle}` }),
  }),

  // Hackathon application status change
  applicationStatusUpdate: (params: {
    userName: string
    hackathonName: string
    applicationUrl: string
    statusLabel: string
    message: string
  }) => ({
    subject: `Your ${params.hackathonName} application is now ${params.statusLabel}`,
    text: `Hi ${params.userName},

${params.message}

Hackathon: ${params.hackathonName}
Application status: ${params.statusLabel}

View it: ${params.applicationUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>${escapeHtml(params.message)}</p>

      ${highlightBox(`${params.hackathonName} application`, params.statusLabel)}

      ${simpleButton("View Application →", params.applicationUrl)}

      ${signature()}
    `, { preHeaderText: `Your ${params.hackathonName} application is now ${params.statusLabel}` }),
  }),

  // Sent to a sponsor team's members when a builder submits an application
  applicationSubmitted: (params: {
    userName: string
    applicantName: string
    agentTitle: string
    teamName: string
    hackathonName: string
    applicantsUrl: string
  }) => ({
    subject: `You have received a strategy application for ${params.teamName}`,
    text: `Hi ${params.userName},

${params.applicantName} applied to ${params.teamName} with their agent ${params.agentTitle} in ${params.hackathonName}.

Review applicants: ${params.applicantsUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p><strong>${escapeHtml(params.applicantName)}</strong> applied to <strong>${escapeHtml(params.teamName)}</strong> with their agent <strong>${escapeHtml(params.agentTitle)}</strong> in ${escapeHtml(params.hackathonName)}.</p>

      ${simpleButton("Review Applicants →", params.applicantsUrl)}

      ${signature()}
    `, { preHeaderText: `You have received a strategy application for ${params.teamName}` }),
  }),

  // Sent to Botcamp admins when a builder submits a hackathon application
  applicationSubmittedAdmin: (params: {
    adminName: string
    applicantName: string
    agentTitle: string
    hackathonName: string
    teamNames: string[]
    adminUrl: string
  }) => ({
    subject: `New hackathon application: ${params.agentTitle}`,
    text: `Hi ${params.adminName},

${params.applicantName} submitted an application for ${params.hackathonName} with their agent ${params.agentTitle}, ranking: ${params.teamNames.join(", ")}.

Review it: ${params.adminUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.adminName)},</p>

      <p><strong>${escapeHtml(params.applicantName)}</strong> submitted an application for ${escapeHtml(params.hackathonName)} with their agent <strong>${escapeHtml(params.agentTitle)}</strong>, ranking: ${escapeHtml(params.teamNames.join(", "))}.</p>

      ${simpleButton("Review Application →", params.adminUrl)}

      ${signature()}
    `, { preHeaderText: `New hackathon application: ${params.agentTitle}` }),
  }),

  // Sponsor team loses a previously-selected applicant to a team the
  // applicant ranked higher
  teamApplicantOutranked: (params: {
    userName: string
    teamName: string
    agentTitle: string
    hackathonName: string
    newTeamName: string
    applicantsUrl: string
  }) => ({
    subject: `${params.agentTitle} moved to another team in ${params.hackathonName}`,
    text: `Hi ${params.userName},

${params.agentTitle} ranked another squad higher, so they've moved to ${params.newTeamName} and are no longer selected for ${params.teamName}.

Hackathon: ${params.hackathonName}

Review your applicants: ${params.applicantsUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p><strong>${escapeHtml(params.agentTitle)}</strong> ranked another squad higher, so they've moved to
      <strong>${escapeHtml(params.newTeamName)}</strong> and are no longer selected for ${escapeHtml(params.teamName)}.</p>

      ${highlightBox(params.agentTitle, `Moved to ${params.newTeamName}`)}

      ${simpleButton("Review Your Applicants →", params.applicantsUrl)}

      ${signature()}
    `, { preHeaderText: `${params.agentTitle} moved to another team in ${params.hackathonName}` }),
  }),

  // Cohort enrollment confirmation
  cohortEnrollment: (params: {
    userName: string
    cohortName: string
    cohortUrl: string
    startDate: string
    cohortNumber?: number
  }) => ({
    subject: `Welcome to ${params.cohortName}!`,
    text: `Hi ${params.userName},

On behalf of the Hummingbot team, welcome to ${params.cohortName}, starting in April!

This cohort will be the first to utilize new AI-based tooling in the Hummingbot framework — including the MCP server and Skills — letting you create AI agents that execute trading strategies. We're also planning a final-week AI trading agent hackathon.

YOUR COURSE ACCESS
We've added 4 Botcamp courses to your account. We'll be consolidating these into botcamp.xyz soon for a unified experience.

WHAT TO EXPECT
Over 4 weeks, you and 25+ other students will learn to design, code, and deploy a custom algorithmic trading strategy — guided by Fede and Michael, core maintainers of the Hummingbot open source framework. The cohort ends with a Demo Day where the cohort votes for the top strategies. Students who submit a valid strategy receive the Hummingbot certification.

SCHEDULE
Live sessions start Tuesday, April 8 and end with Demo Day on Tuesday, April 29.
All sessions are online Zoom meetings at 8am PST / 3pm UTC, recorded and posted within 24 hours.

GETTING SET UP
1. Access your courses at courses.botcamp.xyz
2. Join the Botcamp Discord and complete the Onboarding Form to access private cohort channels
3. Install Hummingbot before your first live session

Access your cohort: ${params.cohortUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>On behalf of the Hummingbot team, welcome to <strong>${escapeHtml(params.cohortName)}</strong>, starting in April!</p>

      <p>This cohort will be the first to utilize new AI-based tooling in the Hummingbot framework — including the <strong>MCP server</strong> and <strong>Skills</strong> — letting you create AI agents that execute trading strategies autonomously. We're also planning a final-week <strong>AI trading agent hackathon</strong>.</p>

      <p><strong>Your Course Access</strong></p>
      <p>We've added 4 Botcamp courses to your account. You can access them now at <a href="https://courses.botcamp.xyz" style="color: #0da57a;">courses.botcamp.xyz</a>.</p>
      <p style="color: #666666;">We'll be consolidating these into <a href="https://botcamp.xyz" style="color: #0da57a;">botcamp.xyz</a> soon for a unified experience — you'll receive an email about this change.</p>

      <p><strong>What to Expect</strong></p>
      <p>Over <strong>4 weeks</strong>, you and 25+ students will learn to design, code, and deploy a custom algo trading strategy — guided by Fede and Michael, core maintainers of the Hummingbot open source framework.</p>
      <p>The cohort ends with a <strong>Demo Day</strong> where the cohort votes for the top strategies. Students who submit a valid strategy receive the <strong>Hummingbot certification</strong>.</p>

      ${highlightBox("Cohort starts", params.startDate)}

      <p style="color: #666666;">All live sessions and office hours are online Zoom meetings at <strong>8am PST / 3pm UTC</strong>, recorded and posted within 24 hours.</p>

      <p><strong>Getting Set Up</strong></p>
      <ol>
        <li>Access your courses at <a href="https://courses.botcamp.xyz" style="color: #0da57a;">courses.botcamp.xyz</a></li>
        <li>Join the <a href="https://discord.gg/hummingbot" style="color: #0da57a;">Botcamp Discord</a> and complete the Onboarding Form to access private cohort channels</li>
        <li>Install Hummingbot before your first live session — use <strong>#botcamp-support</strong> on Discord if you need help</li>
      </ol>

      ${simpleButton("Access Your Cohort →", params.cohortUrl)}

      ${signature()}
    `, { preHeaderText: `Welcome to ${params.cohortName}! Your journey into AI-powered algo trading starts here.` }),
  }),

  hackathonTeamMemberAdded: (params: {
    userName: string
    teamName: string
    hackathonTitle: string
    teamReviewUrl: string
  }) => ({
    subject: `You've been added to Team ${params.teamName}`,
    text: `Hi ${params.userName},

You've been added as a team member for ${params.teamName} in the ${params.hackathonTitle}.

As a team member, you can review agent applications and help select the two strategies that will race under your team's flag.

Open your team dashboard: ${params.teamReviewUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi ${escapeHtml(params.userName)},</p>

      <p>You've been added as a team member for <strong>${escapeHtml(params.teamName)}</strong> in the ${escapeHtml(params.hackathonTitle)}.</p>

      <p>As a team member, you can review agent applications and help select the two strategies that will race under your team's flag.</p>

      ${simpleButton("Open Team Dashboard →", params.teamReviewUrl)}

      ${signature()}
    `, { preHeaderText: `You've been added to Team ${params.teamName} for the ${params.hackathonTitle}.` }),
  }),

  // Sent when an admin invites an email address with no account yet. On
  // registering with this address, the invitee is auto-added to the team
  // (see claimTeamInvites).
  teamInviteNewUser: (params: {
    teamName: string
    hackathonTitle: string
    registerUrl: string
  }) => ({
    subject: `You've been added to Team ${params.teamName}`,
    text: `Hi,

You've been added as a team member for ${params.teamName} in the ${params.hackathonTitle}.

As a team member, you can review agent applications and help select the strategies that will race under your team's flag.

To get started, create your Botcamp account using this email address — your team access is linked to it:

${params.registerUrl}
${textSignature()}`,
    html: simpleEmailWrapper(`
      <p>Hi,</p>

      <p>You've been added as a team member for <strong>${escapeHtml(params.teamName)}</strong> in the ${escapeHtml(params.hackathonTitle)}.</p>

      <p>As a team member, you can review agent applications and help select the strategies that will race under your team's flag.</p>

      <p>To get started, create your Botcamp account using <strong>this email address</strong> — your team access is linked to it.</p>

      ${simpleButton("Create Your Account →", params.registerUrl)}

      ${signature()}
    `, { preHeaderText: `You've been added to Team ${params.teamName} — create your account to get started.` }),
  }),

  // Nudges someone who started a course but hasn't made progress in
  // a while. Sent at most once per (enrollment, tier) — see
  // sendCourseInactivityReminder in notifications.ts and the
  // course-inactivity cron.
  courseInactivityReminder: (params: {
    userName: string
    courseName: string
    courseUrl: string
    tier: "WEEK" | "MONTH"
    unsubscribeUrl: string
  }) => {
    const isMonth = params.tier === "MONTH"
    const userNameHtml = escapeHtml(params.userName)
    const courseNameHtml = escapeHtml(params.courseName)
    const subject = isMonth
      ? `Still There? Pick Back Up on ${params.courseName}`
      : `Pick Back Up on ${params.courseName}`
    const preHeaderText = isMonth
      ? `It's been about a month since your last lesson on ${params.courseName}.`
      : `It's been about a week since your last lesson on ${params.courseName}.`
    const bodyText = isMonth
      ? `It's been about a month since you made progress on ${params.courseName}. No pressure — just didn't want you to lose the momentum you'd built.`
      : `It's been about a week since you made progress on ${params.courseName}. Pick up right where you left off.`
    const bodyHtml = isMonth
      ? `It's been about a month since you made progress on <strong>${courseNameHtml}</strong>. No pressure — just didn't want you to lose the momentum you'd built.`
      : `It's been about a week since you made progress on <strong>${courseNameHtml}</strong>. Pick up right where you left off.`

    return {
      subject,
      text: `Hi ${params.userName},

${bodyText}

Continue: ${params.courseUrl}
${textSignature()}`,
      html: simpleEmailWrapper(`
      <p>Hi ${userNameHtml},</p>

      <p>${bodyHtml}</p>

      ${simpleButton("Continue Learning →", params.courseUrl)}

      ${signature()}
    `, { preHeaderText, unsubscribeUrl: params.unsubscribeUrl }),
    }
  },

  // Security notice for Connect Botcamp: sent each time a code is redeemed, so a
  // phished connection doesn't go unnoticed.
  // `clientName` is whatever the requester chose, so it's always escaped.
  condorConnected: (params: { userName: string; clientName: string; requesterIp: string | null; manageUrl: string }) => {
    const from = params.requesterIp ?? "an unknown address"
    return {
      subject: "Condor was connected to your Botcamp account",
      text: `Hi ${params.userName},

A Condor ("${params.clientName}", at ${from}) just connected to your Botcamp account with a code from your Connect page. It can download agents you can see and publish agents under your name.

If this wasn't you, disconnect it now: ${params.manageUrl}
${textSignature()}`,
      html: simpleEmailWrapper(`
        <p>Hi ${escapeHtml(params.userName)},</p>

        <p>A Condor (<strong>${escapeHtml(params.clientName)}</strong>, at ${escapeHtml(from)}) just connected to your Botcamp account with a code from your Connect page. It can download agents you can see and publish agents under your name.</p>

        <p>If this wasn't you, disconnect it now:</p>

        ${simpleButton("Manage Connections →", params.manageUrl)}

        ${signature()}
      `, { preHeaderText: "If this wasn't you, disconnect it from your profile." }),
    }
  },
}

// Simple broadcast email template - clean markdown-style rendering without fancy containers
export const broadcastEmailTemplate = (params: {
  content: string
  preHeaderText?: string
  unsubscribeUrl?: string
}) => {
  // Configure marked for email-safe HTML with GFM support
  const htmlContent = marked.parse(params.content, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string

  const unsubscribeFooter = params.unsubscribeUrl
    ? `<div style="max-width: 600px; margin: 32px auto 0; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; line-height: 1.5; color: #8a8a8a; text-align: center;">
        You're receiving this because you have a Botcamp account.
        <a href="${params.unsubscribeUrl}" style="color: #8a8a8a; text-decoration: underline;">Unsubscribe</a>
        or <a href="${getAppUrl()}/dashboard/profile" style="color: #8a8a8a; text-decoration: underline;">manage your email preferences</a>.
      </div>`
    : ""

  // Simple, clean email template like Resend's style
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Botcamp</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #1a1a1a; background-color: #ffffff; margin: 0; padding: 40px 20px;">
  ${params.preHeaderText ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(params.preHeaderText)}</div>` : ''}

  <div style="max-width: 600px; margin: 0 auto;">
    ${htmlContent}
  </div>
  ${unsubscribeFooter}
</body>
</html>`
}

// Available broadcast variables
export const BROADCAST_VARIABLES = {
  FirstName: "Recipient's first name",
  LastName: "Recipient's last name",
  Email: "Recipient's email address",
} as const

// Markdown and HTML both mean something in a name: the body is markdown that
// becomes the email's HTML, so a "first name" of `<a href=…>` or `[Verify](…)`
// put the sender's own link in an email from Botcamp. Characters that could
// start a tag, a link, emphasis or an autolink ("https:", "www.") become HTML
// entities, which read the same in markdown text and in raw HTML blocks —
// a backslash escape showed up literally inside HTML.
const MARKDOWN_ENTITIES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  "[": "&#91;", "]": "&#93;", "(": "&#40;", ")": "&#41;", "*": "&#42;", "_": "&#95;",
  "`": "&#96;", "\\": "&#92;", ":": "&#58;", ".": "&#46;", "~": "&#126;", "|": "&#124;",
  "#": "&#35;", "!": "&#33;",
}

function escapeForMarkdown(value: string): string {
  return value.replace(/[&<>"'[\]()*_`\\:.~|#!]/g, (c) => MARKDOWN_ENTITIES[c])
}

// Parse broadcast variables in text - replaces {{Variable}} with actual values.
// `markdown: true` for the body that's rendered to HTML; the subject and the
// plain-text part take the values as they are.
export function parseBroadcastVariables(
  text: string,
  recipient: { firstName?: string | null; lastName?: string | null; email: string },
  { markdown = false }: { markdown?: boolean } = {},
): string {
  const value = (v: string) => (markdown ? escapeForMarkdown(v) : v)
  return text
    .replace(/\{\{FirstName\}\}/gi, () => value(recipient.firstName || "there"))
    .replace(/\{\{LastName\}\}/gi, () => value(recipient.lastName || ""))
    .replace(/\{\{Email\}\}/gi, () => value(recipient.email))
}

// Default from address - can be overridden via EMAIL_FROM env var.
// Send from the warmed send.botcamp.xyz subdomain (reputation + SES SPF + DKIM);
// replies route to operations@botcamp.xyz via Cloudflare Email Routing.
const DEFAULT_FROM = process.env.EMAIL_FROM || "Hummingbot Botcamp <operations@send.botcamp.xyz>"

// Default reply-to address - can be overridden via EMAIL_REPLY_TO env var
const DEFAULT_REPLY_TO = process.env.EMAIL_REPLY_TO || "operations@botcamp.xyz"

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

// Check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (error && typeof error === "object") {
    if ("statusCode" in error) {
      const statusCode = (error as { statusCode: number }).statusCode
      return statusCode >= 500 || statusCode === 429
    }
    // Resend API errors surfaced via the SDK's { error } return carry a name
    // but not always a statusCode.
    if ("name" in error) {
      const name = String((error as { name: unknown }).name)
      return (
        name === "rate_limit_exceeded" ||
        name === "internal_server_error" ||
        name === "application_error"
      )
    }
  }
  return false
}

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper to send email with retry logic and idempotency
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  idempotencyKey?: string
  headers?: Record<string, string>
}) {
  const resend = getResend()
  if (!resend) {
    console.warn("Resend not configured - skipping email send")
    return { success: false, error: "Resend not configured" }
  }

  const fromAddress = params.from || DEFAULT_FROM
  const replyToAddress = params.replyTo || DEFAULT_REPLY_TO

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`Sending email from ${fromAddress}: ${params.subject} (attempt ${attempt + 1})`)

      const sendOptions: Parameters<typeof resend.emails.send>[0] = {
        from: fromAddress,
        to: params.to,
        replyTo: replyToAddress,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }

      // Add idempotency key + any custom headers (e.g. List-Unsubscribe)
      const headers: Record<string, string> = { ...(params.headers || {}) }
      if (params.idempotencyKey) {
        headers["Idempotency-Key"] = params.idempotencyKey
      }

      const result = await resend.emails.send(sendOptions,
        Object.keys(headers).length > 0 ? { headers } : undefined
      )

      // The SDK reports API rejections here instead of throwing — route them
      // through the catch below so retryable ones retry and the rest return
      // success: false instead of a phantom SENT.
      if (result.error) {
        throw Object.assign(
          new Error(`${result.error.name}: ${result.error.message}`),
          result.error
        )
      }

      console.log(`Email sent successfully, id: ${result.data?.id}`)
      return { success: true, data: result }
    } catch (error) {
      console.error(`Email send attempt ${attempt + 1} failed:`, error)

      // Don't retry non-retryable errors
      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxRetries - 1) {
        return { success: false, error: String(error) }
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        RETRY_CONFIG.maxDelayMs
      )
      console.log(`Retrying in ${Math.round(delay)}ms...`)
      await sleep(delay)
    }
  }

  return { success: false, error: "Max retries exceeded" }
}

// Helper to generate idempotency key for common email types
export function generateIdempotencyKey(type: string, ...identifiers: string[]): string {
  return `${type}-${identifiers.join("-")}-${Date.now()}`
}

// Extracts the Resend-assigned email id from a sendEmail() result, for
// storing on Notification.resendEmailId so the webhook can match events back.
export function getResendEmailId(
  result: Awaited<ReturnType<typeof sendEmail>>
): string | null {
  if (!result.success) return null
  return result.data?.data?.id ?? null
}

// Send verification code email (magic link + 6-digit code)
export async function sendVerificationEmail(params: {
  to: string
  code: string
  magicLink: string
  userName?: string
  isNewUser: boolean
}) {
  const template = emailTemplates.verificationCode({
    userName: params.userName,
    code: params.code,
    magicLink: params.magicLink,
    isNewUser: params.isNewUser,
  })

  return sendEmail({
    to: params.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: generateIdempotencyKey("verification-code", params.to, params.code),
  })
}
