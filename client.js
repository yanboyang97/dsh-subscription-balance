/**
 * Subscription balance — browser half.
 *
 * One sidebar chip, one popover, and one Settings section share a single store.
 * The Host does all provider I/O; this file never sees an API key or account
 * token, and it never calls a provider directly.
 */
window.__ModuleLoader__.load({
  id: 'dsh-subscription-balance',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'subscription.balance'
    const API = '/dsh-subscription-balance'
    const POLL_MS = 15_000
    const STYLE_ATTR = 'data-dsh-subscription-balance'

    const en = {
      'chip.balance': 'Balance',
      'chip.remaining': '{p} left',
      'chip.today': 'today',
      'chip.click': 'Click for details and refresh',
      'chip.noSource': 'No verifiable balance source',
      'chip.deepseek': 'DeepSeek',
      'chip.deepseekKey': 'DS API',
      'panel.title': 'Subscription balance',
      'panel.subtitle': 'Coding Plan quota and paid API balance',
      'panel.close': 'Close',
      'panel.closeHint': 'Close this detail panel',
      'panel.refresh': 'Refresh now',
      'panel.refreshing': 'Refreshing…',
      'panel.updated': 'Updated {time}',
      'panel.stale': 'Showing last successful reading',
      'panel.active': 'Current',
      'panel.sources': 'All sources',
      'panel.method': 'Data notes',
      'status.loading': 'Loading…',
      'status.ready': 'Connected',
      'status.stale': 'May be stale',
      'status.unconfigured': 'Not configured',
      'status.signedOut': 'Signed out',
      'status.error': 'Unavailable',
      'status.disabled': 'Disabled',
      'status.unsupported': 'No usable source',
      'status.tracked': 'Usage tracked',
      'source.kimi': 'Kimi Code',
      'source.deepseekAccount': 'DeepSeek account',
      'source.deepseekKey': 'DeepSeek API key',
      'source.openai': 'OpenAI API',
      'mode.coding-plan': 'Coding Plan',
      'mode.api': 'Paid API',
      'mode.unsupported': 'Unrecognized',
      'mode.usage': 'Local usage only',
      'display.mode': 'Display',
      'display.conversation': 'Follow current conversation',
      'display.pinned': 'Pinned',
      'display.hint': 'Follows the model selected in the conversation you are viewing. Pin a source if you always want that one.',
      'current.title': 'Current conversation',
      'current.model': '{provider} / {model}',
      'current.none': 'This conversation has no model selection yet. Send one message, or pin a source below.',
      'current.source': 'Current source: {source}',
      'openai.cost': 'Official organization cost today',
      'openai.limited': 'A standard inference key cannot read a balance or organization cost.',
      'openai.admin': 'Official organization cost needs an admin key (OPENAI_ADMIN_KEY); the standard inference key cannot read it. Configure it below, or add pricing.openai for a local estimate.',
      'openai.usage': 'OpenAI usage',
      'openai.costs': 'OpenAI costs',
      'openai.local': 'Local today: {requests} requests / {tokens} tokens',
      'openai.reqUnit': 'req',
      'openai.tokUnit': 'tok',
      'openai.noLocal': 'No OpenAI request has been recorded locally today.',
      'openai.unconfigured': 'OPENAI_ADMIN_KEY is not configured.',
      'catalog.title': 'Detected APIs and subscriptions',
      'catalog.empty': 'No model provider was detected.',
      'catalog.unsupported': 'No balance adapter yet',
      'catalog.usageOnly': 'No balance API — local usage',
      'catalog.models': 'Models',
      'catalog.supported': 'Adapter connected',
      'catalog.provider': 'Provider route: {provider}',
      'catalog.look': 'Open provider console',
      'error.OPENAI_ADMIN_KEY_REQUIRED': 'OPENAI_ADMIN_KEY is required for official OpenAI costs',
      'error.NO_ADAPTER': 'This provider has no balance adapter yet',
      'error.NO_LLM_SERVICE': 'The Host LLM registry is not mounted',
      'status.limited': 'Limited',
      'window.limit_5h': '5-hour quota',
      'window.limit_7d': 'Weekly quota',
      'window.limit_month_total': 'Monthly total',
      'window.limit_month_code': 'Monthly code quota',
      'window.monthly': 'Monthly quota',
      'window.weekly': 'Weekly quota',
      'window.hours': '{n}-hour quota',
      'window.minutes': '{n}-minute quota',
      'window.custom': 'Quota window',
      'window.remaining': '{p} remaining',
      'window.used': '{p} used',
      'window.reset': 'Resets {time}',
      'window.noReset': 'Reset time not reported',
      'window.legacy': 'Legacy response field',
      'window.absolute': '{used} / {limit}',
      'window.interfaceCount': 'Provider count {used} / {limit}',
      'window.absoluteRemaining': '{remaining} left',
      'balance.total': 'Total',
      'balance.recharge': 'Top-up',
      'balance.bonus': 'Bonus',
      'balance.available': 'Balance is usable',
      'balance.unavailable': 'Balance is not usable for API calls',
      'balance.official': 'Official balance',
      'balance.account': 'Account wallet',
      'spend.title': 'Local spend estimate',
      'spend.estimate': 'Estimate',
      'spend.today': 'Today',
      'spend.total': 'Estimated total',
      'spend.byProvider': 'By provider',
      'spend.noPrices': 'No price table is configured for any provider yet. Token counts are still shown.',
      'spend.configHint': 'To estimate a provider, add a row in Price table → Price configuration below, or set pricing.<provider>.<model> in the plugin row.',
      'spend.unpricedShort': 'no price table',
      'spend.codingPlan': 'Coding Plan subscriptions are quota-based and are not included in monetary estimates.',
      'spend.tables': 'Configured price tables',
      'spend.tablesHint': 'Each provider is priced in its own currency; no FX conversion is applied.',
      'spend.openaiNote': 'OpenAI standard tier; requests above 272K input tokens use long-context prices. gpt-5.6-sol promotional pricing is reflected through 2026-11-30. Cache-write premiums and Batch/Flex/Fast/Ultrafast tiers are not modeled.',
      'spend.currencyNote': 'Currencies are kept separate.',
      'spend.requests': '{n} requests',
      'spend.tokens': '{n} tokens',
      'spend.requestsLabel': 'Requests',
      'spend.tokensLabel': 'Tokens',
      'spend.pricedLabel': 'Priced',
      'spend.unpricedLabel': 'Unpriced',
      'spend.peakLabel': 'Peak requests',
      'spend.offPeakLabel': 'Off-peak requests',
      'spend.priceHit': 'hit',
      'spend.priceMiss': 'miss',
      'spend.priceOut': 'output',
      'spend.peak': 'Peak hours',
      'spend.offPeak': 'Off-peak (half price)',
      'spend.scanning': 'Scanning this profile’s local sessions…',
      'spend.disabled': 'Local spend estimate is disabled',
      'spend.unpriced': '{n} requests used a model without a configured price and are not included',
      'spend.localOnly': 'Counts only this profile’s local DSH sessions. Other clients, direct API calls, and Search/Fetch fees are not included.',
      'spend.noHolidays': 'Uses the Beijing weekday peak/off-peak rule; Chinese statutory holiday discounts are not modeled.',
      'spend.incomplete': 'Aborted or failed requests may lack a final usage record, so the estimate can be low.',
      'spend.noSessionQuery': 'The Host session query service is not mounted; local spend cannot be read.',
      'spend.scanErrors': 'Some local session logs could not be read; the estimate may be low.',
      'spend.truncated': 'Only the newest part of this profile’s session corpus was scanned; the estimate may be low.',
      'spend.price': 'Price table {version} (CNY per 1M tokens, off-peak; peak ×2)',
      'spend.priceLink': 'Open official pricing',
      'pricing.title': 'Price table',
      'pricing.version': 'Version {version}',
      'pricing.builtin': 'Built-in table {version}',
      'pricing.updatedAt': 'Price source updated {time}',
      'pricing.checkedAt': 'Last checked {time}',
      'pricing.never': 'The price source has not been checked yet.',
      'pricing.unconfigured': 'No remote price source is configured, so this plugin cannot check for price changes by itself.',
      'pricing.why': 'Official pricing pages are HTML and expose no stable machine-readable endpoint. Scraping them would silently produce wrong money, so only a reviewable JSON table is applied.',
      'pricing.how': 'Set the URL below (or pricingSource.url in the plugin row) to a JSON file shaped like {"version":"…","pricing":{provider:{model:{currency,input,cachedInput,output}}}}. Manual pricing entries always win.',
      'pricing.ready': 'Remote price table {version} is in use.',
      'pricing.stale': 'The last check failed; the previous price table is still in use.',
      'pricing.error': 'The price source could not be read.',
      'pricing.check': 'Check for updates',
      'pricing.checking': 'Checking…',
      'pricing.manualNote': 'Manual pricing.<provider>.<model> entries override built-in and remote prices.',
      'pricing.sourceUrl': 'Source: {url}',
      'config.summary': 'Price configuration (URL & manual prices)',
      'config.url': 'Price source URL',
      'config.refreshSeconds': 'Check interval (seconds, 300–604800)',
      'config.rows': 'Manual prices — they win over the built-in and remote tables',
      'config.noRows': 'No manual price yet.',
      'config.provider': 'Provider',
      'config.model': 'Model',
      'config.currency': 'Currency',
      'config.input': 'Input',
      'config.cached': 'Cached',
      'config.output': 'Output',
      'config.addRow': 'Add row',
      'config.remove': 'Remove',
      'config.save': 'Save',
      'config.saving': 'Saving…',
      'config.path': 'Saved to {path}',
      'config.readOnly': 'This row cannot be edited from here; edit the profile configuration directly.',
      'config.hint': 'Saving writes pricingSource and pricing into this plugin row and reloads it. Clear a field to remove that setting.',
      'cred.kimiLabel': 'Kimi Code API key',
      'cred.kimiNeed': 'Needed for the Coding Plan quota windows and reset times.',
      'cred.kimiConsole': 'Create a Kimi API key',
      'cred.deepseekLabel': 'DeepSeek API key',
      'cred.deepseekNeed': 'Needed for the official API-key wallet balance.',
      'cred.deepseekConsole': 'Create a DeepSeek API key',
      'cred.openaiAdminLabel': 'OpenAI admin key',
      'cred.openaiAdminNeed': 'Needed for the official organization cost. A standard inference key cannot read it.',
      'cred.openaiAdminConsole': 'Create an OpenAI admin key',
      'cred.configured': 'Configured',
      'cred.missing': 'Not configured',
      'cred.configure': 'Configure key',
      'cred.update': 'Update key',
      'cred.sourceLine': 'Currently supplied by: {source}',
      'cred.source.file': 'the DSH credential store',
      'cred.source.env': 'the launch environment',
      'cred.source.other': 'an environment file',
      'cred.inputLabel': 'New value for {ref}',
      'cred.placeholder': 'Paste {ref}',
      'cred.save': 'Save key',
      'cred.saving': 'Saving…',
      'cred.storageHint': 'Saved write-only in the Host credential store. This page never reads it back, and the plugin configuration never contains it.',
      'cred.readonly': 'This deployment cannot store credentials from the page. Set {ref} in the Host environment instead.',
      'cred.remove': 'Remove saved key',
      'cred.removeHint': 'Removing the stored value reveals the environment fallback, if any.',
      'cred.error.INVALID_CREDENTIAL_VALUE': 'The key must be non-empty printable ASCII without spaces or line breaks.',
      'cred.error.UNKNOWN_CONFIG_TARGET': 'This configuration target is no longer defined by the plugin.',
      'cred.error.NO_CREDENTIALS_SERVICE': 'The Host credential store is not mounted; set the variable in the Host environment instead.',
      'cred.error.CREDENTIAL_WRITE_FAILED': 'The credential store refused the write.',
      'cred.error.CREDENTIAL_SNAPSHOT_FAILED': 'The key was saved, but refreshing the reading failed.',
      'error.NO_PRICING_URL': 'No pricingSource.url is configured',
      'error.PRICING_INVALID': 'The price source has no usable price row',
      'error.CONFIG_SAVE_FAILED': 'The configuration could not be saved',
      'error.CONFIG_TOO_LARGE': 'Too many price rows',
      'error.NO_CONFIG_EDITOR': 'The Host configuration editor is not mounted',
      'error.NO_CONFIG_ENTRY': 'This plugin row cannot be addressed for editing',
      'error.PAYLOAD_TOO_LARGE': 'The configuration is too large',
      'spend.noData': 'No priceable DeepSeek request has been recorded today.',
      'spend.period': 'Now: {period}',
      'warning.kimiConflict': 'The endpoint returned old and new window values that differ in {count} place(s); usages.*.used_ratio was preferred.',
      'warning.kimiRatio': 'Kimi returned a ratio outside 0–100%; it was clamped for display.',
      'warning.localOnly': 'Local estimate only — not a bill.',
      'warning.noHolidays': 'Statutory holiday discounts are not included.',
      'warning.unpriced': 'Some requests have no configured model price.',
      'error.NO_API_KEY': 'Credential {ref} was not found',
      'error.AUTH_FAILED': 'Credential is invalid or expired',
      'error.RATE_LIMITED': 'Rate limited; try again later',
      'error.HTTP_ERROR': 'The provider returned an error',
      'error.NETWORK': 'Cannot reach the provider',
      'error.TIMEOUT': 'The request timed out',
      'error.BAD_JSON': 'The provider returned unreadable data',
      'error.NO_DATA': 'The provider returned no balance or quota data',
      'error.UNAVAILABLE': 'This balance is currently unavailable',
      'error.ACCOUNT_FAILED': 'The account balance query failed',
      'error.NO_ACCOUNT_SERVICE': 'The Host account service is not mounted',
      'error.NO_SESSION_QUERY': 'The Host session query service is not mounted; local spend cannot be estimated',
      'error.HOST_UNREACHABLE': 'Cannot reach the Host',
      'error.METHOD_NOT_ALLOWED': 'Request method is not supported',
      'error.UNKNOWN': 'The query failed',
      'error.SOURCE_UNAVAILABLE': 'This source is currently unavailable',
      'error.FALLBACK_TO_OTHER_ROUTE': 'The preferred route is unavailable; showing the other official route',
      'error.NO_ROUTE': 'No model is selected; showing the connected sources',
      'error.UNKNOWN_PROVIDER': 'The current model has no verifiable balance endpoint; showing connected sources',
      'error.LOCAL_USAGE_ONLY': 'This provider has no balance endpoint; showing its local usage',
      'usage.none': 'No request from this route has been recorded locally today.',
      'usage.noneShort': 'No local requests yet',
      'extra.booster': 'Booster pack',
      'extra.parallel': 'Concurrent limit',
      'time.justNow': 'just now',
      'time.minutes': 'in {n} min',
      'time.hours': 'in {n}h {m}m',
      'time.days': 'in {n} days',
      'time.soon': 'soon',
      'time.never': 'never',
      'method.title': 'Data notes',
      'method.current': 'By default the chip and composer pill follow the model selected in the current conversation. Pin a source in Display to override it.',
      'method.kimi': 'Kimi Code quota comes from the provider’s usage endpoint. Every window it returns is shown; percentages and reset times are never estimated.',
      'method.balance': 'DeepSeek account and API-key balances come from official endpoints and keep the provider’s original wallet amounts. The two routes are never mixed.',
      'method.spend': 'Every API provider with a configured price table gets a local estimate. A provider without one shows token counts only. DeepSeek prices include peak/off-peak; Coding Plans are quota-based and are not priced.',
      'method.pricing': 'A remote JSON price source can be checked from the Price table card on this page. Official pricing pages are HTML, so the plugin never scrapes them; manual pricing entries always win.',
      'method.refresh': 'The sidebar chip or Refresh now re-queries immediately. A failed refresh keeps the last successful reading and marks it stale.',
      'method.secret': 'API keys are written only through the Host credential store. This page never reads a value back, and the plugin configuration never contains a key.',
      'settings.title': 'Subscription balance',
      'settings.subtitle': 'See remaining Coding Plan quota, or a paid API’s official balance and local spend estimate.',
      'settings.refresh': 'Refresh',
      'settings.active': 'Current model source',
      'settings.allSources': 'All sources',
      'settings.noPayload': 'No data has been read yet.',
      'settings.sourceHelp': 'The DeepSeek account balance comes from the signed-in account; credential-based sources can be configured in their cards below.',
      'settings.accountSignIn': 'Sign in from Settings → Account to read the official wallet balance.',
      'settings.linkUsage': 'Open official usage',
      'settings.linkTopUp': 'Top up',
      'settings.loading': 'Reading…',
      'settings.lastUpdated': 'Last update: {time}',
      'settings.autoRefresh': 'Automatic refresh: every {seconds}s',
      'settings.badgeExact': 'Official',
      'settings.badgeEstimate': 'Estimate',
      'settings.badgeProvider': 'Provider',
      'settings.activeFallback': 'Fallback',
      'kimi.level': 'Plan level: {level}',
      'kimi.conflictCount': 'Old/new window values differ in {count} place(s)',
      'kimi.plan': 'Plan',
      'kimi.windowCount': '{count} quota windows',
      'kimi.noWindows': 'The endpoint returned no quota window',
      'panel.openSettingsHint': 'Open the gear at the sidebar foot → Subscription balance to configure keys, all sources, and price tables.',
    }

    const zh = {
      'chip.balance': '余额',
      'chip.remaining': '剩 {p}',
      'chip.today': '今日',
      'chip.click': '点击查看详情与刷新',
      'chip.noSource': '没有可验证的余额来源',
      'chip.deepseek': 'DeepSeek',
      'chip.deepseekKey': 'DS API',
      'panel.title': '订阅余额',
      'panel.subtitle': 'Coding Plan 剩余额度与付费 API 余额',
      'panel.close': '关闭',
      'panel.closeHint': '关闭详情面板',
      'panel.refresh': '立即刷新',
      'panel.refreshing': '刷新中…',
      'panel.updated': '更新于 {time}',
      'panel.stale': '正在显示上次成功读取的数据',
      'panel.active': '当前',
      'panel.sources': '全部数据源',
      'panel.method': '数据口径',
      'status.loading': '加载中…',
      'status.ready': '已连接',
      'status.stale': '可能已过期',
      'status.unconfigured': '未配置',
      'status.signedOut': '未登录',
      'status.error': '查询失败',
      'status.disabled': '已停用',
      'status.unsupported': '无可用来源',
      'status.tracked': '仅统计用量',
      'source.kimi': 'Kimi Code',
      'source.deepseekAccount': 'DeepSeek 账户',
      'source.deepseekKey': 'DeepSeek API Key',
      'source.openai': 'OpenAI API',
      'mode.coding-plan': 'Coding Plan',
      'mode.api': '付费 API',
      'mode.unsupported': '未识别',
      'mode.usage': '仅本机用量',
      'display.mode': '显示',
      'display.conversation': '跟随当前对话',
      'display.pinned': '已固定',
      'display.hint': '跟随你正在查看的对话所选的模型。想固定看某一家时，在下面选择该来源。',
      'current.title': '当前对话',
      'current.model': '{provider} / {model}',
      'current.none': '当前对话还没有选择模型。发送一条消息，或在下面固定一个来源。',
      'current.source': '当前来源：{source}',
      'openai.cost': '今日官方组织成本',
      'openai.limited': '普通推理 Key 无法读取余额或组织成本。',
      'openai.admin': '官方组织成本需要管理密钥（OPENAI_ADMIN_KEY）；普通推理 Key 无法读取。可在下方配置，或配置 pricing.openai 做本机估算。',
      'openai.usage': 'OpenAI 用量页',
      'openai.costs': 'OpenAI 成本页',
      'openai.local': '本机今日：{requests} 次请求 / {tokens} tokens',
      'openai.reqUnit': '次',
      'openai.tokUnit': 'tok',
      'openai.noLocal': '今天还没有记录到 OpenAI 请求。',
      'openai.unconfigured': '未配置 OPENAI_ADMIN_KEY。',
      'catalog.title': '已检测到的 API 与订阅',
      'catalog.empty': '没有检测到模型提供商。',
      'catalog.unsupported': '尚未接入余额适配器',
      'catalog.usageOnly': '无余额接口，仅本机用量',
      'catalog.models': '模型',
      'catalog.supported': '已接入适配器',
      'catalog.provider': '提供商路由：{provider}',
      'catalog.look': '打开供应商控制台',
      'error.OPENAI_ADMIN_KEY_REQUIRED': '查询 OpenAI 官方成本需要 OPENAI_ADMIN_KEY',
      'error.NO_ADAPTER': '该提供商尚未接入余额适配器',
      'error.NO_LLM_SERVICE': '宿主没有 LLM 注册表服务',
      'status.limited': '受限',
      'window.limit_5h': '5 小时额度',
      'window.limit_7d': '每周额度',
      'window.limit_month_total': '月度总额',
      'window.limit_month_code': '月度代码额度',
      'window.monthly': '月度额度',
      'window.weekly': '每周额度',
      'window.hours': '{n} 小时额度',
      'window.minutes': '{n} 分钟额度',
      'window.custom': '额度窗口',
      'window.remaining': '剩余 {p}',
      'window.used': '已用 {p}',
      'window.reset': '{time} 重置',
      'window.noReset': '未提供重置时间',
      'window.legacy': '旧版接口字段',
      'window.absolute': '{used} / {limit}',
      'window.interfaceCount': '接口计数 {used} / {limit}',
      'window.absoluteRemaining': '剩余 {remaining}',
      'balance.total': '总余额',
      'balance.recharge': '充值',
      'balance.bonus': '赠送',
      'balance.available': '余额可用于 API 调用',
      'balance.unavailable': '余额当前不可用于 API 调用',
      'balance.official': '官方余额',
      'balance.account': '账户钱包',
      'spend.title': '本机花费估算',
      'spend.estimate': '估算',
      'spend.today': '今日',
      'spend.total': '估算合计',
      'spend.byProvider': '按提供商',
      'spend.noPrices': '还没有配置任何价格表。仍会显示 token 用量。',
      'spend.configHint': '要估算某个提供商，请在下方「价格表 → 价格配置」添加一行，或在该插件行里设置 pricing.<provider>.<model>。',
      'spend.unpricedShort': '未配置价格',
      'spend.codingPlan': 'Coding Plan 是按额度订阅，不计入金额估算。',
      'spend.tables': '已配置的价格表',
      'spend.tablesHint': '各提供商按自己的币种计价，不做汇率换算。',
      'spend.openaiNote': 'OpenAI 标准档；输入超过 272K tokens 时使用长上下文价格。gpt-5.6-sol 的促销价反映到 2026-11-30。未建模缓存写入溢价及 Batch/Flex/Fast/Ultrafast 档位。',
      'spend.currencyNote': '不同币种分开显示。',
      'spend.requests': '{n} 次请求',
      'spend.tokens': '{n} tokens',
      'spend.requestsLabel': '请求',
      'spend.tokensLabel': 'Tokens',
      'spend.pricedLabel': '已计价',
      'spend.unpricedLabel': '未计价',
      'spend.peakLabel': '高峰请求',
      'spend.offPeakLabel': '空闲请求',
      'spend.priceHit': '命中',
      'spend.priceMiss': '未命中',
      'spend.priceOut': '输出',
      'spend.peak': '高峰时段',
      'spend.offPeak': '空闲时段（半价）',
      'spend.scanning': '正在补扫本机会话历史…',
      'spend.disabled': '本机花费估算已关闭',
      'spend.unpriced': '有 {n} 次请求使用了未配置价格的模型，未计入金额',
      'spend.localOnly': '仅统计当前 profile 的本机 DSH 会话；其他客户端、直接 API 调用、Search/Fetch 费用不计入。',
      'spend.noHolidays': '按北京时间工作日高峰/空闲规则计算，未扣除中国法定节假日优惠。',
      'spend.incomplete': '中断或失败的请求可能没有最终 usage，估算值可能偏低。',
      'spend.noSessionQuery': '宿主没有会话查询服务，无法读取本机花费。',
      'spend.scanErrors': '部分本机会话日志无法读取，估算值可能偏低。',
      'spend.truncated': '只扫描了本机会话中最新的一部分，估算值可能偏低。',
      'spend.price': '价目表 {version}（每百万 tokens，空闲价；高峰 ×2）',
      'spend.priceLink': '查看官方价目表',
      'pricing.title': '价格表',
      'pricing.version': '版本 {version}',
      'pricing.builtin': '内置价目表 {version}',
      'pricing.updatedAt': '价格源更新于 {time}',
      'pricing.checkedAt': '最近检查 {time}',
      'pricing.never': '还没有检查过价格源。',
      'pricing.unconfigured': '没有配置远程价格源，插件无法自行检查价格变化。',
      'pricing.why': '官方价格页是 HTML，没有稳定的机器可读接口；直接抓取改版后会静默算错钱，所以这里只应用可审查的 JSON 价格表。',
      'pricing.how': '在下方填写（或在该插件行里设置 pricingSource.url）一个 JSON 文件，形如 {"version":"…","pricing":{provider:{model:{currency,input,cachedInput,output}}}}。手动 pricing 配置始终优先。',
      'pricing.ready': '正在使用远程价格表 {version}。',
      'pricing.stale': '最近一次检查失败，仍在使用上一次成功的价格表。',
      'pricing.error': '价格源读取失败。',
      'pricing.check': '检查更新',
      'pricing.checking': '检查中…',
      'pricing.manualNote': '手动配置的 pricing.<provider>.<model> 会覆盖内置与远程价格。',
      'pricing.sourceUrl': '来源：{url}',
      'config.summary': '价格配置（URL 与手动价格）',
      'config.url': '价格源 URL',
      'config.refreshSeconds': '检查间隔（秒，300–604800）',
      'config.rows': '手动价格——优先于内置与远程价格表',
      'config.noRows': '还没有手动价格。',
      'config.provider': '供应商',
      'config.model': '模型',
      'config.currency': '币种',
      'config.input': '输入',
      'config.cached': '缓存',
      'config.output': '输出',
      'config.addRow': '添加一行',
      'config.remove': '移除',
      'config.save': '保存',
      'config.saving': '保存中…',
      'config.path': '保存到 {path}',
      'config.readOnly': '无法从这里编辑该插件行；请直接修改 profile 配置。',
      'config.hint': '保存会把 pricingSource 和 pricing 写入该插件行并重新加载；清空字段表示删除对应配置。',
      'cred.kimiLabel': 'Kimi Code API Key',
      'cred.kimiNeed': '用于读取 Coding Plan 的额度窗口与重置时间。',
      'cred.kimiConsole': '创建 Kimi API Key',
      'cred.deepseekLabel': 'DeepSeek API Key',
      'cred.deepseekNeed': '用于读取官方 API Key 钱包余额。',
      'cred.deepseekConsole': '创建 DeepSeek API Key',
      'cred.openaiAdminLabel': 'OpenAI 管理密钥',
      'cred.openaiAdminNeed': '用于读取官方组织成本；普通推理 Key 无法读取该数据。',
      'cred.openaiAdminConsole': '创建 OpenAI 管理密钥',
      'cred.configured': '已配置',
      'cred.missing': '未配置',
      'cred.configure': '配置密钥',
      'cred.update': '更新密钥',
      'cred.sourceLine': '当前来源：{source}',
      'cred.source.file': 'DSH 凭据存储',
      'cred.source.env': '启动环境变量',
      'cred.source.other': '环境变量文件',
      'cred.inputLabel': '{ref} 的新值',
      'cred.placeholder': '粘贴 {ref}',
      'cred.save': '保存密钥',
      'cred.saving': '保存中…',
      'cred.storageHint': '只写入宿主凭据存储；页面不会读回密钥，插件配置也不会保存密钥。',
      'cred.readonly': '当前部署无法从页面保存凭据；请在宿主环境中设置 {ref}。',
      'cred.remove': '移除已保存密钥',
      'cred.removeHint': '移除后若环境变量里还有值，会回退使用环境变量。',
      'cred.error.INVALID_CREDENTIAL_VALUE': '密钥必须是非空的可打印 ASCII 字符，不能包含空格或换行。',
      'cred.error.UNKNOWN_CONFIG_TARGET': '插件已不再定义这个配置目标。',
      'cred.error.NO_CREDENTIALS_SERVICE': '宿主没有挂载凭据存储；请在宿主环境中设置该变量。',
      'cred.error.CREDENTIAL_WRITE_FAILED': '凭据存储拒绝写入。',
      'cred.error.CREDENTIAL_SNAPSHOT_FAILED': '密钥已保存，但刷新读取结果失败。',
      'error.NO_PRICING_URL': '未配置 pricingSource.url',
      'error.PRICING_INVALID': '价格源没有可用的价格行',
      'error.CONFIG_SAVE_FAILED': '配置保存失败',
      'error.CONFIG_TOO_LARGE': '价格行过多',
      'error.NO_CONFIG_EDITOR': '宿主没有挂载配置编辑器',
      'error.NO_CONFIG_ENTRY': '无法定位该插件行进行编辑',
      'error.PAYLOAD_TOO_LARGE': '配置内容过大',
      'spend.noData': '今天还没有可计价的 DeepSeek 请求。',
      'spend.period': '当前：{period}',
      'warning.kimiConflict': '接口同时返回了新旧窗口值，相差 {count} 处；已优先使用 usages.*.used_ratio。',
      'warning.kimiRatio': 'Kimi 返回了超出 0–100% 的比例，已截断显示。',
      'warning.localOnly': '这是本机估算，不是账单。',
      'warning.noHolidays': '未包含法定节假日优惠。',
      'warning.unpriced': '有请求没有对应的模型价格。',
      'error.NO_API_KEY': '未找到凭证 {ref}',
      'error.AUTH_FAILED': '凭证无效或已过期',
      'error.RATE_LIMITED': '请求过于频繁，请稍后再试',
      'error.HTTP_ERROR': '服务返回错误',
      'error.NETWORK': '无法连接服务',
      'error.TIMEOUT': '请求超时',
      'error.BAD_JSON': '服务返回了无法解析的数据',
      'error.NO_DATA': '服务未返回余额或额度数据',
      'error.UNAVAILABLE': '余额当前不可用',
      'error.ACCOUNT_FAILED': '账户余额查询失败',
      'error.NO_ACCOUNT_SERVICE': '宿主没有账户服务',
      'error.NO_SESSION_QUERY': '宿主没有会话查询服务，无法估算本机花费',
      'error.HOST_UNREACHABLE': '无法连接宿主',
      'error.METHOD_NOT_ALLOWED': '请求方法不支持',
      'error.UNKNOWN': '查询失败',
      'error.SOURCE_UNAVAILABLE': '当前来源不可用',
      'error.FALLBACK_TO_OTHER_ROUTE': '首选来源不可用，已回退到另一条官方路线',
      'error.NO_ROUTE': '尚未选择模型；显示已接入的数据源',
      'error.UNKNOWN_PROVIDER': '当前模型没有可验证的余额接口；显示已接入的数据源',
      'error.LOCAL_USAGE_ONLY': '该供应商没有余额接口；显示它的本机用量',
      'usage.none': '今天本机还没有这个供应商的请求记录。',
      'usage.noneShort': '本机暂无请求',
      'extra.booster': '加量包剩余',
      'extra.parallel': '并发上限',
      'time.justNow': '刚刚',
      'time.minutes': '{n} 分钟后',
      'time.hours': '{n} 小时 {m} 分后',
      'time.days': '{n} 天后',
      'time.soon': '即将重置',
      'time.never': '尚未成功读取',
      'method.title': '数据口径',
      'method.current': '默认跟随当前对话所选的模型；可在“显示”中固定某个来源。',
      'method.kimi': 'Kimi Code 额度来自服务商接口，按接口返回的全部窗口展示；比例和重置时间不做估算。',
      'method.balance': 'DeepSeek 账户与 API Key 余额来自官方接口，保留钱包原始金额；两条路线不会混在一起。',
      'method.spend': '每个配置了价格表的 API 提供商都会得到本机估算；没有价格表的只显示 token 用量。DeepSeek 价格含峰谷规则；Coding Plan 按额度订阅，不计金额。',
      'method.pricing': '可在本页「价格表」检查远程 JSON 价格源。官方价格页是 HTML，插件不会抓取；手动 pricing 配置始终优先。',
      'method.refresh': '点击侧栏徽标或“刷新”会立即重查；失败时保留上次成功数据并标出过期。',
      'method.secret': 'API Key 只通过宿主凭据存储写入；页面不会读回密钥值，插件配置也不会保存密钥。',
      'settings.title': '订阅余额',
      'settings.subtitle': '查看 Coding Plan 的剩余额度，或付费 API 的官方余额与本机花费估算。',
      'settings.refresh': '刷新',
      'settings.active': '当前模型来源',
      'settings.allSources': '全部数据源',
      'settings.noPayload': '尚未读取到数据。',
      'settings.sourceHelp': 'DeepSeek 账户余额来自登录态；需要密钥的数据源可在下方对应卡片中直接配置。',
      'settings.accountSignIn': '请在设置 → 账户中登录，以读取官方钱包余额。',
      'settings.linkUsage': '打开官方用量页',
      'settings.linkTopUp': '充值',
      'settings.loading': '正在读取…',
      'settings.lastUpdated': '上次更新：{time}',
      'settings.autoRefresh': '自动刷新间隔：{seconds} 秒',
      'settings.badgeExact': '官方',
      'settings.badgeEstimate': '估算',
      'settings.badgeProvider': '服务商',
      'settings.activeFallback': '已回退',
      'kimi.level': '套餐等级：{level}',
      'kimi.conflictCount': '新旧窗口值相差 {count} 处',
      'kimi.plan': '套餐',
      'kimi.windowCount': '{count} 个额度窗口',
      'kimi.noWindows': '接口没有返回额度窗口',
      'panel.openSettingsHint': '打开侧栏底部齿轮 →「订阅余额」，可配置密钥、查看全部来源和价格表。',
    }

    const CSS = `
.dsb-root{display:flex;align-items:center;min-width:0;padding:0 2px 2px 4px;flex:0 0 auto}
.dsb-chip{box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;max-width:100%;height:28px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:16px;white-space:nowrap;cursor:pointer;transition:background-color .15s ease-out,color .15s ease-out}
.dsb-chip:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsb-chip:active{background:var(--dsw-alias-bg-layer-2)}
.dsb-chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsb-chip[data-stale=true]{opacity:.72}
.dsb-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
.dsb-dot[data-tone=ok]{background:var(--dsw-alias-state-success-primary)}
.dsb-dot[data-tone=warn]{background:var(--dsw-alias-state-warn-primary)}
.dsb-dot[data-tone=bad]{background:var(--dsw-alias-state-error-primary)}
.dsb-label{color:var(--dsw-alias-label-secondary);max-width:78px;overflow:hidden;text-overflow:ellipsis}
.dsb-value{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}
.dsb-secondary{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:400;font-variant-numeric:tabular-nums;max-width:76px;overflow:hidden;text-overflow:ellipsis}
.dsb-mode{display:inline-flex;align-items:center;gap:7px;margin-top:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsb-select{box-sizing:border-box;max-width:220px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:3px 7px;font:inherit;font-size:12px}
.dsb-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsb-dock{display:inline-flex;align-items:center;gap:6px;min-width:0;padding:1px 2px}
.dsb-dock-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);padding:2px 8px;font:inherit;font-size:11px;line-height:18px;white-space:nowrap;cursor:pointer;max-width:100%}
.dsb-dock-pill:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsb-dock-pill:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsb-dock-label{max-width:80px;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary)}
.dsb-dock-value{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}
.dsb-compact{padding:0 7px;gap:5px}
.dsb-compact .dsb-label,.dsb-compact .dsb-secondary{display:none}
.dsb-page{display:flex;flex-direction:column;gap:16px;max-width:760px;padding:2px 0 28px;color:var(--dsw-alias-label-primary);font-size:13px}
.dsb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dsb-title{margin:0;font-size:17px;font-weight:600;line-height:1.4}
.dsb-subtitle{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.dsb-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsb-btn{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:5px 11px;font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.dsb-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.dsb-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsb-btn:disabled{opacity:.55;cursor:default}
.dsb-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}
.dsb-btn-primary:hover{background:var(--dsw-alias-brand-primary);opacity:.9}
.dsb-panel-heading{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsb-close{flex:none;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:20px;line-height:1;padding:3px 8px;cursor:pointer}
.dsb-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsb-close:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsb-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dsb-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.dsb-card-active{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary) inset}
.dsb-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dsb-card-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;min-width:0}
.dsb-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dsb-big{font-size:26px;line-height:1.15;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.dsb-big small{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);margin-left:6px;letter-spacing:0}
.dsb-muted{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.dsb-small{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5}
.dsb-warn{color:var(--dsw-alias-state-warn-primary);font-size:12px;line-height:1.6}
.dsb-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.6}
.dsb-ok{color:var(--dsw-alias-state-success-primary)}
.dsb-badge{display:inline-flex;align-items:center;border-radius:999px;padding:1px 7px;font-size:10px;line-height:16px;font-weight:600;white-space:nowrap;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}
.dsb-badge[data-tone=ok]{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.dsb-badge[data-tone=warn]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.dsb-badge[data-tone=bad]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.dsb-badge-brand{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.dsb-progress{position:relative;height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin:2px 0}
.dsb-progress>span{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary);transition:width .25s ease-out}
.dsb-progress>span[data-tone=warn]{background:var(--dsw-alias-state-warn-primary)}
.dsb-progress>span[data-tone=bad]{background:var(--dsw-alias-state-error-primary)}
.dsb-window{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);padding:10px 12px;display:flex;flex-direction:column;gap:5px}
.dsb-window:first-child{margin-top:2px}
.dsb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.dsb-kv{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.dsb-kv strong{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}
.dsb-catalog-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsb-catalog-row:last-child{border-bottom:0;padding-bottom:0}
.dsb-catalog-main{display:flex;flex-direction:column;gap:2px;min-width:0;line-height:1.45}
.dsb-details{border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;margin-top:2px}
.dsb-details>summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.dsb-details>summary:hover{color:var(--dsw-alias-label-primary)}
.dsb-cred{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);padding:9px 11px;display:flex;flex-direction:column;gap:5px}
.dsb-cred-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.dsb-cred .dsb-details{border-top:0;padding-top:2px;margin-top:0}
.dsb-cred .dsb-input{max-width:420px}
.dsb-cred-form>summary{width:max-content;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);padding:3px 9px;color:var(--dsw-alias-label-primary)}
.dsb-cred-form>summary:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsb-config{margin-top:2px}
.dsb-field{display:flex;flex-direction:column;gap:4px;margin:8px 0}
.dsb-input{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:4px 7px;font:inherit;font-size:12px}
.dsb-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsb-price-head{display:grid;grid-template-columns:minmax(80px,1.2fr) minmax(80px,1.2fr) 64px 74px 74px 74px auto;gap:6px;color:var(--dsw-alias-label-secondary);margin-top:8px}
.dsb-price-row{display:grid;grid-template-columns:minmax(80px,1.2fr) minmax(80px,1.2fr) 64px 74px 74px 74px auto;gap:6px;align-items:center;margin-top:6px}
@media (max-width:560px){.dsb-price-head{display:none}.dsb-price-row{grid-template-columns:1fr 1fr}.dsb-price-row>.dsb-btn{grid-column:span 2}}
.dsb-link{color:var(--dsw-alias-brand-primary);text-decoration:none;font-size:12px}
.dsb-link:hover{text-decoration:underline}
.dsb-overlay{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:flex-start;padding:16px;box-sizing:border-box;pointer-events:auto}
.dsb-panel{box-sizing:border-box;width:min(430px,calc(100vw - 32px));max-height:min(76vh,720px);overflow:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-overlay);box-shadow:0 18px 48px rgba(0,0,0,.24);padding:16px;display:flex;flex-direction:column;gap:14px}
.dsb-panel .dsb-page{padding:0;gap:14px;max-width:none}
.dsb-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--dsw-alias-border-l1);padding-top:10px}
@media (max-width:560px){.dsb-overlay{padding:10px}.dsb-panel{width:calc(100vw - 20px);max-height:82vh;padding:13px}.dsb-grid{grid-template-columns:1fr}.dsb-big{font-size:23px}}
@media (prefers-reduced-motion:reduce){.dsb-chip,.dsb-progress>span{transition:none}}
`

    function fmt(text, vars) {
      if (typeof text !== 'string') return ''
      return text.replace(/\{(\w+)\}/g, (match, key) => (
        vars !== undefined && Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
      ))
    }

    function tr(t, key, fallback) {
      try {
        const value = t(key)
        if (typeof value === 'string' && value !== key && value !== '') return value
      } catch {
        // Fall back below.
      }
      return fallback !== undefined ? fallback : key
    }

    function humanize(value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/^(LEVEL_|TIME_UNIT_)/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (letter) => letter.toUpperCase())
    }

    function isRecord(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    }

    function centsOf(raw) {
      if (typeof raw !== 'string') return undefined
      const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(raw.trim())
      if (match === null) return undefined
      const intPart = match[2]
      const fraction = match[3] === undefined ? '' : match[3]
      if (intPart === '' && fraction === '') return undefined
      const exponent = match[4] === undefined ? 0 : Number(match[4])
      if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 120) return undefined
      const digits = intPart + fraction
      let magnitude = BigInt(digits === '' ? '0' : digits)
      const shift = exponent - fraction.length + 2
      if (shift >= 0) magnitude *= 10n ** BigInt(shift)
      else magnitude /= 10n ** BigInt(-shift)
      return match[1] === '-' ? -magnitude : magnitude
    }

    function money(cents, currency, locale) {
      const value = Number(cents) / 100
      if (cents > 0n && value < 0.01) {
        try {
          return `<${new Intl.NumberFormat(locale || 'en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0.01)}`
        } catch {
          return `<${currency} 0.01`
        }
      }
      try {
        return new Intl.NumberFormat(locale || 'en', {
          style: 'currency',
          currency,
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      } catch {
        return `${currency} ${value.toFixed(2)}`
      }
    }

    function costText(value, locale, currency = 'CNY') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      if (value === 0) return money(0n, currency, locale)
      const digits = Math.abs(value) < 1 ? 3 : 2
      try {
        const text = new Intl.NumberFormat(locale || 'en', {
          style: 'currency',
          currency,
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(value)
        return `≈${text}`
      } catch {
        return `≈${currency} ${value.toFixed(digits)}`
      }
    }

    function totalsOf(wallets) {
      const totals = new Map()
      for (const wallet of Array.isArray(wallets) ? wallets : []) {
        if (!isRecord(wallet)) continue
        const cents = centsOf(wallet.balance)
        if (cents === undefined) continue
        const currency = typeof wallet.currency === 'string' && wallet.currency !== '' ? wallet.currency : 'CNY'
        const row = totals.get(currency) || { total: 0n, recharge: 0n, bonus: 0n }
        row.total += cents
        if (wallet.kind === 'bonus') row.bonus += cents
        else if (wallet.kind === 'recharge') row.recharge += cents
        else if (wallet.kind === 'total') {
          const topUp = centsOf(wallet.toppedUp)
          const granted = centsOf(wallet.granted)
          if (topUp !== undefined) row.recharge += topUp
          if (granted !== undefined) row.bonus += granted
        }
        totals.set(currency, row)
      }
      return totals
    }

    function currencyOrder(totals) {
      const preferred = ['CNY', 'USD']
      return [...totals.keys()].sort((left, right) => {
        const a = preferred.indexOf(left)
        const b = preferred.indexOf(right)
        return (a === -1 ? preferred.length : a) - (b === -1 ? preferred.length : b)
      })
    }

    function formatNumber(value, locale) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      try {
        return new Intl.NumberFormat(locale || 'en').format(value)
      } catch {
        return String(value)
      }
    }

    function formatDateTime(iso, locale) {
      if (typeof iso !== 'string' || iso === '') return ''
      const time = Date.parse(iso)
      if (!Number.isFinite(time)) return ''
      try {
        return new Intl.DateTimeFormat(locale || 'en', {
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        }).format(new Date(time))
      } catch {
        return new Date(time).toISOString().slice(0, 16).replace('T', ' ')
      }
    }

    function countdown(iso, now, t) {
      if (typeof iso !== 'string' || iso === '') return tr(t, 'window.noReset')
      const target = Date.parse(iso)
      if (!Number.isFinite(target)) return tr(t, 'window.noReset')
      const diff = target - now
      if (diff <= 0) return tr(t, 'time.soon')
      const minutes = Math.ceil(diff / 60_000)
      if (minutes < 60) return fmt(tr(t, 'time.minutes'), { n: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 48) return fmt(tr(t, 'time.hours'), { n: hours, m: minutes % 60 })
      return fmt(tr(t, 'time.days'), { n: Math.floor(hours / 24) })
    }

    function pct(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      if (value > 0 && value < 0.1) return '<0.1%'
      return `${Math.round(value * 10) / 10}%`
    }

    function toneForRemaining(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown'
      if (value <= 10) return 'bad'
      if (value <= 30) return 'warn'
      return 'ok'
    }

    function windowLabel(window, t) {
      const known = {
        limit_5h: 'window.limit_5h',
        limit_7d: 'window.limit_7d',
        limit_month_total: 'window.limit_month_total',
        limit_month_code: 'window.limit_month_code',
      }
      if (window !== null && typeof window === 'object' && known[window.key] !== undefined) {
        return tr(t, known[window.key], humanize(window.key))
      }
      if (window !== null && typeof window === 'object' && typeof window.minutes === 'number' && window.minutes > 0) {
        if (window.minutes === 10_080) return tr(t, 'window.weekly')
        if (window.minutes % 60 === 0 && window.minutes < 10_080) {
          return fmt(tr(t, 'window.hours'), { n: window.minutes / 60 })
        }
        return fmt(tr(t, 'window.minutes'), { n: Math.round(window.minutes) })
      }
      if (window !== null && typeof window === 'object' && window.kind === 'monthly') return tr(t, 'window.monthly')
      if (window !== null && typeof window === 'object' && window.kind === 'weekly') return tr(t, 'window.weekly')
      return tr(t, 'window.custom')
    }

    function errorText(error, t) {
      if (!isRecord(error)) return tr(t, 'error.UNKNOWN')
      const key = `error.${error.code}`
      const base = tr(t, key, tr(t, 'error.UNKNOWN'))
      if (typeof error.detail === 'string' && error.detail !== '') {
        if (error.code === 'NO_API_KEY') return fmt(base, { ref: error.detail })
        return `${base} (${error.detail})`
      }
      if (error.code === 'NO_API_KEY') return fmt(base, { ref: '' })
      return base
    }

    function statusLabel(source, t) {
      if (source === null || source === undefined) return tr(t, 'status.unsupported')
      if (source.status === 'ready' && source.mode === 'usage') return tr(t, 'status.tracked')
      switch (source.status) {
        case 'ready': return tr(t, 'status.ready')
        case 'stale': return tr(t, 'status.stale')
        case 'limited': return tr(t, 'status.limited')
        case 'unconfigured': return tr(t, 'status.unconfigured')
        case 'signed-out': return tr(t, 'status.signedOut')
        case 'disabled': return tr(t, 'status.disabled')
        case 'error': return tr(t, 'status.error')
        default: return tr(t, 'status.unsupported')
      }
    }

    function statusTone(source) {
      if (source === null || source === undefined) return 'unknown'
      if (source.status === 'ready') return 'ok'
      if (source.status === 'stale' || source.status === 'limited') return 'warn'
      if (source.status === 'error') return 'bad'
      return 'unknown'
    }

    function sourceUsable(source) {
      if (!isRecord(source)) return false
      if (source.id === 'openai') return source.status === 'ready' || source.status === 'limited' || source.status === 'stale'
      if (source.status !== 'ready' && source.status !== 'stale') return false
      return (Array.isArray(source.wallets) && source.wallets.length > 0)
        || (Array.isArray(source.windows) && source.windows.length > 0)
    }

    function sourceName(source, t) {
      if (source !== null && source !== undefined && typeof source.labelKey === 'string') {
        return tr(t, source.labelKey, humanize(source.id))
      }
      if (source !== null && source !== undefined && typeof source.label === 'string' && source.label !== '') {
        return source.label
      }
      return tr(t, 'chip.balance')
    }

    function chipName(source, t) {
      if (isRecord(source) && source.id === 'deepseekAccount') return tr(t, 'chip.deepseek')
      if (isRecord(source) && source.id === 'deepseekKey') return tr(t, 'chip.deepseekKey')
      return sourceName(source, t)
    }

    function worstWindow(source) {
      if (!isRecord(source) || !Array.isArray(source.windows)) return null
      let worst = null
      for (const window of source.windows) {
        if (!isRecord(window) || typeof window.remainingPercent !== 'number') continue
        if (worst === null || window.remainingPercent < worst.remainingPercent) worst = window
      }
      return worst
    }

    function primaryBalance(source, locale) {
      const totals = totalsOf(source !== null && source !== undefined ? source.wallets : [])
      for (const currency of currencyOrder(totals)) {
        return { currency, ...totals.get(currency) }
      }
      return null
    }

    const DISPLAY_MODE_KEY = 'dsh-subscription-balance.display-mode'

    function readDisplayMode() {
      try {
        const value = localStorage.getItem(DISPLAY_MODE_KEY)
        if (typeof value === 'string' && value !== '') return value
      } catch {
        // Private mode or a blocked storage partition.
      }
      return 'conversation'
    }

    function writeDisplayMode(mode) {
      try {
        localStorage.setItem(DISPLAY_MODE_KEY, mode)
      } catch {
        // The in-memory mode still applies for this page.
      }
    }

    function sourceIdForProvider(payload, provider) {
      if (typeof provider !== 'string' || provider === '') return null
      const catalog = isRecord(payload) && isRecord(payload.catalog) && Array.isArray(payload.catalog.providers)
        ? payload.catalog.providers
        : []
      const entry = catalog.find((candidate) => isRecord(candidate) && candidate.provider === provider)
      if (entry !== undefined) {
        if (typeof entry.sourceId === 'string' && entry.sourceId !== '') return entry.sourceId
        if (entry.registered === true) return `provider:${provider}`
        return null
      }
      // The catalog is authoritative; route-id equality is only a cold-start
      // fallback, never a substring match.
      if (provider === 'deepseek-account') return 'deepseekAccount'
      if (provider === 'deepseek-official' || provider === 'deepseek') return 'deepseekKey'
      if (provider === 'kimi-coding' || provider === 'kimi') return 'kimi'
      if (provider === 'openai' || provider === 'azure-openai') return 'openai'
      return null
    }

    function resolveDisplay(payload, view) {
      if (!isRecord(payload)) return null
      const sources = isRecord(payload.sources) ? payload.sources : {}
      const mode = view !== null && view !== undefined && typeof view.displayMode === 'string'
        ? view.displayMode
        : 'conversation'
      const conversation = view !== null && view !== undefined && isRecord(view.conversation)
        ? view.conversation
        : null

      if (mode !== 'conversation') {
        const pinned = sources[mode]
        if (isRecord(pinned)) {
          const catalog = isRecord(payload.catalog) && Array.isArray(payload.catalog.providers)
            ? payload.catalog.providers
            : []
          const catalogEntry = catalog.find((entry) => isRecord(entry) && entry.sourceId === mode)
          return {
            active: {
              ...payload.active,
              sourceId: mode,
              provider: typeof pinned.provider === 'string'
                ? pinned.provider
                : catalogEntry && typeof catalogEntry.provider === 'string' ? catalogEntry.provider : payload.active?.provider,
              model: null,
              mode: pinned.mode,
              fallback: false,
              note: null,
            },
            source: pinned,
            sourceId: mode,
            reason: 'pinned',
            pinned: true,
          }
        }
      }

      const provider = conversation !== null && typeof conversation.provider === 'string'
        ? conversation.provider
        : payload.defaultRoute?.provider ?? payload.active?.provider ?? null
      const model = conversation !== null && typeof conversation.model === 'string'
        ? conversation.model
        : payload.defaultRoute?.model ?? payload.active?.model ?? null
      const providerSourceId = sourceIdForProvider(payload, provider)
      if (provider !== null && providerSourceId === null) {
        return {
          active: {
            ...payload.active,
            sourceId: null,
            provider,
            model,
            mode: 'unknown',
            fallback: false,
            note: { code: 'UNKNOWN_PROVIDER' },
          },
          source: null,
          sourceId: null,
          reason: 'conversation',
          pinned: false,
        }
      }
      const sourceId = providerSourceId ?? payload.active?.sourceId ?? null
      const source = sourceId !== null ? sources[sourceId] : null
      return {
        active: {
          ...payload.active,
          sourceId,
          provider,
          model,
          mode: isRecord(source) ? source.mode : payload.active?.mode,
          fallback: false,
          note: isRecord(source) && source.mode === 'usage' ? { code: 'LOCAL_USAGE_ONLY' } : null,
        },
        source: isRecord(source) ? source : null,
        sourceId,
        reason: 'conversation',
        pinned: false,
      }
    }

    function openaiSummary(source, t, locale) {
      const label = chipName(source, t)
      const cost = isRecord(source.officialCost) ? source.officialCost : null
      if (cost !== null && typeof cost.amount === 'number') {
        const currency = typeof cost.currency === 'string' ? cost.currency : 'USD'
        return {
          tone: 'ok',
          label,
          value: costText(cost.amount, locale, currency),
          secondary: null,
          title: `${label}\n${tr(t, 'openai.cost')}: ${costText(cost.amount, locale, currency)}`,
        }
      }
      const estimate = isRecord(source.estimate) ? source.estimate : null
      const estimateCurrenciesList = estimateCurrencies(estimate)
      if (estimateCurrenciesList.length > 0) {
        const first = estimateCurrenciesList[0]
        const more = estimateCurrenciesList.length > 1 ? ' +' : ''
        return {
          tone: 'warn',
          label,
          value: `${costText(first.cost, locale, first.currency)}${more}`,
          secondary: `${formatNumber(estimate.requests, locale)} ${tr(t, 'openai.reqUnit')}`,
          title: `${label}\n${estimateLine(estimate, t, locale)}`,
        }
      }
      const local = isRecord(source.localUsage) ? source.localUsage : null
      if (local !== null && local.requests > 0) {
        return {
          tone: 'warn',
          label,
          value: `${formatNumber(local.requests, locale)} ${tr(t, 'openai.reqUnit')}`,
          secondary: `${formatNumber(local.inputTokens + local.outputTokens, locale)} ${tr(t, 'openai.tokUnit')}`,
          title: `${label}\n${fmt(tr(t, 'openai.local'), {
            requests: formatNumber(local.requests, locale),
            tokens: formatNumber(local.inputTokens + local.outputTokens, locale),
          })}`,
        }
      }
      return {
        tone: 'warn',
        label,
        value: '—',
        secondary: null,
        title: `${label}\n${source.error ? errorText(source.error, t) : tr(t, 'openai.limited')}`,
      }
    }

    function usageSummary(source, t, locale) {
      const label = chipName(source, t)
      const estimate = isRecord(source.estimate) ? source.estimate : null
      const priced = estimateCurrencies(estimate)
      const local = isRecord(source.localUsage) ? source.localUsage : null
      if (priced.length > 0) {
        const first = priced[0]
        return {
          tone: 'warn',
          label,
          value: `${costText(first.cost, locale, first.currency)}${priced.length > 1 ? ' +' : ''}`,
          secondary: estimate !== null ? `${tr(t, 'spend.today')} ${tr(t, 'spend.estimate')}` : null,
          title: `${label}\n${tr(t, 'mode.usage')}\n${estimateLine(estimate, t, locale)}`,
        }
      }
      if (local !== null && local.requests > 0) {
        return {
          tone: 'warn',
          label,
          value: `${formatNumber(local.requests, locale)} ${tr(t, 'openai.reqUnit')}`,
          secondary: `${formatNumber(local.inputTokens + local.outputTokens, locale)} ${tr(t, 'openai.tokUnit')}`,
          title: `${label}\n${tr(t, 'mode.usage')}\n${fmt(tr(t, 'openai.local'), {
            requests: formatNumber(local.requests, locale),
            tokens: formatNumber(local.inputTokens + local.outputTokens, locale),
          })}`,
        }
      }
      return {
        tone: 'unknown',
        label,
        value: '—',
        secondary: null,
        title: `${label} · ${tr(t, 'mode.usage')}`,
      }
    }

    function activeSummary(payload, display, t, locale) {
      if (payload === null || payload === undefined) {
        return { tone: 'unknown', label: tr(t, 'chip.balance'), value: '…', secondary: null, title: tr(t, 'status.loading') }
      }
      const active = display !== null && display !== undefined && isRecord(display.active)
        ? display.active
        : isRecord(payload.active) ? payload.active : null
      const source = display !== null && display !== undefined && isRecord(display.source)
        ? display.source
        : active !== null && isRecord(payload.sources) ? payload.sources[active.sourceId] : null
      if (active === null || source === null || source === undefined) {
        return {
          tone: 'unknown',
          label: tr(t, 'chip.balance'),
          value: '—',
          secondary: null,
          title: tr(t, 'chip.noSource'),
        }
      }
      const label = chipName(source, t)
      if (source.id === 'openai') return openaiSummary(source, t, locale)
      if (active.mode === 'usage' || source.mode === 'usage') return usageSummary(source, t, locale)
      if (!sourceUsable(source)) {
        return {
          tone: source.status === 'stale' ? 'warn' : 'unknown',
          label,
          value: '—',
          secondary: null,
          title: `${label} · ${statusLabel(source, t)}${source.error ? `\n${errorText(source.error, t)}` : ''}`,
        }
      }
      if (active.mode === 'coding-plan') {
        const worst = worstWindow(source)
        if (worst === null) {
          return { tone: 'unknown', label, value: '—', secondary: null, title: `${label}\n${tr(t, 'kimi.noWindows')}` }
        }
        return {
          tone: source.status === 'stale' ? 'warn' : toneForRemaining(worst.remainingPercent),
          label,
          value: fmt(tr(t, 'chip.remaining'), { p: pct(worst.remainingPercent) }),
          secondary: null,
          title: `${label}\n${windowLabel(worst, t)} · ${fmt(tr(t, 'window.remaining'), { p: pct(worst.remainingPercent) })}`,
        }
      }
      const balance = primaryBalance(source, locale)
      if (balance === null) {
        return { tone: 'unknown', label, value: '—', secondary: null, title: `${label} · ${statusLabel(source, t)}` }
      }
      const estimate = isRecord(source.estimate)
        ? source.estimate
        : isRecord(payload.estimates) && isRecord(payload.estimates.bySource) && isRecord(payload.estimates.bySource[active.sourceId])
          ? payload.estimates.bySource[active.sourceId]
          : null
      const priced = estimateCurrencies(estimate)
      const firstPrice = priced.length > 0 ? priced[0] : null
      return {
        tone: source.status === 'stale' ? 'warn' : 'ok',
        label,
        value: money(balance.total, balance.currency, locale),
        secondary: firstPrice !== null
          ? `${tr(t, 'chip.today')} ${costText(firstPrice.cost, locale, firstPrice.currency)}`
          : estimate !== null && estimate.requests > 0
            ? `${formatNumber(estimate.requests, locale)} ${tr(t, 'openai.reqUnit')}`
            : null,
        title: `${label}\n${tr(t, 'balance.total')}: ${money(balance.total, balance.currency, locale)}`,
      }
    }

    function fullTitle(source, t, locale) {
      const lines = []
      if (source !== null && source !== undefined) {
        lines.push(`${sourceName(source, t)} · ${statusLabel(source, t)}`)
        if (source.status === 'stale') lines.push(tr(t, 'panel.stale'))
        if (source.error) lines.push(errorText(source.error, t))
        if (Array.isArray(source.windows)) {
          for (const window of source.windows) {
            lines.push(`${windowLabel(window, t)} · ${fmt(tr(t, 'window.remaining'), { p: pct(window.remainingPercent) })}`)
          }
        }
        const totals = totalsOf(source.wallets)
        for (const currency of currencyOrder(totals)) {
          const row = totals.get(currency)
          lines.push(`${tr(t, 'balance.total')}: ${money(row.total, currency, locale)} (${tr(t, 'balance.recharge')} ${money(row.recharge, currency, locale)} / ${tr(t, 'balance.bonus')} ${money(row.bonus, currency, locale)})`)
        }
        if (source.id === 'kimi' && source.plan && typeof source.plan.level === 'string') {
          lines.push(fmt(tr(t, 'kimi.level'), { level: humanize(source.plan.level) }))
        }
        if (source.id === 'openai') {
          if (isRecord(source.officialCost) && typeof source.officialCost.amount === 'number') {
            lines.push(`${tr(t, 'openai.cost')}: ${costText(
              source.officialCost.amount,
              locale,
              typeof source.officialCost.currency === 'string' ? source.officialCost.currency : 'USD',
            )}`)
          } else {
            lines.push(tr(t, 'openai.limited'))
            lines.push(tr(t, 'openai.admin'))
          }
          if (isRecord(source.localUsage) && source.localUsage.requests > 0) {
            lines.push(fmt(tr(t, 'openai.local'), {
              requests: formatNumber(source.localUsage.requests, locale),
              tokens: formatNumber(source.localUsage.inputTokens + source.localUsage.outputTokens, locale),
            }))
          }
        }
        if (source.mode === 'usage') {
          const local = isRecord(source.localUsage) ? source.localUsage : null
          for (const [model, row] of Object.entries(local !== null && isRecord(local.models) ? local.models : {})) {
            lines.push(`${model} · ${formatNumber(row.requests, locale)} ${tr(t, 'openai.reqUnit')} · ${formatNumber(row.inputTokens + row.outputTokens, locale)} ${tr(t, 'openai.tokUnit')}`)
          }
        }
        if (typeof source.fetchedAt === 'number') {
          lines.push(fmt(tr(t, 'settings.lastUpdated'), {
            time: formatDateTime(new Date(source.fetchedAt).toISOString(), locale),
          }))
        }
        const estimate = estimateLine(source.estimate, t, locale)
        if (estimate !== null) lines.push(estimate)
      }
      lines.push(tr(t, 'chip.click'))
      return lines.join('\n')
    }

    function createStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        getSnapshot: () => state,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        update(patch) {
          state = { ...state, ...patch }
          for (const listener of [...listeners]) listener()
        },
      }
    }

    function useStore(store) {
      return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
    }

    function useNow(interval) {
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), interval)
        return () => clearInterval(timer)
      }, [interval])
      return now
    }

    function StatusBadge({ source, t }) {
      return h('span', { className: 'dsb-badge', 'data-tone': statusTone(source) }, statusLabel(source, t))
    }

    function Progress({ percent, tone }) {
      const width = typeof percent === 'number' && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
      return h('div', { className: 'dsb-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(width) },
        h('span', { style: { width: `${width}%` }, 'data-tone': tone === 'ok' ? undefined : tone }))
    }

    function SourceErrorLine({ source, t }) {
      if (source === null || source === undefined || !source.error) return null
      return h('div', { className: 'dsb-error' }, errorText(source.error, t))
    }

    function SourceNote({ source, t }) {
      if (source === null || source === undefined || source.status !== 'stale') return null
      return h('div', { className: 'dsb-warn' }, tr(t, 'panel.stale'))
    }

    function WalletRows({ source, t, locale }) {
      const totals = totalsOf(source !== null && source !== undefined ? source.wallets : [])
      const currencies = currencyOrder(totals)
      if (currencies.length === 0) return h('div', { className: 'dsb-warn' }, tr(t, 'error.NO_DATA'))
      return h('div', { className: 'dsb-grid' }, currencies.map((currency) => {
        const row = totals.get(currency)
        return h('div', { key: currency, className: 'dsb-window' },
          h('div', { className: 'dsb-row' },
            h('span', { className: 'dsb-muted' }, tr(t, 'balance.total')),
            h('strong', { className: 'dsb-big', style: { fontSize: '20px' } }, money(row.total, currency, locale))),
          h('div', { className: 'dsb-small' },
            `${tr(t, 'balance.recharge')} ${money(row.recharge, currency, locale)} · ${tr(t, 'balance.bonus')} ${money(row.bonus, currency, locale)}`))
      }))
    }

    function KimiWindows({ source, t, locale, now }) {
      if (!isRecord(source) || !Array.isArray(source.windows) || source.windows.length === 0) {
        return h('div', { className: 'dsb-warn' }, tr(t, 'kimi.noWindows'))
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, source.windows.map((window, index) => {
        const tone = toneForRemaining(window.remainingPercent)
        const hasAbsolute = typeof window.limit === 'number' || typeof window.used === 'number' || typeof window.remaining === 'number'
        return h('div', { key: `${window.id || index}`, className: 'dsb-window' },
          h('div', { className: 'dsb-row' },
            h('span', { style: { fontWeight: 600 } }, windowLabel(window, t)),
            h('span', { className: 'dsb-big', style: { fontSize: '20px', color: tone === 'bad' ? 'var(--dsw-alias-state-error-primary)' : tone === 'warn' ? 'var(--dsw-alias-state-warn-primary)' : undefined } }, pct(window.remainingPercent))),
          h('div', { className: 'dsb-row' },
            h('span', { className: 'dsb-small' }, fmt(tr(t, 'window.used'), { p: pct(window.usedPercent) })),
            h('span', { className: 'dsb-small' }, fmt(tr(t, 'window.remaining'), { p: pct(window.remainingPercent) }))),
          h(Progress, { percent: window.usedPercent, tone }),
          h('div', { className: 'dsb-small' },
            countdown(window.resetAt, now, t),
            window.resetAt ? ` · ${formatDateTime(window.resetAt, locale)}` : '',
            hasAbsolute ? ` · ${fmt(tr(t, 'window.interfaceCount'), {
              used: formatNumber(window.used, locale),
              limit: formatNumber(window.limit, locale),
            })}` : '',
            window.source === 'legacy' ? ` · ${tr(t, 'window.legacy')}` : ''))
      }))
    }

    function KimiCard({ source, t, locale, now, active, target, credentialSaving, credentialError, saveCredential, removeCredential }) {
      const conflicts = Array.isArray(source.conflicts) ? source.conflicts : []
      const level = source.plan && typeof source.plan.level === 'string' ? source.plan.level : null
      return h('div', { className: `dsb-card${active ? ' dsb-card-active' : ''}` },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' },
            h('span', null, sourceName(source, t)),
            active ? h('span', { className: 'dsb-badge dsb-badge-brand' }, tr(t, 'panel.active')) : null),
          h('div', { className: 'dsb-actions' },
            h('span', { className: 'dsb-badge' }, tr(t, 'settings.badgeProvider')),
            h(StatusBadge, { source, t }))),
        h(SourceNote, { source, t }),
        source.error && source.error.code === 'NO_API_KEY' && isRecord(target)
          ? null
          : h(SourceErrorLine, { source, t }),
        needsCredential(source, target)
          ? h(CredentialConfig, {
            target,
            saving: credentialSaving,
            error: credentialError,
            onSave: saveCredential,
            onRemove: removeCredential,
            t,
          })
          : null,
        level !== null ? h('div', { className: 'dsb-muted' }, fmt(tr(t, 'kimi.level'), { level: humanize(level) })) : null,
        sourceUsable(source) ? h(React.Fragment, null,
          h('div', { className: 'dsb-small' }, fmt(tr(t, 'kimi.windowCount'), { count: source.windows.length })),
          h(KimiWindows, { source, t, locale, now }),
          Array.isArray(source.extras) && source.extras.length > 0
            ? h('div', { className: 'dsb-grid' }, source.extras.map((extra) => h('div', { key: extra.id, className: 'dsb-kv' },
              h('span', null, tr(t, `extra.${extra.kind}`, humanize(extra.id))),
              h('strong', null, formatNumber(extra.value, locale)))))
            : null,
          conflicts.length > 0 ? h('div', { className: 'dsb-warn' }, fmt(tr(t, 'warning.kimiConflict'), { count: conflicts.length })) : null,
          Array.isArray(source.warnings) && source.warnings.some((warning) => warning.code === 'KIMI_RATIO_OUT_OF_RANGE')
            ? h('div', { className: 'dsb-warn' }, tr(t, 'warning.kimiRatio'))
            : null)
          : null)
    }

    function estimateCurrencies(estimate) {
      if (!isRecord(estimate) || !isRecord(estimate.currencies)) return []
      return Object.entries(estimate.currencies)
        .filter(([, row]) => isRecord(row) && typeof row.cost === 'number')
        .map(([currency, row]) => ({ currency, ...row }))
    }

    function estimateLine(estimate, t, locale) {
      if (!isRecord(estimate) || estimate.requests === 0) return null
      const currencies = estimateCurrencies(estimate)
      if (currencies.length === 0) {
        return `${fmt(tr(t, 'spend.requests'), { n: formatNumber(estimate.requests, locale) })} · ${tr(t, 'spend.unpricedShort')}`
      }
      const costs = currencies.map((row) => costText(row.cost, locale, row.currency)).join(' + ')
      const priced = `${tr(t, 'spend.today')} ${tr(t, 'spend.estimate')}: ${costs}`
      if (estimate.unpricedRequests > 0) {
        return `${priced} · ${fmt(tr(t, 'spend.unpriced'), { n: formatNumber(estimate.unpricedRequests, locale) })}`
      }
      return `${priced} · ${fmt(tr(t, 'spend.requests'), { n: formatNumber(estimate.requests, locale) })}`
    }

    function SpendInline({ estimate, t, locale }) {
      const line = estimateLine(estimate, t, locale)
      return line === null ? null : h('div', { className: 'dsb-small' }, line)
    }

    function credentialFor(payload, sourceId, role) {
      const list = isRecord(payload) && isRecord(payload.meta) && Array.isArray(payload.meta.credentials)
        ? payload.meta.credentials
        : []
      return list.find((entry) => isRecord(entry)
        && entry.sourceId === sourceId
        && (role === undefined || entry.role === role)) || null
    }

    /**
     * A source that says a credential is missing is also a configuration
     * surface. Keep this predicate in step with the Host `configurationTargets`
     * table; a new `*_REQUIRED` error must render `CredentialConfig` too.
     */
    function needsCredential(source, target) {
      if (!isRecord(target) || !isRecord(source)) return false
      if (source.status === 'unconfigured') return true
      const code = isRecord(source.error) ? source.error.code : null
      return code === 'NO_API_KEY' || code === 'AUTH_FAILED' || code === 'OPENAI_ADMIN_KEY_REQUIRED'
    }

    function credentialSourceLabel(source, t) {
      if (source === 'file') return tr(t, 'cred.source.file')
      if (source === 'env' || source === 'environment') return tr(t, 'cred.source.env')
      return tr(t, 'cred.source.other')
    }

    function credentialErrorText(error, t) {
      if (!isRecord(error)) return tr(t, 'error.UNKNOWN')
      const base = tr(t, `cred.error.${error.code}`, tr(t, 'error.UNKNOWN'))
      return typeof error.detail === 'string' && error.detail !== '' ? `${base} (${error.detail})` : base
    }

    function CredentialConfig({ target, saving, error, onSave, onRemove, t }) {
      const [value, setValue] = React.useState('')
      if (!isRecord(target)) return null
      const configured = target.configured === true
      const canConfigure = target.canConfigure !== false && target.writable !== false
      const canRemove = configured && target.source === 'file' && typeof onRemove === 'function'
      const submit = () => {
        if (!canConfigure || saving || typeof onSave !== 'function') return
        const next = value.trim()
        if (next === '') return
        const result = onSave(target.id, next)
        if (result !== null && result !== undefined && typeof result.then === 'function') {
          result.then((ok) => { if (ok === true) setValue('') })
        }
      }
      const remove = () => {
        if (!canRemove || saving) return
        const result = onRemove(target.id)
        if (result !== null && result !== undefined && typeof result.catch === 'function') {
          result.catch(() => {})
        }
      }
      return h('div', { className: 'dsb-cred' },
        h('div', { className: 'dsb-cred-head' },
          h('span', { className: 'dsb-badge', 'data-tone': configured ? 'ok' : 'warn' },
            configured ? tr(t, 'cred.configured') : tr(t, 'cred.missing')),
          h('span', { className: 'dsb-small' },
            `${tr(t, target.labelKey, target.ref)} · ${target.ref}`),
          target.consoleUrl
            ? h('a', {
              className: 'dsb-link',
              href: target.consoleUrl,
              target: '_blank',
              rel: 'noreferrer noopener',
            }, tr(t, target.consoleLabelKey, target.consoleUrl))
            : null),
        h('div', { className: 'dsb-small' }, tr(t, target.requirementKey, '')),
        configured && target.source
          ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'cred.sourceLine'), {
            source: credentialSourceLabel(target.source, t),
          }))
          : null,
        canConfigure
          ? h('details', { className: 'dsb-details dsb-cred-form' },
            h('summary', { className: 'dsb-small' },
              configured ? tr(t, 'cred.update') : tr(t, 'cred.configure')),
            h('div', { className: 'dsb-field' },
              h('label', {
                className: 'dsb-small',
                htmlFor: `dsb-cred-${target.id}`,
              }, fmt(tr(t, 'cred.inputLabel'), { ref: target.ref })),
              h('input', {
                id: `dsb-cred-${target.id}`,
                className: 'dsb-input',
                type: 'password',
                autoComplete: 'new-password',
                spellCheck: false,
                value,
                placeholder: fmt(tr(t, 'cred.placeholder'), { ref: target.ref }),
                onChange: (event) => setValue(event.target.value),
                onKeyDown: (event) => { if (event.key === 'Enter') submit() },
              })),
            h('div', { className: 'dsb-actions' },
              h('button', {
                type: 'button',
                className: 'dsb-btn dsb-btn-primary',
                disabled: saving,
                onClick: submit,
              }, saving ? tr(t, 'cred.saving') : tr(t, 'cred.save')),
              canRemove
                ? h('button', {
                  type: 'button',
                  className: 'dsb-btn',
                  disabled: saving,
                  title: tr(t, 'cred.removeHint'),
                  onClick: remove,
                }, tr(t, 'cred.remove'))
                : null),
            h('div', { className: 'dsb-small' }, tr(t, 'cred.storageHint')),
            error ? h('div', { className: 'dsb-error' }, credentialErrorText(error, t)) : null)
          : h('div', { className: 'dsb-warn' }, fmt(tr(t, 'cred.readonly'), { ref: target.ref })))
    }

    function ApiCard({ source, t, locale, active, target, credentialSaving, credentialError, saveCredential, removeCredential }) {
      const available = source !== null && source.isAvailable === false
      return h('div', { className: `dsb-card${active ? ' dsb-card-active' : ''}` },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' },
            h('span', null, sourceName(source, t)),
            active ? h('span', { className: 'dsb-badge dsb-badge-brand' }, tr(t, 'panel.active')) : null),
          h('div', { className: 'dsb-actions' },
            h('span', { className: 'dsb-badge' }, tr(t, 'settings.badgeExact')),
            h(StatusBadge, { source, t }))),
        h(SourceNote, { source, t }),
        source.error && source.error.code === 'NO_API_KEY' && isRecord(target)
          ? null
          : h(SourceErrorLine, { source, t }),
        needsCredential(source, target)
          ? h(CredentialConfig, {
            target,
            saving: credentialSaving,
            error: credentialError,
            onSave: saveCredential,
            onRemove: removeCredential,
            t,
          })
          : null,
        available ? h('div', { className: 'dsb-warn' }, tr(t, 'balance.unavailable')) : null,
        sourceUsable(source) ? h(WalletRows, { source, t, locale }) : null,
        source !== null && source.status === 'signed-out'
          ? h('div', { className: 'dsb-muted' }, tr(t, 'settings.accountSignIn'))
          : null,
        source !== null && source.status === 'unconfigured' && !isRecord(target)
          ? h('div', { className: 'dsb-muted' }, tr(t, 'settings.sourceHelp'))
          : null,
        h(SpendInline, { estimate: source !== null ? source.estimate : null, t, locale }),
        source !== null && source.links
          ? h('div', { className: 'dsb-actions' },
            h('a', { className: 'dsb-link', href: source.links.usageUrl, target: '_blank', rel: 'noreferrer noopener' }, tr(t, 'settings.linkUsage')),
            h('a', { className: 'dsb-link', href: source.links.topUpUrl, target: '_blank', rel: 'noreferrer noopener' }, tr(t, 'settings.linkTopUp')))
          : null)
    }

    function OpenAICard({ source, t, locale, active, target, credentialSaving, credentialError, saveCredential, removeCredential }) {
      const cost = isRecord(source.officialCost) ? source.officialCost : null
      const local = isRecord(source.localUsage) ? source.localUsage : null
      const expectedLimit = source.error && source.error.code === 'OPENAI_ADMIN_KEY_REQUIRED'
      const tokens = local !== null ? local.inputTokens + local.outputTokens : 0
      return h('div', { className: `dsb-card${active ? ' dsb-card-active' : ''}` },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' },
            h('span', null, sourceName(source, t)),
            active ? h('span', { className: 'dsb-badge dsb-badge-brand' }, tr(t, 'panel.active')) : null),
          h('div', { className: 'dsb-actions' },
            h('span', { className: 'dsb-badge', 'data-tone': cost !== null ? 'ok' : 'warn' }, cost !== null ? tr(t, 'settings.badgeExact') : tr(t, 'spend.estimate')),
            h(StatusBadge, { source, t }))),
        h(SourceNote, { source, t }),
        cost !== null && typeof cost.amount === 'number'
          ? h('div', { className: 'dsb-row' },
            h('span', { className: 'dsb-muted' }, tr(t, 'openai.cost')),
            h('span', { className: 'dsb-big' }, costText(cost.amount, locale, typeof cost.currency === 'string' ? cost.currency : 'USD')))
          : h('div', { className: 'dsb-warn' }, tr(t, 'openai.limited')),
        expectedLimit
          ? isRecord(target) ? null : h('div', { className: 'dsb-muted' }, tr(t, 'openai.admin'))
          : h(SourceErrorLine, { source, t }),
        isRecord(target)
          ? h(CredentialConfig, {
            target,
            saving: credentialSaving,
            error: credentialError,
            onSave: saveCredential,
            onRemove: removeCredential,
            t,
          })
          : null,
        source.status === 'unconfigured' && !isRecord(target)
          ? h('div', { className: 'dsb-muted' }, tr(t, 'openai.unconfigured'))
          : null,
        local !== null && local.requests > 0
          ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'openai.local'), {
            requests: formatNumber(local.requests, locale),
            tokens: formatNumber(tokens, locale),
          }))
          : h('div', { className: 'dsb-small' }, tr(t, 'openai.noLocal')),
        h(SpendInline, { estimate: source.estimate, t, locale }),
        h('div', { className: 'dsb-actions' },
          h('a', { className: 'dsb-link', href: source.detailsUrl || 'https://platform.openai.com/usage', target: '_blank', rel: 'noreferrer noopener' }, tr(t, 'openai.usage')),
          h('a', { className: 'dsb-link', href: source.costsUrl || 'https://platform.openai.com/costs', target: '_blank', rel: 'noreferrer noopener' }, tr(t, 'openai.costs'))))
    }

    function UsageInline({ source, t, locale }) {
      const local = isRecord(source.localUsage) ? source.localUsage : null
      const models = local !== null && isRecord(local.models) ? Object.entries(local.models) : []
      return h(React.Fragment, null,
        local !== null && local.requests > 0
          ? h('div', { className: 'dsb-muted' }, fmt(tr(t, 'openai.local'), {
            requests: formatNumber(local.requests, locale),
            tokens: formatNumber(local.inputTokens + local.outputTokens, locale),
          }))
          : h('div', { className: 'dsb-muted' }, tr(t, 'usage.none')),
        models.length > 0
          ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
            models.map(([model, row]) => h('div', { key: model, className: 'dsb-kv' },
              h('span', { className: 'dsb-small' }, model),
              h('strong', { className: 'dsb-small' }, `${formatNumber(row.requests, locale)} ${tr(t, 'openai.reqUnit')} · ${formatNumber(row.inputTokens + row.outputTokens, locale)} ${tr(t, 'openai.tokUnit')}`))))
          : null,
        h(SpendInline, { estimate: source.estimate, t, locale }))
    }

    function GenericCard({ source, t, locale, active }) {
      const models = Array.isArray(source.models) ? source.models : []
      return h('div', { className: `dsb-card${active ? ' dsb-card-active' : ''}` },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' },
            h('span', null, sourceName(source, t)),
            active ? h('span', { className: 'dsb-badge dsb-badge-brand' }, tr(t, 'panel.active')) : null),
          h('div', { className: 'dsb-actions' },
            h('span', { className: 'dsb-badge', 'data-tone': 'warn' }, tr(t, 'catalog.usageOnly')),
            h(StatusBadge, { source, t }))),
        source.error ? h(SourceErrorLine, { source, t }) : null,
        h('div', { className: 'dsb-small' }, fmt(tr(t, 'catalog.provider'), { provider: source.provider || source.id })),
        models.length > 0
          ? h('div', { className: 'dsb-small' }, `${tr(t, 'catalog.models')}: ${models.slice(0, 6).map((model) => model.id).join(', ')}${models.length > 6 ? ` +${models.length - 6}` : ''}`)
          : null,
        h(UsageInline, { source, t, locale }),
        source.detailsUrl
          ? h('a', { className: 'dsb-link', href: source.detailsUrl, target: '_blank', rel: 'noreferrer noopener' }, tr(t, 'catalog.look'))
          : null)
    }

    function catalogSummary(source, t, locale) {
      if (!isRecord(source)) return ''
      if (source.id === 'openai') {
        if (isRecord(source.officialCost) && typeof source.officialCost.amount === 'number') {
          return costText(source.officialCost.amount, locale, typeof source.officialCost.currency === 'string' ? source.officialCost.currency : 'USD')
        }
        const priced = estimateCurrencies(source.estimate)
        if (priced.length > 0) {
          return `${tr(t, 'spend.estimate')} ${priced.map((row) => costText(row.cost, locale, row.currency)).join(' + ')}`
        }
        if (isRecord(source.localUsage) && source.localUsage.requests > 0) {
          return fmt(tr(t, 'openai.local'), {
            requests: formatNumber(source.localUsage.requests, locale),
            tokens: formatNumber(source.localUsage.inputTokens + source.localUsage.outputTokens, locale),
          })
        }
        return tr(t, 'openai.limited')
      }
      if (source.mode === 'usage') {
        const local = isRecord(source.localUsage) ? source.localUsage : null
        const priced = estimateCurrencies(source.estimate)
        if (priced.length > 0) {
          return `${tr(t, 'spend.estimate')} ${priced.map((row) => costText(row.cost, locale, row.currency)).join(' + ')}`
        }
        if (local !== null && local.requests > 0) {
          return `${formatNumber(local.requests, locale)} ${tr(t, 'openai.reqUnit')} · ${formatNumber(local.inputTokens + local.outputTokens, locale)} ${tr(t, 'openai.tokUnit')}`
        }
        return tr(t, 'usage.noneShort')
      }
      if (source.mode === 'coding-plan') {
        const worst = worstWindow(source)
        return worst === null ? statusLabel(source, t) : `${windowLabel(worst, t)} · ${fmt(tr(t, 'window.remaining'), { p: pct(worst.remainingPercent) })}`
      }
      const balance = primaryBalance(source, locale)
      return balance === null ? statusLabel(source, t) : `${tr(t, 'balance.total')} ${money(balance.total, balance.currency, locale)}`
    }

    function CatalogList({ payload, t, locale }) {
      if (!isRecord(payload) || !isRecord(payload.catalog)) return null
      const providers = Array.isArray(payload.catalog.providers) ? payload.catalog.providers : []
      if (providers.length === 0) {
        return h('div', { className: 'dsb-card' },
          h('div', { className: 'dsb-card-title' }, tr(t, 'catalog.title')),
          h('div', { className: 'dsb-muted' }, tr(t, 'catalog.empty')))
      }
      return h('div', { className: 'dsb-card' },
        h('div', { className: 'dsb-card-title' }, tr(t, 'catalog.title')),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '7px' } }, providers.map((entry, index) => {
          const source = entry.sourceId && isRecord(payload.sources) ? payload.sources[entry.sourceId] : null
          const supported = entry.supported === true
          return h('div', { key: entry.provider || index, className: 'dsb-catalog-row' },
            h('div', { className: 'dsb-catalog-main' },
              h('div', null,
                h('strong', { style: { marginRight: '6px' } }, entry.displayName || entry.provider),
                h('span', { className: 'dsb-small' }, entry.provider),
                Array.isArray(entry.models) && entry.models.length > 0
                  ? h('span', { className: 'dsb-small', style: { marginLeft: '6px' } }, `${tr(t, 'catalog.models')} ${entry.models.length}`)
                  : null),
              h('div', { className: 'dsb-small' }, catalogSummary(source, t, locale))),
            h('span', { className: 'dsb-actions' },
              h('span', { className: 'dsb-badge', 'data-tone': supported ? 'ok' : 'warn' },
                supported ? tr(t, 'catalog.supported') : source !== null && source.mode === 'usage' ? tr(t, 'catalog.usageOnly') : tr(t, 'catalog.unsupported')),
              source ? h(StatusBadge, { source, t }) : null,
              entry.detailsUrl
                ? h('a', { className: 'dsb-link', href: entry.detailsUrl, target: '_blank', rel: 'noreferrer noopener' }, tr(t, 'catalog.look'))
                : null))
        })))
    }

    function providerName(payload, provider) {
      const catalog = isRecord(payload) && isRecord(payload.catalog) && Array.isArray(payload.catalog.providers)
        ? payload.catalog.providers
        : []
      const entry = catalog.find((candidate) => isRecord(candidate) && candidate.provider === provider)
      if (entry !== undefined && typeof entry.displayName === 'string') return entry.displayName
      if (provider === 'deepseek') return 'DeepSeek'
      if (provider === 'openai') return 'OpenAI'
      if (provider === 'kimi') return 'Kimi Code'
      return provider
    }

    function priceNumber(value, locale) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      try {
        return new Intl.NumberFormat(locale || 'en', { maximumFractionDigits: 6 }).format(value)
      } catch {
        return String(value)
      }
    }

    function SpendCard({ payload, estimates, t, locale }) {
      if (!isRecord(estimates)) return null
      const disabled = estimates.status === 'disabled'
      const total = isRecord(estimates.total) ? estimates.total : null
      const currencies = estimateCurrencies(total)
      const providers = isRecord(estimates.byProvider)
        ? Object.values(estimates.byProvider).filter((entry) => isRecord(entry) && entry.requests > 0)
        : []
      const scan = isRecord(estimates.scan) ? estimates.scan : null
      const period = isRecord(estimates.period) ? estimates.period : null
      const warnings = Array.isArray(estimates.warnings) ? estimates.warnings : []
      const pricing = isRecord(estimates.pricing) ? estimates.pricing : null
      const tables = pricing !== null && Array.isArray(pricing.tables) ? pricing.tables : []
      const tableRows = []
      for (const table of tables) {
        if (!Array.isArray(table.models)) continue
        for (const row of table.models) {
          tableRows.push(h('div', {
            key: `${table.provider}:${row.model}`,
            className: 'dsb-small',
            style: { fontVariantNumeric: 'tabular-nums' },
          }, `${providerName(payload, table.provider)} / ${row.model} · ${row.currency} · in ${priceNumber(row.input, locale)} / cached ${priceNumber(row.cachedInput, locale)} / out ${priceNumber(row.output, locale)}${row.peakMultiplier > 1 ? ` · peak ×${priceNumber(row.peakMultiplier, locale)}` : ''}${row.longContextThreshold ? ` · >${priceNumber(row.longContextThreshold, locale)}: ${priceNumber(row.longInput, locale)} / ${priceNumber(row.longCachedInput, locale)} / ${priceNumber(row.longOutput, locale)}` : ''}`))
        }
      }
      const tableCount = tableRows.length
      return h('div', { className: 'dsb-card' },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' }, tr(t, 'spend.title')),
          h('span', { className: 'dsb-badge', 'data-tone': 'warn' }, tr(t, 'spend.estimate'))),
        disabled
          ? h('div', { className: 'dsb-muted' }, tr(t, 'spend.disabled'))
          : h(React.Fragment, null,
            currencies.length > 0
              ? h('div', { className: 'dsb-grid' }, currencies.map((row) => h('div', { key: row.currency, className: 'dsb-window' },
                h('div', { className: 'dsb-row' },
                  h('span', { className: 'dsb-muted' }, tr(t, 'spend.total')),
                  h('strong', { className: 'dsb-big', style: { fontSize: '20px' } }, costText(row.cost, locale, row.currency))),
                h('div', { className: 'dsb-small' }, `${tr(t, 'spend.currencyNote')} ${row.currency}`))))
              : h('div', { className: 'dsb-warn' }, tr(t, 'spend.noPrices')),
            total !== null
              ? h('div', { className: 'dsb-grid' },
                h('div', { className: 'dsb-kv' }, h('span', null, tr(t, 'spend.requestsLabel')), h('strong', null, formatNumber(total.requests, locale))),
                h('div', { className: 'dsb-kv' }, h('span', null, tr(t, 'spend.tokensLabel')), h('strong', null, formatNumber(total.inputTokens + total.outputTokens, locale))),
                h('div', { className: 'dsb-kv' }, h('span', null, tr(t, 'spend.pricedLabel')), h('strong', null, formatNumber(total.pricedRequests, locale))),
                h('div', { className: 'dsb-kv' }, h('span', null, tr(t, 'spend.unpricedLabel')), h('strong', null, formatNumber(total.unpricedRequests, locale))))
              : null,
            total !== null && total.requests === 0 ? h('div', { className: 'dsb-muted' }, tr(t, 'spend.noData')) : null,
            providers.length > 0
              ? h('div', { style: { marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '6px' } },
                h('div', { className: 'dsb-small' }, tr(t, 'spend.byProvider')),
                ...providers.map((provider) => {
                  const priced = estimateCurrencies(provider)
                  return h('div', { key: provider.provider, className: 'dsb-kv' },
                    h('span', { className: 'dsb-small' }, providerName(payload, provider.provider)),
                    h('span', { className: 'dsb-small', style: { textAlign: 'right' } },
                      priced.length > 0
                        ? `${priced.map((row) => costText(row.cost, locale, row.currency)).join(' + ')} · ${fmt(tr(t, 'spend.requests'), { n: formatNumber(provider.requests, locale) })}`
                        : `${formatNumber(provider.inputTokens + provider.outputTokens, locale)} ${tr(t, 'spend.tokensLabel')} · ${tr(t, 'spend.unpricedShort')}`))
                }))
              : null,
            scan !== null && scan.status === 'scanning' ? h('div', { className: 'dsb-muted' }, tr(t, 'spend.scanning')) : null,
            warnings.includes('LOCAL_ONLY') ? h('div', { className: 'dsb-small' }, tr(t, 'spend.localOnly')) : null,
            warnings.includes('NO_HOLIDAYS') && period !== null
              ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'spend.period'), { period: period.peak ? tr(t, 'spend.peak') : tr(t, 'spend.offPeak') }))
              : null,
            warnings.includes('NO_HOLIDAYS') ? h('div', { className: 'dsb-small' }, tr(t, 'spend.noHolidays')) : null,
            h('div', { className: 'dsb-small' }, tr(t, 'spend.incomplete')),
            h('div', { className: 'dsb-small' }, tr(t, 'spend.codingPlan')),
            warnings.includes('NO_SESSION_QUERY') ? h('div', { className: 'dsb-warn' }, tr(t, 'spend.noSessionQuery')) : null,
            warnings.includes('SCAN_ERRORS') ? h('div', { className: 'dsb-warn' }, tr(t, 'spend.scanErrors')) : null,
            warnings.includes('SCAN_TRUNCATED') ? h('div', { className: 'dsb-warn' }, tr(t, 'spend.truncated')) : null,
            warnings.includes('UNPRICED_MODELS') || warnings.includes('NO_PRICES')
              ? h('div', { className: 'dsb-small' }, tr(t, 'spend.configHint'))
              : null,
            tableCount > 0
              ? h('details', { className: 'dsb-details' },
                h('summary', { className: 'dsb-small' }, `${tr(t, 'spend.tables')} (${tableCount})`),
                h('div', { className: 'dsb-small', style: { margin: '6px 0' } }, tr(t, 'spend.tablesHint')),
                tables.some((table) => table.provider === 'openai')
                  ? h('div', { className: 'dsb-small', style: { marginBottom: '6px' } }, tr(t, 'spend.openaiNote'))
                  : null,
                tableRows)
              : h('div', { className: 'dsb-small' }, tr(t, 'spend.tablesHint'))))
    }

    function rowsFromPricing(pricing) {
      const rows = []
      for (const [provider, table] of Object.entries(isRecord(pricing) ? pricing : {})) {
        if (!isRecord(table)) continue
        for (const [model, row] of Object.entries(table)) {
          if (!isRecord(row)) continue
          rows.push({
            provider,
            model,
            currency: typeof row.currency === 'string' ? row.currency : 'CNY',
            input: typeof row.input === 'number' ? String(row.input) : '',
            cachedInput: typeof row.cachedInput === 'number' ? String(row.cachedInput) : '',
            output: typeof row.output === 'number' ? String(row.output) : '',
          })
        }
      }
      return rows
    }

    function pricingFromRows(rows) {
      const pricing = {}
      for (const row of rows) {
        const provider = typeof row.provider === 'string' ? row.provider.trim() : ''
        const model = typeof row.model === 'string' ? row.model.trim() : ''
        if (provider === '' || model === '') continue
        const input = Number(row.input)
        const cachedInput = Number(row.cachedInput)
        const output = Number(row.output)
        if (!Number.isFinite(input) || !Number.isFinite(cachedInput) || !Number.isFinite(output)) continue
        const table = pricing[provider] || {}
        table[model] = {
          currency: typeof row.currency === 'string' && row.currency !== '' ? row.currency.toUpperCase() : 'CNY',
          input,
          cachedInput,
          output,
        }
        pricing[provider] = table
      }
      return pricing
    }

    function PricingEditor({ config, configPath, writable, saving, onSave, onRefresh, refreshing, t }) {
      const source = isRecord(config) && isRecord(config.pricingSource) ? config.pricingSource : {}
      const [url, setUrl] = React.useState(typeof source.url === 'string' ? source.url : '')
      const [seconds, setSeconds] = React.useState(String(typeof source.refreshSeconds === 'number' ? source.refreshSeconds : 86400))
      const [rows, setRows] = React.useState(() => rowsFromPricing(isRecord(config) ? config.pricing : null))
      const updateRow = (index, patch) => setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
      const addRow = () => setRows((current) => current.concat({ provider: '', model: '', currency: 'CNY', input: '', cachedInput: '', output: '' }))
      const removeRow = (index) => setRows((current) => current.filter((_, i) => i !== index))
      const submit = () => {
        if (!writable || typeof onSave !== 'function') return
        const trimmed = url.trim()
        onSave({
          pricingSource: { url: trimmed === '' ? null : trimmed, refreshSeconds: Number(seconds) },
          pricing: pricingFromRows(rows),
        })
      }
      return h('details', { className: 'dsb-details dsb-config' },
        h('summary', { className: 'dsb-small' }, tr(t, 'config.summary')),
        h('div', { className: 'dsb-field' },
          h('label', { className: 'dsb-small', htmlFor: 'dsb-pricing-url' }, tr(t, 'config.url')),
          h('input', {
            id: 'dsb-pricing-url',
            className: 'dsb-input',
            type: 'url',
            value: url,
            placeholder: 'https://example.com/dsh-prices.json',
            onChange: (event) => setUrl(event.target.value),
          })),
        h('div', { className: 'dsb-field' },
          h('label', { className: 'dsb-small', htmlFor: 'dsb-pricing-seconds' }, tr(t, 'config.refreshSeconds')),
          h('input', {
            id: 'dsb-pricing-seconds',
            className: 'dsb-input',
            type: 'number',
            min: 300,
            max: 604800,
            step: 60,
            value: seconds,
            onChange: (event) => setSeconds(event.target.value),
          })),
        h('div', { className: 'dsb-small' }, tr(t, 'config.rows')),
        rows.length === 0
          ? h('div', { className: 'dsb-muted' }, tr(t, 'config.noRows'))
          : h('div', null,
            h('div', { className: 'dsb-price-head dsb-small' }, [
              h('span', { key: 'provider' }, tr(t, 'config.provider')),
              h('span', { key: 'model' }, tr(t, 'config.model')),
              h('span', { key: 'currency' }, tr(t, 'config.currency')),
              h('span', { key: 'input' }, tr(t, 'config.input')),
              h('span', { key: 'cached' }, tr(t, 'config.cached')),
              h('span', { key: 'output' }, tr(t, 'config.output')),
              h('span', { key: 'actions' }, ''),
            ]),
            rows.map((row, index) => h('div', { key: `${index}:${row.provider}:${row.model}`, className: 'dsb-price-row' },
              h('input', { className: 'dsb-input', value: row.provider, placeholder: 'provider', onChange: (event) => updateRow(index, { provider: event.target.value }) }),
              h('input', { className: 'dsb-input', value: row.model, placeholder: 'model', onChange: (event) => updateRow(index, { model: event.target.value }) }),
              h('select', { className: 'dsb-select', value: row.currency, onChange: (event) => updateRow(index, { currency: event.target.value }) },
                ['CNY', 'USD', 'EUR'].map((currency) => h('option', { key: currency, value: currency }, currency))),
              h('input', { className: 'dsb-input', type: 'number', min: 0, step: 'any', value: row.input, onChange: (event) => updateRow(index, { input: event.target.value }) }),
              h('input', { className: 'dsb-input', type: 'number', min: 0, step: 'any', value: row.cachedInput, onChange: (event) => updateRow(index, { cachedInput: event.target.value }) }),
              h('input', { className: 'dsb-input', type: 'number', min: 0, step: 'any', value: row.output, onChange: (event) => updateRow(index, { output: event.target.value }) }),
              h('button', { type: 'button', className: 'dsb-btn', onClick: () => removeRow(index) }, tr(t, 'config.remove'))))),
        h('div', { className: 'dsb-actions' },
          h('button', { type: 'button', className: 'dsb-btn', disabled: !writable, onClick: addRow }, tr(t, 'config.addRow')),
          h('button', { type: 'button', className: 'dsb-btn', disabled: refreshing, onClick: () => { if (typeof onRefresh === 'function') onRefresh() } }, refreshing ? tr(t, 'pricing.checking') : tr(t, 'pricing.check')),
          h('button', { type: 'button', className: 'dsb-btn dsb-btn-primary', disabled: saving || !writable, onClick: submit }, saving ? tr(t, 'config.saving') : tr(t, 'config.save'))),
        configPath !== null && configPath !== undefined && configPath !== ''
          ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'config.path'), { path: configPath }))
          : null,
        writable ? null : h('div', { className: 'dsb-warn' }, tr(t, 'config.readOnly')),
        h('div', { className: 'dsb-small' }, tr(t, 'config.hint')))
    }

    function PricingCard({ payload, view, refreshPricing, savePricing, t, locale }) {
      const estimates = isRecord(payload) && isRecord(payload.estimates) ? payload.estimates : null
      const pricing = estimates !== null && isRecord(estimates.pricing) ? estimates.pricing : null
      const source = pricing !== null && isRecord(pricing.source) ? pricing.source : null
      const status = source !== null && typeof source.status === 'string' ? source.status : 'unconfigured'
      const version = pricing !== null && typeof pricing.version === 'string' ? pricing.version : null
      const builtin = pricing !== null && typeof pricing.builtinVersion === 'string' ? pricing.builtinVersion : null
      const url = source !== null && typeof source.url === 'string' ? source.url : null
      const checkedAt = source !== null && typeof source.checkedAt === 'number'
        ? formatDateTime(new Date(source.checkedAt).toISOString(), locale) : null
      const fetchedAt = source !== null && typeof source.fetchedAt === 'number'
        ? formatDateTime(new Date(source.fetchedAt).toISOString(), locale) : null
      const refreshing = view !== null && view !== undefined && view.pricingRefreshing === true
      const remote = status === 'ready' || status === 'stale'
      const summary = status === 'ready'
        ? fmt(tr(t, 'pricing.ready'), { version: version || '—' })
        : status === 'stale'
          ? tr(t, 'pricing.stale')
          : status === 'error'
            ? tr(t, 'pricing.error')
            : status === 'never'
              ? tr(t, 'pricing.never')
              : tr(t, 'pricing.unconfigured')
      return h('div', { className: 'dsb-card' },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' }, tr(t, 'pricing.title')),
          h('div', { className: 'dsb-actions' },
            h('span', { className: 'dsb-badge', 'data-tone': status === 'ready' ? 'ok' : status === 'stale' || status === 'error' ? 'warn' : undefined },
              remote && version !== null
                ? fmt(tr(t, 'pricing.version'), { version })
                : fmt(tr(t, 'pricing.builtin'), { version: builtin || '—' })),
            h('button', {
              type: 'button',
              className: 'dsb-btn',
              disabled: refreshing,
              onClick: () => { if (typeof refreshPricing === 'function') refreshPricing() },
            }, refreshing ? tr(t, 'pricing.checking') : tr(t, 'pricing.check')))),
        h('div', { className: 'dsb-muted' }, summary),
        url !== null ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'pricing.sourceUrl'), { url })) : null,
        fetchedAt !== null ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'pricing.updatedAt'), { time: fetchedAt })) : null,
        checkedAt !== null ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'pricing.checkedAt'), { time: checkedAt })) : null,
        source !== null && source.error ? h('div', { className: 'dsb-error' }, errorText(source.error, t)) : null,
        status === 'unconfigured' ? h(React.Fragment, null,
          h('div', { className: 'dsb-small' }, tr(t, 'pricing.why')),
          h('div', { className: 'dsb-small' }, tr(t, 'pricing.how'))) : null,
        h('div', { className: 'dsb-small' }, tr(t, 'pricing.manualNote')),
        h(PricingEditor, {
          key: JSON.stringify(isRecord(payload) && isRecord(payload.meta) && isRecord(payload.meta.pricingConfig) ? payload.meta.pricingConfig : null),
          config: isRecord(payload) && isRecord(payload.meta) && isRecord(payload.meta.pricingConfig) ? payload.meta.pricingConfig : null,
          configPath: isRecord(payload) && isRecord(payload.meta) && typeof payload.meta.configPath === 'string' ? payload.meta.configPath : null,
          writable: isRecord(payload) && isRecord(payload.meta) && payload.meta.configWritable === true,
          saving: view !== null && view !== undefined && view.pricingSaving === true,
          onSave: savePricing,
          onRefresh: refreshPricing,
          refreshing,
          t,
        }))
    }

    function SettingsGlyph({ size, active }) {
      const edge = typeof size === 'number' && size > 0 ? size : 16
      return h('svg', {
        width: edge,
        height: edge,
        viewBox: '0 0 24 24',
        'aria-hidden': true,
        style: { display: 'block', color: 'currentColor', opacity: active ? 1 : 0.82 },
      },
      h('rect', { x: 2.5, y: 6, width: 19, height: 12, rx: 3.2, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8 }),
      h('path', { d: 'M2.5 10h19', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8 }),
      h('path', { d: 'M6 3.5a5 5 0 0 1 5 5', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      h('circle', { cx: 17, cy: 14, r: 2, fill: 'currentColor' }))
    }

    function MethodCard({ t }) {      return h('div', { className: 'dsb-card' },
        h('div', { className: 'dsb-card-title' }, tr(t, 'method.title')),
        h('div', { className: 'dsb-muted' }, tr(t, 'method.current')),
        h('div', { className: 'dsb-muted' }, tr(t, 'method.kimi')),
        h('div', { className: 'dsb-muted' }, tr(t, 'method.balance')),
        h('div', { className: 'dsb-muted' }, tr(t, 'method.spend')),
        h('div', { className: 'dsb-muted' }, tr(t, 'method.pricing')),
        h('div', { className: 'dsb-muted' }, tr(t, 'method.refresh')),
        h('div', { className: 'dsb-small' }, tr(t, 'method.secret')))
    }

    function Sources({ payload, display, view, t, locale, now, saveCredential, removeCredential }) {
      if (!isRecord(payload) || !isRecord(payload.sources)) return h('div', { className: 'dsb-muted' }, tr(t, 'settings.noPayload'))
      const activeId = display !== null && display !== undefined ? display.sourceId : null
      const order = []
      const seen = new Set()
      const catalog = isRecord(payload.catalog) && Array.isArray(payload.catalog.providers) ? payload.catalog.providers : []
      for (const entry of catalog) {
        if (!isRecord(entry) || typeof entry.sourceId !== 'string' || seen.has(entry.sourceId)) continue
        if (!isRecord(payload.sources[entry.sourceId])) continue
        seen.add(entry.sourceId)
        order.push(entry.sourceId)
      }
      for (const id of Object.keys(payload.sources)) {
        if (seen.has(id)) continue
        seen.add(id)
        order.push(id)
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, order.map((id) => {
        const source = payload.sources[id]
        if (!isRecord(source)) return null
        const target = credentialFor(payload, id, source.id === 'openai' ? 'admin' : undefined)
        const saving = target !== null && isRecord(view) && view.credentialSaving === target.id
        const error = target !== null && isRecord(view) && isRecord(view.credentialError)
          && view.credentialError.target === target.id
          ? view.credentialError
          : null
        const credentialProps = {
          target,
          credentialSaving: saving,
          credentialError: error,
          saveCredential,
          removeCredential,
        }
        if (source.status === 'unsupported' || source.mode === 'unknown' || source.mode === 'usage') {
          return h(GenericCard, { key: id, source, t, locale, active: id === activeId })
        }
        if (source.id === 'openai') {
          return h(OpenAICard, { key: id, source, t, locale, active: id === activeId, ...credentialProps })
        }
        return source.mode === 'coding-plan'
          ? h(KimiCard, { key: id, source, t, locale, now, active: id === activeId, ...credentialProps })
          : h(ApiCard, { key: id, source, t, locale, active: id === activeId, ...credentialProps })
      }))
    }

    function OpenAIInline({ source, t, locale }) {
      const cost = isRecord(source.officialCost) ? source.officialCost : null
      const local = isRecord(source.localUsage) ? source.localUsage : null
      if (cost !== null && typeof cost.amount === 'number') {
        return h('div', { className: 'dsb-row' },
          h('span', { className: 'dsb-muted' }, tr(t, 'openai.cost')),
          h('span', { className: 'dsb-big' }, costText(cost.amount, locale, typeof cost.currency === 'string' ? cost.currency : 'USD')))
      }
      return h(React.Fragment, null,
        h('div', { className: 'dsb-warn' }, tr(t, 'openai.limited')),
        local !== null && local.requests > 0
          ? h('div', { className: 'dsb-small' }, fmt(tr(t, 'openai.local'), {
            requests: formatNumber(local.requests, locale),
            tokens: formatNumber(local.inputTokens + local.outputTokens, locale),
          }))
          : h('div', { className: 'dsb-small' }, tr(t, 'openai.noLocal')))
    }

    function ActiveCard({ payload, display, conversation, t, locale, now }) {
      if (!isRecord(payload) || !isRecord(display) || !isRecord(display.source)) return null
      const active = display.active
      const source = display.source
      const title = display.reason === 'pinned'
        ? tr(t, 'display.pinned')
        : isRecord(conversation) ? tr(t, 'current.title') : tr(t, 'settings.active')
      return h('div', { className: 'dsb-card dsb-card-active' },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' }, title),
          h('div', { className: 'dsb-actions' },
            active.fallback ? h('span', { className: 'dsb-badge', 'data-tone': 'warn' }, tr(t, 'settings.activeFallback')) : null,
            h('span', { className: 'dsb-badge' }, active.mode === 'coding-plan'
              ? tr(t, 'mode.coding-plan')
              : active.mode === 'api'
                ? tr(t, 'mode.api')
                : active.mode === 'usage' ? tr(t, 'mode.usage') : tr(t, 'mode.unsupported')),
            h(StatusBadge, { source, t }))),
        active.provider ? h('div', { className: 'dsb-small' }, `${active.provider}${active.model ? ` / ${active.model}` : ''}`) : null,
        h('div', { className: 'dsb-small' }, fmt(tr(t, 'current.source'), { source: sourceName(source, t) })),        active.note && active.note.code ? h('div', { className: 'dsb-warn' }, errorText(active.note, t)) : null,
        source.id === 'openai'
          ? h(OpenAIInline, { source, t, locale })
          : source.mode === 'usage'
            ? h(UsageInline, { source, t, locale })
            : source.mode === 'coding-plan'
              ? h(KimiWindows, { source, t, locale, now })
              : h(WalletRows, { source, t, locale }),
        h(SpendInline, { estimate: source.estimate, t, locale }))
    }

    function CurrentConversationCard({ payload, view, t, locale }) {
      const conversation = view !== null && view !== undefined && isRecord(view.conversation) ? view.conversation : null
      if (conversation === null) {
        return h('div', { className: 'dsb-card' },
          h('div', { className: 'dsb-card-title' }, tr(t, 'current.title')),
          h('div', { className: 'dsb-muted' }, tr(t, 'current.none')))
      }
      const sourceId = sourceIdForProvider(payload, conversation.provider)
      const sources = isRecord(payload) && isRecord(payload.sources) ? payload.sources : {}
      const source = sourceId !== null && isRecord(sources[sourceId]) ? sources[sourceId] : null
      return h('div', { className: 'dsb-card' },
        h('div', { className: 'dsb-card-head' },
          h('div', { className: 'dsb-card-title' }, tr(t, 'current.title')),
          source ? h(StatusBadge, { source, t }) : null),
        h('div', { className: 'dsb-row' },
          h('span', { className: 'dsb-small' }, fmt(tr(t, 'current.model'), {
            provider: conversation.provider || '—',
            model: conversation.model || '—',
          })),
          h('span', { className: 'dsb-small' }, source ? sourceName(source, t) : tr(t, 'status.unsupported'))))
    }

    function ModePicker({ payload, view, setMode, t }) {
      const sources = isRecord(payload) && isRecord(payload.sources) ? payload.sources : {}
      const options = [{ value: 'conversation', label: tr(t, 'display.conversation') }]
      for (const id of Object.keys(sources)) {
        const source = sources[id]
        if (!isRecord(source) || source.mode === 'unknown' || source.status === 'unsupported') continue
        options.push({ value: id, label: sourceName(source, t) })
      }
      const current = view !== null && view !== undefined && typeof view.displayMode === 'string' ? view.displayMode : 'conversation'
      const value = options.some((option) => option.value === current) ? current : 'conversation'
      return h('label', { className: 'dsb-mode' },
        h('span', { className: 'dsb-small' }, tr(t, 'display.mode')),
        h('select', {
          className: 'dsb-select',
          value,
          onChange: (event) => setMode(event.target.value),
        }, options.map((option) => h('option', { key: option.value, value: option.value }, option.label))))
    }

    function PanelHost({ store, refresh, setMode, t, locale }) {
      const view = useStore(store)
      const now = useNow(30_000)
      React.useEffect(() => {
        if (!view.panelOpen) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') store.update({ panelOpen: false })
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [store, view.panelOpen])
      if (!view.panelOpen) return null
      const payload = view.payload
      const display = resolveDisplay(payload, view)
      const generated = payload !== null && payload !== undefined && typeof payload.generatedAt === 'number'
        ? formatDateTime(new Date(payload.generatedAt).toISOString(), locale)
        : null
      return h('div', {
        className: 'dsb-overlay',
        onClick: () => store.update({ panelOpen: false }),
      }, h('div', {
        className: 'dsb-panel',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': tr(t, 'panel.title'),
        onClick: (event) => event.stopPropagation(),
      },
      h('div', { className: 'dsb-head' },
        h('div', { className: 'dsb-panel-heading' },
          h('h2', { className: 'dsb-title' }, tr(t, 'panel.title')),
          h('p', { className: 'dsb-subtitle' }, generated !== null ? fmt(tr(t, 'panel.updated'), { time: generated }) : tr(t, 'status.loading'))),
        h('button', {
          type: 'button',
          className: 'dsb-close',
          'aria-label': tr(t, 'panel.close'),
          title: tr(t, 'panel.closeHint'),
          onClick: () => store.update({ panelOpen: false }),
        }, '×')),
      h('div', { className: 'dsb-toolbar' },
        h(ModePicker, { payload, view, setMode, t }),
        h('div', { className: 'dsb-actions' },
          h('button', { type: 'button', className: 'dsb-btn dsb-btn-primary', disabled: view.refreshing, onClick: () => refresh() }, view.refreshing ? tr(t, 'panel.refreshing') : tr(t, 'panel.refresh')))),
      h('div', { className: 'dsb-small' }, tr(t, 'display.hint')),
      view.error !== null && view.error !== undefined ? h('div', { className: 'dsb-error' }, errorText(view.error, t)) : null,
      h(CurrentConversationCard, { payload, view, t, locale }),
      h(ActiveCard, { payload, display, conversation: view.conversation, t, locale, now }),
      h(CatalogList, { payload, t, locale }),
      h('div', { className: 'dsb-small' }, tr(t, 'panel.openSettingsHint'))))
    }

    function Chip({ wide, store, refresh, t, locale }) {
      const view = useStore(store)
      const display = resolveDisplay(view.payload, view)
      const summary = activeSummary(view.payload, display, t, locale)
      const source = display !== null && display !== undefined ? display.source : null
      const modeLine = display !== null && display !== undefined && display.reason === 'pinned'
        ? tr(t, 'display.pinned')
        : tr(t, 'display.conversation')
      const title = source !== null && source !== undefined
        ? `${modeLine}\n${fullTitle(source, t, locale)}`
        : `${summary.title}${display !== null && display !== undefined && display.active && display.active.note
          ? `\n${errorText(display.active.note, t)}`
          : ''}${view.error !== null && view.error !== undefined ? `\n${errorText(view.error, t)}` : ''}\n${tr(t, 'chip.click')}`
      const stale = source !== null && source !== undefined && (source.status === 'stale' || source.status === 'limited')
      return h('div', { className: 'dsb-root' },
        h('button', {
          type: 'button',
          className: `dsb-chip${wide ? '' : ' dsb-compact'}`,
          'data-stale': stale ? 'true' : 'false',
          title,
          'aria-label': `${tr(t, 'chip.balance')}: ${summary.label} ${summary.value}`,
          onClick: () => {
            store.update({ panelOpen: true })
          },
        },
        h('span', { className: 'dsb-dot', 'data-tone': summary.tone }),
        h('span', { className: 'dsb-label' }, summary.label),
        h('span', { className: 'dsb-value' }, summary.value),
        summary.secondary !== null ? h('span', { className: 'dsb-secondary' }, summary.secondary) : null))
    }

    function SettingsPage({ store, refresh, refreshPricing, savePricing, saveCredential, removeCredential, setMode, t, locale }) {
      const view = useStore(store)
      const now = useNow(30_000)
      const payload = view.payload
      const display = resolveDisplay(payload, view)
      const generated = payload !== null && payload !== undefined && typeof payload.generatedAt === 'number'
        ? formatDateTime(new Date(payload.generatedAt).toISOString(), locale)
        : tr(t, 'time.never')
      const refreshSeconds = payload !== null && payload !== undefined && payload.meta ? payload.meta.refreshSeconds : 60
      return h('section', { className: 'dsb-page' },
        h('div', { className: 'dsb-head' },
          h('div', null,
            h('h2', { className: 'dsb-title' }, tr(t, 'settings.title')),
            h('p', { className: 'dsb-subtitle' }, tr(t, 'settings.subtitle')),
            h(ModePicker, { payload, view, setMode, t }),
            h('div', { className: 'dsb-small' }, tr(t, 'display.hint'))),
          h('div', { className: 'dsb-actions' },
            h('button', { type: 'button', className: 'dsb-btn dsb-btn-primary', disabled: view.refreshing, onClick: () => refresh() }, view.refreshing ? tr(t, 'panel.refreshing') : tr(t, 'settings.refresh')))),
        h('div', { className: 'dsb-small' }, `${fmt(tr(t, 'settings.lastUpdated'), { time: generated })} · ${fmt(tr(t, 'settings.autoRefresh'), { seconds: refreshSeconds })}`),
        view.error !== null && view.error !== undefined ? h('div', { className: 'dsb-error' }, errorText(view.error, t)) : null,
        h(CurrentConversationCard, { payload, view, t, locale }),
        h(ActiveCard, { payload, display, conversation: view.conversation, t, locale, now }),
        h(CatalogList, { payload, t, locale }),
        h('div', { className: 'dsb-muted' }, tr(t, 'settings.allSources')),
        h(Sources, {
          payload,
          display,
          view,
          t,
          locale,
          now,
          saveCredential,
          removeCredential,
        }),
        h(SpendCard, { payload, estimates: payload !== null && payload !== undefined ? payload.estimates : null, t, locale }),
        h(PricingCard, { payload, view, refreshPricing, savePricing, t, locale }),
        h(MethodCard, { t }))
    }

    return {
      inject: ['slots', 'locale', 'sessions'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'subscription-balance: en dictionary')
        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'subscription-balance: zh dictionary')
        const t = ctx.locale.bind(NS)
        const locale = () => {
          try {
            return ctx.locale.getSnapshot().active
          } catch {
            return 'en'
          }
        }

        let sessionsService = null
        try {
          sessionsService = ctx.sessions !== undefined
            ? ctx.sessions
            : typeof ctx.get === 'function' ? ctx.get('sessions') : null
        } catch {
          sessionsService = null
        }

        const detectSelection = (sessionId) => {
          if (sessionsService === null || sessionsService === undefined || typeof sessionsService.binding !== 'function') return null
          try {
            const binding = sessionsService.binding(sessionId)
            const session = binding !== null && binding !== undefined ? binding.session : null
            const face = session !== null && session !== undefined && session.projections && typeof session.projections.faceOf === 'function'
              ? session.projections.faceOf('modelSelection')
              : null
            const snapshot = face !== null && face !== undefined && typeof face.getSnapshot === 'function' ? face.getSnapshot() : null
            const selected = snapshot !== null && snapshot !== undefined ? (snapshot.next || snapshot.lastUsed) : null
            const route = selected !== null && selected !== undefined
              ? { provider: selected.provider, model: selected.model || selected.name }
              : session !== null && session !== undefined && typeof session.requestContext === 'function'
                ? session.requestContext()
                : null
            if (isRecord(route) && (typeof route.provider === 'string' || typeof route.model === 'string')) {
              return { provider: route.provider || null, model: route.model || null }
            }
            const direct = session !== null && session !== undefined
              ? session.modelSelection ?? session.model
              : binding !== null && binding !== undefined ? binding.modelSelection : null
            const directSelected = isRecord(direct) ? (direct.next || direct.lastUsed || direct) : null
            if (isRecord(directSelected) && (typeof directSelected.provider === 'string' || typeof directSelected.model === 'string')) {
              return { provider: directSelected.provider || null, model: directSelected.model || directSelected.name || null }
            }
          } catch {
            // The Session binding or projection can still be warming up.
          }
          return null
        }

        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute(STYLE_ATTR, 'true')
          style.textContent = CSS
          document.head.append(style)
          return () => style.remove()
        }, 'subscription-balance: styles')

        const store = createStore({
          payload: null,
          loading: true,
          refreshing: false,
          pricingRefreshing: false,
          pricingSaving: false,
          credentialSaving: null,
          credentialError: null,
          error: null,
          lastFetchAt: 0,
          panelOpen: false,
          displayMode: readDisplayMode(),
          conversation: null,
        })

        const setMode = (mode) => {
          if (typeof mode !== 'string' || mode === '') return
          writeDisplayMode(mode)
          store.update({ displayMode: mode })
        }

        function CurrentConversation(props) {
          const view = useStore(store)
          const [selection, setSelection] = React.useState(null)
          const sessionId = props !== null && props !== undefined
            ? props.sessionId ?? (props.session !== null && props.session !== undefined ? props.session.sessionId : null)
            : null

          React.useEffect(() => {
            if (sessionId === null || sessionId === undefined || sessionsService === null || sessionsService === undefined) {
              setSelection(null)
              return undefined
            }
            let disposed = false
            let disposeFace = null
            let retry = null
            let retries = 0
            const read = () => {
              if (disposed) return
              const next = detectSelection(sessionId)
              setSelection(next)
              if (next !== null) {
                store.update({ conversation: { ...next, sessionId } })
              } else {
                store.update({ conversation: null })
                if (retries < 3) {
                  retries += 1
                  retry = setTimeout(read, 1_000)
                }
              }
            }
            try {
              const binding = sessionsService.binding(sessionId)
              const session = binding !== null && binding !== undefined ? binding.session : null
              const face = session !== null && session !== undefined && session.projections && typeof session.projections.faceOf === 'function'
                ? session.projections.faceOf('modelSelection')
                : null
              read()
              if (face !== null && face !== undefined && typeof face.subscribe === 'function') {
                const result = face.subscribe(read)
                if (typeof result === 'function') disposeFace = result
              }
            } catch {
              setSelection(null)
            }
            return () => {
              disposed = true
              if (retry !== null) clearTimeout(retry)
              if (typeof disposeFace === 'function') disposeFace()
              if (store.getSnapshot().conversation !== null && store.getSnapshot().conversation.sessionId === sessionId) {
                store.update({ conversation: null })
              }
            }
          }, [sessionId, store])

          const payload = view.payload
          if (!isRecord(payload) || selection === null) return null
          const display = resolveDisplay(payload, { ...view, conversation: selection })
          if (!isRecord(display) || !isRecord(display.source)) return null
          const summary = activeSummary(payload, display, t, locale())
          const source = display.source
          return h('div', { className: 'dsb-dock' },
            h('button', {
              type: 'button',
              className: 'dsb-dock-pill',
              title: `${tr(t, 'current.title')}\n${fullTitle(source, t, locale())}`,
              'aria-label': `${tr(t, 'current.title')}: ${summary.label} ${summary.value}`,
              onClick: () => store.update({ panelOpen: true }),
            },
            h('span', { className: 'dsb-dot', 'data-tone': summary.tone }),
            h('span', { className: 'dsb-dock-label' }, summary.label),
            h('span', { className: 'dsb-dock-value' }, summary.value)))
        }

        let inflight = null
        const load = (force) => {
          if (inflight !== null) return inflight
          store.update({
            loading: store.getSnapshot().payload === null,
            refreshing: force,
          })
          inflight = (async () => {
            try {
              const response = await fetch(`${API}/${force ? 'refresh' : 'status'}.json`, {
                method: force ? 'POST' : 'GET',
                headers: { accept: 'application/json' },
                cache: 'no-store',
                credentials: 'same-origin',
              })
              let payload = null
              try {
                payload = await response.json()
              } catch {
                payload = null
              }
              if (!response.ok || !isRecord(payload) || payload.ok !== true) {
                const code = isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === 'string'
                  ? payload.error.code
                  : 'HOST_UNREACHABLE'
                throw { code, detail: `HTTP ${response.status}` }
              }
              const current = store.getSnapshot().payload
              if (isRecord(current) && typeof current.generatedAt === 'number'
                && typeof payload.generatedAt === 'number' && payload.generatedAt < current.generatedAt) {
                // A credential write or a newer poll already published this
                // newer snapshot; keep it instead of regressing the reading.
                store.update({ loading: false, refreshing: false, error: null, lastFetchAt: Date.now() })
                return
              }
              store.update({
                payload,
                loading: false,
                refreshing: false,
                error: null,
                lastFetchAt: Date.now(),
              })
            } catch (cause) {
              const error = isRecord(cause) && typeof cause.code === 'string'
                ? { code: cause.code, detail: typeof cause.detail === 'string' ? cause.detail : null }
                : { code: 'HOST_UNREACHABLE', detail: cause instanceof Error ? cause.message : String(cause) }
              store.update({ loading: false, refreshing: false, error })
            } finally {
              inflight = null
            }
          })()
          return inflight
        }

        let pricingInflight = null
        const loadPricing = () => {
          if (pricingInflight !== null) return pricingInflight
          store.update({ pricingRefreshing: true })
          pricingInflight = (async () => {
            try {
              const response = await fetch(`${API}/pricing/refresh.json`, {
                method: 'POST',
                headers: { accept: 'application/json' },
                cache: 'no-store',
                credentials: 'same-origin',
              })
              let payload = null
              try {
                payload = await response.json()
              } catch {
                payload = null
              }
              if (!response.ok || !isRecord(payload) || payload.ok !== true) {
                const code = isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === 'string'
                  ? payload.error.code
                  : 'HOST_UNREACHABLE'
                throw { code, detail: `HTTP ${response.status}` }
              }
              store.update({ payload, pricingRefreshing: false, error: null, lastFetchAt: Date.now() })
            } catch (cause) {
              const error = isRecord(cause) && typeof cause.code === 'string'
                ? { code: cause.code, detail: typeof cause.detail === 'string' ? cause.detail : null }
                : { code: 'HOST_UNREACHABLE', detail: cause instanceof Error ? cause.message : String(cause) }
              store.update({ pricingRefreshing: false, error })
            } finally {
              pricingInflight = null
            }
          })()
          return pricingInflight
        }

        const savePricing = (next) => {
          store.update({ pricingSaving: true })
          return (async () => {
            try {
              const response = await fetch(`${API}/config.json`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify(next),
                cache: 'no-store',
                credentials: 'same-origin',
              })
              let payload = null
              try {
                payload = await response.json()
              } catch {
                payload = null
              }
              if (!response.ok || !isRecord(payload) || payload.ok !== true) {
                const code = isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === 'string'
                  ? payload.error.code
                  : 'CONFIG_SAVE_FAILED'
                const detail = isRecord(payload) && isRecord(payload.error) && typeof payload.error.detail === 'string'
                  ? payload.error.detail
                  : `HTTP ${response.status}`
                throw { code, detail }
              }
              store.update({ pricingSaving: false, error: null })
              // The Host reloads this plugin row after the write; re-read once
              // it has settled, then once more as a safety net.
              setTimeout(() => { void load(false) }, 1_000)
              setTimeout(() => { void load(false) }, 3_000)
            } catch (cause) {
              const error = isRecord(cause) && typeof cause.code === 'string'
                ? { code: cause.code, detail: typeof cause.detail === 'string' ? cause.detail : null }
                : { code: 'CONFIG_SAVE_FAILED', detail: cause instanceof Error ? cause.message : String(cause) }
              store.update({ pricingSaving: false, error })
            }
          })()
        }

        const saveCredential = (targetId, value, action = 'set') => {
          store.update({ credentialSaving: targetId, credentialError: null })
          return (async () => {
            try {
              const response = await fetch(`${API}/credentials.json`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify({ target: targetId, value, action }),
                cache: 'no-store',
                credentials: 'same-origin',
              })
              let payload = null
              try {
                payload = await response.json()
              } catch {
                payload = null
              }
              if (!response.ok || !isRecord(payload) || payload.ok !== true) {
                const code = isRecord(payload) && isRecord(payload.error) && typeof payload.error.code === 'string'
                  ? payload.error.code
                  : 'CREDENTIAL_WRITE_FAILED'
                const detail = isRecord(payload) && isRecord(payload.error) && typeof payload.error.detail === 'string'
                  ? payload.error.detail
                  : `HTTP ${response.status}`
                throw { code, detail }
              }
              store.update({
                payload,
                credentialSaving: null,
                credentialError: null,
                error: null,
                lastFetchAt: Date.now(),
              })
              return true
            } catch (cause) {
              const code = isRecord(cause) && typeof cause.code === 'string'
                ? cause.code
                : 'CREDENTIAL_WRITE_FAILED'
              const detail = isRecord(cause) && typeof cause.detail === 'string'
                ? cause.detail
                : cause instanceof Error ? cause.message : String(cause)
              store.update({
                credentialSaving: null,
                credentialError: { target: targetId, code, detail },
              })
              return false
            }
          })()
        }

        const removeCredential = (targetId) => saveCredential(targetId, null, 'unset')

        ctx.effect(() => {
          void load(false)
          const timer = setInterval(() => {
            if (document.visibilityState === 'visible') void load(false)
          }, POLL_MS)
          const onVisibility = () => {
            if (document.visibilityState !== 'visible') return
            if (Date.now() - store.getSnapshot().lastFetchAt < 15_000) return
            void load(false)
          }
          document.addEventListener('visibilitychange', onVisibility)
          return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisibility)
          }
        }, 'subscription-balance: polling')

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'subscription-balance',
          order: 11,
          locale: NS,
          label: () => tr(t, 'chip.balance'),
          inject: () => ({ store, refresh: () => load(true) }),
        }, (props) => h(Chip, {
          wide: props !== null && props !== undefined ? props.wide !== false : true,
          store,
          refresh: () => load(true),
          t,
          locale: locale(),
        })))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'subscription-balance-panel',
          order: 40,
          locale: NS,
          label: () => tr(t, 'panel.title'),
          inject: () => ({ store, refresh: () => load(true) }),
        }, () => h(PanelHost, { store, refresh: () => load(true), setMode, t, locale: locale() })))

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'subscription-balance-current',
          order: 2,
          locale: NS,
          label: () => tr(t, 'current.title'),
          inject: () => ({ store }),
        }, (props) => h(CurrentConversation, { ...props, store, t })))

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'subscription-balance',
          order: 5,
          locale: NS,
          label: () => tr(t, 'settings.title'),
          inject: () => ({
            store,
            refresh: () => load(true),
            refreshPricing: () => loadPricing(),
            saveCredential: (targetId, value) => saveCredential(targetId, value),
            removeCredential: (targetId) => removeCredential(targetId),
          }),
        }, () => h(SettingsPage, {
          store,
          refresh: () => load(true),
          refreshPricing: () => loadPricing(),
          savePricing: (next) => savePricing(next),
          saveCredential: (targetId, value) => saveCredential(targetId, value),
          removeCredential: (targetId) => removeCredential(targetId),
          setMode,
          t,
          locale: locale(),
        })))

        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
          name: 'settings.section.icon',
          id: 'subscription-balance',
          order: 5,
        }, (props) => h(SettingsGlyph, {
          size: props !== null && props !== undefined ? props.size : 16,
          active: props !== null && props !== undefined ? props.active === true : false,
        })))
      },
    }
  },
})
