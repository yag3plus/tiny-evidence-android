# Tiny Evidence Android 1.4

这是可直接上传到 GitHub、使用 GitHub Actions 构建 APK 的 Android 项目。

## 手机版专属功能
- 用户自定义早晨与晚间时间。
- 早晨发送“我起床了”，晚间发送“我要睡觉了”。
- 点击通知会打开早晚陪伴页面。
- 早晨需要拉开窗帘；晚间需要关灯并盖好毯子。
- 提醒使用 Android 本地 AlarmManager，不依赖服务器；系统省电策略可能造成轻微延迟。
- Android 13 及以上首次开启提醒时需要允许通知权限。
- 手机重启或应用更新后会恢复已开启的提醒。

## 构建
项目已包含 `.github/workflows/build-apk.yml`。上传全部文件到 GitHub 仓库后，在 Actions 中运行 Build Android APK。


## 1.4.1 修复

- 修复安卓 App 中“导入备份 → 选择文件”点击后没有反应的问题。
- WebView 现在会调用安卓系统文件选择器。
- 支持选择 JSON、文本和部分文件管理器识别为通用类型的备份文件。
- 取消选择文件时会正确返回，不会卡住下一次导入。


## 1.4.2 图标修复

- 已把 Tiny Evidence 企鹅图标资源直接合并进安卓项目。
- 已加入 mdpi、hdpi、xhdpi、xxhdpi、xxxhdpi 多尺寸图标。
- 已在 AndroidManifest.xml 中设置：
  - android:icon="@mipmap/ic_launcher"
  - android:roundIcon="@mipmap/ic_launcher_round"
- 重新构建 APK 后会显示新的应用图标。
