<?php
/**
 * Plugin Name: Sports 803 Publisher
 * Description: Native WordPress publishing workspace powered by the Sports 803 Truepost dashboard.
 * Version: 1.0.0
 * Author: Sports 803
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) exit;

define('SPORTS803_PUBLISHER_DIR', plugin_dir_path(__FILE__));

add_action('admin_menu', function () {
    add_menu_page('Sports 803 Publisher', 'Sports 803', 'edit_posts', 'sports-803-publisher', 'sports803_render_admin', 'dashicons-edit-page', 26);
});

function sports803_render_admin() {
    if (!current_user_can('edit_posts')) wp_die('You do not have permission to publish posts.');
    $dashboard = SPORTS803_PUBLISHER_DIR . 'dashboard.html';
    if (!is_readable($dashboard)) { echo '<div class="notice notice-error"><p>Sports 803 dashboard file is missing.</p></div>'; return; }
    $html = file_get_contents($dashboard);
    $config = '<script>window.SPORTS803_WP = ' . wp_json_encode(array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('sports803_publish'),
        'user' => wp_get_current_user()->display_name,
    )) . ';</script>';
    $publisher = <<<'JS'
<script>
(function () {
  window.postToBlogger = async function () {
    const t = v('post-title'), body = document.getElementById('post-body')?.value.trim() || '', rawStatus = v('post-status');
    const labels = v('post-labels').split(',').map(s => s.trim()).filter(Boolean);
    if (!t || !body) { toast('Title and body required', 'e'); return; }
    let thumbnail = v('compose-thumb-url');
    if (!thumbnail) {
      const canvas = document.getElementById('compose-canvas');
      if (canvas?.width) thumbnail = canvas.toDataURL('image/png');
    }
    let content = body.replace(/\n/g, '<br>');
    if (thumbnail && /^https?:\/\//i.test(thumbnail)) content = '<p><img src="' + thumbnail.replace(/"/g, '&quot;') + '" style="max-width:100%;height:auto;border-radius:10px" alt="' + t.replace(/"/g, '&quot;') + '"></p>' + content;
    if (currentComposeRace?.sources?.length) content += '\n\n' + buildRacePlayerIframe(currentComposeRace);
    const data = new FormData();
    data.append('action', 'sports803_publish'); data.append('nonce', window.SPORTS803_WP.nonce);
    data.append('title', t); data.append('content', content); labels.forEach(label => data.append('labels[]', label));
    data.append('status', rawStatus === 'LIVE' ? 'publish' : 'draft');
    data.append('post_id', editingPostId || '0'); data.append('thumbnail', thumbnail || '');
    const scheduled = document.getElementById('post-schedule-dt')?.value || '';
    data.append('date', scheduled);
    try {
      toast('Saving to WordPress…', 'i');
      const response = await fetch(window.SPORTS803_WP.ajaxUrl, { method: 'POST', body: data, credentials: 'same-origin' });
      const result = await response.json();
      if (!result.success) throw new Error(result.data?.message || 'WordPress rejected the post');
      const post = result.data;
      addRecentPost(t, post.url, rawStatus === 'LIVE' ? 'LIVE' : 'DRAFT');
      if (currentComposeEv) setLog(currentComposeEv, { postId: post.id, postUrl: post.url, status: rawStatus, title: t, thumb: thumbnail || null });
      toast(post.message, 's');
      if (editingPostId && typeof clearEditMode === 'function') clearEditMode();
    } catch (error) { toast('WordPress post failed: ' + error.message, 'e'); }
  };
  window.handleAuth = function () { toast('You are already signed in to WordPress.', 'i'); };
  window.initOAuth = function () { return true; };
})();
</script>
JS;
    echo '<div class="wrap sports803-publisher-wrap">' . $config . $html . $publisher . '</div>';
    echo '<style>.sports803-publisher-wrap{margin-left:-20px}.sports803-publisher-wrap>html,.sports803-publisher-wrap>body{display:block}.sports803-publisher-wrap .topbar{position:sticky}</style>';
}

add_action('wp_ajax_sports803_publish', function () {
    check_ajax_referer('sports803_publish', 'nonce');
    if (!current_user_can('edit_posts')) wp_send_json_error(array('message' => 'You do not have permission to publish posts.'), 403);

    $title = sanitize_text_field(wp_unslash($_POST['title'] ?? ''));
    $content = wp_kses_post(wp_unslash($_POST['content'] ?? ''));
    $status = sanitize_key(wp_unslash($_POST['status'] ?? 'draft'));
    $status = in_array($status, array('draft', 'publish', 'pending', 'future'), true) ? $status : 'draft';
    if ($status === 'publish' && !current_user_can('publish_posts')) $status = 'pending';
    $labels = array_filter(array_map('sanitize_text_field', (array) ($_POST['labels'] ?? array())));
    $post_id = absint($_POST['post_id'] ?? 0);
    $date = sanitize_text_field(wp_unslash($_POST['date'] ?? ''));

    if ($title === '' || $content === '') wp_send_json_error(array('message' => 'Title and content are required.'), 400);

    $post = array(
        'post_title' => $title,
        'post_content' => $content,
        'post_status' => $status,
        'post_type' => 'post',
        'post_author' => get_current_user_id(),
    );
    if ($date && in_array($status, array('future', 'publish'), true)) {
        $timestamp = strtotime($date);
        if ($timestamp) { $post['post_date'] = wp_date('Y-m-d H:i:s', $timestamp); $post['post_date_gmt'] = gmdate('Y-m-d H:i:s', $timestamp); }
    }
    if ($post_id) {
        $existing = get_post($post_id);
        if (!$existing || !current_user_can('edit_post', $post_id)) wp_send_json_error(array('message' => 'You cannot edit this post.'), 403);
        $post['ID'] = $post_id;
        $post_id = wp_update_post(wp_slash($post), true);
    } else {
        $post_id = wp_insert_post(wp_slash($post), true);
    }
    if (is_wp_error($post_id)) wp_send_json_error(array('message' => $post_id->get_error_message()), 500);

    if ($labels) wp_set_post_tags($post_id, $labels, false);
    $thumbnail = wp_unslash($_POST['thumbnail'] ?? '');
    if ($thumbnail) sports803_set_thumbnail($post_id, $thumbnail, $title);

    wp_send_json_success(array(
        'id' => $post_id,
        'url' => get_permalink($post_id),
        'status' => get_post_status($post_id),
        'message' => $post['post_status'] === 'publish' ? 'Published ✓' : 'Draft saved ✓',
    ));
});

function sports803_set_thumbnail($post_id, $source, $title) {
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $file = false;
    if (strpos($source, 'data:image/') === 0) {
        if (!preg_match('#^data:image/([a-zA-Z0-9.+-]+);base64,(.*)$#s', $source, $match)) return;
        $bytes = base64_decode($match[2], true);
        if ($bytes === false) return;
        $ext = strtolower($match[1]) === 'jpeg' ? 'jpg' : strtolower($match[1]);
        $file = wp_upload_bits(sanitize_title($title) . '.' . $ext, null, $bytes);
        if (!empty($file['error'])) return;
        $attachment = array('post_mime_type' => $file['type'], 'post_title' => $title, 'post_status' => 'inherit');
        $attachment_id = wp_insert_attachment($attachment, $file['file'], $post_id);
        if (!is_wp_error($attachment_id)) {
            wp_update_attachment_metadata($attachment_id, wp_generate_attachment_metadata($attachment_id, $file['file']));
            set_post_thumbnail($post_id, $attachment_id);
        }
        return;
    }
    if (filter_var($source, FILTER_VALIDATE_URL)) {
        $attachment_id = media_sideload_image($source, $post_id, $title, 'id');
        if (!is_wp_error($attachment_id)) set_post_thumbnail($post_id, $attachment_id);
    }
}

add_filter('script_loader_tag', function ($tag, $handle) { return $tag; }, 10, 2);
?>
