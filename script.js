// --- GLOBAL STATE & CONSTANTS ---
const HISTORY_KEY = 'goldCalcHistory';
const MAX_HISTORY_ITEMS = 5;
let lastUpdateTime = null;
let priceUpdateInterval = null;
const goldPrices = {
    "طلای 24 عیار": null,
    "طلای 18 عیار": null,
    "دلار آمریکا": null,
};
const autoCalcButton = document.getElementById('calculate-auto-btn'); // Global reference to the button

// --- INITIALIZATION ---
window.onload = function () {
    setupEventListeners();
    document.getElementById('goldTable').innerHTML = '<tr><th>در حال بارگذاری قیمت‌ها...</th></tr>';
    loadHistory();
    fetchPricesFromTgju();
    switchCalculatorMode('auto');
};

function setupEventListeners() {
    // Tab controls
    document.getElementById('auto-mode-btn').addEventListener('click', () => switchCalculatorMode('auto'));
    document.getElementById('manual-mode-btn').addEventListener('click', () => switchCalculatorMode('manual'));

    // Calculation buttons
    autoCalcButton.addEventListener('click', calculateAuto);
    document.getElementById('calculate-manual-btn').addEventListener('click', calculateManual);

    // Live validation and UX improvements for inputs
    document.querySelectorAll('.calc-input').forEach(input => {
        input.addEventListener('focus', (event) => event.target.select());
        input.addEventListener('input', (event) => validateSingleInput(event.target));
    });
}

// --- VALIDATION ---
function validateSingleInput(inputElement) {
    const value = inputElement.value;
    const errorElement = document.getElementById(inputElement.id + '-error');
    let isValid = true;
    let errorMessage = '';

    const isValidPattern = /^[۰-۹0-9]*\.?[۰-۹0-9]*$/.test(value) && value.indexOf('.') === value.lastIndexOf('.');

    if (!isValidPattern) {
        isValid = false;
        errorMessage = 'فرمت نامعتبر است. فقط از اعداد و یک نقطه استفاده کنید.';
    }
    
    if (value.trim() === '') {
        isValid = false; 
        errorMessage = '';
    }

    if (!isValid) {
        inputElement.classList.add('input-error');
    } else {
        inputElement.classList.remove('input-error');
    }
    errorElement.textContent = errorMessage;
    
    return isValid && value.trim() !== '';
}

// --- TAB & CALCULATION LOGIC ---
function switchCalculatorMode(mode) {
    const autoCalc = document.getElementById('auto-price-calculator');
    const manualCalc = document.getElementById('manual-price-calculator');
    const autoBtn = document.getElementById('auto-mode-btn');
    const manualBtn = document.getElementById('manual-mode-btn');
    if (mode === 'auto') {
        autoCalc.classList.remove('hidden');
        manualCalc.classList.add('hidden');
        autoBtn.classList.add('active-tab');
        manualBtn.classList.remove('active-tab');
    } else {
        manualCalc.classList.remove('hidden');
        autoCalc.classList.add('hidden');
        manualBtn.classList.add('active-tab');
        autoBtn.classList.remove('active-tab');
    }
}

function calculateAuto() {
    const weightInput = document.getElementById('weight-auto');
    const caratInput = document.getElementById('carat-auto');

    const isWeightValid = validateSingleInput(weightInput);
    const isCaratValid = validateSingleInput(caratInput);
    if (!isWeightValid || !isCaratValid) {
        if (!isWeightValid) document.getElementById('weight-auto-error').textContent = 'این فیلد الزامی است.';
        if (!isCaratValid) document.getElementById('carat-auto-error').textContent = 'این فیلد الزامی است.';
        return;
    }

    const weight = parseFloat(convertToEnglishNumerals(weightInput.value));
    const carat = parseFloat(convertToEnglishNumerals(caratInput.value));
    const resultDiv = document.getElementById('result');

    if (!isValidInput(weight, carat)) {
        resultDiv.innerHTML = '<p class="error">مقادیر وارد شده معتبر نیستند.</p>';
        return;
    }

    const totalWeight18 = ((carat * weight) / 750).toFixed(3);
    const price18Toman = goldPrices["طلای 18 عیار"];
    let finalValue = 0;
    let finalValueFormatted = 'قیمت ۱۸ عیار هنوز دریافت نشده است.';

    if (price18Toman) {
        finalValue = totalWeight18 * price18Toman;
        finalValueFormatted = formatterPrice(finalValue.toFixed(0)) + ' تومان';
    }

    const tableHTML = createResultTable(`با قیمت لحظه‌ای (هر گرم طلای ۱۸ عیار: ${formatterPrice(price18Toman) || 'نامشخص'} تومان)`, totalWeight18, finalValueFormatted);
    resultDiv.innerHTML = tableHTML;
    // UPDATED: Save the numeric 'finalValue' for future profit/loss calculation
    saveCalculation({ weight, carat, resultHTML: tableHTML, originalValue: finalValue, date: new Date().toISOString() });
}

function calculateManual() {
    const weightInput = document.getElementById('weight-manual');
    const caratInput = document.getElementById('carat-manual');
    const priceInput = document.getElementById('price-manual');

    const isWeightValid = validateSingleInput(weightInput);
    const isCaratValid = validateSingleInput(caratInput);
    const isPriceValid = validateSingleInput(priceInput);

    if (!isWeightValid || !isCaratValid || !isPriceValid) {
        if (!isWeightValid) document.getElementById('weight-manual-error').textContent = 'این فیلد الزامی است.';
        if (!isCaratValid) document.getElementById('carat-manual-error').textContent = 'این فیلد الزامی است.';
        if (!isPriceValid) document.getElementById('price-manual-error').textContent = 'این فیلد الزامی است.';
        return;
    }
    
    const weight = parseFloat(convertToEnglishNumerals(weightInput.value));
    const carat = parseFloat(convertToEnglishNumerals(caratInput.value));
    const manualPrice = parseFloat(convertToEnglishNumerals(priceInput.value));
    const resultDiv = document.getElementById('result');

    if (!isValidInput(weight, carat) || !manualPrice || manualPrice <= 0) {
        resultDiv.innerHTML = '<p class="error">مقادیر وارد شده معتبر نیستند.</p>';
        return;
    }

    const totalWeight18 = ((carat * weight) / 750).toFixed(3);
    const finalValue = totalWeight18 * manualPrice;
    const finalValueFormatted = formatterPrice(finalValue.toFixed(0)) + ' تومان';
    const tableHTML = createResultTable(`با قیمت دستی (هر گرم طلای ۱۸ عیار: ${formatterPrice(manualPrice)} تومان)`, totalWeight18, finalValueFormatted);
    resultDiv.innerHTML = tableHTML;
    // UPDATED: Save the numeric 'finalValue' for future profit/loss calculation
    saveCalculation({ weight, carat, resultHTML: tableHTML, originalValue: finalValue, date: new Date().toISOString() });
}

function createResultTable(calculationType, weight18, value) {
    return `
        <p style="font-size: 14px; color: #666; text-align:center;">${calculationType}</p>
        <table style="width: 100%; margin-top: 10px;">
            <tbody>
                <tr><td>معادل طلای ۱۸ عیار (۷۵۰)</td><td>${weight18} گرم</td></tr>
                <tr><td>ارزش نهایی</td><td><b>${value}</b></td></tr>
            </tbody>
        </table>`;
}

// --- HISTORY MANAGEMENT ---
function loadHistory() {
    const historyContainer = document.getElementById('history-container');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    historyContainer.innerHTML = '';
    if (history.length === 0) {
        historyContainer.innerHTML = '<p>هنوز محاسبه‌ای ذخیره نشده است.</p>';
        return;
    }
    history.forEach(item => renderHistoryItem(item));
}

function saveCalculation(calculationData) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    history.unshift(calculationData);
    history = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
}

function renderHistoryItem(item) {
    const historyContainer = document.getElementById('history-container');
    const historyItemDiv = document.createElement('div');
    historyItemDiv.className = 'history-item';
    historyItemDiv.setAttribute('data-id', item.date);
    
    // NEW: Profit/Loss Calculation Logic
    let profitLossHTML = '';
    const currentPrice18Toman = goldPrices["طلای 18 عیار"];
    // Check if we have the original value and a current price to compare against
    if (currentPrice18Toman && item.originalValue > 0) {
        const totalWeight18 = ((item.carat * item.weight) / 750);
        const currentValue = totalWeight18 * currentPrice18Toman;
        const profitLoss = currentValue - item.originalValue;
        
        const isProfit = profitLoss >= 0;
        const cssClass = isProfit ? 'profit' : 'loss';
        const sign = isProfit ? '+' : '';
        const formattedProfitLoss = formatterPrice(Math.abs(profitLoss).toFixed(0));

        profitLossHTML = `
            <div class="profit-loss-container">
                <span>سود/زیان لحظه‌ای: </span>
                <span class="${cssClass}">${sign}${formattedProfitLoss} تومان</span>
            </div>
        `;
    }

    const formattedDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date));
    historyItemDiv.innerHTML = `
        <div class="history-item-header">
            <div><span>${item.weight}</span> گرم با عیار <span>${item.carat}</span></div>
            <div class="history-item-actions">
                 <time datetime="${item.date}">${formattedDate}</time>
                 <button onclick="deleteHistoryItem('${item.date}')" class="delete-history-btn" title="حذف این محاسبه">×</button>
            </div>
        </div>
        ${item.resultHTML}
        ${profitLossHTML}`; // Append the profit/loss section here
    historyContainer.appendChild(historyItemDiv);
}

function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const updatedHistory = history.filter(item => item.date !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    loadHistory();
}

// --- PRICE FETCHING & DISPLAY ---
async function fetchPricesFromTgju() {
    autoCalcButton.disabled = true; // Ensure button is disabled during fetch
    const urls = {
        geram18: 'https://www.tgju.org/profile/geram18',
        geram24: 'https://www.tgju.org/profile/geram24',
        dollar: 'https://www.tgju.org/profile/price_dollar_rl',
    };
    const priceSelector = "#main > div.stocks-profile > div.stocks-header > div.stocks-header-main > div > div.fs-cell.fs-xl-2.fs-lg-2.fs-md-6.fs-sm-6.fs-xs-6.top-header-item-block-3 > div > h3.line.clearfix > span.value > span:nth-child(1)";
    const proxyUrl = (targetUrl) => `https://gold-proxy.epfereydoon.workers.dev/?url=${encodeURIComponent(targetUrl)}`;

    try {
        const [res18, res24, resDollar] = await Promise.all([fetch(proxyUrl(urls.geram18)), fetch(proxyUrl(urls.geram24)), fetch(proxyUrl(urls.dollar))]);
        const [html18, html24, htmlDollar] = await Promise.all([res18.text(), res24.text(), resDollar.text()]);
        const parser = new DOMParser();
        goldPrices['طلای 18 عیار'] = cleanPrice(parser.parseFromString(html18, 'text/html').querySelector(priceSelector)?.textContent) / 10;
        goldPrices['طلای 24 عیار'] = cleanPrice(parser.parseFromString(html24, 'text/html').querySelector(priceSelector)?.textContent) / 10;
        goldPrices['دلار آمریکا'] = cleanPrice(parser.parseFromString(htmlDollar, 'text/html').querySelector(priceSelector)?.textContent) / 10;
        
        displayPrices(goldPrices);
        lastUpdateTime = new Date();
        displayUpdateStatus();
        startPriceStalenessChecker();

        // NEW: Reload history to show profit/loss after fetching prices
        loadHistory(); 
        
        if (goldPrices['طلای 18 عیار']) {
            autoCalcButton.disabled = false;
        }

    } catch (error) {
        console.error("خطا در استخراج داده‌ها:", error);
        document.getElementById('goldTable').innerHTML = '<tr><th class="error">خطا: استخراج قیمت‌ها ناموفق بود.</th></tr>';
        document.getElementById('update-status-container').innerHTML = '<p class="error">امکان دریافت قیمت وجود ندارد.</p>';
        autoCalcButton.disabled = true;
    }
}

function displayPrices(prices) {
    const table = document.getElementById('goldTable');
    table.innerHTML = '<thead><tr><th>نوع</th><th>قیمت (تومان)</th></tr></thead>';
    const tbody = document.createElement('tbody');
    const displayNameMap = { "طلای 24 عیار": "یک گرم طلای 24 عیار", "طلای 18 عیار": "یک گرم طلای 18 عیار", "دلار آمریکا": "یک دلار آمریکا" };
    Object.entries(prices).forEach(([type, price]) => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = displayNameMap[type] || type;
        row.insertCell(1).textContent = price ? formatterPrice(price) : 'نامشخص';
    });
    table.appendChild(tbody);
}

// --- UPDATE STATUS & REFRESH LOGIC ---
function refreshPrices() {
    autoCalcButton.disabled = true;
    document.getElementById('goldTable').innerHTML = '<tr><th>در حال به‌روزرسانی قیمت‌ها...</th></tr>';
    document.getElementById('update-status-container').innerHTML = '';
    fetchPricesFromTgju();
}

function displayUpdateStatus() {
    const container = document.getElementById('update-status-container');
    if (!lastUpdateTime) return;
    const formattedTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(lastUpdateTime);
    container.innerHTML = `
        <div class="update-status">
            <button onclick="refreshPrices()" class="refresh-button" title="دریافت قیمت جدید">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="refresh-icon"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
            </button>
            <div class="time-text" id="time-text-container"><span>آخرین به‌روزرسانی: ${formattedTime}</span></div>
        </div>`;
}

function startPriceStalenessChecker() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    priceUpdateInterval = setInterval(checkPriceStaleness, 5000);
}

function checkPriceStaleness() {
    if (!lastUpdateTime) return;
    const diffSeconds = (new Date() - lastUpdateTime) / 1000;
    if (diffSeconds > 60) {
        const container = document.getElementById('time-text-container');
        if (container) container.innerHTML = '<span class="stale-prices">بیش از یک دقیقه از آخرین قیمت‌گیری گذشته، به‌روزرسانی کنید.</span>';
        clearInterval(priceUpdateInterval);
    }
}

// --- UTILITY FUNCTIONS ---
function convertToEnglishNumerals(str) {
    if (!str) return '';
    return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
              .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
function formatterPrice(price) { return (price === null || isNaN(price)) ? 'نامشخص' : new Intl.NumberFormat('fa-IR').format(price); }
function isValidInput(weight, carat) { return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat > 0 && carat <= 1000; }
function cleanPrice(priceString) { return priceString ? parseInt(String(priceString).replace(/,/g, '')) : null; }
