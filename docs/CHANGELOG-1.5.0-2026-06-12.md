# Free Chess 1.5.0

构建日期：2026-06-12

## 本次内容

- 新增“学习”入口和 31 节原创离线课程。
- 覆盖棋盘坐标、六种棋子、吃子、将军、将死、和棋、王车易位、
  吃过路兵、兵升变、棋钟和 PGN。
- 覆盖 6 个常见开局：意大利、西班牙、后翼弃兵、伦敦、西西里、
  法兰西。
- 覆盖子力安全、王安全、中心控制、开放线和双重攻击。
- 覆盖王兵残局、基础车兵残局、后王杀单王和车王杀单王。
- 每个进阶课程包含 FEN、小棋盘、推荐走法、原因和常见错误说明。
- 面对面双人模式下，远端一方棋子旋转 180 度；翻转棋盘后自动切换
  远端颜色。

## 自动验证

- `npm run typecheck`：通过。
- `npm test`：41 项通过。
- 课程测试会读取全部 31 个 FEN，并验证推荐走法是否合法。
- Web 临时构建：Expo 成功生成 580 KB JavaScript bundle。

## Android 验收

- 模拟器：`Chess_Android_36`，Android 16 / API 36。
- 已检查课程列表、基础课程详情、进阶课程详情和教学小棋盘。
- 已检查正常与翻转棋盘下的远端棋子方向。
- APK 覆盖安装成功，应用数据未清除。
- 实体 Android 手机尚未验收。

## 本地 APK

- 文件：`builds/free-chess-1.5.0-2026-06-12-local.apk`
- 包名：`com.knowles.freechess`
- 版本名：`1.5.0`
- Android 版本号：`7`
- 最低 SDK：`24`
- 目标 SDK：`36`
- 文件大小：`67,817,921` 字节
- SHA-256：
  `75341F2E1114AF3A1773FAABCB9F07088F9646D19A93C77EBBB883D75A4C41B2`
- 签名：Android 本地调试证书，APK Signature Scheme v2 验证通过。

## EAS 与发布状态

- EAS preview：等待用户明确授权把项目上传到 Expo EAS。
- GitHub Release：
  `https://github.com/guattariknowles/free-chess/releases/tag/v1.5.0`
- 本地 APK：
  `https://github.com/guattariknowles/free-chess/releases/download/v1.5.0/free-chess-1.5.0-2026-06-12-local.apk`
- 当前只能标记为“本地测试版已发布”，不能标记为 EAS 完整发布。

## 已知风险

- 教学内容已通过规则合法性测试，但尚未由专业教练逐条审校。
- 尚未完成实体 Android 手机上的字体、滚动和面对面视角验收。
