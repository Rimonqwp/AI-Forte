# 整曲 v2 验收记录

状态：工程实现可本机测试；真实歌曲质量门槛未验收，保持试用入口。

- 默认 `SONG_DUAL_VALIDATED=0`，六声部候选可手选，不作为默认自动选轨来源。
- 默认 `SONG_MUSCRIPTOR_VALIDATED=0`：MuScriptor 轨为可手选候选。真实音频推理尚未运行（需 Hugging Face 许可 token 与云端计费），自动测试使用替身。
- 未收集经人工听音确认的 12 个片段、3 首整曲参考标注。不得用合成测试或另一模型输出宣称满足质量门槛。
- `scripts/evaluate_song.py` 对 baseline / four / dual 三组 JSON 事件作最大匹配，输出起音 50ms、音高严格一致的 F1 及发布门槛判断；调参与保留测试按 song_id 隔离。
- 人工听音还需记录：八度错误、漏音、重复音、换轨错误、低音还原及指弹难度；真实云端运行还需记录耗时、峰值内存、存储用量和实际账单。
- 部署尝试被 Google Cloud 拒绝：项目 `itp4122-b04-500610` 计费账户未开启（`UREQ_PROJECT_BILLING_NOT_OPEN`）。因此双模型镜像构建、云端任务执行和真实整曲端到端验收尚未完成。
- 浏览器使用 `scripts/smoke_song.py` 生成的明确标注的 10 分钟合成任务，验证分页、区间休止、修订保存、撤销和指弹播放，控制台无错误。该任务不能用于准确率评分。
- 自动测试覆盖 MIDI 回读时间误差、人工区间覆盖、弱证据留空、同音反复、跨块持续音、双模型失败降级、云端检查点复用、取消优先级及提交超时不重复执行。模型推理由替身隔离，因此不代表真实 Demucs / Basic Pitch 测试通过。

## 评分输入

创建 manifest（所有路径相对 manifest）：

```json
{"clips":[{"song_id":"song-01","split":"test","role":"vocal","reference":"song-01/reference.json","baseline":"song-01/baseline.json","four":"song-01/four.json","dual":"song-01/dual.json","muscriptor":"song-01/muscriptor.json"}]}
```

每份事件文件是 `[{"start":0.5,"end":1.1,"pitch":64}]`。标注者必须听音确认 reference，并注明音频授权来源。分轨和吉他八度调整前的音高用于主旋律评分。

```powershell
.venv-win/Scripts/python.exe scripts/evaluate_song.py path/to/manifest.json --output .runtime/quality-report.json
```

只有保留测试满足总体 +5pp、人声不低于 -2pp，才可考虑将 v2 设为默认；双模型还需非人声相对 four +3pp。三首整曲的性能、恢复和盲听验收独立完成，F1 门槛不能替代它们。达标后由维护者设置 `SONG_DUAL_VALIDATED=1`，不得由不完整数据集自动打开。

`muscriptor` 字段可选（所有片段都提供时才评分），内容是开启 `SONG_MUSCRIPTOR_VALIDATED=1` 后的旋律。门槛 `muscriptor_auto`：非人声相对 four +3pp，人声不低于 -2pp。
