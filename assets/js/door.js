/*
 * 开场木门动画的交互逻辑。
 *
 * 标记/样式在 _includes/door.html（仅在主页 include）；本脚本全站加载，
 * 但只有页面上存在 #door-overlay 时才动作，其他页面直接 no-op。
 *
 * 行为：
 *  - 每次“点开博客”（新标签页 / 重新打开浏览器）弹一次门；同一个标签页里
 *    首页↔其他页面来回切换不再重复弹出（标记存 sessionStorage：切页不丢、
 *    关标签页清除）
 *  - 点击 OPEN → 门转开、遮罩背景变透明、动画播完销毁自身；同时作为
 *    播放手势调用 window.musicPlayer.play()（取代原来的 ▶ 播放按钮）
 *  - 按 ESC 直接跳过（本次会话不再弹）
 *  - 搜索引擎爬虫 / prefers-reduced-motion 用户直接跳过
 */
(function () {
  var overlay = document.getElementById('door-overlay');
  if (!overlay) return;

  var SESSION_KEY = 'door-shown'; // 会话级“已弹过”标记
  var seen = false;
  try { seen = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}

  var bot = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse/i
            .test(navigator.userAgent);
  var reduceMotion = window.matchMedia
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (seen || bot || reduceMotion) {
    overlay.remove();
    return;
  }

  function markShown() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  document.documentElement.style.overflow = 'hidden'; // 锁滚动

  function openDoor() {
    if (overlay.classList.contains('open')) return;
    overlay.classList.add('open'); // 门转开，背景变透明，直接透出主页
    markShown(); // 本次会话已弹过，之后切回首页不再弹

    // OPEN 兼任播放按钮：点击即开音乐（门遮罩在播放器之下，不挡音乐）。
    // music-player.js 在 door.js 之前加载并同步暴露 window.musicPlayer。
    if (window.musicPlayer && typeof window.musicPlayer.play === 'function') {
      window.musicPlayer.play();
    }

    setTimeout(function () {
      overlay.classList.add('done');
      document.documentElement.style.overflow = ''; // 解锁滚动
    }, 1500); // 等门完全转出屏幕

    setTimeout(function () { overlay.remove(); }, 1900); // 彻底销毁遮罩
  }

  // 点击 OPEN 按钮
  document.getElementById('door-open-btn').addEventListener('click', openDoor);

  // 贴心设计：按 ESC 键直接跳过动画（同样记为已弹过，本会话不再出现）
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      markShown();
      overlay.remove();
      document.documentElement.style.overflow = '';
    }
  });
})();
