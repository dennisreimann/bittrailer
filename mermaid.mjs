import { writeMermaidFile } from './helpers.mjs'

const outpoint = process.argv[2]

;(async function() {
  const [txId, vout] = outpoint.split(':')
  let data = null
  try {
    const json = await import(`./generated/${txId}_${vout}.json`, { with: { type: 'json' } })
    data = json.default
  } catch (e) {
    console.error(`No data. Run "npm run lookup ${txId}:${vout}" first.`)
    process.exit(1)
  }
  await writeMermaidFile(data)
})()
