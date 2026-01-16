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
  const [showFilterModal, setShowFilterModal] = useState(false)

  const [filterBusiness, setFilterBusiness] = useState(null)
  const [filterBusinessType, setFilterBusinessType] = useState(null)
  const [filterProcess, setFilterProcess] = useState(null)
  const [filterSubType, setFilterSubType] = useState(null)
  const [filterStatus, setFilterStatus] = useState(null)
  const [filterUser, setFilterUser] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [pivotRowDim, setPivotRowDim] = useState('business')
  const [pivotColDim, setPivotColDim] = useState('status')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchActionItems()
      .then(res => {
        const r = Array.isArray(res.rows) ? res.rows : (res.rows || [])
        const cols = res.columns || getColumns()
        if (!mounted) return
        
        // Normalize rows: map backend column keys to standard property names
        const normalized = r.map(row => {
          const businessKey = cols.find(c => /business/i.test(c.label || c.key) && !/type/i.test(c.label || c.key))?.key
          const businessTypeKey = cols.find(c => /business.*type/i.test(c.label || c.key))?.key
          const processKey = cols.find(c => /process/i.test(c.label || c.key) && !/sub/i.test(c.label || c.key))?.key
          const subTypeKey = cols.find(c => /sub.*type|subtype/i.test(c.label || c.key))?.key
          const statusKey = cols.find(c => /status/i.test(c.label || c.key))?.key
          const userKey = cols.find(c => /user|owner|assigned/i.test(c.label || c.key))?.key
          const minutesKey = cols.find(c => /minutes|duration|time/i.test(c.label || c.key))?.key

          return {
            ...row,
            business: row[businessKey] || row.business || row.Business || '',
            businessType: row[businessTypeKey] || row.businessType || row.business_type || row.BusinessType || '',
            process: row[processKey] || row.process || row.Process || '',
            subType: row[subTypeKey] || row.subType || row.sub_type || row.SubType || '',
            status: row[statusKey] || row.status || row.Status || '',
            user: row[userKey] || row.user || row.User || row.owner || row.Owner || row.assignedTo || '',
            // Use Date field directly (not Create Date)
            createDate: row.Date || row.date || row.createDate || row.CreateDate || '',
            minutes: row[minutesKey] || row.Minutes || row.minutes || row.duration || row.Duration || 0
          }
        })
        
        setRows(normalized)
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
    const u = uniq(rows.map(r => r.user))
    return { business: b, businessType: bt, process: p, subType: st, status: s, user: u }
  }, [rows, columns])

  function parseDate(v) {
    if (!v) return null
    
    // Try YYYY-MM-DD format (e.g., 2026-01-13)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v + 'T00:00:00')
      if (!isNaN(d)) return d
    }
    
    // Try standard Date parsing
    const d = new Date(v)
    if (!isNaN(d)) return d
    
    // Try M/D/YYYY or MM/DD/YYYY format
    const parts = String(v).split('/')
    if (parts.length === 3) {
      const [m, day, y] = parts.map(p => parseInt(p, 10))
      if (!isNaN(m) && !isNaN(day) && !isNaN(y)) return new Date(y, m - 1, day)
    }
    
    return null
  }


  function applyFilters(rows) {
    return rows.filter(r => {
      if (filterBusiness && r.business !== filterBusiness) return false
      if (filterBusinessType && r.businessType !== filterBusinessType) return false
      if (filterProcess && r.process !== filterProcess) return false
      if (filterSubType && r.subType !== filterSubType) return false
      if (filterStatus && r.status !== filterStatus) return false
      if (filterUser && r.user !== filterUser) return false

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

  const filtered = useMemo(() => applyFilters(rows), [rows, filterBusiness, filterBusinessType, filterProcess, filterSubType, filterStatus, filterUser, dateFrom, dateTo])

  // Build pivot table data structure
  const pivotData = useMemo(() => {
    // Helper to normalize values (trim, capitalize first letter of each word for consistency)
    const normalizeValue = (val) => {
      if (!val || !val.trim || val.trim() === '') return null
      return val.trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    
    const rowValuesRaw = filtered.map(r => normalizeValue(r[pivotRowDim])).filter(v => v !== null)
    const colValuesRaw = filtered.map(r => normalizeValue(r[pivotColDim])).filter(v => v !== null)
    
    const rowValues = uniq(rowValuesRaw)
    const colValues = uniq(colValuesRaw)
    
    const grid = {}
    rowValues.forEach(rv => {
      grid[rv] = {}
      colValues.forEach(cv => {
        grid[rv][cv] = 0
      })
    })
    
    filtered.forEach(row => {
      const rv = normalizeValue(row[pivotRowDim])
      const cv = normalizeValue(row[pivotColDim])
      if (rv && cv && grid[rv] && grid[rv][cv] !== undefined) {
        grid[rv][cv]++
      }
    })
    
    return { rowValues, colValues, grid }
  }, [filtered, pivotRowDim, pivotColDim])

  // Build day-wise workload data
  const dayWiseData = useMemo(() => {
    const dayMap = {}
    
    filtered.forEach(row => {
      const rawDate = row.createDate || row.date || row.Date || row.CreateDate
      const d = parseDate(rawDate)
      if (!d) return
      
      // Normalize date to YYYY-MM-DD format to prevent duplicates
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      
      if (!dayMap[dateKey]) {
        // Format as MM/DD/YYYY for consistent display
        const displayDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
        dayMap[dateKey] = {
          date: dateKey,
          displayDate: displayDate,
          count: 0,
          minutes: 0
        }
      }
      
      dayMap[dateKey].count++
      
      // Extract duration - use normalized minutes field
      const duration = row.minutes || 0
      dayMap[dateKey].minutes += parseFloat(duration) || 0
    })
    
    // Sort from newest to oldest
    const days = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date))
    
    return days
  }, [filtered])

  return (
    <section style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', padding: '10px 16px', background: '#fefce8', borderRadius: '12px', border: '2px solid #ef4444', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)' }}>
          <button
            onClick={() => setActiveView('pivot')}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: activeView === 'pivot' ? '#2b6cb0' : '#fef3c7',
              color: activeView === 'pivot' ? 'white' : '#78350f',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'pivot' ? '0 2px 4px rgba(43, 108, 176, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'pivot') {
                e.target.style.background = '#fde68a'
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'pivot') {
                e.target.style.background = '#fef3c7'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            Pivot Table
          </button>

          <button
            onClick={() => setActiveView('daywise')}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: activeView === 'daywise' ? '#2b6cb0' : '#fef3c7',
              color: activeView === 'daywise' ? 'white' : '#78350f',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: activeView === 'daywise' ? '0 2px 4px rgba(43, 108, 176, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'daywise') {
                e.target.style.background = '#fde68a'
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'daywise') {
                e.target.style.background = '#fef3c7'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            Day-wise Workload
          </button>
        </div>
      </div>

      {activeView === 'pivot' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Pivot Table</h3>
            <button 
              style={{background: '#000', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'}}
              onClick={() => setShowFilterModal(true)}
            >
              🔍 Filters
            </button>
          </div>
          
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <label style={{ marginRight: '8px', fontWeight: 600 }}>Row:</label>
              <select value={pivotRowDim} onChange={e => setPivotRowDim(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                <option value="business">Business</option>
                <option value="businessType">Business Type</option>
                <option value="process">Process</option>
                <option value="subType">Process Sub-type</option>
                <option value="status">Status</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label style={{ marginRight: '8px', fontWeight: 600 }}>Column:</label>
              <select value={pivotColDim} onChange={e => setPivotColDim(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                <option value="business">Business</option>
                <option value="businessType">Business Type</option>
                <option value="process">Process</option>
                <option value="subType">Process Sub-type</option>
                <option value="status">Status</option>
                <option value="user">User</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 14, color: '#6b7280' }}>
              {loading ? 'Loading...' : `${filtered.length} rows`}
            </div>
          </div>
          
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, overflow: 'auto' }}>
            <div style={{ overflow: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f9fafb', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>
                      {pivotRowDim}
                    </th>
                    {pivotData.colValues.map(cv => (
                      <th key={cv} style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f9fafb', textAlign: 'center', position: 'sticky', top: 0, zIndex: 2 }}>
                        {cv || '(empty)'}
                      </th>
                    ))}
                    <th style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f3f4f6', fontWeight: 700, textAlign: 'center', position: 'sticky', top: 0, zIndex: 2 }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pivotData.rowValues.map(rv => {
                    const rowTotal = pivotData.colValues.reduce((sum, cv) => sum + (pivotData.grid[rv][cv] || 0), 0)
                    return (
                      <tr key={rv}>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', fontWeight: 600, background: '#fafafa' }}>
                          {rv || '(empty)'}
                        </td>
                        {pivotData.colValues.map(cv => (
                          <td key={cv} style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center' }}>
                            {pivotData.grid[rv][cv] || 0}
                          </td>
                        ))}
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', fontWeight: 700, background: '#f9fafb' }}>
                          {rowTotal}
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td style={{ border: '1px solid #e5e7eb', padding: '8px', fontWeight: 700, background: '#f3f4f6' }}>
                      Total
                    </td>
                    {pivotData.colValues.map(cv => {
                      const colTotal = pivotData.rowValues.reduce((sum, rv) => sum + (pivotData.grid[rv][cv] || 0), 0)
                      return (
                        <td key={cv} style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', fontWeight: 700, background: '#f3f4f6' }}>
                          {colTotal}
                        </td>
                      )
                    })}
                    <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', fontWeight: 700, background: '#e5e7eb' }}>
                      {filtered.length}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'daywise' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Day-wise Workload</h3>
            <button 
              style={{background: '#000', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'}}
              onClick={() => setShowFilterModal(true)}
            >
              🔍 Filters
            </button>
          </div>
          <div style={{ marginBottom: '1rem', fontSize: 14, color: '#6b7280' }}>
            {loading ? 'Loading...' : `${filtered.length} rows`}
          </div>
          
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, overflow: 'auto' }}>
            <div style={{ overflow: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f9fafb', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>Date</th>
                    <th style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f9fafb', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2 }}>Minutes</th>
                    <th style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f9fafb', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2 }}>Hours</th>
                    <th style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f9fafb', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2 }}>Days</th>
                    <th style={{ border: '1px solid #e5e7eb', padding: '8px', background: '#f9fafb', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2 }}>No. of Deliveries</th>
                  </tr>
                </thead>
                <tbody>
                  {dayWiseData.map(day => {
                    const hours = day.minutes / 60
                    const days = hours / 6
                    return (
                      <tr key={day.date}>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px' }}>{day.displayDate}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>{day.minutes.toFixed(0)}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>{hours.toFixed(2)}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>{days.toFixed(2)}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>{day.count}</td>
                      </tr>
                    )
                  })}
                  {dayWiseData.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ border: '1px solid #e5e7eb', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                        No data available for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
                {dayWiseData.length > 0 && (
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#f3f4f6' }}>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px' }}>Total</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>
                        {dayWiseData.reduce((sum, d) => sum + d.minutes, 0).toFixed(0)}
                      </td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>
                        {(dayWiseData.reduce((sum, d) => sum + d.minutes, 0) / 60).toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>
                        {(dayWiseData.reduce((sum, d) => sum + d.minutes, 0) / 60 / 6).toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right' }}>
                        {dayWiseData.reduce((sum, d) => sum + d.count, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowFilterModal(false)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Filters</h2>
              <button onClick={() => setShowFilterModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Business</label>
                <select value={filterBusiness || ''} onChange={e => setFilterBusiness(e.target.value || null)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">(All)</option>
                  {choices.business.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Business Type</label>
                <select value={filterBusinessType || ''} onChange={e => setFilterBusinessType(e.target.value || null)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">(All)</option>
                  {choices.businessType.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Process</label>
                <select value={filterProcess || ''} onChange={e => setFilterProcess(e.target.value || null)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">(All)</option>
                  {choices.process.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Process Sub-type</label>
                <select value={filterSubType || ''} onChange={e => setFilterSubType(e.target.value || null)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">(All)</option>
                  {choices.subType.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Status</label>
                <select value={filterStatus || ''} onChange={e => setFilterStatus(e.target.value || null)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">(All)</option>
                  {choices.status.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>User</label>
                <select value={filterUser || ''} onChange={e => setFilterUser(e.target.value || null)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">(All)</option>
                  {choices.user.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Date From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Date To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { 
                  setFilterBusiness(null); 
                  setFilterBusinessType(null); 
                  setFilterProcess(null); 
                  setFilterSubType(null); 
                  setFilterStatus(null); 
                  setFilterUser(null); 
                  setDateFrom(''); 
                  setDateTo('') 
                }} 
                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
              >
                Clear All
              </button>
              <button 
                onClick={() => setShowFilterModal(false)} 
                style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#000', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
