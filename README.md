# 弦迹 · YouTube 旋律转吉他谱

## 整曲分轨与指弹工作台（v2 试用）

打开 [整曲工作台](http://127.0.0.1:8000/v2)。支持最长 10 分钟的整曲或 5–600 秒片段。四声部 `htdemucs_ft` 与六声部 `htdemucs_6s` 分别识别，人声、器乐和贝斯保留独立音符及来源；鼓仅用于节奏参考。按 30 秒核心区间、两侧各 3 秒上下文处理，检查点保存在私有 Cloud Storage。

默认自动旋律使用四声部证据。六声部钢琴、吉他候选可按段试听、手动选择；通过真实歌曲质量验收后才能启用双模型自动选轨。旋律与指弹分开保存，指弹在本机后端生成并检查同弦、品距和同时发声限制。分离与识谱仍有误差，见 [质量验收记录](docs/song-v2-quality.md)。

### MuScriptor 器乐识谱

整曲任务在 Demucs 分轨之后，再用 [MuScriptor](https://github.com/muscriptor/muscriptor)（Kyutai × Mirelo，0.4.0）转录两遍：整曲混音一遍，输出按乐器分组的 `muscriptor-吉他/钢琴/贝斯/人声/其他` 轨；六声部吉他分轨限定为吉他再转一遍，得到 `muscriptor_stem-guitar`。它们与 Demucs + Basic Pitch 的同名声部互相交叉核对。MuScriptor 不给逐音分数，所以用音符前三个泛音相对本音区最强频点的比例检查音频支持，和弦内音不会因整帧最响音而被压低。它在独立的 Python 环境里运行，因为它要求 torch≥2.3、numpy≥2，与 Basic Pitch 冲突。

- 权重按 CC BY-NC 4.0 授权，只能非商业使用，并且需要先在 Hugging Face 上接受 [模型许可](https://huggingface.co/MuScriptor/muscriptor-large)。部署前，把有读取权限的 token 存进 Secret Manager。构建时读取，不写入镜像：

  ```sh
  printf %s "$HF_TOKEN" | gcloud secrets create muscriptor-hf-token --data-file=- --project 你的项目ID
  ```

- `deploy_song.py --muscriptor-model small|medium|large` 选择权重，默认 `large`（1.4B 参数、约 5.5 GB，准确率最高）。large 每个规格都要单独在 Hugging Face 页面接受许可。官方建议 large 使用 GPU；当前 Job 为 8 vCPU / 32 GiB，纯 CPU 下整曲可能接近 6 小时任务上限，耗时需在真实部署中记录，必要时改用 `medium`。
- `SONG_MUSCRIPTOR_VALIDATED=0`（默认）时，MuScriptor 轨只作为可手选的候选。设为 `1` 后，新任务的器乐自动选轨和指弹加花改用 MuScriptor 整曲轨，人声仍使用四声部 pYIN。是否开启以 `scripts/evaluate_song.py` 的 `muscriptor_auto` 门槛为准。

### 部署独立整曲任务

需要项目计费开启及创建 Cloud Run Jobs、存储桶、Artifact Registry 和 Cloud Build 的权限。不会修改旧版 Cloud Run 服务。部署脚本创建专用 Job 服务账号和 7 天生命周期的私有存储桶；CPU 任务配置 8 vCPU / 32 GiB、6 小时超时、单任务、一次自动重试。只有运行时使用计算资源，模型构建、存储和执行仍按 Google Cloud 计费。

```powershell
gcloud auth login
.venv-win/Scripts/python.exe scripts/deploy_song.py 你的项目ID --write-env
```

脚本成功后向 `.env` 写入 `SONG_BUCKET`、`SONG_JOB_RESOURCE` 和 `SONG_DUAL_VALIDATED=0`。Linux/macOS 同样可用对应虚拟环境 Python 执行此脚本。当前项目若报 `UREQ_PROJECT_BILLING_NOT_OPEN`，需恢复计费后重跑；此错误发生在资源构建前。

运行本机服务（Windows）：

```powershell
.venv-win/Scripts/python.exe -m uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000
```

本机登录用户需要该 Job 的执行、带参数执行及取消权限，以及专用桶的对象读写权限。部署用户通常已有；权限受限账号需管理员授予 Job 级 `roles/run.developer`、Job 服务账号的 `roles/iam.serviceAccountUser` 及桶级 `roles/storage.objectAdmin`。浏览器不会收到 Google 凭证。不要将本机服务暴露到公网。

### 任务、编辑和导出

- 任务记录和修订保存在 `.runtime/jobs.sqlite3`；关页不取消任务，本机重启后自动恢复查询。下载尚未完成时关闭本机服务会在重启后继续准备；云端已开始的分析独立运行。
- 音频产物单独下载并校验 SHA-256。任务失败可恢复已有检查点；提交结果不明确时仅查询现有执行，不盲目重复启动。可取消任务，云端执行与区间间的取消检查共同停止计算。
- 旋律来源面板允许指定区间使用某轨、休止或恢复自动；该区间的逐音修正会被替换，外部修改保留。可补音、删音、改音及撤销。修订号过期会返回 409，防止多页覆盖。
- 导出原音高主旋律 MIDI、吉他指弹 MIDI、多轨 MIDI、单独分轨 MIDI 及带 JSON 的 ZIP。MIDI Type 1 使用 120 BPM / 960 PPQ 按秒映射，不强制量化；滑音与弦品信息保存在 JSON。双模型重复轨是候选，不能全部同时作为成品播放。
- AI 审阅只在用户点击时处理指定最长 30 秒，密钥不落盘；选择或编配改变后旧建议不再应用。AI 建议、试听、谱面和指弹 MIDI 共享当前修订。
- 旧结果继续在旧版页面打开，可使用 `/v2?reuse=旧任务ID` 创建覆盖开头至旧片段结尾的新结果并保留旧谱旋律和指位。
- 清理入口删除该任务本机音频和分析文件，保留修订记录；清理后不能继续试听、编辑或导出，需要重新处理。云端对象按 7 天生命周期回收。

新增接口详见 `app/song_api.py`。创建任务传 `pipeline_version:2`、`mode:full|segment`；旧调用保持默认 v1。AI 的新版区间接口为 `POST/DELETE /api/jobs/{id}/ai-review-range`，与旧版整段审阅隔离。新结果从旧地址打开时自动转到新版。

### 开发验证与回滚

```powershell
.venv-win/Scripts/python.exe -m pip install -r requirements-dev.txt
.venv-win/Scripts/python.exe -m pytest -q
node tests/test_accompaniment.cjs
node tests/test_fingerstyle.cjs
node tests/test_legato.cjs
```

和弦音频集成测试需要 Vamp Host 和 Chordino 插件，本机不具备时会报依赖缺失；云端镜像通过原有安装脚本安装。v2 模型推理需要在构建后的 Linux 镜像上验证，普通单元测试不下载模型。

回滚时移除首页整曲试用入口或切回旧页面即可，旧任务 API 和云端服务独立运行；不要删除 SQLite 和 v2 本机产物。`SONG_DUAL_VALIDATED=0` 可关闭新任务的双模型自动选择，不会删除六声部候选。

本机网页 + 私有 Google Cloud Run 服务。提取视频中的一段人声旋律，生成吉他六线谱，并根据分离后的伴奏估计和弦、节拍和上下扫弦。可试听分离人声、旋律、扫弦和旋律与扫弦合奏。识谱是自动生成的草稿，需要听音核对。

## 运行本机网页

需要 Python 3.11 或更新版本、Node.js（供 yt-dlp 处理 YouTube JavaScript）和 Google Cloud CLI。FFmpeg 由 `imageio-ffmpeg` 提供，不需要单独安装。

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# 填写下面云端部署后输出的 URL；不要把账号密钥放到这里。
printf 'CLOUD_RUN_URL=https://你的服务地址.run.app\n' > .env
./scripts/start.sh
```

在浏览器打开 http://127.0.0.1:8000 。此服务只监听本机；处理结果临时保存在 `.runtime/`，删除该目录可清除本机生成音频。完成后的结果可通过结果页地址在重启服务后重新打开；进行中的任务在服务重启后不会继续。

## 部署云端模型

需要已经启用结算的 Google Cloud 项目，以及启用 API、创建构建服务账号、设置 IAM、Cloud Build、Artifact Registry 和部署 Cloud Run 的权限。脚本会创建专用构建账号并授予 Cloud Run Builder 角色。运行前请确认使用合适的项目与计费账户；Cloud Run 和构建过程可能产生费用。

```sh
gcloud auth login
./scripts/deploy.sh 项目ID
```

脚本默认将服务部署至 `asia-southeast1`，使用 4 CPU、16 GiB 内存、单实例单并发、空闲缩容到零。设置 `REGION` 可修改区域；设置 `GCLOUD` 可指定 CLI 路径。部署后的 URL 放入 `.env`，再启动本机网页。部署用户必须具有该服务的 Cloud Run Invoker 权限；开发时通过 `gcloud auth print-identity-token` 调用，凭证不会发送到浏览器。

Cloud Run 中依次运行 Demucs `htdemucs`、Basic Pitch / pYIN 旋律识别，以及 Chordino 和弦分析。基础镜像首次构建和服务冷启动可能需要数分钟。可在 Google Cloud Console 的 Cloud Run 日志中排查模型或内存错误。默认不开 GPU。

## 范围和限制

### 旋律指弹初稿

已有旋律会自动生成一份指弹六线谱与单独试听，保留原始旋律的音高、时间和指位；识别出的主旋律仍可单独试听和逐音修改。谱上同一列表示同时弹奏：绿色为和弦低音，金色为旋律间的和弦分解音。新增音的起止时间可通过音符提示查看，试听和谱子使用同一批音符。

加花参考原曲已识别的和弦，并用分离伴奏的低频信息再次核对低音；只在证据较充分、音域和品距允许时加入低音和分解音。证据不足或旧任务没有伴奏时保持原旋律。它是供核对的初稿，不保证原曲和声或完整指弹编配。修改旋律后指弹谱会重新生成，原曲扫弦与通用和弦可在“其他伴奏”中使用。

### 通用和弦伴奏

点击“先试通用和弦 · 不需要链接”，或打开 `http://127.0.0.1:8000/?practice=1`，即可单独试听 32 秒和弦循环，不会创建云端任务。已有旋律的结果页也默认使用通用和弦，可以选择“原曲识别结果”或“关闭伴奏”。

- 预设：柔和抒情（I–vi–IV–V）、明亮流行（I–V–vi–IV）、小调循环（i–VI–III–VII）。支持 12 个主音，每小节 4 拍、一个和弦。
- 可选轻扫、每拍下扫或流行上下扫；速度 40–200 BPM，可调整起点和伴奏音量。点击“应用并更新试听”后生效。默认 C 大调、90 BPM、轻扫、45% 伴奏音量。
- 固定循环不分析音频，也不会修改旋律或原曲识别结果。它不是适用于所有歌曲的和弦公式：合奏时需要手动选择合适的调性、速度和起点。
- 设置按任务保存在当前浏览器的本地存储；独立练习使用单独设置。清除浏览器数据会重置设置。

### 音频识别

- 默认同时尝试识别所选片段中人声开始前的器乐前奏：Demucs 分离各声部，再用 Basic Pitch 处理器乐声部，并选择一条单音线；人声部分仍采用既有识别流程。前奏音符带 `?`，多乐器重叠时需要逐音核对；无法可靠提取时会显示原因而非伪造音符。
- 若已有从视频中途开始的结果，可点击“从视频开头加入前奏，保留这段旋律”。新任务会覆盖视频开头到原片段结尾，最多 60 秒；原来的任务、已调整的音高和指位会保留，新结果将其按原视频时间接到前奏之后。

- 默认取前 30 秒，可选 5–60 秒；只处理公开、可访问、非直播的 YouTube 视频。YouTube 可能限制特定视频或请求。
- 对重叠音符选置信度最高的单音；用人声音高曲线提取稳定音符，减少漏音、重复切分和滑音误报；证据不足的音符标记为 ?，音高曲线无法取得时回退到 Basic Pitch 的结果。音符映射到标准调弦、0–20 品，必要时按八度调整并标注。可以在结果页逐个升降半音并保存；试听时六线谱标记当前音符，可点击谱子跳转或关闭自动跟随。显示时间相对片段开始位置，试听使用同一组音符和时间。
- 使用你有权处理的音频。人声分离和识谱存在误差，合唱、伴奏混入、弱人声或复杂音色可能降低准确度。
- 和弦改用 Chordino / NNLS Chroma，分别分析原曲和分离伴奏，支持大、小、七、六、减、增和弦及转位。两次结果有分歧时只弹共有音并标 `?`；共有音不足两个、静音或明显单音段保留空位。共有的两个音可能显示为 `F·A`，这是简化双音，不是完整和弦名。交叉核对仍可能同时出错，不能视为原曲的准确和弦谱。
- 扫弦保留原音高与估计的微调音准；上扫只扫较细的三根发声弦，换和弦时截断旧和弦尾音。原曲播放器和对照按钮可在同一时间位置切换原曲、扫弦及合奏。新任务会保存原曲片段和分离伴奏；旧结果没有对照音频时需要重新处理。上下扫是跟随原曲节拍的吉他编配，不能还原原曲所有乐器与演奏方式。
- 未使用数据库；进行中的任务状态仅存于本机服务进程，完成结果保存在本机。不要把本机服务暴露到公网。

## 测试

通用和弦的指法、节拍、边界和输入校验可独立运行，不需要云端模型：

```sh
node tests/test_accompaniment.cjs
node tests/test_fingerstyle.cjs
```

```sh
.venv/bin/pip install pytest httpx 'numpy>=1.26,<2' 'librosa==0.11.0'
# 和弦集成测试需要 Chordino Vamp 插件，Linux 云端构建时会自动安装。
.venv/bin/pip install setuptools wheel
.venv/bin/pip install --no-build-isolation vamp==1.1.0
VAMP_PATH=/你的/Vamp插件目录 .venv/bin/pytest -q
```

## 和弦识别依赖

[Chordino / NNLS Chroma](https://github.com/c4dm/nnls-chroma) 由 Queen Mary University of London 提供，按 GPL-2.0-or-later 发布。构建固定使用提交 `4c5f214a75cb354f8d8c933e161377c5b4d83713`；容器保留许可证及源码地址于 `/usr/share/doc/chordino/`。Python Vamp Host 使用版本 1.1.0。和弦识别失败时不回退到旧版的强制三和弦匹配；旋律结果仍可使用。

试听默认使用 [Meta Nylon Guitar](https://github.com/facebookincubator/Meta-open-sound/tree/251c0be57d5d1b3242b91f53e0cde62ab1cb42d9/systems/instruments/meta-nylon-guitar) 的 CC0 吉他单音采样，按谱上的弦与音高选样并校正采样自身音准；页面可切换到原来的合成音作对照。采样许可证见 `app/static/guitar/LICENSE`，可用 `scripts/build_guitar_bank.py` 从该项目的原始 OGG 文件重建采样库。前奏只在分离后的伴奏音频足以支持时修正短暂跳音，其余不确定处仍需人工核对。

旋律试听和指弹试听默认开启连续延音：让吉他采样自然衰减至下一旋律音开始，并柔和处理相邻音的衔接。音符在同一弦上被重新弹响时，旧音让位于新音；采样结束后声音自然消失。可以关闭延音作对比。此功能只改变试听时的延响，不改变识别出的音高、谱面和音符起始时间，也不自动标记击弦、勾弦或滑音技法。

指弹试听提供“丰富 / 简洁”密度和滑音开关。丰富模式会在两路识别的和弦低音一致且伴奏频谱支持时，适当增加可弹奏的低音和分解音；和声仍属推测。滑音只选择同一弦、非空弦、品距较近的相邻旋律音，谱中 `/` 和 `\` 分别表示上滑和下滑；试听通过连续变速吉他采样模拟滑音，不等同于真实演奏录音。

指弹区域的“用 Claude 审阅指弹加花”可通过 `https://happyapi.org/v1/chat/completions` 调用 `claude-opus-5-5`。输入的密钥只用于当次请求，不写入项目、浏览器存储或审阅结果；请求把音符、指位、候选加花、滑音、推测和弦和低音证据发送给中转站，不发送音频或视频链接；同时会发送歌曲标题。模型只能从现有候选中筛选加花与滑音；服务端校验输出和指位后保存可撤销的建议，主旋律和原始识谱结果不变。模型没有听到音频，结果应与原曲核对；每次调用可能产生中转站费用。

人声节拍核对会对照保存的分离人声：只有起音附近的音高、声音强度和发音证据同时支持时，才做几十毫秒以内的起音微调；不会把所有旋律音强行对齐节拍，也不会改动音高。原曲节拍估计通过稳定性与起音检查后，人声段的部分分解音可在相近的拍点上弹出。重新生成或核对结果仍需试听，谱面列宽按音符排列，并不直接表示时值。
