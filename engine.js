/**
 * TrustTrade — Simulation Engine v1.0
 * Smart verification logic that runs entirely in the browser.
 * Handles: trade storage, Agent 1 (data), Agent 2 (document), blockchain simulation.
 */

const TrustTrade = (() => {

  // ─── MARKET PRICE RANGES BY CATEGORY ────────────────────────────────────────
  const MARKET_PRICES = {
    'Electronics':     { min: 5,     max: 2000,  unit: 'unit' },
    'Textiles':        { min: 1,     max: 50,    unit: 'kg'   },
    'Agriculture':     { min: 0.5,   max: 20,    unit: 'kg'   },
    'Automotive':      { min: 10,    max: 5000,  unit: 'unit' },
    'Pharmaceuticals': { min: 50,    max: 800,   unit: 'kg'   },
    'Chemicals':       { min: 2,     max: 300,   unit: 'kg'   },
    'Food & Beverage': { min: 0.5,   max: 30,    unit: 'kg'   },
    'Other':           { min: 1,     max: 10000, unit: 'unit' },
  };

  // ─── KNOWN DUPLICATE INVOICE IDS (pre-seeded) ───────────────────────────────
  const KNOWN_DUPLICATES = [
    'INV-2026-BL-0291', 'INV-2025-MML-0100', 'INV-2026-DS-0039',
    'INVOICE-001', 'TEST-001', 'INV-001',
  ];

  // ─── SUSPICIOUS KEYWORDS IN PRODUCT NAMES ───────────────────────────────────
  const SUSPICIOUS_KEYWORDS = ['test', 'fake', 'dummy', 'xxx', 'asdf', '1234'];

  // ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
  const storage = {
    getTrades: () => JSON.parse(localStorage.getItem('tt_trades') || '[]'),
    saveTrades: (trades) => localStorage.setItem('tt_trades', JSON.stringify(trades)),
    getNextId: () => {
      const trades = storage.getTrades();
      const nums = trades.map(t => parseInt(t.id.replace('TRD-', ''))).filter(Boolean);
      return 'TRD-' + String(Math.max(47, ...nums) + 1).padStart(3, '0');
    },
    addTrade: (trade) => {
      const trades = storage.getTrades();
      trades.unshift(trade);
      storage.saveTrades(trades);
      return trade;
    },
    getInvoiceIds: () => {
      const trades = storage.getTrades();
      return trades.map(t => t.invoiceId).filter(Boolean);
    },
  };

  // Seed with demo trades if empty
  const seedDemoTrades = () => {
    if (storage.getTrades().length > 0) return;
    const demo = [
      { id:'TRD-047', product:'Electronics Components', manufacturer:'Shenzhen MFG', buyer:'Dubai Dist.', mfgCountry:'China', buyerCountry:'United Arab Emirates', category:'Electronics', quantity:500, pricePerUnit:48, escrow:24000, invoiceId:'INV-2026-SZ-0501', status:'pending', aiScore:null, agent1:null, agent2:null, date:'Mar 14, 2026', txHash:null },
      { id:'TRD-046', product:'Textile Goods', manufacturer:'Mumbai Mills', buyer:'Hamburg Co.', mfgCountry:'India', buyerCountry:'Germany', category:'Textiles', quantity:2400, pricePerUnit:4.79, escrow:11500, invoiceId:'INV-2026-MML-0392', status:'verified', aiScore:96, agent1:'pass', agent2:'pass', date:'Mar 13, 2026', txHash: hashFromString('TRD-046') },
      { id:'TRD-045', product:'Agricultural Products', manufacturer:'Nairobi Farm', buyer:'London Dist.', mfgCountry:'Ethiopia', buyerCountry:'United Kingdom', category:'Agriculture', quantity:4200, pricePerUnit:1.95, escrow:8200, invoiceId:'INV-2026-NF-0219', status:'flagged', aiScore:31, agent1:'fail', agent2:'fail', date:'Mar 13, 2026', txHash: hashFromString('TRD-045') },
      { id:'TRD-044', product:'Auto Parts', manufacturer:'Detroit MFG', buyer:'Seoul Motors', mfgCountry:'United States', buyerCountry:'South Korea', category:'Automotive', quantity:820, pricePerUnit:50, escrow:41000, invoiceId:'INV-2026-DT-0180', status:'verified', aiScore:99, agent1:'pass', agent2:'pass', date:'Mar 11, 2026', txHash: hashFromString('TRD-044') },
      { id:'TRD-043', product:'Pharmaceutical Raw', manufacturer:'Basel Labs', buyer:'Karachi Pharma', mfgCountry:'Germany', buyerCountry:'Other', category:'Pharmaceuticals', quantity:22, pricePerUnit:897, escrow:19750, invoiceId:'INV-2026-BL-0291', status:'flagged', aiScore:22, agent1:'fail', agent2:'fail', date:'Mar 10, 2026', txHash: hashFromString('TRD-043') },
      { id:'TRD-042', product:'Coffee Beans', manufacturer:'Addis Exporter', buyer:'Amsterdam Roasters', mfgCountry:'Ethiopia', buyerCountry:'Netherlands', category:'Food & Beverage', quantity:1800, pricePerUnit:3.5, escrow:6300, invoiceId:'INV-2026-AE-0091', status:'verified', aiScore:97, agent1:'pass', agent2:'pass', date:'Mar 09, 2026', txHash: hashFromString('TRD-042') },
      { id:'TRD-041', product:'Steel Coils', manufacturer:'Osaka Steel', buyer:'Chennai Fab', mfgCountry:'Japan', buyerCountry:'India', category:'Other', quantity:40000, pricePerUnit:2.2, escrow:88000, invoiceId:'INV-2026-OS-0340', status:'verified', aiScore:95, agent1:'pass', agent2:'pass', date:'Mar 09, 2026', txHash: hashFromString('TRD-041') },
    ];
    storage.saveTrades(demo);
  };

  // ─── BLOCKCHAIN SIMULATION ───────────────────────────────────────────────────
  function hashFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const tail = Math.abs(hash * 31).toString(16).padStart(4, '0');
    return '0x' + hex + 'a3f8b' + tail;
  }

  function generateTxHash(tradeId, timestamp) {
    return hashFromString(tradeId + timestamp);
  }

  function generateBlockNumber() {
    const base = 4821093;
    const trades = storage.getTrades().length;
    return (base + trades * 3 + Math.floor(Math.random() * 2)).toLocaleString();
  }

  function generateGas() {
    return (72000 + Math.floor(Math.random() * 20000)).toLocaleString();
  }

  // ─── AGENT 1: DATA VERIFICATION ─────────────────────────────────────────────
  function runAgent1(trade) {
    const checks = [];
    const flags = [];

    // Check 1: Invoice math — does escrow ≈ qty × price?
    const calculatedTotal = trade.quantity * trade.pricePerUnit;
    const variance = Math.abs(calculatedTotal - trade.escrow) / trade.escrow;
    if (variance > 0.15) {
      checks.push({ label: 'Invoice total reconciliation', result: 'FAIL', detail: `Escrow $${trade.escrow.toLocaleString()} vs calculated $${Math.round(calculatedTotal).toLocaleString()} — ${Math.round(variance * 100)}% variance` });
      flags.push({ title: 'Invoice total mismatch', detail: `Declared escrow ($${trade.escrow.toLocaleString()}) differs from quantity × price ($${Math.round(calculatedTotal).toLocaleString()}) by ${Math.round(variance * 100)}%`, agent: 'Agent 1 — Verification AI' });
    } else {
      checks.push({ label: 'Invoice total reconciliation', result: 'PASS', detail: `$${trade.escrow.toLocaleString()} matches qty × price within tolerance` });
    }

    // Check 2: Price per unit vs market range
    const market = MARKET_PRICES[trade.category] || MARKET_PRICES['Other'];
    const priceRatio = trade.pricePerUnit / market.max;
    if (trade.pricePerUnit < market.min * 0.1) {
      checks.push({ label: 'Price per unit — market check', result: 'FAIL', detail: `$${trade.pricePerUnit}/${market.unit} is suspiciously low (market min: $${market.min})` });
      flags.push({ title: 'Abnormally low unit price', detail: `$${trade.pricePerUnit}/${market.unit} is ${Math.round((1 - trade.pricePerUnit/market.min)*100)}% below market minimum for ${trade.category}`, agent: 'Agent 1 — Verification AI' });
    } else if (trade.pricePerUnit > market.max * 3) {
      checks.push({ label: 'Price per unit — market check', result: 'FAIL', detail: `$${trade.pricePerUnit}/${market.unit} is ${Math.round(priceRatio)}× above market ceiling ($${market.max})` });
      flags.push({ title: `Price anomaly — ${Math.round(priceRatio * 100)}% above market rate`, detail: `Declared: $${trade.pricePerUnit}/${market.unit} · Market ceiling: $${market.max}/${market.unit} · Anomaly score: ${Math.min(0.99, (priceRatio/3)).toFixed(2)}`, agent: 'Agent 1 — Verification AI' });
    } else {
      checks.push({ label: 'Price per unit — market check', result: 'PASS', detail: `$${trade.pricePerUnit}/${market.unit} within normal range for ${trade.category}` });
    }

    // Check 3: Duplicate invoice ID
    const existingIds = storage.getInvoiceIds();
    const allKnown = [...KNOWN_DUPLICATES, ...existingIds.filter(id => id !== trade.invoiceId)];
    if (trade.invoiceId && allKnown.includes(trade.invoiceId)) {
      checks.push({ label: 'Duplicate invoice ID check', result: 'FAIL', detail: `Invoice ID "${trade.invoiceId}" has been used in a previous trade` });
      flags.push({ title: 'Duplicate invoice ID detected', detail: `Invoice ID ${trade.invoiceId} was previously used. Possible document reuse or fraud.`, agent: 'Agent 1 — Verification AI' });
    } else {
      checks.push({ label: 'Duplicate invoice ID check', result: 'PASS', detail: `${trade.invoiceId || 'N/A'} — no duplicates found` });
    }

    // Check 4: Quantity sanity
    if (trade.quantity <= 0) {
      checks.push({ label: 'Quantity validation', result: 'FAIL', detail: 'Quantity must be greater than zero' });
      flags.push({ title: 'Invalid quantity', detail: 'Quantity is zero or negative', agent: 'Agent 1 — Verification AI' });
    } else if (trade.quantity > 1000000) {
      checks.push({ label: 'Quantity validation', result: 'WARN', detail: `${trade.quantity.toLocaleString()} units — unusually high, flagging for review` });
    } else {
      checks.push({ label: 'Quantity validation', result: 'PASS', detail: `${trade.quantity.toLocaleString()} ${market.unit}` });
    }

    // Check 5: Suspicious product name
    const suspiciousName = SUSPICIOUS_KEYWORDS.some(k => trade.product.toLowerCase().includes(k));
    if (suspiciousName) {
      checks.push({ label: 'Product name validation', result: 'FAIL', detail: `Product name "${trade.product}" contains suspicious keywords` });
      flags.push({ title: 'Suspicious product name', detail: `Product name contains flagged keywords. Likely a test or fraudulent entry.`, agent: 'Agent 1 — Verification AI' });
    } else {
      checks.push({ label: 'Product name validation', result: 'PASS', detail: `"${trade.product}" — no suspicious patterns` });
    }

    const passed = flags.length === 0;
    const score = Math.max(10, Math.round(100 - flags.length * 25 - (variance > 0.05 ? variance * 20 : 0)));
    return { passed, score: Math.min(score, 99), checks, flags };
  }

  // ─── AGENT 2: DOCUMENT VERIFICATION ──────────────────────────────────────────
  function runAgent2(trade, docs) {
    const checks = [];
    const flags = [];

    // Check 1: Required documents present
    const hasInvoice = docs.some(d => d.type === 'invoice');
    const hasBOL = docs.some(d => d.type === 'bol');
    const hasCOO = docs.some(d => d.type === 'coo');

    if (!hasInvoice) {
      checks.push({ label: 'Commercial invoice', result: 'FAIL', detail: 'Required document missing' });
      flags.push({ title: 'Missing commercial invoice', detail: 'Commercial invoice is required for all international trades', agent: 'Agent 2 — Document AI' });
    } else {
      checks.push({ label: 'Commercial invoice', result: 'PASS', detail: 'Document present and hashed' });
    }
    if (!hasBOL) {
      checks.push({ label: 'Bill of lading', result: 'FAIL', detail: 'Required document missing' });
      flags.push({ title: 'Missing bill of lading', detail: 'Bill of lading required for shipment verification', agent: 'Agent 2 — Document AI' });
    } else {
      checks.push({ label: 'Bill of lading', result: 'PASS', detail: 'Document present and hashed' });
    }
    if (!hasCOO) {
      checks.push({ label: 'Certificate of origin', result: 'FAIL', detail: 'Required document missing' });
      flags.push({ title: 'Missing certificate of origin', detail: 'Certificate of origin required for customs compliance', agent: 'Agent 2 — Document AI' });
    } else {
      checks.push({ label: 'Certificate of origin', result: 'PASS', detail: 'Document present and hashed' });
    }

    // Check 2: File size sanity (too small = likely empty/fake)
    docs.forEach(doc => {
      if (doc.size < 10000) { // less than 10KB
        checks.push({ label: `File size check — ${doc.name}`, result: 'WARN', detail: `${(doc.size/1024).toFixed(1)} KB is unusually small for a trade document` });
      } else {
        checks.push({ label: `File size check — ${doc.name}`, result: 'PASS', detail: `${(doc.size/1024).toFixed(0)} KB` });
      }
    });

    // Check 3: Hash consistency (simulated — checks if hash was tampered)
    docs.forEach(doc => {
      if (doc.tampered) {
        checks.push({ label: `Hash integrity — ${doc.name}`, result: 'FAIL', detail: `Hash mismatch: stored ${doc.originalHash} ≠ received ${doc.hash}` });
        flags.push({ title: `Document hash mismatch — ${doc.name}`, detail: `Stored: ${doc.originalHash} · Received: ${doc.hash} · Document may have been altered after submission`, agent: 'Agent 2 — Document AI' });
      } else {
        checks.push({ label: `Hash integrity — ${doc.name}`, result: 'PASS', detail: `Hash verified: ${doc.hash}` });
      }
    });

    // Check 4: OCR cross-reference (simulated — checks doc names contain trade keywords)
    if (hasInvoice) {
      const invoiceDoc = docs.find(d => d.type === 'invoice');
      const nameMatch = invoiceDoc && (
        invoiceDoc.name.toLowerCase().includes(trade.product.toLowerCase().split(' ')[0]) ||
        invoiceDoc.name.toLowerCase().includes('invoice') ||
        invoiceDoc.name.toLowerCase().includes('inv')
      );
      if (!nameMatch) {
        checks.push({ label: 'OCR — invoice product match', result: 'WARN', detail: 'Could not confirm product name in invoice filename' });
      } else {
        checks.push({ label: 'OCR — invoice product match', result: 'PASS', detail: 'Product reference found in document' });
      }
    }

    const passed = flags.length === 0;
    const missingDocs = [!hasInvoice, !hasBOL, !hasCOO].filter(Boolean).length;
    const score = Math.max(10, Math.round(100 - missingDocs * 30 - flags.filter(f => !f.title.includes('Missing')).length * 15));
    return { passed, score: Math.min(score, 99), checks, flags };
  }

  // ─── COMBINED VERDICT ────────────────────────────────────────────────────────
  function runVerification(trade, docs) {
    const a1 = runAgent1(trade);
    const a2 = runAgent2(trade, docs);

    const allFlags = [...a1.flags, ...a2.flags];
    const passed = a1.passed && a2.passed;
    const combinedScore = Math.round((a1.score + a2.score) / 2);

    const timestamp = Date.now();
    const txHash = generateTxHash(trade.id, timestamp);
    const blockNumber = generateBlockNumber();
    const gasUsed = generateGas();

    return {
      passed,
      score: combinedScore,
      agent1: a1,
      agent2: a2,
      flags: allFlags,
      blockchain: {
        txHash,
        blockNumber,
        gasUsed,
        timestamp: new Date(timestamp).toISOString(),
        escrowStatus: passed ? 'RELEASED' : 'HELD',
        network: 'Base Testnet (Chain ID: 84532)',
        contract: '0x3a9b1c7f2d8e4a6b...c441',
      }
    };
  }

  // ─── TAMPER DEMO ENGINE ──────────────────────────────────────────────────────
  // Used by the dashboard tamper demo — returns results for clean vs tampered doc
  function runTamperDemo(type) {
    const cleanTrade = {
      id: 'TRD-DEMO', product: 'Auto Parts', manufacturer: 'Detroit MFG',
      buyer: 'Seoul Motors', category: 'Automotive',
      quantity: 820, pricePerUnit: 50, escrow: 41000,
      invoiceId: 'INV-2026-DEMO-CLEAN',
    };
    const cleanDocs = [
      { type: 'invoice', name: 'Invoice_AutoParts_2026.pdf', size: 215000, hash: '0x7f3ac912', tampered: false },
      { type: 'bol', name: 'BOL_Detroit_Seoul.pdf', size: 180000, hash: '0xaa128f44', tampered: false },
      { type: 'coo', name: 'COO_US_2026.pdf', size: 95000, hash: '0xc3092b71', tampered: false },
    ];
    const tamperedDocs = [
      { type: 'invoice', name: 'Invoice_AutoParts_modified.pdf', size: 215000, hash: '0x2b9eff01', originalHash: '0x7f3ac912', tampered: true },
      { type: 'bol', name: 'BOL_Detroit_Seoul.pdf', size: 180000, hash: '0xaa128f44', tampered: false },
      { type: 'coo', name: 'COO_US_2026.pdf', size: 95000, hash: '0xc3092b71', tampered: false },
    ];
    return runVerification(cleanTrade, type === 'clean' ? cleanDocs : tamperedDocs);
  }

  // ─── STATS CALCULATOR ────────────────────────────────────────────────────────
  function getStats() {
    const trades = storage.getTrades();
    const verified = trades.filter(t => t.status === 'verified').length;
    const flagged = trades.filter(t => t.status === 'flagged').length;
    const pending = trades.filter(t => t.status === 'pending').length;
    const totalEscrow = trades.filter(t => t.status === 'pending' || t.status === 'flagged')
      .reduce((sum, t) => sum + (t.escrow || 0), 0);
    const totalVolume = trades.reduce((sum, t) => sum + (t.escrow || 0), 0);
    return { total: trades.length, verified, flagged, pending, totalEscrow, totalVolume };
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────────────────
  return {
    init: seedDemoTrades,
    storage,
    runVerification,
    runTamperDemo,
    runAgent1,
    runAgent2,
    getStats,
    generateTxHash,
    generateBlockNumber,
    hashFromString,
    MARKET_PRICES,
  };
})();

// Auto-init on load
TrustTrade.init();
// ─── BLOCKCHAIN INTEGRATION ──────────────────────────────────────────────────
const TrustChain = (() => {

  const CONTRACT_ADDRESS = '0x1E14905E3853B55a34BF69c13cF02464628d0E66';
  const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "tradeId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "EscrowHeld",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "tradeId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "EscrowReleased",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "tradeId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "product",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "manufacturer",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "buyer",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "category",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "quantity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pricePerUnitCents",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "escrowUSD",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "invoiceId",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "docHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct TrustTrade.TradeInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "submitTrade",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "tradeId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "aiScore",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "TradeFlagged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "tradeId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "escrowUSD",
        "type": "uint256"
      }
    ],
    "name": "TradeSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "tradeId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "aiScore",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "passed",
        "type": "bool"
      }
    ],
    "name": "TradeVerified",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tradeId",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "aiScore",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "agent1Pass",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "agent2Pass",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "flagReason",
        "type": "string"
      }
    ],
    "name": "verifyTrade",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllTradeIds",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tradeId",
        "type": "string"
      }
    ],
    "name": "getTrade",
    "outputs": [
      {
        "internalType": "string",
        "name": "product",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "manufacturer",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "buyer",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "escrowUSD",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "invoiceId",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "aiScore",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "agent1Pass",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "agent2Pass",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTradeCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "invoiceUsed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "invoiceId",
        "type": "string"
      }
    ],
    "name": "isInvoiceDuplicate",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tradeCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tradeIds",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

  let provider = null;
  let signer   = null;
  let contract = null;

  async function connect() {
    if (!window.ethereum) {
      console.warn('MetaMask not found — running in demo mode');
      return false;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer   = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const network = await provider.getNetwork();
    if (network.chainId !== 84532n) {
      console.warn('Wrong network — switch to Base Sepolia');
      return false;
    }
    return true;
  }

  async function submitTrade(trade) {
    try {
      const ok = await connect();
      if (!ok) return null;

      const input = {
        tradeId: trade.id,
        product: trade.product,
        manufacturer: trade.manufacturer,
        buyer: trade.buyer,
        category: trade.category,
        quantity: trade.quantity,
        pricePerUnitCents: Math.round(trade.pricePerUnit * 100),
        escrowUSD: trade.escrow,
        invoiceId: trade.invoiceId,
        docHash: trade.docHash || '0x' + '0'.repeat(64)
      };

      const tx = await contract.submitTrade(input);
      console.log('Submit TX sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Confirmed in block:', receipt.blockNumber);
      return { txHash: tx.hash, blockNumber: receipt.blockNumber };

    } catch (err) {
      console.error('Submit trade failed:', err);
      return null;
    }
  }

  async function recordVerification(trade, result) {
    try {
      const ok = await connect();
      if (!ok) return null;

      const tx = await contract.verifyTrade(
        trade.id,
        result.score,
        result.agent1.passed,
        result.agent2.passed,
        result.flags.length > 0 ? result.flags.map(f => f.title).join('; ') : ''
      );

      console.log('TX sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Confirmed in block:', receipt.blockNumber);
      return { txHash: tx.hash, blockNumber: receipt.blockNumber };

    } catch (err) {
      console.error('Chain write failed:', err);
      return null;
    }
  }

  return { connect, submitTrade, recordVerification };
})();