# 贡献指南

感谢你关注 Free Chess。

## 开发原则

- 规则正确性优先于功能数量。
- 优先修改现有代码，避免无关重构。
- 棋盘、棋钟、PGN 和引擎逻辑应与界面分开。
- 不增加账号、广告、追踪、云同步或付费 API。
- 不提交版权不明的题库、课程、书籍内容或图片。

## 提交前检查

```powershell
npm run typecheck
npm test
```

新功能应包含对应测试。涉及用户操作的功能还应在 Android 设备或模拟器上完成手动验证。

## 阶段版本发布门槛

完成路线图中的一个编号阶段或大版本时，以下事项全部完成后才能标记为已交付：

1. 同步更新 `package.json`、`package-lock.json`、`app.json` 和
   `android/app/build.gradle` 的版本号。
2. 运行类型检查和全部自动化测试。
3. 构建可直接安装的 Android APK，并保存到 `builds/`。
4. 检查 APK 的包名、版本名、版本号、签名和 SHA-256。
5. 提交代码、推送 GitHub、创建对应 Git 标签和 GitHub Release，并上传 APK。
6. 在 README、路线图、项目记忆和版本日志中记录下载链接、SHA-256、
   验证结果和剩余风险。

任何一步未完成，都必须明确写为“尚未完整交付”，不能只因代码完成就宣布版本发布。

完整逐项清单见 [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)。

## 问题报告

请提供：

- 复现步骤
- 预期结果
- 实际结果
- Android 版本和应用版本
- 必要时提供截图或录屏，但不要包含个人信息
