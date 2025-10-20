// app.js
class CashReconciliationApp {
  constructor() {
    this.WEBHOOK_URL = CONFIG.GOOGLE_SCRIPT_URL;
    this.RETRY_ATTEMPTS = CONFIG.RETRY_ATTEMPTS || 3;
    this.RETRY_DELAY = CONFIG.RETRY_DELAY || 2000;

    this.currentRoute = '';
    this.CATALOG = {};
    this.SKU_INDEX = {};
    this.isOnline = navigator.onLine;
    this.pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');

    window.addEventListener('online',  () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));
  }

  handleOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    this.updateSyncStatus(isOnline ? 'connected' : 'disconnected');
    if (isOnline) {
      this.showStatus('Back online - syncing data', 'info');
      this.syncPendingChanges();
      this.startHeartbeat();
    } else {
      this.showStatus('Working offline - data will sync when connection restored', 'warning');
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.callAppsScript('heartbeat', {
        userId: CONFIG.USER_ID,
        route: this.currentRoute,
        module: 'cash',
        userName: 'Web Client'
      }).catch(() => {});
    }, CONFIG.HEARTBEAT_INTERVAL || 15000);
  }

  async callAppsScript(action, payload = {}) {
    try {
      const res = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch {
        console.error('Non-JSON response from proxy/GAS:', text.slice(0, 400));
        throw new Error('Server returned non-JSON (check GAS deployment URL & access).');
      }
      if (!res.ok) throw new Error(data?.data || data?.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      console.error('API call failed:', err);
      throw err;
    }
  }

  async init() {
    try {
      const today = new Date();
      document.getElementById('salesDate').value = today.toISOString().split('T')[0];

      document.getElementById('toggleSoldOnly')
        .addEventListener('change', () => this.applySoldOnlyFilter());

      await this.loadCatalog();
      this.renderSalesTableFromCatalog();
      this.loadFromStorage();
      this.recomputeSalesGrandTotal();

      await this.checkConnection();
      this.startHeartbeat();
    } catch (error) {
      console.error('Init error:', error);
      this.showStatus('Starting in offline mode', 'warning');
    }
  }

  async checkConnection() {
    try {
      const data = await this.callAppsScript('ping');
      if (data.success || data.status === 'success') this.updateSyncStatus('connected');
      else throw new Error('Connection failed');
    } catch {
      this.updateSyncStatus('disconnected');
    }
  }

  selectRoute(route) {
    this.currentRoute = route;

    // Support for old route button UI (if it exists)
    const selectedRouteEl = document.getElementById('selectedRoute');
    if (selectedRouteEl) {
      selectedRouteEl.textContent = route;
    }

    // Support for new dropdown UI
    const routeNameEl = document.getElementById('routeName');
    if (routeNameEl) {
      routeNameEl.value = route;
    }

    // Old route buttons (if they exist)
    document.querySelectorAll('.route-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent.trim() === route || (btn.textContent.trim() === 'Wholesale' && route === 'Al-Hasa Wholesale')) {
        btn.classList.add('active');
      }
    });

    this.updateProgress();
    this.saveToStorage();
  }

  async loadCatalog() {
    this.setCatalogStatus('loading');
    try {
      const json = await this.callAppsScript('init');
      if (!json || !json.success) throw new Error('Failed to load catalog');
      const cat = json?.data?.catalog;
      if (!cat || typeof cat !== 'object') throw new Error('Invalid catalog format');

      this.CATALOG = {};
      Object.entries(cat).forEach(([key, items]) => {
        const title = key.split('_').map(w => w[0].toUpperCase()+w.slice(1)).join(' ');
        this.CATALOG[title] = items;
      });
      this.buildSkuIndex(this.CATALOG);
      this.setCatalogStatus('ready');
    } catch (e) {
      console.error('Catalog load failed:', e);
      this.setCatalogStatus('error');
      this.CATALOG = {
        'Sunflower Seeds': [
          {code: '4402', name: '200g', unit: 'bag', price: 58},
          {code: '4401', name: '100g', unit: 'bag', price: 34},
          {code: '1129', name: '25g', unit: 'bag', price: 16},
          {code: '1116', name: '800g', unit: 'bag', price: 17},
          {code: '1145', name: '130g', unit: 'box', price: 54},
          {code: '1126', name: '10KG', unit: 'sack', price: 160}
        ],
        'Pumpkin Seeds': [
          {code: '8001', name: '15g', unit: 'box', price: 16},
          {code: '8002', name: '110g', unit: 'box', price: 54},
          {code: '1142', name: '10KG', unit: 'sack', price: 230}
        ],
        'Melon Seeds': [
          {code: '9001', name: '15g', unit: 'box', price: 16},
          {code: '9002', name: '110g', unit: 'box', price: 54}
        ],
        'Popcorn': [
          {code: '1701', name: 'Cheese', unit: 'bag', price: 5},
          {code: '1702', name: 'Butter', unit: 'bag', price: 5},
          {code: '1703', name: 'Lightly Salted', unit: 'bag', price: 5}
        ]
      };
      this.buildSkuIndex(this.CATALOG);
    }
  }

  buildSkuIndex(cat) {
    this.SKU_INDEX = {};
    Object.entries(cat).forEach(([category, items]) => {
      (items || []).forEach(item => {
        this.SKU_INDEX[item.code] = {
          category,
          code: item.code,
          name: item.name || '',
          unit: item.unit || '',
          price: Number(item.price || 0)
        };
      });
    });
  }

  setCatalogStatus(state) {
    const el = document.getElementById('catalogStatus');
    if (!el) return;
    if (state === 'loading') el.textContent = 'Catalog: loading…';
    else if (state === 'ready') el.textContent = 'Catalog: ready';
    else el.textContent = 'Catalog: using default';
  }

  renderSalesTableFromCatalog() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    const categories = Object.keys(this.CATALOG);
    categories.forEach(category => {
      (this.CATALOG[category] || []).forEach(item => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-code', item.code);
        tr.classList.add('nosale');
        tr.innerHTML = `
          <td>${category}</td>
          <td>${item.code}</td>
          <td>${item.name || ''}</td>
          <td>${item.unit || ''}</td>
          <td>${Number(item.price || 0).toFixed(2)}</td>
          <td>
            <input type="number" class="qty-input" id="qty_${item.code}"
                   placeholder="0" min="0"
                   onchange="app.handleQtyChange('${item.code}', ${Number(item.price || 0)})">
          </td>
          <td id="total_${item.code}">0.00</td>
          <td id="status_${item.code}">
            <span class="status-badge status-nosale">No Sale</span>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
    Object.values(this.SKU_INDEX).forEach(meta => this.updateRowStatus(meta.code, 0));
  }

  handleQtyChange(code, price) {
    const qty = this.toNum(document.getElementById(`qty_${code}`).value);
    document.getElementById(`total_${code}`).textContent = (qty * price).toFixed(2);
    this.updateRowStatus(code, qty);
    this.recomputeSalesGrandTotal();
    this.applySoldOnlyFilter();
    this.saveToStorage();
  }

  updateRowStatus(code, qty) {
    const tr = document.querySelector(`tr[data-code="${code}"]`);
    const cell = document.getElementById(`status_${code}`);
    if (!tr || !cell) return;
    if (qty > 0) {
      tr.classList.add('sold');
      tr.classList.remove('nosale');
      cell.innerHTML = `<span class="status-badge status-sold">Sold</span>`;
    } else {
      tr.classList.add('nosale');
      tr.classList.remove('sold');
      cell.innerHTML = `<span class="status-badge status-nosale">No Sale</span>`;
    }
  }

  applySoldOnlyFilter() {
    const soldOnly = document.getElementById('toggleSoldOnly').checked;
    document.querySelectorAll('#salesTableBody tr').forEach(tr => {
      const code = tr.getAttribute('data-code');
      const qty = this.toNum(document.getElementById(`qty_${code}`).value);
      tr.style.display = (soldOnly && qty === 0) ? 'none' : '';
    });
  }

  recomputeSalesGrandTotal() {
    let grand = 0, sold = 0;
    Object.values(this.SKU_INDEX).forEach(meta => {
      const qtyEl = document.getElementById(`qty_${meta.code}`);
      if (!qtyEl) return;
      const qty = this.toNum(qtyEl.value);
      const total = qty * Number(meta.price || 0);
      if (qty > 0) sold++;
      grand += total;
    });
    this.setText('totalSalesDisplay', `SAR ${grand.toFixed(2)}`);
    this.setValue('totalSalesValue', grand.toFixed(2));
    this.setText('summaryTotalSales', `SAR ${grand.toFixed(2)}`);
    this.setText('soldCount', sold);
    this.calculateCashBalance();
  }

  async fetchInventoryData() {
    if (!this.currentRoute) return this.showStatus('Please select a route first!', 'error');
    const salesDate = this.getValue('salesDate');
    if (!salesDate) return this.showStatus('Please select a date!', 'error');

    const cur = new Date(salesDate);
    const prev = new Date(cur);
    prev.setDate(prev.getDate() - 1);
    const prevStr = prev.toISOString().split('T')[0];

    this.showStatus('Fetching inventory data…', 'info');
    this.showLoading(true);
    const fetchBtn = document.getElementById('fetchBtn');
    if (fetchBtn) fetchBtn.disabled = true;

    try {
      const json = await this.callAppsScript('calculateSalesFromInventory', {
        route: this.currentRoute,
        currentDate: salesDate,
        previousDate: prevStr
      });
      if (json.status === 'success' && Array.isArray(json.data)) {
        this.populateSalesDataFromCalc(json.data);

        // Show which date was actually used for calculation
        const message = json.metadata?.message
          ? `Sales calculated! ${json.metadata.message}`
          : 'Sales data calculated from inventory!';

        this.showStatus(message, 'success');
      } else {
        this.showStatus('No inventory data found for calculation', 'error');
      }
    } catch (e) {
      console.error(e);
      this.showStatus('Unable to fetch inventory data. Please enter manually.', 'error');
    } finally {
      this.showLoading(false);
      if (fetchBtn) fetchBtn.disabled = false;
    }
  }

  populateSalesDataFromCalc(rows) {
    Object.values(this.SKU_INDEX).forEach(meta => {
      const input = document.getElementById(`qty_${meta.code}`);
      if (input) input.value = '';
      this.setText(`total_${meta.code}`, '0.00');
      this.updateRowStatus(meta.code, 0);
    });
    rows.forEach(r => {
      const code = r.code;
      const qty  = this.toNum(r.salesQty);
      const meta = this.SKU_INDEX[code];
      if (!meta) return;
      const input = document.getElementById(`qty_${code}`);
      if (input) {
        input.value = qty;
        this.setText(`total_${code}`, (qty * Number(meta.price || 0)).toFixed(2));
        this.updateRowStatus(code, qty);
      }
    });
    this.recomputeSalesGrandTotal();
    this.applySoldOnlyFilter();
  }
  handleDiscountChange() {
  const base = this.toNum(this.getValue('discountBase'));
  const withVAT = base * 1.15;
  this.setValue('discountWithVAT', withVAT.toFixed(2));
  this.calculateCashBalance();
  this.saveToStorage();
}


  calculateCashBalance() {
  const totalSales       = this.toNum(this.getValue('totalSalesValue'));
  const discountWithVAT  = this.toNum(this.getValue('discountWithVAT'));  // NEW

  const creditSales      = this.toNum(this.getValue('creditSales'));
  const creditRepayment  = this.toNum(this.getValue('creditRepayment'));
  const bankPOS          = this.toNum(this.getValue('bankPOS'));
  const bankTransfer     = this.toNum(this.getValue('bankTransfer'));
  const cheque           = this.toNum(this.getValue('cheque'));

  // Deduct the discount incl. 15%
  const expected = totalSales
                 - discountWithVAT
                 - creditSales
                 + creditRepayment
                 - bankPOS
                 - bankTransfer
                 - cheque;

  this.setValue('expectedCashBalance', expected.toFixed(2));

  this.setText('summaryCreditSales', `SAR ${creditSales.toFixed(2)}`);
  const bankDeposits = bankPOS + bankTransfer + cheque;
  this.setText('summaryBankDeposits', `SAR ${bankDeposits.toFixed(2)}`);

  this.calculateDifference();
  this.saveToStorage();
}


  calculateCashNotes() {
  const denoms = [500, 100, 50, 20, 10, 5];
  let total = 0;
  denoms.forEach(d => {
    const count = this.toNum(this.getValue(`note${d}`));
    const val = count * d;
    this.setText(`val${d}`, val.toFixed(2));
    total += val;
  });
  this.setValue('cashNotes', total.toFixed(2));
  this.calculateActualCash();
  this.saveToStorage();
}


  calculateCoins() {
  const c2   = this.toNum(this.getValue('coin2'));
  const c1   = this.toNum(this.getValue('coin1'));
  const c050 = this.toNum(this.getValue('coin050'));
  const c025 = this.toNum(this.getValue('coin025'));

  const v2   = c2 * 2;
  const v1   = c1 * 1;
  const v050 = c050 * 0.5;
  const v025 = c025 * 0.25;

  this.setText('valC2',   v2.toFixed(2));
  this.setText('valC1',   v1.toFixed(2));
  this.setText('valC050', v050.toFixed(2));
  this.setText('valC025', v025.toFixed(2));

  const coinsTotal = v2 + v1 + v050 + v025;
  this.setValue('coinsTotal', coinsTotal.toFixed(2));

  this.calculateActualCash();
  this.saveToStorage();
}


  calculateActualCash() {
  const notes = this.toNum(this.getValue('cashNotes'));
  const coins = this.toNum(this.getValue('coinsTotal'));
  const actual = notes + coins;
  this.setValue('actualCashTotal', actual.toFixed(2));
  this.setText('summaryCashCollected', `SAR ${actual.toFixed(2)}`);
  this.calculateDifference();
}

  calculateDifference() {
    const expected = this.toNum(this.getValue('expectedCashBalance'));
    const actual   = this.toNum(this.getValue('actualCashTotal'));
    const diff     = actual - expected;
    this.setText('cashDifference', `SAR ${diff.toFixed(2)}`);
    const ind = document.getElementById('differenceIndicator');
    const status = document.getElementById('differenceStatus');
    if (Math.abs(diff) < 0.01) {
      ind.className = 'difference-card balanced';
      status.textContent = 'Balanced';
    } else if (diff < 0) {
      ind.className = 'difference-card shortage';
      status.textContent = `Cash Short by SAR ${Math.abs(diff).toFixed(2)}`;
    } else {
      ind.className = 'difference-card excess';
      status.textContent = `Cash Over by SAR ${diff.toFixed(2)}`;
    }

    // Update sticky summary and progress
    this.updateStickySummary();
    this.updateProgress();
  }

  async saveData() {
    if (!this.currentRoute) return this.showStatus('Please select a route!', 'error');
    const date = this.getValue('salesDate');
    if (!date) return this.showStatus('Please select a date!', 'error');
    const btn = document.getElementById('saveBtn');
    if (btn) btn.disabled = true;
    this.showLoading(true);
    const payload = this.collectData();
    try {
      const json = await this.callAppsScript('saveCashReconciliation', payload);
      if (json.status === 'success' || json.success) {
        this.showStatus('Data saved successfully!', 'success');
        this.updateSyncStatus('connected');
      } else {
        throw new Error(json.data || json.error || 'Save failed');
      }
    } catch (e) {
      console.error('Save error:', e);
      this.pendingChanges.push(payload);
      localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
      this.showStatus('Saved locally. Will sync when connection is restored.', 'warning');
      this.updateSyncStatus('disconnected');
    } finally {
      if (btn) btn.disabled = false;
      this.showLoading(false);
    }
  }

  async syncPendingChanges() {
    if (!this.isOnline || this.pendingChanges.length === 0) return;
    const changes = [...this.pendingChanges];
    this.pendingChanges = [];
    localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
    for (const change of changes) {
      try {
        const result = await this.callAppsScript('saveCashReconciliation', change);
        if (result.status !== 'success' && !result.success) this.pendingChanges.push(change);
      } catch {
        this.pendingChanges.push(change);
      }
      localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
    }
    if (this.pendingChanges.length === 0) this.showStatus('All pending changes synced', 'success');
  }

  collectData() {
    const salesItems = [];
    Object.values(this.SKU_INDEX).forEach(meta => {
      const qtyEl = document.getElementById(`qty_${meta.code}`);
      if (!qtyEl) return;
      const qty = this.toNum(qtyEl.value);
      if (qty > 0) {
        salesItems.push({
          category: meta.category,
          code: meta.code,
          name: meta.name,
          unit: meta.unit,
          price: Number(meta.price || 0),
          quantity: qty,
          total: qty * Number(meta.price || 0)
        });
      }
    });
    return {
      route: this.currentRoute,
      date: this.getValue('salesDate'),
      salesItems,
      totalSales: this.toNum(this.getValue('totalSalesValue')),
      discountBase:    this.toNum(this.getValue('discountBase')),
discountWithVAT: this.toNum(this.getValue('discountWithVAT')),
      creditSales: this.toNum(this.getValue('creditSales')),
      creditRepayment: this.toNum(this.getValue('creditRepayment')),
      bankPOS: this.toNum(this.getValue('bankPOS')),
      bankTransfer: this.toNum(this.getValue('bankTransfer')),
      cheque: this.toNum(this.getValue('cheque')),
      expectedCash: this.toNum(this.getValue('expectedCashBalance')),
      cashNotes: {
      total: this.toNum(this.getValue('cashNotes')),
      denominations: {
        '500': this.toNum(this.getValue('note500')),
        '100': this.toNum(this.getValue('note100')),
        '50':  this.toNum(this.getValue('note50')),
        '20':  this.toNum(this.getValue('note20')),
        '10':  this.toNum(this.getValue('note10')),
        '5':   this.toNum(this.getValue('note5')),
        // include coin breakdown so GAS can write CASH_DENOMINATIONS
        '2':    this.toNum(this.getValue('coin2')),
        '1':    this.toNum(this.getValue('coin1')),
        '0.50': this.toNum(this.getValue('coin050')),
        '0.25': this.toNum(this.getValue('coin025')),
      }
    },
    coins: this.toNum(this.getValue('coinsTotal')),   // keep numeric coins too
    actualCash: this.toNum(this.getValue('actualCashTotal')),
    difference: this.toNum(this.getValue('actualCashTotal')) - this.toNum(this.getValue('expectedCashBalance')),
    timestamp: new Date().toISOString()
  };
}


  exportReport() {
    const data = this.collectData();
    const date = this.getValue('salesDate') || 'unknown';
    let csv = 'Daily Cash Reconciliation Report\n';
    csv += `Date,${date}\n`;
    csv += `Route,${this.currentRoute || 'Not Selected'}\n\n`;
    csv += 'SALES ITEMS\n';
    csv += 'Category,Code,Item,Unit,Price,Quantity,Total\n';
    data.salesItems.forEach(i => {
      csv += `${i.category},${i.code},${i.name},${i.unit},${i.price},${i.quantity},${i.total}\n`;
    });
    csv += '\nCASH RECONCILIATION\n';
    csv += `Total Sales,${data.totalSales}\n`;
    csv += `Discount (Base),${data.discountBase}\n`;
csv += `Discount (+15%),${data.discountWithVAT}\n`;
    csv += `Credit Sales,${data.creditSales}\n`;
    csv += `Credit Repayment,${data.creditRepayment}\n`;
    csv += `Bank POS,${data.bankPOS}\n`;
    csv += `Bank Transfer,${data.bankTransfer}\n`;
    csv += `Cheque,${data.cheque}\n`;
    csv += `Expected Cash,${data.expectedCash}\n`;
    csv += `Actual Cash,${data.actualCash}\n`;
    csv += `Difference,${data.difference}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `cash_reconciliation_${this.currentRoute}_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.showStatus('Report exported!', 'success');
  }

  clearData() {
    if (!confirm('Clear all data?')) return;
    Object.values(this.SKU_INDEX).forEach(meta => {
      this.setValue(`qty_${meta.code}`, '');
      this.setText(`total_${meta.code}`, '0.00');
      this.updateRowStatus(meta.code, 0);
    });
    ['creditSales','creditRepayment','bankPOS','bankTransfer','cheque','coinsTotal'].forEach(id => this.setValue(id, ''));
    [500,100,50,20,10,5].forEach(d => this.setValue(`note${d}`, ''));
    this.recomputeSalesGrandTotal();
    this.calculateCashNotes();
    this.showStatus('Data cleared!', 'success');
    localStorage.removeItem('cashReconciliationData');
  }

  saveToStorage() {
    const data = this.collectData();
    localStorage.setItem('cashReconciliationData', JSON.stringify(data));
  }

  loadFromStorage() {
    const saved = localStorage.getItem('cashReconciliationData');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.route) this.selectRoute(data.route);
      if (data.date)  this.setValue('salesDate', data.date);
      (data.salesItems || []).forEach(i => {
        if (this.SKU_INDEX[i.code]) {
          this.setValue(`qty_${i.code}`, i.quantity);
          this.setText(`total_${i.code}`, (i.quantity * Number(this.SKU_INDEX[i.code].price || 0)).toFixed(2));
          this.updateRowStatus(i.code, i.quantity);
        }
      });
      this.setValue('discountBase',    (data.discountBase ?? ''));
this.setValue('discountWithVAT', (data.discountWithVAT ?? (this.toNum(data.discountBase) * 1.15 || 0).toFixed(2)));
this.handleDiscountChange(); // ensures expected cash refreshes

      this.setValue('creditSales',     data.creditSales     || '');
      this.setValue('creditRepayment', data.creditRepayment || '');
      this.setValue('bankPOS',         data.bankPOS         || '');
      this.setValue('bankTransfer',    data.bankTransfer    || '');
      this.setValue('cheque',          data.cheque          || '');
      this.setValue('coinsTotal',      data.coins           || '');
      if (data.cashNotes && data.cashNotes.denominations) {
        Object.entries(data.cashNotes.denominations).forEach(([denom, count]) => {
          this.setValue(`note${denom}`, count || '');
        });
      }
      this.recomputeSalesGrandTotal();
      this.calculateCashNotes();
    } catch (e) {
      console.error('Load storage failed:', e);
    }
  }

  getValue(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  setValue(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
  setText(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }
  toNum(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

  showStatus(message, type) {
    const div = document.getElementById('statusMessage');
    div.className = `status-message status-${type} show`;
    div.textContent = message;
    setTimeout(() => { div.classList.remove('show'); }, 4000);
  }

  showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    if (show) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
  }

  updateSyncStatus(status) {
    const indicator = document.getElementById('syncIndicator');
    const text = document.getElementById('syncText');
    indicator.className = `sync-indicator ${status}`;
    if (status === 'connected') text.textContent = 'Connected';
    else if (status === 'disconnected') text.textContent = 'Offline';
    else if (status === 'syncing') text.textContent = 'Syncing...';
  }

  // ========== NEW FEATURES FOR REDESIGN ==========

  // Filter products by search query and sold-only toggle
  filterProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const soldOnly = document.getElementById('toggleSoldOnly').checked;

    document.querySelectorAll('#salesTableBody tr').forEach(tr => {
      const code = tr.getAttribute('data-code');
      const category = tr.cells[0]?.textContent.toLowerCase() || '';
      const name = tr.cells[2]?.textContent.toLowerCase() || '';
      const qty = this.toNum(document.getElementById(`qty_${code}`)?.value || 0);

      // Check if matches search term (code, category, or name)
      const matchesSearch = !searchTerm ||
                           code.toLowerCase().includes(searchTerm) ||
                           category.includes(searchTerm) ||
                           name.includes(searchTerm);

      // Check if matches sold filter
      const matchesSold = !soldOnly || qty > 0;

      // Show row only if it matches both filters
      tr.style.display = (matchesSearch && matchesSold) ? '' : 'none';
    });
  }

  // Toggle collapsible sections
  toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const icon = document.getElementById(sectionId + 'Icon');

    if (section.classList.contains('collapsed')) {
      section.classList.remove('collapsed');
      if (icon) icon.textContent = '▼';
    } else {
      section.classList.add('collapsed');
      if (icon) icon.textContent = '▶';
    }
  }

  // Quick add buttons for denominations
  quickAdd(denomId, count) {
    const input = document.getElementById(denomId);
    if (!input) return;

    const currentValue = this.toNum(input.value);
    const newValue = Math.max(0, currentValue + count); // Don't go below 0
    input.value = newValue;

    // Trigger the appropriate calculation
    if (denomId.startsWith('note')) {
      this.calculateCashNotes();
    } else if (denomId.startsWith('coin')) {
      this.calculateCoins();
    }
  }

  // Clear individual denomination
  clearDenom(denomId) {
    const input = document.getElementById(denomId);
    if (!input) return;

    input.value = 0;

    // Trigger the appropriate calculation
    if (denomId.startsWith('note')) {
      this.calculateCashNotes();
    } else if (denomId.startsWith('coin')) {
      this.calculateCoins();
    }
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+S = Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveData();
      }

      // Ctrl+F = Focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchBox = document.getElementById('productSearch');
        if (searchBox) {
          searchBox.focus();
          searchBox.select();
        }
      }

      // F2 = Fetch from inventory
      if (e.key === 'F2') {
        e.preventDefault();
        this.fetchInventoryData();
      }

      // Escape = Clear search (if search box is focused)
      if (e.key === 'Escape') {
        const searchBox = document.getElementById('productSearch');
        if (document.activeElement === searchBox) {
          searchBox.value = '';
          this.filterProducts();
        }
      }
    });
  }

  // Update progress tracker
  updateProgress() {
    const routeName = this.getValue('routeName') || this.getValue('selectedRoute');
    const salesDate = this.getValue('salesDate');
    const totalSales = this.toNum(this.getValue('totalSalesValue'));
    const actualCash = this.toNum(this.getValue('actualCashTotal'));
    const expected = this.toNum(this.getValue('expectedCashBalance'));
    const diff = Math.abs(actualCash - expected);

    const steps = document.querySelectorAll('.progress-step');

    // Step 1: Route selected
    if (routeName) {
      steps[0]?.classList.add('completed');
      steps[1]?.classList.add('active');
    } else {
      steps[0]?.classList.remove('completed');
      steps[1]?.classList.remove('active');
    }

    // Step 2: Sales entered
    if (totalSales > 0) {
      steps[1]?.classList.add('completed');
      steps[2]?.classList.add('active');
    } else {
      steps[1]?.classList.remove('completed');
      steps[2]?.classList.remove('active');
    }

    // Step 3: Cash counted
    if (actualCash > 0) {
      steps[2]?.classList.add('completed');
      steps[3]?.classList.add('active');
    } else {
      steps[2]?.classList.remove('completed');
      steps[3]?.classList.remove('active');
    }

    // Step 4: Balanced
    if (diff < 0.01 && actualCash > 0) {
      steps[3]?.classList.add('completed');
    } else {
      steps[3]?.classList.remove('completed');
    }
  }

  // Update sticky summary header
  updateStickySummary() {
    const totalSales = this.toNum(this.getValue('totalSalesValue'));
    const expected = this.toNum(this.getValue('expectedCashBalance'));
    const actual = this.toNum(this.getValue('actualCashTotal'));
    const diff = actual - expected;

    this.setText('stickyTotalSales', `SAR ${totalSales.toFixed(2)}`);
    this.setText('stickyExpectedCash', `SAR ${expected.toFixed(2)}`);
    this.setText('stickyActualCash', `SAR ${actual.toFixed(2)}`);
    this.setText('stickyDifference', `SAR ${diff.toFixed(2)}`);

    // Update color based on difference
    const diffItem = document.getElementById('stickyDifferenceItem');
    if (Math.abs(diff) < 0.01) {
      diffItem.className = 'summary-item difference balanced';
    } else if (diff < 0) {
      diffItem.className = 'summary-item difference shortage';
    } else {
      diffItem.className = 'summary-item difference excess';
    }

    // Also update bottom summary
    this.setText('summaryExpectedCash', `SAR ${expected.toFixed(2)}`);
    this.setText('summaryActualCash', `SAR ${actual.toFixed(2)}`);
    this.setText('summaryDifference', `SAR ${diff.toFixed(2)}`);
  }

  // Load yesterday's cash flow data
  loadYesterdayCashFlow() {
    const currentDate = this.getValue('salesDate');
    if (!currentDate) {
      this.showStatus('Please select a date first!', 'error');
      return;
    }

    // This is a placeholder - in production, you'd fetch from backend
    this.showStatus('Yesterday\'s cash flow would be loaded here', 'info');

    // For now, just clear payment methods but keep sales data
    ['discountBase', 'discountWithVAT', 'creditSales', 'creditRepayment',
     'bankPOS', 'bankTransfer', 'cheque'].forEach(id => this.setValue(id, '0'));

    this.calculateCashBalance();
  }

  // Initialize charts (called after DOM is ready)
  initCharts() {
    // Week chart - placeholder data
    const weekCtx = document.getElementById('weekChart');
    if (weekCtx && typeof Chart !== 'undefined') {
      new Chart(weekCtx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Daily Sales (SAR)',
            data: [0, 0, 0, 0, 0, 0, 0], // Placeholder
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
      this.setText('weekSummary', 'Historical data will appear here');
    }

    // Category chart - placeholder
    const catCtx = document.getElementById('categoryChart');
    if (catCtx && typeof Chart !== 'undefined') {
      new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: ['Sunflower Seeds', 'Pumpkin Seeds', 'Melon Seeds', 'Popcorn'],
          datasets: [{
            data: [0, 0, 0, 0], // Placeholder
            backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
      this.setText('categorySummary', 'Category breakdown from today\'s sales');
    }
  }
}

const app = new CashReconciliationApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  app.setupKeyboardShortcuts();

  // Initialize charts after a short delay to ensure Chart.js is loaded
  setTimeout(() => {
    if (typeof Chart !== 'undefined') {
      app.initCharts();
    }
  }, 500);
});
