import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getMempoolSpaceData, writeMermaidFile } from './helpers.mjs'

const outpoint = process.argv[2]

const filterInputs = inputs => inputs.length > 1
  ? inputs.find(i => i.Value < 0)
  : inputs[0]

const getData = async (txid, vout, index, level) => {
  console.group(`${txid}:${vout}`)

  const entries = index[txid] || []
  if (!entries.length) {
    console.warn('not in index')
    console.groupEnd()
    return null
  }

  const mempoolData = await getMempoolSpaceData(txid)
  if (!entries.length) {
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

  const data = { ...entry, Vout: parseInt(vout), Confirmed: mempoolData.Confirmed.Blockheight, Address: mempoolData.Outputs[vout].Address }
  const inputs = []
  for (const input of mempoolData.Inputs) {
    // check if we know about this input
    const txInput = filterInputs(index[input.Txid] || [])
    // if so, get their data from the index as well
    if (!txInput) continue
    const inputData = await getData(txInput.Txid, input.Vout, index, level + 1)
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
  await writeFile(join('generated', `${txId}_${vout}.json`), JSON.stringify(data, null, 2))

  // mermaid
  await writeMermaidFile(data)
})()
