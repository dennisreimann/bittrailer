import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getMempoolSpaceData, writeMermaidFile, slug } from './helpers.mjs'

const outpoint = process.argv[2]
const title = process.argv[3] || outpoint
const lvl = process.argv[4] || 50

const filterInputs = inputs => inputs.length > 1
  ? inputs.find(i => i.Value < 0)
  : inputs[0]

const findInputs = (txs, input) => {
  let inp = txs.find(tx => tx.Value + (tx.Fee || 0) == input.Value)
  // lookup with tolerance
  if (!inp) inp = txs.find(tx => {
    const val = tx.Value + (tx.Fee || 0)
    return val + 1 == input.Value || val - 1 == input.Value
  })
  // fallback to simple transaction lookup
  if (!inp) inp = filterInputs(txs)
  return inp
}

const getData = async (txid, vout, index, level) => {
  if (level > lvl) {
    console.warn('max level reached')
    return null
  }

  const group = vout ? `${txid}:${vout}` : txid
  console.group(group)

  const entries = index[txid] || []
  if (!entries.length) {
    console.warn('not in index')
    console.groupEnd()
    return null
  }

  const mempoolData = await getMempoolSpaceData(txid)
  if (!mempoolData) {
    console.warn('no mempool data')
    console.groupEnd()
    return null
  }

  const entry = filterInputs(entries)
  if (!entry) {
    console.warn('no matching entry')
    console.groupEnd()
    return null
  }
  console.log('Input from', entry.Wallet, '-', entry.Label || 'no label')

  const v = vout ? parseInt(vout) : 0
  const data = { ...entry, Confirmed: mempoolData.Confirmed.Blockheight, Vout: v, Address: mempoolData.Outputs[v].Address }

  const inputs = []
  for (const input of mempoolData.Inputs) {
    // check if we know about this input
    if (!index[input.Txid]) continue
    const txInput = findInputs(index[input.Txid] || [], input)
    // if so, get their data from the index as well
    if (!txInput) continue
    const inputData = await getData(txInput.Txid, input.Vout, index, level + 1)
    if (!inputData) continue

    inputData.Value = input.Value
    inputs.push(inputData)
  }
  if (inputs.length) {
    data.Inputs = inputs
  }
  console.groupEnd()
  return data
}

;(async function() {
  let index = []
  try {
    const json = await import('./generated/index.json', { with: { type: 'json' } })
    index = json.default
  } catch (e) {
    console.error('No index. Run "npm run index SPARROW_EXPORTS_PATH" first.', e)
    process.exit(1)
  }

  const [txId, vout] = outpoint.split(':')
  const data = await getData(txId, vout, index, 0)
  if (!data) process.exit(1)

  // write result to file
  data.title = title
  const filename = slug(title)
  await writeFile(join('generated', `${filename}.json`), JSON.stringify(data, null, 2))

  // mermaid
  await writeMermaidFile(data)
})()
