# CPadel theme: notes for Claude

- This is a Shopify **Liquid theme** (Online Store 2.0, theme blocks), based on Horizon 4.3.0. It is not a React app.
- Read `README.md` for the workflow. Development store: `cpadel-f8ryefap.myshopify.com`.
- Never act on CPadel's live store without the user's explicit go-ahead. Always push to it with `--unpublished`.
- Run `shopify theme check` before committing. There must be no errors. Stock Horizon has 6 warnings.
- New custom sections and blocks use a `cpadel-` filename prefix. Avoid editing core Horizon files where an override section will do.
- Respect the Horizon licence in `LICENSE.md` (keep the copyright notice).
