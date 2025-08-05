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
// NEW: Reference for the total P/L container
const totalProfitLossContainer = document.getElementById('total-profit-loss-container');


// --- INITIALIZATION ---
window.onload = function () {
    applyInitialTheme();
    setupEventListeners();
    setupParticleAnimation();
    priceTable.innerHTML = '<tr><td colspan="2">در حال بارگذاری قیمت‌ها...</td></tr>';
    loadHistory(); // This will now also calculate total P/L
    fetchPricesFromTgju();
    switchCalculatorMode('auto');
};

function setupEventListeners() {
    // ... (rest of the function is unchanged)
    themeToggleButton.addEventListener('click', toggleTheme);
    document.getElementById('auto-mode-btn').addEventListener('click', () => switchCalculatorMode('auto'));
    document.getElementById('manual-mode-btn').addEventListener('click', () => switchCalculatorMode('manual'));
    autoCalcButton.addEventListener('click', () => calculateAuto(true));
    manualCalcButton.addEventListener('click', () => calculateManual(true));
    autoCalcForm.querySelectorAll('.calc-input').forEach(input => {
        input.addEventListener('input', () => validateForm(autoCalcForm, autoCalcButton, false));
    });
    manualCalcForm.querySelectorAll('.calc-input').forEach(input => {
        input.addEventListener('input', (event) => {
            if (event.target.id === 'price-manual') formatNumberInput(event.target);
            validateForm(manualCalcForm, manualCalcButton, false);
        });
    });
}

// --- THEME & PARTICLE CODE (UNCHANGED) ---
function applyInitialTheme(){const t=localStorage.getItem("theme")||"light";document.body.classList.toggle("dark-mode","dark"===t),updateThemeIcons(t)}function toggleTheme(){const t=document.body.classList.toggle("dark-mode"),e=t?"dark":"light";localStorage.setItem("theme",e),updateThemeIcons(e)}function updateThemeIcons(t){sunIcon&&moonIcon&&(sunIcon.classList.toggle("hidden","dark"===t),moonIcon.classList.toggle("hidden","light"===t))}function setupParticleAnimation(){const t=document.getElementById("particle-canvas");if(!t)return;const e=t.getContext("2d");let a;function n(){t.width=window.innerWidth,t.height=window.innerHeight}class i{constructor(){this.x=Math.random()*t.width,this.y=Math.random()*t.height,this.size=2.5*Math.random()+1,this.speedX=.8*Math.random()-.4,this.speedY=.8*Math.random()-.4}update(){this.x+=this.speedX,this.y+=this.speedY,this.x>t.width+5&&(this.x=-5),this.x<-5&&(this.x=t.width+5),this.y>t.height+5&&(this.y=-5),this.y<-5&&(this.y=t.height+5)}draw(){e.beginPath();const a=e.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size);a.addColorStop(0,"rgba(212, 175, 55, 0.8)"),a.addColorStop(1,"rgba(212, 175, 55, 0)"),e.fillStyle=a,e.arc(this.x,this.y,2*this.size,0,2*Math.PI),e.fill()}}function s(){n(),a=[];const t=(window.innerHeight*window.innerWidth)/9e3;for(let e=0;e<t;e++)a.push(new i)}function o(){e.clearRect(0,0,t.width,t.height);for(let t=0;t<a.length;t++)a[t].update(),a[t].draw();requestAnimationFrame(o)}s(),o(),window.addEventListener("resize",()=>{clearTimeout(window.resizedFinished),window.resizedFinished=setTimeout(s,150)})}


// --- INPUT VALIDATION & CALCULATION (UNCHANGED) ---
function validateForm(t,e,a){let n=!0;return t.querySelectorAll(".calc-input").forEach(t=>{validateSingleInput(t,a)||(n=!1)}),e.disabled=!n,n}function validateSingleInput(t,e){const a=cleanNumber(t.value),n=document.getElementById(t.id+"-error");let i="";return""===a.trim()?e&&(i="این فیلد الزامی است."):/^\d*\.?\d*$/.test(a)?parseFloat(a)<=0?i="مقدار باید بزرگتر از صفر باشد.":t.id.includes("carat")&&parseFloat(a)>1e3&&(i="عیار نمی‌تواند بیشتر از ۱۰۰۰ باشد."):i="لطفا فقط از اعداد و یک نقطه استفاده کنید.",t.classList.toggle("input-error",!!i),n&&(n.textContent=i),""!==a.trim()&&!i}function formatNumberInput(t){let e=cleanNumber(t.value);""!==t.value&&(t.value=new Intl.NumberFormat("en-US").format(e))}function switchCalculatorMode(t){const e="auto"===t;autoCalcForm.classList.toggle("hidden",!e),manualCalcForm.classList.toggle("hidden",e),document.getElementById("auto-mode-btn").classList.toggle("active-tab",e),document.getElementById("manual-mode-btn").classList.toggle("active-tab",!e),validateForm(e?autoCalcForm:manualCalcForm,e?autoCalcButton:manualCalcButton,!1)}function calculate(t,e,a,n){if(!isValidInput(t,e)||!a)return void(resultDiv.innerHTML='<p class="error">مقادیر وارد شده یا قیمت لحظه‌ای معتبر نیست.</p>');const i=e*t/750,s=i*a,o=n?`با قیمت لحظه‌ای (هر گرم: ${formatterPrice(a)} تومان)`:`با قیمت دستی (هر گرم: ${formatterPrice(a)} تومان)`,l=createResultTable(i.toFixed(3),formatterPrice(s.toFixed(0))+" تومان");resultDiv.innerHTML=`<p style="font-size: 14px; color: #666; text-align:center;">${o}</p>${l}`,saveCalculation({weight:t,carat:e,originalValue:s,date:(new Date).toISOString()})}function calculateAuto(t){if(!validateForm(autoCalcForm,autoCalcButton,t))return;const e=parseFloat(cleanNumber(document.getElementById("weight-auto").value)),a=parseFloat(cleanNumber(document.getElementById("carat-auto").value));calculate(e,a,goldPrices["طلای 18 عیار"],!0)}function calculateManual(t){if(!validateForm(manualCalcForm,manualCalcButton,t))return;const e=parseFloat(cleanNumber(document.getElementById("weight-manual").value)),a=parseFloat(cleanNumber(document.getElementById("carat-manual").value)),n=parseFloat(cleanNumber(document.getElementById("price-manual").value));calculate(e,a,n,!1)}function createResultTable(t,e){return`<table style="width: 100%;" class="result-table"><tbody><tr><td>معادل طلای ۱۸ عیار (۷۵۰)</td><td>${t} گرم</td></tr><tr><td>ارزش نهایی</td><td><b>${e}</b></td></tr></tbody></table>`}


// --- HISTORY MANAGEMENT ---
// UPDATED: loadHistory now triggers total P/L calculation
function loadHistory() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    historyContainer.innerHTML = '';
    if (history.length === 0) {
        historyContainer.innerHTML = '<p>هنوز محاسبه‌ای ذخیره نشده است.</p>';
    } else {
        history.forEach(item => renderHistoryItem(item));
    }
    // NEW: Calculate and display total profit/loss after history is loaded
    calculateAndDisplayTotalProfitLoss();
}

function saveCalculation(data) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    history.unshift(data);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
    loadHistory();
}

function renderHistoryItem(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'history-item';
    itemDiv.setAttribute('data-id', item.date);

    let profitLossSpan = '';
    const currentPrice18 = goldPrices["طلای 18 عیار"];
    if (currentPrice18 && item.originalValue > 0) {
        const weight18 = (item.carat * item.weight) / 750;
        const currentValue = weight18 * currentPrice18;
        const profitLoss = currentValue - item.originalValue;
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
            <button onclick="reuseCalculation(${item.weight}, ${item.carat})" class="history-action-btn" title="استفاده مجدد">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>
            </button>
            <button onclick="deleteHistoryItem('${item.date}')" class="history-action-btn delete-history-btn" title="حذف">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
        <div class="history-item-details">
            ارزش اولیه: <b>${formatterPrice(item.originalValue.toFixed(0))} تومان</b>${profitLossSpan}
        </div>`;
    historyContainer.appendChild(itemDiv);
}

function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter(item => item.date !== id)));
    loadHistory();
}

function reuseCalculation(weight, carat) {
    switchCalculatorMode('auto');
    document.getElementById('weight-auto').value = weight;
    document.getElementById('carat-auto').value = carat;
    validateForm(autoCalcForm, autoCalcButton, false);
    document.getElementById('calculator-card').scrollIntoView({ behavior: 'smooth' });
}

// --- NEW: TOTAL PROFIT/LOSS CALCULATION ---
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
        const weight18 = (item.carat * item.weight) / 750;
        const currentValue = weight18 * currentPrice18;
        totalProfitLoss += (currentValue - item.originalValue);
    });

    const isProfit = totalProfitLoss >= 0;
    const cssClass = isProfit ? 'profit' : 'loss';
    const formattedValue = formatterPrice(Math.abs(totalProfitLoss).toFixed(0));

    totalProfitLossContainer.innerHTML = `
        <div class="total-profit-loss-display">
            <span class="label">سود / زیان کلی</span>
            <span class="profit-loss-value ${cssClass}">
                ${formattedValue} تومان
            </span>
        </div>
    `;
}


// --- PRICE FETCHING & DISPLAY ---
// UPDATED: fetchPricesFromTgju now re-calculates history P/L on success
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
        loadHistory(); // Reload history to update P/L for each item AND the total
        validateForm(autoCalcForm, autoCalcButton, false);
    } catch (error) {
        console.error("Error fetching data:", error);
        priceTable.innerHTML = '<tr><td colspan="2" class="error">خطا در دریافت قیمت‌ها.</td></tr>';
        document.getElementById('update-status-container').innerHTML = '<p class="error">امکان دریافت قیمت وجود ندارد.</p>';
        autoCalcButton.disabled = true;
    }
}

function displayPrices() {
    // ... (Function is unchanged)
    const tbody=document.createElement("tbody"),nameMap={"طلای 18 عیار":"گرم طلای ۱۸ عیار","طلای 24 عیار":"گرم طلای ۲۴ عیار","دلار آمریکا":"دلار آمریکا"};Object.entries(goldPrices).forEach(([t,e])=>{const a=prevGoldPrices[t];let n="",i="";e&&a&&e!==a&&(diff=e-a,isUp=diff>0,i=isUp?"flash-up":"flash-down",n=`<span class="price-change ${isUp?"up":"down"}"><span class="arrow">${isUp?"▲":"▼"}</span>${formatterPrice(Math.abs(diff))}</span>`);const s=tbody.insertRow();s.className=i,s.insertCell(0).textContent=nameMap[t]||t;const o=s.insertCell(1);o.innerHTML=`<span class="price-value">${e?formatterPrice(e):"نامشخص"}</span> ${n}`}),priceTable.innerHTML="<thead><tr><th>نوع</th><th>قیمت (تومان)</th></tr></thead>",priceTable.appendChild(tbody);
}
function refreshPrices() {
    // ... (Function is unchanged)
    autoCalcButton.disabled=!0,priceTable.innerHTML='<tr><td colspan="2">در حال به‌روزرسانی...</td></tr>',document.getElementById("update-status-container").innerHTML="",fetchPricesFromTgju();
}
function displayUpdateStatus() {
    // ... (Function is unchanged)
    const t=document.getElementById("update-status-container");if(!lastUpdateTime)return;const e=(new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"})).format(lastUpdateTime);t.innerHTML=`<div class="update-status" style="display:flex; align-items:center; justify-content:space-between;">
            <button onclick="refreshPrices()" class="history-action-btn" title="دریافت قیمت جدید">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="refresh-icon"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
            </button>
            <div class="time-text" id="time-text-container" style="font-size:13px;">آخرین به‌روزرسانی: ${e}</div>
        </div>`
}
function startPriceStalenessChecker() {
    // ... (Function is unchanged)
    priceUpdateInterval&&clearInterval(priceUpdateInterval),priceUpdateInterval=setInterval(checkPriceStaleness,5e3);
}
function checkPriceStaleness() {
    // ... (Function is unchanged)
    if(!lastUpdateTime)return;const t=(new Date-lastUpdateTime)/1e3;if(t>60){const t=document.getElementById("time-text-container");t&&(t.innerHTML='<span class="stale-prices">قیمت‌ها نیاز به به‌روزرسانی دارند.</span>'),clearInterval(priceUpdateInterval)}
}

// --- UTILITY FUNCTIONS (UNCHANGED) ---
function convertToEnglishNumerals(str) { return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }
function formatterPrice(price) { return (price === null || isNaN(price)) ? 'نامشخص' : new Intl.NumberFormat('fa-IR').format(price); }
function isValidInput(weight, carat) { return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat > 0 && carat <= 1000; }
function cleanNumber(str) { return String(str).replace(/,/g, ''); }
function cleanPrice(priceString) { return priceString ? parseInt(cleanNumber(priceString)) : null; }
