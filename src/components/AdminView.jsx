import React, { useMemo, useState, useEffect } from 'react'
import { getColumns, createActionItem } from '../services/dataService'
import EditModal from './EditModal'
import AddModal from './AddModal'
import ReportsView from './ReportsView'

export default function AdminView({ initialData = [], columns = [] }) {
  const [activeTab, setActiveTab] = useState('data')
  const [owner, setOwner] = useState('')
  const [business, setBusiness] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [businessType, setBusinessType] = useState('')
  const [process, setProcess] = useState('')
  const [subType, setSubType] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')

  // Use columns provided by parent (from API) if present, otherwise fall back to defaults
  const cols = (columns && columns.length) ? columns : getColumns()

  // Helper to find the column key for a human label (robust against snake_case or spacing)
  const findColumnKey = (name) => {
    const norm = String(name || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const found = cols.find(c => String(c.label || c.key || '').replace(/[^a-z0-9]/gi, '').toLowerCase().includes(norm))
    return found ? found.key : null
  }
  
  // Special handling for date column - prioritize exact "DATE" match
  const findDateKey = () => {
    const exactDate = cols.find(c => 
      String(c.label || '').toUpperCase() === 'DATE' || 
      String(c.key || '').toUpperCase() === 'DATE'
    )
    if (exactDate) return exactDate.key
    return findColumnKey('deadline')
  }

  const ownerKey = findColumnKey('owner')
  const businessTypeKey = findColumnKey('business type')
  const statusKey = findColumnKey('status')
  const deadlineKey = findDateKey()
  const businessKey = findColumnKey('business')
  const processKey = findColumnKey('process')
  const subTypeKey = findColumnKey('subtype') || findColumnKey('sub-type') || findColumnKey('sub type')
  const priorityKey = findColumnKey('priority')
  const minKey = findColumnKey('min') || findColumnKey('minutes')

  const owners = useMemo(() => {
    const set = new Set(initialData.map(d => d[ownerKey]).filter(Boolean))
    return Array.from(set)
  }, [initialData, ownerKey])

  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [editingRow, setEditingRow] = useState(null)
  const [columnsProp, setColumnsProp] = useState(cols)

  const businessTypes = useMemo(() => {
    return Array.from(new Set(initialData.map(d => d[businessTypeKey] || '').filter(Boolean)))
  }, [initialData, businessTypeKey])

  const businesses = useMemo(() => {
    return Array.from(new Set(initialData.map(d => d[businessKey] || '').filter(Boolean)))
  }, [initialData, businessKey])

  const processes = useMemo(() => {
    return Array.from(new Set(initialData.map(d => d[processKey] || '').filter(Boolean)))
  }, [initialData, processKey])

  const subTypes = useMemo(() => {
    return Array.from(new Set(initialData.map(d => d[subTypeKey] || '').filter(Boolean)))
  }, [initialData, subTypeKey])

  const priorities = useMemo(() => {
    return Array.from(new Set(initialData.map(d => {
      const val = d[priorityKey] || ''
      return val ? val.toString().toUpperCase() : ''
    }).filter(Boolean)))
  }, [initialData, priorityKey])

  const statuses = useMemo(() => {
    return Array.from(new Set(initialData.map(d => d[statusKey] || '').filter(Boolean)))
  }, [initialData, statusKey])

  const filtered = initialData.filter(item => {
    if (ownerKey && owner && item[ownerKey] !== owner) return false
    if (businessKey && business && item[businessKey] !== business) return false
    if (businessTypeKey && businessType && item[businessTypeKey] !== businessType) return false
    if (processKey && process && item[processKey] !== process) return false
    if (subTypeKey && subType && item[subTypeKey] !== subType) return false
    if (priorityKey && priority && (item[priorityKey] || '').toString().toUpperCase() !== priority) return false
    if (statusKey && status && item[statusKey] !== status) return false
    // Date filtering - convert to Date objects for proper comparison
    if (deadlineKey && from && item[deadlineKey]) {
      const itemDate = new Date(item[deadlineKey])
      const fromDate = new Date(from)
      if (itemDate < fromDate) return false
    }
    if (deadlineKey && to && item[deadlineKey]) {
      const itemDate = new Date(item[deadlineKey])
      const toDate = new Date(to)
      if (itemDate > toDate) return false
    }
    return true
  })

  const sorted = [...filtered]
  if (sortKey) sorted.sort((a,b) => {
    const va = String(a[sortKey] ?? '')
    const vb = String(b[sortKey] ?? '')
    if (va === vb) return 0
    if (sortDir === 'asc') return va > vb ? 1 : -1
    return va > vb ? -1 : 1
  })

  const formatCell = (v) => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return v.value ?? JSON.stringify(v)
    return v
  }

  const renderFilters = () => (
    <div className="filters">
      <label>
        Owner:
        <select value={owner} onChange={e => setOwner(e.target.value)}>
          <option value="">(any)</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>

      <label>
        Business Type:
        <select value={businessType} onChange={e => setBusinessType(e.target.value)}>
          <option value="">(any)</option>
          {businessTypes.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </label>

      <label>
        Status:
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">(any)</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label>
        Business:
        <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="search business" />
      </label>

      <label>
        From (deadline):
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
      </label>

      <label>
        To (deadline):
        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
      </label>
    </div>
  )

  const renderAdminTable = () => (
    <div className="admin-table table-wrap">
      <table>
        <thead>
          <tr>
            {cols.filter(c => c.key !== 'id').map(c => (
              <th key={c.key} onClick={() => {
                if (sortKey === c.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                else { setSortKey(c.key); setSortDir('asc') }
              }}>{c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(sortKey ? sorted : filtered).map(r => (
            <tr key={r.id}>
              {cols.filter(c => c.key !== 'id').map(c => (
                <td key={c.key}>
                  {c.key === 'actions' ? (
                    <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                      <button className="action-btn" title="Edit" onClick={() => setEditingRow(r)}>Edit</button>
                      <button title="Delete" className="action-btn delete" onClick={async () => {
                        const uniqueId = r.id
                        if (!confirm(`Delete item ${uniqueId}?`)) return
                        try {
                          await (await import('../services/dataService')).deleteActionItem(uniqueId)
                          window.location.reload()
                        } catch (err) { alert('Delete failed: '+err) }
                      }}>🗑</button>
                    </div>
                  ) : (
                    formatCell(r[c.key])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="admin-count">Showing {filtered.length} of {initialData.length}</div>
      <div className="totals-summary" style={{marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        <div>
          <strong>Total Deliverables:</strong> {filtered.length}
        </div>
        <div>
          <strong>Total Minutes:</strong> {filtered.reduce((sum, row) => sum + (parseFloat(row[minKey]) || 0), 0).toFixed(0)}
        </div>
        <div>
          <strong>Total Hours:</strong> {(filtered.reduce((sum, row) => sum + (parseFloat(row[minKey]) || 0), 0) / 60).toFixed(2)}
        </div>
        <div>
          <strong>Total Days (÷6):</strong> {(filtered.reduce((sum, row) => sum + (parseFloat(row[minKey]) || 0), 0) / 60 / 6).toFixed(2)}
        </div>
      </div>
    </div>
  )
  return (
    <section className="admin">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <div style={{flex: 1}}></div>
        <div style={{display: 'flex', gap: '0.75rem', padding: '10px 16px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
          <button 
            className={activeTab === 'data' ? 'tab-active' : ''}
            onClick={() => setActiveTab('data')}
            style={{padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'data' ? '#2b6cb0' : '#e0f2fe', color: activeTab === 'data' ? 'white' : '#0c4a6e', fontWeight: '600', transition: 'all 0.2s ease', boxShadow: activeTab === 'data' ? '0 2px 4px rgba(43, 108, 176, 0.3)' : 'none'}}
          >
            Data
          </button>
          <button 
            className={activeTab === 'reports' ? 'tab-active' : ''}
            onClick={() => setActiveTab('reports')}
            style={{padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'reports' ? '#2b6cb0' : '#e0f2fe', color: activeTab === 'reports' ? 'white' : '#0c4a6e', fontWeight: '600', transition: 'all 0.2s ease', boxShadow: activeTab === 'reports' ? '0 2px 4px rgba(43, 108, 176, 0.3)' : 'none'}}
          >
            Reports
          </button>
        </div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '12px'}}>
          {activeTab === 'data' && (
            <>
              <button 
                style={{background: '#000', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'}}
                onClick={() => setShowFilterModal(true)}
              >
                🔍 Filters
              </button>
              <button className="add-btn" onClick={() => setShowAddModal(true)}>+ Add Action Item</button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'data' && renderAdminTable()}

        {activeTab === 'reports' && (
          <div style={{ marginTop: '1rem' }}>
            <ReportsView />
          </div>
        )}
      {editingRow && (
        <EditModal row={editingRow} columns={cols} onClose={() => setEditingRow(null)} onSave={async (updated) => {
          try {
            await (await import('../services/dataService')).updateActionItem(editingRow.id, updated)
            setEditingRow(null)
            window.location.reload()
          } catch (err) { alert('Update failed: '+err) }
        }} />
      )}
      {showAddModal && (
        <AddModal 
          columns={cols}
          defaultOwner=""
          onClose={() => setShowAddModal(false)}
          onSave={async (formData) => {
            await createActionItem(formData)
            setShowAddModal(false)
            window.location.reload()
          }}
        />
      )}

      {showFilterModal && (
        <div className="modal-backdrop" onClick={() => setShowFilterModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header" style={{borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 style={{margin: 0}}>Filter Options</h3>
              <button onClick={() => setShowFilterModal(false)} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>&times;</button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                Owner:
                <select value={owner} onChange={e => setOwner(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                  <option value="">(any)</option>
                  {owners.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                Business Type:
                <select value={businessType} onChange={e => setBusinessType(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                  <option value="">(any)</option>
                  {businessTypes.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                Business:
                <select value={business} onChange={e => setBusiness(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                  <option value="">(any)</option>
                  {businesses.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                Process:
                <select value={process} onChange={e => setProcess(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                  <option value="">(any)</option>
                  {processes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                Process Sub Type:
                <select value={subType} onChange={e => setSubType(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                  <option value="">(any)</option>
                  {subTypes.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                Priority:
                <select value={priority} onChange={e => setPriority(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                  <option value="">(any)</option>
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                Status:
                <select value={status} onChange={e => setStatus(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                  <option value="">(any)</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                From (deadline):
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </label>
              <label style={{display: 'flex', flexDirection: 'column', fontSize: '13px'}}>
                To (deadline):
                <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{marginTop: '4px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px'}} />
              </label>
            </div>
            <div style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px'}}>
              <button onClick={() => {
                setOwner('')
                setBusinessType('')
                setBusiness('')
                setProcess('')
                setSubType('')
                setPriority('')
                setStatus('')
                setFrom('')
                setTo('')
              }} style={{padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>Clear All</button>
              <button onClick={() => setShowFilterModal(false)} style={{padding: '8px 16px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
