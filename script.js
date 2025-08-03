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

// --- INITIALIZATION ---
window.onload = function () {
    const goldTable = document.getElementById('goldTable');
    goldTable.innerHTML = '<tr><th>در حال بارگذاری قیمت‌ها  ...</th></tr>';

    loadHistory();
    fetchPricesFromTgju();
};

// --- CORE CALCULATION LOGIC ---
function convertCarat() {
    const weight = parseFloat(document.getElementById('weight').value);
    const carat = parseFloat(document.getElementById('carat').value);
    const resultDiv = document.getElementById('result');

    if (!isValidInput(weight, carat)) {
        resultDiv.innerHTML = '<p class="error">لطفاً وزن و عیار را به درستی وارد کنید!</p>';
        return;
    }

    const totalWeight24 = ((carat * weight) / 1000).toFixed(3);
    const totalWeight18 = ((carat * weight) / 750).toFixed(3);

    const price18Toman = goldPrices["طلای 18 عیار"];
    let finalValueFormatted = 'قیمت ۱۸ عیار هنوز دریافت نشده است.';

    if (price18Toman) {
        const finalValue = totalWeight18 * price18Toman;
        finalValueFormatted = formatterPrice(finalValue.toFixed(0)) + ' تومان';
    }

    const tableHTML = `
        <table style="width: 100%;">
            <thead>
                <tr>
                    <th>عنوان</th>
                    <th>مقدار</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>نسبت به وزن طلای 24 عیار</td>
                    <td>${totalWeight24} گرم</td>
                </tr>
                <tr>
                    <td>نسبت به وزن طلای 18 عیار</td>
                    <td>${totalWeight18} گرم</td>
                </tr>
                <tr>
                    <td>ارزش تقریبی طلا</td>
                    <td><b>${finalValueFormatted}</b></td>
                </tr>
            </tbody>
        </table>
    `;
    resultDiv.innerHTML = tableHTML;

    saveCalculation({
        weight,
        carat,
        resultHTML: tableHTML,
        date: new Date().toISOString()
    });
}

// --- HISTORY (LOCAL STORAGE) MANAGEMENT ---
function loadHistory() {
    const historyContainer = document.getElementById('history-container');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];

    if (history.length === 0) {
        historyContainer.innerHTML = '<p>هنوز محاسبه‌ای ذخیره نشده است.</p>';
        return;
    }

    historyContainer.innerHTML = '';
    history.forEach(item => renderHistoryItem(item, false));
}

function saveCalculation(calculationData) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    history.unshift(calculationData);
    history = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    renderHistoryItem(calculationData, true);
}

function renderHistoryItem(item, isNew) {
    const historyContainer = document.getElementById('history-container');
    if (historyContainer.querySelector('p')) {
        historyContainer.innerHTML = '';
    }

    const historyItemDiv = document.createElement('div');
    historyItemDiv.className = 'history-item';
    historyItemDiv.setAttribute('data-id', item.date);

    const formattedDate = new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(new Date(item.date));

    historyItemDiv.innerHTML = `
        <div class="history-item-header">
            <div>
                <span>${item.weight}</span> گرم با عیار <span>${item.carat}</span>
            </div>
            <div class="history-item-actions">
                 <time datetime="${item.date}">${formattedDate}</time>
                 <button onclick="deleteHistoryItem('${item.date}')" class="delete-history-btn" title="حذف این محاسبه">×</button>
            </div>
        </div>
        ${item.resultHTML}
    `;

    if (isNew) {
        historyContainer.prepend(historyItemDiv);
        const allItems = historyContainer.getElementsByClassName('history-item');
        if (allItems.length > MAX_HISTORY_ITEMS) {
            allItems[allItems.length - 1].remove();
        }
    } else {
        historyContainer.appendChild(historyItemDiv);
    }
}

function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const updatedHistory = history.filter(item => item.date !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

    const elementToDelete = document.querySelector(`.history-item[data-id="${id}"]`);
    if (elementToDelete) {
        elementToDelete.remove();
    }
    
    const historyContainer = document.getElementById('history-container');
    if (updatedHistory.length === 0) {
        historyContainer.innerHTML = '<p>هنوز محاسبه‌ای ذخیره نشده است.</p>';
    }
}

// --- PRICE FETCHING & DISPLAY ---
async function fetchPricesFromTgju() {
    const urls = {
        geram18: 'https://www.tgju.org/profile/geram18',
        geram24: 'https://www.tgju.org/profile/geram24',
        dollar: 'https://www.tgju.org/profile/price_dollar_rl',
    };

    const priceSelector = "#main > div.stocks-profile > div.stocks-header > div.stocks-header-main > div > div.fs-cell.fs-xl-2.fs-lg-2.fs-md-6.fs-sm-6.fs-xs-6.top-header-item-block-3 > div > h3.line.clearfix > span.value > span:nth-child(1)";
    const proxyUrl = (targetUrl) => `https://gold-proxy.epfereydoon.workers.dev/?url=${encodeURIComponent(targetUrl)}`;

    try {
        const [response18, response24, responseDollar] = await Promise.all([
            fetch(proxyUrl(urls.geram18)),
            fetch(proxyUrl(urls.geram24)),
            fetch(proxyUrl(urls.dollar))
        ]);

        if (!response18.ok || !response24.ok || !responseDollar.ok) {
            throw new Error(`پاسخ از پراکسی شما با خطا مواجه شد.`);
        }

        const [html18, html24, htmlDollar] = await Promise.all([
            response18.text(),
            response24.text(),
            responseDollar.text()
        ]);
        
        const parser = new DOMParser();
        const doc18 = parser.parseFromString(html18, 'text/html');
        const doc24 = parser.parseFromString(html24, 'text/html');
        const docDollar = parser.parseFromString(htmlDollar, 'text/html');

        const price18Element = doc18.querySelector(priceSelector);
        const price24Element = doc24.querySelector(priceSelector);
        const priceDollarElement = docDollar.querySelector(priceSelector);
        
        const price18RialString = price18Element ? price18Element.textContent.trim() : null;
        if (price18RialString) {
            goldPrices['طلای 18 عیار'] = cleanPrice(price18RialString) / 10;
        }

        const price24RialString = price24Element ? price24Element.textContent.trim() : null;
        if(price24RialString) {
            goldPrices['طلای 24 عیار'] = cleanPrice(price24RialString) / 10;
        }

        const priceDollarRialString = priceDollarElement ? priceDollarElement.textContent.trim() : null;
        if (priceDollarRialString) {
            goldPrices['دلار آمریکا'] = cleanPrice(priceDollarRialString) / 10;
        }
        
        displayPrices(goldPrices);
        
        lastUpdateTime = new Date();
        displayUpdateStatus();
        startPriceStalenessChecker();

    } catch (error) {
        console.error("خطا در استخراج داده‌ها:", error);
        document.getElementById('goldTable').innerHTML = '<tr><th class="error">خطا: استخراج قیمت‌ها ناموفق بود.</th></tr>';
        document.getElementById('update-status-container').innerHTML = '<p class="error">امکان دریافت قیمت وجود ندارد.</p>';
    }
}

// UPDATED: This function is changed to match your requested format.
function displayPrices(prices) {
    const table = document.getElementById('goldTable');
    table.innerHTML = '<thead><tr><th>نوع</th><th>قیمت (تومان)</th></tr></thead>';
    const tbody = document.createElement('tbody');

    // A map to convert internal keys to user-friendly display names
    const displayNameMap = {
        "طلای 24 عیار": "یک گرم طلای 24 عیار",
        "طلای 18 عیار": "یک گرم طلای 18 عیار",
        "دلار آمریکا": "یک دلار آمریکا"
    };

    Object.entries(prices).forEach(([type, price]) => {
        const row = tbody.insertRow();
        
        // Use the map to get the display name, or fall back to the original key
        const displayName = displayNameMap[type] || type;
        row.insertCell(0).textContent = displayName;

        const priceText = price ? formatterPrice(price) : 'نامشخص';
        row.insertCell(1).textContent = priceText;
    });

    table.appendChild(tbody);
}


// --- UPDATE STATUS & REFRESH LOGIC ---
function refreshPrices() {
    const goldTable = document.getElementById('goldTable');
    goldTable.innerHTML = '<tr><th>در حال به‌روزرسانی قیمت‌ها ...</th></tr>';
    document.getElementById('update-status-container').innerHTML = '';
    fetchPricesFromTgju();
}

function displayUpdateStatus() {
    const container = document.getElementById('update-status-container');
    if (!lastUpdateTime) {
        container.innerHTML = '';
        return;
    }
    const formattedTime = new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(lastUpdateTime);
    
    container.innerHTML = `
        <div class="update-status">
            <button onclick="refreshPrices()" class="refresh-button" title="دریافت قیمت جدید">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="refresh-icon">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M8 16H3v5"></path>
                </svg>
            </button>
            <div class="time-text" id="time-text-container">
                <span>آخرین به‌روزرسانی: ${formattedTime}</span>
            </div>
        </div>
    `;
}

function startPriceStalenessChecker() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    priceUpdateInterval = setInterval(checkPriceStaleness, 5000);
}

function checkPriceStaleness() {
    if (!lastUpdateTime) return;
    
    const now = new Date();
    const diffSeconds = (now - lastUpdateTime) / 1000;

    if (diffSeconds > 60) {
        const container = document.getElementById('time-text-container');
        if (container) {
            container.innerHTML = '<span class="stale-prices">بیش از یک دقیقه از آخرین قیمت‌گیری گذشته، به‌روزرسانی کنید.</span>';
        }
        clearInterval(priceUpdateInterval);
    }
}


// --- UTILITY FUNCTIONS ---
function formatterPrice(price) {
    if (price === null || isNaN(price)) return 'نامشخص';
    return new Intl.NumberFormat('fa-IR').format(price);
}

function isValidInput(weight, carat) {
    return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat > 0 && carat <= 1000;
}

function cleanPrice(priceString) {
    if (!priceString) return null;
    return parseInt(priceString.replace(/,/g, ''));
}
