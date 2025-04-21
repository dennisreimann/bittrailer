import { readdir, readFile, writeFile } from 'fs/promises'
import { basename, extname, join, resolve } from 'path'
import { fileExists, slug } from './helpers.mjs'

const indexFile = `./generated/_index.json`

const processFile = async filePath => {
  const ext = extname(filePath)
  if (ext != '.jsonl') return []
  const name = basename(filePath, ext).replace(/-labels$/g, '')
  const str = await readFile(filePath, 'utf8')
  return str.split('\n').filter(j => !!j).reduce((acc, s) => {
    const d = JSON.parse(s)
    d.wallet = name
    // exclude xpub entries
    if (d.origin) acc.push(d)
    return acc
  }, [])
}

export const buildIndex = async directoryPath => {
  // get and process files
  const files = await readdir(directoryPath)
  const promises = files.map(file => processFile(join(directoryPath, file)))
  const allResults = await Promise.all(promises)
  // flatten and index by type
  const index = allResults.flat().reduce((acc, r) => {
    const { type, ref, origin, keypath } = r
    // group by type
    acc[type] = acc[type] || {}
    // index per type
    if (type === 'tx') {
      // by txid
      acc[type][ref] = acc[type][ref] || []
      acc[type][ref].push(r)
    } else if (type === 'input') {
      // by txid + vout
      const [txid, vout] = ref.split(':')
      acc[type][txid] = acc[type][txid] || {}
      acc[type][txid][vout] = r
    } else {
      // by origin + keypath
      acc[type][`${origin}:${keypath}`] = r
    }
    return acc
  }, {})
  // write and return index
  await writeFile(indexFile, JSON.stringify(index, null, 2))
  return index
}

// returns cached index or builds new one
export const getIndex = async directoryPath =>
  await fileExists(indexFile)
    ? (await import(indexFile, { with: { type: 'json' } })).default
    : await buildIndex(directoryPath)
