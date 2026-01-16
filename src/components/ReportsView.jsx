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

  // Drill-down state for day-wise workload - Excel-like expandable hierarchy
  const [expandedRows, setExpandedRows] = useState({}) // Tracks which rows are expanded

  // Pivot drill-down modal state
  const [showPivotDetailModal, setShowPivotDetailModal] = useState(false)
  const [pivotDetailData, setPivotDetailData] = useState([])

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
          const deliverableKey = cols.find(c => /deliverable/i.test(c.label || c.key))?.key
          const deadlineKey = cols.find(c => /deadline/i.test(c.label || c.key))?.key

          return {
            ...row,
            business: row[businessKey] || row.business || row.Business || '',
            businessType: row[businessTypeKey] || row.businessType || row.business_type || row.BusinessType || '',
            process: row[processKey] || row.process || row.Process || '',
            subType: row[subTypeKey] || row.subType || row.sub_type || row.SubType || '',
            deliverable: row[deliverableKey] || row.deliverable || row.Deliverable || '',
            status: row[statusKey] || row.status || row.Status || '',
            user: row[userKey] || row.user || row.User || row.owner || row.Owner || row.assignedTo || '',
            // Use Date field directly (not Create Date)
            createDate: row.Date || row.date || row.createDate || row.CreateDate || '',
            deadline: row[deadlineKey] || row.deadline || row.Deadline || '',
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

  // Function to get detailed rows for a pivot cell
  const getPivotCellDetails = (rowValue, colValue) => {
    const normalizeValue = (val) => {
      if (!val || !val.trim || val.trim() === '') return null
      return val.trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    return filtered.filter(row => {
      const rv = normalizeValue(row[pivotRowDim])
      const cv = normalizeValue(row[pivotColDim])
      return rv === rowValue && cv === colValue
    })
  }

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

  // Build day-wise workload data with hierarchical structure
  const dayWiseData = useMemo(() => {
    const buildHierarchy = (data, level, parentPath = []) => {
      const hierarchy = []
      const levelField = ['date', 'businessType', 'business', 'process', 'subType', 'deliverable'][level]
      
      if (!levelField) return hierarchy
      
      const groupMap = {}
      
      data.forEach(row => {
        let key, displayValue
        
        if (levelField === 'date') {
          const rawDate = row.createDate || row.date || row.Date || row.CreateDate
          const d = parseDate(rawDate)
          if (!d) return
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          displayValue = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
        } else {
          key = row[levelField] || '(Unknown)'
          displayValue = key
        }
        
        if (!groupMap[key]) {
          groupMap[key] = {
            key: key,
            displayValue: displayValue,
            level: level,
            path: [...parentPath, key],
            count: 0,
            minutes: 0,
            children: []
          }
        }
        
        groupMap[key].count++
        groupMap[key].minutes += parseFloat(row.minutes || 0)
      })
      
      const groups = Object.values(groupMap)
      
      // Sort
      if (levelField === 'date') {
        groups.sort((a, b) => b.key.localeCompare(a.key))
      } else {
        groups.sort((a, b) => a.displayValue.localeCompare(b.displayValue))
      }
      
      // Build children for each group
      groups.forEach(group => {
        const childData = data.filter(row => {
          if (levelField === 'date') {
            const rawDate = row.createDate || row.date || row.Date || row.CreateDate
            const d = parseDate(rawDate)
            if (!d) return false
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            return dateKey === group.key
          } else {
            return (row[levelField] || '(Unknown)') === group.key
          }
        })
        
        if (level < 5) { // Has potential children
          group.children = buildHierarchy(childData, level + 1, group.path)
        }
      })
      
      return groups
    }
    
    return buildHierarchy(filtered, 0)
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
            <div style={{ 
              border: '2px solid #000', 
              borderRadius: '10px', 
              padding: '12px 16px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <label style={{ marginRight: '8px', fontWeight: 700, color: '#fff', fontSize: '14px' }}>Row:</label>
              <select value={pivotRowDim} onChange={e => setPivotRowDim(e.target.value)} style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                border: '2px solid #000', 
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                <option value="business">Business</option>
                <option value="businessType">Business Type</option>
                <option value="process">Process</option>
                <option value="subType">Process Sub-type</option>
                <option value="status">Status</option>
                <option value="user">User</option>
              </select>
            </div>
            <div style={{ 
              border: '2px solid #000', 
              borderRadius: '10px', 
              padding: '12px 16px', 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <label style={{ marginRight: '8px', fontWeight: 700, color: '#fff', fontSize: '14px' }}>Column:</label>
              <select value={pivotColDim} onChange={e => setPivotColDim(e.target.value)} style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                border: '2px solid #000', 
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}>
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
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>
                      {pivotRowDim}
                    </th>
                    {pivotData.colValues.map(cv => (
                      <th key={cv} style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'center', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>
                        {cv || '(empty)'}
                      </th>
                    ))}
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', fontWeight: 700, textAlign: 'center', position: 'sticky', top: 0, zIndex: 2, fontSize: '14px' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pivotData.rowValues.map(rv => {
                    const rowTotal = pivotData.colValues.reduce((sum, cv) => sum + (pivotData.grid[rv][cv] || 0), 0)
                    return (
                      <tr key={rv}>
                        <td style={{ border: '2px solid #ffcccb', padding: '8px', fontWeight: 600, background: '#fafafa' }}>
                          {rv || '(empty)'}
                        </td>
                        {pivotData.colValues.map(cv => (
                          <td 
                            key={cv} 
                            style={{ 
                              border: '2px solid #ffcccb', 
                              padding: '8px', 
                              textAlign: 'center',
                              cursor: pivotData.grid[rv][cv] > 0 ? 'pointer' : 'default',
                              color: pivotData.grid[rv][cv] > 0 ? '#2563eb' : 'inherit',
                              fontWeight: pivotData.grid[rv][cv] > 0 ? '600' : 'normal',
                              textDecoration: pivotData.grid[rv][cv] > 0 ? 'underline' : 'none'
                            }}
                            onClick={() => {
                              if (pivotData.grid[rv][cv] > 0) {
                                const details = getPivotCellDetails(rv, cv)
                                setPivotDetailData(details)
                                setShowPivotDetailModal(true)
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (pivotData.grid[rv][cv] > 0) {
                                e.currentTarget.style.background = '#dbeafe'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = ''
                            }}
                          >
                            {pivotData.grid[rv][cv] || 0}
                          </td>
                        ))}
                        <td style={{ border: '2px solid #ffcccb', padding: '8px', textAlign: 'center', fontWeight: 700, background: '#f9fafb' }}>
                          {rowTotal}
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td style={{ border: '2px solid #ffcccb', padding: '8px', fontWeight: 700, background: '#f3f4f6' }}>
                      Total
                    </td>
                    {pivotData.colValues.map(cv => {
                      const colTotal = pivotData.rowValues.reduce((sum, rv) => sum + (pivotData.grid[rv][cv] || 0), 0)
                      return (
                        <td key={cv} style={{ border: '2px solid #ffcccb', padding: '8px', textAlign: 'center', fontWeight: 700, background: '#f3f4f6' }}>
                          {colTotal}
                        </td>
                      )
                    })}
                    <td style={{ border: '2px solid #ffcccb', padding: '8px', textAlign: 'center', fontWeight: 700, background: '#e5e7eb' }}>
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
          
          <div style={{ border: '2px solid #ffcccb', borderRadius: 12, padding: 16, overflow: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ overflow: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#cffafe', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>
                      Hierarchy
                    </th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#cffafe', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Minutes</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#cffafe', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Hours</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#cffafe', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Days</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#cffafe', textAlign: 'right', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>No. of Deliveries</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const renderRow = (item, index) => {
                      const hours = item.minutes / 60
                      const days = hours / 6
                      const hasChildren = item.children && item.children.length > 0
                      const isExpanded = expandedRows[item.path.join('|')]
                      const pathKey = item.path.join('|')
                      
                      // Define unique background colors for each hierarchy level
                      const levelColors = [
                        '#fef3c7',           // Level 0: Date - Light yellow
                        '#ddd6fe',           // Level 1: Business Type - Light purple
                        '#fecaca',           // Level 2: Business - Light red
                        '#a7f3d0',           // Level 3: Process - Light green
                        '#fed7aa',           // Level 4: Process Sub Type - Light orange
                        '#e0e7ff'            // Level 5: Deliverable - Light indigo
                      ]
                      
                      const rowBgColor = levelColors[item.level] || '#fff'
                      const indent = item.level * 20 // 20px per level
                      
                      const rows = []
                      
                      // Parent row
                      rows.push(
                        <tr 
                          key={pathKey}
                          onClick={() => {
                            if (hasChildren) {
                              setExpandedRows(prev => ({
                                ...prev,
                                [pathKey]: !prev[pathKey]
                              }))
                            }
                          }}
                          style={{ 
                            cursor: hasChildren ? 'pointer' : 'default',
                            transition: 'background 0.2s',
                            background: rowBgColor
                          }}
                          onMouseEnter={(e) => {
                            if (hasChildren) e.currentTarget.style.background = '#f0f9ff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = rowBgColor
                          }}
                        >
                          <td style={{ border: '2px solid #ffcccb', padding: '10px', paddingLeft: `${10 + indent}px`, color: hasChildren ? '#2563eb' : 'inherit', fontWeight: hasChildren ? '600' : 'normal' }}>
                            {hasChildren && (
                              <span style={{ marginRight: '8px', display: 'inline-block', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                ▶
                              </span>
                            )}
                            {!hasChildren && <span style={{ marginRight: '20px', display: 'inline-block' }}></span>}
                            {item.displayValue}
                          </td>
                          <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>{item.minutes.toFixed(0)}</td>
                          <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>{hours.toFixed(2)}</td>
                          <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>{days.toFixed(2)}</td>
                          <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>{item.count}</td>
                        </tr>
                      )
                      
                      // Children rows (if expanded)
                      if (isExpanded && hasChildren) {
                        item.children.forEach((child, childIndex) => {
                          rows.push(...renderRow(child, childIndex))
                        })
                      }
                      
                      return rows
                    }
                    
                    return dayWiseData.flatMap((item, index) => renderRow(item, index))
                  })()}
                  {dayWiseData.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ border: '2px solid #ffcccb', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                        No data available for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
                {dayWiseData.length > 0 && (
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#f3f4f6' }}>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px' }}>Total</td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>
                        {dayWiseData.reduce((sum, d) => sum + d.minutes, 0).toFixed(0)}
                      </td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>
                        {(dayWiseData.reduce((sum, d) => sum + d.minutes, 0) / 60).toFixed(2)}
                      </td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>
                        {(dayWiseData.reduce((sum, d) => sum + d.minutes, 0) / 60 / 6).toFixed(2)}
                      </td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px', textAlign: 'right' }}>
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

      {/* Pivot Detail Modal */}
      {showPivotDetailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowPivotDetailModal(false)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Action Items Details ({pivotDetailData.length} items)</h2>
              <button onClick={() => setShowPivotDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            <div style={{ overflow: 'auto', maxHeight: 'calc(90vh - 100px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Business Type</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Business</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Process</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Process Sub Type</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Deliverable</th>
                    <th style={{ border: '2px solid #ffcccb', padding: '10px', background: '#d4f4dd', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, fontWeight: 700, fontSize: '14px' }}>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {pivotDetailData.map((item, index) => (
                    <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px' }}>{item.businessType || '-'}</td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px' }}>{item.business || '-'}</td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px' }}>{item.process || '-'}</td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px' }}>{item.subType || '-'}</td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px' }}>{item.deliverable || '-'}</td>
                      <td style={{ border: '2px solid #ffcccb', padding: '10px' }}>{item.deadline || item.Deadline || '-'}</td>
                    </tr>
                  ))}
                  {pivotDetailData.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ border: '2px solid #ffcccb', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
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
