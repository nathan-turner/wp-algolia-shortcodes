const perpage = 1000; 
const algoliaPerPage = 50;
const maxPages = 1000;
var exclusions = [];
var excludedSkus = [];
var skuNames = {};
var currentPage = 0;
var page = 0;
var viewAll = false;
var filters, exclusions = '';
var shortCode = '';
var selectedFacets = ['category', 'collection', 'brand', 'color_family', 'decor', 'sub_category', 'finish_family', 'style', 'gender', 'feature', 'material'];
var listFacets = ['category', 'collection', 'brand', 'sub_category'];
var inputFacets = ['color_family', 'decor', 'finish_family', 'style', 'gender', 'feature', 'material'];

jQuery(document).ready( function ($) {
	
	if($('.prods_block').length) {
		
		$('.prods_block:not(.prods_slider > .prods_block)').each(async function(e) {
			var prod_block = $(this);
			var prod_hash = $(this).data('hash');
			var prod_obj = window[`prod_shortcode_obj_${prod_hash}`];			
			let prod_results = await loadShortCode(prod_obj);
			document.getElementById(`${prod_hash}`).insertAdjacentHTML('beforeend', buildProducts(prod_results.hits, true));
			
			lazy_load_images();
		}); 
		
		if($('.prods_slider').length)
		{
			$('.prods_slider').addClass('hide');
			renderSliders($);		
		}
	}
	
	if(typeof tinymce !== 'undefined'){
		tinymce.PluginManager.add( 'custom_link_class', function( editor, url ) { 
			// Add Button to Visual Editor Toolbar
			var urlArr = url.split('/');
			urlArr.pop();
			url = urlArr.join('/');
			editor.addButton('custom_link_class', {
				title: 'Insert Shortcode',
				image: url + '/icon.png',
				cmd: 'custom_link_class',
			});  
			editor.addButton('custom_slider_class', {
				title: 'Insert Slider',				
				text: '[slider]',
				cmd: 'custom_slider_class',
			}); 
			
			editor.addCommand('custom_link_class', async function() {
				var text = editor.selection.getContent({
					'format': 'html'
				});
				var elem = document.querySelector('.shortcode_modal');
				if(elem)
					elem.parentNode.removeChild(elem);				
				document.body.insertAdjacentHTML("afterend", '<div class="shortcode_modal " ><div class="modal_back" ></div><div class="modal_positioner" ><div class="modal_content" ></div></div></div>');
				var facets = await loadAlgoliaFacets();								
				buildInterface(facets, editor);
				
				document.querySelector('.shortcode_modal .modal_back').addEventListener('click', function(){					
					document.querySelector('.shortcode_modal').classList.toggle('hidden');
				});
				
				document.querySelector('#insert_shortcode').addEventListener('click', function(){
					editor.execCommand('mceReplaceContent', false, shortCode);
					document.querySelector('.shortcode_modal').classList.toggle('hidden');
				});
			});
			
			editor.addCommand('custom_slider_class', async function() {
				var text = editor.selection.getContent({
					'format': 'html'
				});
				editor.execCommand('mceReplaceContent', false, `[slider]${text}[/slider]`);				
				
			});
		});
	}
	
	$(window).on("scroll resize", function () {		
		lazy_load_images();
	});
	
	function lazy_load_images(selector) {
		jQuery((selector ? selector + ' ' : '') + "img.lazy").each(function () {
			var im = $(this);
			if (im.attr("src") == `${pluginDir}/images/lazy-load.gif` && is_on_screen(im.parent())) {
				var src = (im.attr("data-src") != '' ? im.attr("data-src") : '/images/no-photo.jpg');
				im.attr("src", src).removeAttr("data-src");
				im.on('error', function () {
					im.attr('src', `${pluginDir}/images/no-photo.jpg`);
				})
			}
		});
	}

	function is_on_screen(obj) {
		var win = jQuery(window);
		var viewport = {
			top: win.scrollTop(),
			left: win.scrollLeft()
		};
		viewport.right = viewport.left + win.width();
		viewport.bottom = viewport.top + win.height();

		var bounds = obj.offset();
		bounds.right = bounds.left + obj.outerWidth();
		bounds.bottom = bounds.top + obj.outerHeight();

		return (!(viewport.bottom < bounds.top + 1));
	};
	
	async function renderSliders($){
	//document.querySelectorAll('.prods_slider').forEach(s => s.classList.add('hide'));	
	await Promise.all(Array.from(document.querySelectorAll('.prods_slider')).map(async function(slider_el) {
		var slider_div = slider_el; //$(this);
		var all_product_results = [];
		
		await Promise.all(Array.from(slider_el.querySelectorAll('.prods_block')).map(async function(el) {			
			
			var prod_hash = el.dataset.hash; //.data('hash');
			var prod_obj = window[`prod_shortcode_obj_${prod_hash}`];					
			let prod_results = await loadShortCode(prod_obj);			
			
			all_product_results = merge(all_product_results, prod_results.hits, "sku");
			return all_product_results;
		}));			
		slider_el.insertAdjacentHTML('beforeend', buildProducts(all_product_results, false));
	})); 
	//need to remove shortcode elements first
	$('.prods_slider p').remove();
	$('.prods_slider div.prods_block').remove();
	$('.prods_slider').slick({
	  infinite: true,
	  slidesToShow: 4,
	  slidesToScroll: 1,	  
	  autoplay: true,
	  rows: 1,
	  arrows: true,
	  prevArrow:"<button type='button' class='slick-prev pull-left'><</button>",
      nextArrow:"<button type='button' class='slick-next pull-right'>></button>",        
	  responsive: [
		{
		  breakpoint: 640,
		  settings: {			
			slidesToShow: 2
		  }
		},
		{
		  breakpoint: 480,
		  settings: {			
			slidesToShow: 1
		  }
		}
	  ]
	});	
	$('.prods_slider').removeClass('hide');
}

function merge(a, b, prop){
  var reduced = a.filter(function(aitem){
      return ! b.find(function(bitem){
          return aitem[prop] === bitem[prop];
      });
  });
  return reduced.concat(b);
}

async function loadShortCode(prod_shortcode_obj)
{	
	const client = await algoliasearch(algoliaAppId, algoliaAPIKey, { timeout: 4000, });				 
		
	filters = buildFilters(prod_shortcode_obj);	

	var limit = prod_shortcode_obj.limit || perpage;
	
	let prod_results = await loadAlgoliaContent(client, filters, exclusions, prod_shortcode_obj, limit);
	
	return prod_results;	
} 


function buildInterface(facets, editor) {
	document.querySelector('.shortcode_modal .modal_content').innerHTML = '';
	var uiHTML = '<div class="filters_row"><div class="facets"><h3>Query</h3><div class="filter"><label>Query:</label><input type="text" name="query" class="query" id="query" /></div></div></div><div class="filters_row"><div class="facets categories"><h3>Categories</h3>'+buildFacetsLists(facets)+'</div><div class="facets fields"><h3>Filters <a id="add_filter" class="button smallCircleButton addButton add_filter" title="Add Filter">+</a></h3><div id="filter_lists">'+buildFacetsSelection(facets, 'filter')+'</div></div><div class="facets exclusions"><h3>Exclusions <a id="add_exclusion" class="button smallCircleButton addButton add_filter" title="Add Exclusion">+</a></h3><div id="exclusion_lists">'+buildFacetsSelection(facets, 'exclusions')+'</div></div><div class="facets other"><h3>Other</h3><div class="filter"><label>Sort Skus:<span class="note">(Comma delim.)</span></label><input type="text" name="sort_skus" class="sort_skus" id="sort_skus" /></div><div class="filter"><label>Limit:</label><input type="text" name="limit" class="limit" id="limit" /></div></div></div>';
	uiHTML += '<button id="create_shortcode" class="btn">Generate Shortcode</button><button id="insert_shortcode" class="btn gray hidden">Insert Shortcode</button>';
	uiHTML += '<div><div id="total_results"></div><div id="shortcode_object"></div></div><div id="prod_results_box"></div>';	
	document.querySelector('.shortcode_modal .modal_content').insertAdjacentHTML("beforeend", uiHTML);
	bindEvents(facets, editor);

}

function bindEvents(facets, editor) {
	$('#create_shortcode').on('click', async function(e){
		let scode = buildShortCode(facets);				
		let prod_results = await loadShortCode(scode.shortCodeObj);
		shortCode = scode.shortCode;
		document.getElementById('shortcode_object').innerHTML = '';
		document.getElementById('shortcode_object').insertAdjacentHTML('beforeend',scode.shortCode);
		document.getElementById('total_results').innerHTML = '';
		document.getElementById('total_results').insertAdjacentHTML('beforeend',`Total Results: ${prod_results.nbHits}`);
		document.getElementById('prod_results_box').innerHTML = '';
		document.getElementById('prod_results_box').insertAdjacentHTML('beforeend', buildProducts(prod_results.hits, true, false));
		$('#insert_shortcode').removeClass('hidden');	
		$('.modal_positioner .modal_content').addClass('searched');
		lazy_load_images();
	});
	$('#add_filter').on('click', async function(e){		
		document.getElementById('filter_lists').insertAdjacentHTML('beforeend', buildFacetsSelection(facets, 'filter'));		
		bindRemovEvents();
	});
	$('#add_exclusion').on('click', async function(e){		
		document.getElementById('exclusion_lists').insertAdjacentHTML('beforeend', buildFacetsSelection(facets, 'exclusions'));		
		bindRemovEvents();
	});	
}

function bindRemovEvents() {
	$('.remove_filter').on('click', async function(e){			
		$(this).parent().remove();
		 
	});
}

function buildFacetsLists(facets) {
	var facetList = '';
	Object.keys(facets).filter(f => listFacets.includes(f)).sort().forEach(function(key) {
		facetList += buildFacetDropDown(key, facets[key]);    
	});
	return facetList;
}

/* function buildFacetsInputs(facets, type = 'filter') {
	var facetList = '';
	Object.keys(facets).filter(f => inputFacets.includes(f)).forEach(function(key) {
		facetList += buildFacetInput(key, type);    
	});
	return facetList;
} */

function buildFacetsSelection(facets, type = 'filter') {
	var facetList = '';
	var facetInput = '';	
	var options = '<option value="">--Select--</option>';
	
	//Object.keys(facets).filter(f => inputFacets.includes(f)).forEach(function(key) {
	Object.keys(facets).sort().forEach(function(key) {
		options += '<option value="'+key+'">'+key+'</option>';    
	});
	facetInput = `<div class="filter text facets_${type}_input"><select name="facets_${type}_input_sel" class="facets_${type}_input_sel">${options}</select><input name="${type}_txt" class="facets_${type}_input_txt"><a class="button smallCircleButton removeButton remove_filter" title="Remove Filter">×</a></div>`;
	return facetInput;
}

function buildFacetDropDown(name, facets_list) {
	var facetDropDown = '';
	Object.keys(facets_list).sort().forEach(function(key) {		
		facetDropDown += `<option value="${key.trim()}" >${key} - ${facets_list[key]}</option>`;    
	});
	facetDropDown = `<div class="filter"><label>${capitalizeFirstLetter(name)}: </label><select name="${name}_dropdown" id="${name}_dropdown" data-name="${name}" class="facets_dropdown"><option value="" >-- Select --</option>${facetDropDown}</select></div>`;
	return facetDropDown;
}

/* function buildFacetInput(name, type) {
	var facetInput = '';	
	facetInput = `<div class="filter text"><label>${capitalizeFirstLetter(name)}: </label><input name="${name}_txt" id="${name}_txt" data-name="${name}" class="facets_input_${type}"></div>`;
	return facetInput;
} */

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

async function loadAlgoliaFacets(){
	const client = await algoliasearch(algoliaAppId, algoliaAPIKey, { timeout: 4000, });
	const index = await client.initIndex(indexName);
	return index.search({
	  query: '',
	  facets: ['*']
	}).then(res => {	  		
	  return res.facets;
	});
}

function buildShortCode(facets)
{
	var shortCode = '';	
	var shortCodeObj = {};
	var fieldStr = '';		
	var attsStr = '';		
	var attsList = [];
	var fieldsList = [];
	var exclusionsStr = '';
	var exclusionsList = [];
	var sortskus = document.getElementById('sort_skus').value || '';
	var query = document.getElementById('query').value || '';
	var limit = document.getElementById('limit').value || '';
	var sortskusStr = '', queryStr = '', limitStr = '';
	
	//build category/brands
	document.querySelectorAll('.facets_dropdown').forEach(e => {		
		if(e.value != ''){
			attsList.push(`${e.dataset.name}="${e.value}"`);
			shortCodeObj[e.dataset.name] = e.value;
		}
	});
	
	//build filters	
	document.querySelectorAll('.facets_filter_input').forEach(e => {		
		let field_name = e.querySelector('.facets_filter_input_sel').value;
		let field_val = e.querySelector('.facets_filter_input_txt').value;		
		if(field_name != '' && field_val != ''){
			fieldsList.push(`${field_name}:'${field_val}'`);
		}
	});
	if(fieldsList.length){
		fieldStr = `fields="${fieldsList.join(',')}"`;
		shortCodeObj.fields = `${fieldsList.join(',')}`;
	}
	
	//build exclusions	
	document.querySelectorAll('.facets_exclusions_input').forEach(e => {		
		let field_name = e.querySelector('.facets_exclusions_input_sel').value;
		let field_val = e.querySelector('.facets_exclusions_input_txt').value;		
		if(field_name != '' && field_val != ''){
			exclusionsList.push(`${field_name}:'${field_val}'`);
		}
	});
	if(exclusionsList.length){
		exclusionsStr = `exclusions="${exclusionsList.join(',')}"`;
		shortCodeObj.exclusions = `${exclusionsList.join(',')}`;
	}
	
	if(attsList.length)
		attsStr = attsList.join(' ');
	
	if(sortskus!=''){
		shortCodeObj.sortskus = sortskus;
		sortskusStr = `sortskus="${sortskus}"`;
	}

	if(query!=''){
		shortCodeObj.query = query;
		queryStr = `query="${query}"`;
	}	
	
	if(limit!=''){
		shortCodeObj.limit = limit;
		limitStr = `limit="${limit}"`;
	}	

	shortCode = `[products_list ${attsStr} ${fieldStr} ${sortskusStr} ${exclusionsStr} ${queryStr} ${limitStr} ]`;
	return {shortCode, shortCodeObj};
}

function buildFilters(shortcode_obj)
{
	var filterArr = [], fieldArr = [], exclusionArr = [];
	var filterStr = '', fieldStr = '', exclusionStr = '', exfilterStr = '';	
	var fields = shortcode_obj.fields || '';
	
	var category = shortcode_obj.category || '';
	var sub_category = shortcode_obj.sub_category || '';
	var brand = shortcode_obj.brand || '';
	var collection = shortcode_obj.collection || '';	
	var exclusions = shortcode_obj.exclusions || '';

	if(category.includes('>')){
		let cats = category.split('>');
		category = cats[0];
		sub_category = cats[1];
	}
	if(category!='')
		filterArr.push(` category:"${category}" `);
	if(sub_category!='')
		filterArr.push(` sub_category:"${sub_category}" `);
	
	if(brand!='')
		filterArr.push(` brand:"${brand}" `);	
	if(collection!='')
		filterArr.push(` collection:"${collection}" `);
	
	//build filters
	fieldArr = buildFilterArray(fields, false);
	if(fieldArr.length)
		fieldStr = fieldArr.join(' AND ');
	if(filterArr.length){
		filterStr = filterArr.join(' AND ');
		if(fieldStr.trim() != '' && fieldArr.length)
			filterStr += ` AND (${fieldStr})`;		
	}
	else {
		if(fieldArr.length)
			filterStr += `(${fieldStr})`;
	}
	
	//build exclusions	
	exclusionArr = buildFilterArray(exclusions, true);
	if(exclusionArr.length){
		exfilterStr = exclusionArr.join(' AND ');
		if(exclusionStr.trim() != '' && exclusionArr.length)
			exfilterStr += ` AND (${exclusionStr})`;
		if(filterStr.trim() != '')
			exfilterStr = ` AND ${exfilterStr}`; 		
	}	
	
	return `${filterStr}${exfilterStr}`;
}

function buildFilterArray(fields, is_exclusions) 
{
	var fieldArr = [];

	if(fields.trim() != ''){
		fields.split(',').map((f => {			
			if(f.includes('&&') || f.includes('||'))
				f = f.replace(/\|\|/g,'" OR "').replace(/\&\&/g,'" AND "'); 
			let filter_name = '';
			if(is_exclusions) {
				filter_name = ' NOT '+f.split(':')[0];			
				f = ' NOT '+f;
			}
			else {
				filter_name = f.split(':')[0];
			}			
			f = rebuildFilters(filter_name, 'OR', f);		
			f = rebuildFilters(filter_name, 'AND', f);	
			
			fieldArr.push(` ${f} `);
		}));		
	}
	return fieldArr;
}

function rebuildFilters(filter_name, separator, filters_string)
{
	filters_string = filters_string.replace(`${filter_name}:`, '');	
	let filters = filters_string.split(separator);
	let newFilters = [];	
	filters.map(f => {		
		newFilters.push(`${filter_name}:${f}`);
	});	
	return newFilters.join(` ${separator} `);
}

/* function buildExclusions(shortcode_obj)
{
	var filterArr = [];
	var filterStr = '';	
	var exclusions = shortcode_obj.exclusions || '';		
	
	exclusions.split(',').map((f => {				
		if(f.includes('&&') || f.includes('||')){
			f = f.replace(/\|\|/g,' OR ').replace(/\&\&/g,' AND '); 			
		}
		filterArr.push(` ${f} `);
	}));
	if(filterArr.length)
		filterStr = filterArr.join(' AND ');
	
	return filterStr;
}  */

async function loadAlgoliaContent(client, filters, exclusions, shortcode_obj, limit)
{
	var sortskus = shortcode_obj.sortskus || '';	
	var query = shortcode_obj.query || '';		
	const queryObj = {
		query: query,			
		filters: filters,
		hitsPerPage: limit
	};
		
	const index = await client.initIndex(indexName);
	index.setSettings({
	  paginationLimitedTo: maxPages
	});    	
	var allResults;
	const results = await index.search(queryObj);		
	allResults = { ...allResults, ...results };
	const totalPages = results.nbPages;

	if(results.nbHits < limit){
		//loop if items exceed algolia limit
		for(let i=1; i<totalPages; i++){		
			let resObj = await index.search({
			  query: query,
			  filters: filters,
			  page: i,
			  hitsPerPage: limit
			});			
			let addtlresults = resObj;
			
			allResults.hits =  [...allResults.hits, ...addtlresults.hits];			
		} 
	} 
	
	if(sortskus!=''){
		sortskus.split(',').reverse().map(s => {			
			let found = allResults.hits.findIndex((h) => {				
				if(h.sku === s)
					return true;
			});
			if(found){
				allResults.hits.unshift(allResults.hits[found]);
				allResults.hits.splice(found+1, 1);
			}
		});
	}
	
	return allResults;
}

function buildProducts(prods, use_parent, lazy_load){
	var prodHtml = ``;
	use_parent = typeof use_parent !== 'undefined' ? use_parent : true;
	lazy_load = typeof lazy_load !== 'undefined' ? lazy_load : true;
	if(typeof prods !== 'undefined' && prods.length){
		for(let i = 0; i < prods.length; i++){
			let item = prods[i];
			let zone = (typeof userPriceZone !== 'undefined' && userPriceZone !='') ? userPriceZone : 0;
			let product_link = `https://www.roomstogo.com/furniture/product/${item.title.split(' ').join('-').toLowerCase()}/${item.sku}?utm_source=browseproduct&utm_medium=patiofurniture&utm_term=${item.sku}&utm_content=${item.title}&utm_campaign=feed`;			
			prodHtml += `<a class="product-tile" href="${product_link}" target="_blank">
			${(item[`zone_${zone}_on_sale`] || item.on_promotion)?`<div class="sale_flag">SALE</div>`:``}                                
				<div class="item-content" data-sku="${item.sku}">
						<div class="img-holder"><img class="img ${lazy_load ? 'lazy' : '' }" src="${lazy_load ? `${pluginDir}/images/lazy-load.gif` : `${item.primary_image}` }" data-src="${item.primary_image}${item.primary_image.indexOf('?')!==-1? '&w=300':'?w=300'}" onerror="this.src='${pluginDir}/images/no-photo.jpg';"  /></div>
						
						<div class="item-name">           
								<div class="sku">${item.sku}</div>             
								<div class="title">${item.title}</div>
								${item.free_shipping ? `<div class="free_shipping">FREE SHIPPING</div>`: ''}
								<div class="pricing ${(item[`zone_${zone}_on_sale`] || item.on_promotion)?`sale`:``}"><span class="orig">$${item[`zone_${zone}_list_price`] || item.price}${(item[`zone_${zone}_on_sale`] || item.on_promotion)?`</span><span class="sale">$${item[`zone_${zone}_sale_price`]}</span>`:``}</div>       
						</div>                                                         
				</div>
			</a>`;
		}
	}
	if(use_parent)
		prodHtml = `<div class="products-shortcode-block">${prodHtml}</div>`;
	else
		prodHtml = `${prodHtml}`;
	return prodHtml;	
}
});









