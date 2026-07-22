# 404 and WordPress Easter-egg routing

The production nginx server configuration is **not** version-controlled here. `wopr/nginx.example.conf` is only an example for WOPR-specific locations, not the complete deployed `dennishilk.com` server block. Apply the following small addition manually in the relevant production `server` block after the site files have been deployed.

```nginx
# Serve the static custom error page internally and retain the original 404 status.
error_page 404 /404.html;
location = /404.html {
    internal;
}

# Intentional static Easter-egg endpoints: these two exact probes return 200.
location = /wp-login.php {
    try_files /wordpress-nope.html =404;
}
location = /wp-admin/ {
    try_files /wordpress-nope.html =404;
}
```

`error_page 404 /404.html` internally serves `/404.html` while retaining the status of the original missing request. The `internal` location prevents direct public requests to `/404.html`; nginx will return its normal 404 response for a direct request instead.

Only `/wp-login.php` and `/wp-admin/` are intentional 200-response Easter-egg endpoints. They serve the single `wordpress-nope.html` file without a redirect. Do not add wildcard WordPress routing: all other missing WordPress paths, dotfiles, secret-like paths, and normal site routes must keep their existing handling.

Before reloading nginx, validate the deployed configuration:

```sh
sudo nginx -t
sudo systemctl reload nginx
curl -i https://dennishilk.com/a-page-that-does-not-exist
curl -i https://dennishilk.com/wp-admin/
curl -i https://dennishilk.com/wp-login.php
```
