# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## 1.6.0 — 2026-11-10

First public release. Published as `dsh-subscription-balance`; earlier builds
were installed locally under the development name `@local/dsh-subscription-balance`,
which the plugin still accepts when it looks up its own profile row.

### Added

- Sidebar chip, composer pill, and **Settings → Subscription balance** section
  sharing one Host snapshot.
- Exact DeepSeek wallet and API-key balances, Kimi Code quota windows, and
  OpenAI organization costs, each from its own provider surface.
- Provider catalog detected from the Host LLM registry, including routes added
  in **Settings → Models → Add model provider**; unknown routes stay visible as
  usage-only instead of borrowing another provider's balance.
- Provider-neutral price tables with an optional remote `pricingSource` JSON
  document and in-place editing through the Host configuration editor.
- In-place credential configuration that writes through the Host credential
  store and never returns a secret to the page.
- Local usage and priced estimates from this profile's committed session logs.
- Route admission through the Host Connection policy with a same-origin
  fallback, so the loopback routes cannot be driven by a cross-site page.
- `engines.dsh` compatibility range, MIT license, and test coverage for the
  admission policy.
