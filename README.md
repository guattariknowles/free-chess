# Free Chess

Free Chess 是一款面向初学者和本地双人对弈的 Android 国际象棋应用。

项目坚持离线优先、无广告、无账号、无追踪，不依赖付费 API 或云端模型。
当前测试版本已接入 Android 本地 Stockfish 18，并加入离线复盘报告、
五档走法质量统计、胜率变化折线图和本地主题/图标资源。`arm64`
实体手机和 EAS preview 仍需后续验收，不能视为完整正式发布。

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
- 导入 PGN 后可用本地深度复盘，查看每步评估、推荐走法和复盘报告
- 复盘报告显示白方/黑方五档走法质量统计、推荐吻合率和胜率变化折线图
- 创建、重命名和删除本地玩家档案
- 普通本地对局绑定两个不同档案
- 自由摆子、FEN 导入导出和自定义局面保存
- BO2、BO3、BO4、BO5、BO6 本地系列赛
- 系列赛颜色抽签、逐局换色和 1 / 0.5 / 0 积分
- 固定局数同分后的快棋、超快棋和单局决胜加赛
- 系列赛整组棋谱、比分详情和中断续赛
- 左侧工具侧边栏与底部主导航，减少棋盘顶部按钮拥挤
- 自定义局面错误列表、问题格标记和终局起点拦截
- 41 节内置离线课程，覆盖规则、开局、经典名局、中局和残局
- 教学小棋盘、推荐走法和常见错误解释
- 全部内置课程从标准初始局面进入真人对 AI 的互动教学
- 7 节原创挑战和 3 节经典名局走法课程
- 教学对手使用离线本地 AI，并受课程目标与合法走法约束
- 本地 PGN 训练导入，支持开局、经典名局和残局三种策略
- 开局训练后继续自由 AI 对弈，经典名局按棋谱，残局直接由 AI 处理
- 支持训练白方或黑方，导入内容只保存在本机
- 教学分类栏在不同课程数量下保持固定高度并支持横向滚动
- 面对面双人模式下远端一方棋子正向显示
- 三档完全离线的简单 AI：随机合法走法、吃子优先和一步子力评分
- 人机对局支持真人执白、执黑或随机执色，并兼容棋钟、棋谱和回放
- Android 本地 Stockfish 18，支持取消、超时、过期结果丢弃和异常降级
- 普通人机与教学自由对弈均可在飞行模式下运行

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

### Android 本地 Stockfish 构建

Stockfish 原生模块不能在 Expo Go 中运行，需要 Android 开发构建或 APK。
仓库已经保存对应的 Stockfish 18 源码、NNUE 网络、Kotlin 接口和 CMake
构建配置，不依赖本机临时下载文件。

需要 Java 17、Android SDK 36、NDK `27.1.12297006` 和 CMake `3.22.1`。
在 Windows PowerShell 中可运行：

```powershell
cd android
.\gradlew.bat :stockfish-engine:compileDebugKotlin `
  :stockfish-engine:externalNativeBuildDebug `
  :app:assembleDebug
```

调试 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。
它应包含：

```text
lib/arm64-v8a/libstockfish.so
lib/x86_64/libstockfish.so
assets/stockfish/nn-c288c895ea92.nnue
assets/stockfish/nn-37f18f62d772.nnue
```

安装调试 APK 并启动过一次 Stockfish 后，可运行 100 局面稳定性检查：

```powershell
npm run test:stockfish:android -- emulator-5554 com.knowles.freechess 100
```

Stockfish 的来源、GPL v3 许可证和网络校验值见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 项目状态

阶段 1 棋盘与规则、阶段 2 棋钟、阶段 3 PGN 与棋谱、阶段 4
本地档案与局面、阶段 5 基础教学、阶段 6 简单本地 AI、阶段 7
互动教学、阶段 8 AI 对弈挑战与 PGN 导入已经完成。阶段 9 Android
本地 Stockfish 已发布 `1.9.0` 测试版供实体手机验收；在 `arm64`
实体手机通过前，阶段 9 仍不能标记为完整交付。阶段 10 离线棋局分析
已随 `1.10.0` 本地测试 APK 完成模拟器初测。阶段 11 全软件主题与
棋盘/棋子皮肤已随 `1.11.0` 本地测试 APK 交付，支持 5 套 UI 主题、
12 套棋盘皮肤和 5 套棋子皮肤。`1.12.0` 本地测试 APK 进一步优化
复盘报告表达方式，接入新的 Free Chess 图标，并补齐首套 12 件教学
棋子 SVG 资源。

## 最新本地测试 APK

- 版本：`1.12.0`
- Android versionCode：`14`
- 文件：`builds/free-chess-1.12.0-2026-06-20-local.apk`
- GitHub Release：
  `https://github.com/guattariknowles/free-chess/releases/tag/v1.12.0`
- SHA-256：
  `80EA3807D0FA8A49997BCAC0DBD8F8C807CCCA26E3E286FB86E021573907CD0C`
- 验证：`npm run typecheck` 通过，`npm test` 84 项通过，
  `:app:assembleRelease` 通过。
- 签名：本地 Android debug keystore 签名，仅用于个人测试安装。

完整计划见 [ROADMAP.md](ROADMAP.md)。

阶段版本必须同时完成测试、APK 和 GitHub Release，详见
[阶段版本强制交付清单](docs/RELEASE_CHECKLIST.md)。

## 下载 Android 测试版

- [GitHub Releases](https://github.com/guattariknowles/free-chess/releases)
- [直接下载 Free Chess 1.11.0 主题与皮肤测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.11.0/free-chess-1.11.0-2026-06-18-local.apk)
- [直接下载 Free Chess 1.10.0 离线棋局分析测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.10.0/free-chess-1.10.0-2026-06-18-local.apk)
- [直接下载 Free Chess 1.9.0 Stockfish 测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.9.0/free-chess-1.9.0-2026-06-15-local.apk)
- [直接下载 Free Chess 1.8.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.8.0/free-chess-1.8.0-2026-06-13-local.apk)
- [直接下载 Free Chess 1.7.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.7.0/free-chess-1.7.0-2026-06-13-local.apk)
- [直接下载 Free Chess 1.6.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.6.0/free-chess-1.6.0-2026-06-13-local.apk)
- [直接下载 Free Chess 1.5.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.5.0/free-chess-1.5.0-2026-06-12-local.apk)
- [直接下载 Free Chess 1.4.0 EAS APK](https://github.com/guattariknowles/free-chess/releases/download/v1.4.0/free-chess-1.4.0-2026-06-12-eas.apk)
- [直接下载 Free Chess 1.4.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.4.0/free-chess-1.4.0-2026-06-12-local.apk)
- [直接下载 Free Chess 1.3.0 本地测试 APK](https://github.com/guattariknowles/free-chess/releases/download/v1.3.0/free-chess-1.3.0-2026-06-12-local.apk)
- [下载 Free Chess 1.2.0 本地测试 APK（不含 Part 4）](https://github.com/guattariknowles/free-chess/releases/download/v1.2.0/free-chess-1.2.0-2026-06-11-local.apk)

`1.4.0` 本地测试 APK 的 SHA-256：

```text
E4B6B2D5D5A45D7B2B40022FB5015FCFA9560246FF7D8FBA3EFB570ADCD43F28
```

`1.5.0` 本地测试 APK 的 SHA-256：

```text
75341F2E1114AF3A1773FAABCB9F07088F9646D19A93C77EBBB883D75A4C41B2
```

`1.6.0` 本地测试 APK 的 SHA-256：

```text
157B6F50F81D88162A809F246CA7D5EF7A3689FFBD7773BEA6427D8E2A7E8CC3
```

`1.7.0` 本地测试 APK 的 SHA-256：

```text
48D6DD78B3EB1081642E6EEC382959882B57E3EBF0A3B14EF41DE2406F702F4F
```

`1.8.0` 本地测试 APK 的 SHA-256：

```text
C2C460037E23CCE7BC6FF8C1B8DF3D50AA1483C0299B7FAE55A76C77380E47C3
```

`1.9.0` Stockfish 测试 APK 的 SHA-256：

```text
D74F35F18F75D2F5D11C1E16D4E58A18904BDBCF9F69D75652818F596717EF2B
```

`1.10.0` 离线棋局分析测试 APK 的 SHA-256：

```text
2B77B401269066E9691E786C000A222F2C1723F769945EE9FC755AE044BE3509
```

`1.11.0` 主题与皮肤测试 APK 的 SHA-256：

```text
AFA422E6F241ACD490D11500ECF1E848C75DA18E05BF1F8BB01A71434C9FE012
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
