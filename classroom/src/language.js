import { useSyncExternalStore } from 'react';

export const languages = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
];
const storageKey = 'little-score.language.v1';
const valid = code => languages.some(item => item.code === code);
let language = 'zh-CN';
try { const saved = localStorage.getItem(storageKey); if (valid(saved)) language = saved; } catch { /* Storage is optional. */ }
const listeners = new Set();
function update(code) {
  if (!valid(code)) return;
  language = code;
  document.documentElement.lang = code;
  document.title = code === 'en' ? 'Puya Island · Songs you love, at your fingertips.' : code === 'zh-TW' ? '譜芽島 · 讓喜歡的歌，在指尖靠岸。' : '谱芽岛 · 让喜欢的歌，在指尖靠岸。';
  listeners.forEach(listener => listener());
}
update(language);
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === storageKey) update(valid(event.newValue) ? event.newValue : 'zh-CN');
});
export function setLanguage(code) {
  update(code);
  try { localStorage.setItem(storageKey, language); } catch { /* Selection still works without storage. */ }
}
export function useLanguage() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => language);
}

// Keys remain independent of translated display text, so filters and searches retain their state.
const messages = {
  '登录 / 注册':['Sign in','登入 / 註冊'], '我的账号':['My account','我的帳號'], '退出登录':['Sign out','登出'],
  '关闭登录窗口':['Close sign-in window','關閉登入視窗'], '让每一次练习，都留下足迹':['Keep every step of your music journey','讓每一次練習，都留下足跡'],
  '完成账号同步':['Complete account sync','完成帳號同步'],
  '登录后，在不同设备上找回你的收藏和学习进度。':['Sign in to access your saved scores and learning progress across devices.','登入後，在不同裝置上找回你的收藏和學習進度。'],
  '正在同步…':['Syncing…','正在同步…'], '重试账号同步':['Retry account sync','重試帳號同步'],
  '正在连接 Google…':['Connecting to Google…','正在連接 Google…'], '使用 Google 继续':['Continue with Google','使用 Google 繼續'],
  '支持 Gmail 和其他 Google 账号':['Gmail and other Google accounts','支援 Gmail 和其他 Google 帳號'], '暂未开放':['Coming later','暫未開放'],
  '仅用于身份验证，不读取你的邮件或代码仓库。':['Used only to sign you in. We do not read your emails or code repositories.','僅用於身分驗證，不讀取你的郵件或程式碼儲存庫。'],
  '当前访客的收藏与进度会随登录保留。':['Your guest favorites and progress will be kept when you sign in.','目前訪客的收藏與進度會隨登入保留。'],
  '先逛逛，稍后登录':['Keep exploring','先逛逛，稍後登入'],
  '登录窗口已关闭，你可以重新选择登录。':['The sign-in window was closed. You can try again.','登入視窗已關閉，你可以重新選擇登入。'],
  '请在已打开的登录窗口中继续。':['Continue in the sign-in window that is already open.','請在已開啟的登入視窗中繼續。'],
  '浏览器阻止了登录窗口，请允许此网站弹出窗口后重试。':['Allow pop-ups for this website, then try again.','瀏覽器阻止了登入視窗，請允許此網站彈出視窗後重試。'],
  '网络连接不稳定，请检查网络后重试。':['Check your internet connection and try again.','網路連線不穩定，請檢查網路後重試。'],
  '此邮箱已通过其他方式注册，请使用原来的登录方式。':['This email is registered with another sign-in method. Please use that method.','此信箱已透過其他方式註冊，請使用原來的登入方式。'],
  '此登录方式暂未开放，请选择其他方式。':['This sign-in method is unavailable. Please choose another.','此登入方式暫未開放，請選擇其他方式。'],
  '当前网址暂未开通登录，请从 puyadao.top 打开。':['Please open puyadao.top to sign in.','目前網址暫未開通登入，請從 puyadao.top 開啟。'],
  '账号已登录，但部分访客记录尚未合并。请保留当前页面并重试同步。':['You are signed in, but some guest records still need to sync. Keep this page open and retry.','帳號已登入，但部分訪客紀錄尚未合併。請保留目前頁面並重試同步。'],
  '访客记录尚未同步，请联网后重试，避免遗漏收藏和进度。':['Guest records have not synced yet. Connect to the internet and try again.','訪客紀錄尚未同步，請連網後重試，避免遺漏收藏和進度。'],
  '操作暂未完成，请检查网络后重试。':['Please check your connection and try again.','操作暫未完成，請檢查網路後重試。'],

  '谱芽岛':['Puya Island','譜芽島'],
  '让喜欢的歌，在指尖靠岸。':['Songs you love, at your fingertips.','讓喜歡的歌，在指尖靠岸。'],
  '首页':['Home','首頁'], '乐谱':['Scores','樂譜'], '乐谱练习':['Practice','樂譜練習'],
  '乐器课程':['Courses','樂器課程'], '每日打卡':['Check in','每日打卡'], '已打卡':['Checked in','已打卡'],
  '社区问答':['Community','社區問答'], '语言':['Language','語言'], '学习通知':['Notifications','學習通知'],
  '我的头像':['My avatar','我的頭像'], '我的学习':['My learning','我的學習'], '你好，':['Hello, ','你好，'],
  '每天一点点，音乐近一点':['A little music every day','每天一點點，音樂近一點'],
  '我的收藏':['Saved scores','我的收藏'], '我的学习计划':['My learning plan','我的學習計劃'],
  '今日已打卡':['Checked in today','今日已打卡'], '完成今日打卡':['Check in today','完成今日打卡'],
  '展开导航':['Open navigation','展開導覽'], '主导航':['Main navigation','主導覽'],
  '钢琴':['Piano','鋼琴'], '吉他':['Guitar','吉他'], '尤克里里':['Ukulele','烏克麗麗'],
  '钢琴入门课程':['Beginner piano','鋼琴入門課程'], '吉他入门课程':['Beginner guitar','吉他入門課程'], '尤克里里入门课程':['Beginner ukulele','烏克麗麗入門課程'],
  '跟着乐谱学音乐，':['Learn with sheet music, ','跟著樂譜學音樂，'], '轻松唱奏':['sing and play','輕鬆唱奏'], '一首歌':[' a song','一首歌'],
  '从识谱到演奏':['Read, play, enjoy','從識譜到演奏'], '步骤清晰易懂':['Easy steps','步驟清晰易懂'], '零基础也能上手':['Beginners welcome','零基礎也能上手'],
  '在这里你将学会：':['Here you will learn:','在這裡你將學會：'], '认识五线谱与简谱':['Read staff and number notation','認識五線譜與簡譜'],
  '掌握节奏与拍子':['Understand rhythm and beats','掌握節奏與拍子'], '和弦弹唱 / 尤克里里演奏':['Play chords and ukulele','和弦彈唱 / 烏克麗麗演奏'], '边学边练一首完整作品':['Learn a complete song','邊學邊練一首完整作品'],
  '识谱入门':['Read music','識譜入門'], '节奏训练':['Rhythm','節奏訓練'], '跟弹跟唱':['Play along','跟彈跟唱'], '音乐比赛':['Contests','音樂比賽'], '作品社区':['Performances','作品社區'],
  '认识音符、节拍、调号':['Notes, beats and keys','認識音符、節拍、調號'], '培养节奏感，打好基础':['Build your sense of rhythm','培養節奏感，打好基礎'],
  '边看边弹，轻松上手':['Follow the score and play','邊看邊彈，輕鬆上手'], '参与线上比赛，展示你的作品':['Share your music in contests','參與線上比賽，展示你的作品'], '发布演奏作品，收听他人分享':['Share and discover performances','發布演奏作品，收聽他人分享'],
  '热门乐谱 · 发现想弹的曲子':['Popular scores · Find your next song','熱門樂譜 · 發現想彈的曲子'], '更多乐谱':['More scores','更多樂譜'],
  '五线谱':['Staff','五線譜'], '简谱':['Numbers','簡譜'], '和弦谱':['Chords','和弦譜'], '吉他谱':['Guitar','吉他譜'], '钢琴谱':['Piano','鋼琴譜'], '更多':['More','更多'],
  '难度：':['Level:','難度：'], '预览':['Preview','預覽'], '开始练习':['Practice','開始練習'], '热门':['Popular','熱門'], '新上':['New','新上'],
  '音乐论坛 · 分享你的演奏':['Community · Share your music','音樂論壇 · 分享你的演奏'], '推荐':['For you','推薦'], '钢琴演奏':['Piano','鋼琴演奏'], '吉他弹唱':['Guitar & vocals','吉他彈唱'], '翻唱':['Covers','翻唱'], '合奏':['Ensembles','合奏'], '比赛作品':['Contests','比賽作品'], '学习交流':['Learning','學習交流'],
  '精选讨论':['Discussions','精選討論'], '查看全部':['View all','查看全部'], '分享我的作品':['Share my music','分享我的作品'], '这里等着你的第一段演奏':['Your first performance belongs here','這裡等著你的第一段演奏'],
  '搜索你想学习的歌曲或乐谱':['Find a song or score to learn','搜尋你想學習的歌曲或樂譜'], '热门搜索：':['Trending:','熱門搜尋：'], '热门搜索':['Trending searches','熱門搜尋'],
  '搜索':['Search','搜尋'], '搜索歌曲、歌手、谱子，或粘贴音乐 URL...':['Song, artist, score or music URL...','搜尋歌曲、歌手、譜子，或貼上音樂 URL...'],
  '搜索歌曲或乐谱':['Search songs or scores','搜尋歌曲或樂譜'], '清空搜索内容':['Clear search','清空搜尋內容'], '搜索建议':['Search suggestions','搜尋建議'], '关闭搜索建议':['Close suggestions','關閉搜尋建議'],
  '搜索历史':['Recent searches','搜尋歷史'], '清空':['Clear','清空'], '还没有搜索记录，搜一首喜欢的歌吧':['Search for a song you love','還沒有搜尋記錄，搜一首喜歡的歌吧'],
  '匹配乐谱':['Matching scores','符合的樂譜'], '没有找到匹配的乐谱，试试其他歌曲或歌手':['No matches. Try another song or artist','沒有找到符合的樂譜，試試其他歌曲或歌手'],
  '支持歌曲名、歌手、乐器或粘贴音乐链接（如 YouTube / Bilibili 等）':['Search by song, artist, instrument or music URL (YouTube / Bilibili)','支援歌曲名、歌手、樂器或貼上音樂連結（如 YouTube / Bilibili 等）'],
  '从第一个音符，到第一首完整的歌。':['From your first note to your first song.','從第一個音符，到第一首完整的歌。'], '陪你慢慢学，开心唱，自在弹。':['Learn, sing and play at your own pace.','陪你慢慢學，開心唱，自在彈。'],
  '开始学音乐':['Start learning','開始學音樂'], '零基础入门':['For beginners','零基礎入門'], '发现好乐谱':['Discover scores','發現好樂譜'], '遇见音乐同好':['Meet music lovers','遇見音樂同好'],
  '每天一小段，':['A little practice every day,','每天一小段，'], '离喜欢的音乐近一点。':['closer to the music you love.','離喜歡的音樂近一點。'], '今天也来练一首':['Play a song today','今天也來練一首'],
  '返回顶部':['Back to top','返回頂部'], '学习体验演示 · 社区内容为示例':['Learning demo · Sample community content','學習體驗示範 · 社區內容為範例'], '用音乐记录每一点进步':['Celebrate every step with music','用音樂記錄每一點進步'],
  "音乐学习与乐谱搜索":["Music learning and score search", "音樂學習與樂譜搜尋"],
  "阳光洒进音乐教室，戴耳机的女孩抱着尤克里里，身旁的小猫安静地睡着":["A sunlit music room with a girl playing ukulele beside a sleeping cat", "陽光灑進音樂教室，戴耳機的女孩抱著烏克麗麗，身旁的小貓安靜地睡著"],
  "乐谱分类":["Score types", "樂譜分類"],
  "首乐谱":["scores", "首樂譜"],
  "清除筛选":["Clear filters", "清除篩選"],
  "还没有找到这首曲子":["No scores found", "還沒有找到這首曲子"],
  "试试「小星星」「晴天」，或选择乐器来发现乐谱。":["Try another song or choose an instrument.", "試試「小星星」「晴天」，或選擇樂器來發現樂譜。"],
  "查看全部乐谱":["View all scores", "查看全部樂譜"],
  "作品分类":["Performance categories", "作品分類"],
  "谱芽岛，返回顶部":["Puya Island, back to top", "譜芽島，返回頂部"],
  "页尾快捷入口":["Footer navigation", "頁尾快捷入口"],
  "关闭弹窗":["Close dialog", "關閉彈窗"],
  "PUYA ISLAND · 一起享受音乐":["PUYA ISLAND · Enjoy music together", "PUYA ISLAND · 一起享受音樂"],
  "练习速度":["Tempo", "練習速度"],
  "试听进度":["Playback progress", "試聽進度"],
  "每一点进步，都值得被听见":["Every step deserves to be heard", "每一點進步，都值得被聽見"],
  "从一个音符开始，让今天成为你的音乐第一天。":["Start with one note. Your music journey begins today.", "從一個音符開始，讓今天成為你的音樂第一天。"],
  "用《小星星》开始练习":["Practice Twinkle, Twinkle, Little Star", "用《小星星》開始練習"],
  "发现想弹的曲子":["Find your next song", "發現想彈的曲子"],
  "选一首喜欢的，把练习变成期待。":["Pick a song you love and look forward to practice.", "選一首喜歡的，把練習變成期待。"],
  "把喜欢的旋律，留给下一次练习。":["Keep your favorite melodies for your next practice.", "把喜歡的旋律，留給下一次練習。"],
  "点击乐谱卡片上的爱心，收藏喜欢的曲子。":["Tap the heart on a score to save it.", "點擊樂譜卡片上的愛心，收藏喜歡的曲子。"],
  "分享你的音乐时刻":["Share your music moments", "分享你的音樂時刻"],
  "发布演奏作品":["Share a performance", "發布演奏作品"],
  "每一次勇敢的演奏，都值得被听见。":["Every brave performance deserves to be heard.", "每一次勇敢的演奏，都值得被聽見。"],
  "作品标题":["Title", "作品標題"],
  "给你的演奏起个名字":["Give your performance a title", "給你的演奏起個名字"],
  "音乐心得":["Your music story", "音樂心得"],
  "分享练习中的小故事…":["Share a story from your practice…", "分享練習中的小故事…"],
  "当前为页面演示，作品会展示在本次预览中。":["Demo: your performance appears in this session only.", "目前為頁面示範，作品會展示在本次預覽中。"],
  "发布到作品社区":["Share with the community", "發布到作品社區"],
  "音乐同好的小小讨论室":["A place for music lovers", "音樂同好的小小討論室"],
  "小谱音乐老师":["Puya Island teacher", "小譜音樂老師"],
  "一起学习，一起进步":["Learn and grow together", "一起學習，一起進步"],
  "讨论回复":["Reply", "討論回覆"],
  "聊聊你的音乐心得…":["Share your thoughts on music…", "聊聊你的音樂心得…"],
  "发送":["Send", "傳送"],
  "位同学参与讨论":["people in this discussion", "位同學參與討論"],
  "欢迎来到谱芽岛":["Welcome to Puya Island", "歡迎來到譜芽島"],
  "你的音乐旅程从这里开始。试试收藏一首喜欢的曲子，完成今天的第一段练习吧。":["Start your music journey here. Save a favorite score and try your first practice.", "你的音樂旅程從這裡開始。試試收藏一首喜歡的曲子，完成今天的第一段練習吧。"],
  "发现我的第一首乐谱":["Find my first score", "發現我的第一首樂譜"],
  "从音乐链接开始":["Start with a music link", "從音樂連結開始"],
  "已识别你的音乐链接，可以进入现有的旋律转谱工作台继续处理。":["Your music link is ready. Continue in the melody transcription workspace.", "已識別你的音樂連結，可以進入現有的旋律轉譜工作台繼續處理。"],
  "打开整曲转谱工作台":["Open transcription workspace", "開啟整曲轉譜工作台"],
  "工作台需要项目的本地 Python 服务运行在 8000 端口。":["The workspace requires the local Python service on port 8000.", "工作台需要專案的本機 Python 服務執行於 8000 連接埠。"],
  "已识别音乐链接":["Music link detected", "已識別音樂連結"],
  "继续前往旋律转谱工作台":["Continue to transcription", "繼續前往旋律轉譜工作台"],
  "没有找到相关乐谱，试试其他歌曲名、歌手或乐器":["No matches. Try another song, artist or instrument.", "沒有找到相關樂譜，試試其他歌曲名、歌手或樂器"],
  "推荐乐谱":["Suggested scores", "推薦樂譜"],
  "音乐链接":["Music link", "音樂連結"],
  "今天已经打卡啦，明天继续！":["You have checked in today. See you tomorrow!", "今天已經打卡啦，明天繼續！"],
  "打卡成功！今天也离音乐更近了一步。":["Checked in! Another step closer to music.", "打卡成功！今天也離音樂更近了一步。"],
  "认识高音谱号和五条谱线":["Meet the treble clef and staff", "認識高音譜號和五條譜線"],
  "找到中央 C，唱出 do re mi":["Find middle C and sing do re mi", "找到中央 C，唱出 do re mi"],
  "跟着《小星星》完成第一次练习":["Try your first practice with Twinkle, Twinkle", "跟著《小星星》完成第一次練習"],
  "认识四分音符与四四拍":["Learn quarter notes and 4/4 time", "認識四分音符與四四拍"],
  "跟着节拍器，均匀地拍手":["Clap along with the metronome", "跟著節拍器，均勻地拍手"],
  "用 60 BPM 完成四小节练习":["Practice four bars at 60 BPM", "用 60 BPM 完成四小節練習"],
  "认识基础知识 · 5 分钟":["Learn the basics · 5 min", "認識基礎知識 · 5 分鐘"],
  "动手试一试 · 8 分钟":["Give it a try · 8 min", "動手試一試 · 8 分鐘"],
  "完成一次小练习 · 10 分钟":["Complete a practice · 10 min", "完成一次小練習 · 10 分鐘"],
  "已收藏":["Saved", "已收藏"],
  "收藏乐谱":["Save score", "收藏樂譜"],
  "暂停试听":["Pause", "暫停試聽"],
  "播放小星星旋律":["Play Twinkle, Twinkle", "播放小星星旋律"],
  "播放练习音阶":["Play practice scale", "播放練習音階"],
  "乐谱预览":["Score preview", "樂譜預覽"],
  "跟着乐谱，慢慢弹好每一个音":["Follow the score, one note at a time", "跟著樂譜，慢慢彈好每一個音"],
  "作品欣赏 · 练习伴奏试听":["Performance · Practice accompaniment", "作品欣賞 · 練習伴奏試聽"],
};
export function tr(value) {
  if (typeof value !== 'string' || language === 'zh-CN') return value;
  const text = value.trim();
  const message = messages[text];
  return message ? value.replace(text, message[language === 'en' ? 0 : 1]) : value;
}
