// --- GLOBAL STATE & CONSTANTS ---
const HISTORY_KEY = 'goldCalcHistory';
const CACHED_PRICES_KEY = 'goldCalcCachedPrices';
const MAX_HISTORY_ITEMS = 7;
const MESGHAL_TO_GRAM = 4.6083;

let lastUpdateTime = null;
let priceUpdateInterval = null;
const goldPrices = { "طلای 18 عیار": null, "مثقال طلا": null, "طلای 24 عیار": null, "دلار آمریکا": null, "طلای دست دوم": null };
let prevGoldPrices = { ...goldPrices };

// --- DOM References ---
const autoCalcForm = document.getElementById('auto-price-calculator');
const manualCalcForm = document.getElementById('manual-price-calculator');
const converterForm = document.getElementById('unit-converter');
const autoCalcButton = document.getElementById('calculate-auto-btn');
const manualCalcButton = document.getElementById('calculate-manual-btn');
const historyContainer = document.getElementById('history-container');
const historySearchInput = document.getElementById('history-search-input');
const priceTable = document.getElementById('goldTable');
const resultDiv = document.getElementById('result');
const themeToggleButton = document.getElementById('theme-toggle-btn');
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');
const totalProfitLossContainer = document.getElementById('total-profit-loss-container');
const toastContainer = document.getElementById('toast-container');
const converterValueInput = document.getElementById('converter-value');
const fromUnitSelect = document.getElementById('from-unit');
const toUnitSelect = document.getElementById('to-unit');
const converterResultDiv = document.getElementById('converter-result');
const calculatorTabs = document.querySelector('.calculator-tabs');

// --- INITIALIZATION ---
window.onload = function () {
    applyInitialTheme();
    setupEventListeners();
    setupParticleAnimation();
    priceTable.innerHTML = '<tr><td colspan="2">در حال بارگذاری قیمت‌ها...</td></tr>';
    loadHistory();
    fetchPricesFromTgju();
    updateFormVisibility('auto');
    // Validate on load without showing "required" errors
    validateForm(autoCalcForm, autoCalcButton, false);
    handleConversion();
};

function setupEventListeners() {
    themeToggleButton.addEventListener('click', toggleTheme);
    document.getElementById('auto-mode-btn').addEventListener('click', () => switchCalculatorMode('auto'));
    document.getElementById('manual-mode-btn').addEventListener('click', () => switchCalculatorMode('manual'));
    document.getElementById('converter-mode-btn').addEventListener('click', () => switchCalculatorMode('converter'));

    // On click, validate and show all errors
    autoCalcButton.addEventListener('click', () => calculateAuto(true));
    manualCalcButton.addEventListener('click', () => calculateManual(true));

    document.getElementById('gold-type-auto').addEventListener('change', () => updateFormVisibility('auto'));
    document.getElementById('gold-type-manual').addEventListener('change', () => updateFormVisibility('manual'));

    // Real-time validation on input
    document.querySelectorAll('.calc-input, .form-control').forEach(input => {
        input.addEventListener('input', (event) => {
            const form = event.target.closest('div[role="tabpanel"]');
            if (form.id.includes('converter')) return;
            if (event.target.id.includes('price-manual')) formatNumberInput(event.target);
            const button = form.querySelector('button[id^="calculate-"]');
            // Validate without showing "required" errors
            validateForm(form, button, false);
        });

        if (input.classList.contains('calc-input')) {
            input.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const form = input.closest('div[role="tabpanel"]');
                    if (form.id.includes('converter')) return;
                    const button = form.querySelector('button[id^="calculate-"]');
                    if (button && !button.disabled) button.click();
                }
            });
        }
    });

    calculatorTabs.addEventListener('keydown', (event) => {
        const tabs = Array.from(calculatorTabs.querySelectorAll('.tab-button'));
        const activeTabIndex = tabs.findIndex(tab => tab.classList.contains('active-tab'));

        let newIndex = activeTabIndex;
        if (event.key === 'ArrowRight') {
            newIndex = (activeTabIndex + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft') {
            newIndex = (activeTabIndex - 1 + tabs.length) % tabs.length;
        }

        if (newIndex !== activeTabIndex) {
            event.preventDefault();
            tabs[newIndex].focus();
            tabs[newIndex].click();
        }
    });

    historySearchInput.addEventListener('input', () => loadHistory(historySearchInput.value));

    converterValueInput.addEventListener('input', handleConversion);
    fromUnitSelect.addEventListener('input', handleConversion);
    toUnitSelect.addEventListener('input', handleConversion);
}

// --- UI & FORM LOGIC ---
function switchCalculatorMode(mode) {
    const modes = ['auto', 'manual', 'converter'];
    modes.forEach(m => {
        document.getElementById(`${m}-mode-btn`).classList.toggle('active-tab', m === mode);
        document.getElementById(`${m}-mode-btn`).setAttribute('aria-selected', m === mode);
        const panel = document.getElementById(`${m}-price-calculator`) || document.getElementById('unit-converter');
        panel.classList.toggle('hidden', m !== mode);
    });

    resultDiv.classList.toggle('hidden', mode === 'converter');

    if (mode === 'auto') { updateFormVisibility('auto'); validateForm(autoCalcForm, autoCalcButton, false); }
    if (mode === 'manual') { updateFormVisibility('manual'); validateForm(manualCalcForm, manualCalcButton, false); }
    if (mode === 'converter') handleConversion();
}

function updateFormVisibility(mode) {
    const goldType = document.getElementById(`gold-type-${mode}`).value;
    document.getElementById(`commission-group-${mode}`).classList.toggle('hidden', goldType !== 'نو/زینتی');
    document.getElementById(`profit-group-${mode}`).classList.toggle('hidden', goldType === 'آب‌شده');
    document.getElementById(`tax-group-${mode}`).classList.toggle('hidden', goldType === 'آب‌شده');
    document.getElementById(`carat-select-group-${mode}`).classList.toggle('hidden', goldType === 'آب‌شده');
    document.getElementById(`carat-input-group-${mode}`).classList.toggle('hidden', goldType !== 'آب‌شده');
}

// --- THEME & PARTICLE CODE (Unchanged) ---
function applyInitialTheme() { const t = localStorage.getItem("theme") || "light"; document.body.classList.toggle("dark-mode", "dark" === t), updateThemeIcons(t) } function toggleTheme() { const t = document.body.classList.toggle("dark-mode"), e = t ? "dark" : "light"; localStorage.setItem("theme", e), updateThemeIcons(e) } function updateThemeIcons(t) { sunIcon && moonIcon && (sunIcon.classList.toggle("hidden", "dark" === t), moonIcon.classList.toggle("hidden", "light" === t)) } function setupParticleAnimation() { const t = document.getElementById("particle-canvas"); if (!t) return; const e = t.getContext("2d"); let a; function n() { t.width = window.innerWidth, t.height = window.innerHeight } class i { constructor() { this.x = Math.random() * t.width, this.y = Math.random() * t.height, this.size = 2.5 * Math.random() + 1, this.speedX = .8 * Math.random() - .4, this.speedY = .8 * Math.random() - .4 } update() { this.x += this.speedX, this.y += this.speedY, this.x > t.width + 5 && (this.x = -5), this.x < -5 && (this.x = t.width + 5), this.y > t.height + 5 && (this.y = -5), this.y < -5 && (this.y = t.height + 5) } draw() { e.beginPath(); const a = e.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size); a.addColorStop(0, "rgba(212, 175, 55, 0.8)"), a.addColorStop(1, "rgba(212, 175, 55, 0)"), e.fillStyle = a, e.arc(this.x, this.y, 2 * this.size, 0, 2 * Math.PI), e.fill() } } function s() { n(), a = []; const t = (window.innerHeight * window.innerWidth) / 9e3; for (let e = 0; e < t; e++)a.push(new i) } function o() { e.clearRect(0, 0, t.width, t.height); for (let t = 0; t < a.length; t++)a[t].update(), a[t].draw(); requestAnimationFrame(o) } s(), o(), window.addEventListener("resize", () => { clearTimeout(window.resizedFinished), window.resizedFinished = setTimeout(s, 150) }) }

// --- INPUT VALIDATION (Improved) ---
function validateSingleInput(input, showRequiredError = false) {
    const value = cleanNumber(input.value);
    const errorElement = document.getElementById(input.id + '-error');
    let errorMessage = '';
    const isOptional = input.closest('.form-group.hidden') || ['commission', 'profit', 'tax'].some(id => input.id.includes(id));
    let isInputValid = true;

    if (value.trim() === '' && !isOptional) {
        if (showRequiredError) {
            errorMessage = 'این فیلد الزامی است.';
        }
        isInputValid = false;
    } else if (value.trim() !== '' && !/^\d*\.?\d*$/.test(value)) {
        errorMessage = 'لطفا فقط از اعداد و یک نقطه استفاده کنید.';
        isInputValid = false;
    } else if (value.trim() !== '') {
        const numValue = parseFloat(value);
        if (numValue < 0) {
            errorMessage = 'مقدار نمی‌تواند منفی باشد.';
            isInputValid = false;
        } else if (numValue === 0 && !isOptional) {
            errorMessage = 'مقدار باید بزرگتر از صفر باشد.';
            isInputValid = false;
        } else if (input.id.includes('carat-auto') || input.id.includes('carat-manual')) {
            if (numValue > 1000 || numValue < 1) {
                errorMessage = 'عیار باید بین ۱ تا ۱۰۰۰ باشد.';
                isInputValid = false;
            }
        } else if (input.id.includes('weight') && numValue > 10000) {
            errorMessage = 'وزن بیش از حد زیاد است.';
            isInputValid = false;
        }
    }

    input.classList.toggle('input-error', !!errorMessage);
    if (errorElement) errorElement.textContent = errorMessage;

    return isInputValid;
}

function validateForm(form, button, showRequiredError = false) {
    const inputs = form.querySelectorAll('.calc-input');
    let isFormValid = true;
    inputs.forEach(input => {
        if (!input.closest('.form-group.hidden')) {
            if (!validateSingleInput(input, showRequiredError)) {
                isFormValid = false;
            }
        }
    });
    if (button) button.disabled = !isFormValid;
    return isFormValid;
}


// --- CALCULATION LOGIC ---
function getFormValues(mode) {
    const goldType = document.getElementById(`gold-type-${mode}`).value;
    let carat;
    if (goldType === 'آب‌شده') {
        carat = parseFloat(cleanNumber(document.getElementById(`carat-${mode}`).value)) || 0;
    } else {
        carat = parseFloat(document.getElementById(`carat-select-${mode}`).value) || 0;
    }

    return {
        goldType: goldType,
        weight: parseFloat(cleanNumber(document.getElementById(`weight-${mode}`).value)) || 0,
        carat: carat,
        commission: parseFloat(cleanNumber(document.getElementById(`commission-${mode}`).value)) || 0,
        profit: parseFloat(cleanNumber(document.getElementById(`profit-${mode}`).value)) || 0,
        tax: parseFloat(cleanNumber(document.getElementById(`tax-${mode}`).value)) || 0,
    };
}

function calculate(values, price18, isAuto) {
    if (!price18) {
        resultDiv.innerHTML = '<p class="error">قیمت لحظه‌ای در دسترس نیست. لطفا دقایقی دیگر تلاش کنید.</p>';
        return;
    }
    if (!isValidInput(values.weight, values.carat)) {
        resultDiv.innerHTML = '<p class="error">لطفا وزن و عیار معتبر وارد کنید.</p>';
        return;
    }

    const pricePerGramOfCarat = (price18 / 750) * values.carat;
    const baseValue = values.weight * pricePerGramOfCarat;

    let wageAmount = 0, profitAmount = 0, taxAmount = 0, finalValue = baseValue;

    if (values.goldType === 'نو/زینتی') {
        wageAmount = baseValue * (values.commission / 100);
        const subtotal_after_wage = baseValue + wageAmount;
        profitAmount = subtotal_after_wage * (values.profit / 100);
        taxAmount = (wageAmount + profitAmount) * (values.tax / 100);
        finalValue = baseValue + wageAmount + profitAmount + taxAmount;
    } else if (values.goldType === 'دست دوم') {
        profitAmount = baseValue * (values.profit / 100);
        taxAmount = profitAmount * (values.tax / 100);
        finalValue = baseValue + profitAmount + taxAmount;
    }

    const calcType = isAuto ? `با قیمت لحظه‌ای (هر گرم ۱۸ عیار: ${formatterPrice(price18)} تومان)` : `با قیمت دستی (هر گرم ۱۸ عیار: ${formatterPrice(price18)} تومان)`;
    const resultData = { ...values, baseValue, wageAmount, profitAmount, taxAmount, finalValue, calcType };

    resultDiv.innerHTML = createResultTable(resultData);
    setupShareButton(resultData);
    saveCalculation({ ...resultData, date: new Date().toISOString() });
}

function calculateAuto(showErrors = false) {
    if (!validateForm(autoCalcForm, autoCalcButton, showErrors)) return;
    const values = getFormValues('auto');
    calculate(values, goldPrices["طلای 18 عیار"], true);
}

function calculateManual(showErrors = false) {
    if (!validateForm(manualCalcForm, manualCalcButton, showErrors)) return;
    const values = getFormValues('manual');
    const manualPrice = parseFloat(cleanNumber(document.getElementById('price-manual').value));
    calculate(values, manualPrice, false);
}

function createResultTable(data) {
    let tableHTML = `<p style="font-size: 0.875rem; color: var(--text-light-color); text-align:center;">${data.calcType}</p>
        <table style="width: 100%;" class="result-table"><tbody>
        <tr><td>ارزش خام طلا</td><td>${formatterPrice(data.baseValue.toFixed(0))} تومان</td></tr>`;

    if (data.goldType === 'نو/زینتی') tableHTML += `<tr><td>اجرت ساخت (${data.commission || 0}٪)</td><td>${formatterPrice(data.wageAmount.toFixed(0))} تومان</td></tr>`;
    if (data.goldType !== 'آب‌شده') {
        tableHTML += `<tr><td>سود فروشنده (${data.profit || 0}٪)</td><td>${formatterPrice(data.profitAmount.toFixed(0))} تومان</td></tr>`;
        tableHTML += `<tr><td>مالیات (${data.tax || 0}٪)</td><td>${formatterPrice(data.taxAmount.toFixed(0))} تومان</td></tr>`;
    }

    tableHTML += `<tr class="final-row"><td>مبلغ نهایی</td><td><b>${formatterPrice(data.finalValue.toFixed(0))} تومان</b></td></tr>
        </tbody></table>
        <button id="share-result-btn" title="کپی یا اشتراک‌گذاری نتیجه">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            اشتراک‌گذاری
        </button>`;
    return tableHTML;
}

// --- SHARE & TOAST ---
function setupShareButton(data) {
    const shareBtn = document.getElementById('share-result-btn');
    if (!shareBtn) return;

    let shareText = `محاسبه قیمت طلا (${data.goldType}):
- وزن: ${data.weight} گرم
- عیار: ${data.carat}
- ارزش خام: ${formatterPrice(data.baseValue.toFixed(0))} تومان`;
    if (data.wageAmount > 0 || data.commission > 0) shareText += `\n- اجرت: ${formatterPrice(data.wageAmount.toFixed(0))} ت (${data.commission}%)`;
    if (data.profitAmount > 0 || data.profit > 0) shareText += `\n- سود: ${formatterPrice(data.profitAmount.toFixed(0))} ت (${data.profit}%)`;
    if (data.taxAmount > 0 || data.tax > 0) shareText += `\n- مالیات: ${formatterPrice(data.taxAmount.toFixed(0))} ت (${data.tax}%)`;
    shareText += `\n- مبلغ نهایی: ${formatterPrice(data.finalValue.toFixed(0))} تومان`;

    shareBtn.addEventListener('click', async () => {
        if (navigator.share) {
            try { await navigator.share({ title: 'نتیجه محاسبه قیمت طلا', text: shareText }); } catch (error) { console.error('Error sharing:', error); }
        } else {
            navigator.clipboard.writeText(shareText).then(() => { showToast('نتیجه در کلیپ‌بورد کپی شد'); }).catch(err => { console.error('Error copying:', err); showToast('خطا در کپی کردن', 'error'); });
        }
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// --- HISTORY & P/L MANAGEMENT ---
function saveCalculation(data) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    history.unshift(data);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
    showToast('محاسبه ذخیره شد');
    loadHistory(historySearchInput.value);
}

function loadHistory(searchTerm = '') {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    historyContainer.innerHTML = '';

    if (searchTerm.trim() !== '') {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        history = history.filter(item => {
            const itemText = `${item.goldType} ${item.weight} ${item.carat}`.toLowerCase();
            return itemText.includes(lowerCaseSearchTerm);
        });
    }

    if (history.length === 0) {
        historyContainer.innerHTML = searchTerm ? '<p>موردی با این مشخصات یافت نشد.</p>' : '<p>هنوز محاسبه‌ای انجام نشده است.</p>';
    } else {
        history.forEach(item => renderHistoryItem(item));
    }
    calculateAndDisplayTotalProfitLoss();
}

function renderHistoryItem(item) {
    const itemArticle = document.createElement('article');
    itemArticle.className = 'history-item';

    if (!item.date) { console.warn('History item without a date found, skipping:', item); return; }
    itemArticle.setAttribute('data-id', item.date);
    const date = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date));

    const finalValue = item.finalValue || item.originalValue;
    let profitLossSpan = '';
    const currentPrice18 = goldPrices["طلای 18 عیار"];
    if (currentPrice18 && finalValue > 0) {
        const pricePerGram = (currentPrice18 / 750) * item.carat;
        const rawCurrentValue = item.weight * pricePerGram;
        const profitLoss = rawCurrentValue - finalValue;
        const cssClass = profitLoss >= 0 ? 'profit' : 'loss';
        profitLossSpan = `<span class="profit-loss-value ${cssClass}">${formatterPrice(Math.abs(profitLoss).toFixed(0))}</span>`;
    }

    let detailsHTML;
    if (typeof item.baseValue !== 'undefined') {
        let breakdownHTML = `<table class="history-item-breakdown"><tbody>
            <tr><td>ارزش خام:</td><td>${formatterPrice(item.baseValue.toFixed(0))}</td></tr>`;
        if (item.goldType === 'نو/زینتی') breakdownHTML += `<tr><td>+ اجرت (${item.commission || 0}٪):</td><td>${formatterPrice(item.wageAmount.toFixed(0))}</td></tr>`;
        if (item.goldType !== 'آب‌شده') {
            breakdownHTML += `<tr><td>+ سود (${item.profit || 0}٪):</td><td>${formatterPrice(item.profitAmount.toFixed(0))}</td></tr>`;
            breakdownHTML += `<tr><td>+ مالیات (${item.tax || 0}٪):</td><td>${formatterPrice(item.taxAmount.toFixed(0))}</td></tr>`;
        }
        breakdownHTML += `</tbody></table>`;
        detailsHTML = `${breakdownHTML}<div class="history-item-footer">
                <span>ارزش خرید: <b>${formatterPrice(finalValue.toFixed(0))}</b></span>
                <span>سود/زیان: ${profitLossSpan || 'N/A'}</span>
            </div>`;
    } else {
        detailsHTML = `<div class="history-item-footer">
                <span>ارزش خرید: <b>${formatterPrice(finalValue.toFixed(0))} تومان</b></span>
                <span>سود/زیان: ${profitLossSpan || 'N/A'}</span>
            </div>`;
    }

    itemArticle.innerHTML = `
        <div class="history-item-header">
            <span class="spec">${item.goldType || 'طلا'} - ${item.weight} گرم - عیار ${item.carat}</span>
            <time datetime="${item.date}" style="font-size:12px;">${date}</time>
        </div>
        <div class="history-item-actions">
            <button class="history-action-btn reuse-btn" title="استفاده مجدد"></button>
            <button class="history-action-btn delete-btn" title="حذف"></button>
        </div>
        <div class="history-item-details">${detailsHTML}</div>`;

    const reuseBtn = itemArticle.querySelector('.reuse-btn');
    reuseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>`;
    reuseBtn.setAttribute('aria-label', `استفاده مجدد از محاسبه ${item.goldType} ${item.weight} گرم`);
    reuseBtn.addEventListener('click', () => reuseCalculation(item.goldType || 'نو/زینتی', item.weight, item.carat, item.commission || 0, item.profit || 0, item.tax || 0));

    const deleteBtn = itemArticle.querySelector('.delete-btn');
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    deleteBtn.setAttribute('aria-label', `حذف محاسبه ${item.goldType} ${item.weight} گرم`);
    deleteBtn.classList.add('delete-history-btn');
    deleteBtn.addEventListener('click', () => deleteHistoryItem(item.date));

    historyContainer.appendChild(itemArticle);
}


function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter(item => item.date !== id)));
    loadHistory(historySearchInput.value);
}

function reuseCalculation(goldType, weight, carat, commission, profit, tax) {
    switchCalculatorMode('auto');
    document.getElementById('gold-type-auto').value = goldType || 'نو/زینتی';
    updateFormVisibility('auto');

    document.getElementById('weight-auto').value = weight;
    if (goldType === 'آب‌شده') {
        document.getElementById('carat-auto').value = carat;
    } else {
        document.getElementById('carat-select-auto').value = carat;
    }
    document.getElementById('commission-auto').value = commission || '';
    document.getElementById('profit-auto').value = profit || '';
    document.getElementById('tax-auto').value = tax || '';

    validateForm(autoCalcForm, autoCalcButton, false);
    document.getElementById('calculator-card').scrollIntoView({ behavior: 'smooth' });
}

function calculateAndDisplayTotalProfitLoss() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const currentPrice18 = goldPrices["طلای 18 عیار"];

    if (history.length === 0) { totalProfitLossContainer.innerHTML = '<p>موردی برای محاسبه وجود ندارد.</p>'; return; }
    if (!currentPrice18) { totalProfitLossContainer.innerHTML = '<p>قیمت لحظه‌ای برای محاسبه در دسترس نیست.</p>'; return; }

    const totalProfitLoss = history.reduce((acc, item) => {
        const finalValue = item.finalValue || item.originalValue;
        const pricePerGram = (currentPrice18 / 750) * item.carat;
        const rawCurrentValue = item.weight * pricePerGram;
        return acc + (rawCurrentValue - finalValue);
    }, 0);

    const isProfit = totalProfitLoss >= 0;
    const cssClass = isProfit ? 'profit' : 'loss';
    totalProfitLossContainer.innerHTML = `
        <div class="total-profit-loss-display">
            <span class="label">سود / زیان کلی</span>
            <span class="profit-loss-value ${cssClass}">${formatterPrice(Math.abs(totalProfitLoss).toFixed(0))} تومان</span>
        </div>`;
}

// --- PRICE FETCHING ---
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network error: ${response.status}`);
            return response;
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
            if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
            else throw error;
        }
    }
}

async function fetchPricesFromTgju() {
    autoCalcButton.disabled = true;
    prevGoldPrices = { ...goldPrices };
    const priceSources = [
        { key: 'طلای 18 عیار', url: 'https://www.tgju.org/profile/geram18', factor: 10 },
        { key: 'طلای 24 عیار', url: 'https://www.tgju.org/profile/geram24', factor: 10 },
        { key: 'طلای دست دوم', url: 'https://www.tgju.org/profile/gold_mini_size', factor: 10 },
        { key: 'مثقال طلا', url: 'https://www.tgju.org/profile/mesghal', factor: 10 },
        { key: 'دلار آمریکا', url: 'https://www.tgju.org/profile/price_dollar_rl', factor: 10 },
    ];
    const proxyUrl = (targetUrl) => `https://gold-proxy.epfereydoon.workers.dev/?url=${encodeURIComponent(targetUrl)}`;

    try {
        const responses = await Promise.all(priceSources.map(src => fetchWithRetry(proxyUrl(src.url))));
        const htmls = await Promise.all(responses.map(res => res.text()));

        const parser = new DOMParser();
        priceSources.forEach((src, index) => {
            const doc = parser.parseFromString(htmls[index], 'text/html');
            const priceText = doc.querySelector("h3.line.clearfix > span.value > span:nth-child(1)")?.textContent;
            goldPrices[src.key] = cleanPrice(priceText) / src.factor;
        });

        const newPriceData = { prices: goldPrices, timestamp: new Date().toISOString() };
        localStorage.setItem(CACHED_PRICES_KEY, JSON.stringify(newPriceData));

        displayPrices();
        lastUpdateTime = new Date();
        displayUpdateStatus();
        startPriceStalenessChecker();
        loadHistory(historySearchInput.value);
        validateForm(autoCalcForm, autoCalcButton, false);
    } catch (error) {
        console.error("Error fetching data:", error);
        useCachedPrices();
    }
}

function useCachedPrices() {
    const cachedData = JSON.parse(localStorage.getItem(CACHED_PRICES_KEY));
    if (cachedData && cachedData.prices) {
        Object.assign(goldPrices, cachedData.prices);
        lastUpdateTime = new Date(cachedData.timestamp);

        showToast('عدم دریافت قیمت جدید، از آخرین قیمت ذخیره‌شده استفاده شد.', 'warning');
        displayPrices();
        displayUpdateStatus(true);
        loadHistory(historySearchInput.value);
        validateForm(autoCalcForm, autoCalcButton, false);
    } else {
        priceTable.innerHTML = '<tr><td colspan="2" class="error">خطا در دریافت قیمت‌ها.</td></tr>';
        document.getElementById('update-status-container').innerHTML = '<p class="error">امکان دریافت قیمت وجود ندارد.</p>';
        showToast('خطا در دریافت قیمت‌ها', 'error');
        autoCalcButton.disabled = true;
    }
}


function displayPrices() {
    const tbody = document.createElement("tbody");
    const nameMap = {
        "طلای 18 عیار": "گرم طلای ۱۸ عیار",
        "طلای 24 عیار": "گرم طلای ۲۴ عیار",
        "طلای دست دوم": "طلای دست دوم",
        "مثقال طلا": "مثقال طلا (مظنه)",
        "دلار آمریکا": "دلار آمریکا",
    };

    Object.keys(nameMap).forEach(key => {
        if (!goldPrices.hasOwnProperty(key)) return;

        const price = goldPrices[key];
        const prevPrice = prevGoldPrices[key];
        let changeHTML = '', flashClass = '';

        if (price && prevPrice && price !== prevPrice) {
            const diff = price - prevPrice;
            const isUp = diff > 0;
            flashClass = isUp ? 'flash-up' : 'flash-down';
            changeHTML = `<span class="price-change ${isUp ? 'up' : 'down'}"><span class="arrow">${isUp ? '▲' : '▼'}</span>${formatterPrice(Math.abs(diff))}</span>`;
        }

        const row = tbody.insertRow();
        row.className = flashClass;
        row.insertCell(0).textContent = nameMap[key];
        const priceCell = row.insertCell(1);
        priceCell.innerHTML = `<span class="price-value">${price ? formatterPrice(price) : 'نامشخص'}</span> ${changeHTML}`;
    });

    priceTable.innerHTML = '<thead><tr><th>نوع</th><th>قیمت (تومان)</th></tr></thead>';
    priceTable.appendChild(tbody);
}

function refreshPrices() { autoCalcButton.disabled = !0, priceTable.innerHTML = '<tr><td colspan="2">در حال به‌روزرسانی...</td></tr>', document.getElementById("update-status-container").innerHTML = "", fetchPricesFromTgju(); }

function displayUpdateStatus(isCached = false) {
    const container = document.getElementById("update-status-container"); if (!lastUpdateTime) return;
    const timeFormatted = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(lastUpdateTime);
    const cachedText = isCached ? ' (ذخیره شده)' : '';
    container.innerHTML = `<div class="update-status" style="display:flex; align-items:center; justify-content:space-between;">
        <button onclick="refreshPrices()" class="history-action-btn" title="دریافت قیمت جدید" aria-label="دریافت قیمت جدید">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="refresh-icon"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
        </button>
        <div class="time-text" id="time-text-container" style="font-size:13px;">آخرین به‌روزرسانی: ${timeFormatted}${cachedText}</div>
    </div>`;
}

function startPriceStalenessChecker() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    priceUpdateInterval = setInterval(checkPriceStaleness, 10000);
}
function checkPriceStaleness() { if (!lastUpdateTime) return; const t = (new Date - lastUpdateTime) / 1e3; if (t > 60) { const t = document.getElementById("time-text-container"); t && (t.innerHTML = '<span class="stale-prices">قیمت‌ها نیاز به به‌روزرسانی دارند.</span>'), clearInterval(priceUpdateInterval) } }

// --- UNIT CONVERSION LOGIC ---
function handleConversion() {
    const value = parseFloat(cleanNumber(converterValueInput.value)) || 0;
    const fromUnit = fromUnitSelect.value;
    const toUnit = toUnitSelect.value;

    if (value <= 0) {
        converterResultDiv.innerHTML = `<p>نتیجه تبدیل در اینجا نمایش داده می‌شود.</p>`;
        return;
    }

    const result = convertUnits(value, fromUnit, toUnit);
    const unitLabels = { 'gram_705': 'گرم', 'gram_750': 'گرم', 'gram_999': 'گرم', 'mesghal_705': 'مثقال' };

    converterResultDiv.innerHTML = `<p>${formatterPrice(value)} ${unitLabels[fromUnit]} = ${formatterPrice(result.toFixed(4))} ${unitLabels[toUnit]}</p>`;
}

function convertUnits(value, fromUnit, toUnit) {
    const purities = { '705': 0.705, '750': 0.750, '999': 0.999 };

    let pureGoldGrams;
    const [fromType, fromKarat] = fromUnit.split('_');
    if (fromType === 'gram') {
        pureGoldGrams = value * purities[fromKarat];
    } else if (fromType === 'mesghal') {
        pureGoldGrams = (value * MESGHAL_TO_GRAM) * purities['705'];
    }

    let result;
    const [toType, toKarat] = toUnit.split('_');
    if (toType === 'gram') {
        result = pureGoldGrams / purities[toKarat];
    } else if (toType === 'mesghal') {
        result = (pureGoldGrams / purities['705']) / MESGHAL_TO_GRAM;
    }

    return result;
}

// --- UTILITY FUNCTIONS ---
function formatNumberInput(input) { let value = cleanNumber(input.value); if (input.value !== '') { input.value = new Intl.NumberFormat('en-US').format(value); } }
function formatterPrice(price) { return (price === null || isNaN(price)) ? 'نامشخص' : new Intl.NumberFormat('fa-IR').format(price); }
function isValidInput(weight, carat) { return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat <= 1000; }
function cleanNumber(str) { return String(str).replace(/,/g, ''); }
function cleanPrice(priceString) { return priceString ? parseInt(cleanNumber(priceString)) : null; }
