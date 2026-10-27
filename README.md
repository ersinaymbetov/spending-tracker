# Spending Tracker Pro

A premium personal finance dashboard built with HTML, CSS, and vanilla JavaScript. Track income, expenses, budgets, and analyze your spending patterns — all locally in your browser with no account required.

![Dashboard](https://img.shields.io/badge/status-production--ready-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Stack](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS-orange)

---

## Features

### 📊 Dashboard
- Monthly overview with total spending, income, savings, budget status, and transaction count
- Month-to-month comparisons with percentage changes
- Recent transactions list
- Spending-by-category doughnut chart
- Time-of-day greeting

### 💳 Transaction Management
- Add, edit, and delete transactions
- Income and expense types
- 13 expense categories and 6 income categories
- Full-text search across descriptions
- Filter by type, category
- Sort by date or amount
- Pagination for large datasets
- Form validation with clear error messages

### 🤖 Smart Category Suggestions
- Rule-based category suggestions from description keywords
- Recognizes common stores, services, and payment types
- Non-intrusive: suggestions shown as clickable hints, never overwrite manual selection

### 📈 Financial Analytics
- **Spending by Category** — Interactive doughnut chart (click to filter transactions)
- **Monthly Trends** — 6-month income vs. expenses bar chart
- **Daily Spending** — Bar chart for daily expense activity
- **Financial Insights** — Auto-generated insights from actual data:
  - Top spending category
  - Month-over-month spending comparison
  - Categories with significant increases
  - Savings rate
  - Largest single expense
  - Average daily spending

### 💰 Budget Management
- Overall monthly expense budget with progress bar
- Individual category budgets
- Visual warnings at 80% and when over budget
- Real-time updates when transactions change

### ⚙️ Settings & Data
- **Currencies**: UZS (Uzbek soʻm), USD, EUR, GBP, RUB, TRY, KRW, JPY
- Locale-aware formatting with correct decimal handling per currency
- CSV export for spreadsheet analysis
- JSON backup export and import with preview
- Sample data for exploring the app
- Data reset with confirmation

### 📱 Responsive Design
- Desktop sidebar navigation
- Mobile hamburger menu with overlay
- Responsive summary cards (5 → 2 → 1 column)
- Touch-friendly controls
- Consistent design at all breakpoints

---

## How to Run

1. **Open `index.html`** in any modern browser (Chrome, Firefox, Edge, Safari).
2. That's it. No build step, no server, no installation needed.

For a local development server (optional):
```bash
# Python
python -m http.server 8000

# Node.js (if installed)
npx serve .
```

Then visit `http://localhost:8000`.

---

## Technical Architecture

```
spending-tracker/
├── index.html      # Single-page application shell
├── style.css       # Complete stylesheet with CSS custom properties
├── app.js          # Application logic (~1700 lines)
├── tests.html      # Browser-based test suite
└── README.md       # This file
```

### Design Decisions

- **No frameworks**: Pure HTML/CSS/JS for zero dependencies, instant loading, and easy code review
- **Single-page architecture**: All pages (dashboard, transactions, analytics, budgets, settings) render into one HTML document, switched via JS
- **Chart.js 4.x**: Loaded from CDN for charts. The app degrades gracefully if the CDN is unavailable (charts won't render but everything else works)
- **IIFE pattern**: All code wrapped in an immediately-invoked function to avoid global namespace pollution
- **CSS custom properties**: Design tokens for colors, spacing, and radii enable consistent theming

### Code Organization (app.js)

| Section | Responsibility |
|---------|---------------|
| Constants | Categories, currencies, suggestion rules |
| State | Central state object for transactions, settings, UI state |
| Utilities | UID generation, currency formatting, date formatting, HTML escaping |
| Persistence | localStorage save/load with validation and error recovery |
| Navigation | Page routing, month navigation, mobile sidebar |
| Dashboard | Summary cards, comparisons, recent transactions, doughnut chart |
| Transactions | Table rendering, search, filter, sort, pagination |
| Transaction Modal | Form, validation, add/edit/delete with confirmation |
| Analytics | Charts (doughnut, trends, daily) and insight generation |
| Budgets | Overall and category budget progress bars |
| Settings | Currency, budget config, import/export, data management |
| Sample Data | Realistic demo transactions for two months |

---

## Financial Calculations

### Core Definitions
- **Spending** = sum of all expense transaction amounts in the selected month
- **Income** = sum of all income transaction amounts in the selected month
- **Savings** = Income − Expenses for the selected month
- **Budget Remaining** = Monthly Budget − Total Spending

### Floating-Point Safety
Monetary calculations use integer minor units internally (e.g., cents for USD) via `toMinor()` / `fromMinor()` to avoid classic IEEE 754 floating-point errors like `0.1 + 0.2 ≠ 0.3`.

### Comparison Logic
- Previous month values are calculated dynamically from actual transactions
- Percentage change = `(current − previous) / |previous| × 100`
- When previous = 0, no percentage is shown (avoids misleading infinity/NaN)
- For spending, "increase" is shown in red (bad); for income/savings, "increase" is green (good)

### Date Handling
- All dates stored as `YYYY-MM-DD` strings (local calendar dates)
- No timezone conversion — dates are parsed by splitting the string, not by `new Date()` parsing
- Month filtering uses year + month comparison on the string representation

---

## Data Storage

### localStorage Keys
| Key | Contents |
|-----|----------|
| `stp_transactions` | JSON array of transaction objects |
| `stp_settings` | JSON object with currency, budgets |

### Transaction Schema
```json
{
  "id": "unique-string",
  "type": "expense | income",
  "description": "string",
  "amount": 42.50,
  "date": "2026-10-15",
  "category": "Food & Groceries",
  "note": "optional string",
  "isSample": false
}
```

### Data Safety
- Malformed localStorage entries are caught and logged, not silently discarded
- Valid records are preserved even if some stored transactions fail validation
- Import requires explicit confirmation with a preview of how many records will be imported
- "Clear All Data" requires double confirmation
- No data is sent to external servers

### Export Formats
- **CSV**: Standard comma-separated with proper quoting and escaped double-quotes
- **JSON**: Full backup including settings and all transactions, with schema version

---

## Tests

Open `tests.html` in a browser to run the test suite. It verifies:

- UID uniqueness
- Minor-unit arithmetic (float safety)
- HTML escaping (XSS prevention)
- Date formatting and month-day calculations (including leap years)
- Transaction validation (positive amounts, valid dates, valid types)
- Month filtering and year boundaries
- Category suggestion rules
- localStorage save/load and malformed data handling
- CSV row generation with special characters
- JSON import validation
- Comparison logic (division-by-zero safety)
- Budget status calculations
- Savings definition consistency
- Edit-doesn't-double-count verification
- Delete-removes-effect verification

### What Cannot Be Automatically Tested
- Visual appearance (requires manual review or screenshot comparison)
- Chart rendering (requires Chart.js + canvas, tested visually)
- Mobile responsiveness (tested by resizing browser or using device emulation)
- Actual file download (CSV/JSON export triggers browser download)

---

## Known Limitations

1. **Client-side only**: Data is stored in the browser's localStorage. Clearing browser data will delete transactions.
2. **No currency conversion**: Changing currency changes the display format but does not convert existing amounts.
3. **No bank integration**: All transactions are entered manually.
4. **localStorage limits**: Typically 5–10 MB. This is sufficient for thousands of transactions but not unlimited.
5. **No recurring transactions**: Each transaction must be entered individually.
6. **Single user**: No accounts, login, or multi-device sync.
7. **Chart.js CDN dependency**: Charts require internet on first load (cached afterward). The rest of the app works offline.
8. **No undo**: Deleted transactions cannot be recovered (export backups recommended).

---

## Future Improvements

- [ ] Recurring/scheduled transactions
- [ ] Multiple accounts (cash, bank card, savings)
- [ ] Dark/light theme toggle
- [ ] PWA support for offline use and home screen install
- [ ] Advanced filtering (date range picker, amount range)
- [ ] Data visualization: spending heatmap, income vs. expense area chart
- [ ] Local Chart.js bundle (remove CDN dependency)
- [ ] IndexedDB storage for larger datasets
- [ ] Goal tracking (save X amount by date Y)
- [ ] Multi-language support (English, Uzbek, Russian)
- [ ] Receipt photo attachment (stored as base64 in localStorage)

---

## License

MIT License. Built as a portfolio project for university applications.
