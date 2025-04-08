import { writeMermaidFile } from './helpers.mjs'

const filename = process.argv[2]

;(async function() {
  let data = null
  try {
    const json = await import(`./generated/${filename}.json`, { with: { type: 'json' } })
    data = json.default
  } catch (e) {
    console.error(`No data. Run "npm run lookup" first.`)
    process.exit(1)
  }
  await writeMermaidFile(data)
})()
