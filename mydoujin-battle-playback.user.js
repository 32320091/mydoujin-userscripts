// ==UserScript==
// @name         我的同人｜戰報逐行播放
// @namespace    mydoujin-battle-playback
// @version      1.0.0
// @description  Boss 挑戰、玩家切磋／茶渡、戰報頁回放：戰鬥過程一行一行出現，勝負、死亡標記與死亡橫幅等到最後一行才揭曉。可調每行間隔，或切回直接顯示結果
// @match        https://mydoujin.online/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* 原理：遊戲把整場戰報一次畫好，這支腳本只是先把每一行藏起來、照間隔一行一行放出來，
     同時把「勝利／失敗／平手」「死亡」標籤、頂端「你的角色死亡了」橫幅、隊伍成員的存活狀態
     暫時蓋住，播完才恢復。不改任何資料、不打任何 API。 */
  const CFG_KEY = 'mdp:cfg';
  const DEF = { mode: 'step', sec: 0.6 };
  const load = () => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(CFG_KEY)) || {}); } catch (e) { return Object.assign({}, DEF); } };
  const save = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  let cfg = load();
  const clampSec = v => Math.max(0.05, Math.min(10, Number(v) || DEF.sec));
  cfg.sec = clampSec(cfg.sec);

  // 只在這三種頁面作用：Boss、玩家詳情（切磋／茶渡）、單篇戰報
  const routeOk = () => /^\/(boss|players\/[^/]+|reports\/[^/]+)\/?$/.test(location.pathname);

  /* ---------- 結果遮蔽 ---------- */
  const DEATH_BANNER = '你的角色死亡了，請進行轉生';
  const STATUS_RE = /^.+ · Lv\.\d+ · (死亡|存活)$/;
  let guard = false, guardTimer = null;        // 戰鬥送出後到播放結束前，都要蓋住結果
  function ensureStyle() {
    if (document.getElementById('mdp-style')) return;
    const st = document.createElement('style');
    st.id = 'mdp-style';
    st.textContent = '[data-mdp-hide]{visibility:hidden !important}[data-mdp-gone]{display:none !important}';
    (document.head || document.documentElement).appendChild(st);
  }
  function hideOutcome() {
    ensureStyle();
    // 頂端死亡橫幅
    document.querySelectorAll('div').forEach(d => {
      if (d.childElementCount === 0 && d.textContent.trim() === DEATH_BANNER) d.setAttribute('data-mdp-gone', '');
    });
    // 隊伍成員「… · Lv.58 · 存活／死亡」：不管死活一律蓋住，免得從誰被蓋住猜出結果
    document.querySelectorAll('p').forEach(p => {
      if (p.childElementCount === 0 && STATUS_RE.test(p.textContent.trim())) p.setAttribute('data-mdp-hide', '');
    });
    // 戰報視窗標題旁的「勝利／失敗／平手」「死亡」標籤
    document.querySelectorAll('[role="dialog"]').forEach(dlg => {
      const title = [...dlg.querySelectorAll('h2, h3, p, div')].find(e => e.childElementCount === 0 && e.textContent.trim() === '戰報');
      let s = title && title.nextElementSibling;
      while (s) { s.setAttribute('data-mdp-hide', ''); s = s.nextElementSibling; }
    });
  }
  function showOutcome() {
    document.querySelectorAll('[data-mdp-hide]').forEach(e => e.removeAttribute('data-mdp-hide'));
    document.querySelectorAll('[data-mdp-gone]').forEach(e => e.removeAttribute('data-mdp-gone'));
  }
  const hiding = () => guard || !!(cur && cur.playing);
  function armGuard() {
    if (cfg.mode !== 'step') return;
    guard = true; hideOutcome();
    clearTimeout(guardTimer);
    guardTimer = setTimeout(() => { guard = false; if (!hiding()) showOutcome(); }, 45000);   // 保險：45 秒沒等到戰報就放掉
  }

  /* 戰鬥送出時就先蓋住結果：Boss 頁送出挑戰後，隊伍狀態可能比戰報視窗先更新 */
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (method === 'POST' && (/\/api\/dungeon\/challenge(?:[?#]|$)/.test(url) || /\/api\/players\/[^/]+\/[^/?#]+(?:[?#]|$)/.test(url))) armGuard();
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  /* ---------- 找戰鬥過程 ---------- */
  // 每一行是一個 flex，裡面兩個 <p>：行號、內容
  const isRow = el => !!el && el.childElementCount === 2 && el.children[0].tagName === 'P' && el.children[1].tagName === 'P' && /^\d+$/.test(el.children[0].textContent.trim());
  function findLogBoxes() {
    const out = [];
    document.querySelectorAll('p').forEach(p => {
      if (p.textContent.trim() !== '1') return;
      const row = p.parentElement;
      if (!isRow(row) || row.firstElementChild !== p) return;
      const box = row.parentElement;
      if (box && box.firstElementChild === row) out.push(box);
    });
    return out;
  }
  const rowsOf = box => [...box.children].filter(isRow);
  const sigOf = box => { const r = rowsOf(box); return r.length + '|' + (r[0] ? r[0].children[1].textContent.slice(0, 40) : '') + '|' + (r.length ? r[r.length - 1].children[1].textContent.slice(0, 40) : ''); };

  /* ---------- 播放 ---------- */
  let cur = null;            // { box, rows, idx, playing, timer, bar, sig }
  const seen = new WeakMap(); // box → sig，同一份戰報不重播

  function startPlayback(box) {
    stopPlayback(false);
    const rows = rowsOf(box);
    if (!rows.length) return;
    cur = { box, rows, idx: 0, playing: true, timer: null, bar: null, sig: sigOf(box) };
    seen.set(box, cur.sig);
    rows.forEach(r => { r.style.display = 'none'; });
    hideOutcome();
    cur.bar = makeBar(box);
    step();
  }

  function step() {
    if (!cur || !cur.playing) return;
    if (!cur.box.isConnected) { stopPlayback(false); return; }
    const r = cur.rows[cur.idx];
    if (r) {
      r.style.display = '';
      if (cfg.follow !== false) { try { r.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    }
    cur.idx++;
    updateBar();
    if (cur.idx >= cur.rows.length) { finish(); return; }
    cur.timer = setTimeout(step, clampSec(cfg.sec) * 1000);
  }

  function finish() {
    if (!cur) return;
    clearTimeout(cur.timer);
    cur.rows.forEach(r => { r.style.display = ''; });
    cur.idx = cur.rows.length;
    cur.playing = false;
    guard = false; clearTimeout(guardTimer);
    showOutcome();
    updateBar();
  }

  function stopPlayback(reveal) {
    if (!cur) return;
    clearTimeout(cur.timer);
    if (reveal !== false || !cur.box.isConnected) cur.rows.forEach(r => { r.style.display = ''; });
    if (cur.bar) cur.bar.remove();
    cur = null;
    if (!guard) showOutcome();
  }

  function replay() {
    if (!cur) return;
    clearTimeout(cur.timer);
    cur.rows = rowsOf(cur.box);
    cur.rows.forEach(r => { r.style.display = 'none'; });
    cur.idx = 0; cur.playing = true;
    hideOutcome();
    updateBar();
    step();
  }

  /* 戰鬥過程上方的小控制列 */
  const BAR_CSS = `
  :host { all: initial; display: block; margin: 4px 0 6px; }
  * { box-sizing: border-box; font-family: "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; }
  .b { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 5px 8px; border: 1px solid rgba(79,209,197,.4);
    border-radius: 6px; background: rgba(79,209,197,.08); color: #b2f5ea; font-size: 13px; }
  .b .sp { flex: 1; }
  button { font: inherit; font-size: 12px; color: #fff; background: #2c7a7b; border: 1px solid #4FD1C5; border-radius: 5px; padding: 3px 10px; cursor: pointer; }
  button:hover { background: #319795; }
  .dim { color: #a0aec0; }
  `;
  function makeBar(box) {
    const host = document.createElement('div');
    host.setAttribute('data-mdp-bar', '');
    const sr = host.attachShadow({ mode: 'open' });
    sr.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'skip') finish();
      else if (b.dataset.a === 'replay') replay();
    });
    box.parentElement.insertBefore(host, box);
    host.__sr = sr;
    return host;
  }
  function updateBar() {
    if (!cur || !cur.bar) return;
    const n = cur.rows.length;
    cur.bar.__sr.innerHTML = `<style>${BAR_CSS}</style><div class="b">` + (cur.playing
      ? `<span>▶ 播放中 ${Math.min(cur.idx, n)} / ${n}</span><span class="dim">每行 ${clampSec(cfg.sec)} 秒</span><span class="sp"></span><button data-a="skip">跳過，直接看結果</button>`
      : `<span>✔ 播放完畢（共 ${n} 行）</span><span class="sp"></span><button data-a="replay">重播</button>`) + `</div>`;
  }

  /* 有新的戰鬥過程出現就開始播 */
  function scan() {
    if (!routeOk()) { if (cur) stopPlayback(true); guard = false; return; }
    if (cur && !cur.box.isConnected) stopPlayback(false);
    if (cur && cur.box.isConnected && cur.playing) {
      const s = sigOf(cur.box);
      if (s !== cur.sig) startPlayback(cur.box);      // 同一個視窗換成另一場
    }
    findLogBoxes().forEach(box => {
      if (cur && cur.box === box) return;
      const s = sigOf(box);
      if (seen.get(box) === s) return;
      seen.set(box, s);
      if (cfg.mode === 'step') startPlayback(box);
      else { guard = false; showOutcome(); }
    });
    if (hiding()) hideOutcome();
    mountSettings();
  }

  /* ---------- 設定按鈕 ---------- */
  const SET_CSS = `
  :host { all: initial; display: inline-block; vertical-align: middle; }
  * { box-sizing: border-box; font-family: "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; }
  .open { font-size: 12px; font-weight: 600; color: #fff; background: #2c7a7b; border: 1px solid #4FD1C5; border-radius: 4px;
    padding: 3px 9px; cursor: pointer; white-space: nowrap; }
  .open:hover { background: #319795; }
  .pop { position: fixed; z-index: 2147483000; width: 260px; padding: 10px 12px; background: #1a1f2e; color: #e2e8f0;
    border: 1px solid rgba(255,255,255,.15); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,.6); font-size: 13px; }
  .pop h4 { margin: 0 0 8px; font-size: 13px; color: #81e6d9; }
  .seg { display: flex; gap: 4px; margin-bottom: 10px; }
  .seg button { flex: 1; font: inherit; font-size: 12px; padding: 6px 4px; border-radius: 5px; cursor: pointer;
    color: #cbd5e0; background: #2d3748; border: 1px solid #4a5568; }
  .seg button.on { color: #fff; background: #2c7a7b; border-color: #4FD1C5; font-weight: 700; }
  .row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .row input[type=number] { width: 70px; font: inherit; color: #fff; background: #171923; border: 1px solid #4a5568; border-radius: 5px; padding: 4px 6px; }
  .row input[type=checkbox] { accent-color: #4FD1C5; }
  .hint { color: #718096; font-size: 11px; line-height: 1.5; }
  .row.off { opacity: .4; }
  `;
  const hosts = new Map();   // 位置 → host
  let popOpen = false;

  function renderSettings(sr) {
    const step = cfg.mode === 'step';
    sr.innerHTML = `<style>${SET_CSS}</style><button class="open" data-a="toggle">⚙ 戰報播放</button>` + (popOpen ? `
      <div class="pop" id="pop"><h4>戰報播放設定</h4>
        <div class="seg"><button data-a="mode" data-v="step" class="${step ? 'on' : ''}">一行一行播放</button>
          <button data-a="mode" data-v="instant" class="${step ? '' : 'on'}">直接顯示結果</button></div>
        <div class="row${step ? '' : ' off'}"><label>每行間隔</label><input id="sec" type="number" min="0.05" max="10" step="0.1" value="${cfg.sec}"${step ? '' : ' disabled'}><span>秒</span></div>
        <div class="row${step ? '' : ' off'}"><input id="follow" type="checkbox"${cfg.follow !== false ? ' checked' : ''}${step ? '' : ' disabled'}><label for="follow">自動捲到最新一行</label></div>
        <div class="hint">播放時「勝利／失敗」「死亡」標籤、頂端死亡橫幅、隊伍成員存活狀態都會先蓋住，最後一行出現才揭曉。</div>
      </div>` : '');
    if (popOpen) placePop(sr);
  }
  function placePop(sr) {
    const btn = sr.querySelector('.open'), pop = sr.getElementById('pop');
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const w = Math.min(260, vw - 16);
    pop.style.width = w + 'px';
    pop.style.left = Math.min(Math.max(8, r.right - w), vw - w - 8) + 'px';
    const below = vh - r.bottom;
    if (below < 200 && r.top > below) { pop.style.top = 'auto'; pop.style.bottom = (vh - r.top + 6) + 'px'; }
    else { pop.style.bottom = 'auto'; pop.style.top = (r.bottom + 6) + 'px'; }
  }
  function rerenderAll() { hosts.forEach(h => { if (h.isConnected) renderSettings(h.__sr); }); }

  function makeSettings(extraCss) {
    const host = document.createElement('span');
    host.setAttribute('data-mdp-set', '');
    if (extraCss) host.style.cssText = extraCss;
    const sr = host.attachShadow({ mode: 'open' });
    host.__sr = sr;
    sr.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.a === 'toggle') { popOpen = !popOpen; rerenderAll(); }
      else if (b.dataset.a === 'mode') {
        cfg.mode = b.dataset.v; save(); rerenderAll();
        if (cfg.mode === 'instant' && cur && cur.playing) finish();     // 正在播的直接揭曉
      }
    });
    sr.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'sec') { cfg.sec = clampSec(t.value); t.value = cfg.sec; save(); updateBar(); }
      if (t.id === 'follow') { cfg.follow = t.checked; save(); }
    });
    renderSettings(sr);
    return host;
  }

  function mountAt(key, find, place, css) {
    const old = hosts.get(key);
    if (old && old.isConnected) return;
    const target = find();
    if (!target) return;
    const h = makeSettings(css);
    place(target, h);
    hosts.set(key, h);
  }

  function mountSettings() {
    const p = location.pathname;
    if (/^\/reports\/[^/]+\/?$/.test(p)) {
      // 戰報頁：放在「戰鬥過程」標題旁邊
      mountAt('report', () => [...document.querySelectorAll('h2')].find(h => h.textContent.replace(/⚙.*$/, '').trim() === '戰鬥過程' && !h.querySelector('[data-mdp-set]')) || null,
        (h, host) => { h.style.display = 'flex'; h.style.alignItems = 'center'; h.style.gap = '10px'; h.appendChild(host); });
    } else if (/^\/boss\/?$/.test(p)) {
      // Boss 頁：隊伍代碼那一列的最右邊；還沒有隊伍時放在「隊伍 刷新」那一列
      mountAt('boss', () => {
        const code = [...document.querySelectorAll('p')].find(e => e.textContent.trim().startsWith('隊伍代碼：'));
        if (code) return code.parentElement;
        const h = [...document.querySelectorAll('h2')].find(e => e.textContent.trim() === '隊伍');
        return h ? h.parentElement : null;
      }, (row, host) => row.appendChild(host), 'margin-left:auto;');
    } else if (/^\/players\/[^/]+\/?$/.test(p)) {
      // 玩家頁：放在「友好切磋」「我要茶渡你」上面，兩顆按鈕往下推
      mountAt('duel', () => {
        const b = [...document.querySelectorAll('button')].find(x => /^(友好切磋|切磋中)/.test(x.textContent.trim()));
        return b && b.parentElement && b.parentElement.parentElement ? b.parentElement.parentElement : null;
      }, (col, host) => col.parentElement.insertBefore(host, col), 'display:block;margin-top:24px;');
    }
  }

  // 點到設定視窗外面就收起來
  document.addEventListener('click', e => {
    if (!popOpen) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (![...hosts.values()].some(h => path.includes(h))) { popOpen = false; rerenderAll(); }
  }, true);
  window.addEventListener('resize', () => { if (popOpen) hosts.forEach(h => h.isConnected && placePop(h.__sr)); });

  /* ---------- 啟動：DOM 一變就檢查（在畫面畫出來之前就把行藏好） ---------- */
  let scheduled = false;
  const mo = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; try { scan(); } catch (e) {} });
  });
  function start() {
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(() => { try { scan(); } catch (e) {} }, 500);
    scan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
