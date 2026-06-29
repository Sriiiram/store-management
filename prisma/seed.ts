import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.productKnowledge.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
  await prisma.godown.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();

  // ─── Godowns ───────────────────────────────────────────────────
  const godowns = await Promise.all([
    prisma.godown.create({ data: { name: "Main Store", address: "Shop Floor, Ground Level" } }),
    prisma.godown.create({ data: { name: "Godown A - Heavy Items", address: "Warehouse Block A, Behind Main Store" } }),
    prisma.godown.create({ data: { name: "Godown B - Electrical", address: "Warehouse Block B, First Floor" } }),
  ]);
  console.log(`  ✓ ${godowns.length} godowns`);

  // ─── Locations ─────────────────────────────────────────────────
  const locationData: { code: string; godownId: number; rack: string; shelf: string; zone: string; description: string }[] = [];

  // Main Store - 10 locations
  const mainZones = ["Display", "Counter", "Back Wall"];
  for (let r = 1; r <= 4; r++) {
    for (let s = 1; s <= 3; s++) {
      if (locationData.filter((l) => l.godownId === godowns[0].id).length >= 10) break;
      locationData.push({
        code: `MS-R${r}-S${s}`,
        godownId: godowns[0].id,
        rack: `R${r}`,
        shelf: `S${s}`,
        zone: mainZones[r % 3],
        description: `Main Store Rack ${r} Shelf ${s}`,
      });
    }
  }

  // Godown A - 8 locations
  for (let r = 1; r <= 4; r++) {
    for (let s = 1; s <= 2; s++) {
      locationData.push({
        code: `GA-R${r}-S${s}`,
        godownId: godowns[1].id,
        rack: `R${r}`,
        shelf: `S${s}`,
        zone: r <= 2 ? "Pipes & Fittings" : "Heavy Equipment",
        description: `Godown A Rack ${r} Shelf ${s}`,
      });
    }
  }

  // Godown B - 9 locations
  for (let r = 1; r <= 3; r++) {
    for (let s = 1; s <= 3; s++) {
      locationData.push({
        code: `GB-R${r}-S${s}`,
        godownId: godowns[2].id,
        rack: `R${r}`,
        shelf: `S${s}`,
        zone: r === 1 ? "Wires" : r === 2 ? "Switches & MCBs" : "Lights & Fans",
        description: `Godown B Rack ${r} Shelf ${s}`,
      });
    }
  }

  await prisma.location.createMany({ data: locationData });
  const locations = await prisma.location.findMany();
  console.log(`  ✓ ${locations.length} locations`);

  // ─── Categories ────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Power Tools" } }),
    prisma.category.create({ data: { name: "Hand Tools" } }),
    prisma.category.create({ data: { name: "Fasteners" } }),
    prisma.category.create({ data: { name: "Plumbing" } }),
    prisma.category.create({ data: { name: "Electrical" } }),
    prisma.category.create({ data: { name: "Safety Equipment" } }),
  ]);
  const [powerTools, handTools, fasteners, plumbing, electrical, safety] = categories;
  console.log(`  ✓ ${categories.length} categories`);

  // ─── Suppliers ─────────────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: { name: "Sharma Traders Delhi", phone: "011-23456789", gstin: "07AABCS1234F1Z5", address: "Chawri Bazar, Old Delhi 110006" },
    }),
    prisma.supplier.create({
      data: { name: "Patel Hardware Mumbai", phone: "022-87654321", gstin: "27AABCP5678G1Z3", address: "Lohar Chawl, Mumbai 400002" },
    }),
    prisma.supplier.create({
      data: { name: "Singh Electricals Ludhiana", phone: "0161-2345678", gstin: "03AABCS9012H1Z1", address: "Industrial Area B, Ludhiana 141003" },
    }),
  ]);
  console.log(`  ✓ ${suppliers.length} suppliers`);

  // ─── Products ──────────────────────────────────────────────────
  const products = [
    // Power Tools (cat 0)
    { sku: "PT-001", name: "Bosch GSB 550 Impact Drill", brand: "Bosch", categoryId: powerTools.id, hsnCode: "8467", unit: "PCS", gstRate: 18, costPrice: 2800, mrp: 4299, sellingPriceGst: 3599, sellingPriceCash: 3400, reorderLevel: 3, maxStock: 20, supplierId: suppliers[0].id },
    { sku: "PT-002", name: "Dewalt DW801 Angle Grinder 4\"", brand: "Dewalt", categoryId: powerTools.id, hsnCode: "8467", unit: "PCS", gstRate: 18, costPrice: 3200, mrp: 5199, sellingPriceGst: 4399, sellingPriceCash: 4150, reorderLevel: 3, maxStock: 15, supplierId: suppliers[0].id },
    { sku: "PT-003", name: "Bosch GWS 600 Grinder", brand: "Bosch", categoryId: powerTools.id, hsnCode: "8467", unit: "PCS", gstRate: 18, costPrice: 2600, mrp: 3999, sellingPriceGst: 3299, sellingPriceCash: 3100, reorderLevel: 3, maxStock: 15, supplierId: suppliers[0].id },
    { sku: "PT-004", name: "Black+Decker KR554 Hammer Drill", brand: "Black+Decker", categoryId: powerTools.id, hsnCode: "8467", unit: "PCS", gstRate: 18, costPrice: 2400, mrp: 3799, sellingPriceGst: 3199, sellingPriceCash: 2999, reorderLevel: 2, maxStock: 10, supplierId: suppliers[0].id },
    { sku: "PT-005", name: "Makita MT Series Circular Saw", brand: "Makita", categoryId: powerTools.id, hsnCode: "8467", unit: "PCS", gstRate: 18, costPrice: 5500, mrp: 8499, sellingPriceGst: 7299, sellingPriceCash: 6900, reorderLevel: 2, maxStock: 8, supplierId: suppliers[0].id },

    // Hand Tools (cat 1)
    { sku: "HT-001", name: "Stanley 8-Piece Screwdriver Set", brand: "Stanley", categoryId: handTools.id, hsnCode: "8205", unit: "SET", gstRate: 18, costPrice: 420, mrp: 799, sellingPriceGst: 649, sellingPriceCash: 599, reorderLevel: 10, maxStock: 50, supplierId: suppliers[0].id },
    { sku: "HT-002", name: "Taparia Combination Plier 8\"", brand: "Taparia", categoryId: handTools.id, hsnCode: "8203", unit: "PCS", gstRate: 18, costPrice: 180, mrp: 350, sellingPriceGst: 279, sellingPriceCash: 250, reorderLevel: 15, maxStock: 60, supplierId: suppliers[0].id },
    { sku: "HT-003", name: "Taparia Wire Stripper", brand: "Taparia", categoryId: handTools.id, hsnCode: "8203", unit: "PCS", gstRate: 18, costPrice: 150, mrp: 299, sellingPriceGst: 239, sellingPriceCash: 215, reorderLevel: 10, maxStock: 40, supplierId: suppliers[0].id },
    { sku: "HT-004", name: "Stanley Measuring Tape 5m", brand: "Stanley", categoryId: handTools.id, hsnCode: "9017", unit: "PCS", gstRate: 18, costPrice: 190, mrp: 399, sellingPriceGst: 319, sellingPriceCash: 290, reorderLevel: 10, maxStock: 50, supplierId: suppliers[0].id },
    { sku: "HT-005", name: "Jhalani Ball Pein Hammer 500g", brand: "Jhalani", categoryId: handTools.id, hsnCode: "8205", unit: "PCS", gstRate: 18, costPrice: 220, mrp: 449, sellingPriceGst: 359, sellingPriceCash: 330, reorderLevel: 8, maxStock: 30, supplierId: suppliers[0].id },

    // Fasteners (cat 2)
    { sku: "FS-001", name: "GI Bolts M10x40 (Pack of 50)", brand: "APL", categoryId: fasteners.id, hsnCode: "7318", unit: "PKT", gstRate: 18, costPrice: 180, mrp: 350, sellingPriceGst: 280, sellingPriceCash: 260, reorderLevel: 20, maxStock: 100, supplierId: suppliers[1].id },
    { sku: "FS-002", name: "SS Self-Tapping Screws #8 (100pc)", brand: "Grip", categoryId: fasteners.id, hsnCode: "7318", unit: "PKT", gstRate: 18, costPrice: 120, mrp: 249, sellingPriceGst: 199, sellingPriceCash: 180, reorderLevel: 25, maxStock: 100, supplierId: suppliers[1].id },
    { sku: "FS-003", name: "Nylon Wall Plugs 8mm (Pack of 100)", brand: "Fischer", categoryId: fasteners.id, hsnCode: "3926", unit: "PKT", gstRate: 18, costPrice: 65, mrp: 149, sellingPriceGst: 119, sellingPriceCash: 99, reorderLevel: 30, maxStock: 150, supplierId: suppliers[1].id },
    { sku: "FS-004", name: "MS Hex Nut M8 (Pack of 100)", brand: "APL", categoryId: fasteners.id, hsnCode: "7318", unit: "PKT", gstRate: 18, costPrice: 90, mrp: 199, sellingPriceGst: 159, sellingPriceCash: 140, reorderLevel: 20, maxStock: 80, supplierId: suppliers[1].id },
    { sku: "FS-005", name: "Spring Washer M10 (Pack of 100)", brand: "APL", categoryId: fasteners.id, hsnCode: "7318", unit: "PKT", gstRate: 18, costPrice: 75, mrp: 169, sellingPriceGst: 129, sellingPriceCash: 110, reorderLevel: 20, maxStock: 80, supplierId: suppliers[1].id },

    // Plumbing (cat 3)
    { sku: "PL-001", name: "Cera Angle Valve (Heavy Body)", brand: "Cera", categoryId: plumbing.id, hsnCode: "8481", unit: "PCS", gstRate: 18, costPrice: 380, mrp: 699, sellingPriceGst: 569, sellingPriceCash: 520, reorderLevel: 10, maxStock: 40, supplierId: suppliers[1].id },
    { sku: "PL-002", name: "Astral CPVC Pipe 1\" (3m)", brand: "Astral", categoryId: plumbing.id, hsnCode: "3917", unit: "PCS", gstRate: 18, costPrice: 280, mrp: 499, sellingPriceGst: 399, sellingPriceCash: 370, reorderLevel: 15, maxStock: 50, supplierId: suppliers[1].id },
    { sku: "PL-003", name: "PTFE Tape 12mm (Pack of 10)", brand: "Teflon", categoryId: plumbing.id, hsnCode: "3919", unit: "PKT", gstRate: 18, costPrice: 85, mrp: 180, sellingPriceGst: 149, sellingPriceCash: 130, reorderLevel: 20, maxStock: 80, supplierId: suppliers[1].id },
    { sku: "PL-004", name: "Jaguar Health Faucet with Hose", brand: "Jaguar", categoryId: plumbing.id, hsnCode: "8481", unit: "SET", gstRate: 18, costPrice: 550, mrp: 999, sellingPriceGst: 849, sellingPriceCash: 790, reorderLevel: 5, maxStock: 25, supplierId: suppliers[1].id },
    { sku: "PL-005", name: "Supreme PVC Elbow 1\" (Pack of 10)", brand: "Supreme", categoryId: plumbing.id, hsnCode: "3917", unit: "PKT", gstRate: 18, costPrice: 55, mrp: 120, sellingPriceGst: 99, sellingPriceCash: 85, reorderLevel: 20, maxStock: 80, supplierId: suppliers[1].id },

    // Electrical (cat 4)
    { sku: "EL-001", name: "Havells Lifeline 1.5mm Wire (90m)", brand: "Havells", categoryId: electrical.id, hsnCode: "8544", unit: "COIL", gstRate: 18, costPrice: 1800, mrp: 2799, sellingPriceGst: 2349, sellingPriceCash: 2200, reorderLevel: 5, maxStock: 30, supplierId: suppliers[2].id },
    { sku: "EL-002", name: "Havells 2.5mm Wire (90m)", brand: "Havells", categoryId: electrical.id, hsnCode: "8544", unit: "COIL", gstRate: 18, costPrice: 2800, mrp: 4299, sellingPriceGst: 3599, sellingPriceCash: 3400, reorderLevel: 5, maxStock: 25, supplierId: suppliers[2].id },
    { sku: "EL-003", name: "Anchor Roma 6A Switch (Pack of 10)", brand: "Anchor", categoryId: electrical.id, hsnCode: "8536", unit: "PKT", gstRate: 18, costPrice: 320, mrp: 599, sellingPriceGst: 489, sellingPriceCash: 450, reorderLevel: 10, maxStock: 50, supplierId: suppliers[2].id },
    { sku: "EL-004", name: "Havells MCB SP 16A C-Curve", brand: "Havells", categoryId: electrical.id, hsnCode: "8536", unit: "PCS", gstRate: 18, costPrice: 165, mrp: 299, sellingPriceGst: 249, sellingPriceCash: 225, reorderLevel: 15, maxStock: 60, supplierId: suppliers[2].id },
    { sku: "EL-005", name: "Polycab Junction Box 4x4", brand: "Polycab", categoryId: electrical.id, hsnCode: "8538", unit: "PCS", gstRate: 18, costPrice: 35, mrp: 75, sellingPriceGst: 59, sellingPriceCash: 50, reorderLevel: 30, maxStock: 100, supplierId: suppliers[2].id },

    // Safety Equipment (cat 5)
    { sku: "SF-001", name: "3M Safety Goggles 1621", brand: "3M", categoryId: safety.id, hsnCode: "9004", unit: "PCS", gstRate: 18, costPrice: 120, mrp: 249, sellingPriceGst: 199, sellingPriceCash: 180, reorderLevel: 10, maxStock: 40, supplierId: suppliers[0].id },
    { sku: "SF-002", name: "Karam Safety Helmet (White)", brand: "Karam", categoryId: safety.id, hsnCode: "6506", unit: "PCS", gstRate: 18, costPrice: 180, mrp: 349, sellingPriceGst: 279, sellingPriceCash: 250, reorderLevel: 10, maxStock: 30, supplierId: suppliers[0].id },
    { sku: "SF-003", name: "Midas Cut-Resistant Gloves (Pair)", brand: "Midas", categoryId: safety.id, hsnCode: "6116", unit: "PAIR", gstRate: 12, costPrice: 140, mrp: 299, sellingPriceGst: 239, sellingPriceCash: 210, reorderLevel: 15, maxStock: 50, supplierId: suppliers[0].id },
    { sku: "SF-004", name: "3M 9504 N95 Dust Mask (Pack of 5)", brand: "3M", categoryId: safety.id, hsnCode: "6307", unit: "PKT", gstRate: 12, costPrice: 250, mrp: 449, sellingPriceGst: 379, sellingPriceCash: 345, reorderLevel: 10, maxStock: 40, supplierId: suppliers[0].id },
    { sku: "SF-005", name: "Asian Paints Primer 1L", brand: "Asian Paints", categoryId: safety.id, hsnCode: "3209", unit: "PCS", gstRate: 18, costPrice: 180, mrp: 320, sellingPriceGst: 269, sellingPriceCash: 245, reorderLevel: 10, maxStock: 40, supplierId: suppliers[1].id },
  ];

  const createdProducts = [];
  for (const p of products) {
    const created = await prisma.product.create({ data: p });
    createdProducts.push(created);
  }
  console.log(`  ✓ ${createdProducts.length} products`);

  // ─── Product Knowledge ─────────────────────────────────────────
  const knowledgeData = [
    { productId: createdProducts[0].id, whatItDoes: "550W impact drill for drilling in wood, metal, and masonry. Variable speed with forward/reverse.", whatItCantDo: "Not suitable for continuous heavy-duty concrete work. No SDS chuck.", bestFor: "Home DIY, light masonry drilling, wood and metal work", notSuitableFor: "Professional continuous concrete drilling", keySpecs: "550W, 0-2800 RPM, 13mm chuck, Impact rate: 41,600 bpm", commonQuestions: '[{"q":"What drill bits are compatible?","a":"Standard 13mm round shank bits"},{"q":"Can it drill concrete?","a":"Yes, light concrete with masonry bit. Not for heavy RCC."}]', accessories: "13mm drill bit set, masonry bits, HSS bits", alternatives: "Stanley SDH600 (budget), Dewalt DWD024 (premium)", proTips: "For masonry, always use impact mode. For metal, use slow speed with cutting oil." },
    { productId: createdProducts[1].id, whatItDoes: "850W professional angle grinder for cutting, grinding, and polishing metal and stone.", whatItCantDo: "Not designed for wood cutting. No variable speed.", bestFor: "Metal cutting, rust removal, tile cutting, deburring", notSuitableFor: "Wood cutting, fine polishing work", keySpecs: "850W, 11000 RPM, 100mm disc, Spindle lock", commonQuestions: '[{"q":"What discs does it use?","a":"Standard 4-inch / 100mm discs"},{"q":"Can I cut tiles?","a":"Yes, with a diamond cutting disc."}]', accessories: "Cutting discs, grinding wheels, flap discs, diamond disc", alternatives: "Bosch GWS 600 (budget), Makita GA4030 (similar)", proTips: "Always use the side handle. Check disc RPM rating matches grinder. Never remove guard." },
    { productId: createdProducts[5].id, whatItDoes: "8-piece screwdriver set covering common Phillips and flathead sizes for household and professional use.", whatItCantDo: "No Torx or hex drivers included. Not insulated for electrical work.", bestFor: "General maintenance, furniture assembly, appliance repair", notSuitableFor: "Electrical work (not VDE rated), specialized electronics", keySpecs: "Chrome vanadium steel, Magnetic tips, Ergonomic grip, Sizes: PH0-PH2, SL3-SL6", accessories: "Precision screwdriver set for electronics", alternatives: "Taparia 6-piece set (budget), Wera Kraftform (premium)", proTips: "Match screwdriver size to screw head exactly to avoid cam-out and stripping." },
    { productId: createdProducts[20].id, whatItDoes: "1.5 sq mm single-core FR-LSH copper wire for house wiring. Flame retardant, low smoke.", whatItCantDo: "Not suitable for outdoor exposed wiring. Not for high-power appliances (use 2.5mm+).", bestFor: "Light points, fan points, 5A sockets, switch connections", notSuitableFor: "AC, geyser, heavy power points (use 2.5mm or 4mm)", keySpecs: "1.5 sq mm, 90m coil, Copper conductor, FR-LSH insulation, 1100V grade", commonQuestions: '[{"q":"How many points on 1.5mm?","a":"Max 8-10 light/fan points per circuit"},{"q":"What MCB size?","a":"Use 6A or 10A MCB for 1.5mm wire circuits"}]', accessories: "Conduit pipes, junction boxes, MCB, switch boards", alternatives: "Polycab FR (similar), Finolex FR (similar)", proTips: "Always run in conduit. Never mix 1.5mm and 2.5mm on same circuit. Use proper color coding." },
    { productId: createdProducts[25].id, whatItDoes: "Anti-scratch, anti-fog safety goggles with indirect ventilation for protection against dust, chemicals, and flying debris.", whatItCantDo: "Not rated for welding. Not impact-rated for heavy projectiles.", bestFor: "Grinding work, drilling, chemical handling, painting", notSuitableFor: "Welding, high-velocity impact environments", keySpecs: "Polycarbonate lens, UV protection, Indirect ventilation, CE EN166 certified", accessories: "Anti-fog spray, cleaning cloth, safety helmet", alternatives: "Karam ES007 (budget), 3M SecureFit (premium)", proTips: "Clean with mild soap. Store in pouch to prevent scratching. Replace if lens is pitted." },
  ];

  for (const k of knowledgeData) {
    await prisma.productKnowledge.create({ data: k });
  }
  console.log(`  ✓ ${knowledgeData.length} product knowledge entries`);

  // ─── Inventory Distribution ────────────────────────────────────
  const mainLocs = locations.filter((l) => l.godownId === godowns[0].id);
  const gdALocs = locations.filter((l) => l.godownId === godowns[1].id);
  const gdBLocs = locations.filter((l) => l.godownId === godowns[2].id);

  const inventoryItems: { productId: number; locationId: number; quantity: number }[] = [];

  for (let i = 0; i < createdProducts.length; i++) {
    const p = createdProducts[i];
    const cat = products[i].categoryId;

    if (cat === electrical.id) {
      // Electrical → Godown B + some in Main Store
      inventoryItems.push({ productId: p.id, locationId: gdBLocs[i % gdBLocs.length].id, quantity: 15 + Math.floor(Math.random() * 20) });
      inventoryItems.push({ productId: p.id, locationId: mainLocs[i % mainLocs.length].id, quantity: 3 + Math.floor(Math.random() * 5) });
    } else if (cat === plumbing.id) {
      // Plumbing → Godown A + Main Store
      inventoryItems.push({ productId: p.id, locationId: gdALocs[i % gdALocs.length].id, quantity: 10 + Math.floor(Math.random() * 25) });
      inventoryItems.push({ productId: p.id, locationId: mainLocs[i % mainLocs.length].id, quantity: 2 + Math.floor(Math.random() * 5) });
    } else if (cat === powerTools.id) {
      // Power Tools → Main Store display
      inventoryItems.push({ productId: p.id, locationId: mainLocs[i % mainLocs.length].id, quantity: 3 + Math.floor(Math.random() * 8) });
    } else {
      // Everything else → Main Store + small backup in Godown A
      inventoryItems.push({ productId: p.id, locationId: mainLocs[i % mainLocs.length].id, quantity: 8 + Math.floor(Math.random() * 20) });
      if (Math.random() > 0.4) {
        inventoryItems.push({ productId: p.id, locationId: gdALocs[i % gdALocs.length].id, quantity: 5 + Math.floor(Math.random() * 15) });
      }
    }
  }

  // Deliberately set low stock for alerts
  const lowStockProducts = [createdProducts[4], createdProducts[9], createdProducts[14]]; // Makita Saw, Hammer, Spring Washer
  for (const lsp of lowStockProducts) {
    const existing = inventoryItems.find((inv) => inv.productId === lsp.id);
    if (existing) existing.quantity = 1;
  }

  // Dead inventory - some products with zero recent sales but decent stock
  // (We'll just skip adding sales for these later)

  await prisma.inventoryItem.createMany({ data: inventoryItems });
  console.log(`  ✓ ${inventoryItems.length} inventory entries`);

  // ─── Sample Sales ──────────────────────────────────────────────
  const now = new Date();
  const saleRecords: {
    type: string;
    customerName: string | null;
    customerPhone: string | null;
    customerGstin: string | null;
    paymentMode: string;
    discount: number;
    notes: string | null;
    daysAgo: number;
    items: { productIdx: number; quantity: number }[];
  }[] = [
    // GST Sales
    { type: "GST", customerName: "Rajesh Kumar Constructions", customerPhone: "9876543210", customerGstin: "07AABCR1234F1Z5", paymentMode: "UPI", discount: 100, notes: "Regular customer - construction project", daysAgo: 0, items: [{ productIdx: 0, quantity: 2 }, { productIdx: 5, quantity: 3 }, { productIdx: 10, quantity: 5 }] },
    { type: "GST", customerName: "Sharma Electricals", customerPhone: "9812345678", customerGstin: "07AABCS5678G1Z3", paymentMode: "CARD", discount: 0, notes: null, daysAgo: 1, items: [{ productIdx: 20, quantity: 5 }, { productIdx: 21, quantity: 3 }, { productIdx: 22, quantity: 10 }, { productIdx: 23, quantity: 8 }] },
    { type: "GST", customerName: "Patel Plumbing Works", customerPhone: "9898765432", customerGstin: "07AABCP9012H1Z1", paymentMode: "CASH", discount: 200, notes: "Bulk order discount applied", daysAgo: 3, items: [{ productIdx: 15, quantity: 10 }, { productIdx: 16, quantity: 15 }, { productIdx: 17, quantity: 20 }, { productIdx: 18, quantity: 5 }] },
    { type: "GST", customerName: "RK Builders", customerPhone: "9765432109", customerGstin: "07AABCR3456J1Z7", paymentMode: "UPI", discount: 0, notes: null, daysAgo: 5, items: [{ productIdx: 1, quantity: 3 }, { productIdx: 25, quantity: 10 }, { productIdx: 26, quantity: 10 }] },
    { type: "GST", customerName: "Metro Constructions Pvt Ltd", customerPhone: "9654321098", customerGstin: "07AABCM7890K1Z9", paymentMode: "CREDIT", discount: 500, notes: "Credit - due in 30 days", daysAgo: 7, items: [{ productIdx: 20, quantity: 10 }, { productIdx: 21, quantity: 8 }, { productIdx: 23, quantity: 20 }, { productIdx: 24, quantity: 30 }] },
    { type: "GST", customerName: "Gupta Home Interiors", customerPhone: "9543210987", customerGstin: "07AABCG2345L1Z1", paymentMode: "UPI", discount: 0, notes: null, daysAgo: 10, items: [{ productIdx: 22, quantity: 5 }, { productIdx: 11, quantity: 10 }, { productIdx: 12, quantity: 15 }] },
    { type: "GST", customerName: "Singh Hardware Retail", customerPhone: "9432109876", customerGstin: "07AABCS6789M1Z3", paymentMode: "CARD", discount: 150, notes: "Dealer rate applied", daysAgo: 14, items: [{ productIdx: 5, quantity: 12 }, { productIdx: 6, quantity: 10 }, { productIdx: 7, quantity: 8 }] },
    { type: "GST", customerName: "Agarwal Construction Co", customerPhone: "9321098765", customerGstin: "07AABCA1234N1Z5", paymentMode: "CASH", discount: 0, notes: null, daysAgo: 20, items: [{ productIdx: 10, quantity: 20 }, { productIdx: 13, quantity: 15 }, { productIdx: 14, quantity: 10 }] },

    // Cash Sales
    { type: "CASH", customerName: "Ramesh", customerPhone: "9988776655", customerGstin: null, paymentMode: "CASH", discount: 0, notes: null, daysAgo: 0, items: [{ productIdx: 6, quantity: 1 }, { productIdx: 7, quantity: 2 }] },
    { type: "CASH", customerName: null, customerPhone: null, customerGstin: null, paymentMode: "CASH", discount: 0, notes: null, daysAgo: 0, items: [{ productIdx: 12, quantity: 3 }, { productIdx: 17, quantity: 2 }] },
    { type: "CASH", customerName: "Suresh Plumber", customerPhone: "9876501234", customerGstin: null, paymentMode: "UPI", discount: 10, notes: null, daysAgo: 1, items: [{ productIdx: 15, quantity: 2 }, { productIdx: 16, quantity: 3 }, { productIdx: 19, quantity: 5 }] },
    { type: "CASH", customerName: null, customerPhone: null, customerGstin: null, paymentMode: "CASH", discount: 0, notes: null, daysAgo: 2, items: [{ productIdx: 25, quantity: 2 }] },
    { type: "CASH", customerName: "Electrician Vinod", customerPhone: "9765401234", customerGstin: null, paymentMode: "UPI", discount: 0, notes: null, daysAgo: 2, items: [{ productIdx: 20, quantity: 1 }, { productIdx: 22, quantity: 2 }, { productIdx: 24, quantity: 5 }] },
    { type: "CASH", customerName: null, customerPhone: null, customerGstin: null, paymentMode: "CASH", discount: 0, notes: null, daysAgo: 4, items: [{ productIdx: 3, quantity: 1 }] },
    { type: "CASH", customerName: "Amit Painter", customerPhone: "9654301234", customerGstin: null, paymentMode: "CASH", discount: 20, notes: null, daysAgo: 6, items: [{ productIdx: 29, quantity: 5 }, { productIdx: 25, quantity: 3 }] },
    { type: "CASH", customerName: null, customerPhone: null, customerGstin: null, paymentMode: "UPI", discount: 0, notes: null, daysAgo: 8, items: [{ productIdx: 11, quantity: 5 }, { productIdx: 12, quantity: 3 }] },
    { type: "CASH", customerName: "Ravi", customerPhone: null, customerGstin: null, paymentMode: "CASH", discount: 0, notes: null, daysAgo: 12, items: [{ productIdx: 8, quantity: 1 }] },
    { type: "CASH", customerName: null, customerPhone: null, customerGstin: null, paymentMode: "CASH", discount: 0, notes: null, daysAgo: 15, items: [{ productIdx: 27, quantity: 2 }, { productIdx: 28, quantity: 1 }] },
    { type: "CASH", customerName: "Mohammad Farooq", customerPhone: "9543201234", customerGstin: null, paymentMode: "UPI", discount: 50, notes: null, daysAgo: 22, items: [{ productIdx: 0, quantity: 1 }, { productIdx: 5, quantity: 1 }, { productIdx: 25, quantity: 2 }] },
    { type: "CASH", customerName: null, customerPhone: null, customerGstin: null, paymentMode: "CASH", discount: 0, notes: null, daysAgo: 28, items: [{ productIdx: 2, quantity: 1 }] },
  ];

  let gstSeq = 0;

  for (const s of saleRecords) {
    const saleDate = new Date(now);
    saleDate.setDate(saleDate.getDate() - s.daysAgo);
    saleDate.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    let invoiceNo: string | null = null;
    if (s.type === "GST") {
      gstSeq++;
      const prefix = `INV-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
      invoiceNo = `${prefix}-${String(gstSeq).padStart(4, "0")}`;
    }

    let subtotal = 0;
    let gstAmount = 0;

    const saleItems = s.items.map((item) => {
      const p = createdProducts[item.productIdx];
      const pData = products[item.productIdx];
      const unitPrice = s.type === "GST" ? pData.sellingPriceGst : pData.sellingPriceCash;
      const lineTotal = unitPrice * item.quantity;
      const lineGst = s.type === "GST" ? (lineTotal * pData.gstRate) / 100 : 0;

      subtotal += lineTotal;
      gstAmount += lineGst;

      return {
        productId: p.id,
        quantity: item.quantity,
        unitPrice,
        gstRate: s.type === "GST" ? pData.gstRate : 0,
        gstAmount: lineGst,
        total: lineTotal + lineGst,
      };
    });

    const totalAmount = subtotal + gstAmount - s.discount;

    const sale = await prisma.sale.create({
      data: {
        invoiceNo,
        type: s.type,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        customerGstin: s.customerGstin,
        subtotal,
        gstAmount,
        discount: s.discount,
        totalAmount,
        paymentMode: s.paymentMode,
        notes: s.notes,
        createdAt: saleDate,
        items: { create: saleItems },
      },
    });

    // Stock movements for each sale item
    for (const item of saleItems) {
      await prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reference: `SALE-${sale.id}`,
          createdAt: saleDate,
        },
      });
    }
  }

  console.log(`  ✓ ${saleRecords.length} sample sales with stock movements`);

  // ─── Some incoming stock movements (purchases) ─────────────────
  const purchaseMovements = [
    { productId: createdProducts[0].id, quantity: 10, reference: "PO-2024-001", daysAgo: 25 },
    { productId: createdProducts[5].id, quantity: 20, reference: "PO-2024-001", daysAgo: 25 },
    { productId: createdProducts[10].id, quantity: 50, reference: "PO-2024-002", daysAgo: 20 },
    { productId: createdProducts[15].id, quantity: 20, reference: "PO-2024-003", daysAgo: 18 },
    { productId: createdProducts[20].id, quantity: 15, reference: "PO-2024-004", daysAgo: 15 },
    { productId: createdProducts[21].id, quantity: 10, reference: "PO-2024-004", daysAgo: 15 },
    { productId: createdProducts[22].id, quantity: 25, reference: "PO-2024-004", daysAgo: 15 },
    { productId: createdProducts[25].id, quantity: 20, reference: "PO-2024-005", daysAgo: 10 },
  ];

  for (const pm of purchaseMovements) {
    const d = new Date(now);
    d.setDate(d.getDate() - pm.daysAgo);
    await prisma.stockMovement.create({
      data: {
        productId: pm.productId,
        type: "IN",
        quantity: pm.quantity,
        reference: pm.reference,
        createdAt: d,
      },
    });
  }
  console.log(`  ✓ ${purchaseMovements.length} purchase stock movements`);

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
