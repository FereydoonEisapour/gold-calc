// --- GLOBAL STATE & CONSTANTS ---
const HISTORY_KEY = 'goldCalcHistory';
const MAX_HISTORY_ITEMS = 7;
let lastUpdateTime = null;
let priceUpdateInterval = null;
const goldPrices = { "طلای 18 عیار": null, "طلای 24 عیار": null, "دلار آمریکا": null };
let prevGoldPrices = { ...goldPrices };

// --- DOM References ---
const autoCalcForm = document.getElementById('auto-price-calculator');
const manualCalcForm = document.getElementById('manual-price-calculator');
const autoCalcButton = document.getElementById('calculate-auto-btn');
const manualCalcButton = document.getElementById('calculate-manual-btn');
const historyContainer = document.getElementById('history-container');
const priceTable = document.getElementById('goldTable');
const resultDiv = document.getElementById('result');
const themeToggleButton = document.getElementById('theme-toggle-btn');
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');
const totalProfitLossContainer = document.getElementById('total-profit-loss-container');
const toastContainer = document.getElementById('toast-container');

// --- INITIALIZATION ---
// UPDATED: Removed redundant switchCalculatorMode call from onload
window.onload = function () {
    applyInitialTheme();
    setupEventListeners();
    setupParticleAnimation();
    priceTable.innerHTML = '<tr><td colspan="2">در حال بارگذاری قیمت‌ها...</td></tr>';
    loadHistory();
    fetchPricesFromTgju();
    // Validate the initially visible form. The page is already in the correct state.
    validateForm(autoCalcForm, autoCalcButton, false);
};

function setupEventListeners() {
    themeToggleButton.addEventListener('click', toggleTheme);
    document.getElementById('auto-mode-btn').addEventListener('click', () => switchCalculatorMode('auto'));
    document.getElementById('manual-mode-btn').addEventListener('click', () => switchCalculatorMode('manual'));
    autoCalcButton.addEventListener('click', () => calculateAuto(true));
    manualCalcButton.addEventListener('click', () => calculateManual(true));

    document.querySelectorAll('.calc-input').forEach(input => {
        input.addEventListener('input', (event) => {
            if (event.target.id === 'price-manual') formatNumberInput(event.target);
            const form = event.target.closest('div[id$="-calculator"]');
            const button = form.querySelector('button[id^="calculate-"]');
            validateForm(form, button, false);
        });
    });
}

// --- TAB & MODE SWITCHING ---
// UPDATED: Rewrote the function to be more robust and clear
function switchCalculatorMode(mode) {
    const isAuto = mode === 'auto';
    const autoBtn = document.getElementById('auto-mode-btn');
    const manualBtn = document.getElementById('manual-mode-btn');

    if (isAuto) {
        autoCalcForm.classList.remove('hidden');
        manualCalcForm.classList.add('hidden');
        autoBtn.classList.add('active-tab');
        manualBtn.classList.remove('active-tab');
        validateForm(autoCalcForm, autoCalcButton, false);
    } else {
        autoCalcForm.classList.add('hidden');
        manualCalcForm.classList.remove('hidden');
        autoBtn.classList.remove('active-tab');
        manualBtn.classList.add('active-tab');
        validateForm(manualCalcForm, manualCalcButton, false);
    }
}


// --- THEME & PARTICLE CODE (UNCHANGED) ---
function applyInitialTheme(){const t=localStorage.getItem("theme")||"light";document.body.classList.toggle("dark-mode","dark"===t),updateThemeIcons(t)}function toggleTheme(){const t=document.body.classList.toggle("dark-mode"),e=t?"dark":"light";localStorage.setItem("theme",e),updateThemeIcons(e)}function updateThemeIcons(t){sunIcon&&moonIcon&&(sunIcon.classList.toggle("hidden","dark"===t),moonIcon.classList.toggle("hidden","light"===t))}function setupParticleAnimation(){const t=document.getElementById("particle-canvas");if(!t)return;const e=t.getContext("2d");let a;function n(){t.width=window.innerWidth,t.height=window.innerHeight}class i{constructor(){this.x=Math.random()*t.width,this.y=Math.random()*t.height,this.size=2.5*Math.random()+1,this.speedX=.8*Math.random()-.4,this.speedY=.8*Math.random()-.4}update(){this.x+=this.speedX,this.y+=this.speedY,this.x>t.width+5&&(this.x=-5),this.x<-5&&(this.x=t.width+5),this.y>t.height+5&&(this.y=-5),this.y<-5&&(this.y=t.height+5)}draw(){e.beginPath();const a=e.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size);a.addColorStop(0,"rgba(212, 175, 55, 0.8)"),a.addColorStop(1,"rgba(212, 175, 55, 0)"),e.fillStyle=a,e.arc(this.x,this.y,2*this.size,0,2*Math.PI),e.fill()}}function s(){n(),a=[];const t=(window.innerHeight*window.innerWidth)/9e3;for(let e=0;e<t;e++)a.push(new i)}function o(){e.clearRect(0,0,t.width,t.height);for(let t=0;t<a.length;t++)a[t].update(),a[t].draw();requestAnimationFrame(o)}s(),o(),window.addEventListener("resize",()=>{clearTimeout(window.resizedFinished),window.resizedFinished=setTimeout(s,150)})}


// --- INPUT VALIDATION ---
function validateSingleInput(input, showRequiredError) {
    const value = cleanNumber(input.value);
    const errorElement = document.getElementById(input.id + '-error');
    let errorMessage = '';
    const isCommission = input.id.includes('commission');

    if (value.trim() === '') {
        if (showRequiredError && !isCommission) errorMessage = 'این فیلد الزامی است.';
    } else if (!/^\d*\.?\d*$/.test(value)) {
        errorMessage = 'لطفا فقط از اعداد و یک نقطه استفاده کنید.';
    } else {
        const numValue = parseFloat(value);
        if (numValue < 0) errorMessage = 'مقدار نمی‌تواند منفی باشد.';
        else if (numValue === 0 && !isCommission) errorMessage = 'مقدار باید بزرگتر از صفر باشد.';
        else if (input.id.includes('carat') && numValue > 1000) errorMessage = 'عیار نمی‌تواند بیشتر از ۱۰۰۰ باشد.';
    }

    input.classList.toggle('input-error', !!errorMessage);
    if(errorElement) errorElement.textContent = errorMessage;
    
    return errorMessage === ''
}

function validateForm(form, button, showRequiredError) {
    const inputs = form.querySelectorAll('.calc-input');
    let isFormValid = true;
    inputs.forEach(input => {
        if (!validateSingleInput(input, showRequiredError)) {
            isFormValid = false;
        }
    });
    button.disabled = !isFormValid;
    return isFormValid;
}

// --- CALCULATION LOGIC ---
function calculate(weight, carat, price18, commission, isAuto) {
    if (!isValidInput(weight, carat) || !price18) {
        resultDiv.innerHTML = '<p class="error">مقادیر وارد شده یا قیمت لحظه‌ای معتبر نیست.</p>';
        return;
    }
    const rawValue = ((carat * weight) / 750) * price18;
    const commissionAmount = rawValue * (commission / 100);
    const finalValue = rawValue + commissionAmount;
    
    const calcType = isAuto ? `با قیمت لحظه‌ای (هر گرم: ${formatterPrice(price18)} تومان)` : `با قیمت دستی (هر گرم: ${formatterPrice(price18)} تومان)`;
    const resultData = {
        weight, carat, commission, rawValue, commissionAmount, finalValue, calcType
    };

    resultDiv.innerHTML = createResultTable(resultData);
    setupShareButton(resultData);
    
    saveCalculation({ weight, carat, commission, originalValue: finalValue, date: new Date().toISOString() });
}

function calculateAuto(showErrors) {
    if (!validateForm(autoCalcForm, autoCalcButton, showErrors)) return;
    const weight = parseFloat(cleanNumber(document.getElementById('weight-auto').value));
    const carat = parseFloat(cleanNumber(document.getElementById('carat-auto').value));
    const commission = parseFloat(cleanNumber(document.getElementById('commission-auto').value)) || 0;
    calculate(weight, carat, goldPrices["طلای 18 عیار"], commission, true);
}

function calculateManual(showErrors) {
    if (!validateForm(manualCalcForm, manualCalcButton, showErrors)) return;
    const weight = parseFloat(cleanNumber(document.getElementById('weight-manual').value));
    const carat = parseFloat(cleanNumber(document.getElementById('carat-manual').value));
    const commission = parseFloat(cleanNumber(document.getElementById('commission-manual').value)) || 0;
    const manualPrice = parseFloat(cleanNumber(document.getElementById('price-manual').value));
    calculate(weight, carat, manualPrice, commission, false);
}

function createResultTable(data) {
    let tableHTML = `<p style="font-size: 14px; color: #666; text-align:center;">${data.calcType}</p>
        <table style="width: 100%;" class="result-table"><tbody>
        <tr><td>ارزش خام طلا</td><td>${formatterPrice(data.rawValue.toFixed(0))} تومان</td></tr>`;

    if (data.commission > 0) {
        tableHTML += `<tr><td>کارمزد (${data.commission}٪)</td><td>${formatterPrice(data.commissionAmount.toFixed(0))} تومان</td></tr>`;
    }

    tableHTML += `<tr><td>مبلغ نهایی</td><td><b>${formatterPrice(data.finalValue.toFixed(0))} تومان</b></td></tr>
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

    const shareText = `محاسبه قیمت طلا:
- وزن: ${data.weight} گرم
- عیار: ${data.carat}
- کارمزد: ${data.commission}%
- ارزش نهایی: ${formatterPrice(data.finalValue.toFixed(0))} تومان`;

    shareBtn.addEventListener('click', async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'نتیجه محاسبه قیمت طلا', text: shareText });
            } catch (error) {
                console.error('خطا در اشتراک‌گذاری:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('نتیجه در کلیپ‌بورد کپی شد');
            }).catch(err => {
                console.error('خطا در کپی کردن:', err);
                showToast('خطا در کپی کردن', 'error');
            });
        }
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- HISTORY MANAGEMENT ---
function saveCalculation(data) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    history.unshift(data);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
    showToast('محاسبه ذخیره شد');
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    historyContainer.innerHTML = '';
    if (history.length === 0) {
        historyContainer.innerHTML = '<p>هنوز محاسبه‌ای انجام نشده است.</p>';
    } else {
        history.forEach(item => renderHistoryItem(item));
    }
    calculateAndDisplayTotalProfitLoss();
}

function renderHistoryItem(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'history-item';
    itemDiv.setAttribute('data-id', item.date);

    let profitLossSpan = '';
    const currentPrice18 = goldPrices["طلای 18 عیار"];
    if (currentPrice18 && item.originalValue > 0) {
        const rawCurrentValue = ((item.carat * item.weight) / 750) * currentPrice18;
        const profitLoss = rawCurrentValue - item.originalValue;
        const isProfit = profitLoss >= 0;
        const cssClass = isProfit ? 'profit' : 'loss';
        
        profitLossSpan = ` | سود/زیان: <span class="profit-loss-value ${cssClass}">${formatterPrice(Math.abs(profitLoss).toFixed(0))}</span>`;
    }

    const date = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date));
    itemDiv.innerHTML = `
        <div class="history-item-header">
            <span class="spec">${item.weight} گرم - عیار ${item.carat}</span>
            <time datetime="${item.date}" style="font-size:12px;">${date}</time>
        </div>
        <div class="history-item-actions">
            <button onclick="reuseCalculation(${item.weight}, ${item.carat}, ${item.commission || 0})" class="history-action-btn" title="استفاده مجدد">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>
            </button>
            <button onclick="deleteHistoryItem('${item.date}')" class="history-action-btn delete-history-btn" title="حذف">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
        <div class="history-item-details">
            ارزش خرید: <b>${formatterPrice(item.originalValue.toFixed(0))} تومان</b>${profitLossSpan}
        </div>`;
    historyContainer.appendChild(itemDiv);
}

function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter(item => item.date !== id)));
    loadHistory();
}

function reuseCalculation(weight, carat, commission) {
    switchCalculatorMode('auto');
    document.getElementById('weight-auto').value = weight;
    document.getElementById('carat-auto').value = carat;
    document.getElementById('commission-auto').value = commission || '';
    validateForm(autoCalcForm, autoCalcButton, false);
    document.getElementById('calculator-card').scrollIntoView({ behavior: 'smooth' });
}

// --- TOTAL PROFIT/LOSS CALCULATION ---
function calculateAndDisplayTotalProfitLoss() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    const currentPrice18 = goldPrices["طلای 18 عیار"];

    if (history.length === 0) {
        totalProfitLossContainer.innerHTML = '<p>موردی برای محاسبه وجود ندارد.</p>';
        return;
    }
    if (!currentPrice18) {
        totalProfitLossContainer.innerHTML = '<p>قیمت لحظه‌ای برای محاسبه در دسترس نیست.</p>';
        return;
    }

    let totalProfitLoss = 0;
    history.forEach(item => {
        const rawCurrentValue = ((item.carat * item.weight) / 750) * currentPrice18;
        totalProfitLoss += (rawCurrentValue - item.originalValue);
    });

    const isProfit = totalProfitLoss >= 0;
    const cssClass = isProfit ? 'profit' : 'loss';
    const formattedValue = formatterPrice(Math.abs(totalProfitLoss).toFixed(0));

    totalProfitLossContainer.innerHTML = `
        <div class="total-profit-loss-display">
            <span class="label">سود / زیان کلی</span>
            <span class="profit-loss-value ${cssClass}">${formattedValue} تومان</span>
        </div>`;
}


// --- PRICE FETCHING & DISPLAY ---
async function fetchPricesFromTgju() {
    autoCalcButton.disabled = true;
    prevGoldPrices = { ...goldPrices }; 
    const urls = {
        geram18: 'https://www.tgju.org/profile/geram18',
        geram24: 'https://www.tgju.org/profile/geram24',
        dollar: 'https://www.tgju.org/profile/price_dollar_rl',
    };
    const priceSelector = "h3.line.clearfix > span.value > span:nth-child(1)";
    const proxyUrl = (targetUrl) => `https://gold-proxy.epfereydoon.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
    
    try {
        const responses = await Promise.all([fetch(proxyUrl(urls.geram18)), fetch(proxyUrl(urls.geram24)), fetch(proxyUrl(urls.dollar))]);
        const htmls = await Promise.all(responses.map(res => res.text()));
        const parser = new DOMParser();
        
        goldPrices['طلای 18 عیار'] = cleanPrice(parser.parseFromString(htmls[0], 'text/html').querySelector(priceSelector)?.textContent) / 10;
        goldPrices['طلای 24 عیار'] = cleanPrice(parser.parseFromString(htmls[1], 'text/html').querySelector(priceSelector)?.textContent) / 10;
        goldPrices['دلار آمریکا'] = cleanPrice(parser.parseFromString(htmls[2], 'text/html').querySelector(priceSelector)?.textContent) / 10;

        displayPrices();
        lastUpdateTime = new Date();
        displayUpdateStatus();
        startPriceStalenessChecker();
        loadHistory(); 
        validateForm(autoCalcForm, autoCalcButton, false);
    } catch (error) {
        console.error("Error fetching data:", error);
        priceTable.innerHTML = '<tr><td colspan="2" class="error">خطا در دریافت قیمت‌ها.</td></tr>';
        document.getElementById('update-status-container').innerHTML = '<p class="error">امکان دریافت قیمت وجود ندارد.</p>';
        autoCalcButton.disabled = true;
    }
}

function displayPrices() {const tbody=document.createElement("tbody"),nameMap={"طلای 18 عیار":"گرم طلای ۱۸ عیار","طلای 24 عیار":"گرم طلای ۲۴ عیار","دلار آمریکا":"دلار آمریکا"};Object.entries(goldPrices).forEach(([t,e])=>{const a=prevGoldPrices[t];let n="",i="";e&&a&&e!==a&&(diff=e-a,isUp=diff>0,i=isUp?"flash-up":"flash-down",n=`<span class="price-change ${isUp?"up":"down"}"><span class="arrow">${isUp?"▲":"▼"}</span>${formatterPrice(Math.abs(diff))}</span>`);const s=tbody.insertRow();s.className=i,s.insertCell(0).textContent=nameMap[t]||t;const o=s.insertCell(1);o.innerHTML=`<span class="price-value">${e?formatterPrice(e):"نامشخص"}</span> ${n}`}),priceTable.innerHTML="<thead><tr><th>نوع</th><th>قیمت (تومان)</th></tr></thead>",priceTable.appendChild(tbody);}
function refreshPrices() {autoCalcButton.disabled=!0,priceTable.innerHTML='<tr><td colspan="2">در حال به‌روزرسانی...</td></tr>',document.getElementById("update-status-container").innerHTML="",fetchPricesFromTgju();}
function displayUpdateStatus() {const t=document.getElementById("update-status-container");if(!lastUpdateTime)return;const e=(new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"})).format(lastUpdateTime);t.innerHTML=`<div class="update-status" style="display:flex; align-items:center; justify-content:space-between;">
            <button onclick="refreshPrices()" class="history-action-btn" title="دریافت قیمت جدید">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="refresh-icon"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
            </button>
            <div class="time-text" id="time-text-container" style="font-size:13px;">آخرین به‌روزرسانی: ${e}</div>
        </div>`}
function startPriceStalenessChecker() {priceUpdateInterval&&clearInterval(priceUpdateInterval),priceUpdateInterval=setInterval(checkPriceStaleness,5e3);}
function checkPriceStaleness() {if(!lastUpdateTime)return;const t=(new Date-lastUpdateTime)/1e3;if(t>60){const t=document.getElementById("time-text-container");t&&(t.innerHTML='<span class="stale-prices">قیمت‌ها نیاز به به‌روزرسانی دارند.</span>'),clearInterval(priceUpdateInterval)}}

// --- UTILITY FUNCTIONS ---
function formatNumberInput(input) { let value = cleanNumber(input.value); if (input.value !== '') { input.value = new Intl.NumberFormat('en-US').format(value); } }
function formatterPrice(price) { return (price === null || isNaN(price)) ? 'نامشخص' : new Intl.NumberFormat('fa-IR').format(price); }
function isValidInput(weight, carat) { return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat > 0 && carat <= 1000; }
function cleanNumber(str) { return String(str).replace(/,/g, ''); }
function cleanPrice(priceString) { return priceString ? parseInt(cleanNumber(priceString)) : null; }
