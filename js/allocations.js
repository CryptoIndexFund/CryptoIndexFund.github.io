// Get price data
const skip_symbols = new Set(['USDT', 'BNB', 'OMG']),
    n_symbols = 10 + skip_symbols.size,
    url = 'https://api.coinmarketcap.com/v2/ticker/?limit=' + n_symbols + '&structure=array';
fetch(url)
    .then(function(data) {
        return data.json();
    })
    .then(function(res) {
        // Skip symbols
        var i = n_symbols;
        while (i--) {
            if (skip_symbols.has(res.data[i].symbol)) {
                res.data.splice(i, 1);
            }
        }

        // Slice to 10
        res.data = res.data.slice(0, 10);

        // Calculate total market cap
        var total_cap = res.data.reduce(function(acc, obj) {
            return acc + obj.quotes.USD.market_cap;
        }, 0);

        // Calculate index allocation
        res.data.forEach(function(obj) {
            obj.allocation = obj.quotes.USD.market_cap / total_cap;
        });

        // Update index price and change
        var SCALING = 2e10,
            price = total_cap / SCALING,
            change_1d = 0;
        res.data.forEach(function(obj) {
            change_1d += obj.allocation * obj.quotes.USD.percent_change_24h;
        });
        $('#price').text(renderPrice(price));
        $('#change-1d').text('(' + renderChange(change_1d) + ')');
        if (change_1d > 0) {
            $('#change-1d').addClass('green');
        } else if (change_1d < 0) {
            $('#change-1d').addClass('red');
        }

        // Update the datatable
        $(document).ready( function () {
            $('#myTable').DataTable({
                data: res.data,
                columns: [
                    {data: 'name'},
                    {data: 'symbol'},
                    {data: 'quotes.USD.price', render: renderPrice, className: 'dt-right'},
                    {data: 'quotes.USD.market_cap', render: renderCap, className: 'dt-right'},
                    {data: 'allocation', render: renderAllo, className: 'dt-right'},
                    {data: 'quotes.USD.percent_change_24h', render: renderChange, className: 'dt-right'},
                    {data: 'quotes.USD.percent_change_7d', render: renderChange, className: 'dt-right'}
                ],
                ordering: false,
                paging: false,
                info: false,
                searching: false,
                scrollX: true,
                rowCallback: function(row, data, index) {
                    var val = data.quotes.USD.percent_change_24h;
                    if (val > 0) {
                        $(row).find('td:eq(5)').addClass('green');
                    } else if (val < 0) {
                        $(row).find('td:eq(5)').addClass('red');
                    }

                    val = data.quotes.USD.percent_change_7d;
                    if (val > 0) {
                        $(row).find('td:eq(6)').addClass('green');
                    } else if (val < 0) {
                        $(row).find('td:eq(6)').addClass('red');
                    }
                }
            });
        });
    })
    .catch(function(error) {
        console.log(error);
    });

function renderPrice(price) {
    var options = {
        style: 'currency',
        currency: 'USD'
    };
    return price.toLocaleString(undefined, options);
}

function renderCap(cap) {
    var si = [
        {value: 1, symbol: ''},
        {value: 1e3, symbol: 'K'},
        {value: 1e6, symbol: 'M'},
        {value: 1e9, symbol: 'B'},
        {value: 1e12, symbol: 'T'},
        {value: 1e15, symbol: 'P'},
        {value: 1e18, symbol: 'E'}
    ];
    for (var i = si.length - 1; i > 0; i--) {
        if (cap >= si[i].value) { break; }
    }
    return renderPrice(cap / si[i].value) + '&nbsp;' + si[i].symbol;
}

function renderAllo(allo) {
    return (allo * 100).toFixed(2) + '%';
}

function renderChange(change) {
    return change.toFixed(2) + '%';
}
