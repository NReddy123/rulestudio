import { useState } from 'react'
import './App.css'

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

function App() {
  const [activeRule, setActiveRule] = useState('Customer eligibility')
  const [tab, setTab] = useState('Expression')
  const [condition, setCondition] = useState('customer.age >= 18')
  const [saved, setSaved] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const rules = ['Customer eligibility', 'Order discount', 'Shipping region']

  const saveRule = () => { setSaved(true); setTimeout(() => setSaved(false), 1800) }
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ name: activeRule, condition }, null, 2)], { type: 'application/json' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'rule.json'; link.click(); URL.revokeObjectURL(link.href)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span></span><span></span><span></span></div><span>Rule<span className="brand-light">Studio</span></span><span className="beta">BETA</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          <button className="nav-item active"><Icon>{icons.grid}</Icon><span>Rules</span><span className="nav-count">3</span></button>
          <button className="nav-item"><Icon>{icons.layers}</Icon><span>Models</span></button>
          <button className="nav-item"><Icon>{icons.database}</Icon><span>Cache</span><span className="status-dot"></span></button>
        </nav>
        <div className="sidebar-bottom"><button className="nav-item"><Icon>{icons.settings}</Icon><span>Settings</span></button><div className="profile"><div className="avatar">AR</div><div><b>Alex Rivera</b><small>Workspace owner</small></div><Icon size={15}>{icons.more}</Icon></div></div>
      </aside>

      <main className="main">
        <header className="topbar"><div><div className="breadcrumb"><span>Workspace</span><Icon size={13}>{icons.chevron}</Icon><b>Rules</b></div><h1>Rules</h1></div><div className="top-actions"><button className="ghost-btn" onClick={exportJson}><Icon size={16}>{icons.download}</Icon> Export JSON</button><button className="primary-btn" onClick={() => setActiveRule('New rule')}><Icon size={17}>{icons.plus}</Icon> New rule</button></div></header>
        <div className="content">
          <section className="rules-list panel">
            <div className="panel-heading"><div><h2>Rule sets</h2><p>Manage your decision logic</p></div><button className="icon-btn"><Icon size={17}>{icons.more}</Icon></button></div>
            <div className="search"><Icon size={16}>{icons.search}</Icon><input placeholder="Search rules" /></div>
            <div className="list-label">RULES <span>3</span></div>
            <div className="rule-items">{rules.map((rule, index) => <button key={rule} className={`rule-item ${activeRule === rule ? 'selected' : ''}`} onClick={() => setActiveRule(rule)}><div className={`rule-icon ${index === 0 ? 'purple' : index === 1 ? 'orange' : 'blue'}`}><Icon size={17}>{icons.code}</Icon></div><div className="rule-copy"><b>{rule}</b><small>{index === 0 ? 'Updated 2 min ago' : index === 1 ? 'Updated yesterday' : 'Updated 3 days ago'}</small></div><Icon size={14}>{icons.chevron}</Icon></button>)}</div>
            <button className="add-rule" onClick={() => setActiveRule('New rule')}><Icon size={16}>{icons.plus}</Icon> Add rule</button>
          </section>

          <section className="editor">
            <div className="editor-head"><div><div className="title-row"><div className="rule-icon purple"><Icon size={18}>{icons.code}</Icon></div><h2>{activeRule}</h2><span className="published"><span></span> Published</span></div><p>Determine if a customer is eligible for an account</p></div><div className="editor-tools"><span className="last-saved">Saved just now</span><button className="icon-btn"><Icon size={17}>{icons.more}</Icon></button></div></div>
            <div className="tabs"><button className={tab === 'Expression' ? 'active' : ''} onClick={() => setTab('Expression')}>Expression</button><button className={tab === 'JSON' ? 'active' : ''} onClick={() => setTab('JSON')}>JSON</button><button className={tab === 'Test' ? 'active' : ''} onClick={() => setTab('Test')}>Test rule</button></div>
            {tab === 'Expression' ? <div className="expression-card">
              <div className="expression-head"><div><span className="eyebrow">RULE EXPRESSION</span><h3>When all of these conditions are true</h3></div><button className="small-btn" onClick={() => setCondition('')}><Icon size={15}>{icons.plus}</Icon> Add condition</button></div>
              <div className="logic-line"><div className="logic-badge">AND</div><div className="logic-stem"></div><div className="condition-row"><span className="drag">⠿</span><select defaultValue="customer.age"><option>customer.age</option><option>customer.region</option><option>order.total</option></select><select defaultValue="gte"><option value="gte">is greater than or equal to</option><option>is less than</option><option>equals</option></select><input value={condition.replace('customer.age >= ', '')} placeholder="18" onChange={e => setCondition(`customer.age >= ${e.target.value}`)} /><button className="remove-btn" onClick={() => setCondition('')}><Icon size={16}>{icons.trash}</Icon></button></div></div>
              <div className="then-block"><div className="then-label"><span>THEN</span><div></div></div><div className="result-card"><div className="result-icon"><Icon size={17}>{icons.check}</Icon></div><div><b>Eligible</b><small>Return <code>true</code></small></div><button className="result-more"><Icon size={16}>{icons.more}</Icon></button></div></div>
              <div className="expression-footer"><span><span className="valid-dot"></span> Expression is valid</span><button className="run-btn" onClick={() => setRefreshed(true)}><Icon size={14}>{icons.play}</Icon> Run test</button></div>
            </div> : tab === 'JSON' ? <pre className="json-view">{JSON.stringify({ name: activeRule, description: 'Determine if a customer is eligible for an account', condition, result: true }, null, 2)}</pre> : <div className="test-card"><h3>Test this rule</h3><p>Provide sample data to evaluate the current expression.</p><textarea defaultValue={'{\n  "customer": { "age": 24 }\n}'} /><button className="primary-btn" onClick={() => setRefreshed(true)}><Icon size={16}>{icons.play}</Icon> Evaluate rule</button>{refreshed && <div className="test-result"><span>✓</span> Rule matched — Eligible</div>}</div>}
            <div className="editor-bottom"><div className="metadata"><div><span>Rule ID</span><b>rule_customer_eligibility</b></div><div><span>Version</span><b>v1.4.2</b></div><div><span>Last modified</span><b>Today, 10:42 AM</b></div></div><button className="primary-btn save" onClick={saveRule}>{saved ? 'Saved ✓' : 'Save changes'}</button></div>
          </section>

          <aside className="cache-panel"><div className="cache-title"><div><h2><span className="cache-live"></span> Cache</h2><p>Local rule cache</p></div><button className="icon-btn" onClick={() => setRefreshed(true)}><Icon size={16}>{icons.refresh}</Icon></button></div><div className="cache-status"><span>●</span><div><b>In sync</b><small>Last synced just now</small></div></div><div className="cache-stats"><div><span>Rules cached</span><b>3</b></div><div><span>Cache size</span><b>12.4 KB</b></div><div><span>Hit rate</span><b>98.6%</b></div></div><div className="cache-divider"></div><div className="cache-heading">RECENT ACTIVITY</div><div className="activity"><div className="activity-item"><span className="activity-icon green"><Icon size={14}>{icons.check}</Icon></span><div><b>Rules synced</b><small>Just now</small></div></div><div className="activity-item"><span className="activity-icon purple"><Icon size={14}>{icons.code}</Icon></span><div><b>Customer eligibility</b><small>Updated 2 min ago</small></div></div><div className="activity-item"><span className="activity-icon orange"><Icon size={14}>{icons.refresh}</Icon></span><div><b>Cache refreshed</b><small>Today, 10:38 AM</small></div></div></div><button className="refresh-btn" onClick={() => setRefreshed(true)}><Icon size={15}>{icons.refresh}</Icon> Refresh cache</button></aside>
        </div>
      </main>
    </div>
  )
}

export default App
