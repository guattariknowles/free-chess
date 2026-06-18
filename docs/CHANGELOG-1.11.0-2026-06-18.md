# Free Chess 1.11.0 主题与皮肤开发记录

记录日期：2026-06-18

## 本次内容

- 应用版本升级到 `1.11.0`，Android `versionCode` 升级到 `13`。
- 新增 `src/theme` 主题系统，集中管理全软件 UI 主题、棋盘皮肤和棋子皮肤。
- 首版内置 5 套 UI 主题：
  - `Minimal Tournament`
  - `Impressionist Study`
  - `Constructivist Boardroom`
  - `Steampunk Atelier`
  - `Cyber Anime`
- 首版内置 12 套棋盘皮肤，覆盖极简赛事、木质经典、印象派色块、构成主义、
  至上主义、蒸汽铜木、赛博霓虹、文艺复兴、浮世绘木刻、中国水墨、新艺术彩窗
  和原创二次元清爽风格。
- 首版内置 5 套 Unicode 棋子皮肤，并预留后续图片棋子扩展接口。
- 主对局页新增“外观设置”，可分别切换 UI 主题、棋盘皮肤和棋子皮肤。
- 外观设置使用 `AsyncStorage` 本机保存，读取失败时回退到默认极简赛事外观。
- 主对局页、棋盘、棋钟、棋钟设置和结果/模式弹窗已接入主题。

## 验证

- `npm run typecheck`：通过。
- `npm test`：82 项全部通过。
- `.\gradlew.bat :stockfish-engine:compileReleaseKotlin :stockfish-engine:externalNativeBuildRelease :app:assembleRelease`：通过。
- APK 元数据：
  - 包名：`com.knowles.freechess`
  - 版本名：`1.11.0`
  - Android 版本号：`13`
  - `minSdkVersion 24`
  - `targetSdkVersion 36`
- APK 签名：`apksigner verify --verbose --print-certs` 通过，使用本机 Android debug 证书。
- APK 内容检查通过：
  - `assets/index.android.bundle`
  - `lib/arm64-v8a/libstockfish.so`
  - `lib/x86_64/libstockfish.so`
  - 两个 Stockfish NNUE 网络
- Android API 36 x86_64 模拟器冒烟测试：
  - 安装 `1.11.0` APK 成功。
  - 已安装版本确认为 `versionName 1.11.0 / versionCode 13`。
  - 主对局界面可独立启动，不依赖 Metro。
  - 工具栏可打开“外观设置”。
  - 外观设置可显示 5 套 UI 主题和棋盘皮肤预览。
  - 成功切换到 `Cyber Anime · 木质经典 · 经典衬线`。
  - 强制停止并重新启动后，外观设置仍保留。
  - 启动日志未发现 `FATAL EXCEPTION`、`AndroidRuntime` 崩溃或 `ERR_STOCKFISH`。

## 本地 APK

- 文件：`builds/free-chess-1.11.0-2026-06-18-local.apk`
- 包名：`com.knowles.freechess`
- 版本名：`1.11.0`
- Android 版本号：`13`
- 文件大小：`108,670,670` 字节
- SHA-256：
  `AFA422E6F241ACD490D11500ECF1E848C75DA18E05BF1F8BB01A71434C9FE012`
- 签名：Android 本地调试证书，供本地和 GitHub 测试版安装验收。

## 当前限制

- 图片棋子尚未引入，首版使用 Unicode 字符和主题色实现棋子风格。
- 主对局、棋盘和棋钟已主题化；棋谱库、学习页、档案页等页面仍保留部分旧局部样式，
  后续可继续沿 `src/theme` 迁移。
- 本版本只做原创风格方向，不包含也不模仿具体动漫、游戏或影视 IP。
