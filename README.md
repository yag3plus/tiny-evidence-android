# Tiny Evidence Android

这是 Tiny Evidence 1.1 的 Android WebView 封装工程。

## 用 Android Studio 生成 APK

1. 安装 Android Studio。
2. 选择“Open”，打开本文件夹。
3. 等待 Gradle 同步和 SDK 组件下载完成。
4. 选择 `Build > Build Bundle(s) / APK(s) > Build APK(s)`。
5. APK 通常生成在：
   `app/build/outputs/apk/debug/app-debug.apk`

## 数据

网页内容保存在 Android WebView 的本地存储中。卸载 App 或清除 App 数据会删除记录。菜单中的导出按钮会打开 Android 文件保存窗口。
