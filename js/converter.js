let currencies = {};
const currencyListContainer = $("#currencyListContainer");
const currencyList = $("#currencyList");
const fromText = $("#fromText");
const toText = $("#toText");
const fromInput = $("#fromInput");
const toInput = $("#toInput");
let fetching = false;
let selectedFrom = '';
let selectedTo = '';
let selecting = 0; //0 - Selecting from, 1 - Selecting To
let rates = {}; //rates contains values like so: 'FROM|TO: RATE'
let rate = 0;
const baseUrl = 'https://free.currencyconverterapi.com';

axios.get(`${baseUrl}/api/v5/currencies`).then((response) => {
    currencies = response.data.results;
    displayCurrencies();
});

fromInput.on('input', convertCurrency);

function displayCurrencies() {
    let count = 1;
    Object.keys(currencies).forEach(key => {
        let currency = currencies[key];
        const elem = `
            <div class="list__item${count % 2 ? ' odd': ''}"
                onclick="selectCurrency('${currency.id}')">
                <h4>${currency.currencyName} (${currency.currencySymbol})</h4>
            </div>
        `;
        currencyList.append(elem);
        if (count === 1) {
            selectedFrom = currency.id;
        } else if (count === 2) {
            selectedTo = currency.id;
        }
        count++;
    });
    updateCurrencyTexts();
    setRate();
}

function selectCurrency(currencyID) {
    if (!selecting) {//selecting from
        selectedFrom = currencyID;
    } else {
        selectedTo = currencyID;
    }
    currencyListContainer.slideUp(500);
    updateCurrencyTexts();
    setRate();
}

function openList(type) {
    selecting = parseInt(type, 10);
    currencyListContainer.slideDown(500);
}

function updateCurrencyTexts() {
    let fromCurrency = currencies[selectedFrom];
    if (fromCurrency) {
        fromText.text(`${fromCurrency.currencyName} (${fromCurrency.id})`);
    }
    let toCurrency = currencies[selectedTo];
    if (toCurrency) {
        toText.text(`${toCurrency.currencyName} (${toCurrency.id})`);
    }
}

function setRate() {
    const key = `${selectedFrom}_${selectedTo}`; 
    if (rates[key]) {
        rate = rates[key];
        convertCurrency(null);
    } else {
        fetchRate().then(response => {
            rates[key] = response.data[key];
            rate = response.data[key];
            convertCurrency(null);
        });
    }
}

function fetchRate() {
    const query = `${encodeURIComponent(selectedFrom)}_${encodeURIComponent(selectedTo)}`;
    return axios.get(`${baseUrl}/api/v5/convert?q=${query}&compact=ultra`).then((response) => {
        return response;
    });
}

function convertCurrency(event) {
    let amount = 0;
    if (event) {
        amount = event.target.value;
    } else {
        amount = fromInput.val();
    }
    if (rate !== undefined && !isNaN(amount) && amount > 0) {
        toInput.val(parseFloat(amount) * rate);
    } else {
        toInput.val(0.00);
    }
}