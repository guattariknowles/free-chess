# Free Chess 1.7.0

构建日期：2026-06-13

## 本次内容

- 修复教学分类栏会随课程数量减少而被纵向拉高的问题。
- 分类栏固定高度，并继续支持窄屏横向滚动。
- 保留全部 31 节原创离线课程和原有静态说明。
- 26 节带推荐走法的课程增加互动棋盘。
- 互动课程支持正确与错误反馈、提示、撤回、重来和步骤推进。
- 意大利开局、中心控制和王兵残局使用定制互动流程。
- 当前教学对手使用阶段 6 的离线本地 AI。
- 本地 AI 可以限制在课程允许的合法走法内，避免偏离教学目标。
- 课程运行逻辑与界面分离，后续可把走法提供层替换为本地 Stockfish。
- 5 节纯知识课程继续保留静态讲解：棋盘坐标、将死、和棋、棋钟和 PGN。

## 自动验证

- `npm run typecheck`：通过。
- `npm test`：62 项通过。
- `git diff --check`：通过。
- 新增测试覆盖互动课程正确走法、错误反馈、提示、撤回、重来、步骤完成、
  受限本地 AI，以及教学终局练习与普通对局终局锁定的隔离。

## Android 验收

- 模拟器：`Chess_Android_36`，Android API 36。
- 切换规则基础 16 节、常见开局 6 节、中局思路 5 节和残局基础 4 节后，
  四个分类按钮的纵向边界始终为 `331..483`，高度一致。
- 已验证基础课程“王怎么走”的错误反馈与正确完成流程。
- 已完整走通意大利开局 `e4...e5、Nf3...Nc6、Bc4`。
- 已确认每一步本地 AI 回应、下一步按钮和最终完成状态。
- Release APK 已覆盖安装，并在不连接 Metro 的情况下独立启动。
- 实体 Android 手机和较大系统字体尚未验收。

## 本地 APK

- 文件：`builds/free-chess-1.7.0-2026-06-13-local.apk`
- 包名：`com.knowles.freechess`
- 版本名：`1.7.0`
- Android 版本号：`9`
- 最低 SDK：`24`
- 目标 SDK：`36`
- 文件大小：`67,841,569` 字节
- SHA-256：
  `48D6DD78B3EB1081642E6EEC382959882B57E3EBF0A3B14EF41DE2406F702F4F`
- 签名：Android 本地调试证书，APK Signature Scheme v2 验证通过。
- 签名证书 SHA-256：
  `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`

## 发布状态

- GitHub Release：
  `https://github.com/guattariknowles/free-chess/releases/tag/v1.7.0`
- 本地 APK：
  `https://github.com/guattariknowles/free-chess/releases/download/v1.7.0/free-chess-1.7.0-2026-06-13-local.apk`
- EAS preview 已提交，构建 ID：
  `9e4a3d29-b38a-48d9-93ee-4d06c3f2eb33`
- EAS 构建日志：
  `https://expo.dev/accounts/knowles/projects/chess-mobile-teacher/builds/9e4a3d29-b38a-48d9-93ee-4d06c3f2eb33`
- EAS 版本：`1.7.0 / versionCode 9`。
- 提交后状态：`IN_PROGRESS`。按项目规则不等待免费队列完成。
- EAS APK 尚未生成，因此当前公开附件仍是本地测试 APK。

## 已知风险

- 当前本地 AI 强度有限，不能替代 Stockfish。
- 通用互动课目前以课程推荐走法为目标；复杂课程仍可继续扩展为多步骤脚本。
- 实体 Android 手机和大字体模式仍需用户验收。
