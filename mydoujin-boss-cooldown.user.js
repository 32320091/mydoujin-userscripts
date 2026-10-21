// ==UserScript==
// @name         我的同人｜Boss 冷卻倒數
// @namespace    mydoujin-boss-cooldown
// @version      1.0.1
// @description  Boss 頁「XX 的 Boss 挑戰冷卻中，還有 N 分鐘」改成每秒跳動的「還有 M 分 S 秒」；冷卻結束自動按「刷新」
// @match        https://mydoujin.online/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';
  // 工具箱開關：裝在「我的同人工具箱」裡時可即時開關；單獨安裝時永遠開啟
  const tk = (typeof TK === 'object' && TK) || { on: true, onToggle() {} };

  const COOLDOWN_MS = 30 * 60 * 1000;   // Boss 冷卻 30 分鐘（伺服器顯示為無條件進位的分鐘數）
  const MIN = 60000;
  const EXACT_W = 2000;                 // 誤差 ≤ 2 秒視為精準
  const MAX_PROBES = 8;                 // 每段冷卻最多自行查詢幾次來校正秒數
  const STORE = 'mdbc:v1';
  const CD_RE = /^(.*?)的\s*Boss\s*挑戰冷卻中，還有\s*(\d+)\s*(分鐘|秒)/;

  let apiBase = 'https://mydoujin-backend.onrender.com';
  let offset = 0;                       // 伺服器時間 − 本機時間
  let state = null;                     // 最新的 /api/dungeon/party 回應
  let me = null;                        // { id, nickname }
  const anchorTried = new Set();

  /* ---------- 冷卻結束時間：以區間 [lo, hi] 逐步收斂（本機時鐘） ---------- */
  let cds = {};
  try { cds = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { cds = {}; }
  const save = () => {
    const now = Date.now();
    for (const k of Object.keys(cds)) if (cds[k].hi < now - 10 * MIN) delete cds[k];
    try { localStorage.setItem(STORE, JSON.stringify(cds)); } catch (e) { /* 無痕模式等 */ }
  };

  // 在 [tSend, tRecv] 之間伺服器說「還有 m 分鐘」（無條件進位）→ end ∈ (tSend+(m-1)分, tRecv+m分]
  function observe(key, m, unit, tSend, tRecv) {
    let lo, hi;
    if (unit === '秒') { lo = tSend + (m - 1) * 1000; hi = tRecv + m * 1000; }
    else { lo = tSend + (m - 1) * MIN; hi = tRecv + m * MIN; }
    const c = cds[key];
    if (c && c.lo <= hi + 1000 && lo <= c.hi + 1000) {
      c.lo = Math.max(c.lo, lo); c.hi = Math.min(c.hi, hi);
      if (c.lo > c.hi) { const mid = (c.lo + c.hi) / 2; c.lo = c.hi = mid; }
    } else {
      cds[key] = { lo, hi, probes: 0, src: 'obs', id: tRecv };   // 新的一段冷卻
    }
  }

  function clearDone(keysInBlockers, tSend) {
    // 伺服器已不再列出的人 → 冷卻已結束
    for (const k of Object.keys(cds)) {
      if (!keysInBlockers.has(k) && cds[k].hi > tSend && cds[k].lo < tSend + 20 * MIN) {
        cds[k].hi = Math.min(cds[k].hi, tSend); cds[k].lo = Math.min(cds[k].lo, cds[k].hi);
      }
    }
  }

  const keyOf = name => {
    const mem = state?.party?.members?.find(x => x.nickname === name);
    if (mem) return mem.userId;
    if (me && (me.nickname === name || !name)) return me.id;
    return 'name:' + name;
  };

  /* ---------- 攔截遊戲自己的請求（不額外增加流量） ---------- */
  const origFetch = window.fetch;
  window.fetch = function (input) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const tSend = Date.now();
    const p = origFetch.apply(this, arguments);
    if (/\/api\/(dungeon\/(party|boss)|action\/status|users\/me)(\/|\?|$)/.test(url)) {
      p.then(res => {
        const tRecv = Date.now();
        res.clone().json().then(j => onApi(url, j, tSend, tRecv)).catch(() => {});
      }).catch(() => {});
    }
    return p;
  };

  function onApi(url, j, tSend, tRecv) {
    if (!j || typeof j !== 'object') return;
    const b = url.match(/^(https?:\/\/[^/]+)\/api\//); if (b) apiBase = b[1];
    const st = j.floorSelect?.serverTime || j.serverTime;
    if (st) {
      const s = Date.parse(st);
      if (!isNaN(s)) offset = s - (tSend + tRecv) / 2;
    }
    if (/\/users\/me/.test(url) && j.id) me = { id: j.id, nickname: j.nickname };
    if (Array.isArray(j.blockers)) onParty(j, tSend, tRecv);
  }

  function onParty(j, tSend, tRecv) {
    state = j;
    if (j.viewerId && !me) me = { id: j.viewerId, nickname: j.party?.members?.find(x => x.userId === j.viewerId)?.nickname };
    const seen = new Set();
    for (const line of j.blockers) {
      const m = String(line).match(CD_RE);
      if (!m) continue;
      const k = keyOf(m[1].trim());
      seen.add(k);
      observe(k, +m[2], m[3], tSend, tRecv);
    }
    clearDone(seen, tSend);
    save();
    if (seen.size && tk.on) tryAnchor([...seen]);
    render();
  }

  /* ---------- 精準校正 1：用戰報建立時間 + 30 分鐘 ---------- */
  async function tryAnchor(keys) {
    const need = keys.filter(k => !k.startsWith('name:') && cds[k] && cds[k].hi - cds[k].lo > EXACT_W && !anchorTried.has(k + '@' + cds[k].id));
    if (!need.length) return;
    need.forEach(k => anchorTried.add(k + '@' + cds[k].id));
    try {
      const r = await origFetch(apiBase + '/api/battle-reports?category=PVE&limit=10', { headers: auth() });
      const list = await r.json();
      if (!Array.isArray(list)) return;
      for (const k of need) {
        const rep = list.filter(x => x.battleType === 'BOSS' && (x.outcomes || []).some(o => o.userId === k))
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
        if (!rep) continue;
        const end = Date.parse(rep.createdAt) - offset + COOLDOWN_MS;
        const c = cds[k];
        if (c && end >= c.lo - 1500 && end <= c.hi + 1500) {   // 跟伺服器顯示的分鐘數吻合才採用
          c.lo = c.hi = end; c.src = 'report';
        }
      }
      save(); render();
    } catch (e) { /* 失敗就用分鐘區間 */ }
  }

  /* ---------- 精準校正 2：在「分鐘跳號」的時間點自己查一次隊伍，二分法夾出秒數 ---------- */
  let probeTimer = null;
  function scheduleProbe() {
    if (!tk.on || probeTimer || !onBoss() || document.hidden) return;
    const now = Date.now();
    let best = null;
    for (const [k, c] of Object.entries(cds)) {
      if (c.hi - c.lo <= EXACT_W || c.hi <= now + 5000 || (c.probes || 0) >= MAX_PROBES) continue;
      const mid = (c.lo + c.hi) / 2;
      const kk = Math.floor((mid - now - 1000) / MIN);
      if (kk < 0) continue;
      const at = mid - kk * MIN;
      if (!best || at < best.at) best = { k, at };
    }
    if (!best) return;
    probeTimer = setTimeout(async () => {
      probeTimer = null;
      const c = cds[best.k];
      if (!c || !onBoss()) return;
      c.probes = (c.probes || 0) + 1;
      try { await window.fetch(apiBase + '/api/dungeon/party', { headers: auth() }); } catch (e) { /* ignore */ }
      scheduleProbe();
    }, Math.max(0, best.at - now));
  }

  const auth = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  };
  const onBoss = () => /^\/boss\/?$/.test(location.pathname);

  /* ---------- 畫面 ---------- */
  const fmt = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    return (m ? m + ' 分 ' : '') + String(s % 60).padStart(m ? 2 : 1, '0') + ' 秒';
  };

  function ensureStyle() {
    if (document.getElementById('mdbc-style')) return;
    const st = document.createElement('style');
    st.id = 'mdbc-style';
    st.textContent = `
      [data-mdbc]{font-size:0 !important}
      [data-mdbc] > .mdbc{font-size:var(--mdbc-fs,14px);font-variant-numeric:tabular-nums}
      [data-mdbc] > .mdbc b{color:#fbd38d}
      [data-mdbc] > .mdbc .ok{color:#68d391;font-weight:bold}
      [data-mdbc] > .mdbc .apx{opacity:.6;font-size:.85em;margin-left:4px}
      [data-mdbc] > .mdbc .tg{margin-left:10px;font-size:.8em;color:#a0aec0;cursor:pointer;text-decoration:underline dotted;white-space:nowrap}`;
    (document.head || document.documentElement).appendChild(st);
  }

  let lastAuto = 0, autoCount = 0;
  function render() {
    if (!tk.on || !document.body || !onBoss()) return;
    ensureStyle();
    const now = Date.now();
    let anyDone = false;
    const xp = document.evaluate("//*[contains(text(),'挑戰冷卻中')]", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    let first = true;
    for (let i = 0; i < xp.snapshotLength; i++) {
      const el = xp.snapshotItem(i);
      if (el.closest('.mdbc') || el.closest('script,style')) continue;
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('').trim();
      const m = own.match(CD_RE);
      if (!m) continue;
      const name = m[1].trim();
      const c = cds[keyOf(name)];
      if (el.dataset.mdbc == null) {
        el.style.setProperty('--mdbc-fs', getComputedStyle(el).fontSize);
        el.dataset.mdbc = '';
      }
      let span = el.querySelector(':scope > .mdbc');
      if (!span) { span = document.createElement('span'); span.className = 'mdbc'; el.appendChild(span); }
      let html;
      if (!c) html = `${esc(name)}的 Boss 挑戰冷卻中，還有 <b>${m[2]} ${m[3]}</b>。`;
      else {
        const w = c.hi - c.lo;
        const left = (w > EXACT_W ? (c.lo + c.hi) / 2 : c.hi) - now;   // 校正中先顯示區間中點
        if (c.hi - now <= 0) { html = `${esc(name)}的 Boss 冷卻 <span class="ok">已結束 ✅</span>`; anyDone = true; }
        else if (left <= 0) html = `${esc(name)}的 Boss 冷卻 <b>即將結束…</b>`;
        else {
          const apx = w > EXACT_W ? `<span class="apx">（校正中 ±${Math.ceil(w / 2000)} 秒）</span>` : '';
          html = `${esc(name)}的 Boss 挑戰冷卻中，還有 <b>${fmt(left)}</b>。${apx}`;
        }
      }
      if (first) {
        html += `<a class="tg" data-mdbc-tg title="冷卻結束時自動按「刷新」，讓「開始挑戰」按鈕解鎖">⟳ 自動刷新：${autoRefreshOn() ? '開' : '關'}</a>`;
        first = false;
      }
      if (span.innerHTML !== html) span.innerHTML = html;
    }
    if (anyDone && autoRefreshOn() && onBoss()) autoRefresh(now);
    scheduleProbe();
  }

  const autoRefreshOn = () => { try { return localStorage.getItem('mdbc:auto') !== '0'; } catch (e) { return true; } };
  function autoRefresh(now) {
    if (now - lastAuto < 15000) return;
    if (now - lastAuto > 5 * MIN) autoCount = 0;
    if (autoCount >= 3) return;                                  // 避免一直按
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '刷新' && !b.disabled);
    if (!btn) return;
    lastAuto = now; autoCount++;
    setTimeout(() => btn.click(), 1500);                          // 多等 1.5 秒，避免比伺服器早
  }

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  document.addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('[data-mdbc-tg]')) return;
    e.preventDefault(); e.stopPropagation();
    try { localStorage.setItem('mdbc:auto', autoRefreshOn() ? '0' : '1'); } catch (err) { /* ignore */ }
    render();
  }, true);

  // 工具箱關閉：還原遊戲原本的「還有 N 分鐘」文字
  tk.onToggle(on => {
    if (on) { render(); return; }
    clearTimeout(probeTimer); probeTimer = null;
    document.querySelectorAll('[data-mdbc]').forEach(el => { delete el.dataset.mdbc; el.style.removeProperty('--mdbc-fs'); el.querySelectorAll(':scope > .mdbc').forEach(x => x.remove()); });
  });

  setInterval(render, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  const mo = new MutationObserver(() => { if (!render.q) { render.q = 1; requestAnimationFrame(() => { render.q = 0; render(); }); } });
  const start = () => mo.observe(document.body || document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
