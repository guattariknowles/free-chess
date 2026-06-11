# Free Chess 1.2.0

构建日期：2026-06-11

## 新增功能

- 自动生成并复制当前棋局 PGN。
- 导入 PGN，并对格式和非法走法显示错误提示。
- 对局结束后自动保存棋谱，也可手动保存进行中的棋局。
- 新增离线本地棋谱库，支持查看、复制和删除。
- 新增历史棋局逐步回放、首尾跳转和棋盘翻转。
- 将死、和棋、认输和超时结果会写入 PGN。

## 技术变更

- 使用 AsyncStorage 保存本地棋谱。
- 使用 Expo Clipboard 访问系统剪贴板。
- 补齐 Expo Web 依赖，使现有 `npm run web` 脚本可用。
- 新增 PGN 往返、错误校验、元数据和回放测试。

## 验证结果

- `npm run typecheck` 通过。
- `npm test` 通过，共 22 项测试。
- Expo Web JavaScript 包编译通过。
- 由于当前 Windows 沙箱无法启动内置浏览器，本次未完成浏览器点击和截图验证。
- 本地 Android Release 构建通过。
- APK 包名、版本、最低 SDK、目标 SDK 和 v2 数字签名验证通过。
- 本次未进行 Android 真机验收，等待用户安装测试。

## 版本信息

- 应用版本：`1.2.0`
- Android 版本号：`4`
- 本地 APK：`builds/free-chess-1.2.0-2026-06-11-local.apk`
- 文件大小：`67,725,393` 字节
- SHA-256：`F3845CC6400E1408D57BBCBA8A50385B7C3CEA61E4E185FD7EFD50DE880C829F`
- 本地 APK 使用 Android 调试签名，不能直接覆盖 EAS 签名版本。
- EAS preview 构建 ID：`185b46e8-a26c-41dd-b529-86f32fcdc3d2`
- EAS 状态：已上传，免费队列排队中
