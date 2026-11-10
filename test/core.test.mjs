import assert from 'node:assert/strict'
import test from 'node:test'

import {
  chooseActiveSource,
  computeEstimates,
  computeSpend,
  computeUsage,
  familyOfProvider,
  foldSessionEvents,
  normalizeConfig,
  parseDeepSeekBalance,
  parseKimiResponse,
  parseOpenAICosts,
  parsePricingDocument,
  requestRejection,
  sourceIdForProvider,
  startOfTodayShanghai,
} from '../index.js'

const KIMI_RESET_5H = '2026-11-09T08:00:00Z'
const KIMI_RESET_7D = '2026-11-15T00:00:00Z'

test('Kimi parser keeps every current window and merges unique legacy windows', () => {
  const parsed = parseKimiResponse({
    usages: {
      limit_5h: { used_ratio: 0.25, reset_time: KIMI_RESET_5H },
      limit_7d: { used_ratio: 0.5, reset_time: KIMI_RESET_7D },
      limit_month_total: { used_ratio: 0.1559, reset_time: '2026-12-01T00:00:00Z' },
      limit_month_code: { used_ratio: 0, reset_time: null },
    },
    limits: [{
      window: { duration: 300, timeUnit: 'TIME_UNIT_MINUTE' },
      detail: { limit: '100', used: '25', remaining: '75', resetTime: KIMI_RESET_5H },
    }],
    usage: { limit: '1000', remaining: '400', resetTime: KIMI_RESET_7D },
    user: { membership: { level: 'LEVEL_INTERMEDIATE' } },
    boosterWallet: { balance: { amountLeft: 12 } },
    parallel: { limit: 4 },
  }, 1_000)

  assert.equal(parsed.windows.length, 4)
  assert.deepEqual(parsed.windows.map((window) => window.key), [
    'limit_5h', 'limit_7d', 'limit_month_total', 'limit_month_code',
  ])

  const session = parsed.windows.find((window) => window.key === 'limit_5h')
  assert.equal(session.usedPercent, 25)
  assert.equal(session.remainingPercent, 75)
  assert.equal(session.limit, 100)
  assert.equal(session.used, 25)
  assert.equal(session.source, 'usages')

  const weekly = parsed.windows.find((window) => window.key === 'limit_7d')
  assert.equal(weekly.usedPercent, 50)
  assert.equal(weekly.limit, 1000)
  assert.equal(weekly.remaining, 400)

  const monthly = parsed.windows.find((window) => window.key === 'limit_month_total')
  assert.equal(monthly.usedPercent, 15.59)
  assert.equal(monthly.remainingPercent, 84.41)

  const code = parsed.windows.find((window) => window.key === 'limit_month_code')
  assert.equal(code.usedPercent, 0)
  assert.equal(code.remainingPercent, 100)

  assert.equal(parsed.plan.level, 'LEVEL_INTERMEDIATE')
  assert.deepEqual(parsed.extras, [
    { id: 'booster', kind: 'booster', value: 12 },
    { id: 'parallel', kind: 'parallel', value: 4 },
  ])
  assert.equal(parsed.conflicts.length, 1)
  assert.equal(parsed.conflicts[0].key, 'limit_7d')
})

test('Kimi parser preserves an unknown future window instead of dropping it', () => {
  const parsed = parseKimiResponse({
    usages: {
      limit_5h: { used_ratio: 0 },
      limit_quarter_2027: { used_ratio: 0.42, reset_time: '2027-01-01T00:00:00Z' },
    },
  })
  assert.equal(parsed.windows.length, 2)
  const custom = parsed.windows.find((window) => window.key === 'limit_quarter_2027')
  assert.equal(custom.usedPercent, 42)
  assert.equal(custom.remainingPercent, 58)
})

test('Kimi parser reports a legacy/current conflict and prefers the ratio', () => {
  const parsed = parseKimiResponse({
    usages: { limit_5h: { used_ratio: 0.25 } },
    limits: [{
      window: { duration: 300, timeUnit: 'TIME_UNIT_MINUTE' },
      detail: { limit: '100', used: '90', remaining: '10' },
    }],
  })
  assert.equal(parsed.windows[0].usedPercent, 25)
  assert.equal(parsed.conflicts.length, 1)
  assert.equal(parsed.conflicts[0].preferredUsedPercent, 25)
  assert.equal(parsed.conflicts[0].legacyUsedPercent, 90)
})

test('Kimi parser rejects an empty quota response', () => {
  assert.throws(() => parseKimiResponse({ usages: {} }), (error) => error.code === 'NO_DATA')
})

test('DeepSeek balance parser preserves total, top-up and bonus strings', () => {
  const parsed = parseDeepSeekBalance({
    is_available: true,
    balance_infos: [{
      currency: 'CNY',
      total_balance: '88.50',
      granted_balance: '1.50',
      topped_up_balance: '87.00',
    }],
  })
  assert.equal(parsed.isAvailable, true)
  assert.deepEqual(parsed.wallets, [{
    currency: 'CNY',
    balance: '88.50',
    granted: '1.50',
    toppedUp: '87.00',
    kind: 'total',
  }])
})

test('DeepSeek balance parser distinguishes unavailable and empty payloads', () => {
  assert.throws(
    () => parseDeepSeekBalance({ is_available: false, balance_infos: [] }),
    (error) => error.code === 'UNAVAILABLE',
  )
  assert.throws(
    () => parseDeepSeekBalance({ is_available: true, balance_infos: [] }),
    (error) => error.code === 'NO_DATA',
  )
})

test('OpenAI costs parser sums official organization buckets and keeps the currency', () => {
  const parsed = parseOpenAICosts({
    object: 'page',
    data: [{
      object: 'bucket',
      start_time: 1,
      end_time: 2,
      results: [
        { amount: { value: '1.25', currency: 'usd' } },
        { amount: { value: 2.5, currency: 'usd' } },
      ],
    }],
    has_more: false,
  })
  assert.equal(parsed.amount, 3.75)
  assert.equal(parsed.currency, 'USD')
  assert.equal(parsed.results, 2)
  assert.equal(parsed.truncated, false)

  const empty = parseOpenAICosts({ data: [] })
  assert.equal(empty.amount, 0)
  assert.equal(empty.currency, 'USD')

  assert.throws(
    () => parseOpenAICosts({ object: 'page' }),
    (error) => error.code === 'BAD_JSON',
  )
})

test('session folding keeps every provider for quota and token surfaces', () => {
  const rows = foldSessionEvents('s1', [
    {
      type: 'request/header',
      seq: 1,
      time: 1_000,
      data: { header: { config: { provider: 'deepseek-account', model: 'deepseek-flash' } } },
    },
    {
      type: 'assistant/message',
      seq: 2,
      time: 2_000,
      data: {
        message: { source: { kind: 'model', provider: 'deepseek-account', model: 'deepseek-flash' } },
        usage: { inputTokens: 1_000, outputTokens: 200, cacheReadTokens: 400 },
      },
    },
    {
      type: 'assistant/message',
      seq: 3,
      time: 3_000,
      data: {
        message: { source: { kind: 'model', provider: 'kimi-coding', model: 'kimi-for-coding' } },
        usage: { inputTokens: 9_999, outputTokens: 9_999 },
      },
    },
    {
      type: 'assistant/message',
      seq: 4,
      time: 4_000,
      data: {
        message: { source: { kind: 'model', provider: 'deepseek-official', model: 'deepseek-v4-pro' } },
        stream: [{ type: 'chunk', time: 4_000, chunk: { type: 'usage', usage: { inputTokens: 500, outputTokens: 50, cacheReadTokens: 100 } } }],
      },
    },
  ])

  assert.equal(rows.length, 3)
  assert.deepEqual(rows[0], {
    sessionId: 's1',
    seq: 2,
    time: 2_000,
    provider: 'deepseek-account',
    model: 'deepseek-flash',
    input: 1_000,
    cacheHit: 400,
    cacheMiss: 600,
    output: 200,
    reasoning: 0,
  })
  assert.equal(rows[1].provider, 'kimi-coding')
  assert.equal(rows[1].output, 9_999)
  assert.equal(rows[2].seq, 4)
  assert.equal(rows[2].cacheHit, 100)
  assert.equal(rows[2].cacheMiss, 400)
})

test('usage aggregation covers every provider without pricing it', () => {
  const now = Date.UTC(2026, 10, 9, 4, 0, 0)
  const usage = computeUsage([
    {
      time: now,
      provider: 'openai',
      model: 'gpt-5.6-sol',
      input: 1_000,
      cacheHit: 200,
      cacheMiss: 800,
      output: 300,
      reasoning: 50,
    },
    {
      time: now,
      provider: 'deepseek-account',
      model: 'deepseek-flash',
      input: 500,
      cacheHit: 0,
      cacheMiss: 500,
      output: 100,
      reasoning: 0,
    },
  ], now)
  assert.equal(usage.byProvider.openai.requests, 1)
  assert.equal(usage.byProvider.openai.inputTokens, 1_000)
  assert.equal(usage.byProvider.openai.outputTokens, 300)
  assert.equal(usage.byProvider['deepseek-account'].requests, 1)
})

test('spend uses off-peak CNY prices, doubles at peak, and never prices unknown models', () => {
  const now = Date.UTC(2026, 10, 9, 4, 0, 0) // Beijing 12:00, off-peak.
  assert.equal(startOfTodayShanghai(now), Date.UTC(2026, 10, 8, 16, 0, 0))

  const spend = computeSpend([
    {
      time: Date.UTC(2026, 10, 9, 2, 0, 0), // Beijing 10:00, peak.
      provider: 'deepseek-account',
      model: 'deepseek-flash',
      input: 1_000_000,
      cacheHit: 400_000,
      cacheMiss: 600_000,
      output: 100_000,
    },
    {
      time: now,
      provider: 'deepseek-official',
      model: 'deepseek-flash',
      input: 1_000_000,
      cacheHit: 400_000,
      cacheMiss: 600_000,
      output: 100_000,
    },
    {
      time: now,
      provider: 'deepseek-account',
      model: 'some-future-model',
      input: 1_000,
      cacheHit: 0,
      cacheMiss: 1_000,
      output: 100,
    },
  ], now)

  assert.equal(spend.period.peak, false)
  assert.equal(spend.today.cost, 3.024)
  assert.equal(spend.today.requests, 3)
  assert.equal(spend.today.pricedRequests, 2)
  assert.equal(spend.today.unpricedRequests, 1)
  assert.equal(spend.today.peakRequests, 1)
  assert.equal(spend.today.offPeakRequests, 2)
  assert.equal(spend.bySource.deepseekAccount.cost, 2.016)
  assert.equal(spend.bySource.deepseekKey.cost, 1.008)
  assert.ok(spend.warnings.includes('UNPRICED_MODELS'))
})

test('spend ignores rows from before local midnight and non-DeepSeek providers', () => {
  const now = Date.UTC(2026, 10, 9, 4, 0, 0)
  const spend = computeSpend([
    {
      time: Date.UTC(2026, 10, 8, 15, 59, 0), // Yesterday in Beijing.
      provider: 'deepseek-account',
      model: 'deepseek-flash',
      input: 1_000_000,
      cacheHit: 0,
      cacheMiss: 1_000_000,
      output: 0,
    },
    {
      time: now,
      provider: 'kimi-coding',
      model: 'kimi-for-coding',
      input: 1_000_000,
      cacheHit: 0,
      cacheMiss: 1_000_000,
      output: 0,
    },
  ], now)
  assert.equal(spend.today.requests, 0)
  assert.equal(spend.today.cost, 0)
})

test('active source follows the known provider family and falls back only within DeepSeek', () => {
  const readyKimi = { status: 'ready', windows: [{ remainingPercent: 50 }] }
  const signedOutAccount = { status: 'signed-out', wallets: [] }
  const readyKey = { status: 'ready', wallets: [{ currency: 'CNY', balance: '10.00' }] }

  assert.deepEqual(chooseActiveSource({ provider: 'kimi-coding', model: 'k3' }, {
    kimi: readyKimi,
    deepseekAccount: signedOutAccount,
    deepseekKey: readyKey,
  }), {
    sourceId: 'kimi',
    family: 'kimi',
    mode: 'coding-plan',
    provider: 'kimi-coding',
    model: 'k3',
    fallback: false,
    note: null,
  })

  const deepseek = chooseActiveSource({ provider: 'deepseek-account', model: 'deepseek-flash' }, {
    kimi: readyKimi,
    deepseekAccount: signedOutAccount,
    deepseekKey: readyKey,
  })
  assert.equal(deepseek.sourceId, 'deepseekKey')
  assert.equal(deepseek.fallback, true)
  assert.equal(deepseek.note.code, 'FALLBACK_TO_OTHER_ROUTE')

  const kimiMissing = chooseActiveSource({ provider: 'kimi-coding', model: 'k3' }, {
    kimi: { status: 'unconfigured' },
    deepseekAccount: signedOutAccount,
    deepseekKey: readyKey,
  })
  assert.equal(kimiMissing.sourceId, 'kimi')
  assert.equal(kimiMissing.mode, 'coding-plan')

  const unknown = chooseActiveSource({ provider: 'github', model: 'gpt-5.6-sol' }, {
    kimi: readyKimi,
    deepseekAccount: { status: 'ready', wallets: [{ currency: 'CNY', balance: '1.00' }] },
    deepseekKey: readyKey,
  })
  assert.equal(unknown.sourceId, 'deepseekAccount')
  assert.equal(unknown.fallback, true)
  assert.equal(unknown.note.code, 'UNKNOWN_PROVIDER')

  const openai = chooseActiveSource({ provider: 'openai', model: 'gpt-5.6-sol' }, {
    openai: { id: 'openai', status: 'limited', error: { code: 'OPENAI_ADMIN_KEY_REQUIRED' } },
  })
  assert.equal(openai.sourceId, 'openai')
  assert.equal(openai.mode, 'api')
  assert.equal(openai.fallback, false)
  assert.equal(openai.note, null)
})

test('provider routes map to the right adapter without mixing account and key', () => {
  assert.equal(sourceIdForProvider('deepseek-account'), 'deepseekAccount')
  assert.equal(sourceIdForProvider('deepseek-official'), 'deepseekKey')
  assert.equal(sourceIdForProvider('kimi-coding'), 'kimi')
  assert.equal(sourceIdForProvider('azure-openai'), 'openai')
  assert.equal(sourceIdForProvider('some-new-provider'), null)
})

test('OpenAI default pricing covers short and long context tiers', () => {
  const now = Date.UTC(2026, 10, 9, 4, 0, 0)
  const pricing = normalizeConfig({}).pricing
  const estimates = computeEstimates([
    {
      time: now,
      provider: 'openai',
      model: 'gpt-5.6-sol',
      input: 200_000,
      cacheHit: 0,
      cacheMiss: 200_000,
      output: 100_000,
    },
    {
      time: now,
      provider: 'openai',
      model: 'gpt-5.6-sol',
      input: 300_000,
      cacheHit: 0,
      cacheMiss: 300_000,
      output: 100_000,
    },
  ], now, pricing)

  // Short context: 0.2M * $4 + 0.1M * $20 = $2.8.
  // Long context: 0.3M * $8 + 0.1M * $30 = $5.4.
  assert.equal(estimates.byProvider.openai.currencies.USD.cost, 8.2)
  assert.equal(estimates.byProvider.openai.pricedRequests, 2)
  assert.equal(estimates.byProvider.openai.unpricedRequests, 0)
})

test('config normalization clamps values and ignores malformed price overrides', () => {
  const config = normalizeConfig({
    refreshSeconds: 5,
    kimiKeyRef: 'not a ref!',
    deepseekKeyRef: 'CUSTOM_DEEPSEEK_KEY',
    includeLocalSpend: false,
    pricing: {
      'deepseek-flash': { cacheHit: 0.1, cacheMiss: 2, output: 8 },
      broken: { cacheHit: 'x' },
    },
  })
  assert.equal(config.refreshSeconds, 15)
  assert.equal(config.kimiKeyRef, 'KIMI_CODING_API_KEY')
  assert.equal(config.deepseekKeyRef, 'CUSTOM_DEEPSEEK_KEY')
  assert.equal(config.includeLocalSpend, false)
  assert.deepEqual(config.pricing.deepseek['deepseek-flash'], {
    currency: 'CNY',
    input: 2,
    cachedInput: 0.1,
    output: 8,
    peakMultiplier: 2,
    peakRule: 'deepseek-cn',
    longContextThreshold: null,
    longInput: 2,
    longCachedInput: 0.1,
    longOutput: 8,
  })
  assert.equal(config.pricing.deepseek['deepseek-v4-pro'].input, 4.5)
  assert.equal(config.pricing.openai['gpt-5.6-sol'].input, 4)
  assert.equal(config.pricing.openai['gpt-6-astra'].output, 50)

  const nested = normalizeConfig({
    pricing: {
      openai: {
        'gpt-test': { currency: 'USD', input: 1.25, cachedInput: 0.125, output: 10 },
      },
    },
  })
  assert.equal(nested.pricing.openai['gpt-test'].input, 1.25)
  assert.equal(nested.pricing.openai['gpt-test'].currency, 'USD')
  assert.equal(nested.pricing.deepseek['deepseek-flash'].input, 1)

  assert.equal(normalizeConfig({ refreshSeconds: 99_999 }).refreshSeconds, 3600)
})

test('estimates price each provider in its own currency and skip coding plans', () => {
  const now = Date.UTC(2026, 10, 9, 4, 0, 0) // Beijing 12:00, off-peak.
  const pricing = normalizeConfig({
    pricing: {
      openai: {
        'gpt-test': { currency: 'USD', input: 1.25, cachedInput: 0.125, output: 10 },
      },
    },
  }).pricing

  const estimates = computeEstimates([
    {
      time: now,
      provider: 'deepseek-account',
      model: 'deepseek-flash',
      input: 1_000_000,
      cacheHit: 400_000,
      cacheMiss: 600_000,
      output: 100_000,
    },
    {
      time: now,
      provider: 'openai',
      model: 'gpt-test',
      input: 1_000_000,
      cacheHit: 200_000,
      cacheMiss: 800_000,
      output: 100_000,
    },
    {
      time: now,
      provider: 'kimi-coding',
      model: 'k3',
      input: 1_000_000,
      cacheHit: 0,
      cacheMiss: 1_000_000,
      output: 100_000,
    },
    {
      time: now,
      provider: 'some-new-provider',
      model: 'mystery',
      input: 10,
      cacheHit: 0,
      cacheMiss: 10,
      output: 1,
    },
  ], now, pricing)

  assert.equal(estimates.byProvider['deepseek-account'].currencies.CNY.cost, 1.008)
  assert.equal(estimates.byProvider.openai.currencies.USD.cost, 2.025)
  assert.equal(estimates.bySource.openai.currencies.USD.cost, 2.025)
  assert.equal(estimates.byProvider['kimi-coding'], undefined)
  assert.equal(estimates.byProvider['some-new-provider'].unpricedRequests, 1)
  assert.equal(estimates.total.currencies.CNY.cost, 1.008)
  assert.equal(estimates.total.currencies.USD.cost, 2.025)
  assert.ok(estimates.warnings.includes('UNPRICED_MODELS'))

  const deepseekOnly = computeSpend([
    {
      time: now,
      provider: 'deepseek-account',
      model: 'deepseek-flash',
      input: 1_000_000,
      cacheHit: 400_000,
      cacheMiss: 600_000,
      output: 100_000,
    },
  ], now, pricing)
  assert.equal(deepseekOnly.today.cost, 1.008)
})

test('an added provider is a usage source, never another provider\'s balance', () => {
  const sources = {
    deepseekAccount: { status: 'ready', wallets: [{ currency: 'CNY', balance: '10.00' }] },
    'provider:acme-gateway': {
      id: 'provider:acme-gateway',
      status: 'ready',
      mode: 'usage',
      family: 'generic',
      provider: 'acme-gateway',
      models: [{ id: 'qwen3', name: null, contextWindow: null }],
    },
  }
  const active = chooseActiveSource({ provider: 'acme-gateway', model: 'qwen3' }, sources)
  assert.equal(active.sourceId, 'provider:acme-gateway')
  assert.equal(active.mode, 'usage')
  assert.equal(active.fallback, false)
  assert.equal(active.note.code, 'LOCAL_USAGE_ONLY')

  // A provider declared in settings but not yet registered is not routable.
  const declared = chooseActiveSource({ provider: 'not-active', model: 'm' }, sources, {
    providers: [{ provider: 'not-active', sourceId: null, registered: false, family: null }],
  })
  assert.equal(declared.sourceId, 'deepseekAccount')
  assert.equal(declared.note.code, 'UNKNOWN_PROVIDER')
})

test('a hand-added provider is classified by structured facts, not its name', () => {
  // Settings namespace, then endpoint host, decide the family.
  assert.equal(familyOfProvider('acme-gateway', { settingsNs: 'llm-deepseek' }), 'deepseek')
  assert.equal(familyOfProvider('acme-gateway', { baseURL: 'https://api.deepseek.com/v1' }), 'deepseek')
  assert.equal(familyOfProvider('acme-gateway', { baseURL: 'https://api.kimi.com/coding' }), 'kimi')
  assert.equal(familyOfProvider('acme-gateway', { baseURL: 'https://api.openai.com/v1' }), 'openai')
  // A different endpoint stays generic even with a suggestive name or id.
  assert.equal(familyOfProvider('my-openai-proxy', { baseURL: 'https://gateway.example/v1' }), null)
  assert.equal(familyOfProvider('deepseek-relay', { baseURL: 'https://gateway.example/v1' }), null)
  // Route ids remain exact matches.
  assert.equal(familyOfProvider('deepseek-official', {}), 'deepseek')
  assert.equal(sourceIdForProvider('deepseek-official'), 'deepseekKey')
})

test('a route is not priced as OpenAI merely because its name contains "openai"', () => {
  const now = Date.UTC(2026, 10, 9, 4, 0, 0)
  const pricing = normalizeConfig({}).pricing
  const estimates = computeEstimates([{
    time: now,
    provider: 'my-openai-proxy',
    model: 'gpt-5.6-sol',
    input: 1_000_000,
    cacheHit: 0,
    cacheMiss: 1_000_000,
    output: 100_000,
  }], now, pricing)
  assert.equal(estimates.byProvider['my-openai-proxy'].unpricedRequests, 1)
  assert.equal(estimates.byProvider['my-openai-proxy'].currencies.USD, undefined)

  // A custom route that resolves to the DeepSeek family is grouped into the
  // source that owns it, and its explicit table still wins.
  const grouped = computeEstimates([{
    time: now,
    provider: 'deepseek-relay',
    model: 'deepseek-flash',
    input: 1_000_000,
    cacheHit: 400_000,
    cacheMiss: 600_000,
    output: 100_000,
  }], now, { ...pricing, 'deepseek-relay': pricing.deepseek }, (provider) => (provider === 'deepseek-relay' ? 'deepseekKey' : null))
  assert.equal(grouped.bySource.deepseekKey.currencies.CNY.cost, 1.008)
})

test('local usage keeps a per-model breakdown for added providers', () => {
  const now = Date.UTC(2026, 10, 9, 4, 0, 0)
  const usage = computeUsage([{
    time: now,
    provider: 'acme-gateway',
    model: 'qwen3',
    input: 1_000,
    cacheHit: 200,
    cacheMiss: 800,
    output: 100,
  }, {
    time: now,
    provider: 'acme-gateway',
    model: 'qwen3-max',
    input: 500,
    cacheHit: 0,
    cacheMiss: 500,
    output: 50,
  }], now)
  assert.equal(usage.byProvider['acme-gateway'].requests, 2)
  assert.equal(usage.byProvider['acme-gateway'].models.qwen3.requests, 1)
  assert.equal(usage.byProvider['acme-gateway'].models.qwen3.inputTokens, 1_000)
  assert.equal(usage.byProvider['acme-gateway'].models['qwen3-max'].outputTokens, 50)
})

test('a price document is validated and stays underneath manual prices', () => {
  const document = parsePricingDocument({
    version: 'acme-2026-11',
    updatedAt: '2026-11-01T00:00:00Z',
    pricing: {
      acme: {
        qwen3: { currency: 'USD', input: 1, cachedInput: 0.1, output: 2 },
      },
    },
  })
  assert.equal(document.version, 'acme-2026-11')
  assert.equal(document.pricing.acme.qwen3.input, 1)
  assert.throws(() => parsePricingDocument({ version: 'x' }), /PRICING_INVALID|no usable/)

  const config = normalizeConfig({
    pricingSource: { url: 'https://example.com/prices.json', refreshSeconds: 10 },
    pricing: { acme: { qwen3: { currency: 'USD', input: 9, cachedInput: 9, output: 9 } } },
  })
  assert.equal(config.pricingSource.url, 'https://example.com/prices.json')
  assert.equal(config.pricingSource.refreshSeconds, 300)
  assert.equal(config.pricingOverrides.acme.qwen3.input, 9)
  assert.equal(config.pricing.deepseek['deepseek-flash'].input, 1)
  assert.equal(normalizeConfig({ pricingSource: 'ftp://example.com/p.json' }).pricingSource.url, null)
  assert.equal(normalizeConfig({ pricingUrl: 'https://example.com/p.json' }).pricingSource.url, 'https://example.com/p.json')
})

test('route admission refuses a cross-site browser request', () => {
  assert.equal(requestRejection({ headers: { host: '127.0.0.1:3080', origin: 'https://evil.example' } }), 403)
  assert.equal(requestRejection({ headers: { host: '127.0.0.1:3080', origin: 'null' } }), 403)
  assert.equal(requestRejection({ headers: { 'sec-fetch-site': 'cross-site' } }), 403)
})

test('route admission accepts same-origin and non-browser requests', () => {
  assert.equal(requestRejection({ headers: { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' } }), null)
  assert.equal(requestRejection({ headers: {} }), null)
  assert.equal(requestRejection({}), null)
})

test('route admission defers to a mounted Connection service and fails closed', () => {
  assert.equal(requestRejection({ headers: {} }, { requestRejection: () => 401 }), 401)
  assert.equal(requestRejection({ headers: {} }, { requestRejection: () => undefined }), null)
  assert.equal(requestRejection({ headers: {} }, { requestRejection: () => { throw new Error('boom') } }), 403)
})
