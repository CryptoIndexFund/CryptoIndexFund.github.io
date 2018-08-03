var table = document.getElementById('table');

// Get price data
const url = 'https://api.coinmarketcap.com/v2/ticker/?limit=10';
fetch(url)
	.then(data=>{return data.json()})
  .then(res=>{
  	console.log(res);
    console.log(res.data);
    
    // Convert object to sorted array
    var raw = res.data,
    	sorted = Object.keys(raw).sort(function(a, b) {
        return raw[a].rank - raw[b].rank;
    }).map(function(sortedKey) {
        return raw[sortedKey];
    });
    console.log(sorted);
    
    // Access quotes
    sorted.forEach(function(obj) {
    	obj.price = obj.quotes.USD.price;
    	obj.cap = obj.quotes.USD.market_cap;
    });
    
    // Calculate total market cap
    var total_cap = sorted.reduce(function(acc, obj) {
    	return acc + obj.cap;
    }, 0);
    console.log(total_cap);
    
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
        	{data: 'symbol', title: 'Symbol'},
          {data: 'name', title: 'Name'},
          {data: 'price', title: 'Price', render: rendernumber(3), className: 'dt-body-right'},
          {data: 'cap', title: 'Market Capitalization', render: rendernumber(0), className: 'dt-body-right'},
          {data: 'allocation', title: 'Index Allocation', render: rendernumber(4), className: 'dt-body-right'}
        ],
        ordering: false,
        paging: false,
        info: false,
        searching: false
      });
    });
  })
  .catch(error=>console.log(error))
