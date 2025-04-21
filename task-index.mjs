import { buildIndex } from './index.mjs'

const { SPARROW_EXPORTS_PATH } = process.env

const directoryPath = process.argv[2] || SPARROW_EXPORTS_PATH

;(async function() { await buildIndex(directoryPath) })()
