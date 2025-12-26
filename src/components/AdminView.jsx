import React, { useMemo, useState, useEffect } from 'react'
import { getColumns } from '../services/dataService'
import EditModal from './EditModal'

export default function AdminView({ initialData = [] }) {
  const [owner, setOwner] = useState('')
  const [business, setBusiness] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const owners = useMemo(() => {
    const set = new Set(initialData.map(d => d.owner))
    return Array.from(set)
  }, [initialData])

  const columns = getColumns()
  useEffect(() => {
    // if columns prop is provided (from API) update local columns state
    if (columns && columns.length) setColumnsProp(columns)
  }, [columns])
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [editingRow, setEditingRow] = useState(null)
  const [columnsProp, setColumnsProp] = useState(columns)

  const [businessType, setBusinessType] = useState('')
  const [status, setStatus] = useState('')

  const businessTypes = useMemo(() => {
    return Array.from(new Set(initialData.map(d => d.businessType || '').filter(Boolean)))
  }, [initialData])

  const statuses = useMemo(() => {
    return Array.from(new Set(initialData.map(d => d.status || '').filter(Boolean)))
  }, [initialData])

  const filtered = initialData.filter(item => {
    if (owner && item.owner !== owner) return false
    if (business && !item.business.toLowerCase().includes(business.toLowerCase())) return false
    if (businessType && item.businessType !== businessType) return false
    if (status && item.status !== status) return false
    if (from && item.deadline < from) return false
    if (to && item.deadline > to) return false
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

  return (
    <section className="admin">
      <h2>Admin</h2>

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

      <div className="admin-table table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map(c => (
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
                {columns.map(c => (
                  <td key={c.key}>
                    {c.key === 'actions' ? (
                      <div style={{display:'flex',gap:8}}>
                        <button title="Delete" className="action-btn delete" onClick={async () => {
                          if (!confirm(`Delete ${r.id}?`)) return
                          try {
                            await (await import('../services/dataService')).deleteActionItem(r.id)
                            window.location.reload()
                          } catch (err) { alert('Delete failed: '+err) }
                        }}>🗑</button>
                        <button title="Edit" className="action-btn" onClick={() => setEditingRow(r)}>Edit</button>
                      </div>
                    ) : (
                      (function formatCell(v) {
                        if (v === null || v === undefined) return ''
                        if (typeof v === 'object') return v.value ?? JSON.stringify(v)
                        return v
                      })(r[c.key])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-count">Showing {filtered.length} of {initialData.length}</div>
      </div>
      {editingRow && (
        <EditModal row={editingRow} columns={columns} onClose={() => setEditingRow(null)} onSave={async (updated) => {
          try {
            await (await import('../services/dataService')).updateActionItem(editingRow.id, updated)
            setEditingRow(null)
            window.location.reload()
          } catch (err) { alert('Update failed: '+err) }
        }} />
      )}
    </section>
  )
}
