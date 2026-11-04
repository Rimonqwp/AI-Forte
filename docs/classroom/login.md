# 谱芽岛账号登录

## 当前状态

Google 登录已在 Firebase 项目 `puyadao-75dd0` 启用，包含 Gmail 与其他 Google 账号。
按用户选择，本阶段先完成 Google；GitHub 与 Apple 的网页入口标记“暂未开放”，尚未启用，也不会发起无配置的授权请求。

右上角访客入口显示“登录 / 注册”。Google 登录会自动完成首次注册；登录后显示真实昵称、头像、邮箱与退出入口，昵称沿用四个字素截断规则。首页、搜索与独立歌曲详情共享账号身份。
授权仅请求基本身份资料，不请求 Gmail 邮件或 GitHub 仓库访问权限。没有新增邮箱密码登录。

## 数据和账号转换

- 首次登录优先用 `linkWithPopup` 将匿名身份关联到 Google，保留原 UID 和 `visitors/{uid}/state/` 中的数据。
- Google 已有关联账号时，先确认访客待写入记录已同步，并读取访客数据，再使用 Google 凭据登录已有账号。
- 收藏、打卡、课程完成及个人点赞合并去重；打卡保留最近 1000 个日期。已有账号的练习位置优先，访客的其他练习位置补入。
- 合并前在目标 UID 专属缓存中留下待合并备份。中途失败时显示同步重试入口，重新打开页面也会重试，合并操作可重复执行。
- 已登录账号之间的切换不会复制旧账号数据。退出前确认当前账号写入完成，再创建新的匿名访客身份；不会继承退出账号的收藏与进度。
- 所有云端状态缓存改用 `puyadao.cloud.{uid}.{key}`。旧版未分账号的缓存只迁移给首次识别的拥有者，后续账号不能复用。
- 账号 UID 变化会重新挂载页面内容，清除上一身份的临时页面状态，保留地址栏路由。

数据库新增私有 `users/{uid}` 文档，包含 `displayName`、`email`、`photoURL`、`providers`、`createdAt`、`updatedAt`。只有对应正式登录用户能读写，邮箱必须与登录令牌一致，禁止额外角色字段和篡改创建时间。管理员凭证不会进入网页代码或用户记录。

## 控制台

- 登录方式：[Firebase Authentication](https://console.firebase.google.com/project/puyadao-75dd0/authentication/providers)
- 登录用户：[用户列表](https://console.firebase.google.com/project/puyadao-75dd0/authentication/users)
- 用户资料：[Firestore users](https://console.firebase.google.com/project/puyadao-75dd0/firestore/databases/-default-/data/~2Fusers)

当前 Firebase `authDomain` 为 `puyadao.top`，Google 登录页面使用网站自己的域名，OAuth 回调为：

```text
https://puyadao.top/__/auth/handler
```

Google OAuth 客户端已添加 JavaScript 来源 `https://puyadao.top` 和上述自定义回调；保留原 Firebase 回调以兼容已有授权流程。

域名 `puyadao.top`、`www.puyadao.top`、Firebase 默认域名和本地开发域名均在授权域名列表。不要只改前端 `authDomain`；更换 OAuth 回调域名需要同步修改提供方的配置。

## 后续 GitHub / Apple 接入

GitHub：先在 [GitHub 创建 OAuth App](https://github.com/settings/applications/new)，Homepage URL 填 `https://puyadao.top/`，Authorization callback URL 使用上面的 Firebase 回调；将 Client ID 和 Client Secret 直接填入 Firebase 的 GitHub 登录配置。不要将 Secret 放入聊天、前端源码、环境示例或 Git。

Apple：需要 Apple Developer 账号，以及按官方流程配置的 Service ID、Team ID、Key ID 和签名私钥。资料直接填写到 Firebase Apple 提供方配置。关联 Apple 匿名邮箱与其他个人资料前需要明确征得用户同意；目前 Apple 按钮不可用，不会自动关联。

开通相应提供方后，需要把 `AuthDialog.jsx` 的对应禁用入口改为调用已有 `signInProvider('github.com')` 或 `signInProvider('apple.com')`，补齐提供方测试再部署。

参考：[Google](https://firebase.google.com/docs/auth/web/google-signin)、[GitHub](https://firebase.google.com/docs/auth/web/github-auth)、[Apple](https://firebase.google.com/docs/auth/web/apple)、[账号关联](https://firebase.google.com/docs/auth/web/account-linking)。

## 验证

```sh
cd classroom
node --test tests/account-auth-flow.test.mjs tests/account-data.test.mjs tests/cloud-state.test.mjs
GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)" python3 scripts/test-auth-rules.py
npm run build
npm run test:sites
```

账号转换、取消授权、未同步数据阻止切换、合并重试与缓存隔离共 19 项本地测试；Rules API 模拟 14 项访问和资料写入检查，不写入用户数据。浏览器验证 Google 弹窗到达真正的 Google 登录页、取消登录、访客收藏保留、手机尺寸和键盘焦点。
实际 Google 账号选择和授权需用户本人完成，自动测试不会代替第三方授权。
