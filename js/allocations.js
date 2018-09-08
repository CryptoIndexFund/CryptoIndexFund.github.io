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

                // Create the chart
                let coins = that.cryptos.map(function(crypto) {
                        return crypto.symbol;
                    }),
                	caps = that.cryptos.map(function(crypto) {
                    	return crypto.cap;
                    });
                createChart(coins, caps);
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

createChart = function(coins, caps) {
	const colors = [
        '#8dd3c7',
        '#ffffb3',
        '#bebada',
        '#fb8072',
        '#80b1d3',
        '#fdb462',
        '#b3de69',
        '#fccde5',
        '#d9d9d9',
        '#bc80bd'
	];
    
    let requests = coins.map(function(coin) {
        if (coin == 'MIOTA') {
            coin = 'IOTA';
        }
        let url = 'https://min-api.cryptocompare.com/data/histoday?fsym=' + coin + '&tsym=USD&limit=30&e=CCCAGG&extraParams=CryptoIndexFund';
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
            	let latestPrice = data.Data[data.Data.length - 1].close;
                data.Data.forEach(function(prices, time) {
                	indexCap[time] += caps[index] * prices.close / latestPrice;
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
            
            // Add the individual coin performance
            datas.forEach(function(data, index) {
                let price0 = data.Data[0].close;
                datasets.push({
                    label: coins[index],
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
                                console.log(tooltipItem);
                                let tooltip = tooltipItem[0],
                                    coin = coins[tooltip.datasetIndex - 1] || 'Index',
                                    title = [tooltip.xLabel, coin];
                                return title;
                            },
                            label: function(tooltipItem, data) {
                                return tooltipItem.yLabel.toFixed(2) + '%';
                            }
                        }
                    },
                    scales: {
                        xAxes: [{
                            type: 'time'
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
}
