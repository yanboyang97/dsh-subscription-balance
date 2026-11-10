import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import http from 'node:http'
import test from 'node:test'

import { apply } from '../index.js'

function startPriceServer(document) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(document))
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({ server, url: `http://127.0.0.1:${address.port}/prices.json` })
    })
  })
}

function call(handler, method = 'GET', body = undefined, headers = undefined) {
  return new Promise((resolve, reject) => {
    let status = 200
    let responseBody = ''
    const res = {
      writeHead(code) {
        status = code
      },
      end(text) {
        try {
          resolve({ status, body: JSON.parse(text) })
        } catch (cause) {
          reject(cause)
        }
      },
    }
    const req = new EventEmitter()
    req.method = method
    if (headers !== undefined) req.headers = headers
    if (body !== undefined) {
      process.nextTick(() => {
        req.emit('data', Buffer.from(JSON.stringify(body)))
        req.emit('end')
      })
    }
    try {
      handler(req, res)
    } catch (cause) {
      reject(cause)
    }
  })
}

test('the Host reads an added provider and a remote price source end to end', async () => {
  const { server, url } = await startPriceServer({
    version: 'remote-1',
    updatedAt: '2026-11-01T00:00:00Z',
    pricing: {
      'acme-gateway': {
        qwen3: { currency: 'USD', input: 1, cachedInput: 0.1, output: 2 },
      },
    },
  })

  const routes = new Map()
  const ctx = {
    effect(callback) {
      const cleanup = callback()
      return typeof cleanup === 'function' ? cleanup : () => {}
    },
    on() {
      return () => {}
    },
    get(name) {
      if (name === 'llm') {
        return {
          listProviders: () => [{ id: 'acme-gateway', name: 'Acme Gateway' }],
          listConfigurableProviders: () => [{
            provider: 'acme-gateway',
            displayName: 'Acme Gateway',
            settingsNs: 'llm-pi-ai',
            settingsPath: ['providers', 'acme-gateway'],
            declared: true,
          }],
          listModels: async () => [{ id: 'qwen3', name: 'Qwen 3' }],
        }
      }
      if (name === 'settings') {
        return {
          describe: async () => [{
            ns: 'llm-pi-ai',
            value: {
              providers: {
                'acme-gateway': {
                  displayName: 'Acme Gateway',
                  baseURL: 'https://gateway.example/v1',
                  apiKeyEnv: 'ACME_GATEWAY_API_KEY',
                  models: [{ id: 'qwen3', name: 'Qwen 3' }],
                },
              },
            },
          }],
        }
      }
      return undefined
    },
    webServer: {
      register(route) {
        routes.set(route.path, route)
        return () => {}
      },
    },
  }

  try {
    apply(ctx, {
      includeLocalSpend: false,
      pricingSource: { url, refreshSeconds: 300 },
      pricing: {
        'acme-gateway': {
          qwen3: { currency: 'USD', input: 9, cachedInput: 0.9, output: 9 },
        },
      },
    })

    const status = await call(routes.get('/dsh-subscription-balance/status.json').handler)
    assert.equal(status.status, 200)
    const payload = status.body

    const entry = payload.catalog.providers.find((provider) => provider.provider === 'acme-gateway')
    assert.ok(entry !== undefined)
    assert.equal(entry.sourceId, 'provider:acme-gateway')
    assert.equal(entry.registered, true)
    assert.equal(entry.supported, false)
    assert.equal(entry.models[0].id, 'qwen3')
    assert.equal(entry.detailsUrl, 'https://gateway.example/')

    const source = payload.sources['provider:acme-gateway']
    assert.ok(source !== undefined)
    assert.equal(source.mode, 'usage')
    assert.equal(source.status, 'ready')
    assert.equal(source.models[0].id, 'qwen3')

    assert.equal(payload.meta.priceSource.status, 'ready')
    assert.equal(payload.meta.priceSource.version, 'remote-1')
    const table = payload.estimates.pricing.tables.find((candidate) => candidate.provider === 'acme-gateway')
    assert.ok(table !== undefined)
    // Manual pricing wins over the remote document, which wins over the built-in.
    assert.equal(table.models.find((row) => row.model === 'qwen3').input, 9)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }

  // A failed check keeps the last successful document and reports why.
  const refresh = await call(routes.get('/dsh-subscription-balance/pricing/refresh.json').handler, 'POST')
  assert.equal(refresh.status, 200)
  assert.equal(refresh.body.meta.priceSource.status, 'stale')
  assert.equal(typeof refresh.body.meta.priceSource.error.code, 'string')
})

test('the Host writes pricing configuration through the profile config editor', async () => {
  const fiber = {}
  let stored = { refreshSeconds: 60 }
  const entry = {
    options: { id: 'subscription-balance', name: 'dsh-subscription-balance', config: stored },
    fiber,
  }
  const routes = new Map()
  const ctx = {
    fiber,
    effect(callback) {
      callback()
      return () => {}
    },
    on() {
      return () => {}
    },
    get(name) {
      if (name === 'configEditor') {
        return {
          documentPath: 'C:\\profile\\cordis.patch.yml',
          entries: () => [entry],
          edit: async (target, change) => {
            assert.equal(target, entry)
            stored = change(stored, {})
            entry.options.config = stored
          },
        }
      }
      if (name === 'llm') {
        return {
          listProviders: () => [],
          listConfigurableProviders: () => [],
          listModels: async () => [],
        }
      }
      return undefined
    },
    webServer: {
      register(route) {
        routes.set(route.path, route)
        return () => {}
      },
    },
  }

  apply(ctx, { includeLocalSpend: false })
  const status = await call(routes.get('/dsh-subscription-balance/status.json').handler)
  assert.equal(status.body.meta.configWritable, true)
  assert.equal(status.body.meta.configPath, 'C:\\profile\\cordis.patch.yml')

  const saved = await call(routes.get('/dsh-subscription-balance/config.json').handler, 'POST', {
    pricingSource: { url: 'https://prices.example/p.json', refreshSeconds: 900 },
    pricing: { acme: { qwen3: { currency: 'USD', input: 1, cachedInput: 0.1, output: 2 } } },
  })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.ok, true)
  // Unrelated fields survive; only the pricing knobs are replaced.
  assert.equal(stored.refreshSeconds, 60)
  assert.equal(stored.pricingSource.url, 'https://prices.example/p.json')
  assert.equal(stored.pricingSource.refreshSeconds, 900)
  assert.equal(stored.pricing.acme.qwen3.input, 1)

  const cleared = await call(routes.get('/dsh-subscription-balance/config.json').handler, 'POST', {
    pricingSource: {},
    pricing: {},
  })
  assert.equal(cleared.status, 200)
  assert.equal(Object.prototype.hasOwnProperty.call(stored, 'pricingSource'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(stored, 'pricing'), false)
  assert.equal(stored.refreshSeconds, 60)
})

test('the Host configures a credential target through the credential store', async () => {
  const routes = new Map()
  const stored = new Map()
  const credentials = {
    describe: async (ref) => stored.has(ref)
      ? { configured: true, source: 'file', writable: true }
      : { configured: false, writable: true },
    resolve: async (ref) => stored.has(ref)
      ? { value: stored.get(ref), source: 'file' }
      : undefined,
    set: async (ref, value) => {
      stored.set(ref, value)
    },
    unset: async (ref) => {
      stored.delete(ref)
    },
  }
  const ctx = {
    effect(callback) {
      callback()
      return () => {}
    },
    on() {
      return () => {}
    },
    get(name) {
      if (name === 'credentials') return credentials
      if (name === 'llm') {
        return {
          listProviders: () => [],
          listConfigurableProviders: () => [],
          listModels: async () => [],
        }
      }
      return undefined
    },
    webServer: {
      register(route) {
        routes.set(route.path, route)
        return () => {}
      },
    },
  }

  apply(ctx, { includeLocalSpend: false })
  const route = routes.get('/dsh-subscription-balance/credentials.json')
  assert.ok(route !== undefined)

  const before = await call(routes.get('/dsh-subscription-balance/status.json').handler)
  const target = before.body.meta.credentials.find((candidate) => candidate.id === 'openai-admin-key')
  assert.ok(target !== undefined)
  assert.equal(target.configured, false)
  assert.equal(target.writable, true)
  assert.equal(target.canConfigure, true)
  assert.equal(target.consoleUrl, 'https://platform.openai.com/settings/organization/admin-keys')

  // The route is registered on the bare Web carrier, which owns no Origin
  // policy: the fallback admission check must refuse a cross-site write.
  const crossSite = await call(
    route.handler,
    'POST',
    { target: 'openai-admin-key', value: 'sk-admin-test' },
    { host: '127.0.0.1:3080', origin: 'https://evil.example' },
  )
  assert.equal(crossSite.status, 403)
  assert.equal(crossSite.body.error.code, 'ORIGIN_REJECTED')
  assert.equal(stored.has('OPENAI_ADMIN_KEY'), false)

  // No provider endpoint is reachable in this test; an error source is fine.
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'invalid key' } }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  })
  try {
    const invalid = await call(route.handler, 'POST', { target: 'openai-admin-key', value: 'bad key' })
    assert.equal(invalid.status, 400)
    assert.equal(invalid.body.error.code, 'INVALID_CREDENTIAL_VALUE')
    assert.equal(stored.has('OPENAI_ADMIN_KEY'), false)

    const unknown = await call(route.handler, 'POST', { target: 'not-a-target', value: 'sk-test' })
    assert.equal(unknown.status, 404)
    assert.equal(unknown.body.error.code, 'UNKNOWN_CONFIG_TARGET')

    const saved = await call(route.handler, 'POST', { target: 'openai-admin-key', value: '  sk-admin-test  ' })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.ok, true)
    assert.equal(stored.get('OPENAI_ADMIN_KEY'), 'sk-admin-test')
    const savedTarget = saved.body.meta.credentials.find((candidate) => candidate.id === 'openai-admin-key')
    assert.equal(savedTarget.configured, true)
    assert.equal(savedTarget.source, 'file')
    // The route never echoes the secret back in the snapshot.
    assert.equal(JSON.stringify(saved.body).includes('sk-admin-test'), false)

    const removed = await call(route.handler, 'POST', { target: 'openai-admin-key', action: 'unset' })
    assert.equal(removed.status, 200)
    assert.equal(stored.has('OPENAI_ADMIN_KEY'), false)
    const removedTarget = removed.body.meta.credentials.find((candidate) => candidate.id === 'openai-admin-key')
    assert.equal(removedTarget.configured, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('credential configuration fails closed when the credential store is absent', async () => {
  const routes = new Map()
  const ctx = {
    effect(callback) {
      callback()
      return () => {}
    },
    on() {
      return () => {}
    },
    get(name) {
      if (name === 'llm') {
        return {
          listProviders: () => [],
          listConfigurableProviders: () => [],
          listModels: async () => [],
        }
      }
      return undefined
    },
    webServer: {
      register(route) {
        routes.set(route.path, route)
        return () => {}
      },
    },
  }

  apply(ctx, { includeLocalSpend: false })
  const refused = await call(routes.get('/dsh-subscription-balance/credentials.json').handler, 'POST', {
    target: 'kimi-key',
    value: 'sk-test',
  })
  assert.equal(refused.status, 503)
  assert.equal(refused.body.error.code, 'NO_CREDENTIALS_SERVICE')

  const status = await call(routes.get('/dsh-subscription-balance/status.json').handler)
  const target = status.body.meta.credentials.find((candidate) => candidate.id === 'kimi-key')
  assert.equal(target.configured, false)
  assert.equal(target.canConfigure, false)
  assert.equal(target.writable, false)
})


