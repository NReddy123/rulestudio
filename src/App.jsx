import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import RuleVisualizer from './RuleVisualizer.jsx'
import { evaluateConditions, isConditionValid, normalizeRule, parseRuleImport } from './ruleEngine.js'

const Icon = ({ children, size = 18, stroke = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

const icons = {
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></>,
  database: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.5v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.4v-2.5h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V6h2.5v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.5h-.2a1.7 1.7 0 0 0-1.5 1Z"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>, search: <><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.5 4.5"/></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>, down: <path d="m6 9 6 6 6-6"/>, code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4L20 15"/><path d="M20 20v-5h-5"/></>,
  play: <path d="m9 6 9 6-9 6V6Z" fill="currentColor"/>, trash: <><path d="M4 7h16M10 11v6M14 11v6"/><path d="m6 7 1 13h10l1-13M9 7V4h6v3"/></>,
  download: <><path d="M12 4v11M8 11l4 4 4-4M5 20h14"/></>, check: <path d="m5 12 4 4L19 6"/>,
}

const shellIcons = {
  sidebar: <><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 5v14"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  moon: <path d="M20.7 13.4A8.5 8.5 0 0 1 10.6 3.3 8.5 8.5 0 1 0 20.7 13.4Z"/>,
}

const defaultRules = [
  { id: 'rule_customer_eligibility', name: 'Customer eligibility', description: 'Determine if a customer is eligible for an account', conditions: [{ field: 'customer.age', operator: 'gte', value: '18', joinWith: 'AND' }], result: true, updated: 'Updated 2 min ago' },
  { id: 'rule_order_discount', name: 'Order discount', description: 'Apply a discount to qualifying orders', conditions: [{ field: 'order.total', operator: 'gte', value: '100', joinWith: 'AND' }], result: true, updated: 'Updated yesterday' },
  { id: 'rule_shipping_region', name: 'Shipping region', description: 'Check whether a shipping region is supported', conditions: [{ field: 'customer.region', operator: 'equals', value: 'US', joinWith: 'AND' }], result: true, updated: 'Updated 3 days ago' },
]

const createRuleId = () => `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const loadTheme = () => {
  try {
    return localStorage.getItem('rulestudio-theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

const loadRules = () => {
  try {
    const storedRules = JSON.parse(localStorage.getItem('rulestudio-rules'))
    if (!Array.isArray(storedRules) || storedRules.length === 0) return defaultRules
    return storedRules.map(normalizeRule)
  } catch {
    return defaultRules
  }
}

function App() {
  const importInputRef = useRef(null)
  const [rules, setRules] = useState(loadRules)
  const [activeRuleId, setActiveRuleId] = useState(() => rules[0]?.id)
  const [theme, setTheme] = useState(loadTheme)
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 900)
  const [tab, setTab] = useState('Expression')
  const [query, setQuery] = useState('')
  const [validated, setValidated] = useState(false)
  const [testInput, setTestInput] = useState('{\n  "customer": { "age": 24 }\n}')
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(() => {
    try {
      localStorage.getItem('rulestudio-rules')
      return false
    } catch {
      return true
    }
  })
  const currentRule = rules.find(rule => rule.id === activeRuleId) || rules[0]
  const filteredRules = useMemo(() => rules.filter(rule => rule.name.toLowerCase().includes(query.toLowerCase())), [rules, query])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('rulestudio-theme', theme)
    } catch {
      return
    }
  }, [theme])

  useEffect(() => {
    if (!sidebarOpen || !window.matchMedia('(max-width: 900px)').matches) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [sidebarOpen])

  const expressionValid = currentRule.conditions.length > 0 && currentRule.conditions.every(isConditionValid)

  const persistRules = nextRules => {
    try {
      localStorage.setItem('rulestudio-rules', JSON.stringify(nextRules))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }
  const updateCurrent = changes => {
    const nextRules = rules.map(rule => rule.id === activeRuleId ? { ...rule, ...changes, updated: 'Updated just now' } : rule)
    setRules(nextRules)
    persistRules(nextRules)
    setTestResult(null)
    setError('')
    setValidated(false)
  }
  const renameCurrent = name => {
    const nextRules = rules.map(rule => rule.id === activeRuleId ? { ...rule, name, updated: 'Updated just now' } : rule)
    setRules(nextRules)
    persistRules(nextRules)
    setError('')
    setTestResult(null)
    setValidated(false)
  }
  const updateCondition = (conditionIndex, changes) => {
    updateCurrent({
      conditions: currentRule.conditions.map((condition, index) => index === conditionIndex
        ? { ...condition, ...changes }
        : condition),
    })
  }
  const addRule = () => {
    let index = rules.length + 1
    while (rules.some(rule => rule.name.toLowerCase() === `new rule ${index}`)) index += 1
    const name = `New rule ${index}`
    const id = createRuleId()
    const newRule = { id, name, description: 'Describe what this rule should decide', conditions: [{ field: 'customer.age', operator: 'gte', value: '18', joinWith: 'AND' }], result: true, updated: 'Updated just now' }
    const nextRules = [...rules, newRule]
    setRules(nextRules)
    persistRules(nextRules)
    setActiveRuleId(id); setTab('Expression'); setError(''); setValidated(false); setTestResult(null)
  }
  const deleteRule = () => {
    if (rules.length === 1) return setError('At least one rule must remain.')
    const remaining = rules.filter(rule => rule.id !== activeRuleId)
    setRules(remaining); persistRules(remaining); setActiveRuleId(remaining[0].id); setValidated(false); setTestResult(null); setError('')
  }
  const validateRule = () => {
    setValidated(false)
    if (!currentRule.name.trim()) return setError('Enter a name for this rule before validating.')
    if (rules.some(rule => rule.id !== currentRule.id && rule.name.trim().toLowerCase() === currentRule.name.trim().toLowerCase())) return setError('Rule names must be unique.')
    if (!currentRule.conditions.length) return setError('Add at least one condition before validating.')
    if (!currentRule.conditions.every(isConditionValid)) return setError('Complete every condition with a valid value before validating.')
    setError(''); setValidated(true)
  }
  const downloadJson = (data, fileName) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.append(link)
    link.click()
    setTimeout(() => {
      link.remove()
      URL.revokeObjectURL(url)
    }, 1000)
  }
  const exportJson = () => downloadJson(currentRule, `${currentRule.name.toLowerCase().replaceAll(' ', '-')}.json`)
  const exportAllRules = () => downloadJson(rules, 'rulestudio-rules.json')
  const importRules = async event => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    try {
      const importedRules = parseRuleImport(await file.text())
      const usedIds = new Set(rules.map(rule => rule.id))
      const usedNames = new Set(rules.map(rule => rule.name.trim().toLowerCase()))
      const mergedRules = importedRules.map(rule => {
        let id = rule.id
        if (usedIds.has(id)) id = createRuleId()
        usedIds.add(id)

        let name = rule.name
        if (usedNames.has(name.toLowerCase())) {
          let suffix = 1
          name = `${rule.name} (imported)`
          while (usedNames.has(name.toLowerCase())) {
            suffix += 1
            name = `${rule.name} (imported ${suffix})`
          }
        }
        usedNames.add(name.toLowerCase())
        return { ...rule, id, name, updated: 'Imported just now' }
      })
      const nextRules = [...rules, ...mergedRules]
      setRules(nextRules)
      persistRules(nextRules)
      setActiveRuleId(mergedRules[0].id)
      setTab('Expression')
      setTestResult(null)
      setValidated(false)
      setError('')
      setNotice(`Imported ${mergedRules.length} ${mergedRules.length === 1 ? 'rule' : 'rules'}.`)
    } catch (exception) {
      setNotice('')
      setError(exception.message || 'The selected backup could not be imported.')
    } finally {
      input.value = ''
    }
  }
  const evaluateRule = () => {
    try {
      const data = JSON.parse(testInput)
      if (!currentRule.conditions.length) throw new Error('Add at least one condition before testing.')
      if (!currentRule.conditions.every(isConditionValid)) throw new Error('Complete all conditions with valid values before testing.')
      const { matched, outcomes } = evaluateConditions(currentRule.conditions, data)
      setTestResult({
        matched,
        outcomes,
        message: matched ? `Conditions matched; returns ${JSON.stringify(currentRule.result)}.` : 'Conditions did not match; no result was returned.',
      })
      setError('')
    } catch (exception) { setTestResult(null); setError(exception.message || 'Invalid test data.') }
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="sidebar" id="primary-sidebar" aria-label="Primary navigation">
        <div className="brand"><div className="brand-mark"><span></span><span></span><span></span></div><span>Rule<span className="brand-light">Studio</span></span><span className="beta">BETA</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          <button className="nav-item active" aria-label="Rules" title="Rules"><Icon>{icons.grid}</Icon><span>Rules</span><span className="nav-count">{rules.length}</span></button>
          <button className="nav-item" disabled title="Models are not available yet"><Icon>{icons.layers}</Icon><span>Models</span></button>
          <button className="nav-item" aria-label="Local data" title="Local data" onClick={() => { document.getElementById('browser-storage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(false) }}><Icon>{icons.database}</Icon><span>Local data</span></button>
        </nav>
        <div className="sidebar-bottom"><button className="nav-item" disabled title="Settings are not available yet"><Icon>{icons.settings}</Icon><span>Settings</span></button><div className="profile"><div className="avatar">LS</div><div><b>Local workspace</b><small>Stored in this browser</small></div></div></div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <div className="topbar-title-area">
            <button className="icon-btn sidebar-toggle" type="button" title="Toggle navigation" aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={sidebarOpen} aria-controls="primary-sidebar" onClick={() => setSidebarOpen(open => !open)}><Icon>{shellIcons.sidebar}</Icon></button>
            <div><div className="breadcrumb"><span>Workspace</span><Icon size={13}>{icons.chevron}</Icon><b>Rules</b></div><h1>Rules</h1></div>
          </div>
          <div className="top-actions">
            <button className="ghost-btn theme-toggle" type="button" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-pressed={theme === 'light'} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}><Icon>{theme === 'dark' ? shellIcons.sun : shellIcons.moon}</Icon><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>
            <button className="ghost-btn" onClick={exportJson}><Icon size={16}>{icons.download}</Icon> Export JSON</button>
            <button className="primary-btn" onClick={addRule}><Icon size={17}>{icons.plus}</Icon> New rule</button>
          </div>
        </header>
        <div className="content">
          <section className="rules-list panel">
            <div className="panel-heading"><div><h2>Rule sets</h2><p>Manage your decision logic</p></div>            <button className="icon-btn" aria-label="Delete current rule" onClick={deleteRule}><Icon size={17}>{icons.trash}</Icon></button></div>
            <div className="search"><Icon size={16}>{icons.search}</Icon><label className="sr-only" htmlFor="rule-search">Search rules</label><input id="rule-search" placeholder="Search rules" value={query} onChange={event => setQuery(event.target.value)} /></div>
            <div className="list-label">RULES <span>{filteredRules.length}</span></div>
            <div className="rule-items">{filteredRules.map((rule, index) => <button key={rule.id} className={`rule-item ${activeRuleId === rule.id ? 'selected' : ''}`} onClick={() => { setActiveRuleId(rule.id); setError(''); setTestResult(null) }}><div className={`rule-icon ${index % 3 === 0 ? 'purple' : index % 3 === 1 ? 'orange' : 'blue'}`}><Icon size={17}>{icons.code}</Icon></div><div className="rule-copy"><b>{rule.name}</b><small>{rule.updated}</small></div><Icon size={14}>{icons.chevron}</Icon></button>)}</div>
            <button className="add-rule" onClick={addRule}><Icon size={16}>{icons.plus}</Icon> Add rule</button>
          </section>

          <section className="editor">
            <div className="editor-head"><div><div className="title-row"><div className="rule-icon purple"><Icon size={18}>{icons.code}</Icon></div><input className="rule-title" aria-label="Rule name" value={currentRule.name} onChange={event => renameCurrent(event.target.value)} /><span className="published"><span></span> Local only</span></div><input className="description-input" aria-label="Rule description" value={currentRule.description} onChange={event => updateCurrent({ description: event.target.value })} /></div><div className="editor-tools"><span className="last-saved">{storageError ? 'Storage unavailable' : 'Auto-save on'}</span></div></div>
            <div className="tabs"><button className={tab === 'Expression' ? 'active' : ''} onClick={() => setTab('Expression')}>Expression</button><button className={tab === 'Visualize' ? 'active' : ''} onClick={() => setTab('Visualize')}>Visualize</button><button className={tab === 'JSON' ? 'active' : ''} onClick={() => setTab('JSON')}>JSON</button><button className={tab === 'Test' ? 'active' : ''} onClick={() => setTab('Test')}>Test rule</button></div>
            {tab === 'Visualize' ? <RuleVisualizer rule={currentRule} testResult={testResult} onEdit={() => setTab('Expression')} onTest={() => { setTab('Test'); evaluateRule() }} /> : tab === 'Expression' ? <div className="expression-card">
              <div className="expression-head"><div><span className="eyebrow">RULE EXPRESSION</span><h3>When the expression is true</h3><p className="expression-hint">AND binds before OR. OR starts an alternative group.</p></div><button className="small-btn" onClick={() => updateCurrent({ conditions: [...currentRule.conditions, { field: 'customer.age', operator: 'gte', value: '', joinWith: 'AND' }] })}><Icon size={15}>{icons.plus}</Icon> Add condition</button></div>
              {currentRule.conditions.map((condition, index) => (
                <div className={`logic-line ${index > 0 && condition.joinWith === 'OR' ? 'logic-or' : ''}`} key={index}>
                  <div className="logic-badge">
                    {index === 0 ? 'IF' : (
                      <select
                        className="logic-select"
                        aria-label={`Join logic before condition ${index + 1}`}
                        value={condition.joinWith ?? 'AND'}
                        onChange={event => updateCondition(index, { joinWith: event.target.value })}
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}
                  </div>
                  <div className="logic-stem"></div>
                  <div className="condition-row">
                    <span className="drag">⠿</span>
                    <select aria-label="Condition field" value={condition.field} onChange={event => updateCondition(index, { field: event.target.value })}><option>customer.age</option><option>customer.region</option><option>order.total</option></select>
                    <select aria-label="Condition operator" value={condition.operator} onChange={event => updateCondition(index, { operator: event.target.value })}><option value="gte">is greater than or equal to</option><option value="lt">is less than</option><option value="equals">equals</option></select>
                    <input aria-label="Condition value" value={condition.value} placeholder="Value" onChange={event => updateCondition(index, { value: event.target.value })} />
                    <button className="remove-btn" aria-label="Remove condition" onClick={() => updateCurrent({ conditions: currentRule.conditions.filter((_, itemIndex) => itemIndex !== index) })}><Icon size={16}>{icons.trash}</Icon></button>
                  </div>
                </div>
              ))}
              <div className="then-block"><div className="then-label"><span>THEN</span><div></div></div><div className="result-card"><div className="result-icon"><Icon size={17}>{icons.code}</Icon></div><div><b>Return value</b><select className="result-value" aria-label="Rule result" value={String(currentRule.result)} onChange={event => updateCurrent({ result: event.target.value === 'true' })}><option value="true">true</option><option value="false">false</option></select></div></div></div>
              <div className="expression-footer"><span><span className="valid-dot" style={{ background: expressionValid ? undefined : '#e57c7c' }}></span> {expressionValid ? 'Expression is valid' : 'Complete all conditions with valid values'}</span><button className="run-btn" onClick={() => { setTab('Test'); evaluateRule() }}><Icon size={14}>{icons.play}</Icon> Run test</button></div>
            </div> : tab === 'JSON' ? <pre className="json-view">{JSON.stringify(currentRule, null, 2)}</pre> : <div className="test-card"><h3>Test this rule</h3><p>Provide sample data to evaluate the current expression.</p><label htmlFor="test-input" className="sr-only">Sample JSON data</label><textarea id="test-input" value={testInput} onChange={event => { setTestInput(event.target.value); setTestResult(null); setError('') }} /><button className="primary-btn" onClick={evaluateRule}><Icon size={16}>{icons.play}</Icon> Evaluate rule</button>{testResult && <div className={`test-result ${testResult.matched ? 'match' : 'no-match'}`} role="status"><span>{testResult.matched ? '✓' : '×'}</span> {testResult.message}</div>}</div>}
            {error && <div className="error-message" role="alert">{error}</div>}<div className="editor-bottom"><div className="metadata"><div><span>Rule ID</span><b>{currentRule.id}</b></div><div><span>Conditions</span><b>{currentRule.conditions.length}</b></div><div><span>Last modified</span><b>{currentRule.updated}</b></div></div><button className="primary-btn save" onClick={validateRule}>{validated ? 'Valid ✓' : 'Validate rule'}</button></div>
          </section>

          <aside className="cache-panel" id="browser-storage">
            <div className="cache-title"><div><h2><span className="cache-live" style={{ background: storageError ? '#e57c7c' : undefined }}></span> Browser storage</h2><p>Local to this device</p></div></div>
            <div className="cache-status"><span style={{ color: storageError ? '#e57c7c' : undefined }}>{storageError ? '!' : '●'}</span><div><b>{storageError ? 'Storage unavailable' : 'Auto-save active'}</b><small>{storageError ? 'Changes could not be saved.' : 'Rules stay in this browser.'}</small></div></div>
            <div className="cache-stats"><div><span>Rules in workspace</span><b>{rules.length}</b></div><div><span>Storage scope</span><b>This browser</b></div></div>
            <div className="cache-divider"></div>
            <div className="cache-heading">BACKUP</div>
            <div className="activity"><div className="activity-item"><span className="activity-icon blue"><Icon size={14}>{icons.database}</Icon></span><div><b>JSON backup</b><small>Import a backup or export all {rules.length} rules.</small></div></div></div>
            <input ref={importInputRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Choose RuleStudio backup file" onChange={importRules} />
            <div className="cache-actions">
              <button className="ghost-btn" type="button" onClick={() => importInputRef.current?.click()}>Import rules</button>
              <button className="refresh-btn" type="button" onClick={exportAllRules}><Icon size={15}>{icons.download}</Icon> Export all rules</button>
            </div>
            {notice && <p className="import-notice" role="status">{notice}</p>}
          </aside>
        </div>
      </main>
    </div>
  )
}

export default App
