// Builds the public web pages (docs/) from src/legal/content.json, so the app
// and the website always say the same thing. Run: node scripts/build-legal-pages.mjs
// GitHub Pages serves the docs/ folder.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const legal = JSON.parse(readFileSync(new URL('../src/legal/content.json', import.meta.url), 'utf8'));
const out = new URL('../docs/', import.meta.url);
mkdirSync(out, { recursive: true });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const shell = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Nooks Owl</title>
<link rel="icon" href="icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Inter:wght@400;600&display=swap">
<style>
:root { --bg:#FFFFFF; --surface:#F5F3F0; --text:#16181D; --muted:#5B6070; --accent:#C2410C; --border:#E6E7EB; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg:#121317; --surface:#1C1E24; --text:#F3F4F6; --muted:#A3A9B6; --accent:#FB923C; --border:#2A2D35; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:16px/1.65 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
header { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:28px; }
header img { width:44px; height:44px; border-radius:12px; }
header > a { white-space:nowrap; } header a { color:inherit; text-decoration:none; font-family:"Bricolage Grotesque", system-ui, sans-serif; font-weight:700; font-size:20px; }
nav { margin-left:auto; display:flex; gap:14px; flex-wrap:wrap; font-size:14px; }
nav a { color:var(--muted); text-decoration:none; font-family:Inter, system-ui, sans-serif; font-weight:400; font-size:14px; } nav a:hover, nav a[aria-current] { color:var(--accent); }
h1 { font-family:"Bricolage Grotesque", system-ui, sans-serif; font-size:clamp(30px,6vw,40px); line-height:1.1; margin:0 0 6px; }
h2 { font-family:"Bricolage Grotesque", system-ui, sans-serif; font-size:21px; margin:32px 0 8px; }
p { margin:0 0 10px; } .muted { color:var(--muted); font-size:14px; }
.contact { margin-top:36px; padding:16px 18px; border-radius:16px; background:var(--surface); }
a.mail { color:var(--accent); font-weight:600; }
.cards { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); margin-top:24px; }
.cards a { display:block; padding:16px; border:1px solid var(--border); border-radius:16px; color:inherit; text-decoration:none; }
.cards a:hover { border-color:var(--accent); } .cards b { display:block; font-size:17px; }
footer { margin-top:48px; padding-top:16px; border-top:1px solid var(--border); color:var(--muted); font-size:13px; }
</style>
</head>
<body><main>
<header><img src="icon.png" alt=""><a href="index.html">Nooks Owl</a>
<nav><a href="terms.html"${title === legal.terms.title ? ' aria-current="page"' : ''}>Terms</a><a href="privacy.html"${title === legal.privacy.title ? ' aria-current="page"' : ''}>Privacy</a><a href="support.html"${title === legal.support.title ? ' aria-current="page"' : ''}>Support</a></nav></header>
${body}
<footer>© 2026 Nooks Owl · For people aged 18 and over</footer>
</main></body></html>
`;

const contact = `<div class="contact"><b>Contact</b><p>Email <a class="mail" href="mailto:${esc(legal.supportEmail)}">${esc(legal.supportEmail)}</a></p></div>`;

for (const [file, page] of [['terms.html', legal.terms], ['privacy.html', legal.privacy], ['support.html', legal.support]]) {
  const body = `<h1>${esc(page.title)}</h1><p class="muted">Last updated ${esc(legal.updated)}</p><p>${esc(page.intro)}</p>
${page.sections.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('\n')}
${contact}`;
  writeFileSync(new URL(file, out), shell(page.title, body));
}

writeFileSync(new URL('index.html', out), shell('A quiet corner to talk', `<h1>A quiet corner to talk with kind people</h1>
<p>Nooks Owl is a voice chat app for adults. Post a topic you'd like to talk about, find people who are open to calls, and keep in touch with text, voice notes and hoots.</p>
<div class="cards"><a href="terms.html"><b>Terms of Use</b><span class="muted">Our rules, including zero tolerance for abuse</span></a>
<a href="privacy.html"><b>Privacy Policy</b><span class="muted">What we collect and why</span></a>
<a href="support.html"><b>Support</b><span class="muted">Get help or contact us</span></a></div>`));

// No Jekyll processing on GitHub Pages.
writeFileSync(new URL('.nojekyll', out), '');
const icon = new URL('../assets/brand/app-icon-1024.png', import.meta.url);
if (existsSync(icon)) copyFileSync(icon, new URL('icon.png', out));
console.log('Built docs/: index, terms, privacy, support');
