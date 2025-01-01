# Bittrailer

Find UTXO trails across Sparrow wallet exports

Requirements:

- [Node.js](https://nodejs.org/)

Usage:

```bash
# Build index
node index.mjs SPARROW_EXPORTS_PATH

# Lookup UTXO
node lookup.mjs TXID
node lookup.mjs TXID:VOUT
```
