import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── Categories ────────────────────────────────────────────────────────────────

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Suppliers ─────────────────────────────────────────────────────────────────

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  gstin: text("gstin"),
  address: text("address"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Products ──────────────────────────────────────────────────────────────────

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand"),
  categoryId: integer("category_id").references(() => categories.id),
  hsnCode: text("hsn_code"),
  unit: text("unit").default("PCS"),
  gstRate: real("gst_rate").default(18),
  description: text("description"),
  imageUrl: text("image_url"),
  costPrice: real("cost_price").default(0),
  mrp: real("mrp").default(0),
  sellingPriceGst: real("selling_price_gst").default(0),
  sellingPriceCash: real("selling_price_cash").default(0),
  minMarginPct: real("min_margin_pct").default(10),
  reorderLevel: integer("reorder_level").default(5),
  maxStock: integer("max_stock").default(100),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ─── Product Knowledge ─────────────────────────────────────────────────────────

export const productKnowledge = sqliteTable("product_knowledge", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().unique().references(() => products.id),
  whatItDoes: text("what_it_does"),
  whatItCantDo: text("what_it_cant_do"),
  bestFor: text("best_for"),
  notSuitableFor: text("not_suitable_for"),
  keySpecs: text("key_specs"),
  commonQuestions: text("common_questions"),
  accessories: text("accessories"),
  alternatives: text("alternatives"),
  proTips: text("pro_tips"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ─── Godowns ───────────────────────────────────────────────────────────────────

export const godowns = sqliteTable("godowns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Locations ─────────────────────────────────────────────────────────────────

export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  godownId: integer("godown_id").notNull().references(() => godowns.id),
  rack: text("rack"),
  shelf: text("shelf"),
  zone: text("zone"),
  description: text("description"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Inventory ─────────────────────────────────────────────────────────────────

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  quantity: integer("quantity").default(0),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ─── Stock Movements ───────────────────────────────────────────────────────────

export const stockMovements = sqliteTable("stock_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text("type").notNull(), // "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT"
  quantity: integer("quantity").notNull(),
  fromLocation: text("from_location"),
  toLocation: text("to_location"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Sales ─────────────────────────────────────────────────────────────────────

export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNo: text("invoice_no").unique(),
  type: text("type").notNull(), // "GST" | "CASH"
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerGstin: text("customer_gstin"),
  subtotal: real("subtotal").default(0),
  gstAmount: real("gst_amount").default(0),
  discount: real("discount").default(0),
  totalAmount: real("total_amount").default(0),
  paymentMode: text("payment_mode").default("CASH"), // "CASH" | "UPI" | "CARD" | "CREDIT"
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Sale Items ────────────────────────────────────────────────────────────────

export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id").notNull().references(() => sales.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  gstRate: real("gst_rate").default(0),
  gstAmount: real("gst_amount").default(0),
  total: real("total").notNull(),
});

// ─── Price History ─────────────────────────────────────────────────────────────

export const priceHistory = sqliteTable("price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  field: text("field").notNull(),
  oldValue: real("old_value").notNull(),
  newValue: real("new_value").notNull(),
  changedAt: text("changed_at").default("CURRENT_TIMESTAMP"),
});

// ─── Relations ─────────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  knowledge: one(productKnowledge, { fields: [products.id], references: [productKnowledge.productId] }),
  inventory: many(inventoryItems),
  saleItems: many(saleItems),
  priceHistory: many(priceHistory),
  stockMovements: many(stockMovements),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));

export const godownsRelations = relations(godowns, ({ many }) => ({
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  godown: one(godowns, { fields: [locations.godownId], references: [godowns.id] }),
  inventory: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  product: one(products, { fields: [inventoryItems.productId], references: [products.id] }),
  location: one(locations, { fields: [inventoryItems.locationId], references: [locations.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
}));

export const salesRelations = relations(sales, ({ many }) => ({
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, { fields: [priceHistory.productId], references: [products.id] }),
}));
