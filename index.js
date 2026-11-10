/**
 * Subscription balance — Host half.
 *
 * Reads only official, account-bound data:
 *   - signed-in DeepSeek account wallets through ctx.deepseekAccount
 *   - DeepSeek API-key balance through GET https://api.deepseek.com/user/balance
 *   - Kimi Code quota through GET https://api.kimi.com/coding/v1/usages
 *
 * The first two are exact provider balances. Kimi's usage endpoint reports
 * provider-owned windows (5h, weekly, monthly, and any new key it adds); those
 * are passed through without inventing absolute token counts.
 *
 * Every other configured route — including one added through Settings → Models
 * → Add model provider — is enumerated from the Host LLM registry, gets its own
 * local-usage source, and is priced only when the user configured a table for
 * it. Its balance is never guessed from another provider.
 *
 * DeepSeek does not expose a per-day spend endpoint. The only "spend" number
 * here is a clearly labelled local estimate built from this profile's committed
 * session logs and the official 2026-11-09 CNY price table. It is never mixed
 * with the exact balance.
 */

const ROUTE = '/dsh-subscription-balance'
const PACKAGE_NAME = 'dsh-subscription-balance'
/** Pre-rename package name, still accepted so an existing profile config keeps working. */
const LEGACY_PACKAGE_NAME = '@local/dsh-subscription-balance'
const CONFIG_BODY_LIMIT = 256 * 1024
const FETCH_TIMEOUT_MS = 15_000
const ACCOUNT_TIMEOUT_MS = 15_000
const PRICE_VERSION = '2026-11-09'
const PRICING_URL = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing'
const PLATFORM_USAGE_URL = 'https://platform.deepseek.com/usage'
const PLATFORM_TOPUP_URL = 'https://platform.deepseek.com/top_up'
const KIMI_USAGE_URL = 'https://api.kimi.com/coding/v1/usages'
const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance'
const OPENAI_COSTS_URL = 'https://api.openai.com/v1/organization/costs'
const OPENAI_USAGE_PAGE = 'https://platform.openai.com/usage'
const OPENAI_COSTS_PAGE = 'https://platform.openai.com/costs'
const DEEPSEEK_KEY_REF = 'DEEPSEEK_API_KEY'
const KIMI_KEY_REF = 'KIMI_CODING_API_KEY'
const OPENAI_KEY_REF = 'OPENAI_API_KEY'
const OPENAI_ADMIN_KEY_REF = 'OPENAI_ADMIN_KEY'
const DEEPSEEK_KEYS_PAGE = 'https://platform.deepseek.com/api_keys'
const KIMI_KEYS_PAGE = 'https://platform.kimi.com/console/api-keys'
const OPENAI_ADMIN_KEYS_PAGE = 'https://platform.openai.com/settings/organization/admin-keys'
const CREDENTIAL_VALUE_LIMIT = 8192
const CREDENTIAL_VALUE_PATTERN = /^[\x21-\x7E]+$/

/**
 * Every credential a source resolves is also a configuration surface. A source
 * may fail only because one of these references is missing, so the Settings
 * page must be able to fill it rather than merely name it. Keep this table and
 * the client's `CredentialConfig` mapping in step: an adapter that reads a new
 * key without a target — or a target without a console link — is a review
 * defect, and test/config-affordance.test.mjs fails on it.
 */
const CREDENTIAL_TARGETS = [
  {
    id: 'kimi-key',
    sourceId: 'kimi',
    role: 'primary',
    refKey: 'kimiKeyRef',
    labelKey: 'cred.kimiLabel',
    requirementKey: 'cred.kimiNeed',
    consoleUrl: KIMI_KEYS_PAGE,
    consoleLabelKey: 'cred.kimiConsole',
  },
  {
    id: 'deepseek-key',
    sourceId: 'deepseekKey',
    role: 'primary',
    refKey: 'deepseekKeyRef',
    labelKey: 'cred.deepseekLabel',
    requirementKey: 'cred.deepseekNeed',
    consoleUrl: DEEPSEEK_KEYS_PAGE,
    consoleLabelKey: 'cred.deepseekConsole',
  },
  {
    id: 'openai-admin-key',
    sourceId: 'openai',
    role: 'admin',
    refKey: 'openaiAdminKeyRef',
    labelKey: 'cred.openaiAdminLabel',
    requirementKey: 'cred.openaiAdminNeed',
    consoleUrl: OPENAI_ADMIN_KEYS_PAGE,
    consoleLabelKey: 'cred.openaiAdminConsole',
    errorCode: 'OPENAI_ADMIN_KEY_REQUIRED',
  },
]

const SOURCE_ADAPTERS = [
  { id: 'kimi', family: 'kimi', mode: 'coding-plan', labelKey: 'source.kimi' },
  { id: 'deepseekAccount', family: 'deepseek', mode: 'api', labelKey: 'source.deepseekAccount' },
  { id: 'deepseekKey', family: 'deepseek', mode: 'api', labelKey: 'source.deepseekKey' },
  { id: 'openai', family: 'openai', mode: 'api', labelKey: 'source.openai' },
]

export const SOURCE_ADAPTER_IDS = Object.freeze(SOURCE_ADAPTERS.map((adapter) => adapter.id))

const SOURCE_META = Object.fromEntries(SOURCE_ADAPTERS.map((adapter) => [
  adapter.id,
  { family: adapter.family, mode: adapter.mode, labelKey: adapter.labelKey },
]))

const PROVIDER_DISPLAY_NAMES = {
  'deepseek-official': 'DeepSeek API',
  'deepseek-account': 'DeepSeek Account',
  'kimi-coding': 'Kimi Code',
  'openai': 'OpenAI',
}

export const name = 'dsh-subscription-balance'
export const inject = ['webServer']

class SourceError extends Error {
  constructor(code, detail, status) {
    super(detail || code)
    this.name = 'SourceError'
    this.code = code
    this.detail = detail || null
    this.status = status === undefined ? null : status
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asString(value) {
  return typeof value === 'string' && value !== '' ? value : null
}

function asNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Admission check shared by every HTTP handler below.
 *
 * `ctx.webServer` is a bare `node:http` carrier: it owns no authentication and
 * no Origin policy, so a route registered directly on it is reachable from any
 * page that can open the loopback port. The Connection plugin owns the
 * Host/Origin checks and the browser-session authentication for Host routes, so
 * apply it whenever it is mounted. Compositions without Connection (headless,
 * embedded, tests) fall back to a strict same-origin check: a cross-site page
 * must not be able to read a balance, spend a provider call, or overwrite a
 * credential through the loopback listener.
 *
 * @param req - node:http request; only `headers` is read.
 * @param connection - the optional `ctx.connection` service.
 * @returns 401/403 when the request must be refused, otherwise null.
 */
export function requestRejection(req, connection) {
  if (connection !== undefined && connection !== null && typeof connection.requestRejection === 'function') {
    try {
      const rejection = connection.requestRejection({ headers: (req && req.headers) || {} })
      if (rejection === 401 || rejection === 403) return rejection
      return null
    } catch {
      return 403
    }
  }
  const headers = (req && req.headers) || {}
  const origin = typeof headers.origin === 'string' ? headers.origin : null
  if (origin !== null) {
    let originHost = null
    try {
      originHost = new URL(origin).host.toLowerCase()
    } catch {
      // 'null' and every non-URL Origin fail closed.
      return 403
    }
    const host = typeof headers.host === 'string' ? headers.host.toLowerCase() : null
    if (host === null || originHost !== host) return 403
  }
  if (headers['sec-fetch-site'] === 'cross-site') return 403
  return null
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clampInt(value, fallback, min, max) {
  const parsed = asNumber(value)
  if (parsed === null) return fallback
  return Math.round(clamp(parsed, min, max))
}

function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clampPercent(value) {
  return clamp(round(value, 2), 0, 100)
}

function isoOf(value) {
  if (typeof value === 'string' && value.trim() !== '') {
    const time = Date.parse(value)
    if (Number.isFinite(time)) return new Date(time).toISOString()
    return null
  }
  const number = asNumber(value)
  if (number !== null && number > 0) {
    const time = number < 10_000_000_000 ? number * 1000 : number
    return new Date(time).toISOString()
  }
  return null
}

function validRef(value) {
  return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

function defaultOpenAITable() {
  // Official standard-tier USD prices per 1M tokens, short context ≤272K.
  // Long-context prices are used when a request's input exceeds 272K tokens.
  return {
    'gpt-5.5-pro': {
      currency: 'USD', input: 30, cachedInput: 30, output: 180,
      longInput: 60, longCachedInput: 60, longOutput: 270, longContextThreshold: 272_000,
      peakMultiplier: 1, peakRule: 'none',
    },
    'gpt-5.6-sol': {
      currency: 'USD', input: 4, cachedInput: 0.4, output: 20,
      longInput: 8, longCachedInput: 0.8, longOutput: 30, longContextThreshold: 272_000,
      peakMultiplier: 1, peakRule: 'none',
    },
    'gpt-5.6': {
      currency: 'USD', input: 4, cachedInput: 0.4, output: 20,
      longInput: 8, longCachedInput: 0.8, longOutput: 30, longContextThreshold: 272_000,
      peakMultiplier: 1, peakRule: 'none',
    },
    'gpt-6-astra': {
      currency: 'USD', input: 10, cachedInput: 1, output: 50,
      longInput: 20, longCachedInput: 2, longOutput: 75, longContextThreshold: 272_000,
      peakMultiplier: 1, peakRule: 'none',
    },
    'gpt-6.1-sol': {
      currency: 'USD', input: 2, cachedInput: 0.1, output: 10,
      longInput: 4, longCachedInput: 0.2, longOutput: 15, longContextThreshold: 272_000,
      peakMultiplier: 1, peakRule: 'none',
    },
  }
}

function defaultDeepseekTable() {
  return {
    'deepseek-flash': {
      currency: 'CNY', input: 1, cachedInput: 0.02, output: 4, peakMultiplier: 2, peakRule: 'deepseek-cn',
    },
    'deepseek-v4-pro': {
      currency: 'CNY', input: 4.5, cachedInput: 0.15, output: 13.5, peakMultiplier: 2, peakRule: 'deepseek-cn',
    },
  }
}

function hasPriceFields(row) {
  return isObject(row)
    && (row.input !== undefined || row.cacheMiss !== undefined || row.cacheHit !== undefined || row.cachedInput !== undefined || row.output !== undefined)
}

/**
 * A normalized price row is provider-neutral. Legacy DeepSeek rows using
 * cacheHit/cacheMiss are accepted and mapped to cachedInput/input.
 */
function normalizePriceRow(row) {
  if (!isObject(row)) return null
  const input = asNumber(row.input) ?? asNumber(row.cacheMiss)
  const cachedInput = asNumber(row.cachedInput) ?? asNumber(row.cacheHit) ?? input
  const output = asNumber(row.output)
  if (input === null || cachedInput === null || output === null) return null
  if (input < 0 || cachedInput < 0 || output < 0) return null
  const legacyDeepseek = row.cacheHit !== undefined || row.cacheMiss !== undefined
  const currency = (asString(row.currency) || 'CNY').toUpperCase()
  const peakMultiplier = asNumber(row.peakMultiplier) ?? (legacyDeepseek ? 2 : 1)
  const peakRule = asString(row.peakRule) || (legacyDeepseek ? 'deepseek-cn' : 'none')
  const longContextThreshold = asNumber(row.longContextThreshold)
  const longInput = asNumber(row.longInput)
  const longCachedInput = asNumber(row.longCachedInput)
  const longOutput = asNumber(row.longOutput)
  return {
    currency,
    input,
    cachedInput,
    output,
    peakMultiplier,
    peakRule,
    longContextThreshold: longContextThreshold === null ? null : longContextThreshold,
    longInput: longInput === null ? input : longInput,
    longCachedInput: longCachedInput === null ? cachedInput : longCachedInput,
    longOutput: longOutput === null ? output : longOutput,
  }
}

function defaultPricing() {
  return { deepseek: defaultDeepseekTable(), openai: defaultOpenAITable() }
}

/** Deep-merge price layers, later layers winning per provider/model. */
function mergePricing(...layers) {
  const tables = {}
  for (const layer of layers) {
    if (!isObject(layer)) continue
    for (const [provider, rows] of Object.entries(layer)) {
      if (typeof provider !== 'string' || provider === '' || !isObject(rows)) continue
      const table = tables[provider] || {}
      for (const [model, row] of Object.entries(rows)) {
        if (typeof model !== 'string' || model === '' || !isObject(row)) continue
        table[model] = row
      }
      if (Object.keys(table).length > 0) tables[provider] = table
    }
  }
  return tables
}

/**
 * Price tables written by the user, without the built-in defaults. The runtime
 * layers them over the defaults and over a fetched price source, so an update
 * can move a built-in model price without the defaults winning.
 */
function manualPricing(raw) {
  const tables = {}
  if (!isObject(raw)) return tables
  const entries = Object.entries(raw)
  const nested = entries.some(([, value]) => isObject(value) && !hasPriceFields(value))
  if (!nested) {
    const table = {}
    for (const [model, row] of entries) {
      if (typeof model !== 'string' || model === '') continue
      const normalized = normalizePriceRow(row)
      if (normalized !== null) table[model] = normalized
    }
    if (Object.keys(table).length > 0) tables.deepseek = table
    return tables
  }
  for (const [provider, rows] of entries) {
    if (typeof provider !== 'string' || provider === '' || !isObject(rows)) continue
    const table = {}
    for (const [model, row] of Object.entries(rows)) {
      if (typeof model !== 'string' || model === '') continue
      const normalized = normalizePriceRow(row)
      if (normalized !== null) table[model] = normalized
    }
    if (Object.keys(table).length > 0) tables[provider] = table
  }
  return tables
}

/** Backward-compatible view: built-in defaults plus the user's overrides. */
function normalizePricing(raw) {
  return mergePricing(defaultPricing(), manualPricing(raw))
}

function validHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username !== '' || url.password !== '') return null
    return url.toString()
  } catch {
    return null
  }
}

function normalizePricingSource(raw) {
  if (typeof raw === 'string') {
    return { url: validHttpUrl(raw), refreshSeconds: 86_400 }
  }
  const source = isObject(raw) ? raw : {}
  return {
    url: validHttpUrl(source.url),
    refreshSeconds: clampInt(source.refreshSeconds, 86_400, 300, 7 * 86_400),
  }
}

const MAX_PRICING_PROVIDERS = 40
const MAX_PRICING_MODELS = 400

/**
 * Validate a configuration payload written from the Settings page. Only the
 * pricing knobs are writable; invalid rows are dropped by the same normalizer
 * used for the row config, and counts are capped so a pasted blob cannot grow
 * the snapshot without bound.
 */
export function normalizePricingConfigInput(raw) {
  const body = isObject(raw) ? raw : {}
  const pricingSource = normalizePricingSource(body.pricingSource)
  const pricing = manualPricing(isObject(body.pricing) ? body.pricing : {})
  const providers = Object.keys(pricing)
  if (providers.length > MAX_PRICING_PROVIDERS) {
    throw new SourceError('CONFIG_TOO_LARGE', `At most ${MAX_PRICING_PROVIDERS} providers are allowed.`)
  }
  let models = 0
  for (const provider of providers) models += Object.keys(pricing[provider]).length
  if (models > MAX_PRICING_MODELS) {
    throw new SourceError('CONFIG_TOO_LARGE', `At most ${MAX_PRICING_MODELS} model rows are allowed.`)
  }
  return { pricingSource, pricing, models }
}

/** Store only fields that differ from the normalizer's defaults, so the
 * profile patch keeps a compact, hand-editable price row. */
function compactPriceRow(row) {
  const compact = {
    currency: row.currency,
    input: row.input,
    cachedInput: row.cachedInput,
    output: row.output,
  }
  if (row.peakMultiplier !== 1) compact.peakMultiplier = row.peakMultiplier
  if (row.peakRule !== 'none') compact.peakRule = row.peakRule
  if (row.longContextThreshold !== null) {
    compact.longContextThreshold = row.longContextThreshold
    compact.longInput = row.longInput
    compact.longCachedInput = row.longCachedInput
    compact.longOutput = row.longOutput
  }
  return compact
}

function compactPricing(pricing) {
  const tables = {}
  for (const [provider, table] of Object.entries(isObject(pricing) ? pricing : {})) {
    if (!isObject(table)) continue
    const rows = {}
    for (const [model, row] of Object.entries(table)) {
      if (isObject(row)) rows[model] = compactPriceRow(row)
    }
    if (Object.keys(rows).length > 0) tables[provider] = rows
  }
  return tables
}

/**
 * A price document is `{ version, updatedAt?, source?, pricing: {...} }` or a
 * bare provider→model→row map. It is data only: no code, no remote schema
 * extension, and every row goes through the same normalizer as local config.
 */
export function parsePricingDocument(body) {
  const document = isObject(body) ? body : null
  if (document === null) throw new SourceError('PRICING_INVALID', 'The price source did not return a JSON object.')
  const raw = isObject(document.pricing) ? document.pricing : document
  const pricing = manualPricing(raw)
  if (Object.keys(pricing).length === 0) {
    throw new SourceError('PRICING_INVALID', 'The price source contains no usable price row.')
  }
  return {
    version: asString(document.version),
    updatedAt: asString(document.updatedAt),
    source: asString(document.source),
    pricing,
  }
}

/** Normalize the row's config without requiring a schema dependency. */
export function normalizeConfig(raw) {
  const source = isObject(raw) ? raw : {}
  return {
    refreshSeconds: clampInt(source.refreshSeconds, 60, 15, 3600),
    kimiKeyRef: validRef(source.kimiKeyRef) ? source.kimiKeyRef : KIMI_KEY_REF,
    deepseekKeyRef: validRef(source.deepseekKeyRef) ? source.deepseekKeyRef : DEEPSEEK_KEY_REF,
    openaiKeyRef: validRef(source.openaiKeyRef) ? source.openaiKeyRef : OPENAI_KEY_REF,
    openaiAdminKeyRef: validRef(source.openaiAdminKeyRef) ? source.openaiAdminKeyRef : OPENAI_ADMIN_KEY_REF,
    includeLocalSpend: source.includeLocalSpend !== false,
    maxScanSessions: clampInt(source.maxScanSessions, 500, 1, 5000),
    accountLocale: typeof source.accountLocale === 'string' && source.accountLocale !== '' ? source.accountLocale : 'zh_CN',
    accountVersion: typeof source.accountVersion === 'string' && source.accountVersion !== '' ? source.accountVersion : '0.2.2',
    pricing: normalizePricing(source.pricing),
    pricingOverrides: manualPricing(source.pricing),
    pricingSource: normalizePricingSource(source.pricingSource !== undefined ? source.pricingSource : source.pricingUrl),
  }
}

/** Resolve the credential descriptors against an already-normalized config. */
function credentialTargetsFor(config) {
  return CREDENTIAL_TARGETS.map(({ refKey, ...target }) => ({ ...target, ref: config[refKey] }))
}

/**
 * The public configuration contract: one descriptor per credential this
 * plugin can need, already resolved to the row's concrete reference. The
 * Settings page renders an entry for each descriptor, and the invariant test
 * asserts every credential-reading adapter has one.
 */
export function configurationTargets(rawConfig) {
  return credentialTargetsFor(normalizeConfig(rawConfig))
}

/** Validate a write without ever echoing the value into a diagnostic. */
export function normalizeCredentialValue(value) {
  if (typeof value !== 'string') {
    throw new SourceError('INVALID_CREDENTIAL_VALUE', 'A key must be a string.')
  }
  const trimmed = value.trim()
  if (trimmed === '') throw new SourceError('INVALID_CREDENTIAL_VALUE', 'A key cannot be empty.')
  if (trimmed.length > CREDENTIAL_VALUE_LIMIT) {
    throw new SourceError('INVALID_CREDENTIAL_VALUE', 'The key is longer than the credential store accepts.')
  }
  if (!CREDENTIAL_VALUE_PATTERN.test(trimmed)) {
    throw new SourceError('INVALID_CREDENTIAL_VALUE', 'A key must be printable ASCII without spaces or line breaks.')
  }
  return trimmed
}

function sourceErrorValue(id, error, now) {
  const meta = SOURCE_META[id]
  return {
    id,
    family: meta.family,
    mode: meta.mode,
    labelKey: meta.labelKey,
    status: 'error',
    fetchedAt: null,
    attemptedAt: now,
    stale: false,
    error,
  }
}

function errorOf(cause) {
  if (cause instanceof SourceError) {
    return { code: cause.code, detail: cause.detail, status: cause.status }
  }
  const detail = cause instanceof Error ? cause.message : String(cause)
  return { code: 'UNKNOWN', detail: detail.slice(0, 240), status: null }
}

function readJsonBody(req, limit = CONFIG_BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > limit) {
        fail(new SourceError('PAYLOAD_TOO_LARGE', `The configuration body exceeds ${limit} bytes.`))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      const text = Buffer.concat(chunks).toString('utf8')
      if (text.trim() === '') {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(text))
      } catch {
        reject(new SourceError('BAD_JSON', 'The configuration body is not valid JSON.'))
      }
    })
    req.on('error', (cause) => fail(cause))
  })
}

async function fetchJson(url, init) {
  let response
  try {
    response = await fetch(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch (cause) {
    const name = cause && typeof cause === 'object' ? cause.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new SourceError('TIMEOUT', 'The provider did not answer before the deadline.')
    }
    throw new SourceError('NETWORK', cause instanceof Error ? cause.message : String(cause))
  }

  let text
  try {
    text = await response.text()
  } catch (cause) {
    throw new SourceError('NETWORK', cause instanceof Error ? cause.message : String(cause))
  }

  let body = null
  if (text.trim() !== '') {
    try {
      body = JSON.parse(text)
    } catch {
      if (response.ok) throw new SourceError('BAD_JSON', 'The provider returned non-JSON content.')
    }
  }

  if (!response.ok) {
    const code = response.status === 401 || response.status === 403
      ? 'AUTH_FAILED'
      : response.status === 429
        ? 'RATE_LIMITED'
        : 'HTTP_ERROR'
    const message = isObject(body) && typeof body.message === 'string'
      ? body.message.slice(0, 240)
      : `HTTP ${response.status}`
    throw new SourceError(code, message, response.status)
  }
  return body
}

// ---------------------------------------------------------------------------
// Kimi Code quota
// ---------------------------------------------------------------------------

const KIMI_META = {
  limit_5h: { minutes: 300, order: 0 },
  limit_7d: { minutes: 10_080, order: 1 },
  limit_month_total: { minutes: null, order: 2 },
  limit_month_code: { minutes: null, order: 3 },
}

function kimiMeta(key) {
  if (KIMI_META[key] !== undefined) return { ...KIMI_META[key], key }
  if (typeof key !== 'string') return { key: 'custom', minutes: null, order: 20 }
  if (/5h|5_h|5hour/i.test(key)) return { key, minutes: 300, order: 10 }
  if (/7d|7_d|week/i.test(key)) return { key, minutes: 10_080, order: 11 }
  if (/month/i.test(key)) return { key, minutes: null, order: 12 }
  return { key, minutes: null, order: 20 }
}

function minutesOfWindow(window) {
  if (!isObject(window)) return null
  const duration = asNumber(window.duration)
  if (duration === null || duration <= 0) return null
  const unit = typeof window.timeUnit === 'string' ? window.timeUnit.toUpperCase() : ''
  if (unit.includes('MINUTE')) return duration
  if (unit.includes('HOUR')) return duration * 60
  if (unit.includes('DAY')) return duration * 24 * 60
  if (unit.includes('SECOND')) return duration / 60
  return null
}

function percentFromParts(used, limit, remaining) {
  if (limit !== null && limit > 0) {
    if (used !== null) return clampPercent((used / limit) * 100)
    if (remaining !== null) return clampPercent((1 - remaining / limit) * 100)
  }
  return null
}

function parseKimiBlock(block) {
  if (!isObject(block)) return null
  const detail = isObject(block.detail) ? block.detail : block
  const limit = asNumber(detail.limit)
  const used = asNumber(detail.used)
  const remaining = asNumber(detail.remaining)
  const usedPercent = percentFromParts(used, limit, remaining)
  if (usedPercent === null && limit === null && remaining === null) return null

  const window = isObject(block.window) ? block.window : null
  const minutes = minutesOfWindow(window)
  const scope = asString(block.scope) || asString(block.window)
  const key = scope !== null ? `legacy:${scope}` : minutes !== null ? `legacy:${minutes}` : 'legacy:custom'

  return {
    id: `kimi:${key}`,
    key,
    minutes,
    order: minutes !== null ? (minutes <= 300 ? 0 : minutes <= 10_080 ? 1 : 2) : 20,
    kind: minutes === null ? 'custom' : minutes <= 360 ? 'session' : minutes <= 10_080 ? 'weekly' : 'monthly',
    usedPercent,
    remainingPercent: usedPercent === null ? null : clampPercent(100 - usedPercent),
    resetAt: isoOf(detail.resetTime !== undefined ? detail.resetTime : block.resetTime),
    limit,
    used,
    remaining,
    source: 'legacy',
  }
}

/**
 * Parse every quota window Kimi returns. `usages` is the current plan map; the
 * older `limits` / `usage` shapes are merged only when they add a window, so a
 * new monthly key is never hidden by a fixed list of known windows.
 */
export function parseKimiResponse(body, fetchedAt = Date.now()) {
  if (!isObject(body)) throw new SourceError('BAD_JSON', 'Kimi returned no JSON object.')
  const windows = []
  const conflicts = []
  const warnings = []

  const add = (window) => {
    if (window === null) return
    const existing = windows.find((candidate) => candidate.id === window.id)
    if (existing === undefined) windows.push(window)
  }

  const usages = isObject(body.usages) ? body.usages : null
  if (usages !== null) {
    for (const [key, entry] of Object.entries(usages)) {
      if (!isObject(entry)) continue
      const meta = kimiMeta(key)
      const ratio = asNumber(entry.used_ratio)
      let usedPercent = ratio === null ? null : clampPercent(ratio * 100)
      if (ratio !== null && (ratio < 0 || ratio > 1)) {
        warnings.push({ code: 'KIMI_RATIO_OUT_OF_RANGE', detail: key })
      }
      if (usedPercent === null) {
        usedPercent = percentFromParts(asNumber(entry.used), asNumber(entry.limit), asNumber(entry.remaining))
      }
      if (usedPercent === null) continue
      add({
        id: `kimi:${key}`,
        key,
        minutes: meta.minutes,
        order: meta.order,
        kind: meta.minutes === 300 ? 'session' : meta.minutes === 10_080 ? 'weekly' : /month/i.test(key) ? 'monthly' : 'custom',
        usedPercent,
        remainingPercent: clampPercent(100 - usedPercent),
        resetAt: isoOf(entry.reset_time),
        limit: asNumber(entry.limit),
        used: asNumber(entry.used),
        remaining: asNumber(entry.remaining),
        source: 'usages',
      })
    }
  }

  const limits = Array.isArray(body.limits) ? body.limits : isObject(body.limits) ? [body.limits] : []
  for (const block of limits) {
    const legacy = parseKimiBlock(block)
    if (legacy === null) continue
    const same = windows.find((candidate) => {
      if (candidate.source !== 'usages') return false
      if (legacy.minutes !== null && candidate.minutes !== null) return candidate.minutes === legacy.minutes
      return false
    })
    if (same === undefined) {
      add(legacy)
      continue
    }
    if (same.limit === null && legacy.limit !== null) same.limit = legacy.limit
    if (same.used === null && legacy.used !== null) same.used = legacy.used
    if (same.remaining === null && legacy.remaining !== null) same.remaining = legacy.remaining
    if (same.resetAt === null && legacy.resetAt !== null) same.resetAt = legacy.resetAt
    if (same.usedPercent !== null && legacy.usedPercent !== null && Math.abs(same.usedPercent - legacy.usedPercent) >= 1) {
      conflicts.push({
        key: same.key,
        preferredUsedPercent: same.usedPercent,
        legacyUsedPercent: legacy.usedPercent,
      })
    }
  }

  if (isObject(body.usage)) {
    const legacy = parseKimiBlock({ window: { duration: 7, timeUnit: 'TIME_UNIT_DAY' }, detail: body.usage })
    if (legacy !== null) {
      const same = windows.find((candidate) => candidate.source === 'usages' && candidate.minutes === 10_080)
      if (same === undefined) {
        add(legacy)
      } else {
        if (same.limit === null && legacy.limit !== null) same.limit = legacy.limit
        if (same.used === null && legacy.used !== null) same.used = legacy.used
        if (same.remaining === null && legacy.remaining !== null) same.remaining = legacy.remaining
        if (same.resetAt === null && legacy.resetAt !== null) same.resetAt = legacy.resetAt
        if (same.usedPercent !== null && legacy.usedPercent !== null && Math.abs(same.usedPercent - legacy.usedPercent) >= 1) {
          conflicts.push({
            key: same.key,
            preferredUsedPercent: same.usedPercent,
            legacyUsedPercent: legacy.usedPercent,
          })
        }
      }
    }
  }

  if (windows.length === 0) throw new SourceError('NO_DATA', 'Kimi returned no usable quota window.')
  windows.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))

  const extras = []
  const wallet = isObject(body.boosterWallet) ? body.boosterWallet : null
  const walletBalance = wallet !== null && isObject(wallet.balance) ? wallet.balance : wallet
  const booster = walletBalance !== null ? asNumber(walletBalance.amountLeft) : null
  if (booster !== null) extras.push({ id: 'booster', kind: 'booster', value: booster })

  const parallelLimit = isObject(body.parallel) ? asNumber(body.parallel.limit) : null
  if (parallelLimit !== null) extras.push({ id: 'parallel', kind: 'parallel', value: parallelLimit })

  const membership = isObject(body.user) && isObject(body.user.membership) ? body.user.membership : null
  const level = membership !== null ? asString(membership.level) : null

  return {
    fetchedAt,
    plan: level === null ? null : { level },
    windows,
    extras,
    warnings,
    conflicts,
  }
}

async function resolveCredential(ctx, ref) {
  let credentials
  try {
    credentials = typeof ctx.get === 'function' ? ctx.get('credentials') : undefined
  } catch {
    credentials = undefined
  }
  if (credentials !== undefined && typeof credentials.resolve === 'function') {
    try {
      const resolved = await credentials.resolve(ref)
      if (resolved !== undefined && resolved !== null && typeof resolved.value === 'string' && resolved.value.trim() !== '') {
        return { value: resolved.value.trim(), source: typeof resolved.source === 'string' ? resolved.source : 'credentials' }
      }
    } catch {
      // Fall through to the process environment.
    }
  }
  const ambient = typeof process.env[ref] === 'string' ? process.env[ref].trim() : ''
  if (ambient !== '') return { value: ambient, source: 'environment' }
  return null
}

/**
 * UI-safe credential status: `configured`, `source`, `writable`, and whether a
 * write is possible at all. It never returns a value — the same contract the
 * Models settings page uses.
 */
async function describeCredential(ctx, ref) {
  let credentials
  try {
    credentials = typeof ctx.get === 'function' ? ctx.get('credentials') : undefined
  } catch {
    credentials = undefined
  }
  if (credentials !== undefined && credentials !== null && typeof credentials.describe === 'function') {
    try {
      const info = await credentials.describe(ref)
      if (isObject(info)) {
        return {
          configured: info.configured === true,
          source: asString(info.source),
          writable: info.writable !== false,
          canConfigure: typeof credentials.set === 'function',
        }
      }
    } catch {
      // Fall through to the environment probe; the store may still be warming up.
    }
  }
  const ambient = typeof process.env[ref] === 'string' && process.env[ref].trim() !== ''
  return {
    configured: ambient,
    source: ambient ? 'environment' : null,
    writable: false,
    canConfigure: credentials !== undefined && credentials !== null && typeof credentials.set === 'function',
  }
}

// ---------------------------------------------------------------------------
// DeepSeek balance
// ---------------------------------------------------------------------------

export function parseDeepSeekBalance(body) {
  if (!isObject(body)) throw new SourceError('BAD_JSON', 'DeepSeek returned no JSON object.')
  if (body.is_available === false) {
    throw new SourceError('UNAVAILABLE', 'DeepSeek reports that this balance cannot be used for API calls.')
  }
  const infos = Array.isArray(body.balance_infos) ? body.balance_infos : []
  const wallets = []
  for (const info of infos) {
    if (!isObject(info)) continue
    const currency = asString(info.currency)
    const balance = info.total_balance === undefined || info.total_balance === null ? null : String(info.total_balance)
    if (currency === null || balance === null) continue
    wallets.push({
      currency,
      balance,
      granted: info.granted_balance === undefined || info.granted_balance === null ? null : String(info.granted_balance),
      toppedUp: info.topped_up_balance === undefined || info.topped_up_balance === null ? null : String(info.topped_up_balance),
      kind: 'total',
    })
  }
  if (wallets.length === 0) throw new SourceError('NO_DATA', 'DeepSeek returned no balance wallet.')
  return { wallets, isAvailable: body.is_available !== false }
}

/**
 * Sum an OpenAI organization-costs page. This endpoint requires an Admin key;
 * a normal inference key is not sufficient. An empty `data` array is a real
 * zero for the requested window, while a malformed page is refused.
 */
export function parseOpenAICosts(body) {
  if (!isObject(body) || !Array.isArray(body.data)) {
    throw new SourceError('BAD_JSON', 'OpenAI returned no costs page.')
  }
  const totals = new Map()
  let results = 0
  for (const bucket of body.data) {
    if (!isObject(bucket) || !Array.isArray(bucket.results)) continue
    for (const row of bucket.results) {
      if (!isObject(row) || !isObject(row.amount)) continue
      const value = asNumber(row.amount.value)
      const currency = (asString(row.amount.currency) || 'USD').toUpperCase()
      if (value === null) continue
      totals.set(currency, (totals.get(currency) || 0) + value)
      results += 1
    }
  }
  const currencies = [...totals.keys()].sort((left, right) => {
    const rank = (code) => (code === 'USD' ? 0 : code === 'CNY' ? 1 : 2)
    return rank(left) - rank(right)
  })
  const currency = currencies[0] || 'USD'
  return {
    currency,
    amount: round(totals.get(currency) || 0, 6),
    results,
    buckets: body.data.length,
    truncated: body.has_more === true,
  }
}

function accountWallets(normal, bonus) {  const wallets = []
  const append = (rows, kind) => {
    if (!Array.isArray(rows)) return
    for (const row of rows) {
      if (!isObject(row)) continue
      const currency = asString(row.currency)
      if (currency === null) continue
      if (row.balance === undefined || row.balance === null) continue
      wallets.push({ currency, balance: String(row.balance), kind })
    }
  }
  append(normal, 'recharge')
  append(bonus, 'bonus')
  return wallets
}

function accountClient(config) {
  return {
    version: config.accountVersion,
    locale: config.accountLocale,
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

function withTimeout(promise, ms, code) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new SourceError(code, 'The service did not answer before the deadline.')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function safeLinks(links) {
  const usage = isObject(links) && typeof links.usageUrl === 'string' ? links.usageUrl : PLATFORM_USAGE_URL
  const topUp = isObject(links) && typeof links.topUpUrl === 'string' ? links.topUpUrl : PLATFORM_TOPUP_URL
  return {
    usageUrl: /^https?:\/\//.test(usage) ? usage : PLATFORM_USAGE_URL,
    topUpUrl: /^https?:\/\//.test(topUp) ? topUp : PLATFORM_TOPUP_URL,
  }
}

// ---------------------------------------------------------------------------
// Local spend estimate
// ---------------------------------------------------------------------------

function isPeakTime(time) {
  const beijing = new Date(time + 8 * 60 * 60 * 1000)
  const day = beijing.getUTCDay()
  if (day === 0 || day === 6) return false
  const minutes = beijing.getUTCHours() * 60 + beijing.getUTCMinutes()
  return (minutes >= 9 * 60 && minutes < 12 * 60)
    || (minutes >= 14 * 60 && minutes < 18 * 60)
}

export function startOfTodayShanghai(now) {
  const beijing = new Date(now + 8 * 60 * 60 * 1000)
  return Date.UTC(
    beijing.getUTCFullYear(),
    beijing.getUTCMonth(),
    beijing.getUTCDate(),
  ) - 8 * 60 * 60 * 1000
}

/** Official route ids that share a family price table. No substring matching. */
function priceFamilyOf(provider) {
  if (provider === 'deepseek-account' || provider === 'deepseek-official' || provider === 'deepseek') return 'deepseek'
  if (provider === 'openai' || provider === 'azure-openai') return 'openai'
  return null
}

function priceFor(provider, model, pricing) {
  if (typeof provider !== 'string' || provider === '') return null
  const exact = isObject(pricing) && isObject(pricing[provider]) ? pricing[provider] : null
  const family = priceFamilyOf(provider)
  const table = exact !== null
    ? exact
    : family !== null
      ? isObject(pricing) && isObject(pricing[family]) ? pricing[family] : defaultPricing()[family]
      : null
  if (!isObject(table)) return null
  const row = (typeof model === 'string' ? table[model] : null) || table.default
  if (!isObject(row)) return null
  return normalizePriceRow(row)
}

function isPeakPrice(price, time) {
  return price.peakRule === 'deepseek-cn' && isPeakTime(time)
}

function rowCost(price, row) {
  const longContext = typeof price.longContextThreshold === 'number'
    && price.longContextThreshold > 0
    && row.input > price.longContextThreshold
  const inputPrice = longContext ? price.longInput : price.input
  const cachedInputPrice = longContext ? price.longCachedInput : price.cachedInput
  const outputPrice = longContext ? price.longOutput : price.output
  const base = (
    (row.cacheHit / 1_000_000) * cachedInputPrice
    + (row.cacheMiss / 1_000_000) * inputPrice
    + (row.output / 1_000_000) * outputPrice
  )
  return base * (isPeakPrice(price, row.time) ? Math.max(1, price.peakMultiplier) : 1)
}

function emptyCurrencyTotals() {
  return {
    cost: 0,
    requests: 0,
    inputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
  }
}

function emptyEstimateBucket() {
  return {
    requests: 0,
    inputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    peakRequests: 0,
    offPeakRequests: 0,
    pricedRequests: 0,
    unpricedRequests: 0,
    currencies: {},
  }
}

function addEstimateRow(bucket, row, price) {
  bucket.requests += 1
  bucket.inputTokens += token(row.input)
  bucket.cacheHitTokens += token(row.cacheHit)
  bucket.cacheMissTokens += token(row.cacheMiss)
  bucket.outputTokens += token(row.output)
  bucket.reasoningTokens += token(row.reasoning)
  if (isPeakTime(row.time)) bucket.peakRequests += 1
  else bucket.offPeakRequests += 1

  if (price === null) {
    bucket.unpricedRequests += 1
    return
  }
  bucket.pricedRequests += 1
  const currency = price.currency
  const totals = bucket.currencies[currency] || emptyCurrencyTotals()
  totals.cost += rowCost(price, row)
  totals.requests += 1
  totals.inputTokens += token(row.input)
  totals.cacheHitTokens += token(row.cacheHit)
  totals.cacheMissTokens += token(row.cacheMiss)
  totals.outputTokens += token(row.output)
  totals.reasoningTokens += token(row.reasoning)
  bucket.currencies[currency] = totals
}

function finalizeCurrencyTotals(totals) {
  return {
    cost: round(totals.cost, 6),
    requests: totals.requests,
    inputTokens: totals.inputTokens,
    cacheHitTokens: totals.cacheHitTokens,
    cacheMissTokens: totals.cacheMissTokens,
    outputTokens: totals.outputTokens,
    reasoningTokens: totals.reasoningTokens,
  }
}

function finalizeEstimateBucket(provider, bucket) {
  const currencies = {}
  for (const [currency, totals] of Object.entries(bucket.currencies)) {
    currencies[currency] = finalizeCurrencyTotals(totals)
  }
  return {
    provider,
    requests: bucket.requests,
    inputTokens: bucket.inputTokens,
    cacheHitTokens: bucket.cacheHitTokens,
    cacheMissTokens: bucket.cacheMissTokens,
    outputTokens: bucket.outputTokens,
    reasoningTokens: bucket.reasoningTokens,
    peakRequests: bucket.peakRequests,
    offPeakRequests: bucket.offPeakRequests,
    pricedRequests: bucket.pricedRequests,
    unpricedRequests: bucket.unpricedRequests,
    currencies,
  }
}

function mergeEstimate(target, bucket) {
  target.requests += bucket.requests
  target.inputTokens += bucket.inputTokens
  target.cacheHitTokens += bucket.cacheHitTokens
  target.cacheMissTokens += bucket.cacheMissTokens
  target.outputTokens += bucket.outputTokens
  target.reasoningTokens += bucket.reasoningTokens
  target.peakRequests += bucket.peakRequests
  target.offPeakRequests += bucket.offPeakRequests
  target.pricedRequests += bucket.pricedRequests
  target.unpricedRequests += bucket.unpricedRequests
  for (const [currency, totals] of Object.entries(bucket.currencies)) {
    const next = target.currencies[currency] || emptyCurrencyTotals()
    next.cost += totals.cost
    next.requests += totals.requests
    next.inputTokens += totals.inputTokens
    next.cacheHitTokens += totals.cacheHitTokens
    next.cacheMissTokens += totals.cacheMissTokens
    next.outputTokens += totals.outputTokens
    next.reasoningTokens += totals.reasoningTokens
    target.currencies[currency] = next
  }
}

function finalizeMergedEstimate(bucket) {
  const currencies = {}
  for (const [currency, totals] of Object.entries(bucket.currencies)) {
    currencies[currency] = finalizeCurrencyTotals(totals)
  }
  return {
    requests: bucket.requests,
    inputTokens: bucket.inputTokens,
    cacheHitTokens: bucket.cacheHitTokens,
    cacheMissTokens: bucket.cacheMissTokens,
    outputTokens: bucket.outputTokens,
    reasoningTokens: bucket.reasoningTokens,
    peakRequests: bucket.peakRequests,
    offPeakRequests: bucket.offPeakRequests,
    pricedRequests: bucket.pricedRequests,
    unpricedRequests: bucket.unpricedRequests,
    currencies,
  }
}

function describePricing(pricing) {
  const tables = []
  if (!isObject(pricing)) return tables
  for (const [provider, table] of Object.entries(pricing)) {
    if (!isObject(table)) continue
    const models = []
    for (const [model, row] of Object.entries(table)) {
      if (!isObject(row)) continue
      models.push({ model, ...row })
    }
    if (models.length > 0) tables.push({ provider, models })
  }
  return tables
}

/**
 * Price every provider row that has an explicit table entry. A provider with no
 * table remains visible as unpriced token usage; no cross-provider exchange rate
 * is invented. Currencies are always kept separate.
 */
export function computeEstimates(rows, now, pricing = {}, sourceFor = null) {
  const start = startOfTodayShanghai(now)
  const buckets = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isObject(row) || !Number.isFinite(row.time) || row.time < start) continue
    const provider = typeof row.provider === 'string' && row.provider !== '' ? row.provider : 'unknown'
    const resolved = typeof sourceFor === 'function' ? sourceFor(provider) : null
    const sourceId = typeof resolved === 'string' && resolved !== '' ? resolved : sourceIdForProvider(provider)
    // A coding-plan subscription has quota windows, not a per-token bill.
    if (sourceId !== null && SOURCE_META[sourceId] !== undefined && SOURCE_META[sourceId].mode === 'coding-plan') continue
    const bucket = buckets.get(provider) || emptyEstimateBucket()
    addEstimateRow(bucket, row, priceFor(provider, row.model, pricing))
    buckets.set(provider, bucket)
  }

  const byProvider = {}
  const bySourceBuckets = new Map()
  const total = emptyEstimateBucket()
  let hasDeepseek = false
  for (const [provider, bucket] of buckets) {
    const finalized = finalizeEstimateBucket(provider, bucket)
    byProvider[provider] = finalized
    if (/deepseek/i.test(provider)) hasDeepseek = true
    const resolved = typeof sourceFor === 'function' ? sourceFor(provider) : null
    const sourceId = (typeof resolved === 'string' && resolved !== '' ? resolved : sourceIdForProvider(provider)) || `provider:${provider}`
    const sourceBucket = bySourceBuckets.get(sourceId) || emptyEstimateBucket()
    mergeEstimate(sourceBucket, bucket)
    bySourceBuckets.set(sourceId, sourceBucket)
    mergeEstimate(total, bucket)
  }

  const bySource = {}
  for (const [sourceId, bucket] of bySourceBuckets) {
    bySource[sourceId] = finalizeMergedEstimate(bucket)
  }

  const warnings = ['LOCAL_ONLY']
  if (hasDeepseek) warnings.push('NO_HOLIDAYS')
  if (total.unpricedRequests > 0) warnings.push('UNPRICED_MODELS')
  if (Object.keys(total.currencies).length === 0) warnings.push('NO_PRICES')

  return {
    status: 'ready',
    exact: false,
    fetchedAt: now,
    period: { peak: isPeakTime(now) },
    total: finalizeMergedEstimate(total),
    byProvider,
    bySource,
    pricing: {
      version: PRICE_VERSION,
      unit: 'PER_MILLION_TOKENS',
      tables: describePricing(pricing),
      url: PRICING_URL,
    },
    warnings,
  }
}

/** DeepSeek-only compatibility shape used by the focused spend card. */
export function computeSpend(rows, now, pricing = {}, sourceFor = null) {
  const estimates = computeEstimates(rows, now, pricing, sourceFor)
  const account = estimates.bySource.deepseekAccount || { currencies: {}, requests: 0, inputTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0, peakRequests: 0, offPeakRequests: 0, pricedRequests: 0, unpricedRequests: 0 }
  const key = estimates.bySource.deepseekKey || { currencies: {}, requests: 0, inputTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0, peakRequests: 0, offPeakRequests: 0, pricedRequests: 0, unpricedRequests: 0 }
  const cny = (source) => source.currencies.CNY || emptyCurrencyTotals()
  const a = cny(account)
  const k = cny(key)
  const today = {
    cost: round(a.cost + k.cost, 6),
    requests: account.requests + key.requests,
    inputTokens: account.inputTokens + key.inputTokens,
    cacheHitTokens: account.cacheHitTokens + key.cacheHitTokens,
    cacheMissTokens: account.cacheMissTokens + key.cacheMissTokens,
    outputTokens: account.outputTokens + key.outputTokens,
    peakRequests: account.peakRequests + key.peakRequests,
    offPeakRequests: account.offPeakRequests + key.offPeakRequests,
    pricedRequests: account.pricedRequests + key.pricedRequests,
    unpricedRequests: account.unpricedRequests + key.unpricedRequests,
  }
  const flatten = (source) => ({
    ...source,
    ...cny(source),
  })
  return {
    status: 'ready',
    exact: false,
    fetchedAt: now,
    period: estimates.period,
    today,
    bySource: {
      deepseekAccount: flatten(account),
      deepseekKey: flatten(key),
      other: flatten({ currencies: {}, requests: 0, inputTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0, peakRequests: 0, offPeakRequests: 0, pricedRequests: 0, unpricedRequests: 0 }),
    },
    pricing: estimates.pricing,
    warnings: estimates.warnings,
  }
}

function token(value) {
  const number = asNumber(value)
  return number === null || number < 0 ? 0 : number
}

function usageOf(data) {
  if (isObject(data.usage)) return data.usage
  const stream = Array.isArray(data.stream) ? data.stream : []
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (isObject(record) && record.type === 'chunk' && isObject(record.chunk) && record.chunk.type === 'usage' && isObject(record.chunk.usage)) {
      return record.chunk.usage
    }
  }
  return null
}

/**
 * Fold committed Session events into normalized model-usage rows. Only
 * `assistant/message` carries the final provider-reported token usage. All
 * providers are retained so new adapters and the current-conversation surface
 * can use the same ledger; the DeepSeek spend formula filters them later.
 */
export function foldSessionEvents(sessionId, events) {
  const rows = []
  let headerProvider = null
  let headerModel = null

  for (const event of Array.isArray(events) ? events : []) {
    if (!isObject(event) || typeof event.type !== 'string') continue
    if (event.type === 'request/header' && isObject(event.data) && isObject(event.data.header) && isObject(event.data.header.config)) {
      headerProvider = asString(event.data.header.config.provider)
      headerModel = asString(event.data.header.config.model)
      continue
    }
    if (event.type !== 'assistant/message' || !isObject(event.data)) continue

    const data = event.data
    const usage = usageOf(data)
    if (usage === null) continue
    const message = isObject(data.message) ? data.message : null
    const source = message !== null && isObject(message.source) ? message.source : null
    const provider = source !== null ? asString(source.provider) : null
    const model = source !== null ? asString(source.model) : null
    const finalProvider = provider || headerProvider
    const finalModel = model || headerModel
    if (finalProvider === null && finalModel === null) continue

    const input = token(usage.inputTokens)
    const cacheHit = Math.min(token(usage.cacheReadTokens), input)
    rows.push({
      sessionId,
      seq: typeof event.seq === 'number' ? event.seq : 0,
      time: typeof event.time === 'number' ? event.time : Date.now(),
      provider: finalProvider,
      model: finalModel,
      input,
      cacheHit,
      cacheMiss: Math.max(0, input - cacheHit),
      output: token(usage.outputTokens),
      reasoning: token(usage.reasoningTokens),
    })
  }
  return rows
}

function emptyUsage() {
  return {
    requests: 0,
    inputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    models: {},
  }
}

function addUsage(target, row) {
  target.requests += 1
  target.inputTokens += token(row.input)
  target.cacheHitTokens += token(row.cacheHit)
  target.cacheMissTokens += token(row.cacheMiss)
  target.outputTokens += token(row.output)
  target.reasoningTokens += token(row.reasoning)
}

function addModelUsage(target, model, row) {
  const key = typeof model === 'string' && model !== '' ? model : 'unknown'
  const usage = target.models[key] || { requests: 0, inputTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0, reasoningTokens: 0 }
  addUsage(usage, row)
  target.models[key] = usage
}

/**
 * Local token usage per provider. Unlike computeSpend this is not priced and
 * covers every provider route, including ones without a balance adapter.
 */
export function computeUsage(rows, now) {
  const start = startOfTodayShanghai(now)
  const byProvider = {}
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isObject(row) || !Number.isFinite(row.time) || row.time < start) continue
    const provider = typeof row.provider === 'string' && row.provider !== '' ? row.provider : 'unknown'
    const usage = byProvider[provider] || emptyUsage()
    addUsage(usage, row)
    addModelUsage(usage, row.model, row)
    byProvider[provider] = usage
  }
  return { fetchedAt: now, byProvider }
}

function usageForSource(usage, sourceId, catalog) {
  if (!isObject(usage) || !isObject(usage.byProvider) || typeof sourceId !== 'string') return emptyUsage()
  const providers = new Set()
  const entries = isObject(catalog) && Array.isArray(catalog.providers) ? catalog.providers : []
  for (const entry of entries) {
    if (!isObject(entry)) continue
    if (entry.sourceId === sourceId) providers.add(entry.provider)
  }
  if (sourceId.startsWith('provider:')) providers.add(sourceId.slice('provider:'.length))
  if (providers.size === 0) {
    // Cold start before the catalog exists: map official route ids only.
    for (const provider of Object.keys(usage.byProvider)) {
      if (sourceIdForProvider(provider) === sourceId) providers.add(provider)
    }
  }
  const total = emptyUsage()
  for (const [provider, row] of Object.entries(usage.byProvider)) {
    if (!providers.has(provider) || !isObject(row)) continue
    total.requests += token(row.requests)
    total.inputTokens += token(row.inputTokens)
    total.cacheHitTokens += token(row.cacheHitTokens)
    total.cacheMissTokens += token(row.cacheMissTokens)
    total.outputTokens += token(row.outputTokens)
    total.reasoningTokens += token(row.reasoningTokens)
    for (const [model, modelUsage] of Object.entries(isObject(row.models) ? row.models : {})) {
      const target = total.models[model] || { requests: 0, inputTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0, reasoningTokens: 0 }
      target.requests += token(modelUsage.requests)
      target.inputTokens += token(modelUsage.inputTokens)
      target.cacheHitTokens += token(modelUsage.cacheHitTokens)
      target.cacheMissTokens += token(modelUsage.cacheMissTokens)
      target.outputTokens += token(modelUsage.outputTokens)
      target.reasoningTokens += token(modelUsage.reasoningTokens)
      total.models[model] = target
    }
  }
  return total
}

// ---------------------------------------------------------------------------
// Active source selection
// ---------------------------------------------------------------------------

const ROUTE_FAMILIES = {
  deepseek: 'deepseek',
  'deepseek-official': 'deepseek',
  'deepseek-account': 'deepseek',
  kimi: 'kimi',
  'kimi-coding': 'kimi',
  openai: 'openai',
  'azure-openai': 'openai',
}

function familyOfRoute(provider) {
  return typeof provider === 'string' && Object.prototype.hasOwnProperty.call(ROUTE_FAMILIES, provider)
    ? ROUTE_FAMILIES[provider]
    : null
}

function hostOf(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    return new URL(value.trim()).hostname.toLowerCase()
  } catch {
    return null
  }
}

function familyOfBaseURL(baseURL) {
  const host = hostOf(baseURL)
  if (host === null) return null
  if (host === 'api.deepseek.com' || host.endsWith('.deepseek.com')) return 'deepseek'
  if (host === 'api.kimi.com' || host.endsWith('.kimi.com')
    || host.endsWith('.moonshot.cn') || host.endsWith('.moonshotai.com')) return 'kimi'
  if (host === 'api.openai.com' || host.endsWith('.openai.com')) return 'openai'
  return null
}

function familyOfSettingsNamespace(settingsNs) {
  if (typeof settingsNs !== 'string') return null
  if (settingsNs === 'llm-deepseek' || settingsNs.startsWith('llm-deepseek-')) return 'deepseek'
  return null
}

/**
 * Resolve a route to an official family from structured facts: the route id,
 * the settings namespace that owns it, then the endpoint host. A display-name
 * check is only the last resort for a hand-declared route whose endpoint is not
 * readable, so a custom provider named "my-openai-proxy" is never silently
 * priced or queried as OpenAI.
 */
export function familyOfProvider(provider, entry) {
  const route = familyOfRoute(provider)
  if (route !== null) return route
  const byNamespace = isObject(entry) ? familyOfSettingsNamespace(entry.settingsNs) : null
  if (byNamespace !== null) return byNamespace
  const byHost = isObject(entry) ? familyOfBaseURL(entry.baseURL) : null
  if (byHost !== null) return byHost
  const displayName = isObject(entry) ? asString(entry.displayName) : null
  if (displayName !== null) {
    if (/kimi|moonshot/i.test(displayName)) return 'kimi'
    if (/openai/i.test(displayName)) return 'openai'
    if (/deepseek/i.test(displayName)) return 'deepseek'
  }
  return null
}

function sourceIdForFamily(provider, family) {
  if (family === 'kimi') return 'kimi'
  if (family === 'openai') return 'openai'
  if (family === 'deepseek') return provider === 'deepseek-account' ? 'deepseekAccount' : 'deepseekKey'
  return null
}

/** Map one model route to the source adapter that owns its balance surface. */
export function sourceIdForProvider(provider, family) {
  if (typeof provider !== 'string' || provider === '') return null
  const resolved = typeof family === 'string' ? family : familyOfRoute(provider)
  return sourceIdForFamily(provider, resolved)
}

function usable(source) {
  if (!isObject(source)) return false
  if (source.status !== 'ready' && source.status !== 'stale' && source.status !== 'limited') return false
  if (source.id === 'openai') return true
  return (Array.isArray(source.wallets) && source.wallets.length > 0)
    || (Array.isArray(source.windows) && source.windows.length > 0)
}

/**
 * Pick the surface the sidebar should summarize. A known family never falls
 * back to an unrelated provider: a Kimi model with an unavailable Kimi key
 * shows Kimi's error, not a DeepSeek balance. DeepSeek account/key may fall back
 * to each other because they are two official routes to the same product.
 */
export function chooseActiveSource(route, sources, catalog) {
  const provider = isObject(route) ? route.provider : null
  const model = isObject(route) ? route.model : null
  const entries = isObject(catalog) && Array.isArray(catalog.providers) ? catalog.providers : []
  const entry = entries.find((candidate) => isObject(candidate) && candidate.provider === provider)
  const family = entry !== undefined && typeof entry.family === 'string' && entry.family !== ''
    ? entry.family
    : familyOfProvider(provider, entry)

  if (family === 'kimi') {
    return {
      sourceId: 'kimi',
      family,
      mode: 'coding-plan',
      provider,
      model,
      fallback: false,
      note: usable(sources.kimi) ? null : { code: 'SOURCE_UNAVAILABLE' },
    }
  }

  if (family === 'openai') {
    return {
      sourceId: 'openai',
      family,
      mode: 'api',
      provider,
      model,
      fallback: false,
      note: usable(sources.openai) ? null : { code: 'SOURCE_UNAVAILABLE' },
    }
  }

  if (family === 'deepseek') {
    const primary = provider === 'deepseek-account' ? 'deepseekAccount' : 'deepseekKey'
    const secondary = primary === 'deepseekAccount' ? 'deepseekKey' : 'deepseekAccount'
    if (usable(sources[primary])) {
      return { sourceId: primary, family, mode: 'api', provider, model, fallback: false, note: null }
    }
    if (usable(sources[secondary])) {
      return {
        sourceId: secondary,
        family,
        mode: 'api',
        provider,
        model,
        fallback: true,
        note: { code: 'FALLBACK_TO_OTHER_ROUTE' },
      }
    }
    return {
      sourceId: primary,
      family,
      mode: 'api',
      provider,
      model,
      fallback: false,
      note: { code: 'SOURCE_UNAVAILABLE' },
    }
  }

  // Any other configured route still has a real surface: its local token usage
  // and, when priced, a local estimate. Never substitute another provider's
  // balance for it.
  const genericId = typeof provider === 'string' && provider !== '' ? `provider:${provider}` : null
  if (genericId !== null && isObject(sources[genericId])) {
    return {
      sourceId: genericId,
      family: family === null ? 'generic' : family,
      mode: 'usage',
      provider,
      model,
      fallback: false,
      note: { code: 'LOCAL_USAGE_ONLY' },
    }
  }

  const candidates = ['deepseekAccount', 'deepseekKey', 'kimi', 'openai'].filter((id) => usable(sources[id]))
  if (candidates.length > 0) {
    const id = candidates[0]
    const meta = SOURCE_META[id]
    return {
      sourceId: id,
      family: meta.family,
      mode: meta.mode,
      provider,
      model,
      fallback: true,
      note: { code: provider === null ? 'NO_ROUTE' : 'UNKNOWN_PROVIDER' },
    }
  }

  return {
    sourceId: null,
    family: null,
    mode: 'unsupported',
    provider,
    model,
    fallback: false,
    note: { code: provider === null ? 'NO_ROUTE' : 'UNKNOWN_PROVIDER' },
  }
}

// ---------------------------------------------------------------------------
// Host plugin
// ---------------------------------------------------------------------------

export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)
  const credentialTargets = credentialTargetsFor(config)
  const sourceCache = new Map()
  const ledger = new Map()
  let snapshotCache = null
  let snapshotInflight = null
  let scanning = null
  let lastScanAt = null
  let scannedSessions = 0
  let scanErrors = 0
  let scanTruncated = false

  const pricingConfig = {
    source: { ...config.pricingSource },
    overrides: config.pricingOverrides,
  }

  const pricingState = {
    status: pricingConfig.source.url === null ? 'unconfigured' : 'never',
    version: null,
    updatedAt: null,
    checkedAt: null,
    fetchedAt: null,
    error: pricingConfig.source.url === null
      ? { code: 'NO_PRICING_URL', detail: null, status: null }
      : null,
  }
  let remotePricing = null
  let pricingInflight = null
  let pricingCheckedAt = 0

  const effectivePricing = () => mergePricing(defaultPricing(), remotePricing, pricingConfig.overrides)

  function pricingMeta() {
    const remote = pricingState.status === 'ready' || pricingState.status === 'stale'
    return {
      version: remote && pricingState.version !== null ? pricingState.version : PRICE_VERSION,
      builtinVersion: PRICE_VERSION,
      unit: 'PER_MILLION_TOKENS',
      url: PRICING_URL,
      source: {
        url: pricingConfig.source.url,
        refreshSeconds: pricingConfig.source.refreshSeconds,
        status: pricingState.status,
        version: pricingState.version,
        updatedAt: pricingState.updatedAt,
        checkedAt: pricingState.checkedAt,
        fetchedAt: pricingState.fetchedAt,
        error: pricingState.error,
      },
    }
  }

  function pricingDue(force) {
    if (pricingConfig.source.url === null) return false
    if (force) return true
    return Date.now() - pricingCheckedAt >= pricingConfig.source.refreshSeconds * 1000
  }

  /**
   * Fetch the optional price source. A failure keeps the last successful
   * document (marked stale) and never replaces money with zero; the reason is
   * reported to the page.
   */
  async function refreshPricing(force) {
    if (pricingConfig.source.url === null) {
      pricingState.status = 'unconfigured'
      pricingState.error = { code: 'NO_PRICING_URL', detail: null, status: null }
      return pricingState
    }
    if (pricingInflight !== null) return pricingInflight
    if (!pricingDue(force)) return pricingState
    pricingInflight = (async () => {
      const now = Date.now()
      pricingState.checkedAt = now
      pricingCheckedAt = now
      try {
        const body = await fetchJson(pricingConfig.source.url, { headers: { accept: 'application/json' } })
        const document = parsePricingDocument(body)
        remotePricing = document.pricing
        pricingState.status = 'ready'
        pricingState.version = document.version !== null ? document.version : `source-${now}`
        pricingState.updatedAt = document.updatedAt
        pricingState.source = document.source !== null ? document.source : pricingConfig.source.url
        pricingState.fetchedAt = now
        pricingState.error = null
      } catch (cause) {
        pricingState.error = errorOf(cause)
        pricingState.status = remotePricing !== null ? 'stale' : 'error'
      }
      return pricingState
    })().finally(() => {
      pricingInflight = null
    })
    return pricingInflight
  }

  const get = (name) => {
    try {
      return typeof ctx.get === 'function' ? ctx.get(name) : undefined
    } catch {
      return undefined
    }
  }

  async function credentialStatuses() {
    return Promise.all(credentialTargets.map(async (target) => ({
      ...target,
      ...(await describeCredential(ctx, target.ref)),
    })))
  }

  function configEditor() {
    const editor = get('configEditor')
    return editor !== undefined && editor !== null
      && typeof editor.entries === 'function' && typeof editor.edit === 'function'
      ? editor
      : null
  }

  /** The profile entry that owns this plugin instance. The fiber identity is
   * authoritative; the package name is a fallback for a wrapped row. */
  function ownEntry(editor) {
    const entries = editor.entries()
    const fiber = ctx !== undefined && ctx.fiber !== undefined ? ctx.fiber : null
    if (fiber !== null) {
      const byFiber = entries.find((entry) => isObject(entry) && entry.fiber !== undefined && entry.fiber === fiber)
      if (byFiber !== undefined) return byFiber
    }
    const names = new Set([PACKAGE_NAME, LEGACY_PACKAGE_NAME])
    return entries.find((entry) => isObject(entry) && isObject(entry.options) && names.has(entry.options.name)) || null
  }

  function configDocumentPath() {
    const editor = configEditor()
    if (editor === null) return null
    try {
      return typeof editor.documentPath === 'string' ? editor.documentPath : null
    } catch {
      return null
    }
  }

  /**
   * Persist the pricing knobs into this row's profile config through the Host
   * configuration editor: it validates, writes atomically, preserves comments,
   * and reloads the row. Other fields of the row config are kept.
   */
  async function savePricingConfig(next) {
    const editor = configEditor()
    if (editor === null) throw new SourceError('NO_CONFIG_EDITOR', 'The Host configuration editor is not mounted.')
    const entry = ownEntry(editor)
    if (entry === null) {
      throw new SourceError('NO_CONFIG_ENTRY', 'This plugin row is not a unique profile entry; edit the profile configuration directly.')
    }
    const stored = compactPricing(next.pricing)
    await editor.edit(entry, (current) => {
      const base = isObject(current) ? { ...current } : {}
      if (next.pricingSource.url === null) delete base.pricingSource
      else base.pricingSource = { url: next.pricingSource.url, refreshSeconds: next.pricingSource.refreshSeconds }
      if (Object.keys(stored).length === 0) delete base.pricing
      else base.pricing = stored
      return base
    })
    return { pricingSource: next.pricingSource, pricing: next.pricing }
  }

  const sessionQuery = () => get('sessionQuery')

  function nowSource(id, value) {
    return { ...value, id, family: SOURCE_META[id].family, mode: SOURCE_META[id].mode, labelKey: SOURCE_META[id].labelKey }
  }

  async function refreshSource(id, force, now, fetcher) {
    const previous = sourceCache.get(id)
    const previousValue = previous !== undefined ? previous.value : null
    const ttl = previousValue !== null && previousValue.status === 'ready'
      ? config.refreshSeconds * 1000
      : 15_000
    if (!force && previous !== undefined && now - previous.at < ttl) return previousValue

    try {
      const next = await fetcher()
      const value = nowSource(id, {
        status: 'ready',
        fetchedAt: now,
        attemptedAt: now,
        stale: false,
        error: null,
        ...next,
      })
      sourceCache.set(id, { value, at: now })
      return value
    } catch (cause) {
      const error = errorOf(cause)
      let value
      if (usable(previousValue)) {
        value = {
          ...previousValue,
          status: 'stale',
          stale: true,
          error,
          attemptedAt: now,
        }
      } else {
        value = sourceErrorValue(id, error, now)
      }
      sourceCache.set(id, { value, at: now })
      return value
    }
  }

  async function collectKimi(force, now) {
    return refreshSource('kimi', force, now, async () => {
      const key = await resolveCredential(ctx, config.kimiKeyRef)
      if (key === null) {
        return {
          status: 'unconfigured',
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: { code: 'NO_API_KEY', detail: config.kimiKeyRef, status: null },
          keyRef: config.kimiKeyRef,
        }
      }
      const body = await fetchJson(KIMI_USAGE_URL, {
        headers: {
          authorization: `Bearer ${key.value}`,
          accept: 'application/json',
          'user-agent': 'KimiCLI/1.6',
        },
      })
      if (isObject(body) && !isObject(body.usages) && !isObject(body.usage) && !Array.isArray(body.limits)) {
        const code = asNumber(body.code)
        if (code === 401 || code === 403) throw new SourceError('AUTH_FAILED', 'Kimi rejected the credential.', code)
        if (typeof body.message === 'string' || typeof body.msg === 'string') {
          throw new SourceError('HTTP_ERROR', String(body.message || body.msg).slice(0, 240), code)
        }
      }
      const parsed = parseKimiResponse(body, now)
      return {
        ...parsed,
        provider: 'kimi-coding',
        keyRef: config.kimiKeyRef,
        keySource: key.source,
        provenance: 'provider-quota',
      }
    })
  }

  async function collectAccount(force, now) {
    return refreshSource('deepseekAccount', force, now, async () => {
      const account = get('deepseekAccount')
      if (account === undefined || typeof account.getState !== 'function' || typeof account.getBalance !== 'function') {
        return {
          status: 'unconfigured',
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: { code: 'NO_ACCOUNT_SERVICE', detail: null, status: null },
        }
      }
      const state = await withTimeout(account.getState(), 5_000, 'TIMEOUT')
      const links = safeLinks(state !== null && isObject(state) ? state.links : null)
      if (!isObject(state) || state.status !== 'credential-stored') {
        return {
          status: 'signed-out',
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: null,
          wallets: [],
          links,
        }
      }
      const balance = await withTimeout(account.getBalance(accountClient(config)), ACCOUNT_TIMEOUT_MS, 'TIMEOUT')
      if (balance === null || balance === undefined) {
        return {
          status: 'signed-out',
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: null,
          wallets: [],
          links,
        }
      }
      if (!isObject(balance) || balance.status !== 'ready') {
        throw new SourceError('ACCOUNT_FAILED', 'The signed-in account returned no balance.')
      }
      const wallets = accountWallets(balance.value, balance.bonusWallets)
      if (wallets.length === 0) throw new SourceError('NO_DATA', 'The signed-in account has no wallet.')
      return {
        wallets,
        links,
        provider: 'deepseek-account',
        provenance: 'account-service',
        isAvailable: true,
      }
    })
  }

  async function collectKey(force, now) {
    return refreshSource('deepseekKey', force, now, async () => {
      const key = await resolveCredential(ctx, config.deepseekKeyRef)
      if (key === null) {
        return {
          status: 'unconfigured',
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: { code: 'NO_API_KEY', detail: config.deepseekKeyRef, status: null },
          keyRef: config.deepseekKeyRef,
        }
      }
      const body = await fetchJson(DEEPSEEK_BALANCE_URL, {
        headers: {
          authorization: `Bearer ${key.value}`,
          accept: 'application/json',
        },
      })
      if (isObject(body) && !Array.isArray(body.balance_infos)) {
        const code = asNumber(body.code)
        if (code === 401 || code === 403) throw new SourceError('AUTH_FAILED', 'DeepSeek rejected the API key.', code)
        if (typeof body.message === 'string' || typeof body.msg === 'string') {
          throw new SourceError('HTTP_ERROR', String(body.message || body.msg).slice(0, 240), code)
        }
      }
      const parsed = parseDeepSeekBalance(body)
      return {
        ...parsed,
        provider: 'deepseek-official',
        keyRef: config.deepseekKeyRef,
        keySource: key.source,
        provenance: 'official-balance',
        links: { usageUrl: PLATFORM_USAGE_URL, topUpUrl: PLATFORM_TOPUP_URL },
      }
    })
  }

  async function collectOpenAI(force, now) {
    return refreshSource('openai', force, now, async () => {
      const apiKey = await resolveCredential(ctx, config.openaiKeyRef)
      const adminKey = await resolveCredential(ctx, config.openaiAdminKeyRef)
      const base = {
        provider: 'openai',
        detailsUrl: OPENAI_USAGE_PAGE,
        costsUrl: OPENAI_COSTS_PAGE,
        keyRef: config.openaiKeyRef,
        adminKeyRef: config.openaiAdminKeyRef,
      }
      if (apiKey === null && adminKey === null) {
        return {
          ...base,
          status: 'unconfigured',
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: { code: 'NO_API_KEY', detail: config.openaiKeyRef, status: null },
        }
      }
      if (adminKey === null) {
        return {
          ...base,
          status: 'limited',
          exact: false,
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: { code: 'OPENAI_ADMIN_KEY_REQUIRED', detail: config.openaiAdminKeyRef, status: null },
          keySource: apiKey !== null ? apiKey.source : null,
        }
      }

      const start = Math.floor(startOfTodayShanghai(now) / 1000)
      const end = Math.floor(now / 1000) + 1
      const headers = {
        authorization: `Bearer ${adminKey.value}`,
        accept: 'application/json',
      }
      const organization = typeof process.env.OPENAI_ORG_ID === 'string' ? process.env.OPENAI_ORG_ID.trim() : ''
      if (organization !== '') headers['openai-organization'] = organization
      try {
        const body = await fetchJson(`${OPENAI_COSTS_URL}?start_time=${start}&end_time=${end}&bucket_width=1d&limit=31`, { headers })
        const parsed = parseOpenAICosts(body)
        return {
          ...base,
          status: 'ready',
          exact: true,
          fetchedAt: now,
          attemptedAt: now,
          stale: false,
          error: null,
          officialCost: parsed,
          provenance: 'openai-costs',
          adminKeySource: adminKey.source,
        }
      } catch (cause) {
        if (apiKey === null) throw cause
        return {
          ...base,
          status: 'limited',
          exact: false,
          fetchedAt: null,
          attemptedAt: now,
          stale: false,
          error: errorOf(cause),
          keySource: apiKey.source,
          adminKeySource: adminKey.source,
        }
      }
    })
  }

  function detailsForProvider(provider, family, baseURL) {
    if (family === 'openai') return OPENAI_USAGE_PAGE
    if (family === 'deepseek') return PLATFORM_USAGE_URL
    if (family === 'kimi') return 'https://www.kimi.com/'
    const host = hostOf(baseURL)
    return host === null ? null : `https://${host}/`
  }

  function deriveKeyRef(provider) {
    const stem = String(provider).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    return stem === '' ? null : `${stem}_API_KEY`
  }

  async function readProviderSettings() {
    const settings = get('settings')
    if (settings === undefined || typeof settings.describe !== 'function') return {}
    try {
      const documents = await withTimeout(
        Promise.resolve(settings.describe({ redactSecrets: true })),
        5_000,
        'TIMEOUT',
      )
      const document = Array.isArray(documents)
        ? documents.find((entry) => isObject(entry) && entry.ns === 'llm-pi-ai')
        : null
      if (document === null || !isObject(document.value) || !isObject(document.value.providers)) return {}
      return document.value.providers
    } catch {
      return {}
    }
  }

  function modelList(value) {
    const list = Array.isArray(value) ? value : []
    const models = []
    const seen = new Set()
    for (const entry of list) {
      const id = typeof entry === 'string'
        ? entry
        : isObject(entry) ? asString(entry.id) || asString(entry.model) : null
      if (id === null || id === '' || seen.has(id)) continue
      seen.add(id)
      models.push({
        id,
        name: isObject(entry) ? asString(entry.name) : null,
        contextWindow: isObject(entry) ? asNumber(entry.contextWindow) : null,
      })
    }
    return models
  }

  /**
   * Enumerate every route the user configured, not a fixed provider list. The
   * LLM registry reports route ids only, so the settings document and the
   * configurable-provider directory supply the display name, endpoint, and
   * models for hand-added providers. Model lists are read per route so a model
   * the user adds in Settings appears here without a plugin update.
   */
  async function collectCatalog(now) {
    const llm = get('llm')
    if (llm === undefined || typeof llm.listProviders !== 'function') {
      return { providers: [], fetchedAt: now, error: { code: 'NO_LLM_SERVICE', detail: null, status: null } }
    }
    try {
      const [registered, directory, profiles] = await Promise.all([
        withTimeout(llm.listProviders(), 5_000, 'TIMEOUT'),
        typeof llm.listConfigurableProviders === 'function'
          ? withTimeout(llm.listConfigurableProviders(), 5_000, 'TIMEOUT').catch(() => [])
          : Promise.resolve([]),
        readProviderSettings(),
      ])
      const configurable = new Map()
      for (const entry of Array.isArray(directory) ? directory : []) {
        if (isObject(entry) && typeof entry.provider === 'string') configurable.set(entry.provider, entry)
      }
      const routes = new Map()
      for (const entry of Array.isArray(registered) ? registered : []) {
        if (isObject(entry) && typeof entry.id === 'string') routes.set(entry.id, asString(entry.name))
      }
      const ids = [...new Set([...routes.keys(), ...Object.keys(isObject(profiles) ? profiles : {})])]
      const modelCache = new Map()
      const readModels = async (provider) => {
        if (modelCache.has(provider)) return modelCache.get(provider)
        let models = []
        if (typeof llm.listModels === 'function') {
          try {
            models = modelList(await withTimeout(llm.listModels(provider), 4_000, 'TIMEOUT'))
          } catch {
            models = []
          }
        }
        if (models.length === 0) {
          const profile = isObject(profiles) ? profiles[provider] : null
          models = modelList(isObject(profile) ? profile.models : null)
        }
        modelCache.set(provider, models)
        return models
      }

      const providers = await Promise.all(ids.map(async (provider) => {
        const directoryEntry = configurable.get(provider)
        const profile = isObject(profiles) ? profiles[provider] : null
        const registeredHere = routes.has(provider)
        const baseURL = (isObject(profile) ? asString(profile.baseURL) : null)
          || (directoryEntry !== undefined ? asString(directoryEntry.defaultBaseURL) : null)
        const displayName = PROVIDER_DISPLAY_NAMES[provider]
          || (isObject(profile) ? asString(profile.displayName) : null)
          || (directoryEntry !== undefined ? asString(directoryEntry.displayName) : null)
          || routes.get(provider)
          || provider
        const entry = {
          provider,
          displayName,
          registered: registeredHere,
          declared: directoryEntry !== undefined ? directoryEntry.declared === true : !registeredHere,
          settingsNs: directoryEntry !== undefined ? asString(directoryEntry.settingsNs) : null,
          baseURL,
          keyRef: (isObject(profile) ? asString(profile.apiKeyEnv) : null) || deriveKeyRef(provider),
          models: await readModels(provider),
        }
        const family = familyOfProvider(provider, entry)
        const sourceId = sourceIdForFamily(provider, family)
        return {
          ...entry,
          family,
          mode: family === 'kimi' ? 'coding-plan' : family === null ? 'usage' : 'api',
          sourceId: sourceId === null && registeredHere ? `provider:${provider}` : sourceId,
          supported: sourceId !== null,
          detailsUrl: detailsForProvider(provider, family, baseURL),
          noteCode: sourceId === null ? 'NO_ADAPTER' : null,
        }
      }))
      return { providers, fetchedAt: now, error: null }
    } catch (cause) {
      return { providers: [], fetchedAt: now, error: errorOf(cause) }
    }
  }

  function addLedgerRows(rows) {
    for (const row of rows) {
      if (!isObject(row)) continue
      const key = `${row.sessionId}:${row.seq}`
      if (!ledger.has(key)) ledger.set(key, row)
    }
    const cutoff = Date.now() - 8 * 24 * 60 * 60 * 1000
    for (const [key, row] of ledger) {
      if (row.time < cutoff) ledger.delete(key)
    }
  }

  function scanState() {
    return {
      status: scanning === null ? 'idle' : 'scanning',
      lastScanAt,
      scannedSessions,
      errors: scanErrors,
      truncated: scanTruncated,
    }
  }

  function ensureScan(force) {
    if (scanning !== null) return scanning
    if (!force && lastScanAt !== null && Date.now() - lastScanAt < 10 * 60 * 1000) {
      return Promise.resolve()
    }
    const query = sessionQuery()
    if (query === undefined || typeof query.listSessions !== 'function' || typeof query.readSession !== 'function') {
      lastScanAt = Date.now()
      scanErrors += 1
      return Promise.resolve()
    }

    const run = (async () => {
      let list
      try {
        list = await query.listSessions()
      } catch {
        scanErrors += 1
        lastScanAt = Date.now()
        return
      }
      const records = (Array.isArray(list) ? list : []).slice(0, config.maxScanSessions)
      scanTruncated = Array.isArray(list) && list.length > records.length
      const queue = records.slice()
      scannedSessions = records.length
      scanErrors = 0
      const worker = async () => {
        for (;;) {
          const record = queue.shift()
          if (record === undefined) return
          const header = isObject(record) && isObject(record.header) ? record.header : null
          const id = header !== null ? asString(header.id) : null
          if (id === null) continue
          try {
            const snapshot = await query.readSession(id)
            const inherited = isObject(snapshot) && Number.isFinite(Number(snapshot.inheritedEventCount))
              ? Number(snapshot.inheritedEventCount)
              : 0
            const events = isObject(snapshot) && Array.isArray(snapshot.events) ? snapshot.events : []
            // A forked Session carries its parent's prefix in its own log. Counting
            // that prefix again would double-count the same provider request.
            const ownEvents = inherited > 0
              ? events.filter((event) => !isObject(event) || typeof event.seq !== 'number' || event.seq >= inherited)
              : events
            addLedgerRows(foldSessionEvents(id, ownEvents))
          } catch {
            scanErrors += 1
          }
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()])
      lastScanAt = Date.now()
    })().finally(() => {
      scanning = null
    })
    scanning = run
    return run
  }

  async function buildSpend(force, now, catalog) {
    const pricing = effectivePricing()
    const catalogProviders = isObject(catalog) && Array.isArray(catalog.providers) ? catalog.providers : []
    // A route that resolves to an official family shares that family's table
    // unless the user configured a price table for the route itself.
    for (const entry of catalogProviders) {
      if (!isObject(entry) || typeof entry.family !== 'string') continue
      if (!isObject(pricing[entry.family]) || isObject(pricing[entry.provider])) continue
      pricing[entry.provider] = pricing[entry.family]
    }
    const sourceFor = (provider) => {
      const entry = catalogProviders.find((candidate) => isObject(candidate) && candidate.provider === provider)
      return entry !== undefined ? entry.sourceId : null
    }
    const pricingBlock = { ...pricingMeta(), tables: describePricing(pricing) }
    if (!config.includeLocalSpend) {
      const disabled = {
        status: 'disabled',
        exact: false,
        fetchedAt: now,
        warnings: ['LOCAL_SPEND_DISABLED'],
        total: finalizeMergedEstimate(emptyEstimateBucket()),
        byProvider: {},
        bySource: {},
        pricing: pricingBlock,
        scan: scanState(),
      }
      return { estimates: disabled, spend: null }
    }
    if (force) await ensureScan(true)
    else void ensureScan(false)
    const rows = [...ledger.values()]
    const estimates = computeEstimates(rows, now, pricing, sourceFor)
    const spend = computeSpend(rows, now, pricing, sourceFor)
    for (const target of [estimates, spend]) {
      if (sessionQuery() === undefined) target.warnings.push('NO_SESSION_QUERY')
      if (scanErrors > 0) target.warnings.push('SCAN_ERRORS')
      if (scanTruncated) target.warnings.push('SCAN_TRUNCATED')
      target.scan = scanState()
      target.pricing = pricingBlock
    }
    return { estimates, spend }
  }

  function route() {
    try {
      const service = get('agentDefaultModel')
      if (service !== undefined && typeof service.currentSelection === 'function') {
        const selection = service.currentSelection()
        if (isObject(selection)) {
          return {
            provider: asString(selection.provider),
            model: asString(selection.model),
          }
        }
      }
    } catch {
      // The default-selection service is optional.
    }
    return { provider: null, model: null }
  }

  const collectors = {
    kimi: collectKimi,
    deepseekAccount: collectAccount,
    deepseekKey: collectKey,
    openai: collectOpenAI,
  }

  async function collectAll(force) {
    const now = Date.now()
    const [entries] = await Promise.all([
      Promise.all(SOURCE_ADAPTERS.map(async (adapter) => {
        const collector = collectors[adapter.id]
        return [adapter.id, await collector(force, now)]
      })),
      // A price-source failure only annotates the estimate; it never blocks a
      // balance reading.
      refreshPricing(force),
    ])
    const sources = Object.fromEntries(entries)
    const [catalog, credentials] = await Promise.all([collectCatalog(now), credentialStatuses()])
    for (const entry of Array.isArray(catalog.providers) ? catalog.providers : []) {
      if (entry.supported === true || entry.registered !== true) continue
      const id = entry.sourceId !== null && entry.sourceId !== undefined ? entry.sourceId : `provider:${entry.provider}`
      if (sources[id] !== undefined) continue
      // No balance endpoint exists for this route, but the plugin still owns a
      // real surface: local token usage and, when priced, a local estimate.
      sources[id] = {
        id,
        family: typeof entry.family === 'string' ? entry.family : 'generic',
        mode: 'usage',
        label: entry.displayName,
        provider: entry.provider,
        status: 'ready',
        exact: false,
        fetchedAt: now,
        attemptedAt: now,
        stale: false,
        error: null,
        detailsUrl: entry.detailsUrl,
        baseURL: entry.baseURL,
        keyRef: entry.keyRef,
        models: entry.models,
      }
    }

    const defaultRoute = route()
    const active = chooseActiveSource(defaultRoute, sources, catalog)
    const { estimates, spend } = await buildSpend(force, now, catalog)
    const usage = computeUsage([...ledger.values()], now)
    for (const id of Object.keys(sources)) {
      sources[id] = {
        ...sources[id],
        localUsage: usageForSource(usage, id, catalog),
        estimate: estimates.bySource[id] || null,
        // Every card gets its own configuration targets, so a future adapter
        // does not have to remember to thread them through the client.
        credentials: credentials.filter((target) => target.sourceId === id),
      }
    }
    return {
      ok: true,
      generatedAt: Date.now(),
      active,
      defaultRoute,
      catalog,
      sources,
      spend,
      estimates,
      localUsage: usage.byProvider,
      meta: {
        version: '1.6.0',
        refreshSeconds: config.refreshSeconds,
        priceVersion: pricingMeta().version,
        priceSource: pricingMeta().source,
        credentials,
        pricingConfig: {
          pricingSource: {
            url: pricingConfig.source.url,
            refreshSeconds: pricingConfig.source.refreshSeconds,
          },
          pricing: pricingConfig.overrides,
        },
        configPath: configDocumentPath(),
        configWritable: (() => {
          const editor = configEditor()
          return editor !== null && ownEntry(editor) !== null
        })(),
        pricingUrl: PRICING_URL,
        usageUrl: PLATFORM_USAGE_URL,
        topUpUrl: PLATFORM_TOPUP_URL,
        openaiUsageUrl: OPENAI_USAGE_PAGE,
        openaiCostsUrl: OPENAI_COSTS_PAGE,
        range: 'today',
        timezone: 'Asia/Shanghai',
      },
    }
  }

  function snapshot(force) {
    const now = Date.now()
    const ttl = snapshotCache !== null && snapshotCache.estimates && snapshotCache.estimates.scan
      && snapshotCache.estimates.scan.status === 'scanning'
      ? 5_000
      : config.refreshSeconds * 1000
    if (!force && snapshotCache !== null && now - snapshotCache.generatedAt < ttl) {
      return Promise.resolve(snapshotCache)
    }
    if (snapshotInflight !== null) return snapshotInflight
    const run = collectAll(force)
      .then((payload) => {
        snapshotCache = payload
        return payload
      })
      .finally(() => {
        if (snapshotInflight === run) snapshotInflight = null
      })
    snapshotInflight = run
    return run
  }

  function sendJson(res, value, status = 200) {
    const body = JSON.stringify(value)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    res.end(body)
  }

  /**
   * Refuse a request rejected by Connection's trust policy or by the
   * same-origin fallback, owning the 401/403 response here.
   * @returns true when the response has been written.
   */
  function rejectRoute(req, res) {
    const rejection = requestRejection(req, get('connection'))
    if (rejection === null) return false
    sendJson(res, {
      ok: false,
      error: {
        code: rejection === 401 ? 'UNAUTHENTICATED' : 'ORIGIN_REJECTED',
        message: rejection === 401
          ? 'This route requires an authenticated browser session.'
          : 'This route accepts same-origin requests only.',
      },
    }, rejection)
    return true
  }

  const handleStatus = (req, res) => {
    if (rejectRoute(req, res)) return
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
      return
    }
    void snapshot(false)
      .then((payload) => sendJson(res, payload))
      .catch((cause) => sendJson(res, { ok: false, error: errorOf(cause) }, 500))
  }

  const handleRefresh = (req, res) => {
    if (rejectRoute(req, res)) return
    if (req.method !== 'POST') {
      sendJson(res, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
      return
    }
    snapshotCache = null
    void snapshot(true)
      .then((payload) => sendJson(res, payload))
      .catch((cause) => sendJson(res, { ok: false, error: errorOf(cause) }, 500))
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${ROUTE}/status.json`,
    handler: handleStatus,
  }), 'subscription-balance: status route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${ROUTE}/refresh.json`,
    handler: handleRefresh,
  }), 'subscription-balance: refresh route')

  const handlePricingRefresh = (req, res) => {
    if (rejectRoute(req, res)) return
    if (req.method !== 'POST') {
      sendJson(res, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
      return
    }
    snapshotCache = null
    void refreshPricing(true)
      .then(() => snapshot(false))
      .then((payload) => sendJson(res, payload))
      .catch((cause) => sendJson(res, { ok: false, error: errorOf(cause) }, 500))
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${ROUTE}/pricing/refresh.json`,
    handler: handlePricingRefresh,
  }), 'subscription-balance: pricing refresh route')

  const handleConfigSave = (req, res) => {
    if (rejectRoute(req, res)) return
    if (req.method !== 'POST') {
      sendJson(res, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
      return
    }
    void readJsonBody(req)
      .then((body) => {
        const next = normalizePricingConfigInput(body)
        return savePricingConfig(next)
      })
      .then((saved) => sendJson(res, { ok: true, applying: true, config: saved }))
      .catch((cause) => {
        const status = cause instanceof SourceError && cause.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400
        sendJson(res, { ok: false, error: errorOf(cause) }, status)
      })
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${ROUTE}/config.json`,
    handler: handleConfigSave,
  }), 'subscription-balance: config route')

  const handleCredentialSave = (req, res) => {
    if (rejectRoute(req, res)) return
    if (req.method !== 'POST') {
      sendJson(res, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
      return
    }
    void readJsonBody(req)
      .then(async (body) => {
        const request = isObject(body) ? body : {}
        const targetId = asString(request.target)
        const target = credentialTargets.find((candidate) => candidate.id === targetId)
        if (target === undefined) {
          throw new SourceError('UNKNOWN_CONFIG_TARGET', 'Unknown configuration target.')
        }
        const credentials = get('credentials')
        if (credentials === undefined || credentials === null
          || typeof credentials.set !== 'function' || typeof credentials.unset !== 'function') {
          throw new SourceError('NO_CREDENTIALS_SERVICE', 'The Host credential store is not mounted.')
        }
        const value = request.action === 'unset' ? null : normalizeCredentialValue(request.value)
        try {
          if (value === null) await credentials.unset(target.ref)
          else await credentials.set(target.ref, value)
        } catch (cause) {
          if (cause instanceof SourceError) throw cause
          throw new SourceError(
            'CREDENTIAL_WRITE_FAILED',
            cause instanceof Error ? cause.message.slice(0, 240) : 'The credential store refused the write.',
          )
        }
        sourceCache.clear()
        snapshotCache = null
        // A status poll may already be reading the old credential; let it
        // settle before forcing a fresh snapshot so the reply shows the write.
        if (snapshotInflight !== null) {
          try {
            await snapshotInflight
          } catch {
            // The next snapshot owns the error surface.
          }
          snapshotCache = null
        }
        return snapshot(true)
      })
      .then((payload) => sendJson(res, payload))
      .catch((cause) => {
        const status = cause instanceof SourceError && cause.code === 'PAYLOAD_TOO_LARGE' ? 413
          : cause instanceof SourceError && cause.code === 'NO_CREDENTIALS_SERVICE' ? 503
            : cause instanceof SourceError && cause.code === 'UNKNOWN_CONFIG_TARGET' ? 404
              : 400
        sendJson(res, { ok: false, error: errorOf(cause) }, status)
      })
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${ROUTE}/credentials.json`,
    handler: handleCredentialSave,
  }), 'subscription-balance: credential route')

  if (config.includeLocalSpend && typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on('session/event', (session, event) => {
      if (!isObject(event) || event.type !== 'assistant/message') return
      const id = isObject(session) && typeof session.id === 'string' ? session.id : null
      if (id === null) return
      addLedgerRows(foldSessionEvents(id, [event]))
    }), 'subscription-balance: live usage')
  }

  if (typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on('credentials/reference-updated', (ref) => {
      const value = typeof ref === 'string' ? ref : String(ref)
      if (value === config.kimiKeyRef) sourceCache.delete('kimi')
      if (value === config.deepseekKeyRef) sourceCache.delete('deepseekKey')
      if (value === config.openaiKeyRef || value === config.openaiAdminKeyRef) sourceCache.delete('openai')
      if (value === config.kimiKeyRef || value === config.deepseekKeyRef
        || value === config.openaiKeyRef || value === config.openaiAdminKeyRef) snapshotCache = null
    }), 'subscription-balance: credential changes')

    for (const event of ['llm/adapters-updated', 'llm/models-updated', 'settings/document-updated']) {
      ctx.effect(() => ctx.on(event, () => {
        snapshotCache = null
      }), `subscription-balance: ${event}`)
    }
  }

  const account = get('deepseekAccount')
  if (account !== undefined && typeof account.watch === 'function') {
    ctx.effect(() => {
      const controller = new AbortController()
      void (async () => {
        try {
          for await (const _state of account.watch(controller.signal)) {
            sourceCache.delete('deepseekAccount')
            snapshotCache = null
          }
        } catch {
          // Sign-in state is optional; the next poll simply reads it again.
        }
      })()
      return () => controller.abort()
    }, 'subscription-balance: account change')
  }

  // Warm the cache and begin the one-time session scan without blocking load.
  void snapshot(false).catch(() => {})
}
