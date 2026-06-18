# Free Chess 1.9.0 Stockfish 测试版

构建日期：2026-06-15

## 本次内容

- 普通人机和教学自由对弈改用 Android 本地 Stockfish 18。
- 保留简易 AI 作为引擎不可用时的自动降级。
- 支持停止、超时、旧结果丢弃和走法合法性复核。
- 课程限定回应使用 UCI `searchmoves`。
- 支持 `arm64-v8a` 实体手机和 `x86_64` 模拟器。
- Stockfish、两个 NNUE 网络和构建源码均随项目提供。

## 自动与模拟器验证

- `npm run typecheck`：通过。
- `npm test`：77 项全部通过。
- `git diff --check`：通过。
- Android API 36 x86_64 模拟器：
  - 100 个连续合法局面通过。
  - 普通人机、悔棋、重开、切换模式、暂停和棋钟超时通过。
  - 教学受限回应、初始 AI 先走、上一步和退出课程通过。
  - 飞行模式下普通人机与教学自由对弈通过。

## 本地 APK

- 文件：`builds/free-chess-1.9.0-2026-06-15-local.apk`
- 包名：`com.knowles.freechess`
- 版本名：`1.9.0`
- Android 版本号：`11`
- 最低 SDK：`24`
- 目标 SDK：`36`
- 文件大小：`108,638,498` 字节
- SHA-256：
  `D74F35F18F75D2F5D11C1E16D4E58A18904BDBCF9F69D75652818F596717EF2B`
- 签名：Android 本地调试证书，APK Signature Scheme v2 验证通过。
- 签名证书 SHA-256：
  `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`
- APK 已确认包含两个 Stockfish ABI 和两个 NNUE 网络。

## 下载

- GitHub Release：
  `https://github.com/guattariknowles/free-chess/releases/tag/v1.9.0`
- 本地 APK：
  `https://github.com/guattariknowles/free-chess/releases/download/v1.9.0/free-chess-1.9.0-2026-06-15-local.apk`

## 测试版限制

- 尚未在 `arm64` 实体 Android 手机上验收。
- 实体手机的性能、发热、耗电、取消、棋钟和飞行模式仍需复核。
- EAS preview 构建尚待完成。
- 因此这是供实体机验收的测试版，阶段九尚未完整交付。
