
const goldPrices = {
    "طلای 24 عیار": null,
    "طلای 18 عیار": null,
    "دلار آمریکا": null, 
};


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
}

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



window.onload = function () {
    const goldTable = document.getElementById('goldTable');
    goldTable.innerHTML = '<tr><th>در حال بارگذاری قیمت‌ها  ...</th></tr>';
    fetchPricesFromTgju();
};

async function fetchPricesFromTgju() {
    const urls = {
        geram18: 'https://www.tgju.org/profile/geram18',
        geram24: 'https://www.tgju.org/profile/geram24',
        dollar: 'https://www.tgju.org/profile/price_dollar_rl', // جدید: URL دلار
    };


    const priceSelector = "#main > div.stocks-profile > div.stocks-header > div.stocks-header-main > div > div.fs-cell.fs-xl-2.fs-lg-2.fs-md-6.fs-sm-6.fs-xs-6.top-header-item-block-3 > div > h3.line.clearfix > span.value > span:nth-child(1)";

    try {
        const proxyUrl = (targetUrl) => `https://gold-proxy.epfereydoon.workers.dev/?url=${encodeURIComponent(targetUrl)}`;


        const [response18, response24, responseDollar] = await Promise.all([
            fetch(proxyUrl(urls.geram18)),
            fetch(proxyUrl(urls.geram24)),
            fetch(proxyUrl(urls.dollar))
        ]);

        if (!response18.ok || !response24.ok || !responseDollar.ok) {
            throw new Error(`پاسخ از پراکسی شما با خطا مواجه شد.`);
        }

        const html18 = await response18.text();
        const html24 = await response24.text();
        const htmlDollar = await responseDollar.text(); 
        
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

    } catch (error) {
        console.error("خطا در استخراج داده‌ها:", error);
        document.getElementById('goldTable').innerHTML = '<tr><th class="error">خطا: استخراج قیمت‌ها ناموفق بود.</th></tr>';
    }
}


function displayPrices(prices) {
    const table = document.getElementById('goldTable');
    table.innerHTML = '<thead><tr><th>نوع</th><th>قیمت (تومان)</th></tr></thead>';
    const tbody = document.createElement('tbody');

    Object.entries(prices).forEach(([type, price]) => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = type;
        row.insertCell(1).textContent = price ? formatterPrice(price) + ' تومان' : 'نامشخص';
    });
    table.appendChild(tbody);
}
