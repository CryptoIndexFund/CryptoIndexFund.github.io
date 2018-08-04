// Get price data
const url = 'https://api.coinmarketcap.com/v2/ticker/?limit=10&structure=array';
fetch(url)
    .then(function(data) {
        return data.json();
    })
    .then(function(res) {
        var sorted = res.data;
        
        // Access quotes
        sorted.forEach(function(obj) {
            obj.price = obj.quotes.USD.price;
            obj.cap = obj.quotes.USD.market_cap;
        });

        // Calculate total market cap
        var total_cap = sorted.reduce(function(acc, obj) {
            return acc + obj.cap;
        }, 0);

        // Calculate index allocation
        sorted.forEach(function(obj) {
            obj.allocation = obj.cap / total_cap;
        });

        // Update the datatable
        function rendernumber(digits) {
            return $.fn.dataTable.render.number(',', '.', digits, '');
        }
        $(document).ready( function () {
            var tabledata = []
            $('#myTable').DataTable({
                data: sorted,
                columns: [
                    {data: 'symbol'},
                    {data: 'name'},
                    {data: 'price', render: rendernumber(3), className: 'dt-right'},
                    {data: 'cap', render: rendernumber(0), className: 'dt-right'},
                    {data: 'allocation', render: rendernumber(4), className: 'dt-right'}
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
