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
let rates = {}; //rates contains values like so: 'FROM_TO: RATE'
let rate = 0;
const baseUrl = 'https://free.currencyconverterapi.com';
let db;

document.addEventListener('DOMContentLoaded', () => {
    const openRequest = openDatabase();
    openRequest.onupgradeneeded = (e) => {
        const thisDB = e.target.result;
        if(!thisDB.objectStoreNames.contains("currencies")) {
            thisDB.createObjectStore("currencies", { keyPath: 'id' });
        }
        if(!thisDB.objectStoreNames.contains("conversion_rates")) {
            thisDB.createObjectStore("conversion_rates", { keyPath: 'currencies'});
        }
    };

    openRequest.onsuccess = (e) => {
        db = e.target.result;
        fetchCurrencyData();
    };

    openRequest.onerror = (e) => {
        fetchCurrenciesFromServer();
    };
});

fromInput.on('input', convertCurrency);

const fetchCurrencyData = () => {
    const dbCurrencies = {};
    getCurrenciesFromDb().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            dbCurrencies[cursor.value.id] = cursor.value;
            cursor.continue();
        } else {
            if (!Object.keys(dbCurrencies).length) {
                fetchCurrenciesFromServer();
            } else {
                currencies = dbCurrencies;
                displayCurrencies();
            }
        }
    }
};

const fetchCurrenciesFromServer = () => {
    return axios.get(`${baseUrl}/api/v5/currencies`).then((response) => {
        currencies = response.data.results;
        Object.keys(currencies).forEach(key => {
            let currency = currencies[key];
            addCurrencyToDatabase(currency);
        });
        displayCurrencies();
    }).catch((e) => {
        alert('Please make sure you are connected to the internet. At least for the first time');
    });
};

const displayCurrencies = () => {
    let count = 1;
    Object.keys(currencies).forEach(key => {
        let currency = currencies[key];
        const elem = `
            <div class="list__item${count % 2 ? ' odd': ''}"
                onclick="selectCurrency('${currency.id}')">
                <h4>
                    ${currency.currencyName} 
                    (${currency.currencySymbol ? 
                        currency.currencySymbol : currency.id}
                    )
                </h4>
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
};

const closeSelectionContainer = () => {
    currencyListContainer.slideUp(500);
};

const selectCurrency = (currencyID) => {
    if (!selecting) {//selecting from
        selectedFrom = currencyID;
    } else {
        selectedTo = currencyID;
    }
    closeSelectionContainer();
    updateCurrencyTexts();
    setRate();
}

const openList = (type) => {
    selecting = parseInt(type, 10);
    currencyListContainer.slideDown(500);
};

const updateCurrencyTexts = () => {
    let fromCurrency = currencies[selectedFrom];
    if (fromCurrency) {
        fromText.text(`${fromCurrency.currencyName} (${fromCurrency.id})`);
    }
    let toCurrency = currencies[selectedTo];
    if (toCurrency) {
        toText.text(`${toCurrency.currencyName} (${toCurrency.id})`);
    }
};

const setRate = () => {
    const key = `${selectedFrom}_${selectedTo}`; 
    if (rates[key]) {
        rate = rates[key];
        convertCurrency(null);
    } else {
        //check DB
        const request = checkRateInDb(key);
        request.onerror = (e) => {
            //fetch rate from server
            fetchRateFromServer(key);
        };
        request.onsuccess = (e) => {
            if (request.result && request.result.rate) {
                rate = request.result.rate;
            } else {
                fetchRateFromServer(key);
            }
        }
    }
};

const fetchRateServerRequest = () => {
    const query = `${encodeURIComponent(selectedFrom)}_${encodeURIComponent(selectedTo)}`;
    return axios.get(`${baseUrl}/api/v5/convert?q=${query}&compact=ultra`).then((response) => {
        return response;
    });
};

const fetchRateFromServer = (key) => {
    fetchRateServerRequest().then(response => {
        rates[key] = response.data[key];
        rate = response.data[key];
        convertCurrency(null);
        const dbRate = {};
        dbRate.currencies = key;
        dbRate.rate = response.data[key];
        addRateToDatabase(dbRate);
    }).catch(e => alert('You need to be connected to the internet to make this particular conversion. At least once'));
};

const checkRateInDb = (key) => {
    var transaction = db.transaction(["conversion_rates"]);
    var objectStore = transaction.objectStore("conversion_rates");
    return objectStore.get(key);
};

const addCurrencyToDatabase = (currency) => {
    const transaction = db.transaction(["currencies"],"readwrite");
    const store = transaction.objectStore("currencies");
    const request = store.add(currency);
    request.onerror = (e) => console.log("Error", e.target.error.name);
    request.onsuccess = (e) => console.log("Country added");
};

const addRateToDatabase = (rate) => {
    const transaction = db.transaction(['conversion_rates'], 'readwrite');
    const store = transaction.objectStore('conversion_rates');
    store.add(rate);
};

const getCurrenciesFromDb = () => 
    db.transaction(["currencies"], "readonly")
        .objectStore("currencies")
        .openCursor();

function convertCurrency(event){
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
};

function openDatabase() {
    // If the browser doesn't support service worker,
    // we don't care about having a database
    if (!navigator.serviceWorker) {
        return Promise.resolve();
    }
    
    return indexedDB.open('sw-currency-converter', 1);
};
        