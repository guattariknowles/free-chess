# Free Chess

Free Chess 是一款面向初学者和本地双人对弈的 Android 国际象棋应用。

项目坚持离线优先、无广告、无账号、无追踪，不依赖付费 API 或云端模型。当前版本专注于标准国际象棋规则、棋钟、本地棋谱和面对面双人操作。

## 开发与维护声明

本项目完全由 Codex 开发，并由 Gemini 3.5 Flash 和 GPT-5.5 辅助。项目所有者仅负责提出需求和审核成品，不负责编程、错误处理、问题排查或需求解决。

本项目不提供人工技术支持。遇到安装、运行、修改或二次开发问题时，请自行查阅项目文档、提交 GitHub Issue，或询问你信任的大语言模型。

## 当前功能

- 标准 8x8 国际象棋棋盘
- 合法走法提示和非法走法拦截
- 将军、将死与和棋判断
- 王车易位、吃过路兵和兵升变
- 悔棋、重新开始和棋盘翻转
- 无棋钟、固定时间和自定义时间
- 每步加秒、暂停、继续和超时判负
- 黑白双方独立棋钟、认输和悔棋操作
- 对局结束结果弹窗
- 自动生成、复制和导入 PGN
- 对局结束自动保存和进行中手动保存
- 离线本地棋谱库与删除管理
- 历史棋局逐步回放和棋盘翻转
- 创建、重命名和删除本地玩家档案
- 普通本地对局绑定两个不同档案
- 自由摆子、FEN 导入导出和自定义局面保存
- BO2、BO3、BO4、BO5、BO6 本地系列赛
- 系列赛颜色抽签、逐局换色和 1 / 0.5 / 0 积分
- 固定局数同分后的快棋、超快棋和单局决胜加赛
- 系列赛整组棋谱、比分详情和中断续赛
- 左侧工具侧边栏与底部主导航，减少棋盘顶部按钮拥挤
- 自定义局面错误列表、问题格标记和终局起点拦截
- 31 节原创离线课程，覆盖规则、开局、中局和残局
- 教学小棋盘、推荐走法和常见错误解释
- 面对面双人模式下远端一方棋子正向显示

## 技术栈

- Expo SDK 56
- React Native
- TypeScript
- chess.js
- AsyncStorage

## 本地运行

需要 Node.js、npm，以及用于 Android 测试的 Expo Go 或 Android SDK。

```powershell
npm install
npm run typecheck
npm test
npm run android
```

## 项目状态

阶段 1 棋盘与规则、阶段 2 棋钟、阶段 3 PGN 与棋谱、阶段 4
本地档案与局面、阶段 5 基础教学已经完成。下一阶段是简单本地 AI。

完整计划见 [ROADMAP.md](ROADMAP.md)。

阶段版本必须同时完成测试、APK 和 GitHub Release，详见
[阶段版本强制交付清单](docs/RELEASE_CHECKLIST.md)。

## 下载 Android 测试版

- [GitHub Releases](https://github.com/guattariknowles/free-chess/releases)
- [直接下载 Free Chess 1.4.0 EAS APK](https://github.com/guattariknowles/free-chess/releases/download/v1.4.0/free-chess-1.4.0-2026-06-12-eas.apk)
- [直接下载 Free Chess 1.4.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.4.0/free-chess-1.4.0-2026-06-12-local.apk)
- [直接下载 Free Chess 1.3.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.3.0/free-chess-1.3.0-2026-06-12-local.apk)
- [下载 Free Chess 1.2.0 本地测试 APK（不含 Part 4）](https://github.com/guattariknowles/free-chess/releases/download/v1.2.0/free-chess-1.2.0-2026-06-11-local.apk)

`1.4.0` 本地测试 APK 的 SHA-256：

```text
E4B6B2D5D5A45D7B2B40022FB5015FCFA9560246FF7D8FBA3EFB570ADCD43F28
```

`1.4.0` EAS APK 的 SHA-256：

```text
A4FFCB69E73132A0AAC5532A2015EC82EBC50F3C9FF4DE3FEAE4CDD35FF4A4FD
```

`1.3.0` 本地测试 APK 的 SHA-256：

```text
6EFE97DE24AB9761F49A0D48859190C2DD8A17FE4750167FA31B6D6D2D822E46
```

`1.2.0` 本地测试 APK 的 SHA-256：

```text
F3845CC6400E1408D57BBCBA8A50385B7C3CEA61E4E185FD7EFD50DE880C829F
```

本地测试 APK 使用本机 Android 调试签名。若手机上安装的是 EAS 版，Android
可能提示签名不一致。卸载旧版会删除本机棋谱、档案、系列赛和自定义局面，
请先确认不需要保留这些本地数据。

## 隐私与联网

- 对局数据默认只保存在本机。
- 应用不包含账号、广告、追踪或云同步功能。
- EAS 仅用于生成 Android 测试安装包，不参与应用运行。

## 版权

项目代码使用 [MIT License](LICENSE)。

依赖项目及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

仓库不会收录来源不明的课程、题库、书籍原文、扫描件或第三方平台素材。
