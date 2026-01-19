import React, { useMemo, useState } from 'react'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function Dashboard({ rows }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState([])
  const [modalTitle, setModalTitle] = useState('')

  // Calculate KPIs
  const kpis = useMemo(() => {
    const allTasks = rows.length
    const notStarted = rows.filter(r => r.status?.toLowerCase().includes('not started') || r.status?.toLowerCase().includes('open'))
    const inProgress = rows.filter(r => r.status?.toLowerCase().includes('in progress') || r.status?.toLowerCase().includes('inprogress'))
    const completed = rows.filter(r => r.status?.toLowerCase().includes('completed') || r.status?.toLowerCase().includes('done') || r.status?.toLowerCase().includes('closed'))
    
    return { 
      allTasks, 
      notStarted: { count: notStarted.length, items: notStarted },
      inProgress: { count: inProgress.length, items: inProgress },
      completed: { count: completed.length, items: completed }
    }
  }, [rows])

  const handleCardClick = (title, items) => {
    setModalTitle(title)
    setModalData(items)
    setShowModal(true)
  }

  // Tasks by Status (Pie Chart)
  const tasksByStatus = useMemo(() => {
    const statusCounts = {
      'Not Started': 0,
      'In Progress': 0,
      'Completed': 0
    }
    
    rows.forEach(r => {
      const status = (r.status || '').toLowerCase()
      if (status.includes('not started') || status.includes('open')) {
        statusCounts['Not Started']++
      } else if (status.includes('in progress') || status.includes('inprogress')) {
        statusCounts['In Progress']++
      } else if (status.includes('completed') || status.includes('done') || status.includes('closed')) {
        statusCounts['Completed']++
      }
    })

    const labels = Object.keys(statusCounts)
    const data = Object.values(statusCounts)
    const total = data.reduce((a, b) => a + b, 0)

    return {
      labels: labels.map((label, i) => `${label}: ${((data[i] / total) * 100).toFixed(1)}%`),
      datasets: [{
        data,
        backgroundColor: [
          '#ef4444', // red - Not Started
          '#f59e0b', // orange - In Progress
          '#10b981', // green - Completed
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }, [rows])

  // Deliveries by User (Bar Chart)
  const deliveriesByUser = useMemo(() => {
    const userCounts = {}
    rows.forEach(r => {
      const user = r.user || r.owner || 'Unassigned'
      userCounts[user] = (userCounts[user] || 0) + 1
    })

    const sortedUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1])
    
    return {
      labels: sortedUsers.map(([user]) => user),
      datasets: [{
        label: 'Tasks Count',
        data: sortedUsers.map(([, count]) => count),
        backgroundColor: [
          '#3b82f6',
          '#ef4444',
          '#f59e0b',
          '#10b981',
          '#8b5cf6',
          '#ec4899',
          '#14b8a6',
          '#f97316'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }, [rows])

  // Overdue Tasks (Bar Chart)
  const overdueTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const parseDate = (v) => {
      if (!v) return null
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = new Date(v + 'T00:00:00')
        if (!isNaN(d)) return d
      }
      const d = new Date(v)
      if (!isNaN(d)) return d
      const parts = String(v).split('/')
      if (parts.length === 3) {
        const [m, day, y] = parts.map(p => parseInt(p, 10))
        if (!isNaN(m) && !isNaN(day) && !isNaN(y)) return new Date(y, m - 1, day)
      }
      return null
    }

    const statusCounts = {
      'Completed': 0,
      'Not Started': 0,
      'In Progress': 0,
      'Stuck': 0,
      'Other': 0
    }

    rows.forEach(r => {
      const deadline = parseDate(r.deadline)
      if (deadline && deadline < today) {
        const status = r.status || 'Other'
        if (status.toLowerCase().includes('completed') || status.toLowerCase().includes('done')) {
          statusCounts['Completed']++
        } else if (status.toLowerCase().includes('not started')) {
          statusCounts['Not Started']++
        } else if (status.toLowerCase().includes('in progress')) {
          statusCounts['In Progress']++
        } else if (status.toLowerCase().includes('stuck') || status.toLowerCase().includes('blocked')) {
          statusCounts['Stuck']++
        } else {
          statusCounts['Other']++
        }
      }
    })

    return {
      labels: Object.keys(statusCounts),
      datasets: [{
        label: 'Overdue Tasks',
        data: Object.values(statusCounts),
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }, [rows])

  // Priority Tasks (Bar Chart)
  const priorityTasks = useMemo(() => {
    const priorityCounts = {
      'V High': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    }
    
    rows.forEach(r => {
      const priority = (r.priority || '').toLowerCase().trim()
      if (priority.includes('v high') || priority === 'v high' || priority === 'vhigh') {
        priorityCounts['V High']++
      } else if (priority === 'high' || priority === 'high priority') {
        priorityCounts['High']++
      } else if (priority === 'medium' || priority === 'med') {
        priorityCounts['Medium']++
      } else if (priority === 'low' || priority === 'low priority') {
        priorityCounts['Low']++
      }
    })

    const labels = ['V High', 'High', 'Medium', 'Low']
    const data = labels.map(label => priorityCounts[label])

    return {
      labels,
      datasets: [{
        label: 'Tasks by Priority',
        data,
        backgroundColor: [
          '#ef4444', // red - V High
          '#f59e0b', // orange - High
          '#3b82f6', // blue - Medium
          '#10b981'  // green - Low
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }, [rows])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 12,
          font: { size: 11, weight: '600' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    }
  }

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 11, weight: '600' } },
        grid: { color: '#e5e7eb' }
      },
      x: {
        ticks: { font: { size: 11, weight: '600' } },
        grid: { display: false }
      }
    }
  }

  return (
    <div style={{ padding: '20px', background: '#E1DFE1', minHeight: '100vh' }}>
      {/* Tab Navigation */
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'dashboard' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#f3f4f6',
            color: activeTab === 'dashboard' ? 'white' : '#4b5563',
            fontWeight: '700',
            fontSize: '15px',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'dashboard' ? '0 4px 6px rgba(59, 130, 246, 0.3)' : 'none',
            transform: activeTab === 'dashboard' ? 'translateY(-2px)' : 'none'
          }}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'calendar' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#f3f4f6',
            color: activeTab === 'calendar' ? 'white' : '#4b5563',
            fontWeight: '700',
            fontSize: '15px',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'calendar' ? '0 4px 6px rgba(59, 130, 246, 0.3)' : 'none',
            transform: activeTab === 'calendar' ? 'translateY(-2px)' : 'none'
          }}
        >
          📅 Calendar View
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* KPI Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            <KPICard title="All Tasks" value={kpis.allTasks} color="#3b82f6" icon="📋" />
            <KPICard 
              title="Not Started" 
              value={kpis.notStarted.count} 
              color="#ef4444" 
              icon="🔴" 
              onClick={() => handleCardClick('Not Started Tasks', kpis.notStarted.items)}
              clickable={true}
            />
            <KPICard 
              title="In Progress" 
              value={kpis.inProgress.count} 
          color="#f59e0b" 
          icon="⚡" 
          onClick={() => handleCardClick('In Progress Tasks', kpis.inProgress.items)}
          clickable={true}
        />
        <KPICard title="Completed" value={kpis.completed.count} color="#10b981" icon="✅" />
      </div>

      {/* Charts Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', 
        gap: '24px' 
      }}>
        {/* Tasks by Status Pie Chart */}
        <ChartCard title="Tasks by status">
          <div style={{ height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '300px', height: '300px' }}>
              <Pie data={tasksByStatus} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { ...chartOptions.plugins.legend, position: 'right' } } }} />
            </div>
          </div>
        </ChartCard>

        {/* Deliveries by User Bar Chart */}
        <ChartCard title="Deliveries by User">
          <div style={{ height: '320px' }}>
            <Bar data={deliveriesByUser} options={barChartOptions} />
          </div>
        </ChartCard>

        {/* Overdue Tasks Bar Chart */}
        <ChartCard title="Overdue tasks">
          <div style={{ height: '320px' }}>
            <Bar data={overdueTasks} options={barChartOptions} />
          </div>
        </ChartCard>

        {/* Priority Tasks Bar Chart */}
        <ChartCard title="Priority Tasks">
          <div style={{ height: '320px' }}>
            <Bar data={priorityTasks} options={barChartOptions} />
          </div>
        </ChartCard>
      </div>
        </>
      )}

      {activeTab === 'calendar' && (
        <CalendarView rows={rows} />
      )}

      {/* Modal for Task Details */}
      {showModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }} onClick={() => setShowModal(false)}>
          <div style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            width: '90%', 
            maxWidth: '900px', 
            maxHeight: '80vh', 
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '3px solid #3b82f6', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{modalTitle}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '32px', cursor: 'pointer', color: '#6b7280', fontWeight: 'bold' }}>×</button>
            </div>

            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff' }}>
                    <th style={{ border: '2px solid #e5e7eb', padding: '14px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Deliverable</th>
                    <th style={{ border: '2px solid #e5e7eb', padding: '14px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Date</th>
                    <th style={{ border: '2px solid #e5e7eb', padding: '14px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Business</th>
                    <th style={{ border: '2px solid #e5e7eb', padding: '14px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Process</th>
                    <th style={{ border: '2px solid #e5e7eb', padding: '14px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {modalData.map((item, index) => (
                    <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ border: '2px solid #e5e7eb', padding: '12px', fontWeight: '500' }}>{item.deliverable || '-'}</td>
                      <td style={{ border: '2px solid #e5e7eb', padding: '12px' }}>{item.deadline || item.createDate || item.Date || '-'}</td>
                      <td style={{ border: '2px solid #e5e7eb', padding: '12px' }}>{item.business || '-'}</td>
                      <td style={{ border: '2px solid #e5e7eb', padding: '12px' }}>{item.process || '-'}</td>
                      <td style={{ border: '2px solid #e5e7eb', padding: '12px' }}>{item.user || item.owner || '-'}</td>
                    </tr>
                  ))}
                  {modalData.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ border: '2px solid #e5e7eb', padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DeliverableDetailsModal({ deliverables, status, onClose }) {
  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('completed') || s.includes('done') || s.includes('closed')) return '#10b981'
    if (s.includes('in progress') || s.includes('inprogress')) return '#f59e0b'
    if (s.includes('not started') || s.includes('open')) return '#ef4444'
    return '#6b7280'
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '1000px',
        width: '90%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: `3px solid ${getStatusColor(status)}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>Deliverable Details</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: `${getStatusColor(status)}20`, border: `2px solid ${getStatusColor(status)}` }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getStatusColor(status) }}></div>
                <span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>{status}</span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>{deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef4444'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            ✕ Close
          </button>
        </div>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          {deliverables.map((item, index) => (
            <div key={index} style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Business</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{item.business || item.Business || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Business Type</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{item.businessType || item['Business Type'] || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Process</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{item.process || item.Process || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Process Sub Type</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{item.processSubType || item['Process Sub Type'] || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimated Time</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{item.estimatedTime || item['Estimated Time'] || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    color: (item.priority || item.Priority || '').toLowerCase() === 'high' ? '#ef4444' : 
                           (item.priority || item.Priority || '').toLowerCase() === 'medium' ? '#f59e0b' : '#10b981'
                  }}>
                    {item.priority || item.Priority || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{item.deadline || item.Deadline || item.date || item.Date || 'N/A'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CalendarView({ rows }) {
  const [viewMode, setViewMode] = useState('monthly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedDeliverables, setSelectedDeliverables] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')

  const parseDate = (v) => {
    if (!v) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v + 'T00:00:00')
      if (!isNaN(d)) return d
    }
    const d = new Date(v)
    if (!isNaN(d)) return d
    const parts = String(v).split('/')
    if (parts.length === 3) {
      const [m, day, y] = parts.map(p => parseInt(p, 10))
      if (!isNaN(m) && !isNaN(day) && !isNaN(y)) return new Date(y, m - 1, day)
    }
    return null
  }

  const getTasksForDate = (date) => {
    return rows.filter(row => {
      const deadline = parseDate(row.deadline || row.Deadline)
      if (!deadline) return false
      return deadline.toDateString() === date.toDateString()
    })
  }

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('completed') || s.includes('done') || s.includes('closed')) return '#10b981'
    if (s.includes('in progress') || s.includes('inprogress')) return '#f59e0b'
    if (s.includes('not started') || s.includes('open')) return '#ef4444'
    return '#6b7280'
  }

  const getStatusCounts = (tasks) => {
    const counts = {}
    tasks.forEach(task => {
      const status = task.status || 'Unknown'
      counts[status] = (counts[status] || 0) + 1
    })
    return counts
  }

  const handleStatusClick = (tasks, status) => {
    const filteredTasks = tasks.filter(task => task.status === status)
    setSelectedDeliverables(filteredTasks)
    setSelectedStatus(status)
    setShowDetailsModal(true)
  }

  const renderMonthlyView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} style={{ minHeight: '120px', background: '#f9fafb', border: '1px solid #e5e7eb' }}></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const tasks = getTasksForDate(date)
      const statusCounts = getStatusCounts(tasks)
      const isToday = date.toDateString() === new Date().toDateString()

      days.push(
        <div key={day} style={{ 
          minHeight: '120px', 
          border: '2px solid #e5e7eb', 
          padding: '8px',
          background: isToday ? '#fef3c7' : '#fff',
          borderColor: isToday ? '#f59e0b' : '#e5e7eb',
          borderWidth: isToday ? '3px' : '1px',
          overflow: 'hidden'
        }}>
          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px', color: isToday ? '#f59e0b' : '#1e293b' }}>{day}</div>
          {tasks.length > 0 && <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#64748b' }}>{tasks.length} task{tasks.length > 1 ? 's' : ''}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {Object.entries(statusCounts).slice(0, 3).map(([status, count]) => (
              <div 
                key={status} 
                onClick={() => handleStatusClick(tasks, status)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '11px', 
                  padding: '3px 6px', 
                  borderRadius: '4px', 
                  background: `${getStatusColor(status)}20`, 
                  border: `1px solid ${getStatusColor(status)}`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }}></div>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{count}</span>
              </div>
            ))}
            {Object.keys(statusCounts).length > 3 && <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600', marginTop: '2px' }}>+{Object.keys(statusCounts).length - 3} more</div>}
          </div>
        </div>
      )
    }
    return days
  }

  const renderWeeklyView = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const tasks = getTasksForDate(date)
      const statusCounts = getStatusCounts(tasks)
      const isToday = date.toDateString() === new Date().toDateString()

      weekDays.push(
        <div key={i} style={{ border: '2px solid #e5e7eb', padding: '16px', background: isToday ? '#fef3c7' : '#fff', borderColor: isToday ? '#f59e0b' : '#e5e7eb', borderWidth: isToday ? '3px' : '2px' }}>
          <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '8px', color: isToday ? '#f59e0b' : '#1e293b' }}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          {tasks.length > 0 && <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>{tasks.length} deliverable{tasks.length > 1 ? 's' : ''}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div 
                key={status} 
                onClick={() => handleStatusClick(tasks, status)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '13px', 
                  padding: '6px 10px', 
                  borderRadius: '6px', 
                  background: `${getStatusColor(status)}20`, 
                  border: `2px solid ${getStatusColor(status)}`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getStatusColor(status) }}></div>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{status}: {count}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return weekDays
  }

  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'monthly') { newDate.setMonth(currentDate.getMonth() - 1) } 
    else { newDate.setDate(currentDate.getDate() - 7) }
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'monthly') { newDate.setMonth(currentDate.getMonth() + 1) } 
    else { newDate.setDate(currentDate.getDate() + 7) }
    setCurrentDate(newDate)
  }

  const goToToday = () => setCurrentDate(new Date())

  return (
    <div>
      {showDetailsModal && (
        <DeliverableDetailsModal 
          deliverables={selectedDeliverables}
          status={selectedStatus}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={goToPrevious} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>←</button>
          <button onClick={goToToday} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Today</button>
          <button onClick={goToNext} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>→</button>
          <h2 style={{ margin: '0 0 0 16px', color: '#fff', fontSize: '24px', fontWeight: '700' }}>
            {viewMode === 'monthly' ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `Week of ${new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setViewMode('weekly')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: viewMode === 'weekly' ? '#fff' : 'rgba(255,255,255,0.3)', color: viewMode === 'weekly' ? '#667eea' : '#fff', fontWeight: '700', fontSize: '14px', boxShadow: viewMode === 'weekly' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>Weekly</button>
          <button onClick={() => setViewMode('monthly')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: viewMode === 'monthly' ? '#fff' : 'rgba(255,255,255,0.3)', color: viewMode === 'monthly' ? '#667eea' : '#fff', fontWeight: '700', fontSize: '14px', boxShadow: viewMode === 'monthly' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>Monthly</button>
        </div>
      </div>
      {viewMode === 'monthly' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0', marginBottom: '0' }}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} style={{ padding: '12px', textAlign: 'center', fontWeight: '700', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', fontSize: '14px', border: '1px solid #2563eb' }}>{day}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0', border: '2px solid #e5e7eb' }}>{renderMonthlyView()}</div>
        </div>
      )}
      {viewMode === 'weekly' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>{renderWeeklyView()}</div>}
    </div>
  )
}

function KPICard({ title, value, color, icon, onClick, clickable }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: `3px solid ${color}`,
      boxShadow: `0 8px 16px ${color}33`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: clickable ? 'pointer' : 'default'
    }}
    onClick={clickable ? onClick : undefined}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = clickable ? 'translateY(-6px) scale(1.02)' : 'translateY(-4px)'
      e.currentTarget.style.boxShadow = `0 12px 24px ${color}55`
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = `0 8px 16px ${color}33`
    }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textTransform: 'capitalize' }}>
        {title}
      </div>
      <div style={{ fontSize: '42px', fontWeight: '800', color, fontFamily: 'system-ui' }}>
        {value}
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      border: '2px solid #e5e7eb',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
      transition: 'box-shadow 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.12)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07)'
    }}
    >
      <h3 style={{ 
        margin: '0 0 20px 0', 
        fontSize: '18px', 
        fontWeight: '700', 
        color: '#1e293b',
        borderBottom: '3px solid #3b82f6',
        paddingBottom: '12px'
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
