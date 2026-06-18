# 当前开发交接

更新时间：2026-06-15

## 1. 新对话先做什么

新对话接手后，先按顺序读取：

1. `AGENTS.md`
2. `docs/HANDOFF_CURRENT.md`
3. `docs/STAGE_9_STOCKFISH_PLAN.md`
4. `docs/FUTURE_PLAN.md`
5. `docs/DEVELOPMENT_MEMORY.md`
6. `git status --short`

当前目标只有一个：

```text
继续完成阶段 9：Android 本地 Stockfish
```

不要开始阶段 10 棋局分析或阶段 11 皮肤。

## 2. 当前准确状态

- 当前分支：`main`
- 发布提交：`d864fd1`，即 `v1.9.0` GitHub 测试版发布提交
- 当前稳定发布版本：`1.8.0`
- 当前实体机验收测试版：`1.9.0`
- Android `versionCode`：`11`
- 阶段 9 的 `1.9.0` 测试版代码已经提交并推送到 GitHub。
- 当前阶段结论：
  **开发接近完成，但阶段九尚未完整交付。**
- 在 `arm64` 实体机和 EAS preview 验证完成前，不得宣布阶段 9 完整完成。
- 教学剩余 3 项和飞行模式验收已在 x86_64 模拟器完成。
- 用户明确要求先发布测试 APK，再进行 `arm64` 实体手机验收；GitHub
  prerelease 已按此要求完成。

`PROJECT_MEMORY.md` 中“自动测试 68 项”描述的是已发布的 `1.8.0`
基线；当前阶段九分支实际已有 77 项自动测试，并已全部通过。

## 3. 已经完成的实现

### TypeScript 引擎层

`src/engine/` 已建立统一异步接口：

- `ChessEngine.ts`：引擎请求、返回值和错误边界。
- `SimpleEngine.ts`：原有简单 AI 的异步包装，用于降级。
- `StockfishEngine.ts`：调用 Android 原生模块。
- `engineManager.ts`：超时、停止、合法性复核和自动降级。
- `defaultEngine.ts`：应用共享的引擎实例。
- `uci.ts`：UCI 坐标走法解析和 `chess.js` 合法性检查。

界面不能直接调用 Kotlin 模块，只能使用统一引擎层。

### 普通人机和互动教学

- `src/screens/PlayScreen.tsx` 已改为异步请求引擎。
- 保留 450 毫秒最小思考显示时间。
- 重开、悔棋、切换模式、卸载页面时会停止或废弃旧请求。
- `src/game/lessonRuntime.ts` 已把学生走棋和 AI 回应拆开。
- `src/screens/InteractiveLessonScreen.tsx` 会锁定等待中的棋盘。
- 固定教学脚本仍保持原逻辑。
- 课程受限回应通过 UCI `searchmoves` 限制。

### Android 原生模块

模块目录：

```text
modules/stockfish-engine
```

已经实现：

- Expo SDK 56 本地模块自动链接。
- Kotlin 单任务执行队列。
- Stockfish 子进程启动和关闭。
- `uci`、`isready`、`setoption`、`position`、`go movetime`。
- `searchmoves`、`stop` 和 `bestmove` 解析。
- 进程异常后最多自动重启一次。
- 应用进入后台和模块销毁时停止搜索。
- 单线程、16 MB Hash、有限搜索时间。
- 支持 `arm64-v8a` 和 `x86_64`。
- 不支持 `armeabi-v7a`，这是当前明确的 64 位交付边界。

Stockfish 官方 `sf_18` 源码保存在：

```text
modules/stockfish-engine/vendor/Stockfish-sf_18
```

两个 NNUE 网络已放入 Android assets，并通过完整 SHA-256 校验：

```text
nn-c288c895ea92.nnue
c288c895ea924429ea9092e3f36b2b3c1f00f2a3a4c759ff7e57e79e3b43e4a7

nn-37f18f62d772.nnue
37f18f62d772f3107e1d6aaca3898c130c3c86f2ab63e6555fbbca20635a899d
```

### 许可证与构建说明

- `THIRD_PARTY_NOTICES.md` 已加入 Stockfish 18、GPL v3、源码提交和网络
  校验值。
- Stockfish GPL v3 完整文本位于其源码目录的 `Copying.txt`。
- `README.md` 已加入 Android 原生构建和 APK 内容检查说明。

## 4. 已经通过的验证

以下结果均已真实运行，不是推测：

- `npm run typecheck`：通过。
- `npm test`：77 项全部通过。
- Expo 自动链接发现 `stockfish-engine 1.0.0`。
- `:stockfish-engine:compileDebugKotlin`：通过。
- `:stockfish-engine:externalNativeBuildDebug`：通过。
- `:app:assembleDebug`：通过。
- APK 包含：

```text
lib/arm64-v8a/libstockfish.so
lib/x86_64/libstockfish.so
assets/stockfish/nn-c288c895ea92.nnue
assets/stockfish/nn-37f18f62d772.nnue
```

Android API 36、`x86_64` 模拟器中已验证：

- Stockfish 子进程真实启动。
- 普通人机对局由 Stockfish 先走 `1.d4`。
- 没有出现“Stockfish 暂不可用”的降级提示。
- 两个 NNUE 网络成功复制到应用私有目录。
- 意大利开局课程中，用户走 `e4` 后，受限回应只能走 `e5`。
- AI 计算刚开始时点击“重来”，等待 3 秒后旧结果没有落入新棋盘。
- 100 个连续合法局面全部通过，每 10 个局面的 `searchmoves` 限制也通过。
- 真人执黑人机局可以切回本地双人；默认玩家不会再错误地选成同一档案。
- AI 等待期间切换模式后，旧结果不会落入新的本地双人棋局。
- 真人走棋后立即暂停，等待 2 秒 Stockfish 不落子；继续后只回应一步。
- AI 黑方在后台耗尽 1 分钟棋钟后被判超时，最终棋盘仍只有真人的一步。
- 上述过程没有 `ERR_STOCKFISH` 或应用崩溃日志。

额外说明：

- 本轮还修复了一个真实问题：从“真人执黑人机局”切回“本地双人”时，
  白黑双方默认不会再错误地都选成同一个档案。
- 现在学习、棋谱、档案、模式和棋钟弹窗可见时，会主动停止 Stockfish；
  回到对局页后，如果仍轮到 AI，再按当前局面重新请求。

模拟器名称固定为：

```text
Chess_Android_36
```

最近使用的设备序列号为 `emulator-5554`，但新对话必须先运行
`adb devices -l`，不能假定序列号永远不变。

## 5. 仍未完成的任务

按以下顺序继续，不要跳到阶段 10：

1. 在至少一台 `arm64` 实体 Android 手机上测试。
2. 实机复核取消、棋钟、教学和飞行模式行为。
3. 构建同版本 EAS preview APK。
4. 实机和 EAS 通过后，更新 README、ROADMAP、changelog 和记忆文档，
   把阶段 9 从“测试版”改为“完整交付”。

## 6. 100 局面脚本

脚本：

```text
scripts/verify-stockfish-android.mjs
```

用途：

- 直接运行已安装 APK 中的 Stockfish。
- 连续计算 100 个合法局面。
- 使用 `chess.js` 检查每个返回走法是否合法。
- 每 10 个局面强制检查一次 `searchmoves`。

运行前需要：

- 模拟器在线。
- 当前调试 APK 已安装。
- App 至少成功启动过一次 Stockfish，使 NNUE 网络复制到私有目录。

命令：

```powershell
npm run test:stockfish:android -- emulator-5554 com.knowles.freechess 100
```

2026-06-14 已真实运行：

```text
Stockfish Android verification passed on emulator-5554 (x86_64).
```

100 个局面全部返回合法走法，每 10 个局面的单走法 `searchmoves`
限制全部通过。

## 6.1 教学与飞行模式验收结果

2026-06-15 已在 Android API 36 `x86_64` 模拟器真实完成：

- 使用临时黑方导入训练验证初始 AI 先走 `e4`，没有降级提示。
- 用户走 `e4` 触发 AI 后立即点击“上一步”，等待 3 秒后棋盘仍回到
  初始局面，旧结果没有落下。
- 用户走 `e4` 触发 AI 后立即退出课程，等待后仍停留在说明页；重新
  进入课程时仍是全新初始局面。
- 临时黑方训练记录已经从模拟器本机数据中删除，原有课程保留。

飞行模式和 Wi-Fi 关闭时：

- 普通人机中用户走 `e4`，Stockfish 离线回应 `e6`。
- 下列导入训练离线完成 `e4 e5`、`Nf3 Nc6`，进入自由对弈后用户走
  `Bb5`，Stockfish 自主回应 `Bc5`。

```text
Stage8Opening
本机 PGN 导入
前 6 个完整回合按棋谱训练，之后转为自由 AI 对弈
```

上述过程没有出现“Stockfish 暂不可用”、`ERR_STOCKFISH` 或应用崩溃。
验收后已关闭飞行模式并重新开启 Wi-Fi。

## 7. 常用验证命令

先执行基础检查：

```powershell
npm run typecheck
npm test
```

Android 原生构建：

```powershell
cd android
.\gradlew.bat :stockfish-engine:compileDebugKotlin `
  :stockfish-engine:externalNativeBuildDebug `
  :app:assembleDebug
```

检查模拟器：

```powershell
adb devices -l
adb -s emulator-5554 shell getprop sys.boot_completed
```

覆盖安装调试 APK并保留数据：

```powershell
adb -s emulator-5554 install -r `
  android\app\build\outputs\apk\debug\app-debug.apk
```

检查 Stockfish 进程：

```powershell
adb -s emulator-5554 shell ps -A
```

检查崩溃和原生错误：

```powershell
adb -s emulator-5554 logcat -d
```

不要使用 `-wipe-data`、删除 AVD、清除应用数据或重建模拟器，除非已经
确认模拟器损坏。

## 8. 当前未提交文件范围

阶段九的未提交内容主要包括：

```text
src/engine/
modules/stockfish-engine/
plugins/withStockfishPackaging.js
scripts/verify-stockfish-android.mjs
src/game/lessonRuntime.ts
src/screens/PlayScreen.tsx
src/screens/InteractiveLessonScreen.tsx
相关测试、配置和文档
```

`git status --short` 是最终准确信息。工作区可能继续变化，不要只依赖
本节静态列表。

当前还有一批上轮模拟器验收留下的临时文件，文件名前缀为：

```text
.tmp-stage9-
```

它们主要是 `uiautomator dump` 生成的 XML 和截图 PNG，不属于正式源码。
如果下次对话需要更干净的工作区，可以先人工确认后再删除；本轮没有删除，
避免误删你想保留的验收痕迹。

禁止执行：

```text
git reset --hard
git checkout -- .
删除 modules/
删除 NNUE 网络
重新生成并覆盖现有阶段九实现
```

## 9. 已知风险

- 当前只完成 `x86_64` 模拟器运行验证，`arm64` 只是编译通过。
- Android 可能限制直接执行 native library；当前通过 legacy packaging
  保证原生库被解压，发布 APK 必须再次检查。
- 首次复制约 109 MB NNUE 网络可能耗时，并增加 APK 体积。
- Stockfish 会增加 CPU 使用、耗电和发热，需要实体手机校准。
- 调试 APK 约 132 MB，Release 和 EAS 的最终大小尚未验证。
- 工作区当前包含大量 `.tmp-stage9-*` 验收文件，容易干扰 `git status`
  阅读，但它们不是功能代码。
- 正式发布前必须再次确认 GPL v3 源码提供方式。

## 10. 完成交接标准

只有以下事项全部完成，才能说“阶段九完成”：

- 自动测试、原生构建和 100 局面验证通过。
- x86_64 模拟器和 arm64 实机通过。
- 飞行模式、取消、棋钟和教学流程通过。
- `1.9.0` 本地 APK 与 EAS preview 均成功。
- 包名、版本、签名、大小和 SHA-256 已核验。
- GitHub 提交、标签、Release 和 APK 下载链接均存在。
- README、ROADMAP、changelog、项目记忆全部更新。

缺少任何一项时，只能写：

```text
开发完成但阶段九尚未完整交付
```

## 11. 下一次对话的最短执行路线

如果新对话要最快接手，不要重跑已经通过的大项，按这个顺序继续：

1. 读取 `AGENTS.md`、本文件、`docs/STAGE_9_STOCKFISH_PLAN.md`、
   `docs/FUTURE_PLAN.md`、`docs/DEVELOPMENT_MEMORY.md`。
2. 运行 `git status --short`，确认工作区是否干净。
3. 连接至少一台 `arm64` 实体 Android 手机。
4. 在实机复核普通人机、取消、棋钟、教学和飞行模式。
5. 构建并验收同版本 EAS preview APK。
6. 只在实机和 EAS 全部通过后，才把阶段 9 标记为完整交付。
