import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { run } from "@mermaid-js/mermaid-cli"

const { MEMPOOL_SPACE_BASE_URL } = process.env
const MP_CACHE = {}

const mmdConfig = { backgroundColor: 'transparent', htmlLabels: false, puppeteerConfig: { headless: 'new' } }

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
    Inputs: inputs.map(i => ({ Txid: i.txid, Vout: i.vout, Value: i.prevout.value })),
    Outputs: outputs.map(o => ({ Address: o.scriptpubkey_address, Value: o.value })),
    Confirmed: confirmed ? { Blockheight: block_height, Date: new Date(block_time * 1000) } : false
  }
}

const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^-+|-+$/g, '')
const truncateCenter = (str, len = 7) => str.length <= len * 2 ? str : `${str.slice(0, len)}…${str.slice(-len)}`

const toMermaid = (data, parent) => {
  let mermaid = ''
  const txId = `T_${data.Txid}_${data.Vout}`
  const clss = parent ? `${(data.Inputs ? 'tx' : 'txin')} --> ${parent}` : 'txout'
  const comment = `${Math.abs(data.Value)} sats` +
    (data.Fee ? `<br>(-${data.Fee} sats fee)` : '') +
    (data.Address ? `<br>to ${truncateCenter(data.Address)}` : '') +
    (data.Label ? `<br><br><strong>${data.Wallet}</strong><br>${data.Inputs ? 'to: ' : 'from: '} ${data.Label} 🏷` : '')
  mermaid += `
    ${txId}("<strong>${data.Confirmed}</strong><br>${data.Date}<br/>${truncateCenter(data.Txid)}:${data.Vout}<br><br>${comment}"):::${clss}
    click ${txId} href "tx/${data.Txid}"`
  if (data.Inputs) {
    for (const input of data.Inputs) {
      mermaid += toMermaid(input, txId)
    }
  }
  return mermaid
}

export const writeMermaidFile = async data => {
  const title = data.title || `${data.Txid}:${data.Vout}`
  const mmd = `---
  title: "${title}"
  config:
    maxTextSize: 999999999
---
  flowchart BT
    classDef txout stroke:#f00
    classDef txin stroke:#0f0`  + toMermaid(data)
  const _html = await readFile('./template.html', 'utf8')
  const html = _html.replace('#TITLE#', title).replace('#TMPL#',mmd).replace('#BASE#',MEMPOOL_SPACE_BASE_URL)
  const name = title || `${data.Txid}_${data.Vout}`
  await mkdir(join('generated', 'mmd'), { recursive: true })
  await mkdir(join('generated', 'svg'), { recursive: true })
  await mkdir(join('generated', 'html'), { recursive: true })
  await writeFile(join('generated', 'mmd', `${name}.mmd`), mmd)
  await writeFile(join('generated', 'html', `${name}.html`), html)
  await run(join('generated', 'mmd', `${name}.mmd`), join('generated', 'svg', `${name}.svg`), mmdConfig)
}

export const satsToBtc = value => parseInt(value, 10) / 100000000
export const btcToSats = value => parseInt(value * 100000000, 10)
export const convertToSats = value => value.toString().includes('.') ? btcToSats(parseFloat(value)) : parseInt(value, 10)
