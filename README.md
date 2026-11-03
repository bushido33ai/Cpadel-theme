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

- **Colours:** night `#0D0D0D` background, ivory `#F5F5F3` text, gold `#C8A45D` accent (`color1`), panels `#1A1A1A` (`color2`), lines `#2E2E2C` (`color3`).
- **Type:** Cormorant for headings (uppercase, wide tracking), Jost for body text and buttons.
- **Shape:** square corners everywhere, gold primary buttons, uppercase wide-tracked button labels.
- Theme-wide settings live in `config/settings_data.json`. Extra brand CSS lives in `snippets/cpadel-brand.liquid`, rendered from `layout/theme.liquid`.

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
