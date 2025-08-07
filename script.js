// --- GLOBAL STATE & CONSTANTS ---
const HISTORY_KEY = 'goldCalcHistory';
const CACHED_PRICES_KEY = 'goldCalcCachedPrices';
const MAX_HISTORY_ITEMS = 7;
const MESGHAL_TO_GRAM = 4.6083;

let lastUpdateTime = null;
let priceUpdateInterval = null;
const goldPrices = {
    "طلای 18 عیار / 740": null,
    "طلای 18 عیار": null, // This is 750
    "طلای 24 عیار": null,
    "طلای دست دوم": null,
    "مثقال طلا": null,
    "دلار آمریکا": null
};
let prevGoldPrices = { ...goldPrices };

// --- DOM References ---
const autoCalcForm = document.getElementById('auto-price-calculator');
const manualCalcForm = document.getElementById('manual-price-calculator');
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
const converterResultDiv = document.getElementById('converter-result');
const modal = document.getElementById('confirmation-modal');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// --- UTILITY: PROXY URL ---
const proxyUrl = (targetUrl) => `https://gold-proxy.epfereydoon.workers.dev/?url=${encodeURIComponent(targetUrl)}`;

// --- INITIALIZATION ---
window.onload = function () {
    applyInitialTheme();
    setupEventListeners();
    setupParticleAnimation();
    priceTable.innerHTML = '<tr><td colspan="2">در حال بارگذاری قیمت‌ها...</td></tr>';
    loadHistory();
    fetchPricesFromTgju();
    switchCalculatorMode('auto');
    validateForm(autoCalcForm, autoCalcButton, false);
    handleConversion();
};

function setupEventListeners() {
    themeToggleButton.addEventListener('click', toggleTheme);
    
    // Main tabs
    document.getElementById('radio-1').addEventListener('change', () => switchCalculatorMode('auto'));
    document.getElementById('radio-2').addEventListener('change', () => switchCalculatorMode('manual'));
    document.getElementById('radio-3').addEventListener('change', () => switchCalculatorMode('converter'));

    autoCalcButton.addEventListener('click', () => calculateAuto(true));
    manualCalcButton.addEventListener('click', () => calculateManual(true));

    // Listeners for the new Gold Type tabs
    document.querySelectorAll('input[name="gold-type-auto-tabs"]').forEach(radio => {
        radio.addEventListener('change', () => updateFormVisibility('auto'));
    });
    document.querySelectorAll('input[name="gold-type-manual-tabs"]').forEach(radio => {
        radio.addEventListener('change', () => updateFormVisibility('manual'));
    });
    
    document.querySelectorAll('.calc-input').forEach(input => {
        input.addEventListener('input', (event) => {
            const form = event.target.closest('div[role="tabpanel"]');
            if (!form || form.id.includes('converter')) return;
            if (event.target.id.includes('price-manual')) formatNumberInput(event.target);
            const button = form.querySelector('button[id^="calculate-"]');
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

    // Add listeners for new carat tabs to re-validate form
    document.querySelectorAll('input[name="carat-auto-tabs"], input[name="carat-manual-tabs"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const form = radio.closest('div[role="tabpanel"]');
            const button = form.querySelector('button[id^="calculate-"]');
            validateForm(form, button, false);
        });
    });

    historySearchInput.addEventListener('input', () => loadHistory(historySearchInput.value));
    
    // Add listeners for converter
    converterValueInput.addEventListener('input', handleConversion);
    document.querySelectorAll('input[name="from-unit-tabs"], input[name="to-unit-tabs"]').forEach(radio => {
        radio.addEventListener('change', handleConversion);
    });
    
    modalCancelBtn.addEventListener('click', hideConfirmationModal);
    modal.addEventListener('click', (e) => { if(e.target === modal) hideConfirmationModal()});
}

// --- UI & FORM LOGIC ---
function switchCalculatorMode(mode) {
    const modes = ['auto', 'manual', 'converter'];
    modes.forEach(m => {
        const panel = document.getElementById(`${m}-price-calculator`) || document.getElementById('unit-converter');
        if (panel) panel.classList.toggle('hidden', m !== mode);
    });
    resultDiv.classList.toggle('hidden', mode === 'converter');
    if (mode === 'auto') { updateFormVisibility('auto'); validateForm(autoCalcForm, autoCalcButton, false); }
    if (mode === 'manual') { updateFormVisibility('manual'); validateForm(manualCalcForm, manualCalcButton, false); }
    if (mode === 'converter') handleConversion();
}

function updateFormVisibility(mode) {
    const goldType = document.querySelector(`input[name="gold-type-${mode}-tabs"]:checked`).value;
    document.getElementById(`commission-group-${mode}`).classList.toggle('hidden', goldType !== 'نو/زینتی');
    document.getElementById(`profit-group-${mode}`).classList.toggle('hidden', goldType === 'آب‌شده');
    document.getElementById(`tax-group-${mode}`).classList.toggle('hidden', goldType === 'آب‌شده');
    document.getElementById(`carat-select-group-${mode}`).classList.toggle('hidden', goldType === 'آب‌شده');
    document.getElementById(`carat-input-group-${mode}`).classList.toggle('hidden', goldType !== 'آب‌شده');
}

// --- THEME & PARTICLE CODE ---
function applyInitialTheme() { const t = localStorage.getItem("theme") || "light"; document.body.classList.toggle("dark-mode", "dark" === t), updateThemeIcons(t) } function toggleTheme() { const t = document.body.classList.toggle("dark-mode"), e = t ? "dark" : "light"; localStorage.setItem("theme", e), updateThemeIcons(e) } function updateThemeIcons(t) { sunIcon && moonIcon && (sunIcon.classList.toggle("hidden", "dark" === t), moonIcon.classList.toggle("hidden", "light" === t)) } function setupParticleAnimation() { const t = document.getElementById("particle-canvas"); if (!t) return; const e = t.getContext("2d"); let a; function n() { t.width = window.innerWidth, t.height = window.innerHeight } class i { constructor() { this.x = Math.random() * t.width, this.y = Math.random() * t.height, this.size = 2.5 * Math.random() + 1, this.speedX = .8 * Math.random() - .4, this.speedY = .8 * Math.random() - .4 } update() { this.x += this.speedX, this.y += this.speedY, this.x > t.width + 5 && (this.x = -5), this.x < -5 && (this.x = t.width + 5), this.y > t.height + 5 && (this.y = -5), this.y < -5 && (this.y = t.height + 5) } draw() { e.beginPath(); const a = e.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size); a.addColorStop(0, "rgba(212, 175, 55, 0.8)"), a.addColorStop(1, "rgba(212, 175, 55, 0)"), e.fillStyle = a, e.arc(this.x, this.y, 2 * this.size, 0, 2 * Math.PI), e.fill() } } function s() { n(), a = []; const t = (window.innerHeight * window.innerWidth) / 9e3; for (let e = 0; e < t; e++)a.push(new i) } function o() { e.clearRect(0, 0, t.width, t.height); for (let t = 0; t < a.length; t++)a[t].update(), a[t].draw(); requestAnimationFrame(o) } s(), o(), window.addEventListener("resize", () => { clearTimeout(window.resizedFinished), window.resizedFinished = setTimeout(s, 150) }) }

// --- INPUT VALIDATION ---
function validateSingleInput(input, showRequiredError = false) {
    const value = cleanNumber(input.value);
    const errorElement = document.getElementById(input.id + '-error');
    let errorMessage = '';
    const isOptional = input.closest('.form-group.hidden') || ['commission', 'profit', 'tax'].some(id => input.id.includes(id));
    let isInputValid = true;
    if (value.trim() === '' && !isOptional) { if (showRequiredError) errorMessage = 'این فیلد الزامی است.'; isInputValid = false; }
    else if (value.trim() !== '' && !/^\d*\.?\d*$/.test(value)) { errorMessage = 'لطفا فقط از اعداد و یک نقطه استفاده کنید.'; isInputValid = false; }
    else if (value.trim() !== '') {
        const numValue = parseFloat(value);
        if (numValue < 0) { errorMessage = 'مقدار نمی‌تواند منفی باشد.'; isInputValid = false; }
        else if (numValue === 0 && !isOptional) { errorMessage = 'مقدار باید بزرگتر از صفر باشد.'; isInputValid = false; }
        else if (input.id.includes('carat-auto') || input.id.includes('carat-manual')) { if (numValue > 1000 || numValue < 1) { errorMessage = 'عیار باید بین ۱ تا ۱۰۰۰ باشد.'; isInputValid = false; } }
        else if (input.id.includes('weight') && numValue > 10000) { errorMessage = 'وزن بیش از حد زیاد است.'; isInputValid = false; }
    }
    input.classList.toggle('input-error', !!errorMessage);
    if (errorElement) errorElement.textContent = errorMessage;
    return isInputValid;
}
function validateForm(form, button, showRequiredError = false) {
    const inputs = form.querySelectorAll('.calc-input');
    let isFormValid = true;
    inputs.forEach(input => { if (!input.closest('.form-group.hidden') && !validateSingleInput(input, showRequiredError)) isFormValid = false; });
    if (button) button.disabled = !isFormValid;
    return isFormValid;
}

// --- CALCULATION LOGIC ---
function getFormValues(mode) {
    const goldType = document.querySelector(`input[name="gold-type-${mode}-tabs"]:checked`).value;
    let carat = 0;
    if (goldType === 'آب‌شده') {
        carat = parseFloat(cleanNumber(document.getElementById(`carat-${mode}`).value)) || 0;
    } else {
        const checkedRadio = document.querySelector(`input[name="carat-${mode}-tabs"]:checked`);
        carat = checkedRadio ? parseFloat(checkedRadio.value) : 0;
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
    let basePriceSource = price18;
    let calcPriceDisplay = price18;

    if (isAuto && values.goldType === 'دست دوم' && goldPrices["طلای دست دوم"]?.price) {
        basePriceSource = goldPrices["طلای دست دوم"].price;
        calcPriceDisplay = basePriceSource;
    }

    if (!basePriceSource) { resultDiv.innerHTML = '<p class="error">قیمت لحظه‌ای در دسترس نیست.</p>'; return; }
    if (!isValidInput(values.weight, values.carat)) { resultDiv.innerHTML = '<p class="error">لطفا وزن و عیار معتبر وارد کنید.</p>'; return; }
    
    const pricePerGramOfCarat = (basePriceSource / 750) * values.carat;
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

    const calcType = (isAuto && values.goldType === 'دست دوم')
        ? `با قیمت لحظه‌ای (هر گرم دست دوم: ${formatterPrice(calcPriceDisplay)} تومان)`
        : `با قیمت ${isAuto ? 'لحظه‌ای' : 'دستی'} (هر گرم ۱۸ عیار: ${formatterPrice(calcPriceDisplay)} تومان)`;

    const resultData = { ...values, baseValue, wageAmount, profitAmount, taxAmount, finalValue, calcType, basePriceUsed: calcPriceDisplay };
    resultDiv.innerHTML = createResultTable(resultData);
    setupShareButton(resultData);
    saveCalculation({ ...resultData, date: new Date().toISOString() });
}

function calculateAuto(showErrors = false) { if (validateForm(autoCalcForm, autoCalcButton, showErrors)) calculate(getFormValues('auto'), goldPrices["طلای 18 عیار"]?.price, true); }
function calculateManual(showErrors = false) { if (validateForm(manualCalcForm, manualCalcButton, showErrors)) calculate(getFormValues('manual'), parseFloat(cleanNumber(document.getElementById('price-manual').value)), false); }
function createResultTable(data) {
    let tableHTML = `<p style="font-size: 0.875rem; color: var(--text-light-color); text-align:center;">${data.calcType}</p><table style="width: 100%;" class="result-table"><tbody><tr><td>ارزش خام طلا</td><td>${formatterPrice(data.baseValue.toFixed(0))} تومان</td></tr>`;
    if (data.goldType === 'نو/زینتی') tableHTML += `<tr><td>اجرت ساخت (${data.commission || 0}٪)</td><td>${formatterPrice(data.wageAmount.toFixed(0))} تومان</td></tr>`;
    if (data.goldType !== 'آب‌شده') { tableHTML += `<tr><td>سود فروشنده (${data.profit || 0}٪)</td><td>${formatterPrice(data.profitAmount.toFixed(0))} تومان</td></tr><tr><td>مالیات (${data.tax || 0}٪)</td><td>${formatterPrice(data.taxAmount.toFixed(0))} تومان</td></tr>`; }
    tableHTML += `<tr class="final-row"><td>مبلغ نهایی</td><td><b>${formatterPrice(data.finalValue.toFixed(0))} تومان</b></td></tr></tbody></table><button id="share-result-btn" title="کپی یا اشتراک‌گذاری نتیجه"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> اشتراک‌گذاری</button>`;
    return tableHTML;
}

// --- SHARE, TOAST & MODAL ---
function setupShareButton(data) {
    const shareBtn = document.getElementById('share-result-btn');
    if (!shareBtn) return;
    let shareText = `محاسبه قیمت طلا (${data.goldType}):\n- وزن: ${data.weight} گرم\n- عیار: ${data.carat}\n- ارزش خام: ${formatterPrice(data.baseValue.toFixed(0))} تومان\n- مبلغ نهایی: ${formatterPrice(data.finalValue.toFixed(0))} تومان`;
    shareBtn.addEventListener('click', async () => {
        if (navigator.share) { try { await navigator.share({ title: 'نتیجه محاسبه قیمت طلا', text: shareText }); } catch (e) {} }
        else { navigator.clipboard.writeText(shareText).then(() => showToast('نتیجه در کلیپ‌بورد کپی شد')).catch(e => showToast('خطا در کپی کردن', 'error')); }
    });
}
function showToast(message, type = 'success') { const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = message; toastContainer.appendChild(t); setTimeout(() => t.remove(), 3000); }
function showConfirmationModal(message, onConfirm) {
    modalMessage.textContent = message;
    modal.classList.remove('hidden');
    const newConfirmBtn = modalConfirmBtn.cloneNode(true);
    modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        hideConfirmationModal();
    });
}
function hideConfirmationModal() { modal.classList.add('hidden'); }

// --- HISTORY & P/L MANAGEMENT ---
const goldTypeVisuals = {
    'نو/زینتی': { label: 'طلای نو', tagClass: 'tag-new', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 0s2.5-1.06 4 0c1.5 0 2.75 1.06 4 0s2.5-1.06 4 0V4.06c-1.5 0-2.75-1.06-4 0s-2.5 1.06-4 0c-1.5 0-2.75-1.06-4 0s-2.5 1.06-4 0z"/><path d="M4 4.06V20.94"/><path d="M20 20.94V4.06"/></svg>` },
    'دست دوم': { label: 'دست دوم', tagClass: 'tag-used', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 18c.6 0 1-.4 1-1v-1a2 2 0 0 0-2-2h-2"/><path d="M4 18c-.6 0-1-.4-1-1v-1a2 2 0 0 1 2-2h2"/><path d="M10 14h4"/><path d="M18 10V8a2 2 0 0 0-2-2h-2"/><path d="M6 10V8a2 2 0 0 1 2-2h2"/><path d="m12 14 2 2 2-2"/><path d="m12 10-2-2-2 2"/></svg>` },
    'آب‌شده': { label: 'آب‌شده', tagClass: 'tag-melted', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9.5c-2-2.8-4-5-4-5.5 0-2 2-3.5 4-3.5s4 1.5 4 3.5c0 .5-2 2.7-4 5.5z"/><path d="M12 20.5c-5.5-5.5-5.5-12 0-17 5.5 5 5.5 11.5 0 17z"/></svg>` }
};
function saveCalculation(data) { let h = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; h.unshift(data); localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY_ITEMS))); showToast('محاسبه ذخیره شد'); loadHistory(historySearchInput.value); }
function loadHistory(searchTerm = '') {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    if (searchTerm.trim()) history = history.filter(item => `${item.goldType} ${item.weight} ${item.carat}`.toLowerCase().includes(searchTerm.toLowerCase()));
    if (history.length === 0) {
        historyContainer.innerHTML = `<div class="history-empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2"/><path d="M5 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M12 12h.01"/></svg><h3>تاریخچه خالی است</h3><p>${searchTerm ? 'موردی با این مشخصات یافت نشد.' : 'پس از انجام محاسبه، نتایج در اینجا نمایش داده می‌شود.'}</p></div>`;
    } else {
        historyContainer.innerHTML = '';
        history.forEach((item, index) => {
            const itemArticle = renderHistoryItem(item);
            itemArticle.style.animationDelay = `${index * 80}ms`;
            historyContainer.appendChild(itemArticle);
        });
    }
    calculateAndDisplayTotalProfitLoss();
}
function renderHistoryItem(item) {
    if (!item.date) return document.createElement('div');
    const visuals = goldTypeVisuals[item.goldType] || goldTypeVisuals['نو/زینتی'];
    const date = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date));
    const finalValue = item.finalValue || item.originalValue;
    let profitLoss = null;
    let plClass = 'neutral';
    let plLabel = 'سود/زیان';
    const currentPrice18 = goldPrices["طلای 18 عیار"]?.price;
    if (currentPrice18 && finalValue > 0) {
        profitLoss = (item.weight * (currentPrice18 / 750) * item.carat) - finalValue;
        if (profitLoss > 0.01) { plClass = 'profit'; plLabel = 'سود'; }
        else if (profitLoss < -0.01) { plClass = 'loss'; plLabel = 'زیان'; }
        else { plClass = 'neutral'; plLabel = 'سر به سر'; }
    }
    const priceContextHTML = item.basePriceUsed ? `<div class="history-item-price-context">قیمت مبنای محاسبه: <b>${formatterPrice(item.basePriceUsed)} تومان</b></div>` : '';
    let breakdownHTML = '';
    if (typeof item.baseValue !== 'undefined') {
        breakdownHTML = `<table class="history-item-breakdown"><tbody><tr><td>ارزش خام:</td><td>${formatterPrice(item.baseValue.toFixed(0))}</td></tr>`;
        if (item.goldType === 'نو/زینتی') breakdownHTML += `<tr><td>+ اجرت (${item.commission || 0}٪):</td><td>${formatterPrice(item.wageAmount.toFixed(0))}</td></tr>`;
        if (item.goldType !== 'آب‌شده') { breakdownHTML += `<tr><td>+ سود (${item.profit || 0}٪):</td><td>${formatterPrice(item.profitAmount.toFixed(0))}</td></tr><tr><td>+ مالیات (${item.tax || 0}٪):</td><td>${formatterPrice(item.taxAmount.toFixed(0))}</td></tr>`; }
        breakdownHTML += `</tbody></table>`;
    }
    const detailsHTML = `${breakdownHTML}${priceContextHTML}<div class="history-item-footer"><span>ارزش خرید: <b>${formatterPrice(finalValue.toFixed(0))}</b></span></div>`;
    const itemArticle = document.createElement('article');
    itemArticle.className = 'history-item';
    itemArticle.innerHTML = `<div class="history-item-summary" role="button" aria-expanded="false"><div class="history-item-main"><div class="history-item-icon ${visuals.tagClass}">${visuals.icon}</div><div class="history-item-info"><span class="spec">${item.weight} گرم <span class="gold-tag ${visuals.tagClass}">${visuals.label}</span></span><span class="date">${date}</span></div></div><div class="history-item-pl ${plClass}"><span class="pl-label">${plLabel}</span><span class="pl-value">${profitLoss !== null ? formatterPrice(Math.abs(profitLoss).toFixed(0)) : '-'}</span></div></div><div class="history-item-details">${detailsHTML}<div class="history-item-actions-new"><button class="modal-button secondary reuse-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg> استفاده مجدد</button><button class="modal-button danger delete-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> حذف</button></div></div>`;
    const summary = itemArticle.querySelector('.history-item-summary');
    summary.addEventListener('click', () => { itemArticle.classList.toggle('is-open'); summary.setAttribute('aria-expanded', itemArticle.classList.contains('is-open')); });
    itemArticle.querySelector('.reuse-btn').addEventListener('click', (e) => { e.stopPropagation(); reuseCalculation(item.goldType || 'نو/زینتی', item.weight, item.carat, item.commission || 0, item.profit || 0, item.tax || 0); });
    itemArticle.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); showConfirmationModal('آیا از حذف این محاسبه مطمئن هستید؟', () => deleteHistoryItem(item.date)); });
    return itemArticle;
}
function deleteHistoryItem(id) { let h = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; localStorage.setItem(HISTORY_KEY, JSON.stringify(h.filter(item => item.date !== id))); showToast('محاسبه حذف شد.'); loadHistory(historySearchInput.value); }
function reuseCalculation(goldType, weight, carat, commission, profit, tax) {
    document.getElementById('radio-1').checked = true;
    switchCalculatorMode('auto'); 
    
    // Select the correct radio button for gold type
    const typeToSelect = goldType || 'نو/زینتی';
    const radioToSelect = document.querySelector(`input[name="gold-type-auto-tabs"][value="${typeToSelect}"]`);
    if (radioToSelect) {
        radioToSelect.checked = true;
    }

    updateFormVisibility('auto'); 

    document.getElementById('weight-auto').value = weight; 
    if (goldType === 'آب‌شده') {
        document.getElementById('carat-auto').value = carat; 
    } else {
        const caratRadio = document.getElementById(`carat-auto-${carat}`);
        if(caratRadio) caratRadio.checked = true;
    }
    document.getElementById('commission-auto').value = commission || ''; 
    document.getElementById('profit-auto').value = profit || ''; 
    document.getElementById('tax-auto').value = tax || ''; 
    validateForm(autoCalcForm, autoCalcButton, false); 
    document.getElementById('calculator-card').scrollIntoView({ behavior: 'smooth' }); 
}
function calculateAndDisplayTotalProfitLoss() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const currentPrice18 = goldPrices["طلای 18 عیار"]?.price;
    if (!history.length) { totalProfitLossContainer.innerHTML = '<p>موردی برای محاسبه وجود ندارد.</p>'; return; }
    if (!currentPrice18) { totalProfitLossContainer.innerHTML = '<p>قیمت لحظه‌ای برای محاسبه در دسترس نیست.</p>'; return; }
    const totalProfitLoss = history.reduce((acc, item) => {
        if (!item || typeof item.weight === 'undefined' || typeof item.carat === 'undefined' || typeof item.finalValue === 'undefined') {
            return acc;
        }
        return acc + ((item.weight * (currentPrice18 / 750) * item.carat) - item.finalValue);
    }, 0);
    let cssClass = 'neutral';
    if (totalProfitLoss > 0.01) { cssClass = 'profit'; }
    else if (totalProfitLoss < -0.01) { cssClass = 'loss'; }
    totalProfitLossContainer.innerHTML = `<div class="total-profit-loss-display"><span class="label">سود / زیان کلی</span><span class="profit-loss-value ${cssClass}">${formatterPrice(Math.abs(totalProfitLoss).toFixed(0))} تومان</span></div>`;
}

// --- PRICE FETCHING ---
async function fetchPricesFromTgju() {
    autoCalcButton.disabled = true;
    prevGoldPrices = JSON.parse(JSON.stringify(goldPrices));
    const itemIds = ['391292', '137121', '137122', '391295', '137120', '137203'].join(',');
    const targetApiUrl = `https://api.tgju.org/v1/widget/tmp?keys=${itemIds}`;
    const proxiedApiUrl = proxyUrl(targetApiUrl);
    try {
        const response = await fetch(proxiedApiUrl);
        if (!response.ok) throw new Error(`Request through proxy failed: ${response.status}`);
        const data = await response.json();
        if (!data || !data.response || !Array.isArray(data.response.indicators)) throw new Error("Invalid API data structure");
        const priceList = data.response.indicators;
        priceList.forEach(item => {
            const priceData = { price: parseFloat(item.p.replace(/,/g, '')) / 10, changeAmount: parseFloat(item.d.replace(/,/g, '')) / 10, changePercent: item.dp, direction: item.dt };
            if (isNaN(priceData.price)) return;
            switch (item.item_id) {
                case 391292: goldPrices["طلای 18 عیار / 740"] = priceData; break;
                case 137121: goldPrices["طلای 18 عیار"] = priceData; break;
                case 137122: goldPrices["طلای 24 عیار"] = priceData; break;
                case 391295: goldPrices["طلای دست دوم"] = priceData; break;
                case 137120: goldPrices["مثقال طلا"] = priceData; break;
                case 137203: goldPrices["دلار آمریکا"] = priceData; break;
            }
        });
        localStorage.setItem(CACHED_PRICES_KEY, JSON.stringify({ prices: goldPrices, timestamp: new Date().toISOString() }));
        displayPrices();
        lastUpdateTime = new Date();
        displayUpdateStatus();
        startPriceStalenessChecker();
        loadHistory(historySearchInput.value);
        validateForm(autoCalcForm, autoCalcButton, false);
    } catch (error) { console.error("Critical error fetching data:", error); useCachedPrices(); }
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
    const nameMap = { "طلای 18 عیار / 740": "گرم طلای ۱۸ عیار (۷۴۰)", "طلای 18 عیار": "گرم طلای ۱۸ عیار (۷۵۰)", "طلای 24 عیار": "گرم طلای ۲۴ عیار", "طلای دست دوم": "طلای دست دوم", "مثقال طلا": "مثقال طلا", "دلار آمریکا": "دلار" };
    Object.keys(nameMap).forEach(key => {
        const priceData = goldPrices[key];
        const prevPriceData = prevGoldPrices[key];
        let flashClass = '';
        if (priceData && prevPriceData && priceData.price !== prevPriceData.price) { flashClass = priceData.price > prevPriceData.price ? 'flash-up' : 'flash-down'; }
        const row = tbody.insertRow();
        row.className = flashClass;
        row.insertCell(0).textContent = nameMap[key];
        const priceCell = row.insertCell(1);
        if (priceData) {
            const directionClass = priceData.direction === 'high' ? 'up' : 'low';
            const changeHTML = `<div class="price-change ${directionClass}"><span class="price-change-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 8"><path fill="none" stroke="currentcolor" stroke-linecap="round" stroke-width="2" d="m1 6 5-4 5 4"></path></svg></span><span class="change-amount">${formatterPrice(priceData.changeAmount)}</span><span class="change-percent">(${priceData.changePercent}%)</span></div>`;
            priceCell.innerHTML = `<div class="price-cell-content"><span class="price-value">${formatterPrice(priceData.price)}</span>${changeHTML}</div>`;
        } else { priceCell.innerHTML = `<span class="price-value">نامشخص</span>`; }
    });
    priceTable.innerHTML = '<thead><tr><th>نوع</th><th>قیمت (تومان)</th></tr></thead>';
    priceTable.appendChild(tbody);
}
function refreshPrices() { autoCalcButton.disabled = true; priceTable.innerHTML = '<tr><td colspan="2">در حال به‌روزرسانی...</td></tr>'; document.getElementById("update-status-container").innerHTML = ""; fetchPricesFromTgju(); }
function displayUpdateStatus(isCached = false) {
    const container = document.getElementById("update-status-container"); if (!lastUpdateTime) return;
    const timeFormatted = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(lastUpdateTime);
    container.innerHTML = `<div class="update-status" style="display:flex; align-items:center; justify-content:space-between;"><button onclick="refreshPrices()" class="history-action-btn" title="دریافت قیمت جدید" aria-label="دریافت قیمت جدید"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="refresh-icon"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg></button><div class="time-text" id="time-text-container" style="font-size:13px;">آخرین به‌روزرسانی: ${timeFormatted}${isCached ? ' (ذخیره شده)' : ''}</div></div>`;
}
function startPriceStalenessChecker() { if (priceUpdateInterval) clearInterval(priceUpdateInterval); priceUpdateInterval = setInterval(checkPriceStaleness, 10000); }
function checkPriceStaleness() { if (!lastUpdateTime) return; if ((new Date - lastUpdateTime) / 1e3 > 60) { const t = document.getElementById("time-text-container"); t && (t.innerHTML = '<span class="stale-prices">قیمت‌ها نیاز به به‌روزرسانی دارند.</span>'), clearInterval(priceUpdateInterval); } }

// --- UNIT CONVERSION LOGIC ---
function handleConversion() {
    const value = parseFloat(cleanNumber(converterValueInput.value)) || 0;
    if (value <= 0) {
        converterResultDiv.innerHTML = `<p>نتیجه تبدیل در اینجا نمایش داده می‌شود.</p>`;
        return;
    }
    
    const fromUnitRadio = document.querySelector('input[name="from-unit-tabs"]:checked');
    const toUnitRadio = document.querySelector('input[name="to-unit-tabs"]:checked');
    
    if (!fromUnitRadio || !toUnitRadio) return; // Exit if radios are not found

    const fromUnitValue = fromUnitRadio.value;
    const toUnitValue = toUnitRadio.value;
    
    const result = convertUnits(value, fromUnitValue, toUnitValue);
    
    const fromLabel = document.querySelector(`label[for="${fromUnitRadio.id}"]`).textContent;
    const toLabel = document.querySelector(`label[for="${toUnitRadio.id}"]`).textContent;

    converterResultDiv.innerHTML = `<p>${formatterPrice(value)} ${fromLabel} = <br><b>${formatterPrice(result.toFixed(4))} ${toLabel}</b></p>`;
}
function convertUnits(value, from, to) {
    const purities = { '705': 0.705, '750': 0.750, '999': 0.999 };
    const [fromType, fromKarat] = from.split('_');
    const pureGoldGrams = fromType === 'gram' ? value * purities[fromKarat] : (value * MESGHAL_TO_GRAM) * purities[fromKarat];
    const [toType, toKarat] = to.split('_');
    return toType === 'gram' ? pureGoldGrams / purities[toKarat] : (pureGoldGrams / purities[toKarat]) / MESGHAL_TO_GRAM;
}
// --- UTILITY FUNCTIONS ---
function formatNumberInput(input) { let v = cleanNumber(input.value); if (v) input.value = new Intl.NumberFormat('en-US').format(v); }
function formatterPrice(p) { return (p === null || isNaN(p)) ? 'نامشخص' : new Intl.NumberFormat('fa-IR').format(p); }
function isValidInput(w, c) { return !isNaN(w) && !isNaN(c) && w > 0 && c <= 1000; }
function cleanNumber(s) { return String(s).replace(/,/g, ''); }
