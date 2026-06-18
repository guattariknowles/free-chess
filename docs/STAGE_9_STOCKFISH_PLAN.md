# 阶段 9：Android 本地 Stockfish 执行计划

更新时间：2026-06-13

## 1. 阶段目标

在 Android 应用内接入完全离线的 Stockfish 18，替换以下场景中的
阶段 6 简易 AI：

- 普通人机对局。
- 互动教学完成固定步骤后的自由对弈。
- PGN 开局训练完成固定棋谱后的自由对弈。
- PGN 残局训练中的自主回应。

固定棋谱复现和固定教学脚本不交给 Stockfish，避免改变课程内容。

本阶段不做完整棋局分析、胜率曲线、走法评价和皮肤系统。

## 2. 固定技术决策

- Stockfish 版本固定为官方 `sf_18` 标签。
- 使用 Android 原生 Stockfish，不使用云端服务或付费 API。
- 使用 Expo SDK 56 的本地 Expo Module 接入 Kotlin 原生代码。
- 原生模块保存在可提交的 `modules/` 目录，不把实现只放进被忽略的
  `android/` 生成目录。
- 界面只能调用统一 `ChessEngine` 接口，不能直接依赖原生模块。
- Stockfish 调用必须异步，不能阻塞 JavaScript 界面线程。
- 引擎必须支持取消、超时、过期结果丢弃和异常降级。
- 现有 `localAi.ts` 暂不删除，作为测试替身和故障降级方案。
- Stockfish 返回的走法必须再次经过 `chess.js` 合法性验证。
- 课程限定回应使用 UCI `searchmoves`，只允许引擎从课程允许的合法
  走法中选择。

## 3. 目标结构

```text
普通对局 / 互动教学
        ↓
ChessEngine 统一异步接口
        ↓
StockfishEngine
        ↓
Expo 本地 Android 模块
        ↓ UCI 文本协议
Stockfish 18 原生引擎
```

建议逐步增加：

```text
src/engine/
  ChessEngine.ts
  SimpleEngine.ts
  StockfishEngine.ts
  engineManager.ts
  uci.ts
modules/
  stockfish-engine/
    android/
    src/
    expo-module.config.json
    package.json
```

具体文件名可根据实现过程微调，但职责边界不能改变。

## 4. 执行顺序与状态

### A. 环境与原生方案核查

状态：已完成。

- [x] 确认 Git 工作区干净。
- [x] 确认已有 Android 原生工程。
- [x] 确认 Node 24、npm 11、Java 17、ADB 可用。
- [x] 确认 Android NDK `27.1.12297006` 和 CMake `3.22.1` 已安装。
- [x] 确认 Expo Modules Core `56.0.16` 已安装。
- [x] 阅读 Expo SDK 56 官方本地模块和 `AsyncFunction` 文档。
- [x] 确认 Stockfish 官方 `sf_18` 标签存在。
- [x] 确认 Stockfish 使用 GPL v3。
- [x] 建立最小本地 Expo Module 并通过自动链接检查。
- [x] 确认使用 CMake、Android NDK 和官方源码编译。
- [x] `arm64-v8a` 与 `x86_64` 两个 ABI 已通过 C++ 编译。

### B. 统一棋力接口

状态：已完成。

- [x] 定义 `ChessEngine`、请求参数、返回值和错误类型。
- [x] 将现有简易 AI 包装为异步 `SimpleEngine`。
- [x] 增加引擎管理层，负责选择 Stockfish 或降级引擎。
- [x] 支持超时、停止请求和界面任务编号。
- [x] 增加 UCI 坐标走法与 `LegalMove` 的转换和合法性验证。
- [x] 为接口、转换、超时和降级添加自动测试。

### C. 普通人机对局

状态：x86_64 模拟器验收完成，等待 arm64 实机验证。

- [x] 将 `PlayScreen.tsx` 中同步 `chooseAiMove()` 改为异步引擎请求。
- [x] 保留“AI 正在思考”和 450 毫秒最小视觉延迟。
- [x] 悔棋、重开、暂停、切换模式和组件卸载时停止搜索。
- [x] 丢弃旧局面返回的过期结果。
- [x] 棋钟超时后禁止引擎落子。
- [x] 引擎异常时提示用户并降级到简易 AI。
- [x] 在 x86_64 Android 模拟器验证悔棋、重开、切换模式、暂停和超时。
- [ ] 在 arm64 Android 实机复核上述取消和棋钟行为。

### D. 互动教学

状态：代码和 x86_64 模拟器交互验证完成，等待 arm64 实机复核。

- [x] 将学生走棋和 AI 回应拆成两个状态步骤。
- [x] 增加“等待 AI”状态，等待期间锁定棋盘。
- [x] 固定教学脚本和经典棋谱复现保持原逻辑。
- [x] 统一接口和原生层已通过 UCI `searchmoves` 限制课程回应。
- [x] 教学自由对弈和导入训练自由阶段已改用统一引擎。
- [x] 撤回、重来、退出课程时停止搜索。
- [x] 更新课程界面中的引擎说明文字。
- [x] 在 x86_64 Android 模拟器验证受限回应和重来取消。
- [x] 验证教学初始 AI 先走、上一步和退出课程。

### E. Android Stockfish 模块

状态：代码完成，已通过 x86_64 模拟器首次运行验证。

- [x] 创建 `modules/stockfish-engine` 本地 Expo Module。
- [x] Expo SDK 56 自动链接可以发现模块。
- [x] Kotlin 最小模块通过 `compileDebugKotlin`。
- [x] 官方 `sf_18` 完整源码已保存在模块 `vendor/` 中。
- [x] CMake 已从官方源码编译 `arm64-v8a` 和 `x86_64`。
- [x] 实现 Kotlin 生命周期、UCI 输入输出、单任务队列和错误处理。
- [x] 实现 `getBestMove`、`stop`、`isAvailable`。
- [x] 引擎首次使用时执行 `uci` 和 `isready`。
- [x] 设置低资源参数：默认单线程、16 MB Hash 和有限搜索时间。
- [x] 下载并校验官方两个 NNUE 网络，作为 Android 资源只打包一份。
- [x] 启动引擎后通过 UCI 设置 NNUE 文件路径。
- [x] 编译目标支持 `arm64-v8a` 真机和 `x86_64` 模拟器。
- [x] 当前不支持 `armeabi-v7a`，阶段九只交付 64 位
  `arm64-v8a` 与 `x86_64`。
- [x] 引擎进程或原生层异常后只自动重启一次，避免循环崩溃。

### F. 验证与发布

状态：x86_64 模拟器验证完成，等待 arm64 实机和发布。

- [x] `npm run typecheck`。
- [x] `npm test`，77 项通过。
- [x] Gradle 原生模块编译。
- [x] Android API 36 x86_64 模拟器完成普通人机首步冒烟测试。
- [ ] 至少一台 `arm64` 实体手机测试。
- [x] 飞行模式测试普通人机和教学自由对弈。
- [x] 验证悔棋、重开、切换模式、暂停和棋钟超时时可取消。
- [x] 验证教学初始 AI、上一步和退出课程时可取消。
- [x] 验证连续 100 个测试局面不崩溃。
- [ ] 版本升级到 `1.9.0`，Android `versionCode` 升到 `11`。
- [ ] 构建本地 Release APK。
- [ ] 构建同版本 EAS preview APK。
- [ ] 验证包名、版本、签名、大小和 SHA-256。
- [ ] 更新 README、ROADMAP、Changelog 和项目记忆。
- [ ] 提交、推送、创建标签和 GitHub Release，并上传 APK。

未完成本地 APK、EAS preview、GitHub Release 中任一项时，只能写
“开发完成但阶段九尚未完整交付”。

## 5. 难度与资源控制

保留现有名称：

- 新手 AI。
- 初级 AI。
- 中级 AI。

初始实现通过 Stockfish `Skill Level` 配合有限节点或思考时间控制强度。
最终参数必须通过模拟器和实体手机实测校准，不能只按桌面电脑速度决定。

默认资源边界：

- 单线程。
- 小型 Hash。
- 单步短时搜索。
- 棋钟剩余较少时缩短搜索。
- 应用进入后台或离开当前页面时停止搜索。

## 6. 测试重点

- UCI `bestmove` 普通走法、王车易位和升变解析。
- 无合法走法、`bestmove (none)` 和异常输出。
- Stockfish 返回非法走法时拒绝落子。
- 超时后停止搜索并降级。
- 新请求使旧请求失效。
- 课程限定走法不会越界。
- AI 执白时能正确完成第一步。
- 悔棋会同时撤回真人走法和 AI 回应。
- 棋钟暂停或超时后 AI 不继续落子。
- 原生模块不存在时，TypeScript 自动测试和 Expo Go 不崩溃。

## 7. 许可证与发布要求

Stockfish 18 使用 GNU GPL v3。发布二进制 APK 时必须：

- 在 `THIRD_PARTY_NOTICES.md` 标明 Stockfish 版本、版权和 GPL v3。
- 在仓库保留完整 GPL v3 文本或明确可访问的许可证文件。
- 明确提供构建 APK 所对应的 Stockfish 源码标签和构建说明。
- 如果修改 Stockfish 源码，必须公开对应修改和构建脚本。
- 不把 Stockfish 描述为本项目原创代码。

正式分发前需要再次核对 GPL v3 的源代码提供方式。许可证合规属于
发布门槛，不是发布后的补充工作。

## 8. 已知风险

- 原生代码不能在 Expo Go 中运行，需要 Android 开发构建或 APK。
- 教学运行层当前是同步状态机，异步改造是主要回归风险。
- Android 不同 CPU 架构需要分别编译和打包。
- Stockfish 会增加 APK 大小、CPU 使用、耗电和发热。
- Windows 本机编译 Android 原生引擎可能遇到 NDK/Makefile 兼容问题。
- EAS 云构建必须能够从仓库中复现原生二进制，不能依赖本机临时文件。
- `docs/FUTURE_PLAN.md` 曾使用旧阶段编号；从本计划开始统一以
  `ROADMAP.md` 的“阶段 9”为准。

## 9. 中断后的恢复方式

恢复工作时按以下顺序读取：

1. `AGENTS.md`
2. `docs/HANDOFF_CURRENT.md`
3. 本文件
4. `docs/FUTURE_PLAN.md`
5. `docs/DEVELOPMENT_MEMORY.md`
6. `git status --short`

然后从第 4 节第一个未勾选项目继续，不重复已完成检查。

## 10. 2026-06-13 中断检查点

当前阶段九没有完成，禁止直接构建发布 APK。

已通过的验证：

- `npm run typecheck`：通过。
- `npm test`：77 项通过。
- Expo 自动链接：发现 `stockfish-engine 1.0.0`。
- `:stockfish-engine:compileDebugKotlin`：通过。
- `:stockfish-engine:externalNativeBuildDebug`：通过。
- Stockfish C++ 已编译 `arm64-v8a` 和 `x86_64`。

当前原生模块仍是占位实现：

- `isAvailable()` 返回 `false`。
- `getBestMove()` 返回 `null`。
- 应用当前会自动降级为原有简易 AI。
- 尚未实现 Kotlin UCI 子进程通信。
- 尚未下载和校验 NNUE 网络。
- 尚未在模拟器或手机中实际运行 Stockfish。

下一次只从以下任务继续：

1. 下载 `nn-c288c895ea92.nnue` 和 `nn-37f18f62d772.nnue`，按文件名
   中的前 12 位 SHA-256 校验。
2. 把网络放入 Android 资源并在首次运行时复制到应用私有目录。
3. 在 Kotlin 中启动当前 ABI 的 `libstockfish.so` 可执行文件。
4. 实现 `uci`、`isready`、`setoption`、`position`、`go movetime`、
   `searchmoves`、`stop` 和 `bestmove` 解析。
5. 先在 `x86_64` 模拟器验证 UCI，再运行完整应用交互。

注意：

- 第一次 CMake 配置曾因源码相对路径错误失败，修正后通过。
- Gradle 曾自动安装 NDK `27.0.12077973`，模块现已显式固定使用项目
  `rootProject.ext.ndkVersion`，实际成功构建使用 `27.1.12297006`。
- CMake 当前关闭 NNUE 内嵌，目的是避免两个 ABI 各自重复包含网络。
- 不得在 UCI、NNUE 和 Android 运行验证完成前升级到 `1.9.0` 或构建
  阶段发布 APK。

## 11. 2026-06-14 恢复进度

已完成：

- 两个官方 NNUE 网络已放入 Android assets，完整 SHA-256 校验通过。
- Kotlin 已实现 Stockfish 子进程、UCI 初始化、`setoption`、`position`、
  `go movetime`、`searchmoves`、`stop` 和 `bestmove` 解析。
- 原生模块已实现单任务队列、生命周期清理、异常后最多重启一次。
- 调试 APK 已确认包含两个 ABI 的 `libstockfish.so` 和两个 NNUE 网络。
- Android API 36 x86_64 模拟器中，Stockfish 进程成功启动，首次走出
  `1.d4`，没有触发简易 AI 降级。
- 两个 NNUE 网络已成功复制到应用私有目录。
- `npm run typecheck` 通过，`npm test` 的 77 项测试全部通过。
- Kotlin、C++ 和调试 APK 构建通过。
- 已增加 `npm run test:stockfish:android`，用于在已安装调试 APK 的
  Android 设备上连续验证合法走法，并每 10 个局面检查一次
  `searchmoves`。

- 普通人机首步、悔棋、重开、切换模式、暂停、棋钟超时、教学
  `searchmoves` 和教学重来取消已通过。
- 100 局面脚本已通过，全部返回合法走法，并定期通过 `searchmoves`
  单走法限制。
- 教学初始 AI 先走、上一步和退出课程已通过 x86_64 模拟器验收。
- 飞行模式下普通人机和教学自由对弈已通过 x86_64 模拟器验收。

仍未完成：

- `arm64` 实体手机验收，包括取消、棋钟、教学和飞行模式复核。
- `1.9.0` 版本升级、本地 Release APK、EAS preview 和 GitHub Release。

本轮另外修复：

- 真人执黑的人机局切回本地双人时，不再把白黑双方默认成同一档案。
- 学习、棋谱、档案、模式和棋钟弹窗可见时会停止 Stockfish；返回当前
  对局后，仅在仍轮到 AI 时重新请求当前局面。

因此当前状态为“开发接近完成，但阶段九尚未完整交付”。
