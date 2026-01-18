import React, { useMemo } from 'react'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function Dashboard({ rows }) {
  // Calculate KPIs
  const kpis = useMemo(() => {
    const allTasks = rows.length
    const inProgress = rows.filter(r => r.status?.toLowerCase().includes('in progress') || r.status?.toLowerCase().includes('inprogress')).length
    const stuck = rows.filter(r => r.status?.toLowerCase().includes('stuck') || r.status?.toLowerCase().includes('blocked')).length
    const done = rows.filter(r => r.status?.toLowerCase().includes('completed') || r.status?.toLowerCase().includes('done') || r.status?.toLowerCase().includes('closed')).length
    
    return { allTasks, inProgress, stuck, done }
  }, [rows])

  // Tasks by Status (Pie Chart)
  const tasksByStatus = useMemo(() => {
    const statusCounts = {}
    rows.forEach(r => {
      const status = r.status || 'Unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    const labels = Object.keys(statusCounts)
    const data = Object.values(statusCounts)
    const total = data.reduce((a, b) => a + b, 0)

    return {
      labels: labels.map((label, i) => `${label}: ${((data[i] / total) * 100).toFixed(1)}%`),
      datasets: [{
        data,
        backgroundColor: [
          '#10b981', // green - Completed
          '#3b82f6', // blue - Not Started
          '#f59e0b', // orange - In Progress
          '#ef4444', // red - Stuck
          '#8b5cf6', // purple
          '#ec4899', // pink
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
    const priorityCounts = {}
    rows.forEach(r => {
      const priority = r.priority || 'Unspecified'
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1
    })

    const priorityOrder = ['HIGH', 'High', 'Medium', 'Low', 'LOW', 'V High', 'V HIGH', 'MEDIUM']
    const sortedPriorities = Object.entries(priorityCounts).sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a[0])
      const bIndex = priorityOrder.indexOf(b[0])
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    return {
      labels: sortedPriorities.map(([priority]) => priority),
      datasets: [{
        label: 'Tasks by Priority',
        data: sortedPriorities.map(([, count]) => count),
        backgroundColor: [
          '#3b82f6',
          '#84cc16',
          '#06b6d4',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#10b981',
          '#ec4899',
          '#14b8a6'
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
    <div style={{ padding: '20px' }}>
      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <KPICard title="All Tasks" value={kpis.allTasks} color="#3b82f6" icon="📋" />
        <KPICard title="In progress" value={kpis.inProgress} color="#f59e0b" icon="⚡" />
        <KPICard title="Stuck" value={kpis.stuck} color="#ef4444" icon="🚫" />
        <KPICard title="Done" value={kpis.done} color="#10b981" icon="✅" />
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
    </div>
  )
}

function KPICard({ title, value, color, icon }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: `3px solid ${color}`,
      boxShadow: `0 8px 16px ${color}33`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)'
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
