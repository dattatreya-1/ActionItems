import React, { useEffect, useMemo, useState } from 'react'
import { fetchActionItems, getColumns } from '../services/dataService'

function ColorBox({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ width: 14, height: 14, background: color, borderRadius: 3 }} />
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  )
}

function uniq(arr = []) {
  return Array.from(new Set(arr.filter(a => a !== undefined && a !== null)))
}

export default function ReportsView() {
  const [activeView, setActiveView] = useState('pivot')
  const [rows, setRows] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(false)

  const [filterBusiness, setFilterBusiness] = useState(null)
  const [filterBusinessType, setFilterBusinessType] = useState(null)
  const [filterProcess, setFilterProcess] = useState(null)
  const [filterSubType, setFilterSubType] = useState(null)
  const [filterStatus, setFilterStatus] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchActionItems()
      .then(res => {
        const r = Array.isArray(res.rows) ? res.rows : (res.rows || [])
        const cols = res.columns || getColumns()
        if (!mounted) return
        setRows(r)
        setColumns(cols)
      })
      .catch(err => {
        console.error('ReportsView: fetchActionItems failed', err)
        if (!mounted) return
        setRows([])
        setColumns(getColumns())
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])
  // Find column key by label or key name (robust against casing/spacing)
  function findColumnKey(name) {
    const norm = String(name || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const found = (columns || []).find(c => String(c.label || c.key || '').replace(/[^a-z0-9]/gi, '').toLowerCase().includes(norm))
    return found ? found.key : null
  }

  const choices = useMemo(() => {
    const businessKey = findColumnKey('business')
    const businessTypeKey = findColumnKey('business type')
    const processKey = findColumnKey('process')
    const subTypeKey = findColumnKey('subtype') || findColumnKey('sub-type') || findColumnKey('sub type')
    const statusKey = findColumnKey('status')

    const b = uniq(rows.map(r => r[businessKey] ?? r.business ?? r.Business))
    const bt = uniq(rows.map(r => r[businessTypeKey] ?? r.businessType ?? r.business_type ?? r.BusinessType))
    const p = uniq(rows.map(r => r[processKey] ?? r.process ?? r.Process))
    const st = uniq(rows.map(r => r[subTypeKey] ?? r.subType ?? r.sub_type ?? r.SubType))
    const s = uniq(rows.map(r => r[statusKey] ?? r.status ?? r.Status))
    return { business: b, businessType: bt, process: p, subType: st, status: s }
  }, [rows, columns])

  function parseDate(v) {
    if (!v) return null
    const d = new Date(v)
    if (!isNaN(d)) return d
    const parts = String(v).split('/')
    if (parts.length === 3) {
      const [m, day, y] = parts.map(p => parseInt(p, 10))
      if (!isNaN(m) && !isNaN(day) && !isNaN(y)) return new Date(y, m - 1, day)
    }
    return null
  }

  // Find column key by label or key name (robust against casing/spacing)
  const findColumnKey = (name) => {
    const norm = String(name || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const found = (columns || []).find(c => String(c.label || c.key || '').replace(/[^a-z0-9]/gi, '').toLowerCase().includes(norm))
    return found ? found.key : null
  }

  function applyFilters(rows) {
    return rows.filter(r => {
      if (filterBusiness && r.business !== filterBusiness) return false
      if (filterBusinessType && r.businessType !== filterBusinessType) return false
      if (filterProcess && r.process !== filterProcess) return false
      if (filterSubType && r.subType !== filterSubType) return false
      if (filterStatus && r.status !== filterStatus) return false

      if (dateFrom || dateTo) {
        const d = parseDate(r.createDate || r.CreateDate || r.date || r.Date)
        if (!d) return false
        if (dateFrom) {
          const from = parseDate(dateFrom)
          if (from && d < from) return false
        }
        if (dateTo) {
          const to = parseDate(dateTo)
          if (to) {
            to.setHours(23, 59, 59, 999)
            if (d > to) return false
          }
        }
      }

      return true
    })
  }

  const filtered = useMemo(() => applyFilters(rows), [rows, filterBusiness, filterBusinessType, filterProcess, filterSubType, filterStatus, dateFrom, dateTo])

  return (
    <section style={{ padding: '1rem' }}>
      <h2>Reports</h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveView('pivot')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            cursor: 'pointer',
            background: activeView === 'pivot' ? '#2b6cb0' : 'white',
            color: activeView === 'pivot' ? 'white' : '#333'
          }}
        >
          Pivot Table
        </button>

        <button
          onClick={() => setActiveView('daywise')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            cursor: 'pointer',
            background: activeView === 'daywise' ? '#2b6cb0' : 'white',
            color: activeView === 'daywise' ? 'white' : '#333'
          }}
        >
          Day-wise Workload
        </button>
      </div>

      {activeView === 'pivot' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 320, border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Filters</h3>

            <div style={{ marginBottom: 8 }}>
              <ColorBox color="#60a5fa" label="Business" />
              <select value={filterBusiness || ''} onChange={e => setFilterBusiness(e.target.value || null)} style={{ width: '100%' }}>
                <option value="">(All)</option>
                {choices.business.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <ColorBox color="#fbbf24" label="Business Type" />
              <select value={filterBusinessType || ''} onChange={e => setFilterBusinessType(e.target.value || null)} style={{ width: '100%' }}>
                <option value="">(All)</option>
                {choices.businessType.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <ColorBox color="#34d399" label="Process" />
              <select value={filterProcess || ''} onChange={e => setFilterProcess(e.target.value || null)} style={{ width: '100%' }}>
                <option value="">(All)</option>
                {choices.process.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <ColorBox color="#a78bfa" label="Process Sub-type" />
              <select value={filterSubType || ''} onChange={e => setFilterSubType(e.target.value || null)} style={{ width: '100%' }}>
                <option value="">(All)</option>
                {choices.subType.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <ColorBox color="#fb7185" label="Status" />
              <select value={filterStatus || ''} onChange={e => setFilterStatus(e.target.value || null)} style={{ width: '100%' }}>
                <option value="">(All)</option>
                {choices.status.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 6 }}>Date From</div>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
              <div style={{ marginBottom: 6 }}>Date To</div>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => { setFilterBusiness(null); setFilterBusinessType(null); setFilterProcess(null); setFilterSubType(null); setFilterStatus(null); setDateFrom(''); setDateTo('') }} style={{ padding: '6px 10px' }}>Reset</button>
              <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 13 }}>{loading ? 'Loading...' : `${filtered.length} rows`}</div>
            </div>
          </div>

          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Pivot (preview)</h3>
            <div style={{ fontSize: 13 }}>
              {filtered.slice(0, 50).map(r => (
                <div key={r.id || JSON.stringify(r)} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>{r.business} — {r.process} — {r.subType} — {r.status} — {r.createDate}</div>
              ))}
              {filtered.length === 0 && <div>No rows match the filters.</div>}
            </div>
          </div>
        </div>
      )}

      {activeView === 'daywise' && (
        <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          <p style={{ margin: 0 }}>Day-wise workload content goes here.</p>
        </div>
      )}
    </section>
  )
}
