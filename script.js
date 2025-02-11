const goldPrices = {
    "طلای 24 عیار  ": '',
    "طلای 18 عیار  ": '',
    "دلار": '',
};

const goldWeight = {
    "طلای 24 عیار  ": '',
    "طلای 18 عیار  ": '',
};

function convertCarat() {
    const weight = parseFloat(document.getElementById('weight').value);
    const carat = parseFloat(document.getElementById('carat').value);

    if (!isValidInput(weight, carat)) {
        document.getElementById('result').innerHTML = '<p class="error">ورودی‌ها نامعتبر هستند!</p>';
        return;
    }

    const totalWeight24 = ((carat * weight) / 1000).toFixed(3);
    const totalWeight18 = ((carat * weight) / 750).toFixed(3);

    const totalPrice24 = formatterPrice((totalWeight24 * goldPrices["طلای 24 عیار  "]).toFixed(0));
    const totalPrice18 = formatterPrice((totalWeight18 * goldPrices["طلای 18 عیار  "]).toFixed(0));

    // ساخت جدول برای نمایش خروجی
    const tableHTML = `
        <table border="1" cellpadding="10" style="border-collapse: collapse;">
            <thead>
                <tr>
                    <th>عنوان</th>
                    <th>مقدار</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>نسبت به وزن طلای 24 عیار </td>
                    <td>${totalWeight24} گرم</td>
                </tr>
                <tr>
                    <td> نسبت به وزن طلای 18 عیار </td>
                    <td>${totalWeight18} گرم</td>
                </tr>
                <tr>
                    <td>  ارزش تقریبی طلا  </td>
                    <td>${totalPrice24 || 'نامشخص'} تومان</td>
                </tr>
            </tbody>
        </table>
    `;

    document.getElementById('result').innerHTML = tableHTML;
}

function formatterPrice(price) {
    formatter = new Intl.NumberFormat('fa-IR', { currency: 'IRR', });

    return formatter.format(price); // خروجی 2,500,000 
}
function isValidInput(weight, carat) {
    return !isNaN(weight) && !isNaN(carat) && weight > 0 && carat > 0 && carat <= 1000;
}

window.onload = function () {
    fetchGoldPrices();
};

async function fetchGoldPrices() {
    try {
        const response = await fetch('https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency.json');

        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        extractGoldPrices(data);
    } catch (error) {
        console.error("خطا در دریافت داده‌ها:", error);
    }
}

function extractGoldPrices(data) {
    const gram18kGold = data.gold.find(item => item.name === "گرم طلای 18 عیار");
    const gram24kGold = data.gold.find(item => item.name === "گرم طلای 24 عیار");
    const usdCurrency = data.currency.find(item => item.name === "دلار");

    if (gram18kGold) {
        goldPrices['طلای 18 عیار  '] = gram18kGold.price;
    }

    if (gram24kGold) {
        goldPrices['طلای 24 عیار  '] = gram24kGold.price;
    }

    if (usdCurrency) {
        goldPrices["دلار"] = usdCurrency.price;
    }

    displayPrices(goldPrices);
}

function displayPrices(goldPrices) {
    const table = document.getElementById('goldTable');
    table.innerHTML = '<tr><th>نوع طلا</th><th>قیمت (تومان)</th></tr>';

    Object.entries(goldPrices).forEach(([type, price]) => {
        const row = table.insertRow();
        row.insertCell(0).textContent = type;
        row.insertCell(1).textContent = formatterPrice(price) || 'نامشخص';
    });

    table.style.display = 'table';
}
