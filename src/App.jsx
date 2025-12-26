import React, { useEffect, useState } from 'react'
import OwnerTabs from './components/OwnerTabs'
import AdminView from './components/AdminView'
import EditModal from './components/EditModal'
import { fetchActionItems } from './services/dataService'

export default function App() {
  const [data, setData] = useState([])
  const [columns, setColumns] = useState([])
  const [editingRow, setEditingRow] = useState(null)

  useEffect(() => {
    function onOpenEdit(e) {
      const { row, columns } = e.detail || {}
      setEditingRow({ row, columns })
    }
    window.addEventListener('open-edit', onOpenEdit)
    return () => window.removeEventListener('open-edit', onOpenEdit)
  }, [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      const result = await fetchActionItems()
      if (!mounted) return
      if (result && result.rows) {
        setData(result.rows)
        setColumns(result.columns || [])
      } else if (Array.isArray(result)) {
        setData(result)
        setColumns([])
      }
      setLoading(false)
    }
    fetchData()
    return () => { mounted = false }
  }, [])

  return (
    <div className="app">
      <header>
        <h1>Action Tracker Pro</h1>
      </header>
      <main>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <OwnerTabs data={data} columns={columns} owners={["Florence","Dan","Kams","Sunny","Admin"]} />
          </>
        )}
      </main>
      {editingRow && (
        <EditModal row={editingRow.row} columns={editingRow.columns || columns} onClose={() => setEditingRow(null)} onSave={async (updated) => {
          try {
            await (await import('./services/dataService')).updateActionItem(editingRow.row.id, updated)
            setEditingRow(null)
            // refresh data
            const result = await fetchActionItems()
            if (result && result.rows) { setData(result.rows); setColumns(result.columns || []) }
          } catch (err) { alert('Update failed: '+err) }
        }} />
      )}
    </div>
  )
}
