# Subscription balance

A DeepSeek Harness Web plugin that shows the subscription behind the model you
are actually using, plus a concise catalog of every provider the Host has
detected. Any route you add in **Settings → Models → Add model provider** is
picked up automatically: it gets a local usage surface and, when priced, an
estimate. Only DeepSeek, Kimi Code, and OpenAI have a real balance or quota
endpoint; everything else is tracked as usage instead of borrowing another
provider's balance.

> **Unofficial plugin.** This is a community project, not a DeepSeek product.
> It is not endorsed by, affiliated with, or supported by DeepSeek, Moonshot AI
> (Kimi), or OpenAI. Provider names and marks belong to their owners.

**Requirements:** DeepSeek Harness `>=0.2.2-rc.1 <0.3.0` with the Web UI. The
range is declared in `engines.dsh`, so DSH refuses to install or boot the plugin
outside it.

Three surfaces share one Host snapshot:

- **Sidebar chip** — the source for the current conversation (or a source you pin).
- **Composer pill** — a session-scoped reading for the conversation currently on
  screen; clicking it opens the detail panel.
- **Settings → Subscription balance** — all sources, display modes, the detected
  provider catalog, and the data-methodology notes.

To open the Settings page, use the **gear at the sidebar foot** (or the app's
Settings shortcut), then choose **Subscription balance** in the left navigation.
It sits directly after **General** and has its own wallet icon. It is a Settings
section, not a page under Settings → Plugins.

## What it shows

- **Coding Plan (Kimi Code):** every quota window the provider returns —
  5-hour, weekly, monthly total, monthly code, and any new key — with the
  provider's own used ratio and reset time. Nothing is estimated.
- **Paid API (DeepSeek):** official account wallet and API-key balance, split
  into top-up and bonus credit. The account route and the API-key route are
  displayed separately and never mixed.
- **OpenAI:** a standard `OPENAI_API_KEY` cannot read a balance or organization
  cost. The plugin still detects the provider, shows local token usage, and links
  to the OpenAI usage/costs pages. For official direct OpenAI, it also ships
  public standard-tier prices for the models configured here, including
  short/long-context tiers, so local estimates work without extra config. If
  `OPENAI_ADMIN_KEY` is configured, it reads the official organization-costs API
  and shows today's organization cost. When it is missing, the OpenAI card shows
  an in-place **Configure key** entry and a link to create an organization admin
  key; the page never asks for the standard inference key for this reading.
- **Other providers:** auto-detected from the Host LLM registry and listed in the
  catalog. A provider without an adapter is shown as “no balance adapter yet”
  instead of being silently omitted.
- **Local estimates:** any API provider with a configured price table gets a
  local estimate. DeepSeek ships with the official CNY peak/off-peak table;
  OpenAI official direct ships with public USD standard prices; other or custom
  routes stay unpriced until you supply their prices. Unpriced providers show
  token counts, not invented money.

The plugin never returns a credential value to the page and never writes one
into plugin configuration. Keys are saved write-only through the Host credential
store, exactly like **Settings → Models**; the page only learns whether a
reference is configured, where it comes from, and whether it is writable. The
plugin never invents an absolute token count for a quota endpoint that only
reports a ratio.

## Any provider, including hand-added routes

The provider list is read from the Host at every refresh, never from a
hard-coded table:

- `llm.listProviders()` lists the routes that can serve requests.
- `llm.listModels(route)` lists each route's models, so a model added in
  Settings appears here without a plugin update.
- The `llm-pi-ai` settings document supplies the display name, endpoint, and
  models of a route created with **Add model provider**, so a relay or a
  self-hosted endpoint appears without editing the plugin.
- A route is classified from structured facts — its exact route id, its
  settings namespace, or its endpoint host (`api.deepseek.com`,
  `api.kimi.com`, `api.openai.com`). A display name is only a last resort, so
  a route called `my-openai-proxy` is never silently priced or queried as
  OpenAI.

A provider without a balance adapter is not hidden and does not borrow another
provider's balance. It gets its own **usage** source: today's requests, tokens,
and a per-model breakdown. If `pricing.<routeId>` (or `pricing.<family>`) is
configured, that source also gets a local estimate in its own currency.

Adding, removing, renaming, or re-modelling a provider in Settings refreshes the
catalog through the Host `llm/adapters-updated`, `llm/models-updated`, and
`settings/document-updated` events. A route that is declared in settings but is
not currently routable is listed as detected but gets no source.

## Current conversation vs pinned source

The default display mode is **Follow current conversation**:

- The composer pill identifies the current session's model (through the Session
  `modelSelection` projection) and shows the matching source.
- The sidebar chip follows that report. If no model has been selected yet, it
  falls back to the global default model.
- Switch the model in the composer: the pill, the sidebar chip, and the
  “Current conversation” card update without reopening the plugin.

The **Display** selector in the panel or Settings can pin one source instead:
Kimi Code, DeepSeek account, DeepSeek API key, OpenAI API, etc. A pinned source
does not change when you switch conversations. The pin is a local display
preference only; it is the only value this plugin writes to browser storage.

## Refresh

- Click the sidebar chip → detail popover with **Refresh now**.
- Composer pill → same panel.
- Settings → **Subscription balance** → **Refresh**.
- Settings → **Price table** → **Check for updates** re-reads the configured
  price source without discarding cached balances.
- The page polls the Host cache every 15 seconds. The Host honours
  `refreshSeconds` (default 60) and re-queries only when stale.
- A failed refresh keeps the last successful reading and marks it stale; it does
  not replace exact numbers with zero.

## Data sources

| Source | Endpoint / service | Exactness |
| --- | --- | --- |
| Kimi Code | `GET https://api.kimi.com/coding/v1/usages` with `KIMI_CODING_API_KEY` | Provider-reported quota |
| DeepSeek account | Host `ctx.deepseekAccount.getBalance` (signed-in Platform wallets) | Official balance |
| DeepSeek API key | `GET https://api.deepseek.com/user/balance` with `DEEPSEEK_API_KEY` | Official balance |
| OpenAI organization | `GET https://api.openai.com/v1/organization/costs` with `OPENAI_ADMIN_KEY` | Official organization cost |
| OpenAI local usage | This profile's `assistant/message` session events | Local token count, not a balance |
| Any other route | Host LLM registry + the `llm-pi-ai` settings document | Local token count only; priced when `pricing.<routeId>` exists |
| Local estimates | This profile's session usage × `pricing` tables | Local estimate, not a bill |

Kimi's usage endpoint is an undocumented provider API. The plugin parses all
`usages.*` keys generically, merges unique legacy `limits[]` / `usage` windows,
and warns when old and new values disagree instead of silently hiding one.

The local estimate excludes other clients, direct API calls, Search/Fetch fees,
aborted or failed requests without a final usage record, and Chinese statutory
holiday discounts. It is labelled **Estimate** everywhere and never presented as
an invoice.

## Provider-neutral estimates

Pricing is data, not provider code:

```text
pricing[provider][model] = {
  currency, input, cachedInput, output,
  peakMultiplier?, peakRule?
}
```

- Every API provider with a table is priced from its own token rows.
- Currencies are summed separately; no FX conversion is invented.
- `peakRule: deepseek-cn` plus `peakMultiplier: 2` encodes DeepSeek's peak rule.
  Other providers default to no peak multiplier.
- Coding Plan providers are quota subscriptions and are deliberately excluded
  from monetary estimates.
- A provider with no table remains visible with request/token counts and a
  “no price table” note.
- A new adapter does not need estimation code: if it contributes
  `localUsage`/usage rows, a configured `pricing.<provider>` immediately makes
  estimates available.

OpenAI is the concrete example: with an official direct endpoint, the plugin
ships the public standard-tier prices for `gpt-5.5-pro`, `gpt-5.6-sol`,
`gpt-6-astra`, and `gpt-6.1-sol`. Requests above 272K input tokens use the long
context table. The `gpt-5.6-sol` promotional price is reflected as of
2026-11-09 (until 2026-11-30). Cache-write premiums, Batch/Flex/Fast/Ultrafast
tiers, and regional-processing uplifts are not modeled; a proxy or unlisted
model remains token-only unless you add its prices.

## Auto-detection and adding a provider

At each snapshot the Host asks the LLM registry for
`listProviders()` and `listConfigurableProviders()`. It maps every registered
route through the adapter table and adds the result to the catalog:

- a known route gets its adapter source, balance/quota, and status;
- an unknown route gets a `provider:<id>` entry with the provider display name,
  route id, and “no balance adapter yet”;
- the catalog refreshes when `llm/adapters-updated`, `llm/models-updated`, or a
  credential changes.

A full adapter is intentionally small. Add one entry to `SOURCE_ADAPTERS` in
`index.js`:

```js
{ id, family, mode, labelKey, match: /provider-route/i }
```

add a collector with the same id, and add it to the `collectors` map. The client
does not need provider-specific code: it renders the normalized source
(`windows`, `wallets`, `officialCost`, `localUsage`, `detailsUrl`) and offers the
new source in the **Display** selector automatically. A provider that has no
adapter still appears in the catalog with a clear “not connected” state and,
where known, a console link.

The source payload is deliberately normalized:

```text
status, exact, fetchedAt, stale, error,
windows[]   // coding plan: label/key, usedPercent, remainingPercent, resetAt
wallets[]   // API balance: currency, balance, kind
officialCost // API cost: currency, amount
localUsage  // tokens/requests from this profile
detailsUrl, links
```

This keeps provider policy inside its adapter and keeps the UI simple.

## Price table updates

The built-in table is dated (`PRICE_VERSION`, currently 2026-11-09). It can be
layered under a reviewable JSON price source:

```yaml
config:
  pricingSource:
    url: https://example.com/dsh-prices.json
    refreshSeconds: 86400
```

The document is `{"version": "...", "updatedAt": "...", "pricing": {provider:
{model: {currency, input, cachedInput, output, ...}}}}`; a bare
provider → model → row map is also accepted. The Host checks it when stale and
from **Settings → Price table → Check for updates**. A failure keeps the last
successful document, marks it stale, and reports the reason; nothing is
silently zeroed. Precedence is built-in < remote source < manual `pricing`.

Both knobs are editable in place: open **Price table → Price configuration** in
Settings for the URL, the check interval, and a provider / model / price row
editor. Saving writes only `pricingSource` and `pricing` into this plugin's row
in the active profile patch through the Host configuration editor — atomic,
comment-preserving, validated against the plugin config, then reloaded — and
the card shows the exact file path. Clearing a field removes that setting. The
same keys can still be edited by hand in `cordis.patch.yml`; if a home patch or
command-line overlay overrides the row, the save is refused with that reason
instead of silently doing nothing.

Automatic scraping of the official pricing pages is deliberately not
implemented. Those pages are HTML with no stable machine-readable endpoint;
parsing them would produce wrong money after any layout change, and the plugin
could not tell that it happened. A JSON table is explicit, reviewable, and
versioned. Without `pricingSource.url` the settings card says exactly that
instead of showing a fake "up to date" state.

## Configuration

All three keys can be saved from **Settings → Subscription balance** without
editing this file; the `*KeyRef` fields below only choose the reference name and
never contain a key value. Optional fields can be set on the inserted row in the
profile patch:

```yaml
- id: subscription-balance
  name: dsh-subscription-balance
  config:
    refreshSeconds: 60
    kimiKeyRef: KIMI_CODING_API_KEY
    deepseekKeyRef: DEEPSEEK_API_KEY
    openaiKeyRef: OPENAI_API_KEY
    openaiAdminKeyRef: OPENAI_ADMIN_KEY
    pricingSource:
      url: https://example.com/dsh-prices.json
      refreshSeconds: 86400
    includeLocalSpend: true
    maxScanSessions: 500
    pricing:
      deepseek:
        deepseek-flash:
          currency: CNY
          input: 1
          cachedInput: 0.02
          output: 4
          peakMultiplier: 2
          peakRule: deepseek-cn
      # Any other route id works the same way, for example a provider you added
      # in Settings → Models → Add model provider:
      # acme-gateway:
      #   qwen3: { currency: USD, input: 0.4, cachedInput: 0.04, output: 1.2 }
      #
      # Fill from the provider's current price page; these are examples only.
      # OpenAI official models already have built-in defaults; override only
      # when a model, proxy, or tier differs.
      openai:
        gpt-5.6-sol:
          currency: USD
          input: 4
          cachedInput: 0.4
          output: 20
          longInput: 8
          longCachedInput: 0.8
          longOutput: 30
          longContextThreshold: 272000
```

`refreshSeconds` is clamped to 15–3600. `includeLocalSpend: false` removes the
estimate and its session scan entirely. Legacy flat DeepSeek rows using
`cacheHit`/`cacheMiss` are still accepted and mapped to the normalized
`cachedInput`/`input` fields.

For OpenAI organization costs, also set `OPENAI_ORG_ID` in the Host environment
when the admin key belongs to more than one organization.

## Configuration entries (required for every config need)

A source that can report `unconfigured` or a `<REF>_REQUIRED` error is also a
configuration surface. Naming the missing variable is not enough: the Settings
page must either let the user fill it in place or point to the exact settings
surface that owns it, and a credential entry must link to the provider page that
issues it. The rule is enforced by data and tests, not by review memory:

| Need | Where the entry appears | Console link | Enforced by |
| --- | --- | --- | --- |
| Kimi Code key | Kimi card when `NO_API_KEY` | Kimi API Platform → API Keys | `configurationTargets`, client smoke |
| DeepSeek API key | DeepSeek API card when `NO_API_KEY` | DeepSeek Platform → API Keys | same |
| OpenAI admin key | OpenAI card, always | OpenAI organization admin keys | same |
| Price source / manual prices | Price table → Price configuration | — | existing config editor |
| DeepSeek account | Account card points to Settings → Account when signed out | account sign-in lives in Settings → Account | text path (shell owns navigation) |

`CREDENTIAL_TARGETS` in `index.js` is the single table. Each row supplies the
source id, the config reference key, localized label/reason keys, and the
provider console URL. `configurationTargets()` resolves it against the row's
customized reference names, each source payload gets its matching targets, and
`meta.credentials` carries the UI-safe status (`configured`, `source`,
`writable`, `canConfigure`; never a value). The client renders one
`CredentialConfig` for each target; its Save button posts to
`POST /dsh-subscription-balance/credentials.json`, which validates the target
against that table and calls `ctx.credentials.set`.

When adding a provider or a new required key:

1. Add the collector as before and register its credential in
   `CREDENTIAL_TARGETS` (or add the source to the explicit account exemption).
2. Add `cred.*` label, reason, and console strings to both `en` and `zh` in
   `client.js`.
3. Render the card through `Sources` so the automatic `CredentialConfig` gets
   the target; a custom card must pass `target` explicitly.
4. Run `npm test`. `test/config-affordance.test.mjs` fails when an adapter reads
   a credential without a target or a target lacks a console URL; the client
   smoke test fails when a card loses its entry.
5. If the new state has a `*_REQUIRED` error, either add it to
   `needsCredential()` or use `unconfigured`; a required-key error without an
   entry is a review defect.

`OPENAI_ORG_ID` remains an optional Host-environment fallback for admin keys
that belong to more than one organization; it is not required to query costs, so
it has no in-page entry. Anything that *blocks* a reading must have one.

## Install

### From npm

```sh
dsh plugin add dsh-subscription-balance
```

Restart DSH (a Web page reload is not enough while the Host is running), then
open **Settings → Subscription balance**. The section sits directly after
**General**.

### From a plugin market

In **Plugins → Discover**, add the index URL that lists this plugin, then install
it from the card. The market installs `dsh-subscription-balance@<version>` after
the compatibility check.

### From a local checkout

```sh
dsh plugin add ./subscription-balance
```

A linked checkout keeps its own `node_modules`; this package has no runtime
dependencies, so nothing else is needed. The profile's `dsh.profile.bundles`
then lists `dsh-subscription-balance`.

### From a tarball

```sh
npm pack
dsh plugin add ./dsh-subscription-balance-1.6.0.tgz
```

## Privacy and security

- **Credentials never leave the Host.** The browser half receives only a
  configured/not-configured status and the reference name. A key is written
  through the Host credential store
  (`POST /dsh-subscription-balance/credentials.json`), is never stored in plugin
  configuration, is never returned in a response, and is never written to
  browser storage.
- **Provider calls happen only on the Host**, and only to the endpoints listed
  in [Data sources](#data-sources). The optional `pricingSource` receives a plain
  GET with no credential attached.
- **Session logs stay local.** Local spend and usage are folded from this
  profile's own committed `assistant/message` events; nothing is uploaded.
- **Browser storage** holds one value: the display-mode pin.
- **Route admission.** `ctx.webServer` is a bare HTTP carrier with no
  authentication or Origin policy, so every route here admits requests through
  the Host Connection policy (`ctx.connection.requestRejection`) when that
  service is mounted, and otherwise through a strict same-origin check. A page
  on another origin cannot read a balance, trigger a provider call, or overwrite
  a credential through the loopback listener. If the Connection service throws,
  the route fails closed with 403.
- **No telemetry.**

## Provider notices

- **Kimi Code quota** comes from `https://api.kimi.com/coding/v1/usages`, which
  is not a documented public API. It can change or be withdrawn without notice;
  a failure is shown in the card and the last successful reading is retained.
  Use it at your own risk and subject to Moonshot AI's terms.
- **DeepSeek** account balance uses the official `ctx.deepseekAccount` service
  and the documented `GET https://api.deepseek.com/user/balance` endpoint.
- **OpenAI** organization cost requires an organization admin key and the
  documented costs API; a standard inference key cannot read a balance.
- Price tables are best-effort data dated by `PRICE_VERSION`. Local estimates
  are estimates, not invoices.

## Notes and limits

- Requires the Host `webServer`; `deepseekAccount`, `credentials`,
  `agentDefaultModel`, `llm` and `sessionQuery` are optional and degrade to a
  visible status. Without `credentials`, credential entries are read-only and
  the page names the Host environment variable to set instead.
- Kimi's endpoint and OpenAI's organization-costs endpoint can change without
  notice; failures are shown and the last successful reading is retained.
- OpenAI standard keys are not admin keys: without `OPENAI_ADMIN_KEY` the plugin
  shows local token counts, links, and the in-place admin-key entry, not an
  official dollar balance.
- DeepSeek's price table is dated; the estimate can drift after a price change
  until this plugin is updated, a `pricingSource` is configured, or `pricing` is
  overridden.
- A hand-added route is classified only from facts the Host exposes. When its
  endpoint is unreadable and its name identifies no family, it stays usage-only
  even if it actually fronts Kimi, OpenAI, or DeepSeek; a balance adapter is
  never guessed from a model name.
- `listModels` is called per route on refresh. Routes whose adapter answers
  slowly are listed without models rather than blocking the whole snapshot.
- The sidebar follows the composer pill's current-conversation report. If the
  Session projection is not available yet, it falls back to the global default;
  the Settings page always lists all detected sources.
- Browser storage contains only the display-mode pin. No telemetry and no
  credential value leaves the Host. The optional price source receives a plain
  GET with no credential attached.

## Verification

```sh
npm test          # node --check plus the four test files
npm pack --dry-run
```

The tests cover Kimi window completeness, legacy/current conflict detection,
DeepSeek wallet parsing, OpenAI organization-cost parsing, cross-provider usage
aggregation, per-model usage, structural provider classification, hand-added
provider sources, price-document validation and precedence, the profile
config-editor write path, credential-target coverage and write validation, the
credential-store write route, provider-neutral pricing/estimates, OpenAI
short/long-context tiers, price/peak math, active source selection, HTTP route
admission (Connection policy and the same-origin fallback), and client rendering
of the chip, panel, Settings page, credential entries, OpenAI card, generic usage
card, price-table card (including the in-place editor), catalog, estimate card,
and current-conversation resolution.

## Release

```sh
npm login            # once per machine; the account needs 2FA
npm test
npm pack --dry-run   # inspect the published file list
npm publish --access public
```

Then tag and push the repository:

```sh
git tag v1.6.0
git push origin main --tags
```

To list the release in a plugin market, add `dsh-subscription-balance` to the
index generator's input, publish the generated `index.json` with its `icons/`
directory, and point **Plugins → Discover → Add index** at it. The market
installs `dsh-subscription-balance@1.6.0` after checking `engines.dsh`.

## License

MIT. See [LICENSE](./LICENSE).
