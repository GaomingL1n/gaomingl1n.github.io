/*
 * 开场木门动画的交互逻辑。
 *
 * 标记/样式在 _includes/door.html（仅在主页 include）；本脚本全站加载，
 * 但只有页面上存在 #door-overlay 时才动作，其他页面直接 no-op。
 *
 * 行为：
 *  - 每个浏览器只显示一次（localStorage 'door-opened'）
 *  - 点击 OPEN → 门转开、遮罩背景变透明、动画播完销毁自身
 *  - 按 ESC 直接跳过
 *  - 搜索引擎爬虫 / prefers-reduced-motion 用户直接跳过
 */
(function () {
  var overlay = document.getElementById('door-overlay');
  if (!overlay) return;

  var KEY = 'door-opened';
  var seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) {}

  var bot = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse/i
            .test(navigator.userAgent);
  var reduceMotion = window.matchMedia
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (seen || bot || reduceMotion) {
    overlay.remove();
    return;
  }

  document.documentElement.style.overflow = 'hidden'; // 锁滚动

  function openDoor() {
    if (overlay.classList.contains('open')) return;
    overlay.classList.add('open'); // 门转开，背景变透明，直接透出主页
    try { localStorage.setItem(KEY, '1'); } catch (e) {}

    setTimeout(function () {
      overlay.classList.add('done');
      document.documentElement.style.overflow = ''; // 解锁滚动
    }, 1500); // 等门完全转出屏幕

    setTimeout(function () { overlay.remove(); }, 1900); // 彻底销毁遮罩
  }

  // 点击 OPEN 按钮
  document.getElementById('door-open-btn').addEventListener('click', openDoor);

  // 贴心设计：按 ESC 键直接跳过动画
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.documentElement.style.overflow = '';
    }
  });
})();
