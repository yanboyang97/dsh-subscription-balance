import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  SOURCE_ADAPTER_IDS,
  configurationTargets,
  normalizeConfig,
  normalizeCredentialValue,
} from '../index.js'

const targets = configurationTargets({})
const hostSource = await readFile(new URL('../index.js', import.meta.url), 'utf8')
const clientSource = await readFile(new URL('../client.js', import.meta.url), 'utf8')

test('every credential-reading source exposes a configuration target', () => {
  for (const id of SOURCE_ADAPTER_IDS) {
    // The account source is a sign-in, not a key; it has no credential target.
    if (id === 'deepseekAccount') continue
    assert.ok(
      targets.some((target) => target.sourceId === id),
      `${id} reads a credential but has no configuration target; add it to CREDENTIAL_TARGETS`,
    )
  }
  assert.deepEqual(SOURCE_ADAPTER_IDS, ['kimi', 'deepseekAccount', 'deepseekKey', 'openai'])
})

test('every target is actionable without another lookup', () => {
  const seen = new Set()
  for (const target of targets) {
    assert.equal(typeof target.id, 'string')
    assert.ok(target.id !== '')
    assert.equal(seen.has(target.id), false, `duplicate configuration target ${target.id}`)
    seen.add(target.id)
    assert.match(target.ref, /^[A-Z_][A-Z0-9_]*$/)
    assert.match(target.consoleUrl, /^https:\/\//)
    assert.equal(typeof target.labelKey, 'string')
    assert.equal(typeof target.requirementKey, 'string')
    assert.equal(typeof target.consoleLabelKey, 'string')
    assert.ok(target.labelKey.startsWith('cred.'))
    assert.ok(target.requirementKey.startsWith('cred.'))
    assert.ok(target.consoleLabelKey.startsWith('cred.'))
    assert.ok(target.role === 'primary' || target.role === 'admin')
  }
})

test('every required-credential error maps to a target and a client branch', () => {
  const codes = new Set(
    [...hostSource.matchAll(/'([A-Z0-9]+(?:_[A-Z0-9]+)*_REQUIRED)'/g)].map((match) => match[1]),
  )
  assert.ok(codes.size > 0, 'the host should still declare at least one *_REQUIRED error')
  for (const code of codes) {
    const target = targets.find((candidate) => candidate.errorCode === code)
    assert.ok(target !== undefined, `${code} has no configuration target`)
    assert.ok(
      clientSource.includes(`'${code}'`),
      `${code} is not handled by the client credential predicate`,
    )
  }
  assert.ok(codes.has('OPENAI_ADMIN_KEY_REQUIRED'))
})

test('targets resolve the references actually used by the collectors', () => {
  const defaults = normalizeConfig({})
  const byId = Object.fromEntries(targets.map((target) => [target.id, target]))
  assert.equal(byId['kimi-key'].ref, defaults.kimiKeyRef)
  assert.equal(byId['deepseek-key'].ref, defaults.deepseekKeyRef)
  assert.equal(byId['openai-admin-key'].ref, defaults.openaiAdminKeyRef)

  const custom = configurationTargets({
    kimiKeyRef: 'MY_KIMI_KEY',
    deepseekKeyRef: 'MY_DEEPSEEK_KEY',
    openaiAdminKeyRef: 'MY_OPENAI_ADMIN_KEY',
  })
  assert.equal(custom.find((target) => target.id === 'kimi-key').ref, 'MY_KIMI_KEY')
  assert.equal(custom.find((target) => target.id === 'deepseek-key').ref, 'MY_DEEPSEEK_KEY')
  assert.equal(custom.find((target) => target.id === 'openai-admin-key').ref, 'MY_OPENAI_ADMIN_KEY')

  // A malformed override falls back to the default, and the target follows it.
  const malformed = configurationTargets({ openaiAdminKeyRef: 'not a ref!' })
  assert.equal(
    malformed.find((target) => target.id === 'openai-admin-key').ref,
    'OPENAI_ADMIN_KEY',
  )
})

test('credential writes accept header-safe values and reject everything else', () => {
  assert.equal(normalizeCredentialValue('  sk-admin-test  '), 'sk-admin-test')
  assert.equal(normalizeCredentialValue('sk-proj-abc_123-xyz'), 'sk-proj-abc_123-xyz')

  for (const value of ['', '   ', 'has space', 'line\nbreak', 'snowman ☃', 'tab\there']) {
    assert.throws(
      () => normalizeCredentialValue(value),
      (error) => error.code === 'INVALID_CREDENTIAL_VALUE',
      `expected ${JSON.stringify(value)} to be rejected`,
    )
  }
  assert.throws(() => normalizeCredentialValue(42), (error) => error.code === 'INVALID_CREDENTIAL_VALUE')
  assert.throws(
    () => normalizeCredentialValue('x'.repeat(8193)),
    (error) => error.code === 'INVALID_CREDENTIAL_VALUE',
  )
})
