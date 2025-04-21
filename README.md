# Bittrailer

Find UTXO trails across Sparrow wallet label exports (BIP 329).

Requirements:

- [Node.js](https://nodejs.org/)

Usage:

```bash
# Set path for export directory
export SPARROW_EXPORTS_PATH="../sparrow-labels"

# Build index
npm run index

# Lookup UTXO trail
npm run lookup TXID [TITLE] [MAX_DEPTH]
npm run lookup TXID:VOUT [TITLE] [MAX_DEPTH]

# Start server to look at graphs
npm start
```
