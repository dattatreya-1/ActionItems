import React, { useState, useMemo } from 'react'

export default function ReportsView({ data = [], columns = [] }) {
  const [activeView, setActiveView] = useState('pivot')
  
  // Filters state
  const [selectedOwner, setSelectedOwner] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [selectedBusinessType, setSelectedBusinessType] = useState('')
  const [selectedProcess, setSelectedProcess] = useState('')
  const [selectedProcessSubType, setSelectedProcessSubType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Helper to find column key
  const findColumnKey = (name) => {
    const norm = String(name || '').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const found = columns.find(c => String(c.label || c.key || '').replace(/[^a-z0-9]/gi, '').toLowerCase().includes(norm))
    return found ? found.key : null
  }

  // Find all column keys
  const ownerKey = findColumnKey('owner')
  const businessKey = findColumnKey('business')
  const businessTypeKey = findColumnKey('business type')
  const processKey = findColumnKey('process')
  const processSubTypeKey = findColumnKey('process subtype')
  const statusKey = findColumnKey('status')
  const dateKey = findColumnKey('date')
  const minKey = findColumnKey('min') || findColumnKey('minutes')
  
  // Pivot table state - use actual column keys
  const [pivotRows, setPivotRows] = useState(businessKey || 'BUSINESS')
  const [pivotColumns, setPivotColumns] = useState(ownerKey || 'OWNER')
  const [pivotMetric, setPivotMetric] = useState('Minutes')
  
  // Update pivot defaults when keys are available
  React.useEffect(() => {
    if (businessKey && pivotRows === 'BUSINESS') setPivotRows(businessKey)
    if (ownerKey && pivotColumns === 'OWNER') setPivotColumns(ownerKey)
  }, [businessKey, ownerKey])
  
  console.log('=== ReportsView Debug ===')
  console.log('Column keys:', { ownerKey, businessKey, businessTypeKey, processKey, dateKey, minKey })
  console.log('Pivot settings:', { pivotRows, pivotColumns, pivotMetric })
  console.log('Total data rows:', data.length)
  if (data.length > 0) {
    console.log('Sample data:', data[0])
    console.log('Sample owner:', data[0][ownerKey])
    console.log('Sample business:', data[0][businessKey])
  }

  // Get unique values for filters
  const owners = useMemo(() => Array.from(new Set(data.map(d => d[ownerKey]).filter(Boolean))), [data, ownerKey])
  const businesses = useMemo(() => Array.from(new Set(data.map(d => d[businessKey]).filter(Boolean))), [data, businessKey])
  const businessTypes = useMemo(() => Array.from(new Set(data.map(d => d[businessTypeKey]).filter(Boolean))), [data, businessTypeKey])
  const processes = useMemo(() => Array.from(new Set(data.map(d => d[processKey]).filter(Boolean))), [data, processKey])
  const processSubTypes = useMemo(() => Array.from(new Set(data.map(d => d[processSubTypeKey]).filter(Boolean))), [data, processSubTypeKey])
  const statuses = useMemo(() => Array.from(new Set(data.map(d => d[statusKey]).filter(Boolean))), [data, statusKey])

  // Filter data based on all filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (selectedOwner && item[ownerKey] !== selectedOwner) return false
      if (selectedBusiness && item[businessKey] !== selectedBusiness) return false
      if (selectedBusinessType && item[businessTypeKey] !== selectedBusinessType) return false
      if (selectedProcess && item[processKey] !== selectedProcess) return false
      if (selectedProcessSubType && item[processSubTypeKey] !== selectedProcessSubType) return false
      if (selectedStatus && item[statusKey] !== selectedStatus) return false
      
      if (dateFrom && item[dateKey]) {
        if (item[dateKey] < dateFrom) return false
      }
      if (dateTo && item[dateKey]) {
        if (item[dateKey] > dateTo) return false
      }
      
      return true
    })
  }, [data, selectedOwner, selectedBusiness, selectedBusinessType, selectedProcess, selectedProcessSubType, selectedStatus, dateFrom, dateTo, ownerKey, businessKey, businessTypeKey, processKey, processSubTypeKey, statusKey, dateKey])

  // Pivot table data
  const pivotData = useMemo(() => {
    console.log('=== PIVOT TABLE DEBUG ===')
    console.log('pivotRows key:', pivotRows)
    console.log('pivotColumns key:', pivotColumns)
    console.log('pivotMetric:', pivotMetric)
    console.log('filteredData length:', filteredData.length)
    
    const rowValues = Array.from(new Set(filteredData.map(d => d[pivotRows] || '(blank)')))
    const colValues = Array.from(new Set(filteredData.map(d => d[pivotColumns] || '(blank)')))
    
    console.log('Row values:', rowValues)
    console.log('Column values:', colValues)
    
    const result = rowValues.map(rowVal => {
      const row = { [pivotRows]: rowVal }
      colValues.forEach(colVal => {
        const items = filteredData.filter(d => 
          (d[pivotRows] || '(blank)') === rowVal && 
          (d[pivotColumns] || '(blank)') === colVal
        )
        
        console.log(`Items for ${rowVal} x ${colVal}:`, items.length)
        
        if (pivotMetric === 'Minutes') {
          row[colVal] = items.reduce((sum, item) => sum + (parseFloat(item[minKey]) || 0), 0)
        } else if (pivotMetric === 'Hours') {
          row[colVal] = items.reduce((sum, item) => sum + (parseFloat(item[minKey]) || 0), 0) / 60
        } else if (pivotMetric === 'Days') {
          row[colVal] = items.reduce((sum, item) => sum + (parseFloat(item[minKey]) || 0), 0) / 60 / 6
        } else {
          row[colVal] = items.length
        }
      })
      
      // Calculate row total
      row.TOTAL = colValues.reduce((sum, colVal) => sum + (row[colVal] || 0), 0)
      
      return row
    })
    
    // Add grand total row
    const grandTotal = { [pivotRows]: 'GRAND TOTAL' }
    colValues.forEach(colVal => {
      grandTotal[colVal] = result.reduce((sum, row) => sum + (row[colVal] || 0), 0)
    })
    grandTotal.TOTAL = colValues.reduce((sum, colVal) => sum + (grandTotal[colVal] || 0), 0)
    
    console.log('Pivot result:', result)
    console.log('Grand total:', grandTotal)
    
    return { rows: result, columns: colValues, grandTotal }
  }, [filteredData, pivotRows, pivotColumns, pivotMetric, minKey])

  // Day-wise workload
  const daywiseData = useMemo(() => {
    console.log('=== DAY-WISE WORKLOAD DEBUG ===')
    console.log('dateKey:', dateKey)
    console.log('minKey:', minKey)
    console.log('ownerKey:', ownerKey)
    console.log('filteredData length:', filteredData.length)
    
    const dateMap = {}
    
    filteredData.forEach(item => {
      const date = item[dateKey]
      if (!date) {
        console.log('Skipping item with no date:', item)
        return
      }
      
      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          minutes: 0,
          items: 0,
          byOwner: {}
        }
      }
      
      const mins = parseFloat(item[minKey]) || 0
      dateMap[date].minutes += mins
      dateMap[date].items += 1
      
      const owner = item[ownerKey] || 'Unknown'
      if (!dateMap[date].byOwner[owner]) {
        dateMap[date].byOwner[owner] = 0
      }
      dateMap[date].byOwner[owner] += mins
    })
    
    console.log('Date map:', dateMap)
    const result = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
    console.log('Day-wise result:', result)
    
    return result
  }, [filteredData, dateKey, minKey, ownerKey])

  return (
    <div style={{ padding: '1rem' }}>
      {/* Filters */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ background: '#e0f2fe', padding: '1rem', borderRadius: '8px', border: '2px solid #0ea5e9' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#0c4a6e' }}>Owner:</label>
          <select 
            value={selectedOwner} 
            onChange={e => setSelectedOwner(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #0ea5e9' }}
          >
            <option value="">(all)</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div style={{ background: '#fce7f3', padding: '1rem', borderRadius: '8px', border: '2px solid #ec4899' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#831843' }}>Business:</label>
          <select 
            value={selectedBusiness} 
            onChange={e => setSelectedBusiness(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ec4899' }}
          >
            <option value="">(all)</option>
            {businesses.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div style={{ background: '#ddd6fe', padding: '1rem', borderRadius: '8px', border: '2px solid #8b5cf6' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#4c1d95' }}>Business Type:</label>
          <select 
            value={selectedBusinessType} 
            onChange={e => setSelectedBusinessType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #8b5cf6' }}
          >
            <option value="">(all)</option>
            {businessTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>

        <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '2px solid #f59e0b' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#78350f' }}>Process:</label>
          <select 
            value={selectedProcess} 
            onChange={e => setSelectedProcess(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #f59e0b' }}
          >
            <option value="">(all)</option>
            {processes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '8px', border: '2px solid #10b981' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#064e3b' }}>Process SubType:</label>
          <select 
            value={selectedProcessSubType} 
            onChange={e => setSelectedProcessSubType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #10b981' }}
          >
            <option value="">(all)</option>
            {processSubTypes.map(pst => <option key={pst} value={pst}>{pst}</option>)}
          </select>
        </div>

        <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', border: '2px solid #ef4444' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#7f1d1d' }}>Status:</label>
          <select 
            value={selectedStatus} 
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ef4444' }}
          >
            <option value="">(all)</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '8px', border: '2px solid #6366f1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#312e81' }}>From Date:</label>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #6366f1' }}
          />
        </div>

        <div style={{ background: '#fecaca', padding: '1rem', borderRadius: '8px', border: '2px solid #f87171' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#7f1d1d' }}>To Date:</label>
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #f87171' }}
          />
        </div>
      </div>

      {/* View Tabs */}
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

      {/* Pivot Table View */}
      {activeView === 'pivot' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', background: '#f0f9ff', padding: '1rem', borderRadius: '8px' }}>
            <label style={{ fontWeight: 'bold' }}>
              Rows:
              <select value={pivotRows} onChange={e => setPivotRows(e.target.value)} style={{ marginLeft: '0.5rem', padding: '0.5rem' }}>
                <option value={businessKey}>BUSINESS</option>
                <option value={ownerKey}>OWNER</option>
                <option value={businessTypeKey}>BUSINESS TYPE</option>
                <option value={processKey}>PROCESS</option>
                <option value={statusKey}>STATUS</option>
              </select>
            </label>

            <label style={{ fontWeight: 'bold' }}>
              Columns:
              <select value={pivotColumns} onChange={e => setPivotColumns(e.target.value)} style={{ marginLeft: '0.5rem', padding: '0.5rem' }}>
                <option value={ownerKey}>OWNER</option>
                <option value={businessKey}>BUSINESS</option>
                <option value={businessTypeKey}>BUSINESS TYPE</option>
                <option value={processKey}>PROCESS</option>
                <option value={statusKey}>STATUS</option>
              </select>
            </label>

            <label style={{ fontWeight: 'bold' }}>
              Metric:
              <select value={pivotMetric} onChange={e => setPivotMetric(e.target.value)} style={{ marginLeft: '0.5rem', padding: '0.5rem' }}>
                <option value="Minutes">Minutes</option>
                <option value="Hours">Hours</option>
                <option value="Days">Days (÷6)</option>
                <option value="Count">Count</option>
              </select>
            </label>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2b6cb0', color: 'white' }}>
                  <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>{pivotRows}</th>
                  {pivotData.columns.map(col => (
                    <th key={col} style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>{col}</th>
                  ))}
                  <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right', background: '#1e40af' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {pivotData.rows.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fafb' : 'white' }}>
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd', fontWeight: 'bold' }}>{row[pivotRows]}</td>
                    {pivotData.columns.map(col => (
                      <td key={col} style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>
                        {row[col] ? (pivotMetric === 'Count' ? row[col] : row[col].toFixed(2)) : '-'}
                      </td>
                    ))}
                    <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', background: '#e0f2fe' }}>
                      {row.TOTAL ? (pivotMetric === 'Count' ? row.TOTAL : row.TOTAL.toFixed(2)) : '-'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#2b6cb0', color: 'white', fontWeight: 'bold' }}>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>GRAND TOTAL</td>
                  {pivotData.columns.map(col => (
                    <td key={col} style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>
                      {pivotData.grandTotal[col] ? (pivotMetric === 'Count' ? pivotData.grandTotal[col] : pivotData.grandTotal[col].toFixed(2)) : '-'}
                    </td>
                  ))}
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right', background: '#1e40af' }}>
                    {pivotData.grandTotal.TOTAL ? (pivotMetric === 'Count' ? pivotData.grandTotal.TOTAL : pivotData.grandTotal.TOTAL.toFixed(2)) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Day-wise Workload View */}
      {activeView === 'daywise' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#2b6cb0', color: 'white' }}>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>DATE</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>MINUTES</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>HOURS</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>DAYS (÷6)</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>ITEMS</th>
                <th style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'left' }}>BY USER</th>
              </tr>
            </thead>
            <tbody>
              {daywiseData.map((day, idx) => (
                <tr key={day.date} style={{ background: idx % 2 === 0 ? '#f9fafb' : 'white' }}>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd', fontWeight: 'bold' }}>{day.date}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>{day.minutes.toFixed(0)}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>{(day.minutes / 60).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>{(day.minutes / 60 / 6).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'right' }}>{day.items}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {Object.entries(day.byOwner).map(([owner, mins]) => (
                      <span key={owner} style={{ marginRight: '1rem', fontSize: '0.875rem' }}>
                        <strong>{owner}:</strong> {mins.toFixed(0)}min
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
