new Vue({
    el: "#app",
    data: {
        price: 10,
        change_1d: 0,
        cryptos: []
    },
    created: function() {
        // Get price data
        const that = this,
            skip_symbols = new Set(['USDT', 'BNB', 'OMG']),
            n_symbols = 10 + skip_symbols.size,
            url = 'https://api.coinmarketcap.com/v2/ticker/?limit=' + n_symbols + '&structure=array';
        fetch(url)
            .then(function(data) {
                return data.json();
            })
            .then(function(res) {
                // Skip symbols
                let i = n_symbols;
                while (i--) {
                    if (skip_symbols.has(res.data[i].symbol)) {
                        res.data.splice(i, 1);
                    }
                }

                // Slice to 10
                res.data = res.data.slice(0, 10);

                // Calculate total market cap
                let total_cap = res.data.reduce(function(acc, obj) {
                    return acc + obj.quotes.USD.market_cap;
                }, 0);

                // Calculate index allocation
                res.data.forEach(function(obj) {
                    obj.allocation = obj.quotes.USD.market_cap / total_cap;

                    // Fix some names
                    if (obj.name == 'XRP') {
                        obj.name = 'Ripple';
                    }
                });

                // Calculate index price and change
                let SCALING = 2e10,
                    price = total_cap / SCALING,
                    change_1d = 0;
                res.data.forEach(function(obj) {
                    change_1d += obj.allocation * obj.quotes.USD.percent_change_24h;
                });

                // Display data
                that.price = price;
                that.change_1d = change_1d;
                that.cryptos = res.data.map(function(crypto, index) {
                    return {
                        id: index + 1,
                        name: crypto.name,
                        symbol: crypto.symbol,
                        price: crypto.quotes.USD.price,
                        cap: crypto.quotes.USD.market_cap,
                        allocation: crypto.allocation,
                        change1d: crypto.quotes.USD.percent_change_24h,
                        change7d: crypto.quotes.USD.percent_change_7d
                    };
                })
            })
            .catch(function(error) {
                console.log(error);
            });
    },
    methods: {
        formatPrice(price) {
            let options = {
                style: 'currency',
                currency: 'USD'
            };
            return price.toLocaleString(undefined, options);
        },
        formatCap(cap) {
            let si = [
                {value: 1, symbol: ''},
                {value: 1e3, symbol: 'K'},
                {value: 1e6, symbol: 'M'},
                {value: 1e9, symbol: 'B'},
                {value: 1e12, symbol: 'T'},
                {value: 1e15, symbol: 'P'},
                {value: 1e18, symbol: 'E'}
            ];
            for (var i = si.length - 1; i > 0; i--) {
                if (cap >= si[i].value) {
                    break;
                }
            }
            return this.formatPrice(cap / si[i].value) + ' ' + si[i].symbol;
        },
        formatPercent(percent) {
            return percent.toFixed(2) + '%';
        },
        formatAllocation(allocation) {
            return this.formatPercent(allocation * 100);
        }
    }
})
