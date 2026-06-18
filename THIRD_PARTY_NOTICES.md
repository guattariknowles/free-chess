# 第三方软件说明

本项目使用以下主要开源依赖：

- Expo，MIT License
- React，MIT License
- React Native，MIT License
- React Native Async Storage，MIT License
- React Native Web，MIT License
- chess.js，BSD 2-Clause License

完整依赖版本见 `package-lock.json`。各依赖仍受其原始许可证约束。

## Stockfish 18

Android 安装包包含 Stockfish 18，来源为官方 `sf_18` 标签：

- 官方项目：https://github.com/official-stockfish/Stockfish
- 对应提交：`cb3d4ee9b47d0c5aae855b12379378ea1439675c`
- 许可证：GNU General Public License version 3
- 本仓库对应源码：`modules/stockfish-engine/vendor/Stockfish-sf_18`
- 完整许可证文本：
  `modules/stockfish-engine/vendor/Stockfish-sf_18/Copying.txt`

本项目没有修改 Stockfish 的算法源码。Android 构建配置位于
`modules/stockfish-engine/android/src/main/cpp/CMakeLists.txt`，用于从上述
官方源码编译 `arm64-v8a` 和 `x86_64` 可执行文件。

安装包还包含 Stockfish 18 官方使用的两个 NNUE 网络：

- `nn-c288c895ea92.nnue`
  - SHA-256：
    `c288c895ea924429ea9092e3f36b2b3c1f00f2a3a4c759ff7e57e79e3b43e4a7`
- `nn-37f18f62d772.nnue`
  - SHA-256：
    `37f18f62d772f3107e1d6aaca3898c130c3c86f2ab63e6555fbbca20635a899d`

Stockfish 仍由其原作者和贡献者拥有版权，不是 Free Chess 的原创代码。

项目中的应用代码、文档和自制图标使用仓库根目录中的 MIT License。
未来加入的教学数据、棋谱或美术资源必须单独确认来源和授权。
