Sports 803 Publisher
=====================

This plugin embeds the Sports 803 Truepost dashboard inside WordPress admin and replaces the Blogger posting action with native WordPress publishing.

Installation
------------
1. Zip the `sports-803-publisher` folder, or use the provided ZIP package.
2. In WordPress, open Plugins > Add New > Upload Plugin.
3. Upload the ZIP, install it, and activate it.
4. Open the new Sports 803 menu in the WordPress admin sidebar.

Usage
-----
Use the existing Truepost workflow to fetch events, compose articles, generate thumbnails, fetch stream sources, and build the post. In Compose, choose DRAFT to save a WordPress draft or LIVE to publish immediately. Generated thumbnails are uploaded to the WordPress Media Library and assigned as the featured image. Existing post fields, labels, race/player embeds, templates, and scheduling controls remain available.

The plugin uses the currently logged-in WordPress account and WordPress nonces. No Application Password or external Blogger login is required.

Permissions
-----------
Users need `edit_posts` to open the dashboard. Users without `publish_posts` can save drafts or pending posts but cannot publish directly.
