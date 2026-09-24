<div align="center">

# WriteFlow AI

**Understand the conversation. Know what to say. Write it like you.**

An AI writing copilot that lives inside your browser — on Gmail, LinkedIn, Slack, Reddit, and everywhere else you type. Bring your own API key. There is no WriteFlow server in between.

[Download the latest release](../../releases/latest) · [Report an issue](../../issues) · [Changelog](CHANGELOG.md)

</div>

---

## What it does

Click into any text field on a supported site, and a small **✦** icon appears. Click it, and WriteFlow can:

- **Rewrite** what you've already typed — shorter, more professional, friendlier, simpler, and more
- **Draft a reply** to a post or comment it reads on the page, with reply angles tailored to what that specific post actually says (Pro)
- **Write something from scratch** — describe what you want to say, and it drafts the message, even into a completely empty field
- **Reply to an email thread**, using the actual conversation history, not just the last message
- **Match your own writing style** over time, entirely on your device — no cloud profile, nothing sent anywhere but the AI provider you chose

Every suggestion is shown to you first. WriteFlow never posts, sends, or submits anything on its own — you always click Replace, Insert, or Copy yourself.

## Why "bring your own key"

WriteFlow has no server of its own. When you generate a suggestion, the relevant text goes **directly from your browser to the AI provider you picked** (OpenAI, Anthropic, Google Gemini, Groq, or OpenRouter) — using an API key you provide and that stays on your device. Nobody else's server sees your writing in between.

This also means:
- No account, no sign-up, no cloud storage of anything you write
- Free-tier providers (Gemini, Groq, OpenRouter) mean you can use WriteFlow at effectively no cost
- If your chosen provider has an outage, an optional backup provider can pick up automatically (Pro)

See [Privacy](#privacy) below for the full picture.

## Installation

WriteFlow isn't on the Chrome Web Store yet — for now, install it directly from a GitHub Release:

1. Go to the [**Releases**](../../releases/latest) page and download the `.zip` file under the latest release
2. Unzip it — you'll get a folder containing `manifest.json` and the extension's files
3. Open Chrome and go to `chrome://extensions`
4. Turn on **Developer mode** (top-right toggle)
5. Click **Load unpacked**, and select the unzipped folder
6. The WriteFlow icon should appear in your toolbar — pin it for easy access

You'll need to repeat steps 1–5 for future updates, since this isn't on the auto-updating Chrome Web Store yet.

## Setup

The first time you open WriteFlow's settings (click the toolbar icon → the gear icon, or right-click the icon → Options), a short setup walks you through:

1. **Pick a provider.** Gemini and Groq are both free with no credit card — the easiest place to start.
2. **Get a key.** A button takes you straight to that provider's key page.
3. **Paste it in.** WriteFlow checks it works before you continue.
4. **Try it.** Open Gmail, LinkedIn, or Reddit and click into any text box.

If you'd rather skip setup for now, WriteFlow works with a built-in "Mock" mode with no key needed, so you can try the interface before committing to a provider.

## Supported platforms

WriteFlow's core rewriting/writing tools work on every site listed below. The richer **Smart Reply** feature (reading the actual post/thread and suggesting tailored reply angles) is implemented for all of them too, though — being honest — some platforms' page structure changes are more thoroughly tested against than others. If Smart Reply doesn't detect a post correctly somewhere, it falls back to a simple "paste the post here" box rather than failing silently, and [reporting it as an issue](../../issues) helps get it fixed.

| Category | Sites |
|---|---|
| Email | Gmail, Outlook |
| Social | LinkedIn, X/Twitter, Facebook, Reddit, Instagram, Threads, TikTok, Bluesky, Quora, Tumblr, Pinterest |
| Chat | Slack, WhatsApp Web, Discord |
| Publishing | Medium, Substack |
| Video | YouTube |
| Anywhere else | Click "Enable WriteFlow here" in the popup to add any other site with one click |

## Free vs Pro

**Free, no account needed:**
- Rewrite, Shorten, Fix grammar
- Write It For Me (drafting from a blank field, on any site)
- Translation
- Basic reply styles on social platforms
- Manually set your own writing-style profile (Style DNA)
- One AI provider at a time

**Pro** (one-time purchase, license key, no subscription):
- Smart Reply 2.0 — reads the actual post/email and suggests tailored reply angles, with audience detection you can correct
- Custom instructions and saved prompts
- Style DNA that learns automatically from the edits you make to suggestions
- A backup AI provider, for automatic failover if your primary one is down

## Privacy

Full details in [PRIVACY.md](PRIVACY.md). The short version:

- **No account.** No sign-up, no login, nothing to lose access to.
- **API keys never leave your device** except in the request you send directly to your chosen AI provider.
- **No WriteFlow server.** There is nothing in between your browser and the AI provider.
- **Nothing is stored in the cloud.** Your writing samples, style profile, saved prompts, and settings live in Chrome's local storage on your machine only.
- **You're in control.** WriteFlow never sends, posts, or submits anything automatically — every suggestion needs your click.

## Troubleshooting

**The ✦ icon doesn't show up on a field.** Make sure the site is in the supported list above, or use "Enable WriteFlow here" from the popup for other sites. Very small fields (like a search box) are intentionally skipped.

**"Post text could not be detected."** This means the page's structure didn't match what WriteFlow expected — you can paste the post text in manually and generation still works. [Reporting the site/page](../../issues) helps improve detection there.

**A provider error appears.** Double-check your API key in Settings, and confirm the provider you picked still supports the model WriteFlow is using — free-tier model availability can shift over time. A configured backup provider (Pro) will kick in automatically on most transient failures.

**Something else.** [Open an issue](../../issues) with what you were doing, what you expected, and what happened instead.

## Contributing

This repository is source-available so you can see exactly what the extension does with your data — see [LICENSE](LICENSE) for what that does and doesn't permit. Bug reports and feature suggestions are very welcome via [Issues](../../issues).

## License

Source-available, all rights reserved — see [LICENSE](LICENSE).

---

<div align="center">

Built with a **BYOK, no-backend** architecture, on purpose.

</div>
