// Get price data
const url = 'https://api.coinmarketcap.com/v2/ticker/?limit=10&structure=array';
fetch(url)
    .then(function(data) {
        return data.json();
    })
    .then(function(res) {
        // Calculate total market cap
        var total_cap = res.data.reduce(function(acc, obj) {
            return acc + obj.quotes.USD.market_cap;
        }, 0);

        // Calculate index allocation
        res.data.forEach(function(obj) {
            obj.allocation = obj.quotes.USD.market_cap / total_cap;
        });

        // Update the datatable
        $(document).ready( function () {
            var tabledata = []
            $('#myTable').DataTable({
                data: res.data,
                columns: [
                    {data: 'symbol'},
                    {data: 'name'},
                    {data: 'quotes.USD.price', render: renderPrice, className: 'dt-right'},
                    {data: 'quotes.USD.market_cap', render: renderCap, className: 'dt-right'},
                    {data: 'allocation', render: renderAllo, className: 'dt-right'},
                ],
                ordering: false,
                paging: false,
                info: false,
                searching: false
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
        { value: 1, symbol: '' },
        { value: 1E3, symbol: 'K' },
        { value: 1E6, symbol: 'M' },
        { value: 1E9, symbol: 'B' },
        { value: 1E12, symbol: 'T' },
        { value: 1E15, symbol: 'P' },
        { value: 1E18, symbol: 'E' }
    ];
    for (var i = si.length - 1; i > 0; i--) {
        if (cap >= si[i].value) {
            break;
        }
    }
	return renderPrice(cap / si[i].value) + '&nbsp;' + si[i].symbol;
}

function renderAllo(allo) {
	return (allo * 100).toFixed(2) + '%';
}
