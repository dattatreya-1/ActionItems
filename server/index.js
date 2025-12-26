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

// Initialize BigQuery client.
// Behavior:
// - If the env var GOOGLE_APPLICATION_CREDENTIALS is set (pointing to a JSON key file),
//   the client will use that file via `keyFilename` (useful for local development).
// - If the env var is NOT set, the client will be constructed without explicit credentials
//   and will use Application Default Credentials (ADC). This allows Cloud Run to
//   provide credentials via its runtime service account (no JSON key required).
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
let bq
if (credsPath) {
  bq = new BigQuery({ keyFilename: credsPath })
} else {
  // No key file provided; rely on ADC (works on Cloud Run when a service account is attached)
  bq = new BigQuery()
}

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
  if (credsPath) {
    // Do not print the full path or contents of the credentials file to avoid exposing
    // sensitive information in logs. Only indicate that the env var is set.
    console.log('GOOGLE_APPLICATION_CREDENTIALS is set (key file detected)')
  } else if (process.env.K_SERVICE) {
    console.log('No GOOGLE_APPLICATION_CREDENTIALS found. Running on Cloud Run (K_SERVICE detected) and using ADC via the Cloud Run service account.')
  } else {
    console.log('No GOOGLE_APPLICATION_CREDENTIALS found. Using Application Default Credentials (ADC).')
  }
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
