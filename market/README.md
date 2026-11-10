# Plugin market index

This directory is a format-1 DeepSeek Harness plugin market index. It lists the
plugin in this repository so users can install it from **Plugins → Discover**
instead of typing an npm command.

- Index URL:
  `https://raw.githubusercontent.com/yanboyang97/dsh-subscription-balance/main/market/index.json`
- Icon: `icons/dsh-subscription-balance.svg`, resolved relative to the index URL.

## Add it in DSH

1. Enable the experimental **Custom plugin market** bundle (Plugins → Experimental
   plugins → Custom plugin market).
2. Open **Plugins → Discover → Add index source**.
3. Paste the index URL above.

The market reads the file with the format-1 validator
(`@deepseek-ai/dsh-plugin-market-index`) and installs
`dsh-subscription-balance@1.6.0` from npm after checking `engines.dsh`.

## Publishing an update

When a new version is published to npm, add it to `plugins[0].versions` with its
npm `publishTimestamp` (Unix seconds) and push. Keep `engines.dsh` identical to
the package manifest; DSH re-checks it at install time.
