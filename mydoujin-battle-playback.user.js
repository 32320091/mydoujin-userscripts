// ==UserScript==
// @name         我的同人｜戰報逐行播放
// @namespace    mydoujin-battle-playback
// @version      1.1.0
// @description  Boss 挑戰、玩家切磋／茶渡、戰報頁回放：戰鬥過程一行一行出現，勝負、死亡標記與死亡橫幅等到最後一行才揭曉。可調每行間隔，或切回直接顯示結果；每一行後面顯示被打／被補的人剩多少血
// @match        https://mydoujin.online/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* 原理：遊戲把整場戰報一次畫好，這支腳本只是先把每一行藏起來、照間隔一行一行放出來，
     同時把「勝利／失敗／平手」「死亡」標籤、頂端「你的角色死亡了」橫幅、隊伍成員的存活狀態
     暫時蓋住，播完才恢復。不改任何資料。
     剩餘血量：從戰報資料逐行推算（受傷扣、回復加、倒下歸零），並用戰報最後的「剩餘 HP」校正。 */
  const CFG_KEY = 'mdp:cfg';
  const DEF = { mode: 'step', sec: 0.6, hp: true };
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
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const battlePost = method === 'POST' && (/\/api\/dungeon\/challenge(?:[?#]|$)/.test(url) || /\/api\/players\/[^/]+\/[^/?#]+(?:[?#]|$)/.test(url));
      if (battlePost) armGuard();
      // 順手把遊戲自己拿到的戰報資料記下來，用來算每一行的剩餘血量（不另外打 API）
      if (battlePost || (method === 'GET' && /\/api\/battle-reports\/\d+(?:[?#]|$)/.test(url))) {
        p.then(res => { if (res && res.ok) res.clone().json().then(remember).catch(() => {}); }).catch(() => {});
      }
    } catch (e) {}
    return p;
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
  // 一行的戰報文字（不含這支腳本加上去的血量標籤）
  const msgText = row => { let t = ''; row.children[1].childNodes.forEach(n => { if (!(n.nodeType === 1 && n.hasAttribute('data-mdp-hp'))) t += n.textContent; }); return t; };
  const sigOf = box => { const r = rowsOf(box); return r.length + '|' + (r[0] ? msgText(r[0]).slice(0, 40) : '') + '|' + (r.length ? msgText(r[r.length - 1]).slice(0, 40) : ''); };


  /* ---------- 剩餘血量 ---------- */
  const API = 'https://mydoujin-backend.onrender.com';
  const datasets = [];      // 最近拿到的戰報資料 { logs, participants, reportId }
  function findBattle(d, depth) {
    if (!d || typeof d !== 'object' || depth > 3) return null;
    if (Array.isArray(d.logs) && d.logs.some(l => l && typeof l === 'object')) return d;
    for (const k of Object.keys(d)) {
      const v = d[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) { const r = findBattle(v, depth + 1); if (r) return r; }
    }
    return null;
  }
  function remember(d) {
    const b = findBattle(d, 0);
    if (!b) return;
    const rid = b.reportId != null ? String(b.reportId) : null;
    let ds = rid ? datasets.find(x => x.reportId === rid) : null;
    if (ds) { ds.logs = b.logs; if (b.participants) ds.participants = b.participants; }
    else {
      datasets.unshift({ logs: b.logs, participants: b.participants || null, reportId: rid });
      if (datasets.length > 6) datasets.pop();
    }
    schedule();
  }
  const shownLogs = logs => {
    const idx = [];
    logs.forEach((l, i) => { if (typeof l === 'string' || (l && (l.message ?? l.description) !== '')) idx.push(i); });
    return idx;
  };
  const logText = l => typeof l === 'string' ? l : (l.message ?? l.description ?? JSON.stringify(l));

  // 戰報資料要跟畫面上的行一一對得起來才用：行數一樣、頭中尾三行文字相同
  function matchDataset(rows) {
    const n = rows.length;
    for (const ds of datasets) {
      const idx = ds.idx || (ds.idx = shownLogs(ds.logs));
      if (idx.length !== n) continue;
      const ok = [0, n >> 1, n - 1].every(k => msgText(rows[k]).trim() === String(logText(ds.logs[idx[k]])).trim());
      if (ok) return ds;
    }
    return null;
  }

  /* 推算方式（用 20 場實際戰報驗證過，最後剩餘 HP 全部對得上）：
     - 起始血量＝滿血；造成傷害用 actualDamage（真正扣掉的血），反擊沒有 actualDamage 就用數值、扣到 0 為止
     - 治療、持續回復、文字裡的「回復了 N HP」加血，不超過上限；「失去了 N HP」扣血
     - 有戰報最後的「剩餘 HP」或「倒下了」就從結尾倒推回來校正。
       愛國者這種殘血後重生的 BOSS，重生之後改用倒推的數字 */
  function computeHp(ds) {
    const logs = ds.logs, P = ds.participants || {};
    const U = {};
    const unit = id => id ? (U[id] || (U[id] = { id, name: null, max: null, ev: [], anchor: null })) : null;
    (P.players || []).forEach(p => { const u = unit(p.userId || p.entityId || p._id); if (u) { u.name = p.characterName || p.name; u.max = Number(p.stats && p.stats.hp) || null; u.side = 'A'; } });
    (P.enemies || []).forEach(p => { const u = unit(p.userId || p.entityId || p._id); if (u) { u.name = p.characterName || p.name; u.max = Number(p.stats && p.stats.hp) || null; u.side = 'B'; } });
    const ev = (id, i, d, heal) => { const u = unit(id); if (u) u.ev.push({ i, d, heal: !!heal }); };
    logs.forEach((l, i) => {
      if (!l || typeof l !== 'object') return;
      const v = Number(l.value) || 0, msg = String(l.message || '');
      const real = l.actualDamage != null ? Number(l.actualDamage) || 0 : v;
      switch (l.type) {
        case 'DAMAGE': case 'BLOCK': ev(l.targetId, i, -real); break;
        case 'COUNTER': {
          if (l.value == null) break;
          // 有些反擊後面還會再記一筆 isCounter 的 DAMAGE，那筆才算
          let dup = false;
          for (let j = i + 1; j < Math.min(logs.length, i + 6); j++) {
            const x = logs[j];
            if (x && (x.type === 'DAMAGE' || x.type === 'BLOCK') && x.isCounter && (Number(x.value) === v || x.actorId === l.actorId)) { dup = true; break; }
          }
          if (!dup) ev(l.targetId, i, -real);
          break;
        }
        case 'LUCK_EVENT': ev(l.targetId, i, -v); break;
        case 'MISS': ev(l.targetId, i, 0); break;
        case 'BUFF_EFFECT':
          if (!v) break;
          if (l.buffType === 'HOT' || (/恢復|回復/.test(msg) && !/傷害|失去/.test(msg))) ev(l.actorId, i, v, true);
          else ev(l.actorId, i, -v);
          break;
        case 'HEAL': ev(l.targetId || l.actorId, i, v, true); break;
        case 'DEATH': {
          const u = unit(l.actorId);
          if (u) { u.anchor = { i, v: 0 }; if (!u.name) { const m = msg.match(/^(.+?)\s*倒下了/); if (m) u.name = m[1]; } }
          ev(l.actorId, i, 0);
          break;
        }
        case 'HP_REMAINING': {
          const u = unit(l.actorId);
          if (u) { u.anchor = { i, v }; if (l.maxHp) u.max = Number(l.maxHp); if (!u.name) { const m = msg.match(/^(.+?)\s*剩餘/); if (m) u.name = m[1]; } }
          break;
        }
        default: {
          if (!/TEXT|BUFF_APPLY/.test(String(l.type))) break;
          const mh = msg.match(/(?:恢復|回復)了\s*(\d+)\s*(?:HP|點生命)/);
          if (mh) ev(l.actorId, i, Number(mh[1]), true);
          const ml = msg.match(/失去了\s*(\d+)\s*(?:HP|點生命)/);
          if (ml) ev(l.actorId, i, -Number(ml[1]));
        }
      }
    });
    const out = {};   // 戰報第 i 筆 → [{ name, hp, max, side }]
    Object.values(U).forEach(u => {
      const E = u.ev.filter(e => !u.anchor || e.i <= u.anchor.i);
      if (!E.length) return;
      let F = null, B = null;
      if (u.max) { F = []; let h = u.max; E.forEach(e => { h = e.heal ? Math.min(u.max, h + e.d) : Math.max(0, h + e.d); F.push(h); }); }
      if (u.anchor) {
        B = new Array(E.length);
        let b = u.anchor.v;
        for (let k = E.length - 1; k >= 0; k--) { B[k] = b; b -= E[k].d; if (u.max) b = Math.min(u.max, b); b = Math.max(0, b); }
      }
      let V;
      if (!F) V = B;
      else if (!B) V = F;
      else if (Math.abs(F[F.length - 1] - u.anchor.v) <= 1) V = F;
      else {
        // 推算的結尾對不上：多半是殘血後重生。掉到 1 滴血之後、下一次真的扣血或補血之前照推算的，之後改用倒推的
        let r = F.findIndex(x => x <= 1);
        if (r >= 0) { while (r + 1 < E.length && E[r + 1].d === 0) r++; V = F.map((x, k) => k <= r ? x : B[k]); }
        else V = B;
      }
      if (!V) return;
      E.forEach((e, k) => { (out[e.i] = out[e.i] || []).push({ name: u.name || '？', hp: Math.round(V[k]), max: u.max, side: u.side }); });
    });
    return out;
  }

  const fmt = n => Number(n).toLocaleString('en-US');
  const hpColor = (hp, max) => { if (!max) return '#a0aec0'; const r = hp / max; return r > 0.5 ? '#68d391' : r > 0.25 ? '#f6e05e' : '#fc8181'; };
  function chipEl(list) {
    const wrap = document.createElement('span');
    wrap.setAttribute('data-mdp-hp', '');
    wrap.style.cssText = 'display:inline-flex;flex-wrap:wrap;gap:4px 10px;margin-left:8px;vertical-align:middle;font-size:11px;line-height:1.6;font-family:inherit;white-space:nowrap;';
    list.forEach(x => {
      const c = document.createElement('span');
      c.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:0 6px;border-radius:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);';
      const col = hpColor(x.hp, x.max);
      const pct = x.max ? Math.max(0, Math.min(100, x.hp / x.max * 100)) : 0;
      c.innerHTML = '<span style="color:#cbd5e0"></span>' +
        (x.max ? '<span style="display:inline-block;width:38px;height:5px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden"><span style="display:block;height:100%;width:' + pct.toFixed(1) + '%;background:' + col + '"></span></span>' : '') +
        '<span style="color:' + col + ';font-weight:700"></span>' + (x.max ? '<span style="color:#718096"></span>' : '');
      c.children[0].textContent = x.name;
      const val = c.children[x.max ? 2 : 1];
      val.textContent = x.hp <= 0 ? '0' : fmt(x.hp);
      if (x.max) c.children[3].textContent = '/' + fmt(x.max);
      c.title = x.name + ' 剩餘 ' + fmt(x.hp) + (x.max ? ' / ' + fmt(x.max) + ' HP' : ' HP');
      wrap.appendChild(c);
    });
    return wrap;
  }
  const clearChips = box => { box.querySelectorAll('[data-mdp-hp]').forEach(e => e.remove()); };

  const hpState = new WeakMap();   // box → { sig, ds, withP }
  function requestReport(ds) {
    if (!ds.reportId || ds.fetching || ds.failed) return;
    let token = null;
    try { token = localStorage.getItem('token'); } catch (e) {}
    if (!token) { ds.failed = true; return; }
    ds.fetching = true;
    // 挑戰／切磋的回傳沒有角色血量上限時，讀一次這場的戰報補上（跟戰報頁讀的是同一份）
    origFetch.call(window, API + '/api/battle-reports/' + ds.reportId, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(j => { if (j && j.participants) ds.participants = j.participants; else ds.failed = true; })
      .catch(() => { ds.failed = true; })
      .finally(() => { ds.fetching = false; schedule(); });
  }
  function ensureHp(box) {
    if (!cfg.hp) { if (hpState.has(box)) { clearChips(box); hpState.delete(box); } return; }
    const rows = rowsOf(box);
    if (!rows.length) return;
    const sig = sigOf(box);
    const st = hpState.get(box);
    // 已經畫好、而且沒有新的血量上限資料進來 → 不用重畫
    if (st && st.sig === sig && (st.withP || !st.ds.participants)) return;
    const ds = matchDataset(rows);
    if (!ds) return;            // 資料還沒到，下一輪再試
    const res = computeHp(ds);
    clearChips(box);
    rows.forEach((row, k) => { const list = res[ds.idx[k]]; if (list && list.length) row.children[1].appendChild(chipEl(list)); });
    hpState.set(box, { sig, ds, withP: !!ds.participants });
    if (!ds.participants) requestReport(ds);
  }

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
    const boxes = findLogBoxes();
    boxes.forEach(box => { try { ensureHp(box); } catch (e) {} });
    boxes.forEach(box => {
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
        <div class="row"><input id="hp" type="checkbox"${cfg.hp !== false ? ' checked' : ''}><label for="hp">每一行顯示被打／被補的人剩餘血量</label></div>
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
      if (t.id === 'hp') { cfg.hp = t.checked; save(); findLogBoxes().forEach(b => { hpState.delete(b); if (!cfg.hp) clearChips(b); }); schedule(); }
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
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; try { scan(); } catch (e) {} });
  }
  const mo = new MutationObserver(schedule);
  function start() {
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(() => { try { scan(); } catch (e) {} }, 500);
    scan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
