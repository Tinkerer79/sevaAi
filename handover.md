# SevaManipur AI Handover

Updated: 2026-10-09

## Latest session update — 2026-10-09

- Revised the six-slide SW-01 pitch deck for accuracy and simpler wording. Regenerated both `SevaManipur_AI4SEVA_SW01.pptx` and its PDF from `scripts/build_pitch.py`; confirmed the PDF has six slides and checked the rendered pages for layout issues.
- The deck now says the Vercel app uses Supabase for the scheme catalog and signed-in data. It distinguishes the seven source-linked Social Welfare records, which still need department confirmation, from the sample records. It describes the matcher as a basic prototype using age, work, area and income.
- **No screenshots or image assets were edited.** The deck build continues to use the existing `gui-test-screenshots/t1_home_hero.png` image.
- The scheme catalog and matching-result cards have an AI “More information” action and an official/source link when the catalog record has one. Added official destinations to the legacy sample records that were missing links (CMHT, NSAP pension applications, Kisan Credit Card); these remain labelled demo/sample data even though the links are official.
- Document Assistant already sends the checked/missing document list to Seva AI. It now also has an AI-generated service/checklist guide modal and a direct official-link button when a service has one. The explainer uses the server-fetched catalog record; the separate chat action includes the user's checked/missing list.
- The revised PowerPoint and PDF were regenerated from `scripts/build_pitch.py`; the PDF contains six slides and rendered cleanly. Removed placeholder team name/number text. Screenshots were left untouched.
- Added official destinations to all previously unlinked built-in scheme records that had a findable official landing page. Built-in sample schemes remain labelled demo data regardless of whether they link to an official source.
- `npm run build` completed successfully after the Document Assistant changes; `git diff --check` passed.
- Presentation, scheme-link and Document Assistant changes were committed as `13db878` and pushed to `origin/master`. The worktree should be clean. Do not overwrite the screenshot or rebuild the presentation from a different image without the user asking.

## User goals in progress

- Fix Vercel complaint submission returning 404.
- Seed the three demo complaint IDs in Supabase and show all complaints in Admin.
- Add AI summaries for Admin complaints and on-demand AI details for schemes/services.
- Improve language coverage, fix clickable links in AI Markdown, and add assistant animations.
- Make signed-in AI chat remember prior turns and use the authenticated user's profile context.
- Encrypt private fields server-side before storing them in Supabase.
- Commit and push the changes (the user authorized this).

## Current implementation

- Vercel has exactly 12 function files outside `api/_lib/`; keep this at or below 12 for Hobby deployments.
- Added a bare `/api/complaints` handler and consolidated complaint metadata through a Vercel rewrite. Complaint submissions call a Supabase RPC; tracking reads the three synthetic demo rows and future submissions.
- The user's pasted complaint body was used only to check field names. Its personal name and phone were not stored.
- Seeded synthetic records in Supabase for `SM-2026-10482`, `SM-2026-10893`, and `SM-2026-10975`; no personal information is in these fixtures.
- Added admin summary, list, detail, and update APIs. Admin RPCs check server-managed `app_metadata.role=admin`; Supabase ACL checks confirmed anonymous execution is denied for admin RPCs.
- Added scheme/service explainer modal APIs and UI.
- Added signed-in Supabase conversation history RPCs. Latest 100 messages are retained per conversation; the model receives at most the latest 12 turns/16,000 characters. Guests remain temporary.
- Chat sends a verified first name and an allow-listed district to Gemini when present in the signed-in Supabase profile. It does not send account email, phone, provider IDs, or auth tokens to Gemini. Privacy copy was updated.
- AI Markdown links render as new-tab `http(s)` anchors; unsafe URL schemes are not accepted.
- Assistant message entrance, empty-state float, and composer focus animations are added. Site reduced-motion CSS applies.
- Added AES-256-GCM encryption for complaint names/phones and signed-in chat titles/messages before Supabase writes. Ciphertext is stored in renamed `*_encrypted` columns. Decryption happens only in server handlers after Supabase admin/owner checks.
- Supabase schema changes were applied through MCP. Local filenames now use the exact versions and names from remote migration history (`20261009041403` through `20261009042927`).
- Remote history also contains `20261008152134_create_scheme_catalog`, which has no matching migration file in this worktree. Reconcile that older migration before running `supabase db push` from this checkout.

## Vercel encryption key

Generated a dedicated `PII_ENCRYPTION_KEY` and added it as a hidden Vercel secret to Production and Preview, using the same value in both. Its value was not printed or saved in the repo. Generate a replacement only if needed with:

```sh
openssl rand -base64 32
```

Keep a secure backup: losing the key means encrypted complaint contacts and saved chat text cannot be decrypted. Do not replace it without a planned re-encryption. Production and Preview need a redeploy after code is pushed so the new functions read this variable.

`.env.example` and `README.md` document the variable and setup. No secret value is in this handover.

## Deployment/browser notes

- The user-referenced `seva-ai-project-enclave.vercel.app` deployment is behind Vercel login protection in the available browser, so its app pages could not be inspected there.
- Deployment for commit `0b26dd7` reached Ready. `/api/complaints/meta` and `/api/complaints/track/SM-2026-10482` both return HTTP 200 on `seva-ai-gold.vercel.app`; `/assistant` and `/schemes` direct loads return the SPA. The `seva-ai-project-enclave.vercel.app` alias still returns Vercel's authentication redirect from an unauthenticated request, so use the public `seva-ai-gold.vercel.app` alias for outside smoke checks.
- Optional complaint photo uploads are still unavailable in the Vercel complaint handler; a submission with a photo gets a clear 400 response. The user's captured failing request had no photo.
- No live form submission or OAuth sign-in was performed.

## Worktree and next steps

- Repository: `/home/tombi/sevaAi`
- Branch: `master`; prior HEAD `9ff2ceb`; remote `origin` is `https://github.com/Tinkerer79/sevaAi.git`.
- Commits `720dbdc` (implementation), `6dce4eb` (complaint rewrite correction), and `0b26dd7` (handover status) were pushed to `origin/master`.
- Production Vite build passed after the routing correction (`npm run build`, Vite 5.4.21). API syntax checks and `git diff --check` passed; function count is 12.
- Remaining end-to-end checks need a signed-in citizen/admin session: submit a synthetic complaint, test retained chat turns/profile context, and test admin summary/status updates. No real personal data was submitted during smoke checks.

### Remaining checklist

- [x] Add AES key to Vercel Production and Preview as a hidden secret.
- [x] Apply Supabase migrations and seed demo complaint rows.
- [x] Keep Vercel function count within Hobby limit (12).
- [x] Commit and push implementation (`720dbdc`) and complaint rewrite fix (`6dce4eb`).
- [x] Confirm the latest deployment is Ready and the complaint metadata/demo tracker endpoints return 200 on the public alias.
- [x] Push this handover and deployment status (`0b26dd7`).
- [ ] Complete authenticated complaint, chat-history, and admin smoke checks.
- [ ] Have a qualified reviewer assess privacy notices, legal basis/consent, retention/deletion, breach response, vendor terms and any child-user requirements before presenting this as compliant.
- [ ] Optional: provision private photo storage if Vercel complaint photo uploads are required.

## Important limits

Encryption is one technical safeguard; do not claim the prototype is legally compliant. India’s DPDP Act/Rules also involve notice, purpose, rights, retention, breach handling and processor arrangements. The precise obligations and effective dates need legal review. Supabase-managed authentication records are not app-layer encrypted by this change; Supabase must continue managing those fields for login. The local SQLite backend is separate from the Vercel/Supabase path.
