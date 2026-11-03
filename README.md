# CPadel Shopify theme

Custom Shopify theme for **CPadel** (padel rackets, https://www.cpadel.uk), built by Hailo Digital.

- **Base:** Shopify Horizon 4.3.0 (`Shopify/horizon` @ `dfad90d`). See `LICENSE.md`: a derived theme may be delivered to a merchant for their own store only. It must not be resold or listed anywhere.
- **Development store:** `cpadel-f8ryefap.myshopify.com` (Partner development store, owned by Hailo Digital)
- **Live store:** CPadel's own store. We get access by requesting collaborator access from the Partner dashboard. Never use the client's login.

## Dev store themes

- **CPadel (dev)**, unpublished, theme ID `204073762897`. Push updates with `shopify theme push --theme 204073762897`.
  Preview (log in to the store admin first): https://cpadel-f8ryefap.myshopify.com?preview_theme_id=204073762897

## Brand foundation

Taken from CPadel's current store (Prestige theme, password page at cpadel.uk):

- **Colours (from the Control Series racket):** cream `#F4EEE6` background, ink `#2B1618` text, burgundy `#6B1E24` accent and buttons (`color1`), sand `#EADFD0` panels (`color2`), lines `#D8C7B3` (`color3`). Buttons deepen to oxblood `#3F1B19` on hover. (Replaced the earlier black and gold, which came from the pre-launch password page.)
- **Type:** Cormorant for headings (uppercase, wide tracking), Jost for body text and buttons.
- **Shape:** square corners everywhere, gold primary buttons, uppercase wide-tracked button labels.
- Theme-wide settings live in `config/settings_data.json`. Extra brand CSS lives in `snippets/cpadel-brand.liquid`, rendered from `layout/theme.liquid`.

## Logos

From CPadel's current store (`CPadel_Logo.png`, `Cpadel_text_copy.png`), cropped and recoloured from gold to flat brand colours:

- `assets/cpadel-wordmark-{burgundy,cream}.png`: the CPADEL wordmark. Also in the store's Files and set as the theme logo (burgundy) and inverse logo (cream).
- `assets/cpadel-emblem-{burgundy,cream}.png`: the crowned C. Used in the hero and the sign-off band.
- `assets/cpadel-lockup-{burgundy,cream}.png`: crowned C beside the wordmark. Also in the store's Files and set as the theme logo (burgundy) and inverse logo (cream), 44 px tall on desktop and 30 px on mobile.
- `assets/cpadel-favicon.png`: burgundy emblem on cream, set as the favicon.

The emblem source is only 226 px wide, so ask CPadel for a vector (SVG/AI/EPS) or a large PNG before using it bigger than about 120 px.

`sections/cpadel-signoff.liquid` is a brand band (emblem, large wordmark, strapline) placed above the footer.

## Racket line-up

`sections/cpadel-racket-lineup.liquid` lists the rackets on sale from a collection (default: all products), then one "Coming soon" card per block. Coming-soon cards show the crowned C, or a faded, blurred teaser image if one is picked. On the dev store the only product is **CPadel Control Series** (`/products/cpadel-control-series`, placeholder price £149.00, inventory not tracked).

## Homepage hero

`sections/cpadel-hero.liquid` is a full-screen photo hero (eyebrow, heading, text, two buttons). With no image chosen it uses the bundled sunlit court photo, `assets/cpadel-court-sun-2048.jpg` (desktop) and `assets/cpadel-court-sun-1200.jpg` (mobile crop). The photo is AI-generated for CPadel (no people, logos or text) and is also in the dev store's Files as `cpadel-court-sun.png`. Swap in a real photoshoot image from the theme editor when one exists.

## Motion

GSAP 3.15 (`assets/gsap.min.js`, `assets/ScrollTrigger.min.js`, standard no-charge licence) is bundled and loaded deferred from `snippets/cpadel-scripts.liquid`. CPadel's own motion is in `assets/cpadel-motion.js`:

- `<cpadel-reveal>` (racket line-up): cards wipe up from behind a curtain as they scroll in, images drift with scroll, and `[data-tilt]` cards tilt towards a mouse pointer with a soft glare.
- `sections/cpadel-spec-band.liquid`: scrolling band of words with spinning padel balls. CSS loop by default; `<cpadel-band-motion>` takes over to make it speed up, lean and reverse with scroll velocity.
- `<cpadel-hero-motion>` (in `sections/cpadel-hero.liquid`): opening sequence (crowned C sweeps in, crown drops on, wordmark wipes in, cream then burgundy curtains lift), then the headline rises letter by letter (SplitText) and the court settles. Plays once per browser session, never with reduced motion or in the theme editor; click or any key skips it; a 4 s failsafe removes the overlay if the script never starts. Scroll parallax on the photo and copy. The Control Series cut-out stands on the court to the right of the copy (top right on phones): it swings up onto the court after the intro, then floats gently, and drifts up on scroll. The hero is sized to the window less the announcement bar (`--header-group-height`), so the copy and buttons are on the first screen.
- `<cpadel-showcase>` (`sections/cpadel-racket-showcase.liquid`): pinned for ~3 screens; background cream to burgundy to ink, a giant outlined word slides past, the racket cut-out rises and turns in 3D with a light sheen, leader lines draw to the spec callouts (positions set per block in % of the racket), then the racket steps aside for the price card. Phones show one spec at a time under the racket.
- `<cpadel-statement>` (`sections/cpadel-statement.liquid`): the closing brand statement. A faint plan of a padel court draws its lines as the section scrolls in, and the statement fills in word by word from pale to ink (SplitText words, scrubbed). Italic words are burgundy. No pinning, so the page ends calmly after the showcase.
- `[data-magnetic]`: buttons pull towards a mouse pointer.

## Other CPadel sections

- `sections/cpadel-story.liquid` (homepage, after the racket line-up): "Our story", who is behind CPadel. Court photo (optional label) beside the story text and up to three pillars, on a burgundy band. Has `id="our-story"`; the hero's "Our story" button jumps to it by default. Photo and pillars wipe in via `<cpadel-reveal>`.
- `sections/cpadel-contact.liquid` (used by `templates/page.contact.json`): two-column contact page. A brand panel over the court photo (heading, intro, topic blocks, email, social links) and a contact form with visible labels and a topic picker built from the same blocks.
- `snippets/cpadel-social-links.liquid`: Facebook, Instagram and TikTok icon buttons, used in the sign-off band and on the contact page. Blank links show as placeholders (`href="#"`); fill them in the theme editor (CPadel sign-off and CPadel contact sections).
- `assets/cpadel-racket-cutout.webp` is the Control Series photo with its background removed (rembg, isnet-general-use). `assets/cpadel-emblem-{c,crown}-*.png` are the emblem split for the intro.
- GSAP's SplitText (`assets/SplitText.min.js`) is bundled alongside GSAP and ScrollTrigger.

Everything is visible and static without JavaScript, and `prefers-reduced-motion` turns the motion off.

**Important: Horizon's scroll container.** On screens 990 px and wider Horizon locks the document and scrolls `.page-wrapper` instead (see `assets/scroll-container.js`); on phones the document scrolls. ScrollTrigger is pointed at the same element (`ScrollTrigger.defaults({ scroller })` in `cpadel-motion.js`), and every motion element is a `MotionElement` with `start()`/`stop()` so all of them are rebuilt, in page order, when the breakpoint is crossed. Any new scroll animation must use the default scroller, not `window`. When testing locally, render sections inside Horizon's real structure (`.page-wrapper > main.content-for-layout > .shopify-section`) with `assets/base.css`, or the desktop scroller isn't reproduced.

## Workflow

1. Build and preview against the development store.
2. CPadel reviews it on the password-protected development store or a theme preview link.
3. Once approved, upload to CPadel's store as an **unpublished** theme, check it with their apps, payments and shipping, then publish. Their old theme stays available as a fallback.

## Commands

Requires the Shopify CLI (`npm i -g @shopify/cli`).

```bash
shopify theme dev --store cpadel-f8ryefap.myshopify.com     # local preview with hot reload
shopify theme check                                          # lint
shopify theme push --unpublished --store <store>             # upload as a new unpublished theme
```

In a non-interactive or cloud environment, authenticate with a Theme Access password set as `SHOPIFY_CLI_THEME_TOKEN`, plus `SHOPIFY_FLAG_STORE`.

## Conventions

- Put CPadel-specific sections and blocks in their own files with a `cpadel-` prefix, so Horizon updates can be merged with fewer conflicts.
- Animation uses GSAP. Load it in `layout/theme.liquid`, respect `prefers-reduced-motion`, and keep it progressive (content must work without JS).
- `config/settings_data.json` is changed by the theme editor too. Pull before editing it (`shopify theme pull --only config/settings_data.json`).
