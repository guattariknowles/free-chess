# 阶段版本强制交付清单

本清单适用于路线图中每个编号阶段和大功能版本。代码完成不等于版本交付。

只有以下项目全部完成，才能在路线图、变更记录或回复中将版本标记为“完成”：

## 1. 版本一致性

- `package.json` 与 `package-lock.json` 版本一致。
- `app.json` 的应用版本和 Android `versionCode` 已递增。
- 本地原生 Android 项目存在时，`android/app/build.gradle` 的
  `versionName` 和 `versionCode` 与 `app.json` 一致。

## 2. 代码验证

- `npm run typecheck` 通过。
- `npm test` 全部通过。
- 涉及界面的功能至少完成一次 Android 模拟器或实体设备冒烟测试。
- 变更记录写明尚未覆盖的测试范围。

## 3. APK 交付

- 成功构建可安装的 Android APK。
- APK 文件名包含应用版本和构建日期。
- 验证包名、版本名、版本号、最低 SDK 和目标 SDK。
- 验证 APK 数字签名。
- 计算并记录 APK 文件大小和 SHA-256。

## 4. GitHub 同步

- 完整变更已经提交。
- 提交已经推送到 GitHub 默认分支。
- 已创建与版本对应的 Git 标签。
- 已创建 GitHub Release。
- APK 已作为 Release 附件上传，公开下载链接可访问。

## 5. 文档更新

- `README.md` 包含当前 APK 下载链接和 SHA-256。
- `ROADMAP.md` 与实际完成阶段一致。
- 版本化 Changelog 包含功能、测试、构建、APK 和风险信息。
- 本机 `PROJECT_MEMORY.md` 记录当前发布版本和交付物。

## 阻塞处理

任一步骤失败时，版本只能标记为“开发完成但尚未完整交付”，并必须记录：

- 未完成的具体步骤。
- 阻塞原因。
- 已经完成并验证的部分。

不得在缺少 GitHub 提交、Release 或可下载 APK 时宣称版本已经发布。
