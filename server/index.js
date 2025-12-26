import express from 'express'
import fs from 'fs'
import cors from 'cors'
import { BigQuery } from '@google-cloud/bigquery'
import path from 'path'
import process from 'process'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 5000

// Table reference: project.dataset.table
const TABLE_FULL = process.env.BQ_TABLE || 'gen-lang-client-0815432790.oberoiventures.actionitemstable'

// Initialize BigQuery client. It will pick up GOOGLE_APPLICATION_CREDENTIALS or
// you can set GOOGLE_APPLICATION_CREDENTIALS to the path of the service account JSON.
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'gen-lang-client-0815432790-07161bb65021.json')
const bq = new BigQuery({ keyFilename: credsPath })

app.get('/api/action-items', async (req, res) => {
  try {
    const [project, dataset, table] = TABLE_FULL.split('.')

    // Fetch table metadata (schema)
    const tableRef = bq.dataset(dataset, { projectId: project }).table(table)
    const [meta] = await tableRef.getMetadata()
    const fields = meta.schema && meta.schema.fields ? meta.schema.fields : []

    const columns = fields.map(f => ({ key: f.name, label: String(f.name).toUpperCase() }))

    // Query rows (limit to 1000 for safety)
    const query = `SELECT * FROM \`${project}.${dataset}.${table}\` LIMIT 1000`
    const [job] = await bq.createQueryJob({ query })
    const [rows] = await job.getQueryResults()

    res.json({ columns, rows })
  } catch (err) {
    console.error('Error fetching action-items from BigQuery', err)
    res.status(500).json({ error: String(err) })
  }
})

// Delete an item by id (expects id to uniquely identify row)
app.delete('/api/action-items/:id', async (req, res) => {
  try {
    const id = req.params.id
    const [project, dataset, table] = TABLE_FULL.split('.')
    const query = `DELETE FROM \`${project}.${dataset}.${table}\` WHERE id = @id`
    const [job] = await bq.createQueryJob({ query, params: { id } })
    await job.getQueryResults()
    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting action-item', err)
    res.status(500).json({ error: String(err) })
  }
})

// Update an item by id. Body should contain key/value pairs to update.
app.put('/api/action-items/:id', async (req, res) => {
  try {
    const id = req.params.id
    const updates = req.body || {}
    // Remove id if present
    delete updates.id

    const keys = Object.keys(updates)
    if (keys.length === 0) return res.status(400).json({ error: 'no fields to update' })

    const [project, dataset, table] = TABLE_FULL.split('.')
    const setClauses = keys.map((k, i) => `\`${k}\` = @p${i}`).join(', ')
    const params = {}
    keys.forEach((k, i) => { params[`p${i}`] = updates[k] })
    params.idParam = id

    const query = `UPDATE \`${project}.${dataset}.${table}\` SET ${setClauses} WHERE id = @idParam`
    const [job] = await bq.createQueryJob({ query, params })
    await job.getQueryResults()
    res.json({ success: true })
  } catch (err) {
    console.error('Error updating action-item', err)
    res.status(500).json({ error: String(err) })
  }
})

app.listen(PORT, () => {
  console.log(`Action Tracker API listening on http://localhost:${PORT}`)
  console.log(`Using table: ${TABLE_FULL}`)
  console.log(`Credentials: ${credsPath}`)
})

// Serve frontend static files (if built)
const distPath = path.join(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // serve index.html for any non-API routes (SPA)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}
