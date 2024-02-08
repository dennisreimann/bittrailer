import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const { MEMPOOL_SPACE_BASE_URL } = process.env
const MP_CACHE = {}

const getMempoolUrl = path => `${MEMPOOL_SPACE_BASE_URL || 'https://mempool.space'}/${path}`

const queryMempoolSpace = async apiPath => {
  if (typeof MP_CACHE[apiPath] == 'undefined') {
    const url = getMempoolUrl(`api/${apiPath}`)
    try {
      const res = await fetch(url)
      MP_CACHE[apiPath] = res.ok ? await res.json() : null
    } catch (e) {
      console.error('Error querying Mempool Space at', url, e.message)
      MP_CACHE[apiPath] = null
    }
  }
  return MP_CACHE[apiPath]
}

export const getMempoolSpaceData = async txId => {
  const txData = await queryMempoolSpace(`tx/${txId}`)
  if (!txData) return null
  const { vin: inputs, vout: outputs, status: { confirmed, block_height, block_time } } = txData
  return {
    Inputs: inputs.map(i => ({ Txid: i.txid, Vout: i.vout })),
    Outputs: outputs.map(o => ({ Address: o.scriptpubkey_address, Value: o.value })),
    Confirmed: confirmed ? { Blockheight: block_height, Date: new Date(block_time * 1000) } : false
  }
}

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^-+|-+$/g, '')
const truncateCenter = (str, len = 7) => str.length <= len * 2 ? str : `${str.slice(0, len)}…${str.slice(-len)}`

const toMermaid = (data, parent) => {
  let mermaid = ''
  const walletId = `W_${slug(data.Wallet)}_${data.Txid}`
  const txId = `T_${data.Txid}`
  const from = data.Inputs ? `${walletId}["${data.Wallet}"]:::wallet` : `in_${data.Txid}[\\"${data.Label}"/]:::incoming`
  const dest = parent || `out_${data.Txid}[/"${data.Label}"\\]:::outgoing`
  const comment = `${Math.abs(data.Value)} sats` +
    (data.Fee ? ` (${data.Fee} sats fee)` : '') +
    (data.Address ? `<br/>to ${truncateCenter(data.Address)}` : '') +
    (data.Label ? `<br/><br/>🏷 ${data.Label}` : '')
  mermaid += `
      ${from} --- ${txId}("${truncateCenter(data.Txid)}:${data.Vout}<br><br>${comment}"):::tx
      ${txId} -- "<strong>${data.Confirmed}</strong><br>${data.Date}" --> ${dest}
      click ${txId} href "${getMempoolUrl(`tx/${data.Txid}`)}" _blank`
  if (data.Inputs) {
    for (const input of data.Inputs) {
      mermaid += toMermaid(input, walletId)
    }
  }
  return mermaid
}

export const writeMermaidFile = async data => {
  const title = `${data.Txid}:${data.Vout}`
  const mermaid = `
  ---
  title: "${title}"
  ---
  flowchart BT
      classDef outgoing stroke:#f00
      classDef incoming stroke:#0f0
      classDef wallet stroke:#00f` + toMermaid(data)
  const template = await readFile('./template.html', 'utf8')
  const html = template.replace('#TITLE#', title).replace('#TMPL#', mermaid)
  await writeFile(join('generated', 'html', `${data.Txid}_${data.Vout}.html`), html)
}

export const satsToBtc = value => parseInt(value, 10) / 100000000
export const btcToSats = value => parseInt(value * 100000000, 10)
export const convertToSats = value => value.toString().includes('.') ? btcToSats(parseFloat(value)) : parseInt(value, 10)
