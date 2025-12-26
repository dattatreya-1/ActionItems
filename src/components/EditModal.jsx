import React, { useState } from 'react'

export default function EditModal({ row, columns = [], onClose, onSave }) {
  const [form, setForm] = useState({ ...row })

  const editableCols = columns.filter(c => c.key !== 'actions')

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Edit {row.id}</h3>
        <div className="modal-body">
          {editableCols.map(col => {
            const raw = form[col.key]
            const value = (raw === null || raw === undefined) ? '' : (typeof raw === 'object' ? (raw.value ?? JSON.stringify(raw)) : raw)
            return (
              <label key={col.key}>
                <div className="label">{col.label}</div>
                {col.key === 'deadline' ? (
                  <input type="date" value={value} onChange={e => setForm({ ...form, [col.key]: e.target.value })} />
                ) : col.key === 'min' ? (
                  <input type="number" value={value} onChange={e => setForm({ ...form, [col.key]: e.target.value })} />
                ) : (
                  <input value={value} onChange={e => setForm({ ...form, [col.key]: e.target.value })} />
                )}
              </label>
            )
          })}
        </div>
        <div className="modal-actions">
          <button onClick={() => onSave(form)} className="action-btn">Save</button>
          <button onClick={onClose} className="action-btn">Cancel</button>
        </div>
      </div>
    </div>
  )
}
