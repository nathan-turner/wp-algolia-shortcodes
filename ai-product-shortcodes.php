<?php
/**
 * Plugin Name: Algolia Shortcode Parser
 * Description: Allows user to create shortcodes for algolia products that will be rendered on the page.
 * Author: Nathan Turner
 */
 
add_action('admin_menu', 'my_plugin_menu');

add_action( 'wp_enqueue_scripts', 'my_enqueued_assets' );

add_action( 'admin_enqueue_scripts', 'my_enqueued_assets' );


function my_enqueued_assets() {
	//wp_enqueue_script( 'jquery', '//code.jquery.com/jquery-3.3.1.min.js' );	
	wp_enqueue_script( 'algolia', '//cdn.jsdelivr.net/algoliasearch/3/algoliasearch.min.js' );
	wp_enqueue_script( 'wp_script_variables', plugin_dir_url( __FILE__ ) . '/js/wp_script_vars.js' );
	wp_enqueue_script( 'shortcodes-script', plugin_dir_url( __FILE__ ) . '/js/shortcodes.js', array( 'jquery' ) );	
	wp_enqueue_style( 'shortcodes-css', plugin_dir_url( __FILE__ ) . '/css/shortcodes.css' );
	wp_enqueue_script( 'slick', plugin_dir_url( __FILE__ ) . '/js/slick/slick.min.js', array( 'jquery' ) );
	wp_enqueue_style( 'slick-css', plugin_dir_url( __FILE__ ) . '/js/slick/slick.css' );
	//wp_enqueue_script( 'shortcodes-build', plugin_dir_url( __FILE__ ) . '/dist/main.js', array( 'jquery', 'slick' ) );
}

function my_plugin_menu() {
	add_menu_page('Short Codes Settings', 'Short Codes Plugin', 'administrator', 'ai-shortcodes-settings', 'shortcodes_settings_page', 'dashicons-admin-generic');	
}

function shortcodes_settings_page() {
  // 
 ?>
 <h2>Update Product Short Code Settings</h2>
 <p style="padding: 10px; font-style: italicize;">Update Settings Here:</p>
<form method="post" action="options.php">
    <?php settings_fields( 'ai-shortcodes-settings' ); ?>
    <?php do_settings_sections( 'ai-shortcodes-settings-group' ); ?>
    <table class="form-table" style="width: 70%;">        
        
        <tr valign="top">
        <th scope="row">Default Algolia Index Name:</th>
		<td><input type="text" name="algolia_indexName" value="<?php echo esc_attr( get_option('algolia_indexName') ); ?>" style="width: 500px"/></td>
		
		</tr>
		<tr valign="top">
		<th scope="row">Algolia App ID:</th>
		<td><input type="text" name="algolia_algoliaAppId" value="<?php echo esc_attr( get_option('algolia_algoliaAppId') ); ?>" style="width: 500px" /></td>
        
        </tr>
		<tr valign="top">
		<th scope="row">Algolia API KEY:</th>
		<td><input type="text" name="algolia_algoliaAPIKey" value="<?php echo esc_attr( get_option('algolia_algoliaAPIKey') ); ?>" style="width: 500px" /></td>
        
        </tr>
		
		<tr valign="top">
		<th scope="row">Space ID:</th>
		<td><input type="text" name="algolia_spaceId" value="<?php echo esc_attr( get_option('algolia_spaceId') ); ?>" style="width: 500px" /></td>
        
        </tr>
    </table>    
    <?php submit_button(); ?>
	 <p style="padding: 10px; font-style: italicize;">Use shortcode [products_list] to include on pages.</p>
</form>
 <?php
}

add_action( 'admin_init', 'prod_shortcode_settings' );

function prod_shortcode_settings() {
	
	register_setting( 'ai-shortcodes-settings', 'algolia_indexName' );
	register_setting( 'ai-shortcodes-settings', 'algolia_algoliaAppId' );
	register_setting( 'ai-shortcodes-settings', 'algolia_algoliaAPIKey' );
	register_setting( 'ai-shortcodes-settings', 'algolia_spaceId' );
	
}

//Add our shortcode
add_shortcode('products_list','products_list_shortcode_output');
add_shortcode('slider','products_slider_shortcode_output');
//perform the shortcode output
function products_list_shortcode_output($atts, $content = '', $tag){
	$div_hash = "prods_".md5(time()+mt_rand(0,1000));   
	$loc_info = LocAPI::getLocationInfo($_SERVER['REMOTE_ADDR']);	
	if($loc_info['price_zone']!='' && $loc_info['region']!=''){
		echo '<script>indexName = "'.$loc_info['region'].'-prod-zone'.$loc_info['price_zone'].'-price-asc";
		var userRegion = "'.$loc_info['region'].'"; var userPriceZone="'.$loc_info['price_zone'].'";</script>';
	}
	require('inc/wp_product_shortcode.php');		
	$html = '<div class="prods_block" id="'.$div_hash.'" data-hash="'.$div_hash.'"></div>';
    return $html;
}

function products_slider_shortcode_output($atts, $content = '', $tag){	
	$slider_hash = "slider_".md5(time()+mt_rand(0,1000));
	$html = '<div class="prods-slider prods_slider" id="'.$slider_hash.'">'.do_shortcode($content).'</div>';
    return $html;
}


class TinyMCE_Custom_Link_Class {
	function __construct()
	{
		add_action( 'init', array(  $this, 'setup_tinymce_plugin' ) );
	}

	function setup_tinymce_plugin() {
		if ( ! current_user_can( 'edit_posts' ) && ! current_user_can( 'edit_pages' ) ) {
            return;
		}
		 
		// Check if the logged in WordPress User has the Visual Editor enabled
		// If not, don't register our TinyMCE plugin
		if ( get_user_option( 'rich_editing' ) !== 'true' ) {
			return;
		}
		
		$file_path = plugin_dir_path( __FILE__ ).'js/wp_script_vars.js';
		//if(!file_exists($file_path)){
			$myfile = fopen($file_path, "w") or die("Unable to open file!");	
			$txt = "	
			var spaceId = '".esc_attr( get_option('algolia_spaceId') )."'; \r\n	
			var indexName = '".esc_attr( get_option('algolia_indexName') )."'; \r\n
			var algoliaAppId = '".esc_attr( get_option('algolia_algoliaAppId') )."'; \r\n
			var algoliaAPIKey = '".esc_attr( get_option('algolia_algoliaAPIKey') )."';	\r\n	
			";
			fwrite($myfile, $txt);
			fclose($myfile);
		//} 
		// Setup some filters
		add_filter( 'mce_external_plugins', array( &$this, 'add_tinymce_plugin' ) );
		add_filter( 'mce_buttons', array( &$this, 'add_tinymce_toolbar_button' ) );
	}
	
	function add_tinymce_plugin( $plugin_array ) {				
		//$plugin_array['custom_link_class'] = plugin_dir_url( __FILE__ ) . 'tinymce-custom-link-class.js';
		$plugin_array['custom_link_class'] = plugin_dir_url( __FILE__ ) . 'js/shortcodes.js';
		return $plugin_array;	 
	}
	
	function add_tinymce_toolbar_button( $buttons ) {	 
		array_push( $buttons, '|', 'custom_link_class' );
		array_push( $buttons, '|', 'custom_slider_class' );
		return $buttons;
	}
}

$tinymce_custom_link_class = new TinyMCE_Custom_Link_Class;

class LocAPI 
{	
	function __construct()
	{
		
	}

	public static function getLocationInfo($ip, $service='')
	{
		define('API_KEY', 'CRrjyrGHTe5qtmYWf58LW5Tw9jiU1B7e1HeU5yBi');
		define('URL','https://locations.furnitureapis.com');

		$fields = ''; //'city,state,zip';

		$url = URL.'?fields='.$fields.'&ip='.$ip.'&service='.$service;
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array(
			'x-api-key: '.API_KEY
		));
		return self::curlCall($ch);
	}

	private static function curlCall($ch)
	{
		$resp = curl_exec($ch);
		if ($resp === false) {
			echo "Error Number:".curl_errno($ch)."<br>";
			echo "Error String:".curl_error($ch);
			return $resp;
		}
		curl_close($ch);
		$resp = self::jsonToArray($resp);
		if($resp['success']=='1'){
			$data['zipCode']=$resp['response']['zip'];
	        $data['latitude']=$resp['response']['lat'];
	        $data['longitude']=$resp['response']['long'];
	        $data['city']=$resp['response']['city'];
	        $data['state']=$resp['response']['state'];
			$data['region']=$resp['response']['region'];
			$data['price_zone']=$resp['response']['price_zone'];
		}else{
			$data['region']='none';
			$data['state']=$resp['message'];
		}
		return $data;
	}

	public static function jsonToArray($Response)
    {
		return json_decode($Response, true);
    }
}