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
        const { rows } = await fetchActionItems()
        
        // Extract unique values for each field
        const getUnique = (key) => {
          const values = rows
            .map(r => r[key])
            .filter(v => v && v.trim && v.trim() !== '')
          return [...new Set(values)].sort()
        }
        
        setDropdownOptions({
          business: getUnique('business'),
          businessType: getUnique('businessType'),
          process: getUnique('process'),
          subType: getUnique('subType'),
          owner: getUnique('owner')
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Action Item</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {editableColumns.map(col => (
              <div key={col.key} className="form-group">
                <label>{col.label}</label>
                {col.key === 'business' ? (
                  <select
                    value={formData[col.key] || ''}
                    onChange={e => handleChange(col.key, e.target.value)}
                  >
                    <option value="">Select Business</option>
                    {(dropdownOptions.business || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : col.key === 'businessType' ? (
                  <select
                    value={formData[col.key] || ''}
                    onChange={e => handleChange(col.key, e.target.value)}
                  >
                    <option value="">Select Business Type</option>
                    {(dropdownOptions.businessType || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : col.key === 'process' ? (
                  <select
                    value={formData[col.key] || ''}
                    onChange={e => handleChange(col.key, e.target.value)}
                  >
                    <option value="">Select Process</option>
                    {(dropdownOptions.process || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : col.key === 'subType' ? (
                  <select
                    value={formData[col.key] || ''}
                    onChange={e => handleChange(col.key, e.target.value)}
                  >
                    <option value="">Select Process Sub-type</option>
                    {(dropdownOptions.subType || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : col.key === 'owner' ? (
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
                ) : isDateField(col) ? (
                  <input
                    type="date"
                    value={formData[col.key] || ''}
                    onChange={e => handleChange(col.key, e.target.value)}
                  />
                ) : col.key === 'status' ? (
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
                ) : col.key === 'priority' ? (
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
            ))}
                  />
                )}
              </div>
            ))}
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
