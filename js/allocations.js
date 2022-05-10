new Vue({
    el: "#app",
    data: {
        cryptos: [],
        current_amounts: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        current_assets: ["USD"]
    },
    mounted: function() {
        old_amounts = localStorage.getItem('current_amounts');
        if (old_amounts) {
            try {
                this.current_amounts = JSON.parse(old_amounts);
            } catch(e) {
                localStorage.removeItem('current_amounts');
            }
        }
        old_assets = localStorage.getItem('current_assets');
        if (old_assets) {
            try {
                this.current_assets = JSON.parse(old_assets);
            } catch(e) {
                localStorage.removeItem('current_assets');
            }
        }
    },
    watch: {
        current_amounts: function(new_amounts) {
            const parsed = JSON.stringify(new_amounts);
            localStorage.setItem('current_amounts', parsed);
        },
        current_assets: function(new_assets) {
            const parsed = JSON.stringify(new_assets);
            localStorage.setItem('current_assets', parsed);
        }
    },
    computed: {
        current_balances: function() {
            const that = this;
            return this.current_amounts.map(function(amount, index) {
                if (index == 0) {
                    return amount;
                } else {
                    if (that.cryptos[index - 1] === undefined) return 0;
                    let price = that.cryptos[index - 1].price;
                    return amount * price;
                }
            });
        },
        current_balances_total: function() {
            return this.current_balances.reduce(function(total, balance) {
                return total + balance;
            });
        },
        allocations_total: function() {
            return this.cryptos.reduce(function(total, crypto) {
                return total + crypto.allocation;
            }, 0);
        },
        target_amounts: function() {
            const that = this;
            let amounts = [0];
            this.target_balances.forEach(function(balance, index) {
                if (that.cryptos[index - 1] === undefined) return 0;
                let price = that.cryptos[index - 1].price;
                amounts.push(balance / price);
            });
            return amounts;
        },
        target_balances: function() {
            const that = this;
            let balances = [0];
            this.cryptos.forEach(function(crypto) {
                balances.push(that.current_balances_total * crypto.allocation);
            });
            return balances;
        },
        target_balances_total: function() {
            return this.target_balances.reduce(function(total, balance) {
                return total + balance;
            });
        },
        buy_amounts: function() {
            const that = this;
            return this.current_amounts.map(function(amount, index) {
                return that.target_amounts[index] - amount;
            });
        },
        buy_balances: function() {
            const that = this;
            return this.current_balances.map(function(balance, index) {
                return that.target_balances[index] - balance;
            });
        }
    },
    created: function() {
        this.queryMarketCaps();
    },
    methods: {
        queryMarketCaps: function() {
            // Get price data
            const that = this,
                skip_symbols = new Set(['USDT', 'BNB', 'OMG', 'USDC', 'BUSD', 'UST', 'STETH']),
                n_symbols = 10 + skip_symbols.size,
                url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&price_change_percentage=24h%2C7d&per_page=' + n_symbols;
            fetch(url)
                .then(function(data) {
                    return data.json();
                })
                .then(function(res) {
                    // Skip symbols
                    let i = n_symbols;
                    while (i--) {
                        if (skip_symbols.has(res[i].symbol.toUpperCase())) {
                            res.splice(i, 1);
                        }
                    }

                    // Slice to 10
                    res = res.slice(0, 10);

                    // Calculate total market cap
                    let total_cap = res.reduce(function(acc, obj) {
                        return acc + obj.market_cap;
                    }, 0);

                    // Calculate index allocation
                    res.forEach(function(obj) {
                        obj.allocation = obj.market_cap / total_cap;

                        // Fix some names
                        if (obj.name == 'XRP') {
                            obj.name = 'Ripple';
                        }
                    });

                    // Display data
                    that.cryptos = res.map(function(crypto, index) {
                        return {
                            id: index + 1,
                            name: crypto.name,
                            symbol: crypto.symbol.toUpperCase(),
                            price: crypto.current_price,
                            cap: crypto.market_cap,
                            allocation: crypto.allocation,
                            change1d: crypto.price_change_percentage_24h_in_currency,
                            change7d: crypto.price_change_percentage_7d_in_currency
                        };
                    });

                    // Update current_amounts, based on cryptos order
                    let new_amounts = [that.current_amounts[0], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    let new_assets = ['USD'];
                    that.cryptos.forEach(function(crypto, index) {
                        let i = that.current_assets.indexOf(crypto.symbol);
                        if (i !== -1) {
                            new_amounts[index + 1] = that.current_amounts[i];
                        }
                        new_assets.push(crypto.symbol);
                    });
                    that.current_amounts = new_amounts;
                    that.current_assets = new_assets;

                    // Query historical data for these cryptocurrencies
                    that.queryHistoricalPrices();
                })
                .catch(function(error) {
                    console.log(error);
                });
        },
        queryHistoricalPrices: function() {
            const that = this,
                colors = [
                    'rgba(166,206,227,0.5)',
                    'rgba(31,120,180,0.5)',
                    'rgba(178,223,138,0.5)',
                    'rgba(51,160,44,0.5)',
                    'rgba(251,154,153,0.5)',
                    'rgba(227,26,28,0.5)',
                    'rgba(253,191,111,0.5)',
                    'rgba(255,127,0,0.5)',
                    'rgba(202,178,214,0.5)',
                    'rgba(106,61,154,0.5)'
                ];

            let requests = this.cryptos.map(function(crypto) {
                let symbol = crypto.symbol;
                if (symbol == 'MIOTA') {
                    symbol = 'IOTA';
                }
                let url = 'https://min-api.cryptocompare.com/data/histoday?fsym=' + symbol + '&tsym=USD&limit=90&e=CCCAGG&extraParams=CryptoIndexFund';
                return fetch(url).then(function(response) {
                    return response.json();
                });
            });

            Promise.all(requests)
                .then(function(datas) {
                    let datasets = [];

                    // Calculate the index performance
                    // assumes all datas share the same datetimes
                    let datetimes = datas[0].Data.map(function(x) {
                            return x.time * 1000;
                        }),
                        indexCap = datetimes.map(function(x) {
                            return 0;
                        });
                    datas.forEach(function(data, index) {
                        let latestCap = that.cryptos[index].cap,
                            latestPrice = data.Data[data.Data.length - 1].close;
                        data.Data.forEach(function(prices, time) {
                            indexCap[time] += latestCap * prices.close / latestPrice;
                        });
                    });
                    let cap0 = indexCap[0];
                    datasets.push({
                        label: 'Index',
                        data: indexCap.map(function(x, index) {
                            return {
                                x: datetimes[index],
                                y: (x - cap0) / cap0 * 100
                            };
                        }),
                        borderColor: 'black',
                        backgroundColor: 'black',
                        fill: false,
                        showLine: true,
                        //lineTension: 0
                    });

                    // Add the individual cryptocurrency performance
                    datas.forEach(function(data, index) {
                        let symbol = that.cryptos[index].symbol,
                            price0 = data.Data[0].close;
                        datasets.push({
                            label: symbol,
                            data: data.Data.map(function(x) {
                                let price = x.close;
                                return {
                                    x: x.time * 1000,
                                    y: (price - price0) / price0 * 100
                                };
                            }),
                            borderColor: colors[index],
                            backgroundColor: colors[index],
                            fill: false,
                            showLine: true,
                            //lineTension: 0
                        });
                    });
                    let config = {
                        type: 'scatter',
                        data: {
                            datasets: datasets
                        },
                        options: {
                            maintainAspectRatio: false,
                            tooltips: {
                                callbacks: {
                                    title: function(tooltipItem, data) {
                                        let tooltip = tooltipItem[0],
                                            symbol = that.cryptos[tooltip.datasetIndex - 1].symbol || 'Index',
                                            title = [tooltip.xLabel, symbol];
                                        return title;
                                    },
                                    label: function(tooltipItem, data) {
                                        return tooltipItem.yLabel.toFixed(2) + '%';
                                    }
                                }
                            },
                            scales: {
                                xAxes: [{
                                    type: 'time',
                                    time: {
                                        tooltipFormat: 'MMM D'
                                    }
                                }],
                                yAxes: [{
                                    ticks: {
                                        callback: function(value) {
                                            return value + '%';
                                        }
                                    }
                                }]
                            },
                            elements: {
                                point: {
                                    radius: 0,
                                    hitRadius: 10,
                                    hoverRadius: 5
                                }
                            }
                        }
                    };

                    let ctx = document.getElementById('mychart').getContext('2d');
                    new Chart(ctx, config);
                })
                .catch(function(error) {
                    console.log(error);
                });
        },
        formatNumber: function(value, decimals) {
            decimals = (typeof decimals !== 'undefined') ? decimals : 0;
            let options = {
                minimumFractionDigits: decimals
            };
            return value.toLocaleString(undefined, options);
        },
        formatPrice: function(price) {
            let options = {
                style: 'currency',
                currency: 'USD'
            };
            return price.toLocaleString(undefined, options);
        },
        formatCap: function(cap) {
            let si = [{
                    value: 1,
                    symbol: ''
                },
                {
                    value: 1e3,
                    symbol: 'K'
                },
                {
                    value: 1e6,
                    symbol: 'M'
                },
                {
                    value: 1e9,
                    symbol: 'B'
                },
                {
                    value: 1e12,
                    symbol: 'T'
                },
                {
                    value: 1e15,
                    symbol: 'P'
                },
                {
                    value: 1e18,
                    symbol: 'E'
                }
            ];
            for (var i = si.length - 1; i > 0; i--) {
                if (cap >= si[i].value) {
                    break;
                }
            }
            return this.formatPrice(cap / si[i].value) + ' ' + si[i].symbol;
        },
        formatPercent: function(percent) {
            return percent.toFixed(2) + '%';
        },
        formatAllocation: function(allocation) {
            return this.formatPercent(allocation * 100);
        }
    }
})
