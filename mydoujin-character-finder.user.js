// ==UserScript==
// @name         我的同人｜角色查詢
// @namespace    mydoujin-character-finder
// @version      1.1.1
// @description  在「玩家列表」與 Boss 頁的「選擇助戰」裡，依角色與等級範圍查出使用該角色的玩家（等級、樓層、能力值），助戰可一鍵帶入搜尋
// @match        https://mydoujin.online/*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';
  // 工具箱開關：裝在「我的同人工具箱」裡時可即時開關；單獨安裝時永遠開啟
  const tk = (typeof TK === 'object' && TK) || { on: true, onToggle() {} };

  const API = 'https://mydoujin-backend.onrender.com';
  const P_KEY = 'mdcf:players';          // 玩家列表掃描結果（localStorage）
  const A_KEY = 'mdcf:assist';           // 助戰名單掃描結果（sessionStorage，依樓層區間）
  const P_FRESH = 30 * 60 * 1000;        // 玩家列表 30 分鐘內算新
  const A_FRESH = 3 * 60 * 1000;         // 助戰名單 3 分鐘內算新
  const SHOW_MAX = 200;

  /* ---------- 小工具 ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = t => {
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return '剛剛';
    if (m < 60) return m + ' 分鐘前';
    const h = Math.floor(m / 60);
    return h < 24 ? h + ' 小時前' : Math.floor(h / 24) + ' 天前';
  };
  const ls = {
    get(store, k) { try { return JSON.parse(store.getItem(k) || 'null'); } catch (e) { return null; } },
    set(store, k, v) { try { store.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  async function api(path) {
    const tok = localStorage.getItem('token');
    if (!tok) throw new Error('請先登入遊戲');
    for (let i = 0; i < 3; i++) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 25000);
      let r;
      try { r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + tok }, signal: ctl.signal }); }
      catch (e) { clearTimeout(timer); if (i === 2) throw new Error('連線逾時，請稍後再試'); await sleep(1500); continue; }
      clearTimeout(timer);
      if (r.status === 429) { await sleep(3000 * (i + 1)); continue; }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || ('讀取失敗（' + r.status + '）'));
      return d;
    }
    throw new Error('伺服器忙碌，請稍後再試');
  }

  /* ---------- 資料：玩家列表（全部玩家） ---------- */
  const slimP = p => ({
    id: p.id, nick: p.nickname || '', lv: p.level, ch: p.characterName || '', ti: p.characterTitle || '',
    img: p.imagePath || '', fl: p.floor, hf: p.highestFloor, dead: !!p.isDead,
  });
  let pScan = null; // 進行中的掃描
  function scanPlayers(onProg) {
    if (pScan) return pScan;
    pScan = (async () => {
      const q = p => `/api/players?page=${p}&limit=50&sort=level&order=desc`;
      const first = await api(q(1));
      const total = (first.pagination && first.pagination.totalPages) || 1;
      const pages = { 1: first.players || [] };
      let done = 1; onProg && onProg(done, total);
      const todo = []; for (let p = 2; p <= total; p++) todo.push(p);
      // 一次最多 2 個請求、每個之間稍微停一下，不要對伺服器灌請求
      const worker = async () => {
        while (todo.length) {
          const p = todo.shift();
          const d = await api(q(p));
          pages[p] = d.players || [];
          done++; onProg && onProg(done, total);
          await sleep(250);
        }
      };
      await Promise.all([worker(), worker()]);
      const seen = new Set(), list = [];
      for (let p = 1; p <= total; p++) (pages[p] || []).forEach(x => { if (!seen.has(x.id)) { seen.add(x.id); list.push(slimP(x)); } });
      const data = { t: Date.now(), list };
      ls.set(localStorage, P_KEY, data);
      return data;
    })().finally(() => { pScan = null; });
    return pScan;
  }

  /* ---------- 資料：助戰名單（同樓層區間） ---------- */
  const slimA = c => {
    const ch = c.character || {};
    return {
      cid: c.characterId, uid: c.userId, nick: c.nickname || '', fl: c.floor,
      ch: ch.name || '', ti: ch.title || '', lv: ch.level, img: ch.imagePath || '', st: ch.stats || {},
    };
  };
  let aScan = null;
  function scanAssist(onProg) {
    if (aScan) return aScan;
    aScan = (async () => {
      const list = [], seen = new Set();
      let page = 1, range = null;
      while (page <= 40) {
        const d = await api('/api/dungeon/party/assist/candidates?page=' + page);
        range = d.floorRange || range;
        (d.candidates || []).forEach(c => { if (!seen.has(c.characterId)) { seen.add(c.characterId); list.push(slimA(c)); } });
        onProg && onProg(page, d.hasNextPage);
        if (!d.hasNextPage) break;
        page++;
        await sleep(250);
      }
      const data = { t: Date.now(), range, list };
      const all = ls.get(sessionStorage, A_KEY) || {};
      all[rangeKey(range)] = data;
      ls.set(sessionStorage, A_KEY, all);
      return data;
    })().finally(() => { aScan = null; });
    return aScan;
  }
  const rangeKey = r => r ? r[0] + '-' + (r[1] == null ? '' : r[1]) : '?';
  const rangeTxt = r => !r ? '' : r[1] == null ? `${r[0]} 樓以上` : `${r[0]}～${r[1]} 樓`;

  /* ---------- 樣式 ---------- */
  const CSS = `
  :host { all: initial; display: block; }
  * { box-sizing: border-box; }
  .box { margin: 10px 0 12px; background: #171c27; color: rgba(255,255,255,.88); border: 1px solid #2c7a7b; border-radius: 10px;
    font: 14px/1.5 "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; overflow: hidden; text-align: left; }
  .hd { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: linear-gradient(180deg,#1f2636,#191f2c);
    border-bottom: 1px solid #2d3748; cursor: pointer; user-select: none; flex-wrap: wrap; }
  .box.col .hd { border-bottom: none; }
  .ttl { font-weight: 700; color: #fff; white-space: nowrap; }
  .ttl small { color: #8b98ad; font-weight: 400; font-size: 12px; margin-left: 4px; }
  .meta { color: #8b98ad; font-size: 12px; margin-left: auto; }
  .tg { color: #4FD1C5; font-size: 12px; }
  .bd { padding: 10px 12px 12px; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  select, input, button { font: inherit; font-size: 13px; color: #e2e8f0; background: #121722; border: 1px solid #3a4558; border-radius: 6px; padding: 6px 9px; }
  select { min-width: 150px; flex: 1 1 160px; max-width: 260px; }
  input { flex: 1 1 140px; min-width: 0; }
  select:focus, input:focus { outline: none; border-color: #4FD1C5; }
  button { background: #263042; cursor: pointer; white-space: nowrap; }
  button:hover { background: #33405a; }
  button:disabled { opacity: .5; cursor: default; }
  button.pri { background: #2c7a7b; border-color: #2c7a7b; color: #fff; font-weight: 700; }
  button.pri:hover { background: #319795; }
  .st { margin-top: 8px; font-size: 12.5px; color: #8b98ad; }
  .st.err { color: #f6878b; }
  .prog { height: 4px; background: rgba(79,209,197,.13); border-radius: 2px; overflow: hidden; margin-top: 6px; }
  .prog i { display: block; height: 100%; background: linear-gradient(90deg,#2c7a7b,#4FD1C5); transition: width .2s; }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
  .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 4px; border: 1px solid #3a4558; border-radius: 999px;
    background: #1f2636; cursor: pointer; font-size: 12.5px; color: #cbd5e0; }
  .chip:hover { border-color: #4FD1C5; color: #fff; }
  .chip img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; background: #121722; }
  .chip b { color: #4FD1C5; font-variant-numeric: tabular-nums; }
  .list { margin-top: 9px; max-height: 460px; overflow: auto; border: 1px solid #2d3748; border-radius: 8px; overscroll-behavior: contain; }
  .it { display: flex; gap: 9px; align-items: center; padding: 7px 9px; border-top: 1px solid #232b3a; }
  .it:first-child { border-top: none; }
  .it:hover { background: rgba(79,209,197,.05); }
  .av { width: 38px; height: 38px; border-radius: 8px; object-fit: cover; background: #121722; flex: none; }
  .mn { flex: 1; min-width: 0; }
  .l1 { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
  .nk { color: #fff; font-weight: 700; text-decoration: none; overflow-wrap: anywhere; }
  a.nk:hover { color: #4FD1C5; text-decoration: underline; }
  .lv { color: #f6e05e; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  .fl { color: #90cdf4; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  .dead { font-size: 11px; color: #f6878b; border: 1px solid #f6878b; border-radius: 999px; padding: 0 6px; }
  .l2 { color: #a0aec0; font-size: 12.5px; }
  .sts { display: flex; flex-wrap: wrap; gap: 2px 9px; margin-top: 2px; font-size: 11.5px; color: #8b98ad; }
  .sts span b { color: #e2e8f0; font-weight: 600; margin-left: 2px; font-variant-numeric: tabular-nums; }
  .act { flex: none; }
  input.lvin { flex: 0 0 64px; width: 64px; text-align: center; }
  .lvw { display: inline-flex; align-items: center; gap: 4px; color: #8b98ad; font-size: 12.5px; }
  .empty { padding: 14px; color: #8b98ad; text-align: center; font-size: 13px; }
  @media (max-width: 640px) {
    .lvw { flex: 1 1 100%; }
    .meta { margin-left: 0; width: 100%; }
    select { max-width: none; }
    .list { max-height: 60vh; }
  }`;

  const STAT_ORDER = [['hp', 'HP'], ['atk', '攻'], ['def', '防'], ['sta', '體'], ['agi', '敏'], ['spd', '反'], ['tec', '技'], ['int', '智'], ['luk', '幸']];

  /* ---------- 共用元件 ---------- */
  function makeHost(kind) {
    const host = document.createElement('div');
    host.setAttribute('data-mdcf', kind);
    const root = host.attachShadow({ mode: 'open' });
    return { host, root };
  }

  // 依角色統計：[{ch, n, img}]，人數多的在前
  function countByChar(list) {
    const m = new Map();
    list.forEach(x => {
      if (!x.ch) return;
      const o = m.get(x.ch) || { ch: x.ch, n: 0, img: x.img };
      o.n++; m.set(x.ch, o);
    });
    return [...m.values()].sort((a, b) => b.n - a.n || a.ch.localeCompare(b.ch, 'zh-Hant'));
  }

  // 等級範圍：空白＝不限；上下限填反了自動對調
  function lvRange(ui) {
    let lo = parseInt(ui.lo, 10), hi = parseInt(ui.hi, 10);
    lo = Number.isFinite(lo) ? lo : null; hi = Number.isFinite(hi) ? hi : null;
    if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
    return { lo, hi, on: lo != null || hi != null };
  }
  const lvOk = (x, r) => (r.lo == null || +x.lv >= r.lo) && (r.hi == null || +x.lv <= r.hi);
  const lvTxt = r => r.lo != null && r.hi != null ? `Lv${r.lo}～${r.hi}` : r.lo != null ? `Lv${r.lo} 以上` : `Lv${r.hi} 以下`;
  function filterList(list, ch, kw, r) {
    kw = (kw || '').trim().toLowerCase();
    return list.filter(x => (!r || lvOk(x, r)) && (!ch || x.ch === ch) &&
      (!kw || x.ch.toLowerCase().includes(kw) || x.ti.toLowerCase().includes(kw) || x.nick.toLowerCase().includes(kw)));
  }

  /* ---------- 玩家列表頁 ---------- */
  const pUI = { open: ls.get(localStorage, 'mdcf:pOpen') !== false, ch: '', kw: '', lo: '', hi: '', busy: false, prog: null, err: '' };

  function mountPlayers() {
    if (location.pathname !== '/players') return;
    const h2 = [...document.querySelectorAll('h2')].find(e => e.textContent.trim() === '玩家列表');
    if (!h2) return;
    if (h2.nextElementSibling && h2.nextElementSibling.getAttribute('data-mdcf') === 'players') return;
    document.querySelectorAll('[data-mdcf="players"]').forEach(e => e.remove());
    const { host, root } = makeHost('players');
    h2.insertAdjacentElement('afterend', host);
    root.addEventListener('click', e => onPlayersClick(e, root));
    root.addEventListener('change', e => { if (e.target.id === 'ch') { pUI.ch = e.target.value; renderPlayers(root); } });
    root.addEventListener('input', e => {
      if (e.target.id === 'kw') pUI.kw = e.target.value;
      else if (e.target.id === 'lo') pUI.lo = e.target.value;
      else if (e.target.id === 'hi') pUI.hi = e.target.value;
      else return;
      renderPlayersList(root);
    });
    renderPlayers(root);
  }

  function renderPlayers(root) {
    const data = ls.get(localStorage, P_KEY);
    const list = data ? data.list : [];
    const stale = data && Date.now() - data.t > P_FRESH;
    const meta = pUI.busy ? '掃描中…' : data ? `${list.length} 人 · ${ago(data.t)}更新${stale ? '（建議重新掃描）' : ''}` : '尚未掃描';
    let h = `<style>${CSS}</style><div class="box${pUI.open ? '' : ' col'}">
      <div class="hd" data-act="toggle"><span class="ttl">🔎 依角色查玩家</span><span class="meta">${esc(meta)}</span><span class="tg">${pUI.open ? '收起 ▴' : '展開 ▾'}</span></div>`;
    if (pUI.open) {
      const chars = countByChar(list);
      h += `<div class="bd"><div class="row">
          <select id="ch"${list.length ? '' : ' disabled'}><option value="">全部角色${list.length ? '（' + chars.length + ' 種）' : ''}</option>
            ${chars.map(c => `<option value="${esc(c.ch)}"${c.ch === pUI.ch ? ' selected' : ''}>${esc(c.ch)}（${c.n}）</option>`).join('')}</select>
          <input id="kw" placeholder="關鍵字：角色／稱號／暱稱" value="${esc(pUI.kw)}"${list.length ? '' : ' disabled'}>
          <span class="lvw">Lv <input id="lo" class="lvin" type="number" min="1" max="100" placeholder="最低" value="${esc(pUI.lo)}"${list.length ? '' : ' disabled'}> ～ <input id="hi" class="lvin" type="number" min="1" max="100" placeholder="最高" value="${esc(pUI.hi)}"${list.length ? '' : ' disabled'}></span>
          <button class="pri" data-act="scan"${pUI.busy ? ' disabled' : ''}>${data ? '重新掃描' : '掃描全部玩家'}</button>
        </div>`;
      if (pUI.busy && pUI.prog) h += `<div class="st">讀取玩家列表 ${pUI.prog[0]} / ${pUI.prog[1]} 頁…</div><div class="prog"><i style="width:${Math.round(pUI.prog[0] / pUI.prog[1] * 100)}%"></i></div>`;
      else if (pUI.busy) h += `<div class="st">連線中…</div>`;
      if (pUI.err) h += `<div class="st err">${esc(pUI.err)}</div>`;
      if (!data && !pUI.busy) h += `<div class="st">第一次使用請按「掃描全部玩家」（八百多人分 17 頁，大約 10～30 秒），結果會存在你的瀏覽器，30 分鐘內不用重掃。</div>`;
      h += `<div id="res"></div></div>`;
    }
    h += `</div>`;
    root.innerHTML = h;
    if (pUI.open) renderPlayersList(root);
  }

  function renderPlayersList(root) {
    const el = root.getElementById('res');
    if (!el) return;
    const data = ls.get(localStorage, P_KEY);
    if (!data || !data.list.length) { el.innerHTML = ''; return; }
    const r = lvRange(pUI);
    const inLv = r.on ? data.list.filter(x => lvOk(x, r)) : data.list;
    let h = '';
    if (!pUI.ch) {
      const cs = countByChar(inLv);
      h += `<div class="st">${r.on ? `${lvTxt(r)} 共 ${inLv.length} 人，` : ''}點角色直接篩選：</div><div class="chips">` +
        (cs.map(c => `<span class="chip" data-ch="${esc(c.ch)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}${esc(c.ch)} <b>${c.n}</b></span>`).join('') || '<span class="st">這個等級範圍沒有玩家</span>') + `</div>`;
      if (!pUI.kw.trim() && !r.on) { el.innerHTML = h; return; }
    }
    const rows = filterList(data.list, pUI.ch, pUI.kw, r).sort((a, b) => (b.lv - a.lv) || ((b.hf || 0) - (a.hf || 0)));
    h += `<div class="st">找到 <b style="color:#4FD1C5">${rows.length}</b> 人${r.on ? `（${lvTxt(r)}）` : ''}${rows.length > SHOW_MAX ? `，只列前 ${SHOW_MAX} 位` : ''}（依等級排序）</div>` +
      (rows.length ? `<div class="list">${rows.slice(0, SHOW_MAX).map(x => `
        <div class="it">
          ${x.img ? `<img class="av" src="${esc(x.img)}" alt="" loading="lazy">` : '<span class="av"></span>'}
          <div class="mn">
            <div class="l1"><a class="nk" href="/players/${esc(x.id)}" target="_self">${esc(x.nick || '-')}</a><span class="lv">Lv.${esc(x.lv)}</span>${x.dead ? '<span class="dead">死亡</span>' : ''}</div>
            <div class="l2">${esc(x.ch)}${x.ti ? '（' + esc(x.ti) + '）' : ''} · <span class="fl">${esc(x.fl)} / ${esc(x.hf)} 樓</span></div>
          </div>
        </div>`).join('')}</div>` : `<div class="list"><div class="empty">沒有符合的玩家</div></div>`);
    el.innerHTML = h;
  }

  async function onPlayersClick(e, root) {
    const chip = e.target.closest('[data-ch]');
    if (chip) { pUI.ch = chip.dataset.ch; pUI.kw = ''; renderPlayers(root); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'toggle') { pUI.open = !pUI.open; ls.set(localStorage, 'mdcf:pOpen', pUI.open); renderPlayers(root); }
    else if (b.dataset.act === 'scan' && !pUI.busy) {
      pUI.busy = true; pUI.err = ''; pUI.prog = null; renderPlayers(root);
      try { await scanPlayers((d, t) => { pUI.prog = [d, t]; if (root.host.isConnected) renderPlayers(root); }); }
      catch (err) { pUI.err = '掃描失敗：' + err.message; }
      pUI.busy = false; pUI.prog = null;
      document.querySelectorAll('[data-mdcf="players"]').forEach(h => renderPlayers(h.shadowRoot));
    }
  }

  /* ---------- Boss 頁：選擇助戰 ---------- */
  const aUI = { ch: '', kw: '', lo: '', hi: '', busy: false, prog: 0, err: '', note: '' };

  function findAssistForm() {
    const inp = document.querySelector('input[placeholder^="搜尋暱稱（需完全相符）"]');
    return inp ? { inp, form: inp.closest('form') } : null;
  }
  function boxRange(form) {
    const t = form && form.parentElement && form.parentElement.textContent || '';
    const m = t.match(/選擇助戰（(\d+)(?:～(\d+)|\s*樓以上)/);
    return m ? [+m[1], m[2] ? +m[2] : null] : null;
  }

  function mountAssist() {
    const f = findAssistForm();
    if (!f || !f.form) return;
    if (f.form.nextElementSibling && f.form.nextElementSibling.getAttribute('data-mdcf') === 'assist') return;
    document.querySelectorAll('[data-mdcf="assist"]').forEach(e => e.remove());
    const { host, root } = makeHost('assist');
    f.form.insertAdjacentElement('afterend', host);
    root.addEventListener('click', e => onAssistClick(e, root));
    root.addEventListener('change', e => { if (e.target.id === 'ch') { aUI.ch = e.target.value; renderAssist(root); } });
    root.addEventListener('input', e => {
      if (e.target.id === 'kw') aUI.kw = e.target.value;
      else if (e.target.id === 'lo') aUI.lo = e.target.value;
      else if (e.target.id === 'hi') aUI.hi = e.target.value;
      else return;
      renderAssistList(root);
    });
    aUI.note = '';
    renderAssist(root);
  }

  function assistData(root) {
    const range = boxRange(root.host.parentElement && root.host.parentElement.querySelector('form') || root.host.previousElementSibling);
    const all = ls.get(sessionStorage, A_KEY) || {};
    return { range, data: all[rangeKey(range)] || null };
  }

  function renderAssist(root) {
    const { range, data } = assistData(root);
    const list = data ? data.list : [];
    const stale = data && Date.now() - data.t > A_FRESH;
    const meta = aUI.busy ? '掃描中…' : data ? `${list.length} 人 · ${ago(data.t)}更新${stale ? '（建議重新掃描）' : ''}` : '尚未掃描';
    const chars = countByChar(list);
    let h = `<style>${CSS}</style><div class="box">
      <div class="hd"><span class="ttl">🔎 依角色找助戰<small>${esc(rangeTxt(range))}</small></span><span class="meta">${esc(meta)}</span></div>
      <div class="bd"><div class="row">
        <select id="ch"${list.length ? '' : ' disabled'}><option value="">全部角色${list.length ? '（' + chars.length + ' 種）' : ''}</option>
          ${chars.map(c => `<option value="${esc(c.ch)}"${c.ch === aUI.ch ? ' selected' : ''}>${esc(c.ch)}（${c.n}）</option>`).join('')}</select>
        <input id="kw" placeholder="關鍵字：角色／稱號／暱稱" value="${esc(aUI.kw)}"${list.length ? '' : ' disabled'}>
        <span class="lvw">Lv <input id="lo" class="lvin" type="number" min="1" max="100" placeholder="最低" value="${esc(aUI.lo)}"${list.length ? '' : ' disabled'}> ～ <input id="hi" class="lvin" type="number" min="1" max="100" placeholder="最高" value="${esc(aUI.hi)}"${list.length ? '' : ' disabled'}></span>
        <button class="pri" data-act="scan"${aUI.busy ? ' disabled' : ''}>${data ? '重新掃描' : '掃描助戰名單'}</button>
      </div>`;
    if (aUI.busy) h += `<div class="st">讀取助戰名單第 ${aUI.prog || 1} 頁…</div>`;
    if (aUI.err) h += `<div class="st err">${esc(aUI.err)}</div>`;
    if (aUI.note) h += `<div class="st" style="color:#7bd5a6">${esc(aUI.note)}</div>`;
    if (!data && !aUI.busy) h += `<div class="st">按「掃描助戰名單」會一次讀完這個樓層區間所有可借的人（通常幾頁而已），再依角色篩選。</div>`;
    h += `<div id="res"></div></div></div>`;
    root.innerHTML = h;
    renderAssistList(root);
  }

  function renderAssistList(root) {
    const el = root.getElementById('res');
    if (!el) return;
    const { data } = assistData(root);
    if (!data || !data.list.length) { el.innerHTML = data ? `<div class="list"><div class="empty">這個樓層區間目前沒有人可以借</div></div>` : ''; return; }
    const r = lvRange(aUI);
    let h = '';
    if (!aUI.ch) {
      const inLv = r.on ? data.list.filter(x => lvOk(x, r)) : data.list;
      const cs = countByChar(inLv);
      h += `<div class="st">${r.on ? `${lvTxt(r)} 共 ${inLv.length} 人，` : ''}點角色直接篩選：</div><div class="chips">` +
        (cs.map(c => `<span class="chip" data-ch="${esc(c.ch)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}${esc(c.ch)} <b>${c.n}</b></span>`).join('') || '<span class="st">這個等級範圍沒有人</span>') + `</div>`;
      if (!aUI.kw.trim() && !r.on) { el.innerHTML = h; return; }
    }
    const rows = filterList(data.list, aUI.ch, aUI.kw, r).sort((a, b) => (b.lv - a.lv) || ((b.st.hp || 0) - (a.st.hp || 0)));
    el.innerHTML = h + `<div class="st">找到 <b style="color:#4FD1C5">${rows.length}</b> 人${r.on ? `（${lvTxt(r)}）` : ''}（依等級排序）。按「帶入」會把暱稱填進上面的搜尋框並搜尋，再按遊戲的「選擇」就好。</div>` +
      (rows.length ? `<div class="list">${rows.slice(0, SHOW_MAX).map(x => `
        <div class="it">
          ${x.img ? `<img class="av" src="${esc(x.img)}" alt="" loading="lazy">` : '<span class="av"></span>'}
          <div class="mn">
            <div class="l1"><span class="nk">${esc(x.nick || '-')}</span><span class="lv">Lv.${esc(x.lv)}</span><span class="fl">${esc(x.fl)}F</span></div>
            <div class="l2">${esc(x.ch)}${x.ti ? '（' + esc(x.ti) + '）' : ''}</div>
            <div class="sts">${STAT_ORDER.map(([k, n]) => x.st[k] != null ? `<span>${n}<b>${esc(x.st[k])}</b></span>` : '').join('')}</div>
          </div>
          <button class="act" data-act="pick" data-nick="${esc(x.nick)}">帶入</button>
        </div>`).join('')}</div>` : `<div class="list"><div class="empty">沒有符合的玩家</div></div>`);
  }

  // 把暱稱填進遊戲自己的搜尋框並送出（遊戲會只列出這個人，再由玩家自己按「選擇」）
  async function fillGameSearch(nick) {
    const f = findAssistForm();
    if (!f) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(f.inp, nick);
    f.inp.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(60);
    const btn = f.form.querySelector('button[type="submit"]');
    if (btn && !btn.disabled) btn.click();
    else if (f.form.requestSubmit) f.form.requestSubmit();
    return true;
  }

  async function onAssistClick(e, root) {
    const chip = e.target.closest('[data-ch]');
    if (chip) { aUI.ch = chip.dataset.ch; aUI.kw = ''; renderAssist(root); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'scan' && !aUI.busy) {
      aUI.busy = true; aUI.err = ''; aUI.note = ''; aUI.prog = 1; renderAssist(root);
      try { await scanAssist(p => { aUI.prog = p; if (root.host.isConnected) renderAssist(root); }); }
      catch (err) { aUI.err = '掃描失敗：' + err.message; }
      aUI.busy = false;
      document.querySelectorAll('[data-mdcf="assist"]').forEach(h => renderAssist(h.shadowRoot));
    } else if (b.dataset.act === 'pick') {
      const nick = b.dataset.nick;
      if (await fillGameSearch(nick)) { aUI.note = `已帶入「${nick}」，請在下方遊戲名單按「選擇」。`; renderAssist(root); }
    }
  }

  /* ---------- 掛載（SPA 換頁時持續檢查） ---------- */
  let tick = 0;
  const check = () => { if (!tk.on) return; try { mountPlayers(); mountAssist(); } catch (e) {} };
  tk.onToggle(on => { if (on) check(); else document.querySelectorAll('[data-mdcf]').forEach(e => e.remove()); });
  new MutationObserver(() => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; check(); }); })
    .observe(document, { childList: true, subtree: true });
  check();
})();
