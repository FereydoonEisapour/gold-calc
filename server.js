const express = require('express');
const axios = require('axios');
const cors = require('cors'); // برای مدیریت CORS
const app = express();

// فعال کردن CORS
app.use(cors());

// این endpoint قیمت‌های طلا را از tgju.org دریافت می‌کند
app.get('/api/gold-prices', async (req, res) => {
    try {
        const response = await axios.get('https://www.tgju.org/gold-chart', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const targets = ["طلای 18 عیار / 750", "طلای 18 عیار / 740"];
        const prices = {};

        targets.forEach(target => {
            const th = Array.from(doc.querySelectorAll('th')).find(el => el.textContent.trim() === target);
            prices[target] = th?.nextElementSibling?.textContent.trim() || 'نامشخص';
        });

        res.json(prices); // ارسال قیمت‌ها به Frontend
    } catch (error) {
        console.error('Error fetching gold prices:', error);
        res.status(500).json({ error: 'خطا در دریافت قیمت‌ها' });
    }
});

// شروع سرور
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
