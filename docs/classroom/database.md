# 谱芽岛数据库与账号 API

网站前端由 Firebase Hosting 提供，Firebase Authentication 负责身份，
Cloud Run `puyadao-data` 提供 `/api/account/**`，Cloud SQL PostgreSQL 保存业务数据。
项目 `puyadao-75dd0`，实例 `puyadao-postgresql`，数据库 `puyadao`，区域 `asia-east1`。
音频、图片、谱面文件继续使用文件／对象存储。

## 精简后的 10 张活动表（关系存储 v2）

| 表 | 内容 |
| --- | --- |
| `account_profiles` | UID、昵称、头像、邮箱、时间戳和登录提供方文本数组 |
| `account_state_versions` | 各 UID/key 的并发版本；练习 elapsed/scrollTop/BPM 直接使用数值列 |
| `account_items` | 收藏、编配收藏、点赞、课程完成、打卡和编配选择；每个条目一行 |
| `transcription_jobs` | 任务阶段、创建时间和当前快照外键 |
| `transcription_revisions` | 任务、修订号和历史快照外键 |
| `transcription_records` | 旧版结果／审阅的快照引用 |
| `transcription_snapshots` | 任务主要字段、请求参数和两组编配设置，均为明确类型的列 |
| `transcription_notes` | 音符的时间、音高、弦、品、置信度及声部 |
| `transcription_events` | 人工选轨、滑音、和弦和扫弦事件，以 section 区分类型 |
| `storage_schema_versions` | 存储版本；最新值 2 表示精简结构已启用 |

原 22 张活动表通过合并提供方、同类条目、进度、参数和时间事件收敛为 10 张。
不是把整份账号、收藏或转谱结果重新装回 JSON：集合仍逐行保存，主要字段仍可直接查询和索引。
`JSONB extensions` 仅保留模型证据、AI 建议、分析附加字段及未来版本的扩展信息。
`present_fields` / `sections` 是文本数组，保留旧 API 的缺失字段、显式 null、空集合和历史快照形状。

`account_items` 使用 UID/key/position 主键、外键和含空值的唯一约束。
普通目标保存为 `target_id`；编配收藏的歌曲和版本分列保存；打卡使用真正的 `DATE`。
进度不再需要单独的子表。UID 不强制关联正式账号资料，因为匿名访客也可以有状态。
当前曲库、课程仍是演示数据，练习复合标识保持原值，不猜测连字符分界或建立虚假的实体外键。

```sql
SELECT uid, target_id AS song_id FROM account_items
WHERE state_key = 'favorites' ORDER BY uid, position;
SELECT uid, target_id AS song_id, related_id AS arrangement_id FROM account_items
WHERE state_key = 'practice-favorites';
SELECT uid, checkin_date FROM account_items WHERE state_key = 'checkins';
SELECT uid, key, elapsed_seconds, scroll_top, bpm FROM account_state_versions
WHERE key LIKE 'progress-%';
SELECT j.id, n.position, n.pitch, n.start_seconds, n.end_seconds, n.string_number, n.fret
FROM transcription_jobs j JOIN transcription_notes n ON n.snapshot_id = j.snapshot_id
WHERE n.section = 'notes' ORDER BY j.id, n.position;
SELECT snapshot_id, position, label, start_seconds, end_seconds
FROM transcription_events WHERE section = 'accompaniment.chords';
```

## HTTP JSON 与 API 开销

JSON 是 HTTP 的传输表示，与数据库按表、列保存没有冲突。
本次保持 JSON 和原有 GET/PUT 合约，同时减少往返与重复传输：

- `POST /api/account/state:batchGet`：一次读取 1–32 个不同 key，返回 `{states:[{key,value,version}]}`；缺失记录只有 `key/version:0`。
- 账号状态批量读取使用两条数据查询：状态父行和条目行。加上事务内只执行一次的切换锁／版本检查，共 4 条 SQL，不随 key 数量增加。
- `PATCH /api/account/state/{key}`：请求 `{version,add:[...],remove:[...]}`；返回 `{version}`，不重复返回整份列表。只删除／插入发生变化的条目，保持未改动项的位置。
- 练习进度及需要重排的列表使用原有 PUT；读写继续校验 Firebase 身份、UID、记录类型、1000 项上限、256 KB 状态大小和数值范围。
- GET 单条状态支持 UID/key/version 生成的弱 ETag，未变化时跳过条目查询。直连 Cloud Run 支持标准 `If-None-Match` / 304；正式域名验证中 Hosting 路径未返回 304，因此前端另发 `X-State-If-None-Match`，匹配时返回很小的 `{notModified:true}`，复用用户内存中的原值。
- 大于 1 KB 的响应协商 Gzip（压缩等级 5）。小响应不压缩，避免额外 CPU 成本。
- 所有账号响应使用 `Cache-Control: private, no-cache` 与 `Vary: Authorization`，压缩响应另含 `Accept-Encoding`；不能交给公共 CDN 共享缓存。
- 前端每个 Firebase 用户共用一个客户端，同一轮读取自动合并，重复 key 去重；缓存最多 128 个 key。
- 后续更新复用已知 CAS 版本并发送增量；冲突后重新读取并重放，最多 8 次。相同 key 的写入串行执行，不变的已保存值不发送写请求。
- 较晚到达的旧读取不能覆盖更新后的版本；登录身份切换前后均检查 UID。保留原有 UID 隔离的本机缓存、离线待保存操作及访客合并备份。

列表读取 `/state` 保留原来的导出用途，供访客升级／合并完整状态；普通界面改用有数量上限的 batchGet。
新增接口对旧 API 部署有 404/405 回退支持。

批量、增量和压缩减少每个用户的请求／字节／数据库工作，但不等于无限并发。
当前连接池每个 Cloud Run 实例最多 5 个连接；部署仍为最少 0、最多 2 个实例、每实例并发上限 40。
提高实例上限前，需要按实际并发、延迟、CPU、数据库连接和慢查询结果一起确定容量，避免把连接压力转移给小规格 SQL 实例。
本次未声称已通过生产规模的吞吐量压测。

参考：[Google HTTP/JSON API](https://google.aip.dev/127)、[批量方法](https://google.aip.dev/130)、
[FastAPI Gzip](https://fastapi.tiangolo.com/advanced/middleware/#gzipmiddleware)、
[HTTP 条件请求](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-none-match)。

## 精简迁移、归档与部署

代码：`app/relational_schema.py` 与 `app/relational_storage.py`。
`app/relational_v1_storage.py` 仅供迁移及滚动部署期间兼容旧结构。
旧表定义仍供迁移工具使用；运行服务只创建／检查 `CURRENT_TABLES`，不会重新建立已归档的表。

用有建表、建 schema 和授权能力的迁移身份运行，凭证通过私有环境变量提供：

```sh
python -m scripts.compact_cloud_sql --prepare \
  --grant-role puyadao-data@puyadao-75dd0.iam --grant-role xiaorimon@gmail.com
python -m scripts.compact_cloud_sql --rehearse --backup .runtime/compact-rehearsal-NEW
python -m scripts.deploy_sql_service
python -m scripts.compact_cloud_sql --apply --backup .runtime/compact-cutover-NEW \
  --grant-role puyadao-data@puyadao-75dd0.iam --grant-role xiaorimon@gmail.com
python -m scripts.compact_cloud_sql --verify
```

prepare 只增加兼容列／新表与权限。新 API 在版本标记为 1 时继续使用旧结构。
rehearse 把真实源数据复制到临时 schema，完整演练并清理，不改正式业务记录。
apply 取得独占切换锁并锁定源表，保存私有快照、精简数据、逐条还原核对后，再在同一事务启用版本 2。
任何校验失败都会整体回滚；重跑已完成的迁移返回 `already_applied`，不会覆盖后续编辑。

14 张退役关系表及更早的 5 张 JSON 表移入私有 `storage_archive` schema，共 19 张只读归档。
归档子表解除对活动表的级联外键，避免删除业务数据时改变归档；触发器拒绝归档写入，运行身份不再拥有表访问权限。
日常只需查看 `public` 下的 10 张活动表；归档保留作审计与恢复依据，不再参与在线读写。
恢复旧版前必须先备份并反向迁移新数据，不能直接删版本标记或回退旧 API。

本次演练／切换备份位于 Git 忽略的 `.runtime/compact-rehearsal-20261106/` 与 `.runtime/compact-cutover-20261106/`。
其中 `relational-v1.json` 含私人数据，创建时请求 0600；当前 SMB 卷可能映射为 0700。
此前 `.runtime/relational-cutover-20261106/` 和 2026-11-05 的 Firestore／SQLite 备份继续保留。
`normalize_cloud_sql --prepare` 在 v2 启用后拒绝重建旧表；旧快照导入器根据版本标记写入当前关系表并拒绝覆盖不同的现有记录。

前端从 Git 已提交版本加本次两个 API 客户端文件构建，排除工作区已有的页面／样式／素材改动。
后端部署脚本只上传明确的源码与依赖文件，不上传 `.env`、音频、模型或本机数据库。

## 验证

2026-11-06 已完成 v2 线上切换，Cloud Run 修订为 `puyadao-data-00005-m4r`。
`public` 为 10 张活动表，`storage_archive` 为 19 张只读归档；
2 份账号资料、8 组状态、17 个转谱快照逐条核对一致，保留 9519 行音符和合并后的 740 行时间事件。

真实 Firebase 临时身份下的正式域名测试通过：32-key 批量、增量、CAS、越界回滚、
身份隔离、直连 304、Hosting 条件校验、IAM 快照读取、Gzip 与私有缓存头。
1000 项收藏样本的 JSON 响应体为 26023 字节，Gzip 后 2381 字节，减少 90.9%；
示例增删请求体为 69 字节，Hosting 未变化确认体为 20 字节。这些数字不包含 HTTP 头，也不是通用压缩率或吞吐量承诺。
本机预览及正式域名浏览器实测初始化账号状态读取合并为一次 batchGet，无页面异常；前端已发布至 Firebase Hosting。

75 项前端单元／打包检查、50 项本地接口与转谱回归、14 项 PostgreSQL 检查均通过；
条件请求代理兼容分支修改后单独复验。测试身份、临时状态与测试 schema 均清理。

```sh
FYP_SQL_INTEGRATION=1 python -m pytest -q tests/test_compact_storage.py \
  tests/test_relational_storage.py tests/test_cloud_sql_integration.py
node --test classroom/tests/sql-state-client.test.mjs
```

SQL 测试需 CREATE SCHEMA 权限，每项使用随机 schema 并清理，导入工具显式接收测试连接。
覆盖精简前后数据一致性、只读归档、失败回滚、幂等、快照替换、并发 CAS、UID 隔离、
批量 SQL 次数、1000 项集合、只改动增删行、304、压缩、越界与认证拒绝。
前端测试覆盖请求合并、去重、版本缓存、增量、冲突重读、串行写入、重排回退、旧 API 回退及迟到响应。
