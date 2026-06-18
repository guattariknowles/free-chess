# Free Chess 1.10.0 离线棋局分析开发记录

记录日期：2026-06-18

## 本次内容

- 应用版本升级到 `1.10.0`，Android `versionCode` 升级到 `12`。
- 棋谱库已有 PGN 导入能力保持不变，导入后可直接进入复盘页。
- 复盘页新增 Stockfish 本地复盘卡片。
- 支持分析当前步、全局复盘和停止分析。
- 使用本地 Stockfish 18 高强度设置：`Skill Level 20`、每步约 1.2 秒。
- 每步显示 Stockfish 局面评分和推荐下法。
- 逐步比较实战走法与 Stockfish 首选走法。
- 分别统计白方和黑方与 AI 推荐下法的重合度。
- Stockfish 不可用或超时时，结果标记为未完成，不把简易 AI 降级结果算入重合度。

## 验证

- `npm run typecheck`：通过。
- `npm test`：82 项全部通过。
- `.\gradlew.bat :stockfish-engine:compileDebugKotlin`：通过。
- `.\gradlew.bat :stockfish-engine:compileReleaseKotlin :stockfish-engine:externalNativeBuildRelease :app:assembleRelease`：通过。
- Android API 36 x86_64 模拟器：
  - release APK 可独立启动，不依赖 Metro。
  - 包内版本为 `1.10.0 / versionCode 12`。
  - 成功导入短 PGN：`1. e4 e5 2. Nf3 Nc6 *`。
  - 复盘页完成 4 步全局分析。
  - 页面显示推荐下法、评分、白方重合度和黑方重合度。
  - 未发现应用崩溃或 `ERR_STOCKFISH` 日志。

## 本地 APK

- 文件：`builds/free-chess-1.10.0-2026-06-18-local.apk`
- 包名：`com.knowles.freechess`
- 版本名：`1.10.0`
- Android 版本号：`12`
- 文件大小：`108,653,266` 字节
- SHA-256：
  `2B77B401269066E9691E786C000A222F2C1723F769945EE9FC755AE044BE3509`
- 签名：Android 本地调试证书，供本地和 GitHub 测试版安装验收。
- APK 已确认包含：
  - `assets/index.android.bundle`
  - `lib/arm64-v8a/libstockfish.so`
  - `lib/x86_64/libstockfish.so`
  - 两个 Stockfish NNUE 网络

## 当前限制

- 当前分析提供 Stockfish 评分和首选走法重合度，不提供胜率、疑问手或败着等级。
- 尚未在 Android 真机上验收阶段 10 的长棋局复盘耗时、发热和停止行为。
- 100 局面直接脚本依赖 `run-as`，不能用于非 debuggable 的 release APK；本次 release APK 改用 UI 流程做初步模拟器验收。
