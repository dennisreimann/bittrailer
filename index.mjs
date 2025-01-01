import { readdir, readFile, writeFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import { csv2json, json2csv } from 'json-2-csv'
import { convertToSats } from './helpers.mjs'

const { SPARROW_EXPORTS_PATH } = process.env

const directoryPath = process.argv[2] || SPARROW_EXPORTS_PATH

async function processFile(filePath) {
  const ext = extname(filePath)
  if (ext != '.csv') return []
  const name = basename(filePath, ext)
  const csv = await readFile(filePath, 'utf8')
  return csv2json(csv.trim()).map(row => {
    // remove balance
    delete row.Balance
    // assign filename as wallet name
    row.Wallet = name
    // ensure string label
    row.Label = row.Label ? row.Label.toString() : null
    // ensure sats as standard value
    row.Value = row.Value ? convertToSats(row.Value) : null
    row.Fee = row.Fee ? convertToSats(row.Fee) : null
    // ensure unified date object
    if (row['Date (UTC)']) {
      const dt = new Date(row['Date (UTC)'] + 'Z')
      dt.setHours(dt.getHours() + 2)
      row.Date = dt.toISOString().substring(0,16).replace('T', ' ')
      delete row['Date (UTC)']
    }
    return row
  })
}

;(async function() {
  // get and process files
  const files = await readdir(directoryPath)
  const promises = files.map(file => processFile(join(directoryPath, file)))
  const allResults = await Promise.all(promises)
  // flatten and group by txid
  const sorted = allResults.flat().sort((a, b) => new Date(a.Date) - new Date(b.Date))
  const data = sorted.reduce((acc, row) => {
    if (!acc[row.Txid]) acc[row.Txid] = []
    acc[row.Txid].push(row)
    return acc
  }, {})
  // write index
  await writeFile(join('generated', 'index.json'), JSON.stringify(data, null, 2))
  await writeFile(join('generated', 'index.csv'), json2csv(data, { emptyFieldValue: '' }))
})()
