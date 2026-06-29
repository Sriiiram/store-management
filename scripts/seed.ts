import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "store.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create all tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    gstin TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    category_id INTEGER REFERENCES categories(id),
    hsn_code TEXT,
    unit TEXT DEFAULT 'PCS',
    gst_rate REAL DEFAULT 18,
    description TEXT,
    image_url TEXT,
    cost_price REAL DEFAULT 0,
    mrp REAL DEFAULT 0,
    selling_price_gst REAL DEFAULT 0,
    selling_price_cash REAL DEFAULT 0,
    min_margin_pct REAL DEFAULT 10,
    reorder_level INTEGER DEFAULT 5,
    max_stock INTEGER DEFAULT 100,
    supplier_id INTEGER REFERENCES suppliers(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE REFERENCES products(id),
    what_it_does TEXT,
    what_it_cant_do TEXT,
    best_for TEXT,
    not_suitable_for TEXT,
    key_specs TEXT,
    common_questions TEXT,
    accessories TEXT,
    alternatives TEXT,
    pro_tips TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS godowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    godown_id INTEGER NOT NULL REFERENCES godowns(id),
    rack TEXT,
    shelf TEXT,
    zone TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    quantity INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(product_id, location_id)
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    from_location TEXT,
    to_location TEXT,
    reference TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE,
    type TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_gstin TEXT,
    subtotal REAL DEFAULT 0,
    gst_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    payment_mode TEXT DEFAULT 'CASH',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    gst_rate REAL DEFAULT 0,
    gst_amount REAL DEFAULT 0,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    field TEXT NOT NULL,
    old_value REAL NOT NULL,
    new_value REAL NOT NULL,
    changed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
  CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_items(product_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_items(location_id);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
  CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type);
  CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
  CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
  CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
`);

// ─── Seed Data ─────────────────────────────────────────────────────────────────

console.log("Creating categories...");
const insertCategory = sqlite.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
const categoryNames = ["Power Tools", "Hand Tools", "Fasteners", "Plumbing", "Electrical", "Safety Equipment"];
categoryNames.forEach(name => insertCategory.run(name));

console.log("Creating suppliers...");
const insertSupplier = sqlite.prepare("INSERT OR IGNORE INTO suppliers (name, phone, gstin, address) VALUES (?, ?, ?, ?)");
insertSupplier.run("Sharma Traders", "9876543210", "07AAACS1234A1Z5", "Karol Bagh, New Delhi");
insertSupplier.run("Patel Hardware Mumbai", "9823456789", "27AABCP5678B1Z3", "Lamington Road, Mumbai");
insertSupplier.run("Singh Electricals", "9812345678", "03AAFCS9012C1Z1", "Industrial Area, Ludhiana");

console.log("Creating godowns...");
const insertGodown = sqlite.prepare("INSERT OR IGNORE INTO godowns (name, address) VALUES (?, ?)");
insertGodown.run("Main Store", "Ground floor, shop front");
insertGodown.run("Godown A - Heavy Items", "Back warehouse, behind store");
insertGodown.run("Godown B - Electrical", "First floor storage");

const godownRows = sqlite.prepare("SELECT id, name FROM godowns").all() as { id: number; name: string }[];
const godownMap: Record<string, number> = {};
godownRows.forEach((g) => { godownMap[g.name] = g.id; });

console.log("Creating locations...");
const insertLocation = sqlite.prepare("INSERT OR IGNORE INTO locations (code, godown_id, rack, shelf, zone) VALUES (?, ?, ?, ?, ?)");
const locationData = [
  { code: "MS-R1-S1", godownId: godownMap["Main Store"], rack: "R1", shelf: "S1", zone: "Front" },
  { code: "MS-R1-S2", godownId: godownMap["Main Store"], rack: "R1", shelf: "S2", zone: "Front" },
  { code: "MS-R2-S1", godownId: godownMap["Main Store"], rack: "R2", shelf: "S1", zone: "Middle" },
  { code: "MS-R2-S2", godownId: godownMap["Main Store"], rack: "R2", shelf: "S2", zone: "Middle" },
  { code: "MS-R3-S1", godownId: godownMap["Main Store"], rack: "R3", shelf: "S1", zone: "Back" },
  { code: "GA-R1-S1", godownId: godownMap["Godown A - Heavy Items"], rack: "R1", shelf: "S1", zone: "Front" },
  { code: "GA-R1-S2", godownId: godownMap["Godown A - Heavy Items"], rack: "R1", shelf: "S2", zone: "Front" },
  { code: "GA-R2-S1", godownId: godownMap["Godown A - Heavy Items"], rack: "R2", shelf: "S1", zone: "Middle" },
  { code: "GA-R2-S2", godownId: godownMap["Godown A - Heavy Items"], rack: "R2", shelf: "S2", zone: "Middle" },
  { code: "GA-R3-S1", godownId: godownMap["Godown A - Heavy Items"], rack: "R3", shelf: "S1", zone: "Back" },
  { code: "GB-R1-S1", godownId: godownMap["Godown B - Electrical"], rack: "R1", shelf: "S1", zone: "Front" },
  { code: "GB-R1-S2", godownId: godownMap["Godown B - Electrical"], rack: "R1", shelf: "S2", zone: "Front" },
  { code: "GB-R2-S1", godownId: godownMap["Godown B - Electrical"], rack: "R2", shelf: "S1", zone: "Middle" },
  { code: "GB-R2-S2", godownId: godownMap["Godown B - Electrical"], rack: "R2", shelf: "S2", zone: "Middle" },
];
locationData.forEach(loc => insertLocation.run(loc.code, loc.godownId, loc.rack, loc.shelf, loc.zone));

console.log("Creating products...");
const insertProduct = sqlite.prepare(`
  INSERT OR IGNORE INTO products (sku, name, brand, category_id, hsn_code, unit, gst_rate, description, cost_price, mrp, selling_price_gst, selling_price_cash, min_margin_pct, reorder_level, max_stock, supplier_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const productData = [
  { sku: "PT-001", name: "Bosch GSB 550 Impact Drill", brand: "Bosch", catIdx: 0, hsn: "8467", unit: "PCS", gst: 18, desc: "550W impact drill for home and professional use", cost: 2850, mrp: 4499, gst_price: 3999, cash_price: 3800, margin: 15, reorder: 5, max: 20, suppIdx: 0 },
  { sku: "PT-002", name: "Dewalt DW801 Angle Grinder 4\"", brand: "Dewalt", catIdx: 0, hsn: "8467", unit: "PCS", gst: 18, desc: "850W heavy duty angle grinder", cost: 3200, mrp: 5299, gst_price: 4599, cash_price: 4400, margin: 15, reorder: 3, max: 15, suppIdx: 0 },
  { sku: "PT-003", name: "Bosch GWS 600 Angle Grinder", brand: "Bosch", catIdx: 0, hsn: "8467", unit: "PCS", gst: 18, desc: "670W angle grinder for cutting and grinding", cost: 2400, mrp: 3999, gst_price: 3499, cash_price: 3300, margin: 15, reorder: 4, max: 20, suppIdx: 0 },
  { sku: "PT-004", name: "Bosch GST 650 Jigsaw", brand: "Bosch", catIdx: 0, hsn: "8467", unit: "PCS", gst: 18, desc: "450W jigsaw for wood and metal cutting", cost: 3100, mrp: 4999, gst_price: 4499, cash_price: 4200, margin: 15, reorder: 2, max: 10, suppIdx: 0 },
  { sku: "PT-005", name: "Makita HP1630 Hammer Drill", brand: "Makita", catIdx: 0, hsn: "8467", unit: "PCS", gst: 18, desc: "710W hammer drill for concrete and masonry", cost: 3800, mrp: 5999, gst_price: 5499, cash_price: 5200, margin: 15, reorder: 3, max: 10, suppIdx: 0 },
  { sku: "HT-001", name: "Stanley 8-Piece Screwdriver Set", brand: "Stanley", catIdx: 1, hsn: "8205", unit: "SET", gst: 18, desc: "Professional cushion grip screwdriver set", cost: 450, mrp: 899, gst_price: 749, cash_price: 700, margin: 20, reorder: 10, max: 50, suppIdx: 0 },
  { sku: "HT-002", name: "Taparia Combination Plier 8\"", brand: "Taparia", catIdx: 1, hsn: "8203", unit: "PCS", gst: 18, desc: "Heavy duty combination plier with insulated grip", cost: 280, mrp: 520, gst_price: 449, cash_price: 420, margin: 20, reorder: 15, max: 60, suppIdx: 0 },
  { sku: "HT-003", name: "Stanley Measuring Tape 5m", brand: "Stanley", catIdx: 1, hsn: "9017", unit: "PCS", gst: 18, desc: "5m/16ft powerlock measuring tape", cost: 180, mrp: 399, gst_price: 329, cash_price: 300, margin: 20, reorder: 20, max: 100, suppIdx: 0 },
  { sku: "HT-004", name: "Taparia Adjustable Wrench 10\"", brand: "Taparia", catIdx: 1, hsn: "8204", unit: "PCS", gst: 18, desc: "Chrome vanadium adjustable wrench", cost: 520, mrp: 999, gst_price: 849, cash_price: 800, margin: 18, reorder: 8, max: 30, suppIdx: 0 },
  { sku: "HT-005", name: "Hacksaw Frame with Blade", brand: "Generic", catIdx: 1, hsn: "8202", unit: "PCS", gst: 18, desc: "Adjustable hacksaw frame 12 inch with blade", cost: 150, mrp: 320, gst_price: 269, cash_price: 250, margin: 20, reorder: 10, max: 40, suppIdx: 0 },
  { sku: "FS-001", name: "GI Bolts M10x50 (Box of 50)", brand: "Generic", catIdx: 2, hsn: "7318", unit: "BOX", gst: 18, desc: "Galvanized iron hex bolts M10x50mm", cost: 280, mrp: 500, gst_price: 450, cash_price: 420, margin: 20, reorder: 20, max: 100, suppIdx: 1 },
  { sku: "FS-002", name: "SS Self-Tapping Screws 25mm (100pc)", brand: "Generic", catIdx: 2, hsn: "7318", unit: "PKT", gst: 18, desc: "Stainless steel self-tapping screws", cost: 120, mrp: 250, gst_price: 210, cash_price: 190, margin: 25, reorder: 30, max: 200, suppIdx: 1 },
  { sku: "FS-003", name: "Anchor Fastener 10mm (Box 50)", brand: "Hilti", catIdx: 2, hsn: "7318", unit: "BOX", gst: 18, desc: "Expansion anchor fasteners for concrete", cost: 450, mrp: 850, gst_price: 749, cash_price: 700, margin: 20, reorder: 10, max: 50, suppIdx: 1 },
  { sku: "FS-004", name: "Nylon Wall Plugs 8mm (100pc)", brand: "Generic", catIdx: 2, hsn: "3926", unit: "PKT", gst: 18, desc: "Nylon rawl plugs for wall mounting", cost: 60, mrp: 150, gst_price: 120, cash_price: 100, margin: 30, reorder: 50, max: 300, suppIdx: 1 },
  { sku: "FS-005", name: "MS Nuts M8 (1kg)", brand: "Generic", catIdx: 2, hsn: "7318", unit: "KG", gst: 18, desc: "Mild steel hex nuts M8", cost: 95, mrp: 180, gst_price: 160, cash_price: 145, margin: 20, reorder: 25, max: 150, suppIdx: 1 },
  { sku: "PL-001", name: "Cera Angle Valve 15mm", brand: "Cera", catIdx: 3, hsn: "8481", unit: "PCS", gst: 18, desc: "Chrome plated brass angle valve", cost: 320, mrp: 650, gst_price: 550, cash_price: 500, margin: 20, reorder: 10, max: 40, suppIdx: 1 },
  { sku: "PL-002", name: "Astral CPVC Pipe 1\" (3m)", brand: "Astral", catIdx: 3, hsn: "3917", unit: "PCS", gst: 18, desc: "CPVC hot/cold water pipe 1 inch 3m length", cost: 280, mrp: 450, gst_price: 399, cash_price: 370, margin: 15, reorder: 15, max: 60, suppIdx: 1 },
  { sku: "PL-003", name: "Teflon Tape 12mm (10 rolls)", brand: "Generic", catIdx: 3, hsn: "3919", unit: "PKT", gst: 18, desc: "PTFE thread seal tape for plumbing joints", cost: 80, mrp: 180, gst_price: 150, cash_price: 130, margin: 25, reorder: 30, max: 200, suppIdx: 1 },
  { sku: "PL-004", name: "PVC Ball Valve 1\"", brand: "Generic", catIdx: 3, hsn: "8481", unit: "PCS", gst: 18, desc: "PVC ball valve for water lines", cost: 65, mrp: 150, gst_price: 120, cash_price: 100, margin: 25, reorder: 20, max: 80, suppIdx: 1 },
  { sku: "PL-005", name: "Jaguar Health Faucet Set", brand: "Jaguar", catIdx: 3, hsn: "8481", unit: "SET", gst: 18, desc: "Complete health faucet with hose and hook", cost: 480, mrp: 999, gst_price: 849, cash_price: 780, margin: 20, reorder: 8, max: 30, suppIdx: 1 },
  { sku: "EL-001", name: "Havells 1.5mm Wire 90m (FR)", brand: "Havells", catIdx: 4, hsn: "8544", unit: "COIL", gst: 18, desc: "Flame retardant PVC insulated copper wire", cost: 1850, mrp: 2800, gst_price: 2499, cash_price: 2350, margin: 12, reorder: 5, max: 20, suppIdx: 2 },
  { sku: "EL-002", name: "Havells 2.5mm Wire 90m (FR)", brand: "Havells", catIdx: 4, hsn: "8544", unit: "COIL", gst: 18, desc: "2.5 sq mm FR copper wire for power circuits", cost: 2900, mrp: 4500, gst_price: 3999, cash_price: 3800, margin: 12, reorder: 4, max: 15, suppIdx: 2 },
  { sku: "EL-003", name: "Anchor Roma Switch 6A", brand: "Anchor", catIdx: 4, hsn: "8536", unit: "PCS", gst: 18, desc: "Modular switch 6 amp for lighting circuits", cost: 45, mrp: 95, gst_price: 79, cash_price: 70, margin: 25, reorder: 50, max: 300, suppIdx: 2 },
  { sku: "EL-004", name: "Legrand MCB 16A SP", brand: "Legrand", catIdx: 4, hsn: "8536", unit: "PCS", gst: 18, desc: "Single pole miniature circuit breaker 16 amp", cost: 180, mrp: 350, gst_price: 299, cash_price: 270, margin: 20, reorder: 20, max: 100, suppIdx: 2 },
  { sku: "EL-005", name: "Polycab Junction Box 8-way", brand: "Polycab", catIdx: 4, hsn: "8538", unit: "PCS", gst: 18, desc: "8 way single door MCB distribution board", cost: 350, mrp: 699, gst_price: 599, cash_price: 550, margin: 20, reorder: 5, max: 25, suppIdx: 2 },
  { sku: "SF-001", name: "3M Safety Goggles", brand: "3M", catIdx: 5, hsn: "9004", unit: "PCS", gst: 18, desc: "Clear polycarbonate safety goggles with anti-fog", cost: 180, mrp: 399, gst_price: 329, cash_price: 300, margin: 20, reorder: 10, max: 50, suppIdx: 0 },
  { sku: "SF-002", name: "Karam Safety Helmet White", brand: "Karam", catIdx: 5, hsn: "6506", unit: "PCS", gst: 18, desc: "ISI marked industrial safety helmet with ratchet", cost: 220, mrp: 450, gst_price: 379, cash_price: 350, margin: 20, reorder: 8, max: 30, suppIdx: 0 },
  { sku: "SF-003", name: "Honeywell Cut-Resistant Gloves", brand: "Honeywell", catIdx: 5, hsn: "6116", unit: "PAIR", gst: 12, desc: "Level 5 cut resistant work gloves", cost: 350, mrp: 699, gst_price: 599, cash_price: 550, margin: 20, reorder: 10, max: 40, suppIdx: 0 },
  { sku: "SF-004", name: "3M Ear Plugs (Pack of 5)", brand: "3M", catIdx: 5, hsn: "9004", unit: "PKT", gst: 18, desc: "Reusable corded ear plugs NRR 25dB", cost: 120, mrp: 280, gst_price: 229, cash_price: 200, margin: 25, reorder: 15, max: 80, suppIdx: 0 },
  { sku: "SF-005", name: "Venus Safety Shoes Size 8", brand: "Venus", catIdx: 5, hsn: "6403", unit: "PAIR", gst: 18, desc: "Steel toe safety shoes with PU sole", cost: 650, mrp: 1299, gst_price: 1099, cash_price: 999, margin: 20, reorder: 3, max: 12, suppIdx: 0 },
];

const catRows = sqlite.prepare("SELECT id, name FROM categories").all() as { id: number; name: string }[];
const suppRows = sqlite.prepare("SELECT id, name FROM suppliers").all() as { id: number; name: string }[];

productData.forEach(p => {
  insertProduct.run(p.sku, p.name, p.brand, catRows[p.catIdx].id, p.hsn, p.unit, p.gst, p.desc, p.cost, p.mrp, p.gst_price, p.cash_price, p.margin, p.reorder, p.max, suppRows[p.suppIdx].id);
});

console.log("Adding product knowledge...");
const insertKnowledge = sqlite.prepare(`
  INSERT OR IGNORE INTO product_knowledge (product_id, what_it_does, what_it_cant_do, best_for, not_suitable_for, key_specs, common_questions, accessories, alternatives, pro_tips)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const prodRows = sqlite.prepare("SELECT id, sku FROM products").all() as { id: number; sku: string }[];
const prodMap: Record<string, number> = {};
prodRows.forEach(p => { prodMap[p.sku] = p.id; });

const knowledgeData = [
  {
    sku: "PT-001",
    does: "Drills holes in wood, metal, and light masonry. Variable speed control. Forward/reverse. Impact mode for masonry.",
    cant: "Cannot drill reinforced concrete (RCC). Not suitable for continuous 8-hour heavy use. No SDS chuck for hammer bits.",
    best: "Home improvement, electricians drilling conduit holes, light professional work, DIY projects",
    notFor: "Heavy construction sites, RCC drilling, daily contractor use over 4 hours",
    specs: "550W motor, 0-2800 RPM, 13mm keyed chuck, 1.7kg weight, impact rate 44800 bpm",
    questions: "Q: Will it work on concrete? A: Yes for hollow blocks and light masonry, NOT for solid RCC walls. Q: Can I use it as a screwdriver? A: Yes, it has forward/reverse.",
    accessories: "HSS drill bits for metal, masonry bits for walls, wood spade bits, 13mm chuck key",
    alternatives: "Step up: Makita HP1630 (710W, more power for masonry). Budget: Generic 500W (less durable). Same range: Bosch GSB 570.",
    tips: "If customer asks for 'concrete drilling' - ask if it's RCC or hollow block. For RCC, push the Makita HP1630 instead."
  },
  {
    sku: "PT-002",
    does: "Cuts metal, tiles, stone. Grinds and polishes surfaces. Removes rust and paint. Wire brushing.",
    cant: "Cannot cut wood safely (kickback risk). Not for precision cuts. Cannot be used as a drill. Not for wet cutting without special setup.",
    best: "Fabrication work, plumbers cutting pipes, tile cutters, daily construction use, removing old paint/rust",
    notFor: "Woodworking, precision cuts requiring straight lines, indoor work without dust protection",
    specs: "850W, 11000 RPM, 100mm (4 inch) disc, spindle lock, side handle included, 1.8kg",
    questions: "Q: Can I cut iron rods? A: Yes up to 12mm round bars easily. For thicker, go slow. Q: What disc for tiles? A: Use diamond cutting disc, not regular abrasive.",
    accessories: "Cutting discs (metal/stone), grinding wheels, flap discs, wire brush, diamond blade for tiles",
    alternatives: "Budget: Bosch GWS 600 (670W, lighter duty). Heavy: Dewalt DW803 (1000W). Same: Makita M9511B.",
    tips: "Always ask what they're cutting. Metal = regular cutting disc. Tiles/granite = diamond disc (sell as addon). Sell safety goggles with every grinder."
  },
  {
    sku: "HT-001",
    does: "Drives and removes Phillips and flathead screws. Cushion grip reduces hand fatigue. Chrome vanadium steel won't strip easily.",
    cant: "Cannot handle hex/torx screws. Not for high-torque applications. Not insulated for electrical work (use VDE set for that).",
    best: "General maintenance, assembling furniture, household repairs, workshop use",
    notFor: "Electrical panel work (need VDE insulated set), automotive (need socket set), hex bolts",
    specs: "8 pieces: PH0, PH1, PH2, PH3, SL3, SL5, SL6, SL8. Chrome vanadium steel, cushion grip handles.",
    questions: "Q: Is it good quality? A: Stanley is professional grade, lifetime warranty on material defects. Q: Will the tip wear out? A: CV steel lasts years with normal use.",
    accessories: "Magnetizer/demagnetizer, screw organizer tray, replacement bits",
    alternatives: "Budget: Taparia set (INR 300, decent for occasional use). Premium: Wera Kraftform (INR 2000+, best ergonomics).",
    tips: "If they ask for 'screwdriver set', always ask: general purpose or electrical work? Electrical = sell VDE insulated set at higher margin."
  },
  {
    sku: "EL-001",
    does: "Carries electrical current safely for lighting and fan circuits. Flame retardant PVC insulation. Handles up to 16A load.",
    cant: "Cannot be used for AC/geyser/high-power circuits (need 2.5mm or 4mm). Not for outdoor/underground burial without conduit.",
    best: "Lighting circuits, fan connections, switch boards, indoor wiring up to 16A",
    notFor: "Power circuits (AC, geyser, motor), outdoor exposed wiring, underground wiring, industrial 3-phase",
    specs: "1.5 sq mm, 90 meters, single core, PVC FR insulated, copper conductor, voltage grade 1100V",
    questions: "Q: How many points can I run? A: Safely 8-10 light/fan points on one run. Q: Which color for what? A: Red=phase, Black=neutral, Green=earth.",
    accessories: "Conduit pipes, junction boxes, MCBs, wire connectors, electrical tape",
    alternatives: "Economy: Polycab FR (slightly cheaper, same quality). Premium: Finolex FRLSH (low smoke). For power circuits: Havells 2.5mm.",
    tips: "Ask if it's for new wiring or extension. If new house wiring, calculate total coils needed: usually 2x 1.5mm (lights) + 2x 2.5mm (power) + 1x 4mm (AC)."
  },
  {
    sku: "PL-001",
    does: "Controls water flow to individual fixtures. Quarter-turn operation. Chrome finish matches bathroom fittings.",
    cant: "Cannot handle hot water above 90°C (use CPVC valve for that). Not for main line shutoff (use gate valve). Not for gas lines.",
    best: "Bathroom fixture connections (basin, toilet, geyser inlet), kitchen sink connection, washing machine inlet",
    notFor: "Main water supply shutoff, gas connections, industrial high-pressure lines, fire hydrant lines",
    specs: "15mm (1/2 inch), brass body, ceramic disc cartridge, chrome plated, 10 bar pressure rating",
    questions: "Q: Will it fit my toilet? A: Yes, standard 15mm thread fits all Indian toilet connections. Q: How long does it last? A: Ceramic disc = 5-8 years minimum.",
    accessories: "Teflon tape for sealing, connection hose, wall flange cover",
    alternatives: "Budget: Generic brass valve (INR 150, no warranty). Premium: Jaquar (INR 800, better finish). Same quality: Parryware.",
    tips: "Always sell teflon tape with any valve/pipe fitting. Remind customer: hand-tight + 2 turns with wrench = perfect seal."
  },
];

knowledgeData.forEach(k => {
  const pid = prodMap[k.sku];
  if (pid) insertKnowledge.run(pid, k.does, k.cant, k.best, k.notFor, k.specs, k.questions, k.accessories, k.alternatives, k.tips);
});

console.log("Adding inventory...");
const insertInventory = sqlite.prepare("INSERT OR IGNORE INTO inventory_items (product_id, location_id, quantity) VALUES (?, ?, ?)");
const locRows = sqlite.prepare("SELECT id, code FROM locations").all() as { id: number; code: string }[];
const locMap: Record<string, number> = {};
locRows.forEach(l => { locMap[l.code] = l.id; });

const inventoryData = [
  { sku: "PT-001", location: "MS-R1-S1", qty: 8 },
  { sku: "PT-002", location: "MS-R1-S1", qty: 5 },
  { sku: "PT-003", location: "MS-R1-S2", qty: 6 },
  { sku: "PT-004", location: "GA-R1-S1", qty: 3 },
  { sku: "PT-005", location: "GA-R1-S1", qty: 2 }, // Low stock
  { sku: "HT-001", location: "MS-R2-S1", qty: 25 },
  { sku: "HT-002", location: "MS-R2-S1", qty: 30 },
  { sku: "HT-003", location: "MS-R2-S2", qty: 40 },
  { sku: "HT-004", location: "MS-R2-S2", qty: 12 },
  { sku: "HT-005", location: "MS-R2-S2", qty: 15 },
  { sku: "FS-001", location: "GA-R2-S1", qty: 45 },
  { sku: "FS-002", location: "GA-R2-S1", qty: 80 },
  { sku: "FS-003", location: "GA-R2-S2", qty: 2 }, // Low stock
  { sku: "FS-004", location: "GA-R2-S2", qty: 120 },
  { sku: "FS-005", location: "GA-R2-S2", qty: 60 },
  { sku: "PL-001", location: "MS-R3-S1", qty: 15 },
  { sku: "PL-002", location: "GA-R3-S1", qty: 20 },
  { sku: "PL-003", location: "MS-R3-S1", qty: 80 },
  { sku: "PL-004", location: "MS-R3-S1", qty: 35 },
  { sku: "PL-005", location: "MS-R3-S1", qty: 12 },
  { sku: "EL-001", location: "GB-R1-S1", qty: 8 },
  { sku: "EL-002", location: "GB-R1-S1", qty: 4 }, // Low stock
  { sku: "EL-003", location: "GB-R1-S2", qty: 150 },
  { sku: "EL-004", location: "GB-R2-S1", qty: 45 },
  { sku: "EL-005", location: "GB-R2-S1", qty: 10 },
  { sku: "SF-001", location: "MS-R1-S2", qty: 20 },
  { sku: "SF-002", location: "GA-R1-S2", qty: 12 },
  { sku: "SF-003", location: "MS-R1-S2", qty: 18 },
  { sku: "SF-004", location: "MS-R1-S2", qty: 30 },
  { sku: "SF-005", location: "GA-R1-S2", qty: 4 },
];

inventoryData.forEach(inv => {
  const pid = prodMap[inv.sku];
  const lid = locMap[inv.location];
  if (pid && lid) insertInventory.run(pid, lid, inv.qty);
});

console.log("Creating sample sales...");
const insertSale = sqlite.prepare(`
  INSERT INTO sales (invoice_no, type, customer_name, customer_phone, customer_gstin, subtotal, gst_amount, discount, total_amount, payment_mode, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSaleItem = sqlite.prepare(`
  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, gst_rate, gst_amount, total)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

const sampleSales = [
  { inv: "INV-202606-0001", type: "GST", name: "Rajesh Constructions", phone: "9876543001", gstin: "07AABCR1234A1Z5", items: [{ sku: "PT-001", qty: 2, price: 3999 }, { sku: "SF-001", qty: 2, price: 329 }], payment: "UPI", daysAgo: 28 },
  { inv: null, type: "CASH", name: "Walk-in", phone: null, gstin: null, items: [{ sku: "HT-001", qty: 1, price: 700 }, { sku: "HT-003", qty: 2, price: 300 }], payment: "CASH", daysAgo: 27 },
  { inv: "INV-202606-0002", type: "GST", name: "Sharma Electricals", phone: "9876543002", gstin: "07AAFCS5678B1Z3", items: [{ sku: "EL-001", qty: 3, price: 2499 }, { sku: "EL-003", qty: 20, price: 79 }], payment: "CARD", daysAgo: 25 },
  { inv: null, type: "CASH", name: null, phone: null, gstin: null, items: [{ sku: "FS-001", qty: 2, price: 420 }, { sku: "FS-004", qty: 3, price: 100 }], payment: "CASH", daysAgo: 23 },
  { inv: null, type: "CASH", name: "Suresh", phone: "9876543003", gstin: null, items: [{ sku: "PL-001", qty: 4, price: 500 }, { sku: "PL-003", qty: 2, price: 130 }], payment: "UPI", daysAgo: 20 },
  { inv: "INV-202606-0003", type: "GST", name: "Metro Builders", phone: "9876543004", gstin: "07AADCM9012C1Z1", items: [{ sku: "PT-002", qty: 3, price: 4599 }, { sku: "SF-002", qty: 5, price: 379 }], payment: "CARD", daysAgo: 18 },
  { inv: null, type: "CASH", name: "Walk-in", phone: null, gstin: null, items: [{ sku: "HT-002", qty: 2, price: 420 }], payment: "CASH", daysAgo: 15 },
  { inv: null, type: "CASH", name: null, phone: null, gstin: null, items: [{ sku: "EL-004", qty: 4, price: 270 }, { sku: "EL-003", qty: 10, price: 70 }], payment: "CASH", daysAgo: 12 },
  { inv: "INV-202606-0004", type: "GST", name: "Gupta Plumbing Works", phone: "9876543005", gstin: "07AABCG3456D1Z7", items: [{ sku: "PL-002", qty: 10, price: 399 }, { sku: "PL-005", qty: 3, price: 849 }], payment: "UPI", daysAgo: 10 },
  { inv: null, type: "CASH", name: "Amit", phone: "9876543006", gstin: null, items: [{ sku: "PT-003", qty: 1, price: 3300 }], payment: "CASH", daysAgo: 8 },
  { inv: "INV-202606-0005", type: "GST", name: "Safe Build Corp", phone: "9876543007", gstin: "07AAFCS7890E1Z2", items: [{ sku: "SF-003", qty: 10, price: 599 }, { sku: "SF-005", qty: 2, price: 1099 }], payment: "CARD", daysAgo: 5 },
  { inv: null, type: "CASH", name: "Walk-in", phone: null, gstin: null, items: [{ sku: "FS-002", qty: 5, price: 190 }, { sku: "FS-005", qty: 3, price: 145 }], payment: "CASH", daysAgo: 3 },
  { inv: null, type: "CASH", name: "Ramesh", phone: "9876543008", gstin: null, items: [{ sku: "HT-004", qty: 1, price: 800 }, { sku: "HT-005", qty: 2, price: 250 }], payment: "UPI", daysAgo: 2 },
  { inv: "INV-202606-0006", type: "GST", name: "City Constructions", phone: "9876543009", gstin: "07AABCC1234F1Z9", items: [{ sku: "PT-005", qty: 2, price: 5499 }, { sku: "PT-001", qty: 3, price: 3999 }], payment: "CARD", daysAgo: 1 },
  { inv: null, type: "CASH", name: null, phone: null, gstin: null, items: [{ sku: "EL-001", qty: 1, price: 2350 }, { sku: "PL-004", qty: 5, price: 100 }], payment: "CASH", daysAgo: 0 },
];

sampleSales.forEach(sale => {
  let subtotal = 0;
  let gstAmount = 0;
  sale.items.forEach(item => {
    const itemTotal = item.qty * item.price;
    subtotal += itemTotal;
    if (sale.type === "GST") {
      const prod = productData.find(p => p.sku === item.sku);
      gstAmount += itemTotal * (prod?.gst || 18) / 100;
    }
  });
  const totalAmount = subtotal + gstAmount;

  const result = insertSale.run(
    sale.inv, sale.type, sale.name, sale.phone, sale.gstin,
    subtotal, gstAmount, 0, totalAmount, sale.payment, daysAgo(sale.daysAgo)
  );
  const saleId = result.lastInsertRowid as number;

  sale.items.forEach(item => {
    const prod = productData.find(p => p.sku === item.sku);
    const itemTotal = item.qty * item.price;
    const itemGst = sale.type === "GST" ? itemTotal * (prod?.gst || 18) / 100 : 0;
    insertSaleItem.run(saleId, prodMap[item.sku], item.qty, item.price, sale.type === "GST" ? (prod?.gst || 18) : 0, itemGst, itemTotal + itemGst);
  });
});

console.log("Database seeded successfully!");
console.log(`  - ${categoryNames.length} categories`);
console.log(`  - 3 suppliers`);
console.log(`  - 3 godowns, ${locationData.length} locations`);
console.log(`  - ${productData.length} products`);
console.log(`  - ${knowledgeData.length} knowledge entries`);
console.log(`  - ${inventoryData.length} inventory records`);
console.log(`  - ${sampleSales.length} sample sales`);

sqlite.close();
