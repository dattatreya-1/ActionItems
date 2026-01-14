import React, { useState, useEffect } from 'react'
import { createActionItem, fetchActionItems } from '../services/dataService'

export default function AddModal({ columns, defaultOwner, onClose, onSave }) {
  const [formData, setFormData] = useState({
    owner: defaultOwner || ''
  })
  const [loading, setLoading] = useState(false)
  const [dropdownOptions, setDropdownOptions] = useState({})

  // Fetch existing data to populate dropdown options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const { rows, columns } = await fetchActionItems()
        
        if (!rows || rows.length === 0) {
          console.log('No rows available for dropdown options')
          return
        }
        
        console.log('Columns metadata:', columns)
        
        // Find column keys by checking column labels
        const findColumnKey = (labelVariants) => {
          for (const variant of labelVariants) {
            const col = columns.find(c => 
              (c.label || '').toLowerCase().includes(variant.toLowerCase()) ||
              (c.key || '').toLowerCase().includes(variant.toLowerCase())
            )
            if (col) {
              console.log(`Found column for "${variant}":`, col.key)
              return col.key
            }
          }
          console.log(`No column found for variants:`, labelVariants)
          return labelVariants[0]
        }
        
        const businessKey = findColumnKey(['business'])
        const businessTypeKey = findColumnKey(['business type', 'businesstype', 'business_type'])
        const processKey = findColumnKey(['process'])
        const subTypeKey = findColumnKey(['sub-type', 'subtype', 'sub type', 'process subtype'])
        const ownerKey = findColumnKey(['owner'])
        
        console.log('Selected keys:', { businessKey, businessTypeKey, processKey, subTypeKey, ownerKey })
        
        // Extract unique values for each field
        const getUnique = (key) => {
          const values = rows
            .map(r => r[key])
            .filter(v => v && String(v).trim && String(v).trim() !== '')
          const unique = [...new Set(values)].sort()
          console.log(`Unique values for ${key}:`, unique)
          return unique
        }
        
        setDropdownOptions({
          business: getUnique(businessKey),
          businessType: getUnique(businessTypeKey),
          process: getUnique(processKey),
          subType: getUnique(subTypeKey),
          owner: getUnique(ownerKey)
        })
      } catch (err) {
        console.error('Failed to load dropdown options:', err)
      }
    }
    
    loadOptions()
  }, [])

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Filter out any id, row, or UNNAMED fields before sending
    const cleanData = {}
    Object.keys(formData).forEach(key => {
      if (key !== 'id' && 
          key !== 'row' && 
          key !== 'actions' &&
          !key.toUpperCase().startsWith('UNNAMED')) {
        cleanData[key] = formData[key]
      }
    })
    
    console.log('Submitting clean data:', cleanData)
    
    try {
      const result = await onSave(cleanData)
      console.log('Create result:', result)
    } catch (err) {
      console.error('Create error:', err)
      const errorMsg = err.message || 'Unknown error'
      alert('Failed to create action item: ' + errorMsg)
      setLoading(false)
    }
  }

  // Skip rendering fields for 'id' and 'actions' and UNNAMED columns
  const editableColumns = columns.filter(col => 
    col.key !== 'id' && 
    col.key !== 'actions' &&
    !col.key.toUpperCase().startsWith('UNNAMED') &&
    !col.label.toUpperCase().startsWith('UNNAMED')
  )

  // Helper to check if a field should be a date input
  const isDateField = (col) => {
    const keyLower = (col.key || '').toLowerCase()
    const labelLower = (col.label || '').toLowerCase()
    return keyLower.includes('date') || keyLower.includes('deadline') || 
           labelLower.includes('date') || labelLower.includes('deadline')
  }

  // Helper to check if field should be a dropdown
  const shouldBeDropdown = (col) => {
    const keyLower = (col.key || '').toLowerCase()
    const labelLower = (col.label || '').toLowerCase()
    
    if (keyLower.includes('owner') || labelLower.includes('owner')) return 'owner'
    if (keyLower.includes('status') || labelLower.includes('status')) return 'status'
    if (keyLower.includes('priority') || labelLower.includes('priority')) return 'priority'
    if (keyLower === 'business' || labelLower === 'business') return 'business'
    if (keyLower.includes('businesstype') || keyLower.includes('business_type') || labelLower.includes('business type')) return 'businessType'
    if (keyLower === 'process' || labelLower === 'process') return 'process'
    if (keyLower.includes('subtype') || keyLower.includes('sub_type') || keyLower.includes('sub-type') || labelLower.includes('sub')) return 'subType'
    
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Action Item</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {editableColumns.map(col => {
              const dropdownType = shouldBeDropdown(col)
              
              return (
                <div key={col.key} className="form-group">
                  <label>{col.label}</label>
                  {dropdownType === 'business' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                    >
                      <option value="">Select Business</option>
                      {(dropdownOptions.business || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : dropdownType === 'businessType' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                    >
                      <option value="">Select Business Type</option>
                      {(dropdownOptions.businessType || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : dropdownType === 'process' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                    >
                      <option value="">Select Process</option>
                      {(dropdownOptions.process || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : dropdownType === 'subType' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                    >
                      <option value="">Select Process Sub-type</option>
                      {(dropdownOptions.subType || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : dropdownType === 'owner' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                      required
                    >
                      <option value="">Select Owner</option>
                      {(dropdownOptions.owner || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : dropdownType === 'status' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                    >
                      <option value="">Select Status</option>
                      <option value="Not Started">Not Started</option>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  ) : dropdownType === 'priority' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                    >
                      <option value="">Select Priority</option>
                      <option value="V High">V High</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  ) : isDateField(col) ? (
                    <input
                      type="date"
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                    />
                  ) : col.key === 'comments' ? (
                    <textarea
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                      placeholder={`Enter ${col.label.toLowerCase()}`}
                      rows="3"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[col.key] || ''}
                      onChange={e => handleChange(col.key, e.target.value)}
                      placeholder={`Enter ${col.label.toLowerCase()}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
