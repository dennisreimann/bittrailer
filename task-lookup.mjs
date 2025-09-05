import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getIndex } from './index.mjs'
import { writeMermaidFile, slug } from './helpers.mjs'

const outpoint = process.argv[2]
const title = process.argv[3] || outpoint
const lvl = process.argv[4] || 99
const index = await getIndex(process.env.SPARROW_EXPORTS_PATH)

const getData = async (txid, vout, level) => {
  if (level > lvl) return console.warn('max level reached')
  // lookup transaction
  console.group(vout ? `${txid}:${vout}` : txid)
  const txs = index.tx[txid] || []
  if (!txs.length) {
    console.warn('not in index')
    console.groupEnd()
    return null
  }

  const txIn = txs.find(tx => tx.value >= 0)
  const txOut = txs.find(tx => tx.value < 0)
  const tx = txOut || txIn
  console.log('Wallet:', tx.wallet)
  if (tx.label) console.log('Label:', tx.label)
  // iterate inputs and recurse
  const data = { ...tx }
  const inputs = index.input[tx.ref] ? Object.values(index.input[tx.ref]) : []
  if (inputs.length > 0) {
    console.group('Inputs:', inputs.length)
    data.inputs = inputs
    for (const input of data.inputs) {
      // check if we know about this input
      const outpoint = index.output[`${input.origin}:${input.keypath}`]
      if (!outpoint) continue
      // if so, get their data from the index as well
      const [oTxid, oVout] = outpoint.ref.split(':')
      const outpointTx = await getData(oTxid, oVout, level + 1)
      if (outpointTx) outpoint.tx = outpointTx
      // address
      const address = index.addr[`${input.origin}:${input.keypath}`]
      if (address) input.address = address
      input.outpoint = outpoint
    }
    console.groupEnd()
  }
  console.groupEnd()
  return data
}

;(async function() {
  const [txid, vout] = outpoint.split(':')
  const data = await getData(txid, vout, 0)
  if (!data) process.exit(1)
  // write result to file
  const id = slug(outpoint)
  const res = { id, title, slug: slug(title),  data }
  await writeFile(join('generated', `${id}.json`), JSON.stringify(res, null, 2))
  // mermaid
  await writeMermaidFile(res)
})()
