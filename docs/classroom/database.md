# 谱芽岛 Google Cloud 数据库

线上网站：https://puyadao.top/ 。Google Cloud / Firebase 项目：`puyadao-75dd0`。
数据库使用 Firestore Standard / Native，数据库 ID 为 `(default)`，区域为香港 `asia-east2`；已开启数据库删除保护，当前为免费方案。

## 已接入的数据

数据路径：`visitors/{Firebase Auth UID}/state/{key}`，每条记录保存 `value` 和服务端时间 `updatedAt`。

| key | 内容 |
| --- | --- |
| favorites | 首页、搜索结果、歌曲详情共享的歌曲收藏 |
| practice-favorites | 编配版本收藏，详情页与练习页共享 |
| checkins | 访客本地日期的每日打卡记录，最多最近 1000 天 |
| completed | 课程完成记录 |
| likes | 首页演奏作品的个人点赞选择；示例总数仍为演示 |
| progress-{songId}-{versionId} | 手动保存的练习位置、滚动位置和 BPM |

Firebase Authentication 使用匿名访客登录，身份由 SDK 保留在当前浏览器。
同一浏览器刷新后可恢复云端记录；清除站点数据、无痕窗口或更换设备会获得新的身份。
当前没有正式账号登录、跨设备账号同步或身份恢复功能。正式登录应通过账号关联保留已有匿名记录。

`firestore.rules` 限定每位访客只能读写自己的记录，并校验记录字段、值类型、列表长度和练习参数范围。
没有公开数据库读写权限。网页中的 Firebase web config 是公开客户端配置，不包含管理员或服务账号私钥。

前端先更新本机缓存，再用 Firestore transaction 按顺序保存；初始加载期间的操作会应用到读取后的云端值。
失败时显示提示，并保留带待同步标记的缓存；联网后重试，刷新后也可继续同步。只有收到成功确认后，练习页才提示“已保存到云端”。
旧练习收藏和进度会在云端对应记录不存在时迁移。当前采用打开时读取及操作时事务保存，未实现其他设备的实时推送。

歌曲目录、示例谱面、社区作品、帖子与回复仍使用现有演示数据和原有本地行为，本次没有将它们变成线上社区服务。

## 构建与部署

在 `classroom/` 执行：

```sh
npm ci
npm run build
node --test tests/cloud-state.test.mjs
npm run test:sites
npx firebase-tools deploy --project puyadao-75dd0 --only firestore:rules,hosting
```

`scripts/prepare-firebase-build.mjs` 将现有 Vite 构建放到 `dist/firebase/static/classroom/`，同时复制根首页，保留现有素材 URL。
`firebase.json` 声明 Hosting 和数据库规则；Sites 的 Worker、打包脚本和配置仍保留。
部署需要拥有该项目权限的 Firebase CLI 登录身份；不将管理员凭证提交到仓库。

## 验证

- 有序写入、加载期间操作、断网重试、未同步缓存恢复及云端优先读取的自动测试。
- 真正的匿名登录、Firestore 写入与读取、跨访客及未登录访问拒绝、非法字段值与 BPM 拒绝；REST 测试数据清理。
- 浏览器验证收藏、每日打卡和编配收藏刷新恢复，以及练习进度云端保存。
