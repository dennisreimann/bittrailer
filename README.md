# Bittrailer

Find UTXO trails across Sparrow wallet exports

Requirements:

- [Node.js](https://nodejs.org/)

Usage:

```bash
# Build index
node index.mjs SPARROW_EXPORTS_PATH

# Lookup UTXO
node lookup.mjs TXID [TITLE] [MAX_DEPTH]
node lookup.mjs TXID:VOUT [TITLE] [MAX_DEPTH]

# Generate graph
node mermaid.mjs JSON_FILENAME
```
