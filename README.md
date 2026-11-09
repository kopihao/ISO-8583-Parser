# ISO 8583 Parser

A browser-based tool to parse, validate, and inspect ISO 8583 financial messages.
No installation. No backend. No internet required. Open the file and start parsing.

---

## What it does

Paste a raw ISO 8583 hex message and the tool breaks it down field by field.

- Decodes MTI, primary bitmap, and secondary bitmap
- Lists every active Data Element (DE) with its raw hex and a human-readable value
- Detects and flags corrupt or truncated fields without stopping the rest of the parse
- Formats amounts, dates, times, and card track data into readable text
- Masks PAN, Track 1, Track 2, and PIN Block by default (PCI-DSS safe)
- Reveals masked values on demand with the eye toggle
- Auto-detects and strips TPDU transport headers (5-byte and 7-byte)
- Accepts plain hex, spaced hex, and log-prefixed lines from device logs

---

## How to use

Paste your ISO 8583 hex message into the input box. The result appears instantly as you type.

Click the eye icon in the Representation column header to reveal masked values for your own inspection.

No build step. No dependencies. Works fully offline.

---

## Input formats accepted

All of these are valid input:

```
0200723C800128C000000000000000001600123456789012345600000000010000...
```

```
02 00 72 3C 80 01 28 C0 00 00 00 00 00 00 00 00
```

```
ISO Log 60 01 48 00 00 02 00 70 3C 80 01 28
ISO Log 00 00 00 00 00 00 00 16 00 12 34 56
```

Log lines with a ` - ` separator are also handled:

```
D - ISO Log - 60 01 48 00 00 02 00 70
```

---

## PCI masking

Masking is on by default. The masked view is safe to screenshot and share with your team.

| Field | Masked display |
|---|---|
| DE2 — PAN | `123456XXXXXXXX9012` |
| DE35 — Track 2 | PAN portion masked, service data visible |
| DE45 — Track 1 | PAN and cardholder name masked |
| DE52 — PIN Block | All bytes replaced with `X` |

---

## Field definitions

Field definitions follow ISO 8583:1987. All 128 Data Elements are covered.

The definitions live in `iso8583-parser.js` under `STD_ISO_BIT_FIELD`.
Each entry is a simple array: `[ DE, format, attribute, maxLength, name ]`.

To override fields for a specific use case, add entries to `CUSTOM_ISO_BIT_FIELD`
in the same file. Only the fields that differ from the standard need to be listed.
The rest fall back to the ISO baseline automatically.

---

## Files

| File | Purpose |
|---|---|
| `iso8583-parser.html` | The parser UI |
| `iso8583-parser.js` | All parsing, validation, and decoding logic |
| `index.html` | Redirects to `iso8583-parser.html` |

---

## Browser support

Any modern browser works. No polyfills needed.
The tool uses `BigInt` for bitmap operations, which is supported in all current browsers.

---

## License

MIT — see [LICENSE](LICENSE) for details.
