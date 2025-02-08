const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

// ایجاد یک نمونه از اپلیکیشن Express
const app = express();
const port = 3000;

// تابع برای استخراج قیمت طلا بر اساس متن هدف
async function fetchGoldPrices() {
    try {
        const response = await fetch('https://www.tgju.org/gold-chart', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error('خطا در دریافت اطلاعات');

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const targets = ["طلای 18 عیار / 750", "طلای 18 عیار / 740"];
        targets.forEach(target => {
            const th = Array.from(doc.querySelectorAll('th')).find(el => el.textContent.trim() === target);
            goldPrices[target] = th?.nextElementSibling?.textContent.trim() || 'نامشخص';
        });

        localStorage.setItem('goldPrices', JSON.stringify(goldPrices)); // Cache prices
        displayPrices(goldPrices);
    } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
        alert('خطا در بارگذاری قیمت‌ها. از قیمت‌های ذخیره شده استفاده می‌شود.');
    }
}

// API برای دریافت قیمت طلا
app.get('/api/gold-prices', async (req, res) => {
    const url = "https://www.tgju.org/gold-chart";
    const targets = ["طلای 18 عیار / 750", "طلای 18 عیار / 740"]; // لیست مقادیر هدف
    const goldPrices = await fetchGoldPrices(url, targets);

    if (goldPrices) {
        res.json(goldPrices);
    } else {
        res.status(500).json({ error: "خطایی در دریافت اطلاعات رخ داد." });
    }
});// script.js

const goldPrices = {};
let cachedPrices = {};

// Load cached prices from localStorage
if (localStorage.getItem('goldPrices')) {
    cachedPrices = JSON.parse(localStorage.getItem('goldPrices'));
    displayPrices(cachedPrices);
}

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

function isValidInput(weight, carat) {
    return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat > 0 && carat <= 1000;
}

function calculatePureWeight(weight, carat) {
    return (weight * (carat / 1000)).toFixed(3);
}

function convertToStandardCarats(pureWeight) {
    return {
        18: (pureWeight / (18 / 24)).toFixed(3),
        22: (pureWeight / (22 / 24)).toFixed(3)
    };
}

function calculateTotalPrice(weight, type) {
    const price = goldPrices[type] ? parseFloat(goldPrices[type].replace(/,/g, '')) : 0;
    return weight && price ? (weight * price).toLocaleString() : 'نامشخص';
}

async function fetchGoldPrices() {
    try {
        const response = await fetch('https://www.tgju.org/gold-chart', {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000 // Timeout after 5 seconds
        });

        if (!response.ok) throw new Error('خطا در دریافت اطلاعات');

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const targets = ["طلای 18 عیار / 750", "طلای 18 عیار / 740"];
        targets.forEach(target => {
            const th = Array.from(doc.querySelectorAll('th')).find(el => el.textContent.trim() === target);
            goldPrices[target] = th?.nextElementSibling?.textContent.trim() || 'نامشخص';
        });

        localStorage.setItem('goldPrices', JSON.stringify(goldPrices)); // Cache prices
        displayPrices(goldPrices);
    } catch (error) {
        console.error('خطا در دریافت اطلاعات:', error);
        alert('خطا در بارگذاری قیمت‌ها. از قیمت‌های ذخیره شده استفاده می‌شود.');
    }
}

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

// سرویس کردن فایل index.html
app.use(express.static('public'));

// شروع سرور
app.listen(port, () => {
    console.log(`سرور روی پورت ${port} اجرا شده است.`);
});
