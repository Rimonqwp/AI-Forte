# 谱芽岛 Cloud SQL 数据存储

2026-11-05 已将持久化结构数据切换到 Google Cloud 项目 `puyadao-75dd0` 的 PostgreSQL。

- 实例：`puyadao-postgresql`，PostgreSQL 18，台湾 `asia-east1`。
- 实例连接名：`puyadao-75dd0:asia-east1:puyadao-postgresql`；业务数据库：`puyadao`。
- 网站：[puyadao.top](https://puyadao.top/)，数据服务：Cloud Run `puyadao-data`，同区域。
- Firebase Authentication 继续负责匿名身份及 Google 登录，UID 不变。
- 前端通过 Hosting 的 `/api/account/**` 转发访问数据服务；数据库账号和凭证不进入浏览器。

## 关系表结构（2026-11-06）

业务读写使用关系表，不再把整份账号、状态或转谱结果塞进 `body TEXT`。
HTTP API 仍使用 JSON 传输，这与数据库是否按行列保存是两回事。

| 表 | 可直接查询的内容 |
| --- | --- |
| `account_profiles` | UID、昵称、头像 URL、邮箱、带时区的创建/更新时间 |
| `account_providers` | 每个账号的登录提供方，一行一个 |
| `account_state_versions` | 用户与状态类型的并发版本；保留“没有记录”和“已保存空列表”的区别 |
| `song_favorites` | 每个用户收藏的歌曲及排列顺序 |
| `arrangement_favorites` | 歌曲 ID、编配版本 ID 及排列顺序 |
| `post_likes` / `course_completions` | 点赞对象、已完成课程及顺序 |
| `daily_checkins` | 用户和真正的 `DATE` 打卡日期 |
| `practice_progress` | 练习标识、经过秒数、滚动位置、BPM 数值 |
| `arrangement_selections` | 兼容原有 `arrangements-*` 状态的编配选择 |
| `transcription_jobs` | 转谱任务 ID、阶段、创建时间、当前快照外键 |
| `transcription_revisions` | 任务外键、修订号、不可变历史快照外键 |
| `transcription_records` | 旧版任务结果／审阅记录及快照外键 |
| `transcription_snapshots` | 标题、来源 URL、时长、阶段、修订、执行标识等明确类型的字段 |
| `transcription_notes` | 每个快照各声部的音符；音高、起止时间、弦、品、置信度等独立列 |
| `transcription_requests` / `transcription_settings` | 转谱请求参数、密度、滑音、连音等选项 |
| `transcription_overrides` / `transcription_slides` | 人工选轨时间范围、滑音连接与半音数 |
| `transcription_chords` / `transcription_strums` | 和弦时间、名称、指法数组与扫弦事件 |
| `storage_schema_versions` | 已成功提交的存储版本；v1 表示关系表已启用 |

子表通过外键关联状态版本或转谱快照，并为唯一性、音高、进度数值设置约束。
用户 UID 不强制关联正式账号资料表，因为匿名访客也可以有收藏和进度。
练习键目前是前端生成的复合标识（如 `star-piano-easy`），不猜测含连字符的歌曲／版本分界。
曲库与课程目前仍是前端演示数据，因此不对演示 ID 建立虚假的实体外键。

模型证据、AI 建议、节拍分析及未知版本的附加字段保留为 `JSONB extensions`；
核心字段、音符、和弦和扫弦不会整份复制到这个字段。
`present_fields` / `sections` 是 PostgreSQL 文本数组，用于精确保留缺失字段、显式 null、空集合和历史快照形状。
原始音频、图片、分析中间文件继续使用文件／对象存储。

例如直接查询收藏和音符：

```sql
SELECT uid, song_id FROM song_favorites ORDER BY uid, position;
SELECT uid, checkin_date FROM daily_checkins ORDER BY checkin_date DESC;
SELECT uid, practice_key, elapsed_seconds, bpm FROM practice_progress;
SELECT j.id, n.position, n.pitch, n.start_seconds, n.end_seconds,
       n.string_number, n.fret
FROM transcription_jobs j
JOIN transcription_notes n ON n.snapshot_id = j.snapshot_id
WHERE n.section = 'notes'
ORDER BY j.id, n.position;
```

## 原 JSON 表（迁移归档）

| 表 | 内容 |
| --- | --- |
| `user_profiles` | 正式账号昵称、邮箱、头像、提供方及创建/更新时间 |
| `visitor_states` | 按 UID/key 隔离的歌曲收藏、编配收藏、点赞、打卡、课程完成、练习进度及 CAS 版本 |
| `jobs` | 新版转谱任务和当前结果 |
| `revisions` | 新版转谱编辑历史 |
| `runtime_records` | 旧版 `result.json` 和 `ai-fingerstyle-review.json` 的结构化内容 |

切换时已逐条核对 1 份账号资料、4 条用户状态、1 个新版任务、2 条修订；补充迁移了 13 份旧版任务结果和 1 份审阅记录。后续正常使用会增加或更新行。
这些表只保留迁移前数据，切换后由数据库触发器拒绝写入；不会继续双写 JSON。
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

### JSON 表转关系表

代码：`app/relational_schema.py`、`app/relational_storage.py`；
迁移入口：`python -m scripts.normalize_cloud_sql`。
需使用有建表、创建 schema 和给运行账号授权能力的迁移身份；密码仍从私有环境变量读取。

1. `--rehearse --backup .runtime/relational-rehearsal-NEW`：把当前源数据复制到独立临时 schema，完整迁移并逐条还原核对，随后清理测试 schema。
2. `--prepare --grant-role puyadao-data@puyadao-75dd0.iam --grant-role xiaorimon@gmail.com`：建立新表并授权；版本标记表只授予运行账号读取权限。
3. `python -m scripts.deploy_sql_service`：部署兼容新旧两种存储的 API；版本标记提交前继续使用原表。
4. `--apply --backup .runtime/relational-cutover-NEW`：新客户端暂停于事务级共享锁，迁移取得独占锁并锁定旧表；保存私有快照、迁移、逐条核对，最后在同一事务中启用版本标记并冻结旧表。
5. `--verify`：核对启用状态及各表行数，再验证真实 Firebase 身份下的线上 API。

任何字段校验、约束或还原核对失败都会回滚所有目标数据；原表不删除。
已启用 v1 时重跑返回 `already_applied`，不会用旧数据覆盖迁移后的操作。
旧 Cloud Run 修订或旧本机进程写旧表会明确失败，应更新进程后重试。
切换后不应简单删除版本标记或回退旧 API：新关系表可能已产生新数据，恢复前必须先备份并做反向迁移。

`legacy-snapshot.json` 包含私人资料，目录位于 Git 忽略的 `.runtime/`。
文件创建时请求 0600；当前 SMB 共享卷将其映射为 0700，未开放组和其他用户权限。
旧版 `scripts.migrate_cloud_sql` 导入旧快照时也会根据版本标记写入关系表，拒绝覆盖不同的现有记录。

### 更早的 Firestore / SQLite 导入

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

2026-11-06 线上关系表切换已完成，Cloud Run 修订为 `puyadao-data-00003-gp2`。
迁移并逐条核对 2 份账号资料、8 组状态、1 个新版任务、2 条修订及 14 份旧版结果／审阅；
共 17 个快照，拆出 9519 行音符（含历史及各声部）、174 行和弦、547 行扫弦和 18 行滑音。
本次切换快照：`.runtime/relational-cutover-20261106/legacy-snapshot.json`。

本地接口与转谱回归 50 项、PostgreSQL 存储与迁移检查 11 项（另有重复执行的接口校验）通过。
使用真实 Firebase 匿名令牌验证正式域名的关系表健康状态、收藏／编配／打卡／进度读写、
409 冲突、空集合保存、UID 隔离、401／403／422 拒绝行为；临时身份与状态均已清理。
本机 IAM 客户端也核对了迁移后的当前任务、修订历史及全部旧版结果。

- 前端账号流、合并/隔离、本机缓存、失败重试和 SQL 并发重试测试。
- API 身份及输入校验测试；真实 PostgreSQL 上的用户隔离、资料创建时间保护、编辑并发、取消、事务回滚、旧结果持久化及迁移幂等测试。
- 真正 Firebase 匿名令牌下的线上 API 读写、跨用户隔离、409 冲突、非法进度和匿名资料写入拒绝。
- 生产构建及 Sites 打包测试；正式网站和本机预览均通过浏览器收藏保存及刷新恢复验证。

PostgreSQL 集成测试显式启用，需迁移身份的 `CREATE SCHEMA` 权限。
每项测试使用随机临时 schema 并清理，不修改正式业务表：

```sh
FYP_SQL_INTEGRATION=1 python -m pytest -q tests/test_cloud_sql_integration.py tests/test_relational_storage.py
```

参考：[Cloud SQL Python Connector](https://docs.cloud.google.com/sql/docs/postgres/connect-connectors)。
