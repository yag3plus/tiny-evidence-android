package com.tinyevidence.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int CREATE_EXPORT_FILE = 1001;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1002;
    private static final int OPEN_IMPORT_FILE = 1003;
    private WebView webView;
    private String pendingExportJson;
    private String pendingInteraction;
    private ValueCallback<Uri[]> pendingFileChooserCallback;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(243, 239, 232));
        getWindow().setNavigationBarColor(Color.rgb(243, 239, 232));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        webView = new WebView(this);
        setContentView(webView);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (pendingFileChooserCallback != null) {
                    pendingFileChooserCallback.onReceiveValue(null);
                }
                pendingFileChooserCallback = filePathCallback;

                Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                }

                intent.setAction(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "application/json",
                        "text/json",
                        "text/plain",
                        "application/octet-stream"
                });

                try {
                    startActivityForResult(intent, OPEN_IMPORT_FILE);
                    return true;
                } catch (Exception e) {
                    pendingFileChooserCallback = null;
                    Toast.makeText(MainActivity.this, "无法打开文件选择器", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("file".equals(uri.getScheme())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                openPendingInteraction();
            }
        });
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        pendingInteraction = getIntent().getStringExtra("interaction");
        webView.loadUrl("file:///android_asset/web/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        pendingInteraction = intent.getStringExtra("interaction");
        openPendingInteraction();
    }

    private void openPendingInteraction() {
        if (webView == null || pendingInteraction == null) return;
        String safe = "morning".equals(pendingInteraction) ? "morning" : "evening";
        webView.evaluateJavascript("window.openSleepInteraction && window.openSleepInteraction('" + safe + "');", null);
        pendingInteraction = null;
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void exportNotes(String json) {
            runOnUiThread(() -> {
                pendingExportJson = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "tiny-evidence-export.json");
                startActivityForResult(intent, CREATE_EXPORT_FILE);
            });
        }

        @JavascriptInterface
        public void showMessage(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public String getReminderSettings() {
            return ReminderScheduler.getSettingsJson(MainActivity.this);
        }

        @JavascriptInterface
        public void saveReminderSettings(String json) {
            runOnUiThread(() -> {
                try {
                    JSONObject obj = new JSONObject(json);
                    ReminderScheduler.saveSettings(MainActivity.this, obj);
                    ReminderScheduler.scheduleAll(MainActivity.this);
                    requestNotificationPermissionIfNeeded();
                    Toast.makeText(MainActivity.this, "提醒设置已经保存", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "提醒设置保存失败", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == CREATE_EXPORT_FILE && resultCode == RESULT_OK && data != null && pendingExportJson != null) {
            Uri uri = data.getData();
            if (uri == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out != null) {
                    out.write(pendingExportJson.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "内容已导出", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Toast.makeText(this, "导出失败", Toast.LENGTH_SHORT).show();
            }
            pendingExportJson = null;
            return;
        }

        if (requestCode == OPEN_IMPORT_FILE) {
            if (pendingFileChooserCallback == null) return;

            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            }

            pendingFileChooserCallback.onReceiveValue(results);
            pendingFileChooserCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
