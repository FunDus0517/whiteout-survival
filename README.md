# 余烬 · WHITEOUT

原创凛冬末日生存游戏。基地准备、进屋搜刮、躲避丧尸与狼、背包撤离、制作改建、七夜求救，均可在画面中操作。PC 与手机以横屏为主，主界面保持一屏。

- [直接游玩](https://fundus0517.github.io/whiteout-survival/)
- [版本与下载](https://github.com/FunDus0517/whiteout-survival/releases)
- 设置 → 检查更新 → 保存并重启更新。

## 手机上玩

用 Safari 打开游玩地址并旋转到横屏。也可以通过分享菜单“添加到主屏幕”。首次访问需下载场景资源；离线缓存接管后可离线打开。线上游戏不依赖电脑开机。

优先检查接近大屏 iPhone 的 956 × 440 横屏布局，也检查小屏与电脑。浏览器视口检查不能替代 iPhone 17 Pro Max 真机上的帧率、发热、扬声器与 Safari 工具栏测试，没有宣称所有机型均已验收。

## 操作

| 动作 | 电脑 | 手机 |
| --- | --- | --- |
| 移动 | WASD、方向键，或点地面 | 左侧摇杆，或点地面 |
| 搜索 / 设施 | 靠近后按 E | 搜索；基地也有设施快捷按钮 |
| 攻击 | 按住 Space 或 J | 点按或按住攻击 |
| 急救 | H | 治疗 |
| 地图 | M 或点右上圆形地图 | 点右上圆形地图 |
| 暂停 | Esc | 暂停按钮 |
| 撤离 | 回出口再撤离 | 回出口再撤离 |

探索区是一个连续河谷，林场、山路、郊区与城市由道路和桥梁连接。地图为 3072 × 2048 游戏坐标，20 栋可进入建筑、63 处初始搜索点。坐标尺寸与旧版不能直接比较；本版重排地形、通路和画面尺度，避免背景放大四倍。

建筑入口有碰撞与通路。进屋时屋顶淡出，露出地板、墙壁与家具；室内补给需要进屋才能搜索。河谷和峭壁阻挡移动，桥梁与山路可以通行。

基地是单独的山腰避难所，包含炉子、工作台、电台、床与出口。营地漫游不扣行动或保暖。物资先装外出背包，撤离成功后才入库；死亡或放弃会丢失未入库物资。

小、中、大、特大雪依次缩短视野、加快覆盖脚印。左右脚交替留下压雪痕迹并有踩雪声，室内为木地板脚步。搜索有开启动作与材质音效。雪是二维场景中的持续压雪表现，不是三维雪体积模拟；音效由 Web Audio 合成。

每天 6 次行动，外出、制作、升级各消耗 1 次；每夜消耗燃料和食物，失温会掉生命。工作台有 8 个配方、4 项改建、商队交换与 9 个阶段目标。同伴、事件、装备和扩容影响搜刮。守过第七夜且电台修复至 2 级，完成阶段救援。

## 存档与更新

进度保存在当前浏览器本地。新版使用 whiteout-save-v4，依次只读导入 v3、v2、v1 槽，旧槽保留。旧外出继续原地图、坐标、敌人与补给，结算后下一趟才切换新版。

不同网址、浏览器与设备各有独立进度。localhost 与 GitHub 页面不会自动共享存档，暂不支持云同步；清理浏览器数据会删除存档。

网页发布整套版本资源，Service Worker 保留旧缓存。检查更新后会先保存进度，等待新版下载完成再切换；断网时提示失败，已缓存的游戏仍可使用。维护者修改 package.json 版本并推送 main，GitHub 自动验证、构建和发布。

iOS 内置网页资源，可离线运行；更新检查连接线上版本信息并打开 GitHub 发布页。原生安装包需要重新签名发布，没有实现绕过苹果签名的安装，也没有把网页更新说成原生静默升级。

## iOS 工程

工程：ios/App/App.xcodeproj。应用 ID：com.fundus0517.whiteout。手机和 iPad 仅声明两个横屏方向；使用 Capacitor 8 与 Swift Package Manager。

准备工程：

```text
npm ci
npm test
npm run ios:sync
```

在 Mac 上用 Xcode 打开工程并构建。GitHub 的 Build iOS 工作流可以生成设备平台未签名 App 编译包，不能直接安装到 iPhone。

拥有 Apple Developer 签名材料后，配置以下 GitHub Actions Secrets，手动运行 Build iOS 并勾选 signed：

| Secret | 内容 |
| --- | --- |
| IOS_CERTIFICATE_BASE64 | Apple Distribution p12 文件的 Base64 |
| IOS_CERTIFICATE_PASSWORD | p12 导出密码 |
| IOS_PROFILE_BASE64 | 对应应用 ID 且包含测试设备的 Ad Hoc 描述文件 Base64 |
| IOS_TEAM_ID | Apple 团队 ID |
| KEYCHAIN_PASSWORD | 临时构建钥匙串密码 |

脚本校验材料、归档并导出签名 IPA。签名分支尚未用真实证书验证，目前没有提供可安装 IPA。证书和私钥不要提交到公开仓库。[苹果分发说明](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)介绍了注册设备、TestFlight 和 App Store 的要求。

## 开发与验证

本地运行启动游戏.cmd，访问 http://localhost:8765/；手机局域网测试需同一 Wi-Fi。正式发布使用 npm run build 输出 dist。

- Verify game：规则、兼容检查、网页构建。
- Deploy game：推送 main 后发布 GitHub Pages。
- Build iOS：手动运行 macOS 编译；签名材料齐全时可选 IPA。
- tests 包含规则测试及不读写玩家存档的美术检查页。

人物、建筑、物资、基地、地形和图标由内置图像生成工具辅助制作，提示词保存在 assets/art-v4-prompts.txt 和同目录补充文件。程序负责接地、排序、碰撞、室内切换与动画，未宣称纯手绘或真正三维建模。

目前不含联机、账号云同步、三维物理雪。长期乐趣还需玩家反馈；增加搜刮点数量不能证明耐玩。
