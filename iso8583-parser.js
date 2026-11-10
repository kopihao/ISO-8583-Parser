// iso8583_fields.js
// ─────────────────────────────────────────────────────────────────────────────
// Field definition format: [ DE, fmt, attr, maxLen, name ]
//
// fmt  : F=Fixed, LLVAR, LLLVAR
// attr : NUM=NUMERIC(BCD), TRK=TRACKX, AN=ALPHANUM, ANS=ALPHANUMS, BITS=binary
// len  : byte length for Fixed; max digit count for VAR fields
//
// Length prefix encoding : BCD  (1 byte for LL, 2 bytes for LLL)
// NUMERIC fields         : BCD-packed — 2 digits per byte
// BITS fields            : raw binary — hex display only, no ASCII decode
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// datetime hint constants — not a fmt, used by DATETIME_MAP in decodeField
// ─────────────────────────────────────────────────────────────────────────────
const MDHMS  = 'MDHMS';   // MMDDhhmmss
const MMDD   = 'MMDD';    // MMDD
const YYMM   = 'YYMM';    // YYMM
const HHMMSS = 'HHMMSS';  // hhmmss
const YYMMDD = 'YYMMDD';  // YYMMDD

// ─────────────────────────────────────────────────────────────────────────────
// fmt constants
// ─────────────────────────────────────────────────────────────────────────────
const F      = 0;   // Fixed length
const LLVAR  = 1;   // 2-digit BCD length prefix  (1 byte)
const LLLVAR = 2;   // 3-digit BCD length prefix  (2 bytes, high nibble of first byte unused)

// ─────────────────────────────────────────────────────────────────────────────
// attr constants
// ─────────────────────────────────────────────────────────────────────────────
const NUM  = 1;     // NUMERIC   — BCD packed
const TRK  = 2;     // TRACKX    — ASCII-like track data
const AN   = 3;     // ALPHANUM  — ASCII printable
const ANS  = 4;     // ALPHANUMS — ASCII + special chars
const BITS = 5;     // BITS      — raw binary, hex display only

// ─────────────────────────────────────────────────────────────────────────────
// STD MTI decode tables (ISO 8583:1987)
// ─────────────────────────────────────────────────────────────────────────────
const STD_MTI_CLASS    = { '1':'Authorization','2':'Financial','3':'File Action','4':'Reversal','5':'Reconciliation','6':'Admin','7':'Fee Collection','8':'Network Management' };
const STD_MTI_FUNCTION = { '0':'Request','1':'Request Response','2':'Advice','3':'Advice Response','4':'Notification','5':'Notification Ack' };
const STD_MTI_ORIGIN   = { '0':'Acquirer','1':'Acquirer Repeat','2':'Issuer','3':'Issuer Repeat','4':'Other','5':'Other Repeat' };

function decodeMTI(mti) {
    const [v, c, f, o] = mti.split('');
    const cls = STD_MTI_CLASS[c], fn = STD_MTI_FUNCTION[f], org = STD_MTI_ORIGIN[o];
    if (!cls || !fn || !org || !['0','1','2'].includes(v)) return null;
    return `${cls} ${fn} (${org})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STD_DE3_TT — keyed by 'MTI:TT' (first 2 digits of processing code)
// ─────────────────────────────────────────────────────────────────────────────
const STD_DE3_TT = {
    '0100:00': 'Authorization',
    '0100:31': 'Balance Inquiry',
    '0200:00': 'Sale',
    '0200:01': 'Cash',
    '0200:02': 'Void',
    '0200:20': 'Sale Refund',
    '0200:26': 'Credit Voucher',
    '0200:57': 'Mobile Top-Up',
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM_DE3 — full 6-digit processing code, keyed by profile
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOM_DE3 = {
};

// ─────────────────────────────────────────────────────────────────────────────
// STD_ISO_BIT_FIELD — standard ISO 8583:1987 field definitions
// Reference: ISO 8583:1987 Financial transaction card originated messages
// This is the baseline used when no custom profile overrides a DE.
// ─────────────────────────────────────────────────────────────────────────────
//                DE    fmt     attr   len   name
const STD_ISO_BIT_FIELD = [
  //[  1,  F,      BITS,  16,    'Bitmap'                                 ],  // b 64 or b 128 if secondary present
    [  2,  LLVAR,  NUM,   19,    'Primary Account Number (PAN)'           ],  // n..19
    [  3,  F,      NUM,    6,    'Processing Code'                        ],  // n 6
    [  4,  F,      NUM,   12,    'Amount, Transaction'                    ],  // n 12
    [  5,  F,      NUM,   12,    'Amount, Settlement'                     ],  // n 12
    [  6,  F,      NUM,   12,    'Amount, Cardholder Billing'             ],  // n 12
    [  7,  F,      NUM,   10,    'Transmission Date and Time'             ],  // n 10 (MMDDhhmmss)
    [  8,  F,      NUM,    8,    'Amount, Cardholder Billing Fee'         ],  // n 8
    [  9,  F,      NUM,    8,    'Conversion Rate, Settlement'            ],  // n 8
    [ 10,  F,      NUM,    8,    'Conversion Rate, Cardholder Billing'    ],  // n 8
    [ 11,  F,      NUM,    6,    'System Trace Audit Number'              ],  // n 6
    [ 12,  F,      NUM,    6,    'Time, Local Transaction'                ],  // n 6 (hhmmss)
    [ 13,  F,      NUM,    4,    'Date, Local Transaction'                ],  // n 4 (MMDD)
    [ 14,  F,      NUM,    4,    'Date, Expiration'                       ],  // n 4 (YYMM)
    [ 15,  F,      NUM,    4,    'Date, Settlement'                       ],  // n 4 (MMDD)
    [ 16,  F,      NUM,    4,    'Date, Conversion'                       ],  // n 4 (MMDD)
    [ 17,  F,      NUM,    4,    'Date, Capture'                          ],  // n 4 (MMDD)
    [ 18,  F,      NUM,    4,    'Merchant Type'                          ],  // n 4
    [ 19,  F,      NUM,    3,    'Acquiring Institution Country Code'     ],  // n 3
    [ 20,  F,      NUM,    3,    'PAN Extended, Country Code'             ],  // n 3
    [ 21,  F,      NUM,    3,    'Forwarding Institution Country Code'    ],  // n 3
    [ 22,  F,      NUM,    3,    'POS Entry Mode'                         ],  // n 3
    [ 23,  F,      NUM,    3,    'Application PAN Sequence Number'        ],  // n 3
    [ 24,  F,      NUM,    3,    'Function Code'                          ],  // n 3 (ISO) / NII (network)
    [ 25,  F,      NUM,    2,    'POS Condition Code'                     ],  // n 2
    [ 26,  F,      NUM,    2,    'POS Capture Code'                       ],  // n 2
    [ 27,  F,      NUM,    1,    'Authorizing Identification Response Len'],  // n 1
    [ 28,  F,      ANS,    9,    'Amount, Transaction Fee'                ],  // x+n 8
    [ 29,  F,      ANS,    9,    'Amount, Settlement Fee'                 ],  // x+n 8
    [ 30,  F,      ANS,    9,    'Amount, Transaction Processing Fee'     ],  // x+n 8
    [ 31,  F,      ANS,    9,    'Amount, Settlement Processing Fee'      ],  // x+n 8
    [ 32,  LLVAR,  NUM,   11,    'Acquiring Institution ID Code'          ],  // n..11
    [ 33,  LLVAR,  NUM,   11,    'Forwarding Institution ID Code'         ],  // n..11
    [ 34,  LLVAR,  ANS,   28,    'PAN Extended'                           ],  // ns..28
    [ 35,  LLVAR,  TRK,   37,    'Track 2 Data'                           ],  // z..37
    [ 36,  LLLVAR, NUM,  104,    'Track 3 Data'                           ],  // n...104
    [ 37,  F,      AN,    12,    'Retrieval Reference Number'             ],  // an 12
    [ 38,  F,      AN,     6,    'Authorization Identification Response'  ],  // an 6
    [ 39,  F,      AN,     2,    'Response Code'                          ],  // an 2
    [ 40,  F,      AN,     3,    'Service Restriction Code'               ],  // an 3
    [ 41,  F,      ANS,    8,    'Card Acceptor Terminal Identification'  ],  // ans 8
    [ 42,  F,      ANS,   15,    'Card Acceptor Identification Code'      ],  // ans 15
    [ 43,  F,      ANS,   40,    'Card Acceptor Name/Location'            ],  // ans 40
    [ 44,  LLVAR,  AN,    25,    'Additional Response Data'               ],  // an..25
    [ 45,  LLVAR,  AN,    76,    'Track 1 Data'                           ],  // an..76
    [ 46,  LLLVAR, AN,   999,    'Additional Data - ISO'                  ],  // an...999
    [ 47,  LLLVAR, AN,   999,    'Additional Data - National'             ],  // an...999
    [ 48,  LLLVAR, AN,   999,    'Additional Data - Private'              ],  // an...999
    [ 49,  F,      AN,     3,    'Currency Code, Transaction'             ],  // a 3 or n 3
    [ 50,  F,      AN,     3,    'Currency Code, Settlement'              ],  // a 3 or n 3
    [ 51,  F,      AN,     3,    'Currency Code, Cardholder Billing'      ],  // a 3 or n 3
    [ 52,  F,      BITS,   8,    'PIN Data'                               ],  // b 64 (8 bytes)
    [ 53,  F,      NUM,   16,    'Security Related Control Information'   ],  // n 16
    [ 54,  LLLVAR, AN,   120,    'Additional Amounts'                     ],  // an...120
    [ 55,  LLLVAR, ANS,  999,    'ICC Data - EMV'                         ],  // ans...999
    [ 56,  LLLVAR, ANS,  999,    'Reserved ISO'                           ],  // ans...999
    [ 57,  LLLVAR, ANS,  999,    'Reserved National'                      ],  // ans...999
    [ 58,  LLLVAR, ANS,  999,    'Reserved National'                      ],  // ans...999
    [ 59,  LLLVAR, ANS,  999,    'Reserved National'                      ],  // ans...999
    [ 60,  LLLVAR, ANS,  999,    'Reserved National'                      ],  // ans...999
    [ 61,  LLLVAR, ANS,  999,    'Reserved Private'                       ],  // ans...999
    [ 62,  LLLVAR, ANS,  999,    'Reserved Private'                       ],  // ans...999
    [ 63,  LLLVAR, ANS,  999,    'Reserved Private'                       ],  // ans...999
    [ 64,  F,      BITS,   8,    'Message Authentication Code (MAC)'      ],  // b 64 (8 bytes)
    // ── Secondary bitmap DE65–DE128 ──────────────────────────────────────────
    [ 65,  F,      BITS,   1,    'Bitmap, Extended'                       ],  // b 1
    [ 66,  F,      NUM,    1,    'Settlement Code'                        ],  // n 1
    [ 67,  F,      NUM,    2,    'Extended Payment Code'                  ],  // n 2
    [ 68,  F,      NUM,    3,    'Receiving Institution Country Code'     ],  // n 3
    [ 69,  F,      NUM,    3,    'Settlement Institution Country Code'    ],  // n 3
    [ 70,  F,      NUM,    3,    'Network Management Information Code'    ],  // n 3
    [ 71,  F,      NUM,    4,    'Message Number'                         ],  // n 4
    [ 72,  F,      NUM,    4,    'Message Number, Last'                   ],  // n 4
    [ 73,  F,      NUM,    6,    'Date, Action'                           ],  // n 6 (YYMMDD)
    [ 74,  F,      NUM,   10,    'Credits, Number'                        ],  // n 10
    [ 75,  F,      NUM,   10,    'Credits, Reversal Number'               ],  // n 10
    [ 76,  F,      NUM,   10,    'Debits, Number'                         ],  // n 10
    [ 77,  F,      NUM,   10,    'Debits, Reversal Number'                ],  // n 10
    [ 78,  F,      NUM,   10,    'Transfer, Number'                       ],  // n 10
    [ 79,  F,      NUM,   10,    'Transfer, Reversal Number'              ],  // n 10
    [ 80,  F,      NUM,   10,    'Inquiries, Number'                      ],  // n 10
    [ 81,  F,      NUM,   10,    'Authorizations, Number'                 ],  // n 10
    [ 82,  F,      NUM,   12,    'Credits, Processing Fee Amount'         ],  // n 12
    [ 83,  F,      NUM,   12,    'Credits, Transaction Fee Amount'        ],  // n 12
    [ 84,  F,      NUM,   12,    'Debits, Processing Fee Amount'          ],  // n 12
    [ 85,  F,      NUM,   12,    'Debits, Transaction Fee Amount'         ],  // n 12
    [ 86,  F,      NUM,   16,    'Credits, Amount'                        ],  // n 16
    [ 87,  F,      NUM,   16,    'Credits, Reversal Amount'               ],  // n 16
    [ 88,  F,      NUM,   16,    'Debits, Amount'                         ],  // n 16
    [ 89,  F,      NUM,   16,    'Debits, Reversal Amount'                ],  // n 16
    [ 90,  F,      NUM,   42,    'Original Data Elements'                 ],  // n 42
    [ 91,  F,      AN,     1,    'File Update Code'                       ],  // an 1
    [ 92,  F,      AN,     2,    'File Security Code'                     ],  // an 2
    [ 93,  F,      AN,     5,    'Response Indicator'                     ],  // an 5
    [ 94,  F,      AN,     7,    'Service Indicator'                      ],  // an 7
    [ 95,  F,      AN,    42,    'Replacement Amounts'                    ],  // an 42
    [ 96,  F,      BITS,   8,    'Message Security Code'                  ],  // b 64 (8 bytes)
    [ 97,  F,      ANS,   17,    'Amount, Net Settlement'                 ],  // x+n 16
    [ 98,  F,      ANS,   25,    'Payee'                                  ],  // ans 25
    [ 99,  LLVAR,  NUM,   11,    'Settlement Institution ID Code'         ],  // n..11
    [100,  LLVAR,  NUM,   11,    'Receiving Institution ID Code'          ],  // n..11
    [101,  LLVAR,  ANS,   17,    'File Name'                              ],  // ans..17
    [102,  LLVAR,  ANS,   28,    'Account Identification 1'               ],  // ans..28
    [103,  LLVAR,  ANS,   28,    'Account Identification 2'               ],  // ans..28
    [104,  LLLVAR, ANS,  100,    'Transaction Description'                ],  // ans...100
    [105,  LLLVAR, ANS,  999,    'Reserved for ISO use'                   ],  // ans...999
    [106,  LLLVAR, ANS,  999,    'Reserved for ISO use'                   ],  // ans...999
    [107,  LLLVAR, ANS,  999,    'Reserved for ISO use'                   ],  // ans...999
    [108,  LLLVAR, ANS,  999,    'Reserved for ISO use'                   ],  // ans...999
    [109,  LLLVAR, ANS,  999,    'Reserved for ISO use'                   ],  // ans...999
    [110,  LLLVAR, ANS,  999,    'Reserved for ISO use'                   ],  // ans...999
    [111,  LLLVAR, ANS,  999,    'Reserved for ISO use'                   ],  // ans...999
    [112,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [113,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [114,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [115,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [116,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [117,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [118,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [119,  LLLVAR, ANS,  999,    'Reserved for National use'              ],  // ans...999
    [120,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [121,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [122,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [123,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [124,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [125,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [126,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [127,  LLLVAR, ANS,  999,    'Reserved for Private use'               ],  // ans...999
    [128,  F,      BITS,   8,    'Message Authentication Code (MAC)'      ],  // b 64 (8 bytes)
];

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM_ISO_BIT_FIELD — organisation-specific profile overrides
//
// Each key becomes a selectable profile in the UI toggle.
// Only list the DEs that DIFFER from STD_ISO_BIT_FIELD.
// DEs not listed here fall back to STD_ISO_BIT_FIELD automatically.
//
// Rules:
//   • Empty object  {}  → only "Standard" profile shown
//   • Add NETS key  → "Standard" + "NETS Specific" shown
//   • Add UPOS key  → "Standard" + "UPOS Specific" shown  (or all three)
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOM_ISO_BIT_FIELD = {

    NETS: [
        //  DE    fmt      attr   len   name
    ],

    UPOS: [
        //  DE    fmt      attr   len   name
    ],

};

// ─────────────────────────────────────────────────────────────────────────────
// ISO8583_PROFILES — consumed by home.html to build the profile toggle
// Merges each custom profile's overrides on top of STD_ISO_BIT_FIELD.
// Do not edit this block — edit STD_ISO_BIT_FIELD / CUSTOM_ISO_BIT_FIELD above.
// ─────────────────────────────────────────────────────────────────────────────
const ISO8583_PROFILES = (() => {
    const PROFILE_LABELS = { NETS: 'NETS', UPOS: 'UPOS' };
    function mergeProfile(overrides) {
        const map = new Map(STD_ISO_BIT_FIELD.map(r => [r[0], r]));
        overrides.forEach(r => map.set(r[0], r));
        return Array.from(map.values()).sort((a, b) => a[0] - b[0]);
    }

    const profiles = [{ key: 'STD', label: 'Standard', fields: STD_ISO_BIT_FIELD }];
    Object.keys(CUSTOM_ISO_BIT_FIELD).forEach(key => {
        if (CUSTOM_ISO_BIT_FIELD[key].length > 0) {
            profiles.push({
                key,
                label: PROFILE_LABELS[key] || key,
                fields: mergeProfile(CUSTOM_ISO_BIT_FIELD[key]),
            });
        }
    });
    return profiles;
})();

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeHex(rawInput)
// Strips noise from raw input and returns clean hex ready for parsing.
//
// Handles any mix of: plain hex, spaced hex, log-prefixed lines.
// Each line is split by whitespace. Tokens that are not a valid 2-nibble hex
// byte (e.g. timestamps, log tags, text labels) are dropped from the front.
// Lines with no valid hex bytes are skipped entirely.
//
// Returns:
// {
//   hex     : string  — space-separated hex bytes, ready for parseISO8583
//   nibbles : number  — total hex char count (2 per byte)
//   bytes   : number  — nibbles / 2, floored
//   odd     : boolean — true if nibble count is odd (possible truncation)
// }
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeHex(rawInput) {
    const hex = rawInput
        .split('\n')
        .map(line => {
            const arr = line.split(/\s+/).filter(s => s.length > 0);
            while (arr.length && !/^[0-9A-Fa-f]{2}$/.test(arr[0])) arr.shift();
            return arr.filter(s => /^[0-9A-Fa-f]{2}$/.test(s)).join(' ');
        })
        .filter(line => line.length > 0)
        .join(' ');
    const nibbles = hex.replace(/\s/g, '').length;
    const odd = nibbles % 2 !== 0;
    return {
        hex,
        nibbles,
        bytes: Math.floor(nibbles / 2),
        odd,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// parseISO8583(rawInput, fieldDefs)
// Accepts any of: plain hex, multiline hex, log-prefixed lines (e.g. "ISO Log XX XX")
// Returns: { mti, bitmapHex, fields: [{ de, name, value }], errors }
// ─────────────────────────────────────────────────────────────────────────────
function parseISO8583(rawInput, fieldDefs) {
    const { hex: stripped, odd } = sanitizeHex(rawInput);

    // Replace invalid (non-hex, non-space) chars with '0' to preserve stream alignment.
    // Dropping them would shift all subsequent field offsets causing cascade errors.
    // Fields whose raw bytes contain the placeholder '0' from replacement are flagged
    // via rawSlice, which reads from the original stripped string and detects non-hex chars.
    const strippedClean = stripped.replace(/[^0-9A-Fa-f\s]/g, '0');
    const allHex = (strippedClean.match(/[0-9A-Fa-f]{2}/g) || []).join('').toUpperCase();

    const nibbleMap = [];
    for (let i = 0; i < strippedClean.length; i++) {
        if (/[0-9A-Fa-f]/.test(strippedClean[i])) nibbleMap.push(i);
    }

    // rawSlice(nibStart, nibEnd): returns the original chars from stripped for nibble range [nibStart, nibEnd).
    // nibbleMap is indexed on strippedClean positions, but we slice from stripped (original)
    // so corruption chars like 'XX' appear in the display value instead of '00'.
    //
    // BEHAVIOUR CONTRACT — do not change without re-testing DE12/DE13 boundary:
    //   • If a non-hex char appears MID-FIELD (between nibStart and the last nibble),
    //     the slice stops at the END of that corruption run and does NOT include any
    //     valid hex chars that follow it. Those following chars belong to the next field
    //     in the shifted stream and must not bleed into this field's display.
    //   • Example: input '1634XX10', field expects 6 nibbles (3 bytes).
    //     After XX→00 replacement, DE12 reads '163400' from clean stream.
    //     rawSlice maps back to original stripped and finds 'XX' between nibble 3 and 4,
    //     stops there → returns '1634XX', not '163400'.
    //   • DE13 then correctly reads '1017' from the aligned clean stream.
    function rawSlice(nibStart, nibEnd) {
        if (nibStart >= nibbleMap.length) return '';
        // nibbleMap[i] = char index in strippedClean. Use same index into stripped (original)
        // to recover the original chars including any corruption markers.
        const charStart = nibbleMap[nibStart];
        const lastNib   = nibEnd - 1;
        if (lastNib >= nibbleMap.length) return stripped.slice(charStart).replace(/\s/g, '').toUpperCase();
        const lastNibCharPos = nibbleMap[lastNib];
        let charEnd = lastNibCharPos + 1;
        for (let i = charStart; i < lastNibCharPos; i++) {
            if (!/[0-9A-Fa-f\s]/.test(stripped[i])) {
                // Non-hex char found mid-field — include the full corruption run then stop.
                // DO NOT continue past the corruption: bytes after it are from the shifted
                // stream and belong to subsequent fields, not this one.
                let j = i;
                while (j < stripped.length && !/[0-9A-Fa-f\s]/.test(stripped[j])) j++;
                charEnd = j;
                break;
            }
        }
        return stripped.slice(charStart, charEnd).replace(/\s/g, '').toUpperCase();
    }

    let TRANSPORT_BYTES = 5;
    const startsWithTransport = /^6[01]/i.test(allHex);
    if (startsWithTransport) {
        if (allHex.slice(10, 12) === '00' && allHex.slice(12, 14) === '00') TRANSPORT_BYTES = 7;
    }
    const tpduHex = startsWithTransport ? allHex.slice(0, TRANSPORT_BYTES * 2) : null;
    const hex = startsWithTransport ? allHex.slice(TRANSPORT_BYTES * 2) : allHex;
    const tpduNibs = TRANSPORT_BYTES * 2;  // nibble offset of hex[0] within nibbleMap

    const errors = [], fields = [];
    if (!allHex.length) { errors.push(`no valid hex data found in input`); return { mti: null, mtiLabel: null, bitmapHex: '', tpduHex: null, fields, errors }; }
    if (odd) errors.push(`input has odd nibble count — trailing nibble ignored, possible truncation`);
    let pos = 0;  // nibble position within hex (post-TPDU)
    function readHex(n) {
        if (pos + n > hex.length) return null;
        const s = hex.slice(pos, pos + n); pos += n; return s;
    }
    function attrLabel(attr, len) {
        if (attr === NUM)  return `n${len}`;
        if (attr === AN)   return `an${len}`;
        if (attr === ANS)  return `ans${len}`;
        if (attr === TRK)  return `z${len}`;
        if (attr === BITS) return `b${len}`;
        return `${len}`;
    }
    function validateValue(hexVal, attr, maxLen) {
        if (attr === NUM && !/^[0-9]+$/.test(hexVal))
            return `expected ${attrLabel(attr, maxLen)} (BCD numeric), got '${hexVal}' — non-decimal nibble`;
        return null;
    }
    const mtiHex = readHex(4);
    if (!mtiHex) { const got = hex.slice(pos); errors.push(`MTI truncated — expected 2B, got '${got}' — short ${2 - Math.floor(got.length / 2)}B`); return { mti: null, mtiLabel: null, bitmapHex: '', tpduHex, fields, errors }; }
    const mtiLabel = decodeMTI(mtiHex) || 'UNKNOWN';
    if (!decodeMTI(mtiHex)) {
        errors.push(`invalid MTI, parsing aborted`);
        return { mti: mtiHex, mtiLabel, bitmapHex: '', tpduHex, fields, errors };
    }
    const bm1NibStart = tpduNibs + pos;
    const bm1hex = readHex(16);
    if (!bm1hex) { const got = hex.slice(pos); errors.push(`primary bitmap truncated — expected 8B, got '${got}' — short ${8 - Math.floor(got.length / 2)}B`); return { mti: mtiHex, mtiLabel, bitmapHex: '', tpduHex, fields, errors }; }
    const bm1CharStart = nibbleMap[bm1NibStart];
    const bm1CharEnd   = nibbleMap[bm1NibStart + 15] + 1;
    const bm1raw       = stripped.slice(bm1CharStart, bm1CharEnd).replace(/\s/g, '').toUpperCase();
    if (/[^0-9A-Fa-f]/.test(bm1raw)) { errors.push(`primary bitmap corrupt — got '${bm1raw}' — bitmap bits unreliable, parsing aborted`); return { mti: mtiHex, mtiLabel, bitmapHex: bm1raw, tpduHex, fields, errors }; }
    const bm1 = BigInt('0x' + bm1hex);
    const hasSecondary = !!(bm1 >> 63n & 1n);
    let bm2 = 0n, bitmapHex = bm1hex;
    if (hasSecondary) {
        const bm2NibStart = tpduNibs + pos;
        const bm2hex = readHex(16);
        if (!bm2hex) { const got = hex.slice(pos); errors.push(`secondary bitmap truncated — expected 8B, got '${got}' — short ${8 - Math.floor(got.length / 2)}B`); return { mti: mtiHex, mtiLabel, bitmapHex, tpduHex, fields, errors }; }
        const bm2CharStart = nibbleMap[bm2NibStart];
        const bm2CharEnd   = nibbleMap[bm2NibStart + 15] + 1;
        const bm2rawOrig   = stripped.slice(bm2CharStart, bm2CharEnd).replace(/\s/g, '').toUpperCase();
        if (/[^0-9A-Fa-f]/.test(bm2rawOrig)) {
            errors.push(`secondary bitmap corrupt — got '${bm2rawOrig}' — DE65-DE128 skipped`);
            bm2 = 0n;
            bitmapHex += bm2rawOrig;
        } else {
            bitmapHex += bm2hex;
            bm2 = BigInt('0x' + bm2hex);
        }
    }
    const deMap = new Map(fieldDefs.map(r => [r[0], r]));
    const maxDE = hasSecondary ? 128 : 64;
    for (let de = 2; de <= maxDE; de++) {
        const word = de <= 64 ? bm1 : bm2;
        const bit  = de <= 64 ? (64n - BigInt(de)) : (128n - BigInt(de));
        if (!(word >> bit & 1n)) continue;
        if (de === 1) continue;
        const def = deMap.get(de);
        if (!def) {
            const err = `DE${de}: no definition in profile`;
            errors.push(err);
            fields.push({ de, name: '(no definition)', value: '—', rawHex: '—', error: err });
            continue;
        }
        const [, fmt, attr, maxLen, name] = def;
        let value = null, fieldError = null, nibStart = tpduNibs + pos;
        try {
            if (fmt === LLVAR) {
                const lb = readHex(2);
                if (lb === null) { const got = hex.slice(pos); const short = 1 - Math.floor(got.length / 2); errors.push(`DE${de}: expected LL prefix (1B), got '${got}' — short ${short}B`); break; }
                const len = parseInt(lb, 10);
                if (isNaN(len) || lb !== String(len).padStart(2, '0')) {
                    errors.push(`DE${de}: invalid length prefix — expected 2 BCD digits, got '${lb}'`); break;
                }
                if (len > maxLen) { errors.push(`DE${de}: length prefix '${lb}' decoded as ${len}, exceeds max ${maxLen} — stream likely misaligned`); break; }
                const byteLen = (attr === BITS) ? len : (attr === NUM || attr === TRK) ? Math.ceil(len / 2) : len;
                nibStart = tpduNibs + pos;  // after LL prefix, before value
                value = readHex(byteLen * 2);
                if (value === null) {
                    const got = hex.slice(pos); pos = hex.length;
                    const short = byteLen - Math.floor(got.length / 2);
                    fieldError = `DE${de}: expected ${attrLabel(attr, maxLen)} (${byteLen}B), got '${got}' — short ${short}B`;
                    errors.push(fieldError);
                    fields.push({ de, name, value: got, rawHex: got, error: fieldError });
                    break;
                }
            } else if (fmt === LLLVAR) {
                const lb = readHex(4);
                if (lb === null) { const got = hex.slice(pos); const short = 2 - Math.floor(got.length / 2); errors.push(`DE${de}: expected LLL prefix (2B), got '${got}' — short ${short}B`); break; }
                const len = parseInt(lb, 10);
                if (isNaN(len) || lb !== String(len).padStart(4, '0')) {
                    errors.push(`DE${de}: invalid length prefix — expected 4 BCD digits, got '${lb}'`); break;
                }
                if (len > maxLen) { errors.push(`DE${de}: length prefix '${lb}' decoded as ${len}, exceeds max ${maxLen} — stream likely misaligned`); break; }
                const byteLen = (attr === BITS) ? len : (attr === NUM || attr === TRK) ? Math.ceil(len / 2) : len;
                nibStart = tpduNibs + pos;  // after LLL prefix, before value
                value = readHex(byteLen * 2);
                if (value === null) {
                    const got = hex.slice(pos); pos = hex.length;
                    const short = byteLen - Math.floor(got.length / 2);
                    fieldError = `DE${de}: expected ${attrLabel(attr, maxLen)} (${byteLen}B), got '${got}' — short ${short}B`;
                    errors.push(fieldError);
                    fields.push({ de, name, value: got, rawHex: got, error: fieldError });
                    break;
                }
            } else {
                if (!maxLen) { errors.push(`DE${de}: no length defined`); continue; }
                const byteLen = (attr === NUM) ? Math.ceil(maxLen / 2) : maxLen;
                value = readHex(byteLen * 2);
                if (value === null) {
                    const got = hex.slice(pos); pos = hex.length;
                    const short = byteLen - Math.floor(got.length / 2);
                    fieldError = `DE${de}: expected ${attrLabel(attr, maxLen)} (${byteLen}B), got '${got}' — short ${short}B`;
                    errors.push(fieldError);
                    fields.push({ de, name, value: got, rawHex: got, error: fieldError });
                    break;
                }
            }
        } catch(e) { errors.push(`DE${de}: parse error — ${e.message}`); continue; }
        const nibEnd = nibStart + value.length;  // nibStart + clean nibbles consumed by this field
        // IMPORTANT: nibEnd is derived from value.length (clean nibbles), NOT from pos after reading.
        // Using tpduNibs+pos here would overshoot when corruption chars dropped nibbles from the
        // stream, causing rawSlice to include bytes that belong to the next field.
        const rawHex = rawSlice(nibStart, nibEnd);

        // DISPLAY CONTRACT: if rawHex contains non-hex chars (e.g. 'XX'), the field is corrupt.
        // Use rawHex as the display value directly and do NOT attempt further validation.
        // Parsing continues to the next field using the clean (post-drop) stream position,
        // so downstream fields are parsed from the correct offset.
        if (/[^0-9A-Fa-f]/.test(rawHex)) {
            fieldError = `DE${de}: expected ${attrLabel(attr, maxLen)}, got '${rawHex}' — invalid chars in stream`;
            errors.push(fieldError);
            fields.push({ de, name, value: rawHex, rawHex, error: fieldError });
            continue;
        }

        // VALIDATION: only NUM fields are validated (BCD nibbles must be 0-9).
        // AN/ANS/TRK fields are NOT validated for ASCII — private DEs legitimately carry binary.
        const valErr = validateValue(value, attr, maxLen);
        if (valErr) {
            fieldError = `DE${de}: ${valErr}`;
            errors.push(fieldError);
        }
        fields.push({ de, name, value, rawHex, error: fieldError });
    }
    return { mti: mtiHex, mtiLabel, bitmapHex, tpduHex, fields, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// DE-specific decoders
// ─────────────────────────────────────────────────────────────────────────────
function decodeDE2(hexVal, fmt, attr, pciDss, mti, profileKey)  { return pciDss ? maskPAN(hexVal) : hexVal; }
function decodeDE3(hexVal, fmt, attr, pciDss, mti, profileKey) {
    if (hexVal.length < 6) return '';
    const full = hexVal.slice(0, 6);
    const customMap = profileKey !== 'STD' ? CUSTOM_DE3?.[profileKey] : undefined;
    if (customMap) {
        const names = customMap[full] ?? ['UNKNOWN'];
        const filtered = names.filter(n => {
            if (profileKey === 'NETS') return !n.startsWith('UPOS_');
            if (profileKey === 'UPOS') return !n.startsWith('NETS_') && !n.startsWith('NPC_') && !n.startsWith('NFP_');
            return true;
        });
        return (filtered.length ? filtered : ['UNKNOWN']).join(' / ');
    }
    return STD_DE3_TT[`${mti}:${full.slice(0, 2)}`] ?? 'UNKNOWN';
}
function decodeDE34(hexVal, fmt, attr, pciDss, mti, profileKey) { return pciDss ? maskPAN(hexVal) : hexVal; }
function decodeDE35(hexVal, fmt, attr, pciDss, mti, profileKey) { return maskTrack2(hexVal, pciDss); }
function decodeDE45(hexVal, fmt, attr, pciDss, mti, profileKey) { return maskTrack1(hexVal, pciDss); }
function decodeDE52(hexVal, fmt, attr, pciDss, mti, profileKey) { return pciDss ? 'X'.repeat(hexVal.length) : hexVal; }

// ─────────────────────────────────────────────────────────────────────────────
// decodeField — converts raw hex value to a meaningful, human-readable string
// ─────────────────────────────────────────────────────────────────────────────
function decodeField(de, fmt, attr, hexVal, pciDss = true, mti = '', profileKey = 'STD') {
    if (!hexVal || attr === BITS) return '';

    const DATETIME_MAP = new Map([[7,MDHMS],[12,HHMMSS],[13,MMDD],[14,YYMM],[15,MMDD],[16,MMDD],[17,MMDD],[73,YYMMDD]]);
    const dtFmt = DATETIME_MAP.get(de);
    if (dtFmt !== undefined) return formatDateTime(hexVal, dtFmt);
    const AMOUNT_DES = new Set([4,5,6,8,28,29,30,31,82,83,84,85,86,87,88,89,97]);
    if (AMOUNT_DES.has(de)) return formatAmount(hexVal, attr);

    const decoder = new Map([[2,decodeDE2],[3,decodeDE3],[34,decodeDE34],[35,decodeDE35],[45,decodeDE45],[52,decodeDE52]]).get(de);
    if (decoder) return decoder(hexVal, fmt, attr, pciDss, mti, profileKey);
    return decodeAscii(hexVal, attr);
}

function formatDateTime(hexVal, fmt) {
    if (fmt === MDHMS)  return formatMMDDhhmmss(hexVal);
    if (fmt === HHMMSS) return formatHHMMSS(hexVal);
    if (fmt === MMDD)   return formatMMDD(hexVal);
    if (fmt === YYMM)   return formatYYMM(hexVal);
    if (fmt === YYMMDD) return formatYYMMDD(hexVal);
    return '';
}

function maskPAN(hexVal) {
    const pan = hexVal;
    if (pan.length <= 10) return pan;
    return pan.slice(0, 6) + 'X'.repeat(pan.length - 10) + pan.slice(-4);
}

function maskTrack2(hexVal, pciDss) {
    // Track 2: PAN=YYMMSSSDDDD... where = is separator
    // hexVal is ASCII-encoded track data (TRK/ANS attr)
    const ascii = decodeAscii(hexVal, TRK);
    if (!ascii) return ascii;
    const sep = ascii.indexOf('=');
    if (sep === -1) return ascii;  // no separator — fallback, show as-is
    const pan = ascii.slice(0, sep);
    const rest = ascii.slice(sep);
    return (pciDss ? maskPAN(pan) : pan) + rest;
}

function maskTrack1(hexVal, pciDss) {
    // Track 1: B<PAN>^<NAME>^<EXPIRY+rest>
    const ascii = decodeAscii(hexVal, AN);
    if (!ascii) return ascii;
    const firstCaret = ascii.indexOf('^');
    if (firstCaret === -1) return ascii;  // no separator — fallback, show as-is
    const prefix = ascii.slice(0, 1);           // 'B' format code
    const pan    = ascii.slice(1, firstCaret);  // PAN between B and first ^
    const rest   = ascii.slice(firstCaret);     // ^NAME^EXPIRY...
    const secondCaret = rest.indexOf('^', 1);
    if (!pciDss) return prefix + pan + rest;
    const maskedPan = maskPAN(pan);
    if (secondCaret === -1) return prefix + maskedPan + rest;  // no name field — mask PAN only
    const name       = rest.slice(1, secondCaret);  // name between ^ delimiters
    const afterName  = rest.slice(secondCaret);     // ^EXPIRY...
    const maskedName = 'X'.repeat(name.length);
    return prefix + maskedPan + '^' + maskedName + afterName;
}

function formatAmount(hexVal, attr) {
    // ANS fee fields (DE28–31, DE97) have a leading C/D sign byte
    if (attr === ANS) {
        const sign = hexVal.slice(0, 2);
        const signChar = String.fromCharCode(parseInt(sign, 16));
        const digits = hexVal.slice(2).replace(/^0+/, '') || '0';
        const num = parseInt(digits, 10);
        const label = signChar === 'C' ? 'Cr' : signChar === 'D' ? 'Dr' : signChar;
        return `${label} $${(num / 100).toFixed(2)}`;
    }
    const digits = hexVal.replace(/^0+/, '') || '0';
    const num = parseInt(digits, 10);
    return `$${(num / 100).toFixed(2)}`;
}

function formatMMDDhhmmss(hexVal) {
    // MMDDhhmmss — 10 digits
    if (hexVal.length < 10) return '';
    const [MM, DD, hh, mm, ss] = [hexVal.slice(0,2), hexVal.slice(2,4), hexVal.slice(4,6), hexVal.slice(6,8), hexVal.slice(8,10)];
    return `${DD}/${MM} ${hh}:${mm}:${ss}`;
}

function formatHHMMSS(hexVal) {
    // hhmmss — 6 digits
    if (hexVal.length < 6) return '';
    return `${hexVal.slice(0,2)}:${hexVal.slice(2,4)}:${hexVal.slice(4,6)}`;
}

function formatMMDD(hexVal) {
    // MMDD — 4 digits
    if (hexVal.length < 4) return '';
    return `${hexVal.slice(2,4)}/${hexVal.slice(0,2)}`;
}

function formatYYMM(hexVal) {
    // YYMM — 4 digits
    if (hexVal.length < 4) return '';
    const yy = parseInt(hexVal.slice(0,2), 10);
    const yyyy = yy <= 49 ? 2000 + yy : 1900 + yy;
    return `${hexVal.slice(2,4)}/${yyyy}`;
}

function formatYYMMDD(hexVal) {
    // YYMMDD — 6 digits
    if (hexVal.length < 6) return '';
    const yy = parseInt(hexVal.slice(0,2), 10);
    const yyyy = yy <= 49 ? 2000 + yy : 1900 + yy;
    return `${hexVal.slice(4,6)}/${hexVal.slice(2,4)}/${yyyy}`;
}

function decodeAscii(hexVal, attr) {
    if (attr === NUM || attr === BITS) return '';
    return (hexVal.match(/../g) || []).map(b => {
        const c = parseInt(b, 16);
        return c >= 32 && c < 127 ? String.fromCharCode(c) : '.';
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// parseISO8583ByProfile(rawInput, profileKey, pciDss)  — primary API entry point
// Accepts raw hex input and a profile key, returns a structured result object.
// All field definition lookup, merging, parsing, and decoding happen here.
//
// Returns:
// {
//   profileLabel : string,
//   mti          : string | null,
//   bitmapHex    : string,
//   fields       : [{ de, name, rawData, repData, error }],
//   errors       : string[]
// }
// ─────────────────────────────────────────────────────────────────────────────
function parseISO8583ByProfile(rawInput, profileKey, pciDss = true) {
    const profile = ISO8583_PROFILES.find(p => p.key === profileKey) || ISO8583_PROFILES[0];
    const { mti, mtiLabel, bitmapHex, tpduHex, fields, errors } = parseISO8583(rawInput, profile.fields);
    const defMap = new Map(profile.fields.map(r => [r[0], r]));
    return {
        profileLabel: profile.label,
        mti,
        mtiLabel,
        bitmapHex,
        tpduHex,
        errors,
        fields: fields.map(f => {
            const raw  = f.rawHex || f.value;
            const def  = defMap.get(f.de);
            const fmt  = def?.[1] ?? F;
            const attr = def?.[2] ?? AN;
            const rep  = f.error ? '' : decodeField(f.de, fmt, attr, f.value, pciDss, mti, profile.key);
            return { de: f.de, name: f.name, rawData: raw, repData: rep, error: f.error ?? null };
        }),
    };
}
