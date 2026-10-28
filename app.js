/* ============================================================
   SPENDING TRACKER PRO — Application Core
   A complete personal finance dashboard.
   Pure vanilla JS, localStorage persistence, Chart.js charts.
   ============================================================ */

(function () {
    'use strict';

    // ───────── Constants ─────────
    const STORAGE_KEYS = {
        transactions: 'stp_transactions',
        settings: 'stp_settings',
        budgets: 'stp_budgets',
    };

    const EXPENSE_CATEGORIES = [
        'Food & Groceries',
        'Restaurants & Cafes',
        'Transportation',
        'Education',
        'Housing',
        'Utilities',
        'Shopping',
        'Health',
        'Entertainment',
        'Subscriptions',
        'Personal Care',
        'Travel',
        'Other Expenses',
    ];

    const INCOME_CATEGORIES = [
        'Salary',
        'Freelance Income',
        'Scholarships',
        'Business Income',
        'Gifts',
        'Other Income',
    ];

    const CATEGORY_ICONS = {
        'Food & Groceries': '🛒',
        'Restaurants & Cafes': '☕',
        'Transportation': '🚌',
        'Education': '📚',
        'Housing': '🏠',
        'Utilities': '⚡',
        'Shopping': '🛍️',
        'Health': '💊',
        'Entertainment': '🎬',
        'Subscriptions': '📱',
        'Personal Care': '✂️',
        'Travel': '✈️',
        'Other Expenses': '📦',
        'Salary': '💰',
        'Freelance Income': '💻',
        'Scholarships': '🎓',
        'Business Income': '📈',
        'Gifts': '🎁',
        'Other Income': '💵',
    };

    const CURRENCY_CONFIG = {
        USD: { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2 },
        EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', decimals: 2 },
        GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', decimals: 2 },
        UZS: { code: 'UZS', symbol: 'soʻm', locale: 'uz-UZ', decimals: 0 },
        RUB: { code: 'RUB', symbol: '₽', locale: 'ru-RU', decimals: 2 },
        TRY: { code: 'TRY', symbol: '₺', locale: 'tr-TR', decimals: 2 },
        KRW: { code: 'KRW', symbol: '₩', locale: 'ko-KR', decimals: 0 },
        JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimals: 0 },
    };

    // Keyword -> category mapping for suggestions
    const CATEGORY_RULES = [
        { keywords: ['grocery', 'supermarket', 'market', 'korzinka', 'makro', 'havas', 'food store'], category: 'Food & Groceries' },
        { keywords: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonalds', 'burger', 'pizza', 'lunch', 'dinner', 'brunch', 'eat out', 'dine'], category: 'Restaurants & Cafes' },
        { keywords: ['uber', 'taxi', 'bus', 'metro', 'subway', 'gas', 'fuel', 'petrol', 'parking', 'toll', 'yandex go', 'bolt'], category: 'Transportation' },
        { keywords: ['tuition', 'course', 'book', 'textbook', 'school', 'university', 'udemy', 'coursera', 'class', 'lesson', 'tutorial'], category: 'Education' },
        { keywords: ['rent', 'mortgage', 'apartment', 'lease'], category: 'Housing' },
        { keywords: ['electric', 'water', 'internet', 'phone bill', 'mobile plan', 'gas bill', 'heating'], category: 'Utilities' },
        { keywords: ['amazon', 'shopping', 'clothes', 'shoes', 'electronics', 'gadget', 'appliance', 'purchase'], category: 'Shopping' },
        { keywords: ['doctor', 'hospital', 'pharmacy', 'medicine', 'dental', 'clinic', 'health', 'gym', 'fitness'], category: 'Health' },
        { keywords: ['movie', 'cinema', 'netflix', 'concert', 'game', 'spotify', 'theater', 'show', 'museum'], category: 'Entertainment' },
        { keywords: ['subscription', 'premium', 'membership', 'youtube', 'apple music', 'hbo', 'disney'], category: 'Subscriptions' },
        { keywords: ['haircut', 'salon', 'barber', 'skincare', 'cosmetic', 'beauty'], category: 'Personal Care' },
        { keywords: ['flight', 'hotel', 'airbnb', 'booking', 'vacation', 'trip', 'travel', 'visa fee'], category: 'Travel' },
        { keywords: ['salary', 'paycheck', 'wage', 'pay'], category: 'Salary' },
        { keywords: ['freelance', 'contract', 'gig', 'project payment', 'client'], category: 'Freelance Income' },
        { keywords: ['scholarship', 'stipend', 'grant', 'financial aid'], category: 'Scholarships' },
        { keywords: ['business', 'revenue', 'profit', 'sale'], category: 'Business Income' },
        { keywords: ['gift', 'present', 'birthday money'], category: 'Gifts' },
    ];

    // ───────── State ─────────
    let state = {
        transactions: [],
        settings: {
            currency: 'USD',
            theme: 'system',
            monthlyBudget: 0,
            categoryBudgets: {},
            hapticsEnabled: true,
        },
        currentPage: 'dashboard',
        selectedYear: new Date().getFullYear(),
        selectedMonth: new Date().getMonth(), // 0-indexed
        txPage: 1,
        txPerPage: 15,
        editingId: null,
    };

    // Chart instances
    let charts = {
        dashDoughnut: null,
        categoryDoughnut: null,
        monthlyTrends: null,
        dailySpending: null,
    };

    // ───────── Utility Functions ─────────

    /** Generate a unique ID */
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /** Trigger native haptic vibration on mobile devices */
    function triggerHaptic(duration = 10) {
        if (state.settings && state.settings.hapticsEnabled === false) return;
        try {
            if (window.navigator && typeof window.navigator.vibrate === 'function') {
                window.navigator.vibrate(duration);
            }
        } catch (_) {}
    }

    /** Safely store integer minor units for calculations (avoid float rounding) */
    function toMinor(amount, decimals) {
        // Convert to minor units by multiplying by 10^decimals
        // Use rounding to avoid floating-point issues
        return Math.round(amount * Math.pow(10, decimals));
    }

    function fromMinor(minor, decimals) {
        return minor / Math.pow(10, decimals);
    }

    /** Format currency amount */
    function formatCurrency(amount) {
        const cfg = CURRENCY_CONFIG[state.settings.currency] || CURRENCY_CONFIG.USD;
        try {
            return new Intl.NumberFormat(cfg.locale, {
                style: 'currency',
                currency: cfg.code,
                minimumFractionDigits: cfg.decimals,
                maximumFractionDigits: cfg.decimals,
            }).format(amount);
        } catch (e) {
            // Fallback
            const sign = amount < 0 ? '-' : '';
            const abs = Math.abs(amount).toFixed(cfg.decimals);
            return sign + cfg.symbol + abs;
        }
    }

    /** Format compact currency amount for tight widgets and high-digit currencies (e.g. UZS, KRW, JPY) */
    function formatCompactCurrency(amount) {
        const cfg = CURRENCY_CONFIG[state.settings.currency] || CURRENCY_CONFIG.USD;
        const abs = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';
        if (abs >= 1000000) {
            const num = (abs / 1000000).toFixed(1).replace(/\.0$/, '');
            return `${sign}${cfg.symbol || ''}${num}M ${cfg.code === 'UZS' ? 'soʻm' : ''}`.trim();
        }
        if (abs >= 10000 && cfg.decimals === 0) {
            const num = (abs / 1000).toFixed(0);
            return `${sign}${cfg.symbol || ''}${num}K ${cfg.code === 'UZS' ? 'soʻm' : ''}`.trim();
        }
        return formatCurrency(amount);
    }

    /** Format a date string (YYYY-MM-DD) for display */
    function formatDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[m - 1]} ${d}, ${y}`;
    }

    /** Get full month name */
    function monthName(monthIndex) {
        const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return names[monthIndex];
    }

    /** Escape HTML to prevent XSS */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /** Suggest category from description */
    function suggestCategory(description, type) {
        if (!description) return null;
        const lower = description.toLowerCase();
        for (const rule of CATEGORY_RULES) {
            for (const kw of rule.keywords) {
                if (lower.includes(kw)) {
                    // Check if the suggested category is the right type
                    const isExpenseCat = EXPENSE_CATEGORIES.includes(rule.category);
                    const isIncomeCat = INCOME_CATEGORIES.includes(rule.category);
                    if ((type === 'expense' && isExpenseCat) || (type === 'income' && isIncomeCat)) {
                        return rule.category;
                    }
                }
            }
        }
        return null;
    }

    /** Get transactions for a specific month */
    function getMonthTransactions(year, month) {
        return state.transactions.filter(tx => {
            const [y, m] = tx.date.split('-').map(Number);
            return y === year && m === month + 1; // month is 0-indexed in state
        });
    }

    /** Calculate totals for a set of transactions */
    function calcTotals(transactions) {
        const cfg = CURRENCY_CONFIG[state.settings.currency] || CURRENCY_CONFIG.USD;
        let incomeMinor = 0;
        let expenseMinor = 0;
        transactions.forEach(tx => {
            const minor = toMinor(tx.amount, cfg.decimals);
            if (tx.type === 'income') incomeMinor += minor;
            else expenseMinor += minor;
        });
        return {
            income: fromMinor(incomeMinor, cfg.decimals),
            expense: fromMinor(expenseMinor, cfg.decimals),
            savings: fromMinor(incomeMinor - expenseMinor, cfg.decimals),
            count: transactions.length,
        };
    }

    /** Days in a month */
    function daysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    // ───────── Persistence ─────────

    function saveTransactions() {
        try {
            localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(state.transactions));
            // Also persist to Capacitor Preferences for native reliability
            CapStorage.set(STORAGE_KEYS.transactions, state.transactions).catch(() => {});
        } catch (e) {
            showToast('Could not save transactions. Your storage may be full.', 'error');
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
            // Also persist to Capacitor Preferences for native reliability
            CapStorage.set(STORAGE_KEYS.settings, state.settings).catch(() => {});
        } catch (e) {
            showToast('Could not save settings.', 'error');
        }
    }

    function loadData() {
        // Load transactions
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.transactions);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    // Validate each transaction
                    state.transactions = parsed.filter(tx =>
                        tx && typeof tx === 'object' &&
                        typeof tx.id === 'string' &&
                        typeof tx.description === 'string' &&
                        typeof tx.amount === 'number' && tx.amount > 0 &&
                        typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) &&
                        (tx.type === 'income' || tx.type === 'expense') &&
                        typeof tx.category === 'string'
                    );
                    if (state.transactions.length < parsed.length) {
                        console.warn('Some stored transactions were invalid and skipped.');
                    }
                }
            }
        } catch (e) {
            console.error('Error loading transactions:', e);
            // Don't wipe — leave empty
        }

        // Load settings
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.settings);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    if (CURRENCY_CONFIG[parsed.currency]) state.settings.currency = parsed.currency;
                    if (typeof parsed.monthlyBudget === 'number' && parsed.monthlyBudget >= 0) {
                        state.settings.monthlyBudget = parsed.monthlyBudget;
                    }
                    if (parsed.categoryBudgets && typeof parsed.categoryBudgets === 'object') {
                        state.settings.categoryBudgets = parsed.categoryBudgets;
                    }
                    if (parsed.theme && ['system', 'light', 'dark'].includes(parsed.theme)) {
                        state.settings.theme = parsed.theme;
                    }
                    if (typeof parsed.hapticsEnabled === 'boolean') {
                        state.settings.hapticsEnabled = parsed.hapticsEnabled;
                    }
                }
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    // ───────── Theme System (System / Dark / Light) ─────────

    function applyTheme(theme, save = false) {
        state.settings.theme = theme || 'system';
        let effective = state.settings.theme;
        if (effective === 'system') {
            effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', effective);

        // Update Theme Color Meta for mobile status bars
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', effective === 'dark' ? '#0b0e14' : '#f1f4f9');
        }

        // Capacitor StatusBar sync
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
            try {
                window.Capacitor.Plugins.StatusBar.setStyle({ style: effective === 'dark' ? 'DARK' : 'LIGHT' });
                window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: effective === 'dark' ? '#0b0e14' : '#f1f4f9' });
            } catch (_) {}
        }

        // Update active class on settings segmented buttons
        document.querySelectorAll('.theme-seg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themeVal === state.settings.theme);
        });

        // Update quick toggle icon in header
        const quickIcon = document.getElementById('quickThemeIcon');
        if (quickIcon) {
            if (effective === 'dark') {
                // Show sun icon (click to switch to light)
                quickIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
            } else {
                // Show moon icon (click to switch to dark)
                quickIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
            }
        }

        if (save) {
            saveSettings();
        }
    }

    // ───────── Capacitor Storage Bridge ─────────
    // Provides persistent fallback via Capacitor Preferences plugin.
    // Falls back to localStorage when running in a browser.

    const CapStorage = {
        _cap: null,
        _ready: false,

        async init() {
            try {
                if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                    const { Preferences } = await import('@capacitor/preferences');
                    this._cap = Preferences;
                    this._ready = true;
                    // Migrate localStorage data into Preferences on first native launch
                    await this._migrateFromLocalStorage();
                }
            } catch (e) {
                console.warn('Capacitor Preferences not available, using localStorage:', e);
            }
        },

        async _migrateFromLocalStorage() {
            if (!this._ready) return;
            for (const key of Object.values(STORAGE_KEYS)) {
                const existing = await this._cap.get({ key });
                if (!existing.value) {
                    const local = localStorage.getItem(key);
                    if (local) {
                        await this._cap.set({ key, value: local });
                    }
                }
            }
        },

        async set(key, value) {
            const json = JSON.stringify(value);
            localStorage.setItem(key, json);
            if (this._ready) {
                try { await this._cap.set({ key, value: json }); } catch (_) {}
            }
        },

        async get(key) {
            if (this._ready) {
                try {
                    const result = await this._cap.get({ key });
                    if (result.value) return JSON.parse(result.value);
                } catch (_) {}
            }
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }
    };

    // ───────── Hardware Back Button ─────────

    let lastBackPress = 0;

    function isAnyModalOpen() {
        const modals = document.querySelectorAll('.modal-overlay');
        for (const m of modals) {
            if (m.classList.contains('active')) return m.id;
        }
        return null;
    }

    function isSidebarOpen() {
        const sidebar = document.getElementById('sidebar');
        return sidebar && sidebar.classList.contains('open');
    }

    function handleHardwareBack() {
        // 1. Close any open modal first
        const openModalId = isAnyModalOpen();
        if (openModalId) {
            closeModal(openModalId);
            return;
        }

        // 2. Close sidebar drawer if open
        if (isSidebarOpen()) {
            closeSidebar();
            return;
        }

        // 3. If not on dashboard, navigate back to dashboard
        if (state.currentPage !== 'dashboard') {
            navigateTo('dashboard');
            return;
        }

        // 4. On dashboard: double-tap back to exit
        const now = Date.now();
        if (now - lastBackPress < 2000) {
            // Exit the app
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.exitApp();
            }
        } else {
            lastBackPress = now;
            showBackExitToast();
        }
    }

    function showBackExitToast() {
        // Remove existing back-exit toast if any
        const existing = document.querySelector('.back-exit-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'back-exit-toast';
        toast.textContent = 'Press back again to exit';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 250);
        }, 2000);
    }

    function registerBackButton() {
        // Capacitor native back button
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('backButton', (ev) => {
                ev.canGoBack = false; // Prevent default WebView back navigation
                handleHardwareBack();
            });
        }

        // Browser fallback for testing — listen to popstate
        window.addEventListener('popstate', (e) => {
            e.preventDefault();
            handleHardwareBack();
            // Push a dummy state so we can intercept the next back press
            history.pushState(null, '', window.location.href);
        });
        // Push initial dummy state
        history.pushState(null, '', window.location.href);
    }

    // ───────── Toast Notifications ─────────

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    // ───────── Navigation ─────────

    function navigateTo(page) {
        triggerHaptic(8);
        state.currentPage = page;

        // Update nav items (both sidebar and Telegram bottom dock)
        document.querySelectorAll('.nav-item, .tg-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === 'page-' + page);
        });

        // Update title
        const titles = {
            dashboard: 'Overview',
            transactions: 'History',
            analytics: 'Analytics',
            budgets: 'Budgets',
            settings: 'Settings',
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;

        // Show/hide month nav on relevant pages
        const monthNav = document.getElementById('monthNav');
        if (monthNav) {
            const showMonth = ['dashboard', 'analytics', 'budgets'].includes(page);
            monthNav.style.display = showMonth ? 'inline-flex' : 'none';
        }

        // Close mobile sidebar
        closeSidebar();

        // Refresh page data
        refreshCurrentPage();
    }

    function refreshCurrentPage() {
        switch (state.currentPage) {
            case 'dashboard': renderDashboard(); break;
            case 'transactions': renderTransactions(); break;
            case 'analytics': renderAnalytics(); break;
            case 'budgets': renderBudgets(); break;
            case 'settings': renderSettings(); break;
        }
    }

    // ───────── Month Navigation ─────────

    function updateMonthLabel() {
        document.getElementById('monthLabel').textContent = `${monthName(state.selectedMonth)} ${state.selectedYear}`;
    }

    function prevMonth() {
        if (state.selectedMonth === 0) {
            state.selectedMonth = 11;
            state.selectedYear--;
        } else {
            state.selectedMonth--;
        }
        updateMonthLabel();
        refreshCurrentPage();
    }

    function nextMonth() {
        if (state.selectedMonth === 11) {
            state.selectedMonth = 0;
            state.selectedYear++;
        } else {
            state.selectedMonth++;
        }
        updateMonthLabel();
        refreshCurrentPage();
    }

    // ───────── Mobile Sidebar ─────────

    function openSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    }

    // ───────── Dashboard ─────────

    function renderDashboard() {
        const curr = getMonthTransactions(state.selectedYear, state.selectedMonth);
        const totals = calcTotals(curr);

        // Previous month for comparison
        let prevYear = state.selectedYear;
        let prevMo = state.selectedMonth - 1;
        if (prevMo < 0) { prevMo = 11; prevYear--; }
        const prev = getMonthTransactions(prevYear, prevMo);
        const prevTotals = calcTotals(prev);

        // Welcome Card (first time onboarding)
        const welcomeCard = document.getElementById('welcomeCard');
        if (welcomeCard) {
            welcomeCard.style.display = state.transactions.length === 0 ? 'flex' : 'none';
        }

        // Update summary cards
        document.getElementById('totalSpending').textContent = formatCurrency(totals.expense);
        document.getElementById('totalIncome').textContent = formatCurrency(totals.income);
        document.getElementById('totalSavings').textContent = formatCurrency(totals.savings);
        const txCountEl = document.getElementById('transactionCount');
        if (txCountEl) txCountEl.textContent = totals.count.toString();

        // Update hero donut center anchor
        const heroCenterVal = document.getElementById('heroCenterVal');
        const heroCenterSub = document.getElementById('heroCenterSub');
        if (heroCenterVal && heroCenterSub) {
            if (totals.expense > 0) {
                heroCenterSub.textContent = 'EXPENSE';
                heroCenterVal.textContent = formatCompactCurrency(totals.expense);
            } else {
                heroCenterSub.textContent = 'SPENT';
                heroCenterVal.textContent = formatCurrency(0);
            }
        }

        // Dynamic Net Savings badge color
        const heroNetPill = document.getElementById('heroNetPill');
        if (heroNetPill) {
            heroNetPill.classList.remove('positive', 'negative');
            if (totals.savings > 0) {
                heroNetPill.classList.add('positive');
            } else if (totals.savings < 0) {
                heroNetPill.classList.add('negative');
            }
        }

        // Budget remaining
        const budget = state.settings.monthlyBudget;
        if (budget > 0) {
            const remaining = budget - totals.expense;
            document.getElementById('budgetRemaining').textContent = formatCurrency(remaining);
            document.getElementById('budgetRemaining').style.color = remaining < 0 ? 'var(--red)' : '';
        } else {
            document.getElementById('budgetRemaining').textContent = 'Not set';
            document.getElementById('budgetRemaining').style.color = 'var(--text-muted)';
        }

        // Comparisons
        renderComparison('spendingComparison', totals.expense, prevTotals.expense, true);
        renderComparison('incomeComparison', totals.income, prevTotals.income, false);
        renderComparison('savingsComparison', totals.savings, prevTotals.savings, false);
        renderComparison('countComparison', totals.count, prevTotals.count, false, true);

        // Budget comparison
        if (budget > 0) {
            const pct = Math.round((totals.expense / budget) * 100);
            document.getElementById('budgetComparison').textContent = `${pct}% of budget used`;
            document.getElementById('budgetComparison').style.color = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--yellow)' : '';
        } else {
            document.getElementById('budgetComparison').textContent = '';
        }

        // Quick budget status chip
        const qbEl = document.getElementById('quickBudgetStatus');
        if (qbEl) {
            if (budget > 0) {
                const pct = Math.round((totals.expense / budget) * 100);
                qbEl.textContent = `${pct}% used`;
                qbEl.style.color = pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--yellow)' : 'var(--green)';
            } else {
                qbEl.textContent = 'Manage \u2192';
                qbEl.style.color = 'var(--accent)';
            }
        }

        // Greeting (safely checked)
        const hour = new Date().getHours();
        let greeting = 'Good evening!';
        if (hour < 12) greeting = 'Good morning!';
        else if (hour < 18) greeting = 'Good afternoon!';
        const greetingH2 = document.querySelector('.dashboard-greeting h2');
        if (greetingH2) greetingH2.textContent = greeting;

        const isCurrentMonth = state.selectedYear === new Date().getFullYear() && state.selectedMonth === new Date().getMonth();
        const greetingSub = document.getElementById('greetingSub');
        if (greetingSub) {
            greetingSub.textContent = isCurrentMonth
                ? "Here's your financial overview for this month."
                : `Viewing ${monthName(state.selectedMonth)} ${state.selectedYear}.`;
        }

        // Recent transactions
        renderRecentTransactions(curr);

        // Dashboard doughnut chart
        renderDashDoughnut(curr);

        // Update sidebar currency
        document.getElementById('sidebarCurrency').textContent = state.settings.currency;
    }

    function renderComparison(elementId, current, previous, inverseColor = false, isCount = false) {
        const el = document.getElementById(elementId);
        if (previous === 0 && current === 0) {
            el.innerHTML = '';
            return;
        }
        if (previous === 0) {
            // Cannot compute percentage
            if (current > 0) {
                el.innerHTML = isCount
                    ? `<span class="${inverseColor ? 'down' : 'up'}">${current} this month (new)</span>`
                    : `<span class="${inverseColor ? 'down' : 'up'}">New this month</span>`;
            } else {
                el.innerHTML = '';
            }
            return;
        }
        const diff = current - previous;
        const pct = Math.round((diff / Math.abs(previous)) * 100);
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '';
        const cls = diff > 0 ? (inverseColor ? 'down' : 'up') : diff < 0 ? (inverseColor ? 'up' : 'down') : '';

        if (isCount) {
            if (diff === 0) {
                el.innerHTML = `Same as last month`;
            } else {
                el.innerHTML = `<span class="${cls}">${arrow} ${Math.abs(diff)} vs last month</span>`;
            }
        } else {
            if (diff === 0) {
                el.innerHTML = `Same as last month`;
            } else {
                const absDiff = formatCurrency(Math.abs(diff));
                el.innerHTML = `<span class="${cls}">${arrow} ${absDiff} (${Math.abs(pct)}%) vs last month</span>`;
            }
        }
    }

    function renderRecentTransactions(monthTx) {
        const container = document.getElementById('recentTransactions');

        if (monthTx.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <p>No transactions yet</p>
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('addTransactionBtn').click()">Add your first transaction</button>
                </div>
            `;
            return;
        }

        const sorted = [...monthTx].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
        const recent = sorted.slice(0, 8);

        container.innerHTML = recent.map(tx => {
            const icon = CATEGORY_ICONS[tx.category] || (tx.type === 'income' ? '💵' : '📦');
            const sign = tx.type === 'expense' ? '-' : '+';
            return `
                <div class="recent-tx-item">
                    <div class="recent-tx-left">
                        <div class="recent-tx-icon ${tx.type}">${icon}</div>
                        <div>
                            <div class="recent-tx-desc">${escapeHtml(tx.description)}</div>
                            <div class="recent-tx-cat">${escapeHtml(tx.category)} · ${formatDate(tx.date)}</div>
                        </div>
                    </div>
                    <div class="recent-tx-amount ${tx.type}">${sign}${formatCurrency(tx.amount)}</div>
                </div>
            `;
        }).join('');
    }

    function renderDashDoughnut(monthTx) {
        const canvas = document.getElementById('dashDoughnutChart');
        const emptyEl = document.getElementById('dashDoughnutEmpty');
        const captionEl = document.getElementById('heroChartCaption');
        const expenses = monthTx.filter(tx => tx.type === 'expense');

        if (expenses.length === 0) {
            canvas.style.display = 'none';
            emptyEl.style.display = 'flex';
            if (captionEl) captionEl.textContent = 'No Expenses';
            const heroCenterVal = document.getElementById('heroCenterVal');
            const heroCenterSub = document.getElementById('heroCenterSub');
            if (heroCenterVal && heroCenterSub) {
                heroCenterSub.textContent = 'NO EXPENSES';
                heroCenterVal.textContent = '—';
            }
            if (charts.dashDoughnut) { charts.dashDoughnut.destroy(); charts.dashDoughnut = null; }
            return;
        }

        canvas.style.display = 'block';
        emptyEl.style.display = 'none';

        const catTotals = {};
        expenses.forEach(tx => {
            catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
        });

        const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(e => e[0]);
        const data = sorted.map(e => Math.round(e[1] * 100) / 100);
        const colors = generateColors(labels.length);

        if (captionEl) {
            captionEl.textContent = `${sorted.length} ${sorted.length === 1 ? 'Category' : 'Categories'}`;
        }

        if (charts.dashDoughnut) charts.dashDoughnut.destroy();
        charts.dashDoughnut = new Chart(canvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ───────── Transactions Page ─────────

    function renderTransactions() {
        const allMonthTx = getMonthTransactions(state.selectedYear, state.selectedMonth);
        let filtered = [...state.transactions]; // Show all, not just month

        // Search
        const search = document.getElementById('searchInput').value.toLowerCase().trim();
        if (search) {
            filtered = filtered.filter(tx => tx.description.toLowerCase().includes(search));
        }

        // Filter type
        const filterType = document.getElementById('filterType').value;
        if (filterType !== 'all') {
            filtered = filtered.filter(tx => tx.type === filterType);
        }

        // Filter category
        const filterCat = document.getElementById('filterCategory').value;
        if (filterCat !== 'all') {
            filtered = filtered.filter(tx => tx.category === filterCat);
        }

        // Sort
        const sortBy = document.getElementById('sortBy').value;
        switch (sortBy) {
            case 'date-desc': filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)); break;
            case 'date-asc': filtered.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)); break;
            case 'amount-desc': filtered.sort((a, b) => b.amount - a.amount); break;
            case 'amount-asc': filtered.sort((a, b) => a.amount - b.amount); break;
        }

        const tbody = document.getElementById('transactionsBody');
        const emptyEl = document.getElementById('transactionsEmpty');
        const tableWrap = document.querySelector('.transactions-table-wrap .transactions-table');
        const mobList = document.getElementById('transactionsMobileList');

        if (filtered.length === 0) {
            tableWrap.style.display = 'none';
            if (mobList) mobList.style.display = 'none';
            emptyEl.style.display = 'flex';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        tableWrap.style.display = '';
        if (mobList) mobList.style.display = '';
        emptyEl.style.display = 'none';

        // Pagination
        const totalPages = Math.ceil(filtered.length / state.txPerPage);
        if (state.txPage > totalPages) state.txPage = totalPages;
        if (state.txPage < 1) state.txPage = 1;

        const start = (state.txPage - 1) * state.txPerPage;
        const pageItems = filtered.slice(start, start + state.txPerPage);

        // 1. Render Desktop Table
        tbody.innerHTML = pageItems.map(tx => {
            const sign = tx.type === 'expense' ? '-' : '+';
            return `
                <tr>
                    <td>${formatDate(tx.date)}</td>
                    <td>${escapeHtml(tx.description)}</td>
                    <td><span class="tx-category-badge">${escapeHtml(tx.category)}</span></td>
                    <td class="tx-amount ${tx.type}">${sign}${formatCurrency(tx.amount)}</td>
                    <td class="tx-actions">
                        <button class="btn-icon" title="Edit" data-edit="${tx.id}" aria-label="Edit transaction">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon" title="Delete" data-delete="${tx.id}" aria-label="Delete transaction">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // 2. Render Native Mobile Cards
        if (mobList) {
            mobList.innerHTML = pageItems.map(tx => {
                const icon = CATEGORY_ICONS[tx.category] || (tx.type === 'income' ? '💵' : '📦');
                const sign = tx.type === 'expense' ? '-' : '+';
                return `
                    <div class="tx-mobile-card" data-edit-tx="${tx.id}">
                        <div class="tx-mobile-left">
                            <div class="tx-mobile-icon ${tx.type}">${icon}</div>
                            <div class="tx-mobile-info">
                                <div class="tx-mobile-desc">${escapeHtml(tx.description)}</div>
                                <div class="tx-mobile-meta">
                                    <span>${escapeHtml(tx.category)}</span>
                                    <span>·</span>
                                    <span>${formatDate(tx.date)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="tx-mobile-right">
                            <div class="tx-mobile-amount ${tx.type}">${sign}${formatCurrency(tx.amount)}</div>
                            <div class="tx-mobile-actions">
                                <button class="btn-icon" title="Edit" data-edit-btn="${tx.id}" aria-label="Edit">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button class="btn-icon" title="Delete" data-del-btn="${tx.id}" aria-label="Delete">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            mobList.querySelectorAll('.tx-mobile-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const delBtn = e.target.closest('[data-del-btn]');
                    const editBtn = e.target.closest('[data-edit-btn]');
                    if (delBtn) {
                        e.stopPropagation();
                        confirmDeleteTransaction(delBtn.dataset.delBtn);
                    } else if (editBtn) {
                        e.stopPropagation();
                        openEditTransaction(editBtn.dataset.editBtn);
                    } else {
                        openEditTransaction(card.dataset.editTx);
                    }
                });
            });
        }

        // Render pagination
        renderPagination(totalPages);

        // Attach desktop edit/delete handlers
        tbody.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => openEditTransaction(btn.dataset.edit));
        });
        tbody.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => confirmDeleteTransaction(btn.dataset.delete));
        });
    }

    function renderPagination(totalPages) {
        const container = document.getElementById('pagination');
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let html = '';
        html += `<button ${state.txPage <= 1 ? 'disabled' : ''} data-page="${state.txPage - 1}">‹</button>`;

        const range = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - state.txPage) <= 1) {
                range.push(i);
            } else if (range[range.length - 1] !== '...') {
                range.push('...');
            }
        }
        range.forEach(p => {
            if (p === '...') {
                html += `<button disabled>…</button>`;
            } else {
                html += `<button class="${p === state.txPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
            }
        });

        html += `<button ${state.txPage >= totalPages ? 'disabled' : ''} data-page="${state.txPage + 1}">›</button>`;
        container.innerHTML = html;

        container.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page)) {
                    state.txPage = page;
                    renderTransactions();
                }
            });
        });
    }

    function populateFilterCategories() {
        const sel = document.getElementById('filterCategory');
        const current = sel.value;
        sel.innerHTML = '<option value="all">All Categories</option>';
        [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach(cat => {
            sel.innerHTML += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
        });
        sel.value = current || 'all';
    }

    // ───────── Transaction Modal ─────────

    const QUICK_PRESETS = {
        expense: [
            { cat: 'Food & Groceries', label: '🛒 Groceries' },
            { cat: 'Restaurants & Cafes', label: '☕ Cafe' },
            { cat: 'Transportation', label: '🚌 Transit' },
            { cat: 'Shopping', label: '🛍️ Shopping' },
            { cat: 'Utilities', label: '⚡ Bills' },
            { cat: 'Subscriptions', label: '📱 Subs' },
            { cat: 'Entertainment', label: '🎬 Fun' },
            { cat: 'Health', label: '💊 Health' },
        ],
        income: [
            { cat: 'Salary', label: '💰 Salary' },
            { cat: 'Freelance Income', label: '💻 Freelance' },
            { cat: 'Gifts', label: '🎁 Gift' },
            { cat: 'Scholarships', label: '🎓 Scholarship' },
            { cat: 'Business Income', label: '📈 Business' },
        ]
    };

    function renderQuickCategoryChips(type, selectedCat = '') {
        const container = document.getElementById('quickCategoryChips');
        if (!container) return;
        const presets = QUICK_PRESETS[type] || QUICK_PRESETS.expense;
        const currentCat = selectedCat || document.getElementById('txCategory').value;

        container.innerHTML = presets.map(p => `
            <button type="button" class="quick-cat-chip ${p.cat === currentCat ? 'active' : ''}" data-cat="${escapeHtml(p.cat)}">
                ${p.label}
            </button>
        `).join('');

        container.querySelectorAll('.quick-cat-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                triggerHaptic(12);
                const cat = chip.dataset.cat;
                const catSel = document.getElementById('txCategory');
                if (catSel) catSel.value = cat;

                container.querySelectorAll('.quick-cat-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                // Auto-fill description if currently empty
                const descInput = document.getElementById('txDescription');
                if (descInput && !descInput.value.trim()) {
                    const cleanLabel = chip.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').trim();
                    descInput.value = cleanLabel;
                }
            });
        });
    }

    function updateTxAmountSymbol() {
        const symbolEl = document.getElementById('txAmountSymbol');
        if (symbolEl) {
            const cfg = CURRENCY_CONFIG[state.settings.currency] || CURRENCY_CONFIG.USD;
            symbolEl.textContent = cfg.symbol;
        }
    }

    function openAddTransaction() {
        state.editingId = null;
        document.getElementById('modalTitle').textContent = 'Add Transaction';
        document.getElementById('modalSubmit').textContent = 'Add Transaction';
        document.getElementById('transactionForm').reset();
        document.getElementById('txType').value = 'expense';
        updateTypeToggle('expense');
        populateCategories('expense');
        renderQuickCategoryChips('expense');
        document.getElementById('txDate').value = todayStr();
        updateTxAmountSymbol();
        clearFormErrors();
        document.getElementById('categorySuggestion').style.display = 'none';
        openModal('transactionModal');
    }

    function openEditTransaction(id) {
        const tx = state.transactions.find(t => t.id === id);
        if (!tx) return;
        state.editingId = id;
        document.getElementById('modalTitle').textContent = 'Edit Transaction';
        document.getElementById('modalSubmit').textContent = 'Save Changes';
        document.getElementById('txType').value = tx.type;
        updateTypeToggle(tx.type);
        populateCategories(tx.type);
        document.getElementById('txDescription').value = tx.description;
        document.getElementById('txAmount').value = tx.amount;
        updateTxAmountSymbol();
        document.getElementById('txDate').value = tx.date;
        document.getElementById('txCategory').value = tx.category;
        renderQuickCategoryChips(tx.type, tx.category);
        document.getElementById('txNote').value = tx.note || '';
        clearFormErrors();
        document.getElementById('categorySuggestion').style.display = 'none';
        openModal('transactionModal');
    }

    function updateTypeToggle(type) {
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        document.getElementById('txType').value = type;
        renderQuickCategoryChips(type);
    }

    function populateCategories(type) {
        const sel = document.getElementById('txCategory');
        const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    function todayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function clearFormErrors() {
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-group input.error, .form-group select.error').forEach(el => el.classList.remove('error'));
    }

    function validateTransactionForm() {
        let valid = true;
        clearFormErrors();

        const desc = document.getElementById('txDescription').value.trim();
        if (!desc) {
            document.getElementById('descError').textContent = 'Description is required.';
            document.getElementById('txDescription').classList.add('error');
            valid = false;
        }

        const amountStr = document.getElementById('txAmount').value;
        const amount = parseFloat(amountStr);
        if (!amountStr || isNaN(amount) || amount <= 0) {
            document.getElementById('amountError').textContent = 'Enter a valid positive amount.';
            document.getElementById('txAmount').classList.add('error');
            valid = false;
        }

        const date = document.getElementById('txDate').value;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            document.getElementById('dateError').textContent = 'Enter a valid date.';
            document.getElementById('txDate').classList.add('error');
            valid = false;
        } else {
            // Validate date is a real date
            const [y, m, d] = date.split('-').map(Number);
            const testDate = new Date(y, m - 1, d);
            if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
                document.getElementById('dateError').textContent = 'This date does not exist.';
                document.getElementById('txDate').classList.add('error');
                valid = false;
            }
        }

        return valid;
    }

    function submitTransaction(e) {
        e.preventDefault();
        if (!validateTransactionForm()) return;
        triggerHaptic(20);

        const type = document.getElementById('txType').value;
        const description = document.getElementById('txDescription').value.trim();
        const amount = parseFloat(document.getElementById('txAmount').value);
        const date = document.getElementById('txDate').value;
        const category = document.getElementById('txCategory').value;
        const note = document.getElementById('txNote').value.trim();

        if (state.editingId) {
            // Edit existing
            const idx = state.transactions.findIndex(t => t.id === state.editingId);
            if (idx !== -1) {
                state.transactions[idx] = {
                    ...state.transactions[idx],
                    type, description, amount, date, category, note,
                };
                showToast('Transaction updated.', 'success');
            }
        } else {
            // Add new
            state.transactions.push({
                id: uid(),
                type, description, amount, date, category, note,
                isSample: false,
            });
            showToast('Transaction added.', 'success');
        }

        saveTransactions();
        closeModal('transactionModal');
        refreshCurrentPage();
    }

    function showUndoToast(description, onUndo) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast info';
        toast.innerHTML = `
            <span>Deleted "${escapeHtml(description)}"</span>
            <button type="button" class="toast-undo-btn" id="toastUndoBtn">UNDO</button>
        `;
        container.appendChild(toast);

        const undoBtn = toast.querySelector('#toastUndoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                triggerHaptic(15);
                onUndo();
                toast.remove();
                showToast('Transaction restored.', 'success');
            });
        }

        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, 5000);
    }

    function confirmDeleteTransaction(id) {
        const txIndex = state.transactions.findIndex(t => t.id === id);
        if (txIndex === -1) return;
        const tx = state.transactions[txIndex];
        document.getElementById('confirmMessage').textContent = `Delete "${tx.description}" (${formatCurrency(tx.amount)})?`;
        openModal('confirmModal');

        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');

        // Clone to remove old listeners
        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newOk.addEventListener('click', () => {
            triggerHaptic(20);
            state.transactions.splice(txIndex, 1);
            saveTransactions();
            closeModal('confirmModal');
            refreshCurrentPage();

            showUndoToast(tx.description, () => {
                state.transactions.splice(txIndex, 0, tx);
                saveTransactions();
                refreshCurrentPage();
            });
        });
        newCancel.addEventListener('click', () => closeModal('confirmModal'));
    }

    // ───────── Modals ─────────

    function openModal(id) {
        document.getElementById(id).classList.add('active');
        document.body.classList.add('modal-open');
        // Focus first input if transaction modal
        if (id === 'transactionModal') {
            setTimeout(() => document.getElementById('txDescription').focus(), 100);
        }
    }

    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
        if (!document.querySelector('.modal-overlay.active')) {
            document.body.classList.remove('modal-open');
        }
    }

    // ───────── Analytics ─────────

    function renderAnalytics() {
        const monthTx = getMonthTransactions(state.selectedYear, state.selectedMonth);
        renderCategoryDoughnut(monthTx);
        renderMonthlyTrends();
        renderDailySpending(monthTx);
        renderInsights(monthTx);
    }

    function renderCategoryDoughnut(monthTx) {
        const canvas = document.getElementById('categoryDoughnut');
        const emptyEl = document.getElementById('catDoughnutEmpty');
        const expenses = monthTx.filter(tx => tx.type === 'expense');

        if (expenses.length === 0) {
            canvas.style.display = 'none';
            emptyEl.style.display = 'flex';
            if (charts.categoryDoughnut) { charts.categoryDoughnut.destroy(); charts.categoryDoughnut = null; }
            return;
        }
        canvas.style.display = 'block';
        emptyEl.style.display = 'none';

        const catTotals = {};
        expenses.forEach(tx => {
            catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
        });
        const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(e => e[0]);
        const data = sorted.map(e => Math.round(e[1] * 100) / 100);
        const colors = generateColors(labels.length);

        if (charts.categoryDoughnut) charts.categoryDoughnut.destroy();
        charts.categoryDoughnut = new Chart(canvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9096a4', padding: 12, font: { size: 11 }, usePointStyle: true, pointStyleWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const idx = elements[0].index;
                        const category = labels[idx];
                        navigateTo('transactions');
                        document.getElementById('filterCategory').value = category;
                        document.getElementById('filterType').value = 'expense';
                        renderTransactions();
                    }
                }
            }
        });
    }

    function renderMonthlyTrends() {
        const canvas = document.getElementById('monthlyTrendsChart');
        const emptyEl = document.getElementById('trendsEmpty');

        // Last 6 months
        const months = [];
        let y = state.selectedYear, m = state.selectedMonth;
        for (let i = 0; i < 6; i++) {
            months.unshift({ year: y, month: m });
            m--;
            if (m < 0) { m = 11; y--; }
        }

        const labels = months.map(mo => `${monthName(mo.month).substr(0, 3)} ${mo.year}`);
        const incomes = months.map(mo => calcTotals(getMonthTransactions(mo.year, mo.month)).income);
        const expenses = months.map(mo => calcTotals(getMonthTransactions(mo.year, mo.month)).expense);

        const hasData = incomes.some(v => v > 0) || expenses.some(v => v > 0);
        if (!hasData) {
            canvas.style.display = 'none';
            emptyEl.style.display = 'flex';
            if (charts.monthlyTrends) { charts.monthlyTrends.destroy(); charts.monthlyTrends = null; }
            return;
        }
        canvas.style.display = 'block';
        emptyEl.style.display = 'none';

        if (charts.monthlyTrends) charts.monthlyTrends.destroy();
        charts.monthlyTrends = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Income', data: incomes, backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 4 },
                    { label: 'Expenses', data: expenses, backgroundColor: 'rgba(248,113,113,0.7)', borderRadius: 4 },
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9096a4', font: { size: 11 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9096a4', font: { size: 11 }, callback: v => formatCurrency(v) }, beginAtZero: true },
                },
                plugins: {
                    legend: { labels: { color: '#9096a4', font: { size: 11 }, usePointStyle: true, pointStyleWidth: 8 } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } }
                }
            }
        });
    }

    function renderDailySpending(monthTx) {
        const canvas = document.getElementById('dailySpendingChart');
        const emptyEl = document.getElementById('dailyEmpty');
        const expenses = monthTx.filter(tx => tx.type === 'expense');

        if (expenses.length === 0) {
            canvas.style.display = 'none';
            emptyEl.style.display = 'flex';
            if (charts.dailySpending) { charts.dailySpending.destroy(); charts.dailySpending = null; }
            return;
        }
        canvas.style.display = 'block';
        emptyEl.style.display = 'none';

        const days = daysInMonth(state.selectedYear, state.selectedMonth);
        const dailyData = new Array(days).fill(0);
        expenses.forEach(tx => {
            const day = parseInt(tx.date.split('-')[2]) - 1;
            if (day >= 0 && day < days) dailyData[day] += tx.amount;
        });

        const labels = Array.from({ length: days }, (_, i) => i + 1);

        if (charts.dailySpending) charts.dailySpending.destroy();
        charts.dailySpending = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Spending',
                    data: dailyData.map(v => Math.round(v * 100) / 100),
                    backgroundColor: 'rgba(108,140,255,0.6)',
                    borderRadius: 3,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#9096a4', font: { size: 10 }, maxTicksLimit: 15 } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9096a4', font: { size: 11 }, callback: v => formatCurrency(v) }, beginAtZero: true },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed.y)}`, title: ctx => `Day ${ctx[0].label}` } }
                }
            }
        });
    }

    function renderInsights(monthTx) {
        const container = document.getElementById('insightsContainer');
        const totals = calcTotals(monthTx);
        const expenses = monthTx.filter(tx => tx.type === 'expense');

        if (monthTx.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Add some transactions to see insights.</p></div>';
            return;
        }

        const insights = [];

        // Biggest category
        if (expenses.length > 0) {
            const catTotals = {};
            expenses.forEach(tx => { catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount; });
            const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
            const top = sorted[0];
            const totalExp = totals.expense;
            const pct = totalExp > 0 ? ((top[1] / totalExp) * 100).toFixed(0) : 0;
            insights.push({
                icon: CATEGORY_ICONS[top[0]] || '📊',
                text: `Your biggest expense category is <strong>${escapeHtml(top[0])}</strong>, accounting for <strong>${pct}%</strong> (${formatCurrency(top[1])}) of spending.`,
                bg: 'var(--accent-subtle)',
            });
        }

        // Compare with previous month
        let prevYear = state.selectedYear, prevMo = state.selectedMonth - 1;
        if (prevMo < 0) { prevMo = 11; prevYear--; }
        const prevTx = getMonthTransactions(prevYear, prevMo);
        const prevTotals = calcTotals(prevTx);

        if (prevTotals.expense > 0 && totals.expense > 0) {
            const diff = totals.expense - prevTotals.expense;
            const pct = Math.round((diff / prevTotals.expense) * 100);
            if (diff > 0) {
                insights.push({
                    icon: '📈', bg: 'var(--red-subtle)',
                    text: `You're spending <strong>${formatCurrency(Math.abs(diff))}</strong> (<strong>${Math.abs(pct)}%</strong>) more than last month.`,
                });
            } else if (diff < 0) {
                insights.push({
                    icon: '📉', bg: 'var(--green-subtle)',
                    text: `Great! You're spending <strong>${formatCurrency(Math.abs(diff))}</strong> (<strong>${Math.abs(pct)}%</strong>) less than last month.`,
                });
            }
        }

        // Category with biggest increase
        if (prevTx.length > 0 && expenses.length > 0) {
            const currCats = {};
            expenses.forEach(tx => { currCats[tx.category] = (currCats[tx.category] || 0) + tx.amount; });
            const prevCats = {};
            prevTx.filter(tx => tx.type === 'expense').forEach(tx => { prevCats[tx.category] = (prevCats[tx.category] || 0) + tx.amount; });

            let biggestIncrease = null;
            for (const cat in currCats) {
                if (prevCats[cat] && prevCats[cat] > 0) {
                    const increase = currCats[cat] - prevCats[cat];
                    if (increase > 0 && (!biggestIncrease || increase > biggestIncrease.increase)) {
                        biggestIncrease = { cat, increase, pct: Math.round((increase / prevCats[cat]) * 100) };
                    }
                }
            }
            if (biggestIncrease && biggestIncrease.pct >= 20) {
                insights.push({
                    icon: '⚠️', bg: 'var(--yellow-subtle)',
                    text: `<strong>${escapeHtml(biggestIncrease.cat)}</strong> spending increased by <strong>${biggestIncrease.pct}%</strong> (${formatCurrency(biggestIncrease.increase)}) vs last month.`,
                });
            }
        }

        // Savings insight
        if (totals.income > 0 && totals.expense > 0) {
            const savingsRate = ((totals.savings / totals.income) * 100).toFixed(0);
            if (totals.savings > 0) {
                insights.push({
                    icon: '💰', bg: 'var(--green-subtle)',
                    text: `You're saving <strong>${savingsRate}%</strong> of your income this month (${formatCurrency(totals.savings)}).`,
                });
            } else {
                insights.push({
                    icon: '🚨', bg: 'var(--red-subtle)',
                    text: `You're spending more than you earn. Expenses exceed income by <strong>${formatCurrency(Math.abs(totals.savings))}</strong>.`,
                });
            }
        }

        // Largest single expense
        if (expenses.length > 0) {
            const largest = expenses.reduce((max, tx) => tx.amount > max.amount ? tx : max, expenses[0]);
            insights.push({
                icon: '💸', bg: 'var(--accent-subtle)',
                text: `Largest single expense: <strong>${escapeHtml(largest.description)}</strong> — ${formatCurrency(largest.amount)} on ${formatDate(largest.date)}.`,
            });
        }

        // Average daily spending
        if (expenses.length > 0) {
            const daysElapsed = (() => {
                const now = new Date();
                const isCurrentMonth = state.selectedYear === now.getFullYear() && state.selectedMonth === now.getMonth();
                if (isCurrentMonth) return now.getDate();
                return daysInMonth(state.selectedYear, state.selectedMonth);
            })();
            const avgDaily = totals.expense / daysElapsed;
            insights.push({
                icon: '📊', bg: 'var(--accent-subtle)',
                text: `Average daily spending: <strong>${formatCurrency(avgDaily)}</strong> over ${daysElapsed} days.`,
            });
        }

        if (insights.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Not enough data for insights yet.</p></div>';
            return;
        }

        container.innerHTML = insights.map(ins => `
            <div class="insight-item">
                <div class="insight-icon" style="background:${ins.bg}">${ins.icon}</div>
                <div class="insight-text">${ins.text}</div>
            </div>
        `).join('');
    }

    function applyAnalyticsView(view) {
        const cards = {
            categories: document.getElementById('cardAnalyticsCategories'),
            trends: document.getElementById('cardAnalyticsTrends'),
            daily: document.getElementById('cardAnalyticsDaily'),
            insights: document.getElementById('cardAnalyticsInsights'),
        };
        if (!cards.categories) return;

        if (view === 'all') {
            Object.values(cards).forEach(c => { if (c) c.style.display = ''; });
        } else if (view === 'categories') {
            cards.categories.style.display = '';
            cards.insights.style.display = '';
            cards.trends.style.display = 'none';
            cards.daily.style.display = 'none';
        } else if (view === 'trends') {
            cards.trends.style.display = '';
            cards.categories.style.display = 'none';
            cards.daily.style.display = 'none';
            cards.insights.style.display = 'none';
        } else if (view === 'daily') {
            cards.daily.style.display = '';
            cards.categories.style.display = 'none';
            cards.trends.style.display = 'none';
            cards.insights.style.display = 'none';
        }
    }

    // ───────── Budgets ─────────

    function renderBudgets() {
        const monthTx = getMonthTransactions(state.selectedYear, state.selectedMonth);
        const totals = calcTotals(monthTx);
        const budget = state.settings.monthlyBudget;

        // Overall budget
        const spent = totals.expense;
        document.getElementById('budgetSpentLabel').textContent = `Spent: ${formatCurrency(spent)}`;
        document.getElementById('budgetTotalLabel').textContent = `Budget: ${budget > 0 ? formatCurrency(budget) : 'Not set'}`;

        const fill = document.getElementById('budgetBarFill');
        if (budget > 0) {
            const pct = Math.min((spent / budget) * 100, 100);
            fill.style.width = pct + '%';
            fill.className = 'budget-bar-fill';
            if (spent > budget) fill.classList.add('danger');
            else if (pct > 80) fill.classList.add('warning');

            document.getElementById('budgetPercentLabel').textContent = `${Math.round((spent / budget) * 100)}%`;
            const remaining = budget - spent;
            document.getElementById('budgetRemainingLabel').textContent = remaining >= 0
                ? `Remaining: ${formatCurrency(remaining)}`
                : `Over by: ${formatCurrency(Math.abs(remaining))}`;
            document.getElementById('budgetRemainingLabel').style.color = remaining < 0 ? 'var(--red)' : '';
        } else {
            fill.style.width = '0%';
            document.getElementById('budgetPercentLabel').textContent = '—';
            document.getElementById('budgetRemainingLabel').textContent = 'Set a budget in Settings';
        }

        // Category budgets
        const catContainer = document.getElementById('categoryBudgets');
        const expensesByCategory = {};
        monthTx.filter(tx => tx.type === 'expense').forEach(tx => {
            expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
        });

        const catBudgets = state.settings.categoryBudgets || {};
        const categoriesWithBudget = EXPENSE_CATEGORIES.filter(c => catBudgets[c] && catBudgets[c] > 0);

        if (categoriesWithBudget.length === 0) {
            catContainer.innerHTML = '<div class="empty-state"><p>No category budgets set. Configure them in Settings.</p></div>';
            return;
        }

        catContainer.innerHTML = categoriesWithBudget.map(cat => {
            const catBudget = catBudgets[cat];
            const catSpent = expensesByCategory[cat] || 0;
            const remaining = catBudget - catSpent;
            const pct = Math.min((catSpent / catBudget) * 100, 100);
            let fillClass = 'cat-budget-bar-fill';
            if (catSpent > catBudget) fillClass += ' danger';
            else if (pct > 80) fillClass += ' warning';

            return `
                <div class="cat-budget-item">
                    <div class="cat-budget-header">
                        <span class="cat-budget-name">${CATEGORY_ICONS[cat] || ''} ${escapeHtml(cat)}</span>
                        <span class="cat-budget-values">${formatCurrency(catSpent)} / ${formatCurrency(catBudget)} ${remaining < 0 ? `<span style="color:var(--red);">(over by ${formatCurrency(Math.abs(remaining))})</span>` : ''}</span>
                    </div>
                    <div class="cat-budget-bar">
                        <div class="${fillClass}" style="width:${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openCategoryBudgetModal() {
        const container = document.getElementById('catBudgetModalInputs');
        if (!container) return;
        const catBudgets = state.settings.categoryBudgets || {};
        const cfg = CURRENCY_CONFIG[state.settings.currency] || CURRENCY_CONFIG.USD;

        container.innerHTML = EXPENSE_CATEGORIES.map(cat => {
            const icon = CATEGORY_ICONS[cat] || '📦';
            const val = catBudgets[cat] || '';
            return `
                <div class="cat-budget-input-row">
                    <div class="cat-budget-input-label">
                        <span>${icon}</span>
                        <span>${escapeHtml(cat)}</span>
                    </div>
                    <input type="number" min="0" step="any" inputmode="decimal" pattern="[0-9]*"
                           data-category-budget="${escapeHtml(cat)}"
                           placeholder="${cfg.symbol}0" value="${val}">
                </div>
            `;
        }).join('');

        openModal('categoryBudgetModal');
    }

    function saveCategoryBudgetsModal(e) {
        e.preventDefault();
        const inputs = document.querySelectorAll('#catBudgetModalInputs input[data-category-budget]');
        const newBudgets = {};
        inputs.forEach(input => {
            const cat = input.dataset.categoryBudget;
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) {
                newBudgets[cat] = val;
            }
        });
        state.settings.categoryBudgets = newBudgets;
        saveSettings();
        closeModal('categoryBudgetModal');
        showToast('Category budgets updated.', 'success');
        refreshCurrentPage();
    }

    // ───────── Settings ─────────

    function renderSettings() {
        // Currency
        document.getElementById('currencySelect').value = state.settings.currency;

        // Monthly budget
        document.getElementById('settingsBudgetInput').value = state.settings.monthlyBudget || '';

        // Category budgets
        const container = document.getElementById('settingsCategoryBudgets');
        container.innerHTML = EXPENSE_CATEGORIES.map(cat => {
            const val = state.settings.categoryBudgets[cat] || '';
            return `
                <div class="settings-cat-row">
                    <span class="settings-cat-label">${CATEGORY_ICONS[cat] || ''} ${escapeHtml(cat)}</span>
                    <input type="number" class="settings-cat-input" data-category="${escapeHtml(cat)}" value="${val}" min="0" step="any" placeholder="0" aria-label="Budget for ${cat}">
                </div>
            `;
        }).join('');

        // Attach category budget save on blur
        container.querySelectorAll('.settings-cat-input').forEach(input => {
            input.addEventListener('change', () => {
                const cat = input.dataset.category;
                const val = parseFloat(input.value);
                if (!isNaN(val) && val >= 0) {
                    state.settings.categoryBudgets[cat] = val;
                } else {
                    delete state.settings.categoryBudgets[cat];
                    input.value = '';
                }
                saveSettings();
                showToast(`Budget for ${cat} updated.`, 'success');
            });
        });
    }

    // ───────── Export / Import ─────────

    function exportCsv() {
        if (state.transactions.length === 0) {
            showToast('No transactions to export.', 'warning');
            return;
        }
        const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Note'];
        const rows = state.transactions.map(tx => [
            tx.date,
            tx.type,
            `"${tx.description.replace(/"/g, '""')}"`,
            `"${tx.category.replace(/"/g, '""')}"`,
            tx.amount.toString(),
            `"${(tx.note || '').replace(/"/g, '""')}"`,
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        downloadFile(csv, `spending-tracker-${todayStr()}.csv`, 'text/csv');
        showToast('CSV exported.', 'success');
    }

    function exportJson() {
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: state.settings,
            transactions: state.transactions,
        };
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `spending-tracker-backup-${todayStr()}.json`, 'application/json');
        showToast('JSON backup exported.', 'success');
    }

    async function copyJsonBackup() {
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: state.settings,
            transactions: state.transactions,
        };
        const json = JSON.stringify(data, null, 2);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(json);
            } else {
                const ta = document.createElement('textarea');
                ta.value = json;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            triggerHaptic(12);
            showToast('JSON backup copied to clipboard!', 'success');
        } catch (e) {
            showToast('Could not copy to clipboard: ' + e.message, 'error');
        }
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importJson(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || !Array.isArray(data.transactions)) {
                    showToast('Invalid backup file: missing transactions array.', 'error');
                    return;
                }

                // Validate transactions
                const valid = data.transactions.filter(tx =>
                    tx && typeof tx === 'object' &&
                    typeof tx.description === 'string' &&
                    typeof tx.amount === 'number' && tx.amount > 0 &&
                    typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) &&
                    (tx.type === 'income' || tx.type === 'expense')
                );

                if (valid.length === 0) {
                    showToast('No valid transactions found in the file.', 'error');
                    return;
                }

                // Show preview
                const preview = document.getElementById('importPreview');
                preview.style.display = 'block';
                preview.innerHTML = `
                    <p><strong>${valid.length}</strong> valid transactions found${valid.length < data.transactions.length ? ` (${data.transactions.length - valid.length} invalid records skipped)` : ''}.</p>
                    <p>This will <strong>replace</strong> your current ${state.transactions.length} transactions.</p>
                    ${data.settings ? '<p>Settings will also be restored.</p>' : ''}
                    <div class="import-actions">
                        <button class="btn btn-primary btn-sm" id="confirmImport">Import</button>
                        <button class="btn btn-ghost btn-sm" id="cancelImport">Cancel</button>
                    </div>
                `;

                document.getElementById('confirmImport').addEventListener('click', () => {
                    // Ensure IDs exist
                    state.transactions = valid.map(tx => ({
                        id: tx.id || uid(),
                        type: tx.type,
                        description: tx.description,
                        amount: tx.amount,
                        date: tx.date,
                        category: tx.category || (tx.type === 'income' ? 'Other Income' : 'Other Expenses'),
                        note: tx.note || '',
                        isSample: tx.isSample || false,
                    }));

                    // Restore settings if present
                    if (data.settings && typeof data.settings === 'object') {
                        if (CURRENCY_CONFIG[data.settings.currency]) state.settings.currency = data.settings.currency;
                        if (typeof data.settings.monthlyBudget === 'number') state.settings.monthlyBudget = data.settings.monthlyBudget;
                        if (data.settings.categoryBudgets) state.settings.categoryBudgets = data.settings.categoryBudgets;
                        saveSettings();
                    }

                    saveTransactions();
                    preview.style.display = 'none';
                    showToast(`Imported ${state.transactions.length} transactions.`, 'success');
                    refreshCurrentPage();
                });

                document.getElementById('cancelImport').addEventListener('click', () => {
                    preview.style.display = 'none';
                });
            } catch (err) {
                showToast('Could not parse the file. Make sure it\'s a valid JSON backup.', 'error');
            }
        };
        reader.readAsText(file);
    }

    // ───────── Sample Data ─────────

    function loadSampleData() {
        if (state.transactions.some(tx => tx.isSample)) {
            showToast('Sample data is already loaded.', 'warning');
            return;
        }

        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth(); // 0-indexed

        function d(day) {
            return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        // Previous month
        let py = y, pm = m - 1;
        if (pm < 0) { pm = 11; py--; }
        function pd(day) {
            return `${py}-${String(pm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        const samples = [
            // Current month
            { type: 'income', description: 'Monthly Salary', amount: 3500, date: d(1), category: 'Salary' },
            { type: 'income', description: 'Freelance Web Project', amount: 800, date: d(5), category: 'Freelance Income' },
            { type: 'expense', description: 'Korzinka Supermarket', amount: 145.50, date: d(2), category: 'Food & Groceries' },
            { type: 'expense', description: 'Monthly Rent', amount: 950, date: d(1), category: 'Housing' },
            { type: 'expense', description: 'Uber Rides', amount: 32, date: d(3), category: 'Transportation' },
            { type: 'expense', description: 'Coffee at Starbucks', amount: 8.50, date: d(4), category: 'Restaurants & Cafes' },
            { type: 'expense', description: 'Netflix Subscription', amount: 15.99, date: d(5), category: 'Subscriptions' },
            { type: 'expense', description: 'Udemy Course — Data Science', amount: 12.99, date: d(6), category: 'Education' },
            { type: 'expense', description: 'Gym Membership', amount: 40, date: d(1), category: 'Health' },
            { type: 'expense', description: 'New Running Shoes', amount: 89, date: d(8), category: 'Shopping' },
            { type: 'expense', description: 'Electricity Bill', amount: 65, date: d(10), category: 'Utilities' },
            { type: 'expense', description: 'Dinner with friends', amount: 42, date: d(12), category: 'Restaurants & Cafes' },
            { type: 'expense', description: 'Haircut', amount: 18, date: d(14), category: 'Personal Care' },
            { type: 'expense', description: 'Movie Tickets', amount: 24, date: d(15), category: 'Entertainment' },
            { type: 'expense', description: 'Groceries', amount: 88, date: d(16), category: 'Food & Groceries' },
            { type: 'expense', description: 'Internet Bill', amount: 35, date: d(7), category: 'Utilities' },
            { type: 'income', description: 'Scholarship Stipend', amount: 500, date: d(15), category: 'Scholarships' },

            // Previous month
            { type: 'income', description: 'Monthly Salary', amount: 3500, date: pd(1), category: 'Salary' },
            { type: 'income', description: 'Freelance Logo Design', amount: 400, date: pd(10), category: 'Freelance Income' },
            { type: 'expense', description: 'Monthly Rent', amount: 950, date: pd(1), category: 'Housing' },
            { type: 'expense', description: 'Groceries', amount: 120, date: pd(3), category: 'Food & Groceries' },
            { type: 'expense', description: 'Metro Card', amount: 25, date: pd(2), category: 'Transportation' },
            { type: 'expense', description: 'Restaurant', amount: 35, date: pd(5), category: 'Restaurants & Cafes' },
            { type: 'expense', description: 'Spotify', amount: 9.99, date: pd(1), category: 'Subscriptions' },
            { type: 'expense', description: 'Textbooks', amount: 55, date: pd(8), category: 'Education' },
            { type: 'expense', description: 'Electricity', amount: 60, date: pd(10), category: 'Utilities' },
            { type: 'expense', description: 'Pharmacy', amount: 22, date: pd(12), category: 'Health' },
        ];

        const sampleTx = samples.map(s => ({
            id: uid(),
            ...s,
            note: '',
            isSample: true,
        }));

        state.transactions.push(...sampleTx);
        saveTransactions();
        showToast(`Loaded ${sampleTx.length} sample transactions.`, 'success');
        refreshCurrentPage();
    }

    function clearSampleData() {
        const sampleCount = state.transactions.filter(tx => tx.isSample).length;
        if (sampleCount === 0) {
            showToast('No sample data to remove.', 'info');
            return;
        }
        state.transactions = state.transactions.filter(tx => !tx.isSample);
        saveTransactions();
        showToast(`Removed ${sampleCount} sample transactions.`, 'success');
        refreshCurrentPage();
    }

    // ───────── Chart Colors ─────────

    function generateColors(count) {
        const palette = [
            '#6c8cff', '#34d399', '#f87171', '#fbbf24', '#a78bfa',
            '#fb923c', '#22d3ee', '#f472b6', '#4ade80', '#facc15',
            '#818cf8', '#38bdf8', '#c084fc', '#fb7185', '#2dd4bf',
        ];
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(palette[i % palette.length]);
        }
        return colors;
    }

    // ───────── Category Suggestion on Description Change ─────────

    function handleDescriptionInput() {
        const desc = document.getElementById('txDescription').value;
        const type = document.getElementById('txType').value;
        const suggested = suggestCategory(desc, type);
        const suggEl = document.getElementById('categorySuggestion');

        if (suggested) {
            const currentCat = document.getElementById('txCategory').value;
            // Only suggest if not already selected
            if (currentCat !== suggested) {
                suggEl.textContent = `Suggestion: ${suggested} — click to apply`;
                suggEl.style.display = 'block';
                suggEl.onclick = () => {
                    document.getElementById('txCategory').value = suggested;
                    suggEl.style.display = 'none';
                };
            } else {
                suggEl.style.display = 'none';
            }
        } else {
            suggEl.style.display = 'none';
        }
    }

    // ───────── Virtual Keyboard Detection ─────────

    function initKeyboardDetection() {
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(el => {
            el.addEventListener('focus', () => document.body.classList.add('keyboard-open'));
            el.addEventListener('blur', () => {
                setTimeout(() => {
                    const active = document.activeElement;
                    if (!active || !['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
                        document.body.classList.remove('keyboard-open');
                    }
                }, 100);
            });
        });

        if (window.visualViewport) {
            let initialHeight = window.visualViewport.height;
            window.visualViewport.addEventListener('resize', () => {
                if (window.visualViewport.height < initialHeight * 0.75) {
                    document.body.classList.add('keyboard-open');
                } else {
                    document.body.classList.remove('keyboard-open');
                }
            });
        }
    }

    // ───────── Initialize ─────────

    function init() {
        loadData();
        applyTheme(state.settings.theme || 'system', false);
        updateMonthLabel();
        populateFilterCategories();
        initKeyboardDetection();

        // System theme change listener (auto sync)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (state.settings.theme === 'system') {
                applyTheme('system', false);
            }
        });

        // Theme segmented buttons in Settings
        document.querySelectorAll('.theme-seg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                applyTheme(btn.dataset.themeVal, true);
                showToast(`Theme set to ${btn.dataset.themeVal}.`, 'info');
            });
        });

        // Quick theme toggle in Mobile Header
        const quickThemeBtn = document.getElementById('quickThemeBtn');
        if (quickThemeBtn) {
            quickThemeBtn.addEventListener('click', () => {
                triggerHaptic(10);
                const current = document.documentElement.getAttribute('data-theme') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                applyTheme(next, true);
                showToast(`Switched to ${next} mode.`, 'info');
            });
        }

        // Navigation (Sidebar + Telegram Bottom Dock)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.page);
            });
        });

        document.querySelectorAll('.tg-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.page);
            });
        });

        const tgAdd = document.getElementById('tgAddBtn');
        if (tgAdd) {
            tgAdd.addEventListener('click', () => {
                triggerHaptic(15);
                openAddTransaction();
            });
        }

        // Month navigation
        document.getElementById('prevMonth').addEventListener('click', prevMonth);
        document.getElementById('nextMonth').addEventListener('click', nextMonth);

        // Mobile sidebar (safe checks)
        const mmBtn = document.getElementById('mobileMenuBtn');
        if (mmBtn) mmBtn.addEventListener('click', openSidebar);
        const scBtn = document.getElementById('sidebarCloseBtn');
        if (scBtn) scBtn.addEventListener('click', closeSidebar);
        const soEl = document.getElementById('sidebarOverlay');
        if (soEl) soEl.addEventListener('click', closeSidebar);

        // Add transaction buttons (safe checks if on desktop)
        const addBtn = document.getElementById('addTransactionBtn');
        if (addBtn) addBtn.addEventListener('click', openAddTransaction);
        const mobAddBtn = document.getElementById('mobileAddBtn');
        if (mobAddBtn) mobAddBtn.addEventListener('click', openAddTransaction);

        // Transaction form
        document.getElementById('transactionForm').addEventListener('submit', submitTransaction);
        document.getElementById('modalClose').addEventListener('click', () => closeModal('transactionModal'));
        document.getElementById('modalCancel').addEventListener('click', () => closeModal('transactionModal'));

        // Type toggle
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                updateTypeToggle(type);
                populateCategories(type);
                handleDescriptionInput(); // Re-check suggestion for new type
            });
        });

        // Description input for category suggestion
        document.getElementById('txDescription').addEventListener('input', handleDescriptionInput);

        // Category select change to sync quick chips
        const txCatSel = document.getElementById('txCategory');
        if (txCatSel) {
            txCatSel.addEventListener('change', (e) => {
                const currentVal = e.target.value;
                document.querySelectorAll('.quick-cat-chip').forEach(c => {
                    c.classList.toggle('active', c.dataset.cat === currentVal);
                });
            });
        }

        // Quick amount increment buttons
        document.querySelectorAll('#quickAmountRow .quick-amt-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                triggerHaptic(10);
                const amtToAdd = parseFloat(chip.dataset.amt) || 0;
                const amtInput = document.getElementById('txAmount');
                if (amtInput) {
                    const current = parseFloat(amtInput.value) || 0;
                    const next = Math.round((current + amtToAdd) * 100) / 100;
                    amtInput.value = next;
                    document.getElementById('amountError').textContent = '';
                    amtInput.classList.remove('error');
                }
            });
        });

        // Modal overlay click to close
        document.getElementById('transactionModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal('transactionModal');
        });
        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal('confirmModal');
        });
        document.getElementById('budgetModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal('budgetModal');
        });
        const catBudgetModal = document.getElementById('categoryBudgetModal');
        if (catBudgetModal) {
            catBudgetModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) closeModal('categoryBudgetModal');
            });
        }

        // Keyboard escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal('transactionModal');
                closeModal('confirmModal');
                closeModal('budgetModal');
                closeModal('categoryBudgetModal');
            }
        });

        // Transactions filters & Search Clear
        const searchInput = document.getElementById('searchInput');
        const searchClearBtn = document.getElementById('searchClearBtn');
        if (searchInput && searchClearBtn) {
            searchInput.addEventListener('input', () => {
                searchClearBtn.style.display = searchInput.value ? 'inline-flex' : 'none';
                state.txPage = 1;
                renderTransactions();
            });
            searchClearBtn.addEventListener('click', () => {
                triggerHaptic(8);
                searchInput.value = '';
                searchClearBtn.style.display = 'none';
                state.txPage = 1;
                renderTransactions();
                searchInput.focus();
            });
        }
        document.getElementById('filterType').addEventListener('change', () => { state.txPage = 1; renderTransactions(); });
        document.getElementById('filterCategory').addEventListener('change', () => { state.txPage = 1; renderTransactions(); });
        document.getElementById('sortBy').addEventListener('change', () => { state.txPage = 1; renderTransactions(); });

        // Welcome Card CTA
        const welcomeAddBtn = document.getElementById('welcomeAddBtn');
        if (welcomeAddBtn) welcomeAddBtn.addEventListener('click', openAddTransaction);
        const welcomeSampleBtn = document.getElementById('welcomeSampleBtn');
        if (welcomeSampleBtn) welcomeSampleBtn.addEventListener('click', loadSampleData);

        // View all transactions from dashboard
        document.getElementById('viewAllTransactions').addEventListener('click', () => navigateTo('transactions'));

        // Budget page - edit overall budget
        document.getElementById('editOverallBudget').addEventListener('click', () => {
            document.getElementById('budgetInput').value = state.settings.monthlyBudget || '';
            openModal('budgetModal');
        });
        document.getElementById('budgetModalClose').addEventListener('click', () => closeModal('budgetModal'));
        document.getElementById('budgetCancel').addEventListener('click', () => closeModal('budgetModal'));
        document.getElementById('budgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const val = parseFloat(document.getElementById('budgetInput').value);
            state.settings.monthlyBudget = (!isNaN(val) && val >= 0) ? val : 0;
            saveSettings();
            closeModal('budgetModal');
            showToast('Monthly budget updated.', 'success');
            refreshCurrentPage();
        });

        // Category Budgets Edit Modal
        const editCatBudgetsBtn = document.getElementById('editCategoryBudgetsBtn');
        if (editCatBudgetsBtn) editCatBudgetsBtn.addEventListener('click', openCategoryBudgetModal);
        const catBudgetClose = document.getElementById('catBudgetModalClose');
        if (catBudgetClose) catBudgetClose.addEventListener('click', () => closeModal('categoryBudgetModal'));
        const catBudgetCancel = document.getElementById('catBudgetCancel');
        if (catBudgetCancel) catBudgetCancel.addEventListener('click', () => closeModal('categoryBudgetModal'));
        const catBudgetForm = document.getElementById('categoryBudgetForm');
        if (catBudgetForm) catBudgetForm.addEventListener('submit', saveCategoryBudgetsModal);

        // Analytics Segmented View Control
        document.querySelectorAll('.analytics-seg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                triggerHaptic(8);
                document.querySelectorAll('.analytics-seg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyAnalyticsView(btn.dataset.view);
            });
        });

        // Settings - Haptics Toggle
        const hapticsBtns = document.querySelectorAll('#hapticsSegmented .theme-seg-btn');
        const isHapticsOn = state.settings.hapticsEnabled !== false;
        hapticsBtns.forEach(btn => {
            btn.classList.toggle('active', (btn.dataset.hapticsVal === 'true') === isHapticsOn);
            btn.addEventListener('click', () => {
                const enabled = btn.dataset.hapticsVal === 'true';
                state.settings.hapticsEnabled = enabled;
                saveSettings();
                hapticsBtns.forEach(b => b.classList.toggle('active', (b.dataset.hapticsVal === 'true') === enabled));
                if (enabled) triggerHaptic(15);
                showToast(`Haptics ${enabled ? 'enabled' : 'disabled'}.`, 'info');
            });
        });

        // Settings - Currency & Budgets
        document.getElementById('currencySelect').addEventListener('change', (e) => {
            state.settings.currency = e.target.value;
            saveSettings();
            document.getElementById('sidebarCurrency').textContent = state.settings.currency;
            updateTxAmountSymbol();
            showToast(`Currency changed to ${state.settings.currency}. Display format updated.`, 'success');
            refreshCurrentPage();
        });

        document.getElementById('saveBudgetBtn').addEventListener('click', () => {
            const val = parseFloat(document.getElementById('settingsBudgetInput').value);
            state.settings.monthlyBudget = (!isNaN(val) && val >= 0) ? val : 0;
            saveSettings();
            showToast('Monthly budget saved.', 'success');
            refreshCurrentPage();
        });

        document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);
        document.getElementById('clearSampleBtn').addEventListener('click', clearSampleData);
        document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
        document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
        const copyJsonBtn = document.getElementById('copyJsonBtn');
        if (copyJsonBtn) copyJsonBtn.addEventListener('click', copyJsonBackup);

        // Import
        document.getElementById('importJsonBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importJson(e.target.files[0]);
                e.target.value = ''; // Reset so same file can be re-selected
            }
        });

        // Clear all data
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            document.getElementById('confirmTitle').textContent = 'Clear All Data';
            document.getElementById('confirmMessage').textContent = 'This will permanently delete all transactions and reset settings. This cannot be undone.';
            openModal('confirmModal');

            const okBtn = document.getElementById('confirmOk');
            const cancelBtn = document.getElementById('confirmCancel');
            const newOk = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOk, okBtn);
            const newCancel = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

            newOk.textContent = 'Clear Everything';
            newOk.addEventListener('click', () => {
                state.transactions = [];
                state.settings = { currency: 'USD', monthlyBudget: 0, categoryBudgets: {} };
                saveTransactions();
                saveSettings();
                closeModal('confirmModal');
                showToast('All data cleared.', 'success');
                renderSettings();
                refreshCurrentPage();
            });
            newCancel.addEventListener('click', () => closeModal('confirmModal'));
        });

        // First time experience: check if empty
        if (state.transactions.length === 0) {
            // Show welcome state — dashboard will handle empty state naturally
        }

        // Initialize Capacitor native bridge
        CapStorage.init().catch(e => console.warn('CapStorage init error:', e));
        registerBackButton();

        // Hide Capacitor splash screen after init
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
            setTimeout(() => {
                window.Capacitor.Plugins.SplashScreen.hide();
            }, 300);
        }

        // Initial render
        updateTxAmountSymbol();
        renderDashboard();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
