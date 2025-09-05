import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { run } from "@mermaid-js/mermaid-cli"

const { MEMPOOL_SPACE_BASE_URL } = process.env

const mmdConfig = { backgroundColor: 'transparent', htmlLabels: false, puppeteerConfig: { headless: 'new' } }

export const slug = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^-+|-+$/g, '')
export const truncateCenter = (str, len = 7) => str.length <= len * 2 ? str : `${str.slice(0, len)}…${str.slice(-len)}`
export const satsToBtc = value => parseInt(value, 10) / 100000000
export const btcToSats = value => parseInt(value * 100000000, 10)
export const convertToSats = value => value.toString().includes('.') ? btcToSats(parseFloat(value)) : parseInt(value, 10)
export const fileExists = async path => { access(path).then(() => true).catch(() => false) }

const dateFormat = new Intl.DateTimeFormat('de-DE', {dateStyle: 'short', timeStyle: 'short'})

const toMermaid = (data, parent) => {
  let mermaid = ''
  const [txid] = data.ref.split(':')
  const txId = `T_${slug(truncateCenter(txid))}`
  const clss = parent ? `${(data.inputs ? 'tx' : 'txin')} --> ${parent}` : 'txout'
  const fee = data.fee ? `<br/>Fee: <span data-s>${data.fee}</span> sats` : ''
  const label = data.label ? `<br/>Label: <span data-s>${data.label}</span>` : ''
  const date = dateFormat.format(new Date(data.time))
  mermaid += `

    ${txId}("<span data-s>${truncateCenter(txid)}</span><br/><strong data-s>${data.height}</strong><time data-s datetime="${data.time}">${date}</time><br/><span data-s>${Math.abs(data.value + (data.fee || 0))}</span> sats${fee}${label}"):::${clss}`
  if (MEMPOOL_SPACE_BASE_URL)
    mermaid += `
    click ${txId} href "tx/${txid}"`
  if (data.inputs) {
    for (const input of data.inputs) {
      const [, iVout] = input.ref.split(':')
      const voutId = `${txId}_${iVout}`
      const id = `<strong data-s>${truncateCenter(txid)}:${iVout}</strong><br/><br/>`
      const lbl = input.address.label ? `<br/>Label: <span data-s>${input.address.label}</span>` : ''
      const childTx = input.outpoint.tx
      mermaid += `
    ${voutId}(["<span data-s>${Math.abs(input.value)}</span> sats<br>Wallet: <span data-s>${input.wallet}</span>"]):::vout" --> ${txId}`
      if (childTx) mermaid += toMermaid(childTx, voutId)
    }
  }
  return mermaid
}

export const writeMermaidFile = async info => {
  const { id, title, slug, data } = info
  const mmd = `---
  title: "${title}"
  config:
    maxTextSize: 999999999
---
  flowchart BT
    classDef txout stroke:#f00
    classDef txin stroke:#0f0
    classDef tx stroke:#00f`  + toMermaid(data)
  const _html = await readFile('./template.html', 'utf8')
  const html = _html.replace('#TITLE#', title).replace('#TMPL#',mmd).replace('#BASE#', MEMPOOL_SPACE_BASE_URL || '')
  await mkdir(join('generated', 'mmd'), { recursive: true })
  await mkdir(join('generated', 'svg'), { recursive: true })
  await mkdir(join('generated', 'html'), { recursive: true })
  await writeFile(join('generated', 'html', `${slug}.html`), html)
  await writeFile(join('generated', 'mmd', `${id}.mmd`), mmd)
  await run(join('generated', 'mmd', `${id}.mmd`), join('generated', 'svg', `${id}.svg`), mmdConfig)
}
