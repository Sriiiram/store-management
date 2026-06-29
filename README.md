# Store Manager — Hardware Store Management System

A full-stack application for managing a retail hardware store in India with 300-400+ products across multiple godowns. Handles inventory tracking, GST + non-GST billing, price list management, product knowledge base, and sales analytics.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│   Mobile / Tablet / Desktop — Staff uses at counter or godown   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│   │  Dashboard   │  │   Products   │  │   Sales / Billing  │    │
│   │  (Server)    │  │   (Client)   │  │   (Client)         │    │
│   └──────┬───────┘  └──────┬───────┘  └──────┬────────────┘    │
│          │                  │                  │                 │
├──────────┼──────────────────┼──────────────────┼─────────────────┤
│          ▼                  ▼                  ▼                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Next.js API Routes (/api/*)                 │   │
│   │   - /api/products     (CRUD + search)                   │   │
│   │   - /api/inventory    (stock in/out/transfer)           │   │
│   │   - /api/sales        (create/list sales)               │   │
│   │   - /api/pricing      (view/update prices)              │   │
│   │   - /api/assistant    (knowledge search)                │   │
│   │   - /api/categories   (product categories)              │   │
│   │   - /api/suppliers    (supplier list)                   │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Prisma ORM (Query Builder)                   │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              SQLite Database (store.db)                   │   │
│   │   Single file, zero configuration, zero hosting cost     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                     SINGLE SERVER / MACHINE                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15 (React 19) + Tailwind CSS | Full-stack in one project, modern UI, SSR for fast loads |
| Backend | Next.js API Routes | No separate backend server needed, runs alongside frontend |
| Database | SQLite via Prisma | Zero cost, zero configuration, single file on disk |
| Language | TypeScript | Type safety, better maintainability |
| Deployment | Any Linux VPS / Local machine | INR 300-500/month total cost |

---

## How the Backend Works

### API Routes (The "Backend")

Next.js API routes act as the backend. They live in `src/app/api/` and handle all data operations:

```
src/app/api/
├── products/
│   ├── route.ts          GET /api/products (list) + POST (create)
│   └── [id]/
│       └── route.ts      GET/PUT/DELETE /api/products/:id
├── inventory/
│   ├── route.ts          GET /api/inventory (list with filters)
│   ├── stock-in/
│   │   └── route.ts      POST /api/inventory/stock-in
│   ├── stock-out/
│   │   └── route.ts      POST /api/inventory/stock-out
│   └── locations/
│       └── route.ts      GET/POST godowns & locations
├── sales/
│   ├── route.ts          GET (list) + POST (create sale)
│   └── [id]/
│       └── route.ts      GET single sale/invoice
├── pricing/
│   └── route.ts          GET (price list) + PUT (update price)
├── assistant/
│   └── route.ts          GET (knowledge base search)
├── categories/
│   └── route.ts          GET categories
└── suppliers/
    └── route.ts          GET suppliers
```

### How the UI Interacts with the Backend

There are TWO patterns used:

**1. Server Components (Direct DB Access)**
Pages that just display data (Dashboard, Analytics) are Server Components. They query the database directly using Prisma — no API call needed. This is faster because data doesn't go through HTTP.

```typescript
// src/app/page.tsx (Dashboard - Server Component)
import { db } from "@/lib/db";

export default async function Dashboard() {
  const totalProducts = await db.product.count();
  const sales = await db.sale.findMany({ ... });
  return <div>...</div>;
}
```

**2. Client Components (API Calls)**
Pages that need interactivity (forms, search, real-time updates) are Client Components. They call the API routes via `fetch()`.

```typescript
// src/app/sales/new/page.tsx (Billing - Client Component)
"use client";

async function createSale(data) {
  const response = await fetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Database (SQLite)

The database is a single file: `prisma/store.db`

- **No server to manage** — it's just a file
- **No credentials** — no passwords, no connection strings
- **Backup** — just copy the file
- **Performance** — handles thousands of products and millions of sales records easily
- **Concurrent users** — handles 5-10 simultaneous users (enough for a store)

---

## Module Breakdown

### 1. Products + Knowledge Base (`/products`, `/assistant`)

**What it does:**
- Full catalog of all products with SKU, category, brand, pricing
- Knowledge base for each product: what it does, what it can't do, best for whom
- Product Assistant: staff types customer's need → system finds matching products

**Data flow:**
```
Staff searches "drill for concrete" 
    → GET /api/assistant?q=drill+for+concrete
    → Prisma searches across ProductKnowledge fields (whatItDoes, bestFor, etc.)
    → Returns matching products with knowledge summaries
    → Staff shows customer the right product
```

### 2. Inventory (`/inventory`)

**What it does:**
- Tracks stock levels across multiple godowns and locations (bins)
- Stock inward (when products arrive from supplier)
- Stock outward (manual removals, damages)
- Every movement is logged with timestamp, reference, and reason

**Data flow - Stock In:**
```
Products arrive at godown
    → Staff opens "Stock In" on phone
    → Selects product, godown, location, enters quantity
    → POST /api/inventory/stock-in
    → Prisma transaction:
        1. Creates StockMovement record (audit trail)
        2. Upserts InventoryItem (creates or increments quantity)
    → Dashboard shows updated stock
```

**Data flow - Stock Out (via Sale):**
```
Customer buys a product
    → Sale is created via POST /api/sales
    → Prisma transaction:
        1. Creates Sale + SaleItems
        2. Creates StockMovement(type: "OUT")
        3. Decrements InventoryItem quantity
    → Inventory automatically reduces
```

### 3. Price List (`/pricing`)

**What it does:**
- Centralized price list for all products
- Four price points per product: Cost, MRP, Selling (GST), Selling (Cash)
- Inline editing with automatic price history logging
- Margin calculation and alerts when margin drops below minimum

**Data flow - Price Update:**
```
Owner edits selling price in the price list
    → PUT /api/pricing { productId, field: "sellingPriceGst", value: 3999 }
    → API compares old vs new price
    → Creates PriceHistory record (audit trail)
    → Updates Product record
    → UI shows new price immediately
```

### 4. Sales / Billing (`/sales`)

**What it does:**
- Two sale types: GST Bill (formal invoice) and Cash Sale (internal record)
- GST bills get auto-generated invoice numbers (INV-202601-0001)
- Cash sales are recorded for analytics but don't appear in GST filings
- Stock automatically deducted on sale

**Data flow - New Sale:**
```
Customer at counter
    → Staff opens "New Sale"
    → Toggles "GST Bill" or "Cash Sale"
    → Searches and adds products to cart
    → System auto-calculates: subtotal, GST (if applicable), total
    → Staff clicks "Complete Sale"
    → POST /api/sales with all items
    → Prisma transaction:
        1. Generates invoice number (if GST)
        2. Creates Sale record
        3. Creates SaleItem records
        4. Deducts stock from inventory
        5. Creates StockMovement records
    → Shows success + invoice (printable for GST bills)
```

### 5. Analytics (`/analytics`)

**What it does:**
- Revenue breakdown: GST vs Cash
- Top selling products
- Dead inventory detection (no sales in 60+ days)
- Category-wise performance
- Daily sales trends

**Data flow:**
```
Owner opens Analytics page
    → Server Component queries DB directly (no API call)
    → Complex Prisma queries with aggregations
    → Renders charts, tables, alerts
    → Owner sees: "Product X hasn't sold in 90 days - consider discounting"
```

---

## Deployment Options

### Option A: Local Machine (Simplest — for testing/single store)

Run on any computer (old laptop, desktop at the store):

```bash
# One-time setup
npm install
npm run db:generate
npm run db:push
npm run db:seed    # Load sample data
npm run build

# Start the server
npm run start      # Runs on http://localhost:3000
```

Staff access it via the local network: `http://192.168.x.x:3000`

**Cost: FREE** (uses existing hardware)

### Option B: Cheap VPS (Recommended for production)

Deploy on a DigitalOcean/Hostinger/AWS Lightsail VPS:

```bash
# On a fresh Ubuntu VPS (INR 300-500/month)
sudo apt update && sudo apt install -y nodejs npm

# Clone your code
git clone <your-repo> /opt/store-management
cd /opt/store-management

# Setup
npm install
npm run db:generate
npm run db:push
npm run db:seed

# Build for production
npm run build

# Run with process manager
npm install -g pm2
pm2 start npm --name "store" -- start
pm2 startup    # Auto-start on reboot
pm2 save
```

Access via: `http://your-server-ip:3000`
Add a domain: `https://store.yourdomain.com` (with nginx reverse proxy)

**Cost: INR 300-500/month**

### Option C: Raspberry Pi (Ultra low cost, runs at store)

```bash
# Install on Raspberry Pi 4 (one-time INR 4000-6000)
# Same steps as Option B
# Runs 24/7 on 5W power consumption
# Staff connect via store WiFi
```

**Cost: INR 100/month (electricity only)**

---

## Database Backup

Since SQLite is a single file, backup is trivial:

```bash
# Manual backup
cp prisma/store.db backups/store-$(date +%Y%m%d).db

# Automated daily backup (add to crontab)
0 2 * * * cp /opt/store-management/prisma/store.db /opt/backups/store-$(date +\%Y\%m\%d).db

# Backup to Google Drive (optional)
# Use rclone to sync backup folder to Google Drive
```

---

## Daily Operations

### For Counter Staff (Sales Person)

| Task | Where to go | Steps |
|------|-------------|-------|
| Make a GST sale | Sales → New Sale | Toggle "GST", add products, complete |
| Make a cash sale | Sales → New Sale | Toggle "Cash", add products, complete |
| Look up a price | Price List | Search product name |
| Customer asks "what drill for X?" | Assistant | Type the customer's need |
| Check if product in stock | Inventory | Search product name |

### For Store Owner (Daily)

| Task | Where to go | Steps |
|------|-------------|-------|
| Check today's sales | Dashboard | View "Today's Sales" card |
| View low stock alerts | Dashboard | Check alerts section |
| Update a price | Price List | Click price → edit → Enter |
| Record incoming stock | Inventory → Stock In | Select product, location, quantity |

### For Store Owner (Weekly)

| Task | Where to go | Steps |
|------|-------------|-------|
| Review dead inventory | Analytics | Check "Dead Inventory" section |
| Review top sellers | Analytics | Check "Top 10 Products" |
| Verify margins | Price List | Sort by margin, check for red items |
| Export data for CA | Analytics | Use date filters, screenshot/print |

---

## Project Structure

```
store-management/
├── prisma/
│   ├── schema.prisma       # Database schema (all tables defined here)
│   ├── store.db            # SQLite database file (created after db:push)
│   └── seed.ts             # Sample data seeder
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout (sidebar + main content area)
│   │   ├── page.tsx        # Dashboard (home page)
│   │   ├── globals.css     # Tailwind CSS imports
│   │   ├── analytics/      # Analytics page
│   │   ├── products/       # Product CRUD pages
│   │   ├── inventory/      # Inventory management pages
│   │   ├── pricing/        # Price list page
│   │   ├── sales/          # Sales list + billing pages
│   │   ├── assistant/      # Product knowledge assistant
│   │   └── api/            # All backend API routes
│   ├── components/
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   └── PageHeader.tsx  # Reusable page header
│   └── lib/
│       └── db.ts           # Prisma client singleton
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Maintenance Guide

### Adding a New Product Category

1. Go to Products → New Product
2. If you need a new category, add it directly in Prisma Studio:
   ```bash
   npm run db:studio
   ```
3. Or add via the database directly

### Changing GST Rates

1. Go to Price List
2. Find the product
3. Update the GST rate in the product edit page
4. All future sales will use the new rate

### Adding a New Godown

1. Go to Inventory → Manage Locations
2. Click "Add Godown"
3. Enter name and address
4. Add locations within it (rack/shelf codes)

### Recovering from Errors

```bash
# If the app crashes, restart it:
pm2 restart store

# If the database gets corrupted (rare with SQLite):
cp backups/store-latest.db prisma/store.db
pm2 restart store

# To reset everything (WARNING: deletes all data):
rm prisma/store.db
npm run db:push
npm run db:seed
```

### Updating the App

```bash
cd /opt/store-management
git pull origin main
npm install
npm run db:generate
npx prisma migrate deploy   # Apply any schema changes
npm run build
pm2 restart store
```

---

## Security Considerations

- **No authentication built-in yet** — suitable for a single-store, trusted-staff environment
- **SQLite file** should have restricted OS permissions (`chmod 600`)
- **Non-billed sales** data stays local, never synced to any cloud GST service
- **Backups** should be encrypted if stored off-site
- **Future enhancement**: Add simple PIN/password login per staff member

---

## Cost Comparison

| Item | This System | Vyapar + Manual | Zoho/ERP |
|------|-------------|-----------------|----------|
| Software | FREE (open source) | INR 2,000-4,000/yr | INR 10,000-30,000/yr |
| Database | FREE (SQLite) | Included | INR 0-5,000/yr |
| Hosting | INR 300-500/mo (or free local) | N/A | Cloud included |
| Features | All 5 modules | Billing only | Full but complex |
| Customization | Unlimited | None | Limited |
| Data ownership | 100% yours | In their app | In their cloud |
| **Annual cost** | **INR 3,600-6,000** | **INR 2,000-4,000** | **INR 10,000-30,000** |

The key advantage: **you own the code and data**, can customize everything, and the non-billed sales tracking stays completely private.

---

## Quick Start (First Time Setup)

```bash
# 1. Install dependencies
export http_proxy=http://sysproxy.wal-mart.com:8080
export https_proxy=http://sysproxy.wal-mart.com:8080
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Create database & tables
npm run db:push

# 4. Load sample data (30 products, sample sales, godowns)
npm run db:seed

# 5. Start development server
npm run dev
# Open http://localhost:3000

# 6. For production
npm run build
npm run start
```
