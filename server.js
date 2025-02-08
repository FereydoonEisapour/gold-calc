// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes

// Route to fetch gold prices
app.get('/gold-prices', async (req, res) => {
    try {
        const response = await axios.get('https://www.tgju.org/gold-chart', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        // Parse the HTML content
        const htmlContent = response.data;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Extract gold prices
        const targets = ["طلای 18 عیار / 750", "طلای 18 عیار / 740"];
        const goldPrices = {};

        targets.forEach(target => {
            const th = Array.from(doc.querySelectorAll('th')).find(el => el.textContent.trim() === target);
            goldPrices[target] = th?.nextElementSibling?.textContent.trim() || 'نامشخص';
        });

        // Send the extracted data as JSON
        res.json(goldPrices);
    } catch (error) {
        console.error('Error fetching gold prices:', error.message);
        res.status(500).json({ error: 'خطا در دریافت قیمت‌ها' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
