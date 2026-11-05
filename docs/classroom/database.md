# 谱芽岛 Cloud SQL 数据存储

2026-11-05 已将持久化结构数据切换到 Google Cloud 项目 `puyadao-75dd0` 的 PostgreSQL。

- 实例：`puyadao-postgresql`，PostgreSQL 18，台湾 `asia-east1`。
- 实例连接名：`puyadao-75dd0:asia-east1:puyadao-postgresql`；业务数据库：`puyadao`。
- 网站：[puyadao.top](https://puyadao.top/)，数据服务：Cloud Run `puyadao-data`，同区域。
- Firebase Authentication 继续负责匿名身份及 Google 登录，UID 不变。
- 前端通过 Hosting 的 `/api/account/**` 转发访问数据服务；数据库账号和凭证不进入浏览器。

## 数据表

| 表 | 内容 |
| --- | --- |
| `user_profiles` | 正式账号昵称、邮箱、头像、提供方及创建/更新时间 |
| `visitor_states` | 按 UID/key 隔离的歌曲收藏、编配收藏、点赞、打卡、课程完成、练习进度及 CAS 版本 |
| `jobs` | 新版转谱任务和当前结果 |
| `revisions` | 新版转谱编辑历史 |
| `runtime_records` | 旧版 `result.json` 和 `ai-fingerstyle-review.json` 的结构化内容 |

切换时已逐条核对 1 份账号资料、4 条用户状态、1 个新版任务、2 条修订；补充迁移了 13 份旧版任务结果和 1 份审阅记录。后续正常使用会增加或更新行。
JSON 内容保留现有领域结构以兼容原界面，后续可按查询需求进一步拆分关系表。
音频、图片、谱面及分析中间文件仍按原文件/对象存储方式管理；Cloud SQL 不承担二进制文件存储。
示例曲库和浏览器本地的演示讨论、搜索历史、语言偏好保留原行为，本次没有把示例社区改造成线上社区。

## 身份、并发与本机缓存

`sql_service/main.py` 校验 Firebase ID token，包括撤销状态；UID 来自已验证令牌。
所有状态读写限定当前 UID；账号邮箱和提供方也由服务端从令牌提取。
匿名访客可以保存自己的学习状态，但不能创建正式账号资料。
状态值继续校验允许的 key、最多 1000 项的列表及练习 elapsed/scrollTop/BPM 范围。
写入携带读取版本；冲突返回 409，前端重新读取并重新应用操作，最多重试 8 次。
前端仍先更新 UID 专属本机缓存，断网保留待保存操作，联网后重试；账号升级、合并备份和退出隔离行为保持不变。
新版任务编辑使用 PostgreSQL 行锁和 revision 检查，历史保存与当前结果更新在同一个事务内完成；取消状态保持终止语义。

运行服务使用 IAM 数据库用户 `puyadao-data@puyadao-75dd0.iam`，通过官方 Cloud SQL Python Connector 建立加密连接。
服务账号只授予 Cloud SQL Client、Cloud SQL Instance User、Firebase Authentication Viewer，数据库授予业务表的读取与写入权限。
连接池每实例最多 5 个连接，Cloud Run 最少 0、最多 2 个实例。

## 迁移备份和重跑

原 Firestore 文档和本地 SQLite/JSON 均保留。`classroom/firestore.rules` 将旧数据设为按原 UID 可读、客户端不可写的归档，避免旧版网页继续写入。
已经打开的旧网页需刷新后使用新的 SQL 接口；其未保存操作仍保留在原 UID 的本机缓存中。

本机备份在未纳入 Git 的 `.runtime/cloudsql-cutover-20261105/` 与 `.runtime/cloudsql-full-backup-20261105/`，包括 SQLite 一致性备份、完整 Firestore 文档（含时间信息）、导入快照及旧 JSON 元数据。
这两个目录含私人数据，应保持私有。不会将它们或 ADC 凭证提交到 Git。

从仓库根目录运行：

```sh
python -m scripts.migrate_cloud_sql --export .runtime/new-backup
python -m scripts.migrate_cloud_sql --snapshot .runtime/new-backup/snapshot.json --apply
python -m scripts.migrate_cloud_sql --snapshot .runtime/new-backup/snapshot.json
```

导出前暂停源 SQLite 写入。脚本会检查复制期间源 DB/WAL 大小和修改时间，使用本机临时副本及 SQLite backup 规避 SMB 锁限制，并执行完整性检查。
默认只导出或验证；显式 `--apply` 才导入缺失行，且同一事务逐条比较，遇到不同目标数据即回滚。
可用 `--tables runtime_records` 做增量迁移。
`--baseline OLD_SNAPSHOT` 仅允许把仍完全等于旧预导入快照的目标行刷新为最终快照，不覆盖切换后产生的新数据。
线上开始写入后，不应再次用旧快照覆盖或强制恢复线上记录。

## 运行与部署

Python 依赖：`requirements-sql.txt`，已由主 `requirements.txt` 引用。
本机 `.env` 已配置以下项目，使用被 Git 忽略的 ADC 文件，密码不进入源码：

```text
INSTANCE_CONNECTION_NAME=puyadao-75dd0:asia-east1:puyadao-postgresql
DB_NAME=puyadao
DB_USER=xiaorimon@gmail.com
DB_IAM_AUTH=true
GOOGLE_APPLICATION_CREDENTIALS=<本机私有 ADC 文件绝对路径>
```

`app.main` 根据连接配置选择 PostgreSQL；未配置 SQL 时保留原 SQLite/本地 JSON 模式，便于离线开发和旧测试。配置了 SQL 后连接失败会报错，不会悄悄退回本地库。
本机转谱服务仍由 `scripts/start.sh` 启动，8000 端口。现有 4173 Vite 预览的账号 API 通过开发代理访问正式数据服务。
生产数据服务与前端分开部署：

```sh
python -m scripts.deploy_sql_service
cd classroom
npm ci
npm run build
npm run test:sites
npx firebase-tools deploy --project puyadao-75dd0 --only hosting,firestore:rules
```

部署脚本只把数据 API 所需的明确文件复制到临时构建目录，不上传 `.env`、音频、模型、SQLite 或其他工作区文件。
构建账号 `puyadao-build@puyadao-75dd0.iam.gserviceaccount.com` 使用 `roles/run.builder`。
本次线上前端从已提交版本加本次数据适配修改构建，未包含工作区已有的搜索与样式改动。

## 验证

- 前端账号流、合并/隔离、本机缓存、失败重试和 SQL 并发重试测试。
- API 身份及输入校验测试；真实 PostgreSQL 上的用户隔离、资料创建时间保护、编辑并发、取消、事务回滚、旧结果持久化及迁移幂等测试。
- 真正 Firebase 匿名令牌下的线上 API 读写、跨用户隔离、409 冲突、非法进度和匿名资料写入拒绝。
- 生产构建及 Sites 打包测试；正式网站和本机预览均通过浏览器收藏保存及刷新恢复验证。

PostgreSQL 集成测试显式启用：

```sh
FYP_SQL_INTEGRATION=1 python -m pytest -q tests/test_cloud_sql_integration.py
```

测试只使用随机测试 UID/任务行并清理，不修改真实用户记录。
参考：[Cloud SQL Python Connector](https://docs.cloud.google.com/sql/docs/postgres/connect-connectors)。
