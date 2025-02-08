
const goldPrices = {};
let cachedPrices = {};

// Load cached prices from localStorage
if (localStorage.getItem('goldPrices')) {
    cachedPrices = JSON.parse(localStorage.getItem('goldPrices'));
    displayPrices(cachedPrices);
}

/**
 * Convert carat and calculate gold weights.
 */
function convertCarat() {
    const weight = parseFloat(document.getElementById('weight').value);
    const carat = parseFloat(document.getElementById('carat').value);

    if (!isValidInput(weight, carat)) {
        document.getElementById('result').innerHTML = '<p class="error">ورودی‌ها نامعتبر هستند!</p>';
        return;
    }

    const pureWeight = calculatePureWeight(weight, carat);
    const convertedWeights = convertToStandardCarats(pureWeight);

    const totalPrice18 = calculateTotalPrice(convertedWeights[18], "طلای 18 عیار / 750");
    const totalPrice22 = calculateTotalPrice(convertedWeights[22], "طلای 18 عیار / 740");

    document.getElementById('result').innerHTML = `
        <p><strong>وزن طلا عیار 18:</strong> ${convertedWeights[18]} گرم</p>
        <p><strong>وزن طلا عیار 22:</strong> ${convertedWeights[22]} گرم</p>
        <p><strong>ارزش تقریبی طلای 18 عیار:</strong> ${totalPrice18 || 'نامشخص'} ریال</p>
        <p><strong>ارزش تقریبی طلای 22 عیار:</strong> ${totalPrice22 || 'نامشخص'} ریال</p>
    `;
}

/**
 * Validate user input.
 */
function isValidInput(weight, carat) {
    return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat > 0 && carat <= 1000;
}

/**
 * Calculate pure gold weight.
 */
function calculatePureWeight(weight, carat) {
    return (weight * (carat / 1000)).toFixed(3);
}

/**
 * Convert pure weight to standard carats.
 */
function convertToStandardCarats(pureWeight) {
    return {
        18: (pureWeight / (18 / 24)).toFixed(3),
        22: (pureWeight / (22 / 24)).toFixed(3)
    };
}

/**
 * Calculate total price based on weight and type.
 */
function calculateTotalPrice(weight, type) {
    const price = goldPrices[type] ? parseFloat(goldPrices[type].replace(/,/g, '')) : 0;
    return weight && price ? (weight * price).toLocaleString() : 'نامشخص';
}

/**
 * Fetch gold prices from the backend proxy.
 */
async function fetchGoldPrices() {
    try {
        const response = await fetch('https://your-backend-proxy-url/gold-prices'); // Replace with your backend URL
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات');

        const fetchedPrices = await response.json();
        Object.assign(goldPrices, fetchedPrices); // Update goldPrices object
        localStorage.setItem('goldPrices', JSON.stringify(goldPrices)); // Cache prices
        displayPrices(goldPrices);
    } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
        alert('خطا در بارگذاری قیمت‌ها. از قیمت‌های ذخیره شده استفاده می‌شود.');
    }
}

/**
 * Display gold prices in the table.
 */
function displayPrices(data) {
    const table = document.getElementById('goldTable');
    table.innerHTML = '<tr><th>نوع طلا</th><th>قیمت (ریال)</th></tr>';

    Object.entries(data).forEach(([type, price]) => {
        const row = table.insertRow();
        row.insertCell(0).textContent = type;
        row.insertCell(1).textContent = price;
    });

    table.style.display = 'table';
}

// Fetch prices on page load if not cached
if (Object.keys(cachedPrices).length === 0) {
    fetchGoldPrices();
}
