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
