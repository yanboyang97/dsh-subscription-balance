import assert from 'node:assert/strict'
import test from 'node:test'

const payload = {
  ok: true,
  generatedAt: 1_794_202_615_902,
  active: {
    sourceId: 'deepseekAccount',
    family: 'deepseek',
    mode: 'api',
    provider: 'deepseek-account',
    model: 'deepseek-flash',
    fallback: false,
    note: null,
  },
  defaultRoute: { provider: 'deepseek-account', model: 'deepseek-flash' },
  catalog: {
    providers: [
      { provider: 'deepseek-official', displayName: 'DeepSeek', sourceId: 'deepseekKey', supported: true, detailsUrl: 'https://platform.deepseek.com/usage' },
      { provider: 'deepseek-account', displayName: 'DeepSeek Account', sourceId: 'deepseekAccount', supported: true, detailsUrl: 'https://platform.deepseek.com/usage' },
      { provider: 'kimi-coding', displayName: 'Kimi', sourceId: 'kimi', supported: true, detailsUrl: 'https://www.kimi.com/' },
      { provider: 'openai', displayName: 'OpenAI', sourceId: 'openai', supported: true, detailsUrl: 'https://platform.openai.com/usage' },
      {
        provider: 'acme-gateway', displayName: 'Acme Gateway', sourceId: 'provider:acme-gateway',
        supported: false, registered: true, family: null, mode: 'usage', detailsUrl: 'https://gateway.example/',
        models: [{ id: 'qwen3', name: 'Qwen 3', contextWindow: 131072 }],
      },
    ],
    fetchedAt: 1_794_202_615_184,
    error: null,
  },
  sources: {
    kimi: {
      status: 'ready',
      fetchedAt: 1_794_202_615_184,
      attemptedAt: 1_794_202_615_184,
      stale: false,
      error: null,
      plan: null,
      windows: [
        {
          id: 'kimi:limit_5h', key: 'limit_5h', minutes: 300, kind: 'session',
          usedPercent: 48.33, remainingPercent: 51.67, resetAt: '2026-11-09T06:09:54Z',
          limit: 100, used: 48, remaining: 52, source: 'usages',
        },
        {
          id: 'kimi:limit_month_total', key: 'limit_month_total', minutes: null, kind: 'monthly',
          usedPercent: 10.98, remainingPercent: 89.02, resetAt: '2026-11-12T00:00:00Z',
          limit: null, used: null, remaining: null, source: 'usages',
        },
        {
          id: 'kimi:limit_month_code', key: 'limit_month_code', minutes: null, kind: 'monthly',
          usedPercent: 4.92, remainingPercent: 95.08, resetAt: '2026-11-12T00:00:00Z',
          limit: null, used: null, remaining: null, source: 'usages',
        },
      ],
      extras: [],
      warnings: [],
      conflicts: [],
      id: 'kimi',
      family: 'kimi',
      mode: 'coding-plan',
      labelKey: 'source.kimi',
    },
    deepseekAccount: {
      status: 'ready',
      fetchedAt: 1_794_202_615_184,
      attemptedAt: 1_794_202_615_184,
      stale: false,
      error: null,
      wallets: [
        { currency: 'CNY', balance: '10.0000000000000000', kind: 'recharge' },
        { currency: 'CNY', balance: '3.9801772000000000', kind: 'bonus' },
      ],
      estimate: {
        requests: 82,
        inputTokens: 361068,
        cacheHitTokens: 343160,
        cacheMissTokens: 17908,
        outputTokens: 136329,
        reasoningTokens: 0,
        peakRequests: 0,
        offPeakRequests: 82,
        pricedRequests: 82,
        unpricedRequests: 0,
        currencies: { CNY: { cost: 0.570087, requests: 82, inputTokens: 361068, cacheHitTokens: 343160, cacheMissTokens: 17908, outputTokens: 136329, reasoningTokens: 0 } },
      },
      links: { usageUrl: 'https://platform.deepseek.com/usage', topUpUrl: 'https://platform.deepseek.com/top_up' },
      isAvailable: true,
      id: 'deepseekAccount',
      family: 'deepseek',
      mode: 'api',
      labelKey: 'source.deepseekAccount',
    },
    deepseekKey: {
      status: 'ready',
      fetchedAt: 1_794_202_615_184,
      attemptedAt: 1_794_202_615_184,
      stale: false,
      error: null,
      wallets: [{ currency: 'CNY', balance: '117.40', granted: '0.00', toppedUp: '117.40', kind: 'total' }],
      estimate: {
        requests: 106,
        inputTokens: 150556,
        cacheHitTokens: 146013,
        cacheMissTokens: 4543,
        outputTokens: 155794,
        reasoningTokens: 0,
        peakRequests: 106,
        offPeakRequests: 0,
        pricedRequests: 106,
        unpricedRequests: 0,
        currencies: { CNY: { cost: 1.261279, requests: 106, inputTokens: 150556, cacheHitTokens: 146013, cacheMissTokens: 4543, outputTokens: 155794, reasoningTokens: 0 } },
      },
      isAvailable: true,
      links: { usageUrl: 'https://platform.deepseek.com/usage', topUpUrl: 'https://platform.deepseek.com/top_up' },
      id: 'deepseekKey',
      family: 'deepseek',
      mode: 'api',
      labelKey: 'source.deepseekKey',
    },
    openai: {
      status: 'limited',
      exact: false,
      fetchedAt: null,
      attemptedAt: 1_794_202_615_184,
      stale: false,
      error: { code: 'OPENAI_ADMIN_KEY_REQUIRED', detail: 'OPENAI_ADMIN_KEY', status: null },
      detailsUrl: 'https://platform.openai.com/usage',
      costsUrl: 'https://platform.openai.com/costs',
      keyRef: 'OPENAI_API_KEY',
      adminKeyRef: 'OPENAI_ADMIN_KEY',
      keySource: 'file',
      localUsage: { requests: 12, inputTokens: 45000, cacheHitTokens: 1000, cacheMissTokens: 44000, outputTokens: 5000, reasoningTokens: 0 },
      estimate: {
        requests: 12,
        inputTokens: 45000,
        cacheHitTokens: 1000,
        cacheMissTokens: 44000,
        outputTokens: 5000,
        reasoningTokens: 0,
        peakRequests: 12,
        offPeakRequests: 0,
        pricedRequests: 12,
        unpricedRequests: 0,
        currencies: { USD: { cost: 0.225, requests: 12, inputTokens: 45000, cacheHitTokens: 1000, cacheMissTokens: 44000, outputTokens: 5000, reasoningTokens: 0 } },
      },
      id: 'openai',
      family: 'openai',
      mode: 'api',
      labelKey: 'source.openai',
    },
    'provider:acme-gateway': {
      id: 'provider:acme-gateway',
      family: 'generic',
      mode: 'usage',
      label: 'Acme Gateway',
      provider: 'acme-gateway',
      status: 'ready',
      exact: false,
      fetchedAt: 1_794_202_615_184,
      attemptedAt: 1_794_202_615_184,
      stale: false,
      error: null,
      detailsUrl: 'https://gateway.example/',
      baseURL: 'https://gateway.example/v1',
      keyRef: 'ACME_GATEWAY_API_KEY',
      models: [{ id: 'qwen3', name: 'Qwen 3', contextWindow: 131072 }],
      localUsage: {
        requests: 3,
        inputTokens: 1_200,
        cacheHitTokens: 200,
        cacheMissTokens: 1_000,
        outputTokens: 300,
        reasoningTokens: 0,
        models: {
          qwen3: { requests: 3, inputTokens: 1_200, cacheHitTokens: 200, cacheMissTokens: 1_000, outputTokens: 300, reasoningTokens: 0 },
        },
      },
      estimate: null,
    },
  },
  spend: {
    status: 'ready',
    exact: false,
    fetchedAt: 1_794_202_615_184,
    period: { peak: false },
    today: {
      cost: 1.831366, requests: 188, inputTokens: 511624, cacheHitTokens: 489173,
      cacheMissTokens: 22451, outputTokens: 292123, peakRequests: 106,
      offPeakRequests: 82, pricedRequests: 188, unpricedRequests: 0,
    },
    bySource: {
      deepseekAccount: {
        cost: 0.570087, requests: 82, inputTokens: 361068, cacheHitTokens: 343160,
        cacheMissTokens: 17908, outputTokens: 136329, peakRequests: 0,
        offPeakRequests: 82, pricedRequests: 82, unpricedRequests: 0,
      },
      deepseekKey: {
        cost: 1.261279, requests: 106, inputTokens: 150556, cacheHitTokens: 146013,
        cacheMissTokens: 4543, outputTokens: 155794, peakRequests: 106,
        offPeakRequests: 0, pricedRequests: 106, unpricedRequests: 0,
      },
      other: {
        cost: 0, requests: 0, inputTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0,
        outputTokens: 0, peakRequests: 0, offPeakRequests: 0, pricedRequests: 0, unpricedRequests: 0,
      },
    },
    pricing: {
      version: '2026-11-09',
      unit: 'CNY_PER_MILLION_TOKENS',
      offPeak: [
        { model: 'deepseek-flash', cacheHit: 0.02, cacheMiss: 1, output: 4 },
        { model: 'deepseek-v4-pro', cacheHit: 0.15, cacheMiss: 4.5, output: 13.5 },
      ],
      url: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    },
    warnings: ['LOCAL_ONLY', 'NO_HOLIDAYS'],
    scan: { status: 'idle', lastScanAt: 1_794_202_615_902, scannedSessions: 9, errors: 0 },
  },
  meta: {
    version: '1.6.0', refreshSeconds: 60, priceVersion: '2026-11-09',
    pricingUrl: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    usageUrl: 'https://platform.deepseek.com/usage',
    topUpUrl: 'https://platform.deepseek.com/top_up',
    range: 'today', timezone: 'Asia/Shanghai',
    credentials: [
      {
        id: 'kimi-key', sourceId: 'kimi', role: 'primary', ref: 'KIMI_CODING_API_KEY',
        labelKey: 'cred.kimiLabel', requirementKey: 'cred.kimiNeed',
        consoleUrl: 'https://platform.kimi.com/console/api-keys', consoleLabelKey: 'cred.kimiConsole',
        configured: true, source: 'file', writable: true, canConfigure: true,
      },
      {
        id: 'deepseek-key', sourceId: 'deepseekKey', role: 'primary', ref: 'DEEPSEEK_API_KEY',
        labelKey: 'cred.deepseekLabel', requirementKey: 'cred.deepseekNeed',
        consoleUrl: 'https://platform.deepseek.com/api_keys', consoleLabelKey: 'cred.deepseekConsole',
        configured: true, source: 'file', writable: true, canConfigure: true,
      },
      {
        id: 'openai-admin-key', sourceId: 'openai', role: 'admin', ref: 'OPENAI_ADMIN_KEY',
        labelKey: 'cred.openaiAdminLabel', requirementKey: 'cred.openaiAdminNeed',
        consoleUrl: 'https://platform.openai.com/settings/organization/admin-keys',
        consoleLabelKey: 'cred.openaiAdminConsole',
        configured: false, source: null, writable: true, canConfigure: true,
      },
    ],
  },
  estimates: {
    status: 'ready',
    exact: false,
    fetchedAt: 1_794_202_615_184,
    period: { peak: false },
    total: {
      requests: 200, inputTokens: 556624, cacheHitTokens: 490173, cacheMissTokens: 66451,
      outputTokens: 292123, reasoningTokens: 0, peakRequests: 106, offPeakRequests: 94,
      pricedRequests: 200, unpricedRequests: 0,
      currencies: {
        CNY: { cost: 1.831366, requests: 188, inputTokens: 511624, cacheHitTokens: 489173, cacheMissTokens: 22451, outputTokens: 292123, reasoningTokens: 0 },
        USD: { cost: 0.225, requests: 12, inputTokens: 45000, cacheHitTokens: 1000, cacheMissTokens: 44000, outputTokens: 5000, reasoningTokens: 0 },
      },
    },
    byProvider: {
      'deepseek-account': {
        provider: 'deepseek-account', requests: 82, inputTokens: 361068, cacheHitTokens: 343160,
        cacheMissTokens: 17908, outputTokens: 136329, reasoningTokens: 0, peakRequests: 0,
        offPeakRequests: 82, pricedRequests: 82, unpricedRequests: 0,
        currencies: { CNY: { cost: 0.570087, requests: 82, inputTokens: 361068, cacheHitTokens: 343160, cacheMissTokens: 17908, outputTokens: 136329, reasoningTokens: 0 } },
      },
      'deepseek-official': {
        provider: 'deepseek-official', requests: 106, inputTokens: 150556, cacheHitTokens: 146013,
        cacheMissTokens: 4543, outputTokens: 155794, reasoningTokens: 0, peakRequests: 106,
        offPeakRequests: 0, pricedRequests: 106, unpricedRequests: 0,
        currencies: { CNY: { cost: 1.261279, requests: 106, inputTokens: 150556, cacheHitTokens: 146013, cacheMissTokens: 4543, outputTokens: 155794, reasoningTokens: 0 } },
      },
      openai: {
        provider: 'openai', requests: 12, inputTokens: 45000, cacheHitTokens: 1000,
        cacheMissTokens: 44000, outputTokens: 5000, reasoningTokens: 0, peakRequests: 12,
        offPeakRequests: 0, pricedRequests: 12, unpricedRequests: 0,
        currencies: { USD: { cost: 0.225, requests: 12, inputTokens: 45000, cacheHitTokens: 1000, cacheMissTokens: 44000, outputTokens: 5000, reasoningTokens: 0 } },
      },
    },
    bySource: {
      deepseekAccount: {
        requests: 82, inputTokens: 361068, cacheHitTokens: 343160, cacheMissTokens: 17908,
        outputTokens: 136329, reasoningTokens: 0, peakRequests: 0, offPeakRequests: 82,
        pricedRequests: 82, unpricedRequests: 0,
        currencies: { CNY: { cost: 0.570087, requests: 82, inputTokens: 361068, cacheHitTokens: 343160, cacheMissTokens: 17908, outputTokens: 136329, reasoningTokens: 0 } },
      },
      deepseekKey: {
        requests: 106, inputTokens: 150556, cacheHitTokens: 146013, cacheMissTokens: 4543,
        outputTokens: 155794, reasoningTokens: 0, peakRequests: 106, offPeakRequests: 0,
        pricedRequests: 106, unpricedRequests: 0,
        currencies: { CNY: { cost: 1.261279, requests: 106, inputTokens: 150556, cacheHitTokens: 146013, cacheMissTokens: 4543, outputTokens: 155794, reasoningTokens: 0 } },
      },
      openai: {
        requests: 12, inputTokens: 45000, cacheHitTokens: 1000, cacheMissTokens: 44000,
        outputTokens: 5000, reasoningTokens: 0, peakRequests: 12, offPeakRequests: 0,
        pricedRequests: 12, unpricedRequests: 0,
        currencies: { USD: { cost: 0.225, requests: 12, inputTokens: 45000, cacheHitTokens: 1000, cacheMissTokens: 44000, outputTokens: 5000, reasoningTokens: 0 } },
      },
    },
    pricing: {
      version: 'acme-2026-11',
      builtinVersion: '2026-11-09',
      unit: 'PER_MILLION_TOKENS',
      source: {
        url: 'https://prices.example/prices.json',
        refreshSeconds: 86_400,
        status: 'ready',
        version: 'acme-2026-11',
        updatedAt: '2026-11-01T00:00:00Z',
        checkedAt: 1_794_202_615_000,
        fetchedAt: 1_794_202_615_000,
        error: null,
      },
      tables: [
        { provider: 'deepseek', models: [
          { model: 'deepseek-flash', currency: 'CNY', input: 1, cachedInput: 0.02, output: 4, peakMultiplier: 2, peakRule: 'deepseek-cn' },
        ] },
        { provider: 'openai', models: [
          { model: 'gpt-test', currency: 'USD', input: 1.25, cachedInput: 0.125, output: 10, peakMultiplier: 1, peakRule: 'none' },
        ] },
      ],
      url: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    },
    warnings: ['LOCAL_ONLY', 'NO_HOLIDAYS'],
    scan: { status: 'idle', lastScanAt: 1_794_202_615_902, scannedSessions: 9, errors: 0, truncated: false },
  },
}

function flatten(node, out = []) {
  if (node === null || node === undefined || node === false) return out
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node))
    return out
  }
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out)
    return out
  }
  if (typeof node === 'object') {
    if (node.props && node.props.title) out.push(String(node.props.title))
    if (node.props && node.props['aria-label']) out.push(String(node.props['aria-label']))
    if (Array.isArray(node.children)) {
      for (const child of node.children) flatten(child, out)
    }
  }
  return out
}

function parentOf(root, target, parent = null) {
  if (root === null || root === undefined) return null
  if (root === target) return parent
  if (Array.isArray(root)) {
    for (const child of root) {
      const found = parentOf(child, target, parent)
      if (found !== null) return found
    }
    return null
  }
  if (typeof root !== 'object') return null
  for (const child of Array.isArray(root.children) ? root.children : []) {
    const found = parentOf(child, target, root)
    if (found !== null) return found
  }
  return null
}

function findNode(node, predicate) {
  if (node === null || node === undefined) return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNode(child, predicate)
      if (found !== null) return found
    }
    return null
  }
  if (typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of Array.isArray(node.children) ? node.children : []) {
    const found = findNode(child, predicate)
    if (found !== null) return found
  }
  return null
}

test('browser half renders the sidebar chip, popover, and settings page without a DOM', async () => {
  const registrations = []
  const cleanups = []
  const dictionaries = {}
  let activeLocale = 'zh'

  const fakeReact = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) {
      const merged = { ...(props || {}) }
      if (children.length > 0) merged.children = children
      if (typeof type === 'function') return type(merged)
      return { type, props: merged, children }
    },
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
    useEffect(effect) {
      const cleanup = effect()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    },
    useSyncExternalStore(_subscribe, getSnapshot) {
      return getSnapshot()
    },
  }

  const fakeDocument = {
    visibilityState: 'visible',
    head: { append() {} },
    createElement() {
      return { setAttribute() {}, textContent: '', remove() {} }
    },
    addEventListener() {},
    removeEventListener() {},
  }

  globalThis.window = {
    __ModuleLoader__: {
      load(definition) {
        globalThis.__subscriptionBalanceModule = definition.factory((name) => {
          if (name === 'react') return fakeReact
          throw new Error(`unexpected require ${name}`)
        })
      },
    },
  }
  globalThis.document = fakeDocument
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

  await import('../client.js')
  const module = globalThis.__subscriptionBalanceModule
  assert.ok(module !== undefined)

  const ctx = {
    effect(callback) {
      const cleanup = callback()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
      return cleanup
    },
    on() {
      return () => {}
    },
    get(name) {
      if (name !== 'sessions') return undefined
      return {
        binding() {
          return {
            session: {
              projections: {
                faceOf() {
                  return {
                    getSnapshot() {
                      return { next: { provider: 'kimi-coding', model: 'k3' } }
                    },
                    subscribe() {
                      return () => {}
                    },
                  }
                },
              },
            },
          }
        },
      }
    },
    locale: {
      register(_ns, locale, dict) {
        dictionaries[locale] = dict
        return () => {}
      },
      bind() {
        return (key) => dictionaries[activeLocale]?.[key] ?? key
      },
      getSnapshot() {
        return { active: activeLocale }
      },
    },
    slots: {
      inject(key, callback) {
        const registration = callback()
        registrations.push({ key, registration })
        return () => {}
      },
      register(options, component) {
        return { options, component }
      },
    },
  }

  module.apply(ctx)
  await new Promise((resolve) => setTimeout(resolve, 30))

  const chip = registrations.find((entry) => entry.key === 'sidebar.footer.action')
  const overlay = registrations.find((entry) => entry.key === 'shell.overlay')
  const settings = registrations.find((entry) => entry.key === 'settings.section')
  const conversation = registrations.find((entry) => entry.key === 'conversation.composer.dock')
  const settingsIcon = registrations.find((entry) => entry.key === 'settings.section.icon')
  assert.ok(chip && overlay && settings && conversation && settingsIcon)

  const chipTree = chip.registration.component({ wide: true })
  const chipText = flatten(chipTree).join(' ')
  assert.match(chipText, /13\.98/)
  const button = findNode(chipTree, (node) => node.type === 'button' && typeof node.props?.onClick === 'function')
  assert.ok(button !== null)
  button.props.onClick()

  const overlayTree = overlay.registration.component({})
  const overlayText = flatten(overlayTree).join(' ')
  assert.match(overlayText, /订阅余额/)
  assert.match(overlayText, /当前对话/)
  assert.match(overlayText, /已检测到的 API 与订阅/)

  // The close control is a labelled corner button, not a bare × beside refresh.
  const closeButton = findNode(overlayTree, (node) => node?.props?.className === 'dsb-close')
  assert.ok(closeButton !== null)
  assert.equal(closeButton.props['aria-label'], '关闭')
  assert.equal(closeButton.props.title, '关闭详情面板')
  let ancestor = parentOf(overlayTree, closeButton)
  while (ancestor !== null) {
    assert.ok(!String(ancestor.props?.className || '').includes('dsb-actions'))
    ancestor = parentOf(overlayTree, ancestor)
  }
  const refreshButton = findNode(overlayTree, (node) => String(node?.props?.className || '').includes('dsb-btn-primary'))
  assert.ok(refreshButton !== null)
  assert.match(String(parentOf(overlayTree, refreshButton)?.props?.className || ''), /dsb-actions/)

  const settingsTree = settings.registration.component({ close() {} })
  const settingsText = flatten(settingsTree).join(' ')
  assert.match(settingsText, /Kimi Code/)
  assert.match(settingsText, /DeepSeek 账户/)
  assert.match(settingsText, /DeepSeek API Key/)
  assert.match(settingsText, /OpenAI API/)
  assert.match(settingsText, /尚未接入余额适配器|已接入适配器/)
  assert.match(settingsText, /本机花费估算/)
  assert.match(settingsText, /已配置的价格表/)
  assert.match(settingsText, /Acme Gateway/)
  assert.match(settingsText, /无余额接口，仅本机用量/)
  assert.match(settingsText, /价格表/)
  assert.match(settingsText, /检查更新/)
  assert.match(settingsText, /prices\.example/)
  assert.match(settingsText, /价格配置/)
  assert.match(settingsText, /价格源 URL/)
  assert.match(settingsText, /手动价格/)

  // A missing credential is an entry, not only a sentence: the OpenAI card
  // exposes the admin-key form and its console link.
  assert.match(settingsText, /OPENAI_ADMIN_KEY/)
  assert.match(settingsText, /未配置/)
  assert.match(settingsText, /配置密钥/)
  assert.match(settingsText, /创建 OpenAI 管理密钥/)
  const adminInput = findNode(settingsTree, (node) => node?.props?.id === 'dsb-cred-openai-admin-key')
  assert.ok(adminInput !== null)
  assert.equal(adminInput.props.type, 'password')
  assert.equal(adminInput.props.autoComplete, 'new-password')
  assert.equal(adminInput.props.value, '')
  const adminKeysLink = findNode(settingsTree, (node) => node?.props?.href === 'https://platform.openai.com/settings/organization/admin-keys')
  assert.ok(adminKeysLink !== null)

  for (const locale of ['en', 'zh']) {
    for (const key of [
      'cred.kimiLabel', 'cred.kimiNeed', 'cred.kimiConsole',
      'cred.deepseekLabel', 'cred.deepseekNeed', 'cred.deepseekConsole',
      'cred.openaiAdminLabel', 'cred.openaiAdminNeed', 'cred.openaiAdminConsole',
      'cred.configure', 'cred.update', 'cred.save', 'cred.storageHint',
      'cred.error.INVALID_CREDENTIAL_VALUE',
    ]) {
      assert.equal(typeof dictionaries[locale][key], 'string', `${locale} is missing ${key}`)
    }
  }

  // Every credential target exposed by the Host gets its own form. Flip all
  // three sources to "missing" and assert the generic cards render entries too.
  const settingsStore = settings.registration.options.inject().store
  assert.ok(settingsStore !== undefined)
  const missing = structuredClone(payload)
  missing.sources.kimi.status = 'unconfigured'
  missing.sources.kimi.error = { code: 'NO_API_KEY', detail: 'KIMI_CODING_API_KEY' }
  missing.sources.deepseekKey.status = 'unconfigured'
  missing.sources.deepseekKey.error = { code: 'NO_API_KEY', detail: 'DEEPSEEK_API_KEY' }
  missing.meta.credentials = missing.meta.credentials.map((target) => ({
    ...target,
    configured: false,
    source: null,
  }))
  settingsStore.update({ payload: missing })
  const missingTree = settings.registration.component({ close() {} })
  for (const id of ['dsb-cred-kimi-key', 'dsb-cred-deepseek-key', 'dsb-cred-openai-admin-key']) {
    assert.ok(findNode(missingTree, (node) => node?.props?.id === id) !== null, `${id} entry is missing`)
  }

  // Configured credentials still offer an update entry, and never expose a value.
  const configured = structuredClone(payload)
  configured.meta.credentials = configured.meta.credentials.map((target) => ({
    ...target,
    configured: true,
    source: 'file',
  }))
  settingsStore.update({ payload: configured })
  const configuredTree = settings.registration.component({ close() {} })
  const configuredText = flatten(configuredTree).join(' ')
  assert.match(configuredText, /已配置/)
  assert.match(configuredText, /更新密钥/)
  assert.doesNotMatch(configuredText, /sk-admin-test/)

  const iconTree = settingsIcon.registration.component({ size: 18, active: true })
  assert.ok(iconTree !== null)

  activeLocale = 'en'
  const englishTree = chip.registration.component({ wide: false })
  assert.match(flatten(englishTree).join(' '), /13\.98/)

  conversation.registration.component({ sessionId: 'session-1' })
  const conversationChip = chip.registration.component({ wide: true })
  assert.match(flatten(conversationChip).join(' '), /51\.7%/)

  // The settings inject face owns the write path; the page must POST only the
  // target id and the value, then replace its payload with the status snapshot.
  const inject = settings.registration.options.inject()
  assert.equal(typeof inject.saveCredential, 'function')
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    const confirmed = structuredClone(payload)
    confirmed.meta.credentials = confirmed.meta.credentials.map((target) => (
      target.id === 'openai-admin-key' ? { ...target, configured: true, source: 'file' } : target
    ))
    return new Response(JSON.stringify(confirmed), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const saved = await inject.saveCredential('openai-admin-key', 'sk-admin-test')
  assert.equal(saved, true)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/dsh-subscription-balance/credentials.json')
  const requestBody = JSON.parse(requests[0].options.body)
  assert.equal(requestBody.target, 'openai-admin-key')
  assert.equal(requestBody.value, 'sk-admin-test')
  assert.equal(JSON.stringify(settingsStore.getSnapshot().payload).includes('sk-admin-test'), false)

  for (const cleanup of cleanups) cleanup()
  delete globalThis.window
  delete globalThis.document
  globalThis.fetch = originalFetch
})
