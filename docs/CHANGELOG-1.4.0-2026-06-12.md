# Free Chess 1.4.0

发布日期：2026-06-12

当前标记：完整测试发布。已同时完成本地 APK 和 EAS preview APK。

## 界面调整

- 主页面顶部移除密集的功能按钮，只保留品牌、对局摘要和工具入口。
- 采用左侧覆盖式工具侧边栏，包含自由局面、系列赛、棋钟和档案管理。
- 增加“对局 / 棋谱 / 玩家 / 我的”底部主导航。
- 小屏幕打开侧边栏时覆盖页面，不压缩棋盘。
- 保留棋盘下方的主要对局操作。

## 自定义局面修复

- 保存局面和开始对局使用同一套合法性检查。
- 检查双方王的数量、棋子总数、兵的位置和双方王是否相邻。
- 拦截双方同时被将军、非走棋方被将军等不合法状态。
- 将死、逼和及其他已经结束的局面不能作为普通对局起点。
- 一次显示全部错误，并在棋盘上标记相关问题格。

## 验证结果

- `npm run typecheck`：通过。
- `npm test`：36 项全部通过。
- Android 36 模拟器：安装和启动通过。
- 左侧侧边栏：打开、关闭、内容显示和棋盘覆盖布局通过。
- 自定义将死局面：成功拦截，错误列表与问题格标记显示正确。

## 本地 APK

- 文件：`builds/free-chess-1.4.0-2026-06-12-local.apk`
- 大小：`67,796,393` 字节
- 包名：`com.knowles.freechess`
- 版本名：`1.4.0`
- Android 版本号：`6`
- 最低 Android API：`24`
- 目标 Android API：`36`
- SHA-256：`E4B6B2D5D5A45D7B2B40022FB5015FCFA9560246FF7D8FBA3EFB570ADCD43F28`
- APK Signature Scheme v2：通过
- 签名证书 SHA-256：`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`
- 下载地址：<https://github.com/guattariknowles/free-chess/releases/download/v1.4.0/free-chess-1.4.0-2026-06-12-local.apk>

本地 APK 使用本机 Android 调试签名，不能直接覆盖使用 EAS 签名安装的版本。

## EAS Preview

- 构建 ID：`0cec43e3-ca66-4152-b37b-f40c67995baf`
- 应用版本：`1.4.0`
- Android 版本号：`6`
- 状态：构建成功
- 文件：`builds/free-chess-1.4.0-2026-06-12-eas.apk`
- 大小：`67,796,397` 字节
- 包名：`com.knowles.freechess`
- 最低 Android API：`24`
- 目标 Android API：`36`
- SHA-256：`A4FFCB69E73132A0AAC5532A2015EC82EBC50F3C9FF4DE3FEAE4CDD35FF4A4FD`
- APK Signature Scheme v2：通过
- 签名证书 SHA-256：`25feff35b859c83f633ace9e26552d5ad0f62441c0bc2e8dae409717164f5c69`
- 下载地址：<https://github.com/guattariknowles/free-chess/releases/download/v1.4.0/free-chess-1.4.0-2026-06-12-eas.apk>
- 构建页面：<https://expo.dev/accounts/knowles/projects/chess-mobile-teacher/builds/0cec43e3-ca66-4152-b37b-f40c67995baf>

## 已知风险

- 尚未在实体 Android 手机上完成本版本验收。
- 本地 APK 与 EAS APK 使用不同签名，二者通常不能直接互相覆盖安装。
