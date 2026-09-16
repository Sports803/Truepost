<?php
/**
 * Plugin Name: Sports 803 Dashboard Host
 * Description: Hosts the standalone Sports 803 Blogger dashboard inside the admin workspace.
 * Version: 1.1.0
 * Author: Sports 803
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) exit;

define('SPORTS803_PUBLISHER_DIR', plugin_dir_path(__FILE__));

add_action('admin_menu', function () {
    add_menu_page('Sports 803 Dashboard', 'Sports 803', 'edit_posts', 'sports-803-publisher', 'sports803_render_admin', 'dashicons-edit-page', 26);
});

function sports803_render_admin() {
    if (!current_user_can('edit_posts')) wp_die('You do not have permission to access this dashboard.');
    $dashboard = SPORTS803_PUBLISHER_DIR . 'dashboard.html';
    if (!is_readable($dashboard)) {
        echo '<div class="notice notice-error"><p>Sports 803 dashboard file is missing.</p></div>';
        return;
    }
    $html = file_get_contents($dashboard);
    echo '<div class="wrap sports803-publisher-wrap">' . $html . '</div>';
    echo '<style>.sports803-publisher-wrap{margin-left:-20px}.sports803-publisher-wrap .topbar{position:sticky}</style>';
}
?>
