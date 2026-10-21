// ==UserScript==
// @name         我的同人｜工具箱
// @namespace    mydoujin-toolbox
// @version      1.1.0
// @description  戰報統計、戰報逐行播放、Boss 冷卻倒數、角色查詢整合成一個插件；左下角圖示按鈕可查看所有功能並個別開關（立即生效）
// @match        https://mydoujin.online/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';
  if (window.__mdToolbox) return;
  const TK_VER = "1.1.0";
  window.__mdToolbox = TK_VER;
  const ICON = "data:image/webp;base64,UklGRrYOAABXRUJQVlA4WAoAAAAQAAAATwAATwAAQUxQSK4EAAABoHbbtilJHtG+iMyybbRt27Zt27Ztu7+VbbZt2zYSce85+0O8F/EybkTEBKAjjS/hQQZmR04xFukarD4GQPeXGXMCL4ZPx5jmF9tnHzMMz1ch3CklizHfkPz85g8pWcr/1oRLx2GLKLHMaoXfLQObjsdujKRErebDgTAp7V5RdeSrXevAelPcPgUshu0o41F8Es4CA4+cUNye9WYcMPaaD8nidqsv64H1Hv2HDLEoh60pWsvC4owHln3wfzIKWdw6LazphWZTjPHAkCt/p0YlO2Ltf2sRftTHFuKAHmd/QkZlZgf8V4tqy54o1WS8QZdjPiCDMrcoi1V+r4XK37dACTDG5BgPuN2fJ6OwyqIMBn5IqYHCn7eABQDjvAUc0P3AJWQQVl3cgA9qY+Qf+7pSp169DADn0PPk10mNrLEw0+UVxpqojM+99NkPP869escRwMGfkEFYc2EWC4ugKnO/nDqVjJEFFgWHBQwFkCKqKiGSFGGhHTC5oHwJUVlXHvd0UAd2wF0N50zGhmKxjWpDMRjxP7WRAE2vUxqKxfTG4nFCizBJU5DDNm3UJATeFmFM308ZmaJqD8C4mozHPYxMUsIbN64EWFuDx8ExaBLCp8nWcZsCriqLDf9UZYoif6wYA9n+5IrwJs/aPm8xMsnIa0EyCn/ZFy7P4ywGJqn6Qz9DkhoYL4I3GcZ0+UgljcDb4CpIjbwUPsNhLwqTFPl3VTjJoAYeCZ81jiGNwIeNQw5VWreCA6wZ/aNKGgxrw0I0i5Hv9TIGHkczMkll22gYUHIYeRecMc1vUJJZBgavUXI0tm2KJuxDYTJjYbBVS9AsRk6AL81mSKZ9GRjgboYc1f9XMeu3iKZlBn7KkMXI23EnA5NpGQPrHNb4jjFL9O3RP6im07qcA+CwxV8MGcq/n4tMVvlvX/RdD/DY/GuGisSVP+35yDstABzGLqBIhiREKkkFAI+ut5OxInENkgELHPE7G2SGKZUwZEK7NArrAKywwWZvUBqDB5a5YtH3DGU2RGsw/Ma/SIqyMQJHfE7GKFohMb0BT5FBmS2kJvcOozC3zFdvZvqRuVrmuyPwESUhlaDtmiVlcuEwmL00aiISg7JSJYqS/PnGZliHu1hOQ0nq5+N3e+1/JSnl189bAXAwtvubDCkIP3joxE2HAX7U9vuecsQ2KzYBzhprLFb4hKH+Aqd1BgDnkO+9BwBrMXIeo9aZ8LuR8N5bAMY675yxDug2bPnOsBadblVqXan8ty2aUL0DRt/w2qc/Prsamhywzx+qdaX/XWBhq3IYcsUfrPx0BLquecITf7OuKmf2gcszJez2KRmiaJmv3vXK30ww8IUhsDkOB7WzrKxUkoyxbkRyWOZL/eEyHI5tlchcCVFZrxpIzWHg0i7GAHDYOqow0Z9+YcxhmU94bwBTeomRKSrfOGOlzf9jzGHgJfDwOJrCNPStdYEdvmPQLIpsC2OantGQBpXtl5WwzHNk0IzIdwY4rPaXaiIU4cQ+6Hf7r2QMSjLwSo8TGZisBi4dDqx8578ko6jKW8bMYEyHDHx7DQDLXDD3Z5LCxWj+mJISA3/Z2ZUArHrCuM/bXl4fVlA4IOIJAACQKQCdASpQAFAAPj0YiUMiIaEYWnaoIAPEtgBlc4ADJ+A8zauv4HerSjwq/z5vUfM7+zP7Ae9b+IHvC9AD+gf47rIvQA/ZL04PZD/dP0ls0Y/gH4Z+BX9o8FfE57Kzgsg9aT79/quLHeP/znuYPBZAJ+f/1P/Ucbv129Fn9C/0v5i83N4b7AH8f/qX/M9lv+n/5v3Te4/83/vX/K/w35CfYL/JP6D/sf8B/jP/H/nf/////uy9g/7c+x1+qrn/+Yi+j9IAEQTIxcYcpAnyj1/bej6ZMGi0BcQAI27t71VhY8t1VAUfI9o+EX5e0yPe5/D518e+FtktAhyvMkULZ3KAMqR9S9v19XZUXgNqeHFTxQY5NOsDnRlhQPRYS7jspDvSs81pihJ8cv1K+LPLtF+B7ff/yd59syTQcahYCiPsXjN4/kJNUfDy7HFh7V3aWJzOiIxDwAD+/2AeF2cdyJ+mulI1MrT1GnHmxcVdbkybFZrKimMS2ijG76cCKNypfCBa6pey6FPxqCC4By7Rxst/1AM8YV58C4uASo9XodRt4f4rwVKtGubpSlEe2MMy7YHfD/SfzaZ/bu98VZ68OAPzZPgsX8cDGEjw2saafQPgM+9X/e6aeBhAF5Aw/PoihnCnDw+w79vllaoe8vLXH3j54lGG3tvLdxeUBtkVjGED+dYXhuV++kf3Q6oX/wrEyT7AqDvUcZYQCNrCGp0wx87QP9QmhpdUXFkgnMYFJTNd7XqXv9YuBlyWOf/SWXb113/YwhdxZCLe/SD+Ow8n+bhoW9hWNcsq/9vgTYahTWSEAmM//NsUtTvMendPZpIm9E65K0iJWn7KkvsdRTQ+EWNVWmfVA6pk/TcXcQP1FSoXydiWI2G7/usv8/1fuvrVwJEb/8QHs0xhWM1INpbhxWYB7nfQ/M2xPBLawCziHT/ZAo1ptN+IUhF6ncXj9vqArvjIxW4bI4zwZgH7GvvjwHPBz7t7ccnyGRXdBb0Mwc1t9HkFQvUbtVU42DMtwZTAqgNIZhR2W8u1pUgHXV/az6rraiFBb5ua2e5TdgEecP8qerbvM/RophSUMQj2kNghRrNeDCCDu7hSXl9xWr8v7KYBMC2w+8xvGb5LwXIsJ1OlNX+MRF+aFBWydKmT6ORJHPIfRVNfgt9W0nwq5Bt2VpAOemZ+3nprwKdIpsPlVivBS/p0LdeZByaXe6xn9GY5pDj7DJUtYkT2hRHugOSXKdSF2kLOyw7I7rtJ/qxC02YUbXGBVJxlXv4o87Kf5jYDe3ydlGXbixvGGWN4FmoSAusGEoP3ZVd4BzpQKCyXwjFGSAA7AKdHu1w4HQ249tby48rtVoGm9beKGl/l1nQOtz7/0EVmLgqPwVtswbprYOYZEyo2vRHgrQIFFZe/Vua2fbBM8R7tJJIzd4jWlWZ4IjGupzy1o/Tb111zsCXz7l6Uhgl+w75A1aju0iO/ML6DuTzU2ivEcSzuGMSfwn5udlcqAVNF2km7mg9+4GmTPvJn9pZBL9m8UaIcP/Mp/IvsFJRYtZqvdbx7YdsQVb/a1JTMKiOAq/uV//EGUSwuUfzpT/SKv908Q2XMQxcccAENRR7FfJozJBmiy4qzbGp7X7P5gz+oyjqHxN6M2iWOVi86Q7l7teB0SwVybIda/bwmYAU6izbxYJs5yU3avT0S1iOFP+d7fNNnCmqhiqradR8rM3IKetAskgMgptCt3Kl6S2TGZ8RpDeMwOVmA7GFfiEls6+fuEfjLeIy4AXd/0BL+nEapfnFxvdqIhqJf/15xAMV992ZWn//y5dX5x35+Zro0IAVkOgW/8HP9E4H9cjrhuP74by+XOmSnwHokIM0vwvxpav+hDp0kQI2qSmeJWLlzCcGFDw1ANfzKrvL/ju1FAl04+ae41WdJ743Q9E32ns8idMVapcQe9ytJLdGb8naA8dHofv/l8CgI3pKZ5Xo52B5Vec/Z+3rcAxoBleINY5YRQqTFe6ygPpom5Ck171bLIMQaOUO7wzMEIgu/Gf5+YbXK+WQFdpOEU4dTkCgltRBK8O6ezxu6Cha1Ja7MPu2Oo6oo+83uLh/WBBBNq1C+2gdpKHpVFHEXoF3jaZxaNjX4aP2O2UpdvD7vD8JUBc3Nv8E9tcoJ2P6B4ciRT72fpjG03rwxedPk77d4AcT410TExwsUsZnPFrUQjCy+n/+l+w1z23mQXH3RugnP/uy21D59d1pdZN7a/VUhueiibHiLDrEpk+OleoiMfRz7BbKLirFe3UYek2LXS/ICI4xHinY6hBqKs4QiarQ2O8X8BUfjAaqOv0KIJvY230YyAUB793We1sSE2v9niSkMrXQPe8KlCpC899YlcAw54Um7YQJbo+1U55gbPLSBIU8xPLoVNeHvfLlVbyA3L0vrBivOLGIN+vfR5//sq0E5ybWZczaY4ecWKUFCwCGUHfF7/oY9jwclgD5y9TuS3Cl5GvwCLHez/uYfv3C4Lv5B/zhBJ+duo71Rry60yNMnvREQp8KrLumxEesmvsMt3m3k486ZDIp0y46JF1d/345Cumm+7AuExS51vNyD/byIpv3bpN/LTarhCKco9ZCZD+0lq+HcWRwZhIl559tJPT8qrH/yHHk/uGrWkzWH+YC3+EB3/+PuQ4KsqM6F/7r/N0G7ZMYLggOIOg/JU7beo+VymRYodgQvPYKg9Hh0keUKZqN27sX0sC7598Itf4yGNZRIy4Y+JqV63cO/u8R00osrtSWLgUpVHRgNW5sxpooZpzsdaf0reL17OMMWpHFjrYM6+vaBYqSOxkg2AhCHoAba2vy2setHFJ+gJVzx5g02gdyGeeJlQFoQiSKX6MkHBO7eQb59S/Fu2q5ZIkPE8iYqoHgXDxvEdA5wQ95kHOYlaEFzxIw9t17n5+D72dxkBJxv3hxBRf7mxs+polq9gcF8J3OFhFmEv0+WRVMfveoUVfNhYB9vXskkGIrhFvA27cPzdxhJbfphbaeLY19mFbVxGrdxXoVJ9g1XxLvSpJU0GZkFGIOvtPqCGjJ03WbvE4s5f4xZeUnBLCH+ImJzRElbfDQoUr4JgrNRiNZlgdqHwewaaK62rFuc2qs1ch7p0XtTWRbWoDQ0lgdCZJFW0VjgvVxzPoA++/TkWRZuHGTmXZUnm+WRUxBTK+u/ICskzOY2viS2Rig6sM4hw4eh1D4Ut+R84sJsXvMy60zc/w982gLjDmVARq/s7zPUXQ612R8nspXASXXq+s2uOvGNub/ekmz3tJBjY2LDZWa0OS2n9jclU5/cadtyFm82EJ+J3CGkPMBRX7ao7ksZZtuD3wTPouV24zdeFWTIJEZubnYwIRQQUeofXVhGdR2/6aYzbND2PLKbAAAA";
  const OFF_KEY = 'mdtk:off';
  const readOff = () => { try { const v = JSON.parse(localStorage.getItem(OFF_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const writeOff = v => { try { localStorage.setItem(OFF_KEY, JSON.stringify(v)); } catch (e) {  } };
  const MODS = [
    Object.assign({"id": "stats", "icon": "📊", "name": "戰報統計", "desc": "戰報頁右下角的統計面板：傷害、承傷、回血、爆擊率、MVP。", "feats": ["玩家與 BOSS 的造成／幸運／總計傷害、承受傷害、回血、回 SP、爆擊率", "頂部摘要：我方總傷害、MVP、最佳坦克、最佳奶媽", "MVP 權重：輸出×1 > 補隊友×0.5 > 承傷×0.25 = 回SP×0.25 > 自回×0.1", "簡易／詳細切換；顯示全部／玩家／BOSS；⤢ 自動縮放成一個視窗", "燒掉的生命上限、特殊迴避、中毒／出血／凍傷等異常狀態與反傷", "西米專屬：番茄湯、臭臭茶、回收桶紀錄", "手機直拿自動改成底部抽屜＋角色卡片"], "ver": "1.20.1", "at": "start"}, { run: function (TK) {
// ===== 戰報統計 1.20.1（mydoujin_戰報統計.user.js）=====
(function () {
  'use strict';
  const tk = (typeof TK === 'object' && TK) || { on: true, onToggle() {} };
  const API = 'https://mydoujin-backend.onrender.com';
  const cache = new Map();
  const errors = {};
  const pending = new Set();
  let currentId = null;
  let host = null, root = null;
  let statusText = '';
  const state = {
    mode: 'shown',
    collapsed: load('collapsed', false),
    fit: load('fit', true),
    sideView: 'all',
    view: load('view', 'detail'),
    hidden: false,
    pos: load('pos', null),
    open: {},
  };
  function load(k, d) { try { const v = localStorage.getItem('mdbs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('mdbs:' + k, JSON.stringify(v)); } catch (e) {} }
  const origFetch = window.fetch;
  if (origFetch && !origFetch.__mdbs) {
    const wrapped = function (input) {
      const p = origFetch.apply(this, arguments);
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const m = url.match(/\/api\/battle-reports\/(\d+)(?:[?#]|$)/);
        if (m) {
          p.then(res => {
            if (!res.ok) return;
            res.clone().json().then(d => {
              if (d && Array.isArray(d.logs)) { cache.set(m[1], d); if (m[1] === currentId) render(); }
            }).catch(() => {});
          }).catch(() => {});
        }
      } catch (e) {}
      return p;
    };
    wrapped.__mdbs = true;
    window.fetch = wrapped;
  }
  function ensureData(id, force) {
    if (!force && cache.has(id)) return;
    setTimeout(async () => {
      if (!force && (cache.has(id) || pending.has(id))) return;
      let token = null;
      try { token = localStorage.getItem('token'); } catch (e) {}
      if (!token) { errors[id] = '尚未登入，無法讀取戰報'; render(); return; }
      pending.add(id); delete errors[id]; statusText = '讀取中…'; render();
      try {
        const r = await origFetch.call(window, API + '/api/battle-reports/' + id, { headers: { Authorization: 'Bearer ' + token } });
        const d = await r.json();
        if (d && Array.isArray(d.logs)) cache.set(id, d);
        else errors[id] = (d && d.error) || ('讀取失敗（HTTP ' + r.status + '）');
      } catch (e) {
        errors[id] = '連線失敗：' + e.message;
      } finally {
        pending.delete(id); statusText = ''; render();
      }
    }, force ? 0 : 1500);
  }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function newUnit(p, side) {
    return {
      id: p.userId || p.entityId || p._id || p.name,
      side,
      name: p.characterName || p.name || '?',
      names: [p.characterName, p.name].filter(Boolean),
      sub: p.characterName ? p.name : (p.title || ''),
      isAssist: !!p.isAssist,
      maxHpStat: p.stats && p.stats.hp,
      luk: p.stats && p.stats.luk != null ? Number(p.stats.luk) : null,
      stats: p.stats || null,
      isBoss: !!(p.entityId || p.monsterId),
      floor: p.floor != null ? p.floor : null,
      mlevel: p.level != null ? p.level : null,
      dealt: { real: 0, shown: 0 },
      taken: { real: 0, shown: 0 },
      byKind: { normal: { real: 0, shown: 0, n: 0 }, skill: { real: 0, shown: 0, n: 0 }, counter: { real: 0, shown: 0, n: 0 }, dot: { real: 0, shown: 0, n: 0 }, passive: { real: 0, shown: 0, n: 0 }, fart: { real: 0, shown: 0, n: 0 } },
      simmer: null,
      luck: 0, luckN: 0, luckTaken: 0, luckTakenN: 0,
      heal: 0, healTeam: 0, healSolo: 0, selfHeal: {}, healRecv: 0, sp: 0, spRecv: 0,
      crit: 0, hitN: 0, blockedN: 0, maxHit: 0, missN: 0, dodgeN: 0,
      hpLeft: null, hpMax: null, dead: false,
      burn: 0, burnN: 0,
      attackedN: 0, specialN: 0, special: {},
      dot: {}, dotTaken: {},
      passiveDot: {}, passiveTaken: {},
      isSummon: false, ownerId: null, ownerName: '', summonSkill: '', summonN: 0, summons: [],
    };
  }
  const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const NORMAL_DODGE_WORDS = '(?:用翻滾)?';
  function isNormalDodge(msg, t) {
    const names = t && t.names && t.names.length ? t.names : null;
    if (!names) return new RegExp('被\\s*\\S+\\s*' + NORMAL_DODGE_WORDS + '(躲開|閃開|閃過|避開)了').test(msg);
    return names.some(n => new RegExp('被\\s*' + escRe(n) + '\\s*' + NORMAL_DODGE_WORDS + '(躲開|閃開|閃過|避開)了').test(msg));
  }
  function specialKey(msg, t) {
    let s = String(msg);
    const k = s.lastIndexOf('但是');
    if (k >= 0) s = s.slice(k + 2);
    (t.names || []).forEach(n => { s = s.split(n).join('〈T〉'); });
    return s.replace(/\d+/g, '#').trim();
  }
  const TEAM_HEAL_SKILLS = ['sylphy_healing', 'sylphy_chantless_healing', 'simmer_cook', 'simmer_recycle_bin'];
  const TEAM_HEAL_MSG = /治癒之鎖|治癒魔術|小黃金樹|緊急包紮|番茄湯/;
  function analyze(rep) {
    const P = rep.participants || {};
    const units = [];
    const byId = new Map();
    (P.players || []).forEach(p => { const u = newUnit(p, 'A'); units.push(u); byId.set(u.id, u); });
    (P.enemies || []).forEach(p => { const u = newUnit(p, 'B'); units.push(u); byId.set(u.id, u); });
    const get = id => {
      if (!id) return null;
      let u = byId.get(id);
      if (!u) { u = newUnit({ name: String(id) }, 'C'); units.push(u); byId.set(id, u); }
      return u;
    };
    const logs = rep.logs || [];
    logs.forEach(l => {
      if (!l || l.type !== 'SUMMON' || !l.targetId) return;
      const owner = byId.get(l.actorId);
      const mn = String(l.message || '').match(/^\s*(\S+?)\s/);
      const nm = (mn && mn[1]) || ((owner ? owner.name : '') + '的分身') || String(l.targetId);
      let u = byId.get(l.targetId);
      if (!u) { u = newUnit({ name: nm }, owner ? owner.side : 'C'); u.id = l.targetId; units.push(u); byId.set(l.targetId, u); }
      u.name = nm; u.names = [nm];
      if (owner) u.side = owner.side;
      u.isSummon = true;
      u.ownerId = l.actorId;
      u.ownerName = owner ? owner.name : '';
      u.summonSkill = l.skillId || '';
      u.sub = l.skillId || '召喚物';
      if (owner && u.luk == null) u.luk = owner.luk;
      if (owner && owner.summons.indexOf(u) < 0) owner.summons.push(u);
    });
    const buffSrc = {};
    const applyLog = [];
    const prefixOwner = {};
    const lastDotSrc = {};
    let lastZoneEnd = '';
    const pending = {};
    const IGNORE_PREFIX = { basic: 1, imitated: 1, standard: 1 };
    const dotName = (l, msg) => {
      let m = msg.match(/在\s*(.+?)\s*中\s*(衰變)/); if (m) return m[1] + '・' + m[2];
      m = msg.match(/受到\s*(.+?)\s*影響/); if (m) return m[1];
      m = msg.match(/(中毒|燃燒|流血|出血|凍傷|灼燒)/); if (m) return m[1];
      return l.buffId || '持續傷害';
    };
    const dotSource = (l, name, victim) => {
      const bs = buffSrc[victim.id];
      if (l.buffId && bs && bs[l.buffId]) return get(bs[l.buffId]);
      const key = name.split('・').pop();
      for (let k = applyLog.length - 1; k >= 0; k--) {
        const x = applyLog[k];
        if (x.victim === victim.id && key && x.msg.includes(key)) return get(x.actor);
      }
      if (l.buffId) { const o = prefixOwner[l.buffId.split('_')[0]]; if (o && o.side !== victim.side) return o; }
      const opp = units.filter(x => x.side !== victim.side && x.side !== 'C');
      return opp.length === 1 ? opp[0] : null;
    };
    const dotSlot = (obj, name) => (obj[name] = obj[name] || { dmg: 0, n: 0, restore: 0, rn: 0 });
    const STATUS_PATTERNS = [
      { re: /積累的傷口一齊裂開|血如泉湧|流血|出血/, name: '出血' },
      { re: /霜華自骨縫裡炸開|凍傷|凍結|冰封/, name: '凍傷' },
      { re: /中毒|毒發|毒性發作/, name: '中毒' },
      { re: /燃燒|灼燒|焚身/, name: '燒傷' },
      { re: /酸蝕/, name: '酸蝕' },
      { re: /衰變/, name: '衰變' },
    ];
    const statusDamage = (l, msg) => {
      if (l.skillId || l.isNormalAttack || l.isCounter) return null;
      const src = String(l.source || '');
      if (src === 'REFLECTION') return { kind: 'passive', name: '反傷' };
      for (let i = 0; i < STATUS_PATTERNS.length; i++) {
        if (STATUS_PATTERNS[i].re.test(msg)) return { kind: 'dot', name: STATUS_PATTERNS[i].name };
      }
      if (src === 'DIRECT' || l.passiveId) return { kind: 'dot', name: l.passiveId || '異常狀態' };
      return null;
    };
    const simOf = u => u.simmer || (u.simmer = { soupNow: 0, soupNowN: 0, soupTick: 0, soupTickN: 0, soupAfterDeath: 0, soupBy: {}, fart: 0, fartN: 0, fartBy: {}, bin: [], binHeal: 0 });
    const lastDish = {};
    const soupOwner = {};
    let simmerUnit = null;
    const CRITABLE = { normal: 1, skill: 1, counter: 1 };
    const hit = (a, t, real, shown, kind, l) => {
      if (a) {
        a.dealt.real += real; a.dealt.shown += shown;
        const k = a.byKind[kind]; k.real += real; k.shown += shown; k.n++;
        if (CRITABLE[kind]) { a.hitN++; if (l.isCrit) a.crit++; }
        if (l.blocked || l.type === 'BLOCK') a.blockedN++;
        if (shown > a.maxHit) a.maxHit = shown;
      }
      if (t) { t.taken.real += real; t.taken.shown += shown; if (CRITABLE[kind]) t.attackedN++; }
    };
    logs.forEach((l, i) => {
      if (!l || typeof l !== 'object') return;
      const a = get(l.actorId), t = get(l.targetId);
      const v = num(l.value);
      if (a && l.skillId) { const pre = String(l.skillId).split('_')[0]; if (!IGNORE_PREFIX[pre] && !prefixOwner[pre]) prefixOwner[pre] = a; }
      if (a && l.skillId === 'simmer_cook') {
        simmerUnit = simmerUnit || a;
        const md = String(l.message || '').match(/把一盤\s*(.+?)\s*推到/);
        if (md && t) { lastDish[t.id] = md[1]; if (/番茄湯/.test(md[1])) soupOwner[t.id] = a; }
      }
      if (a && l.skillId === 'simmer_recycle_bin') {
        const sm = simOf(a);
        const msg = String(l.message || '');
        const mw = msg.match(/^\s*(.+?)\s*(?:被這一擊打進|從桶裡爬)/);
        const who = t ? t.name : (mw ? mw[1] : '');
        if (/打進了?回收桶/.test(msg)) sm.bin.push({ who, heal: null });
        else if (l.type === 'HEAL') {
          sm.binHeal += v;
          const open = [...sm.bin].reverse().filter(x => x.heal == null);
          const last = open.find(x => x.who === who) || open.find(x => !x.who || !who);
          if (last && !last.who) last.who = who;
          if (last) last.heal = v; else sm.bin.push({ who, heal: v });
        }
      }
      switch (l.type) {
        case 'SKILL_TEXT': {
          const mz = String(l.message || '').match(/([^\s，。！」]+?)(?:散去了|消散了)/);
          if (mz) lastZoneEnd = mz[1];
          break;
        }
        case 'BUFF_APPLY':
          if (a && t && a.side !== t.side) {
            (buffSrc[t.id] = buffSrc[t.id] || {})[l.buffId || ''] = a.id;
            applyLog.push({ victim: t.id, actor: a.id, msg: String(l.message || '') });
          }
          break;
        case 'BUFF_EFFECT': {
          const msg = String(l.message || '');
          if (!a || !v) break;
          if (l.buffId === 'simmer_dish_tomato_soup' || (/番茄湯/.test(msg) && /恢復|回復/.test(msg))) {
            a.healRecv += v;
            const cook = soupOwner[a.id] || simmerUnit;
            if (cook) {
              cook.heal += v;
              cook.healTeam += v;
              const sm = simOf(cook); sm.soupTick += v; sm.soupTickN++;
              if (cook.dead) sm.soupAfterDeath += v;
              const b = (sm.soupBy[a.name] = sm.soupBy[a.name] || { now: 0, tick: 0, n: 0 }); b.tick += v; b.n++;
            }
            break;
          }
          if (/恢復|回復/.test(msg) && !/傷害|失去/.test(msg)) { a.healRecv += v; break; }
          const name = dotName(l, msg);
          const src = dotSource(l, name, a);
          if (src) {
            src.dealt.real += v; src.dealt.shown += v;
            src.byKind.dot.real += v; src.byKind.dot.shown += v; src.byKind.dot.n++;
            const d = dotSlot(src.dot, name); d.dmg += v; d.n++;
          }
          a.taken.real += v; a.taken.shown += v;
          const dt = dotSlot(a.dotTaken, name); dt.dmg += v; dt.n++;
          lastDotSrc[a.id + '|' + name] = src;
          if (name.includes('衰變')) { const pd = (pending[a.id] = pending[a.id] || {}); pd[name] = (pd[name] || 0) + v; }
          break;
        }
        case 'DAMAGE':
        case 'BLOCK': {
          const real = l.actualDamage != null ? num(l.actualDamage) : v;
          if (l.source === 'SIMMER_FART' || l.passiveId === 'simmer_fart') {
            hit(a, t, real, v, 'fart', l);
            if (a) {
              const sm = simOf(a); sm.fart += real; sm.fartN++;
              const me = String(l.message || '').match(/^\s*(.+?)\s*挨了這一下/);
              const who = me ? me[1] : '？';
              const b = (sm.fartBy[who] = sm.fartBy[who] || { dmg: 0, n: 0 }); b.dmg += real; b.n++;
            }
            break;
          }
          const st = statusDamage(l, String(l.message || ''));
          if (st) {
            hit(a, t, real, v, st.kind, l);
            const mine = st.kind === 'passive' ? 'passiveDot' : 'dot';
            const his = st.kind === 'passive' ? 'passiveTaken' : 'dotTaken';
            if (a) { const d = dotSlot(a[mine], st.name); d.dmg += real; d.n++; }
            if (t) { const dt = dotSlot(t[his], st.name); dt.dmg += real; dt.n++; }
            break;
          }
          const kind = l.isCounter ? 'counter' : (l.isNormalAttack ? 'normal' : 'skill');
          hit(a, t, real, v, kind, l);
          break;
        }
        case 'COUNTER': {
          if (l.value == null) break;
          let dup = false;
          for (let j = i + 1; j < Math.min(logs.length, i + 6); j++) {
            const x = logs[j];
            if (x && (x.type === 'DAMAGE' || x.type === 'BLOCK') && x.isCounter && (num(x.value) === v || x.actorId === l.actorId)) { dup = true; break; }
          }
          if (!dup) hit(a, t, v, v, 'counter', l);
          break;
        }
        case 'LUCK_EVENT': {
          const src = get(l.opponentId);
          if (src) { src.luck += v; src.luckN++; }
          if (t) { t.luckTaken += v; t.luckTakenN++; t.taken.real += v; t.taken.shown += v; }
          break;
        }
        case 'HEAL': {
          const msg = String(l.message || '');
          if (!l.skillId && /離開毒氣|衰變的傷勢/.test(msg)) {
            const victim = t || a;
            if (!victim) break;
            victim.healRecv += v;
            const pd = pending[victim.id] || {};
            let zones = Object.keys(pd).filter(n => pd[n] > 0);
            if (!zones.length) {
              const keys = Object.keys(victim.dotTaken);
              zones = [(lastZoneEnd && keys.find(n => n === lastZoneEnd + '・衰變')) || keys.find(n => n.includes('衰變')) || '衰變'];
              pd[zones[0]] = 0;
            }
            const tot = zones.reduce((s2, n) => s2 + pd[n], 0);
            const theory = Math.floor(tot / 2);
            let leftV = v, leftT = theory;
            zones.sort((x, y) => pd[y] - pd[x]).forEach((n, k) => {
              const last = k === zones.length - 1;
              const share = last ? leftV : (tot ? Math.round(v * pd[n] / tot) : 0);
              const shareT = last ? leftT : (tot ? Math.round(theory * pd[n] / tot) : 0);
              leftV -= share; leftT -= shareT;
              const dt = dotSlot(victim.dotTaken, n); dt.restore += share; dt.rn++; dt.theory = (dt.theory || 0) + Math.max(shareT, share);
              const src = lastDotSrc[victim.id + '|' + n];
              if (src) { const d = dotSlot(src.dot, n); d.restore += share; d.rn++; d.theory = (d.theory || 0) + Math.max(shareT, share); }
            });
            pending[victim.id] = {};
            break;
          }
          if (a) { a.heal += v; if (t && t !== a) a.healTeam += v; else { const k = TEAM_HEAL_MSG.test(String(l.message || '')) ? 'msg:team' : (l.skillId || l.passiveId || 'msg:'); a.selfHeal[k] = (a.selfHeal[k] || 0) + v; } }
          if (t) t.healRecv += v;
          if (a && t && l.skillId === 'simmer_cook' && /番茄湯/.test(lastDish[t.id] || '')) {
            const sm = simOf(a); sm.soupNow += v; sm.soupNowN++;
            const b = (sm.soupBy[t.name] = sm.soupBy[t.name] || { now: 0, tick: 0, n: 0 }); b.now += v;
          }
          break;
        }
        case 'SP_RECOVER':
          if (a) a.sp += v;
          if (t) t.spRecv += v;
          break;
        case 'TEXT': {
          const msg = String(l.message || '');
          const ms = msg.match(/恢復了\s*(\d+)\s*SP/);
          if (ms && a) { a.sp += num(ms[1]); a.spRecv += num(ms[1]); }
          const mh = msg.match(/恢復了\s*(\d+)\s*HP/);
          if (mh && a) { a.heal += num(mh[1]); const k = TEAM_HEAL_MSG.test(msg) ? 'msg:team' : (l.skillId || l.passiveId || 'msg:'); a.selfHeal[k] = (a.selfHeal[k] || 0) + num(mh[1]); a.healRecv += num(mh[1]); }
          const mb = msg.match(/(?:燃燒掉|燒掉|減少|失去|扣除)了?\s*(\d+)\s*點?生命上限/);
          if (mb && a) { a.burn += num(mb[1]); a.burnN++; }
          break;
        }
        case 'MISS': {
          if (a) a.missN++;
          if (t) {
            t.attackedN++;
            const msg = String(l.message || '');
            if (isNormalDodge(msg, t)) t.dodgeN++;
            else { t.specialN++; const key = specialKey(msg, t); t.special[key] = (t.special[key] || 0) + 1; }
          }
          break;
        }
        case 'SUMMON':
          if (a) a.summonN++;
          break;
        case 'DEATH':
          if (a) a.dead = true;
          break;
        case 'HP_REMAINING':
          if (a) { a.hpLeft = v; a.hpMax = l.maxHp != null ? num(l.maxHp) : null; }
          break;
      }
    });
    const teamSkills = new Set(TEAM_HEAL_SKILLS);
    logs.forEach(l => { if (l && l.type === 'HEAL' && l.targetId && l.actorId !== l.targetId && (l.skillId || l.passiveId)) teamSkills.add(l.skillId || l.passiveId); });
    teamSkills.add('msg:team');
    units.forEach(u => Object.entries(u.selfHeal).forEach(([k, v]) => { if (teamSkills.has(k)) u.healTeam += v; else u.healSolo += v; }));
    return units;
  }
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RESULT = { WIN: '勝利', LOSE: '敗北', DRAW: '平手' };
  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .panel { position: fixed; z-index: 2147483000; width: 940px; max-width: calc(100vw - 32px); max-height: calc(100vh - 24px);
    display: flex; flex-direction: column; background: linear-gradient(180deg,#1a2030 0%,#151a25 100%); color: rgba(255,255,255,.88);
    border: 1px solid #34405a; border-radius: 14px;
    box-shadow: 0 18px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(79,209,197,.06) inset; font: 14px/1.5 "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; overflow: hidden; }
  .panel.simple { width: 640px; }
  .hd { display: flex; align-items: center; gap: 10px; padding: 10px 12px 10px 14px; background: linear-gradient(180deg,#222b3d,#1a2131);
    border-bottom: 1px solid #2d3748; cursor: move; user-select: none; position: relative; }
  .hd::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg,#4FD1C5,#2c7a7b); }
  .chip { display: inline-flex; align-items: center; font-size: 11.5px; line-height: 1; padding: 4px 8px; border-radius: 999px;
    background: rgba(255,255,255,.06); color: #a8b4c8; border: 1px solid rgba(255,255,255,.08); white-space: nowrap; }
  .chip.win { background: rgba(72,187,120,.16); color: #8ee6ad; border-color: rgba(72,187,120,.45); font-weight: 700; }
  .chip.lose { background: rgba(245,101,101,.14); color: #fca5a5; border-color: rgba(245,101,101,.45); font-weight: 700; }
  .chip.draw { background: rgba(160,174,192,.14); color: #e2e8f0; border-color: rgba(160,174,192,.4); font-weight: 700; }
  .chips { display: flex; gap: 5px; align-items: center; min-width: 0; overflow: hidden; }
  .seg { display: inline-flex; padding: 2px; gap: 2px; background: #10141d; border: 1px solid #34405a; border-radius: 8px; }
  .seg button { border: none; background: transparent; color: #8b98ad; padding: 4px 10px; border-radius: 6px; font-size: 12px; }
  .seg button:hover { background: rgba(255,255,255,.05); color: #e2e8f0; }
  .seg button.on { background: linear-gradient(180deg,#2c9a92,#2c7a7b); color: #fff; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,.35); }
  .tb { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 10px; flex-wrap: wrap; }
  .tb .lb { color: #8b98ad; font-size: 12px; margin-right: 6px; }
  .tb .seg button { padding: 3px 10px; }
  .tb .seg button i { font-style: normal; color: #6b7a92; font-size: 11px; margin-left: 3px; }
  .tb .seg button.on i { color: rgba(255,255,255,.75); }
  .fitb { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #a8b4c8; background: #10141d; border: 1px solid #34405a; border-radius: 8px; padding: 4px 10px; }
  .fitb.on { color: #4FD1C5; border-color: rgba(79,209,197,.55); }
  .fitb b { font-variant-numeric: tabular-nums; color: inherit; }
  .panel.dense th, .panel.dense td { padding-top: 4px; padding-bottom: 4px; }
  .panel.dense .bar { margin-top: 2px; }
  .panel.dense .sumbar { margin-bottom: 10px; }
  .panel.dense .tile { padding: 3px 8px 4px; }
  .panel.dense .side { margin-bottom: 10px; }
  .panel.dense .nm small { display: inline; margin-left: 8px; }
  .playing { padding: 28px 12px 30px; text-align: center; color: #a8b4c8; }
  .playing .pi { font-size: 30px; animation: mdbsPulse 1.6s ease-in-out infinite; }
  .playing .pt { margin-top: 6px; font-size: 15px; font-weight: 700; color: #e2e8f0; }
  .playing .pt b { margin-left: 8px; color: #4FD1C5; font-variant-numeric: tabular-nums; }
  .playing .ps { margin-top: 4px; font-size: 12.5px; }
  .chip.play { background: rgba(79,209,197,.12); color: #81e6d9; border-color: rgba(79,209,197,.4); }
  @keyframes mdbsPulse { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
  .sumbar { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px; margin: 0 0 10px; }
  .tile { background: linear-gradient(180deg,#212a3b,#1b2232); border: 1px solid #2d3748; border-radius: 8px; padding: 4px 9px 5px; min-width: 0; }
  .tile .top { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; min-width: 0; }
  .tile .lb { color: #8b98ad; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .tile .v { color: #fff; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.3; flex: none; }
  .tile .who { color: #cbd5e0; font-size: 11.5px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tile.t-dmg .v { color: #4FD1C5; } .tile.t-take .v { color: #f6878b; } .tile.t-heal .v { color: #7bd5a6; } .tile.t-mvp .v { color: #f6e05e; }
  .rk { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; font-size: 11px; font-weight: 800;
    margin-right: 7px; background: #2a3346; color: #a0aec0; vertical-align: 1px; flex: none; }
  .rk.r1 { background: linear-gradient(180deg,#f6e05e,#d69e2e); color: #3b2a05; }
  .rk.r2 { background: linear-gradient(180deg,#e2e8f0,#a0aec0); color: #1a202c; }
  .rk.r3 { background: linear-gradient(180deg,#f6ad55,#c05621); color: #2d1606; }
  .side.sB .bar i { background: linear-gradient(90deg,#9b2c2c,#f56565); }
  .side.sB .bar { background: rgba(245,101,101,.13); }
  .side.sB .c-tot, .side.sB .c-big b { color: #fc8181; }
  .side-hd .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4FD1C5; margin-right: 7px; vertical-align: 1px; box-shadow: 0 0 6px rgba(79,209,197,.6); }
  .side.sB .side-hd .dot { background: #f56565; box-shadow: 0 0 6px rgba(245,101,101,.6); }
  .side.sC .side-hd .dot { background: #a0aec0; box-shadow: none; }
  table.simple td.nm { min-width: 0; }
  table.simple .bar { height: 6px; }
  .sm-line { display: flex; gap: 12px; margin-top: 6px; font-size: 12.5px; color: #8b98ad; }
  .sm-line b { font-variant-numeric: tabular-nums; margin-left: 3px; }
  .card.simple { cursor: default; padding: 9px 11px; }
  .card.simple .bar { margin: 6px 0 0; }
  @media (max-width: 760px) { .sumbar { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  .ttlw { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 10px; }
  .ttl { font-weight: 700; color: #fff; white-space: nowrap; letter-spacing: .5px; }
  .sub { color: #8b98ad; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .tools { display: flex; gap: 4px; flex-shrink: 0; align-items: center; }
  button { font: inherit; font-size: 12px; color: #e2e8f0; background: #263042; border: 1px solid #3a4558; border-radius: 6px; padding: 4px 10px; cursor: pointer; white-space: nowrap; }
  button:hover { background: #33405a; }
  button.on { border-color: #4FD1C5; color: #4FD1C5; }
  button.ib { width: 30px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; line-height: 1; }
  .panel.col { width: auto; min-width: 240px; }
  .panel.col .hd { border-bottom: none; }
  .bd { overflow: auto; padding: 10px 12px 14px; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .side { margin-bottom: 14px; }
  .side-hd { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-weight: 700; color: #e9eef6; margin: 2px 2px 7px; font-size: 14.5px; }
  .side-hd span { font-weight: 400; color: #8b98ad; font-size: 12px; text-align: right; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #2d3748; border-radius: 8px; overflow: hidden; }
  th, td { padding: 7px 9px; border-bottom: 1px solid rgba(255,255,255,.06); white-space: nowrap; }
  th { font-size: 12px; font-weight: 600; color: #8b98ad; text-align: right; background: #1d2433; position: sticky; top: 0; letter-spacing: .3px; }
  tbody tr.u:nth-of-type(even) td { background: rgba(255,255,255,.015); }
  th:first-child, td:first-child { text-align: left; }
  td { text-align: right; font-variant-numeric: tabular-nums; }
  tr.u { cursor: pointer; }
  tr.u:hover td, tr.u.open td { background: rgba(79,209,197,.05); }
  .arw { color: #4FD1C5; font-size: 11px; margin-right: 5px; }
  .nm { color: #fff; font-weight: 600; min-width: 200px; }
  .nm small { display: block; font-weight: 400; color: #8b98ad; font-size: 12px; margin-left: 16px; }
  tr.u.hasbst > td { border-bottom: none; padding-bottom: 2px; }
  tr.bst { cursor: pointer; }
  tr.bst td { padding: 0 9px 7px 25px; text-align: left; white-space: normal; font-weight: 400; color: #8b98ad; font-size: 12px; }
  .tag { display: inline-block; font-size: 11px; padding: 0 6px; margin-left: 4px; border: 1px solid; border-radius: 999px; vertical-align: 1px; font-weight: 400; line-height: 1.6; }
  .tag.dead { color: #f6878b; border-color: #f6878b; }
  .tag.ast { color: #90cdf4; border-color: #90cdf4; }
  .tag.burn { color: #f6ad55; border-color: #f6ad55; }
  .tag.spx { color: #cbd5e0; border-color: #a0aec0; }
  .tag.dot { color: #9ae6b4; border-color: #68d391; }
  .tag.pas { color: #90cdf4; border-color: #63b3ed; }
  .tag.sum { color: #d6bcfa; border-color: #b794f4; }
  .tag.soup { color: #feb2b2; border-color: #fc8181; }
  .tag.fart { color: #c6f6d5; border-color: #48bb78; background: rgba(72,187,120,.12); }
  .spl .ad { color: #feb2b2; }
  .spl .dotl b { color: #9ae6b4; }
  .spl .rst b { color: #7bd5a6; }
  .spl { margin-top: 9px; padding-top: 7px; border-top: 1px dashed rgba(255,255,255,.12); font-size: 13px; }
  .spl .k { color: #8b98ad; }
  .spl div { color: #cbd5e0; margin-top: 2px; }
  .spl b { color: #fff; font-variant-numeric: tabular-nums; margin-left: 6px; }
  .grid .burn b { color: #f6ad55; }
  .grid .sum b { color: #d6bcfa; }
  .c-dmg { color: #fff; } .c-luck { color: #c084fc; } .c-tot { color: #4FD1C5; font-weight: 700; }
  .c-take { color: #f6878b; } .c-heal { color: #7bd5a6; } .c-sp { color: #90cdf4; }
  .c-crit { color: #f6e05e; font-variant-numeric: tabular-nums; }
  .zero { color: rgba(255,255,255,.25) !important; font-weight: 400 !important; }
  .bar { height: 5px; border-radius: 3px; background: rgba(79,209,197,.13); margin-top: 4px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: linear-gradient(90deg,#2c7a7b,#4FD1C5); border-radius: 2px; }
  .pct { font-size: 11px; color: #8b98ad; font-weight: 400; }
  tr.sum td { border-top: 1px solid #3a4558; font-weight: 700; background: rgba(255,255,255,.03); }
  tr.sum td:first-child { color: #e2e8f0; }
  tr.det td { background: #1f2636; text-align: left; white-space: normal; padding: 10px 12px; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 5px 18px; font-size: 13px; }
  .grid > div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dotted rgba(255,255,255,.07); padding: 2px 0; }
  .grid b { color: #fff; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
  .grid .k { color: #8b98ad; }
  .msg { padding: 16px 4px; color: #8b98ad; }
  .msg.err { color: #f6878b; }
  .fab { position: fixed; z-index: 2147483000; right: 16px; bottom: 16px; padding: 8px 14px; background: #171c27; color: #4FD1C5;
    border: 1px solid #4FD1C5; border-radius: 999px; font: 600 13px "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.5); }
  .fab.m { right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); padding: 10px 16px; font-size: 14px; }
  /* ---------- 手機：底部抽屜＋卡片 ---------- */
  .panel.mob { left: 0; right: 0; bottom: 0; top: auto; width: 100%; max-width: none; max-height: 82vh; border-radius: 16px 16px 0 0;
    border-left: none; border-right: none; border-bottom: none; font-size: 14px; padding-bottom: env(safe-area-inset-bottom); }
  .panel.mob .hd { cursor: pointer; position: relative; padding: 14px 12px 10px; }
  .panel.mob .grab { position: absolute; left: 50%; top: 5px; width: 40px; height: 4px; margin-left: -20px; border-radius: 2px; background: #3a4558; }
  .panel.mob .ttlw { flex-direction: column; gap: 4px; align-items: flex-start; }
  .panel.mob .chips { flex-wrap: wrap; }
  .panel.mob .tools .seg button { font-size: 13px; padding: 6px 10px; min-width: 0; height: auto; }
  .panel.mob .tools { flex-wrap: wrap; justify-content: flex-end; }
  .panel.mob .sub { max-width: 100%; }
  .panel.mob .tools button { font-size: 16px; padding: 6px 12px; min-width: 40px; }
  .panel.mob .tools button.ib { width: 40px; height: 36px; font-size: 17px; }
  .panel.mob .bd { padding: 8px 10px 16px; }
  .card { background: linear-gradient(180deg,#212a3b,#1c2333); border: 1px solid #2d3748; border-radius: 12px; padding: 10px 11px; margin-bottom: 8px; cursor: pointer; }
  .card.open { border-color: #2c7a7b; }
  .c-top { display: flex; align-items: flex-start; gap: 8px; }
  .c-nm { flex: 1; min-width: 0; }
  .c-nm > b { color: #fff; font-size: 15px; font-weight: 700; margin-right: 2px; }
  .c-nm small { display: block; color: #8b98ad; font-size: 12px; margin-top: 1px; }
  .c-big { text-align: right; flex: none; }
  .c-big b { display: block; color: #4FD1C5; font-size: 19px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.2; }
  .c-big span { color: #8b98ad; font-size: 11px; }
  .card .bar { margin: 7px 0 8px; height: 5px; }
  .c-stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 5px; }
  .cs { background: #171c27; border-radius: 7px; padding: 5px 7px; display: flex; flex-direction: column; min-width: 0; }
  .cs span { color: #8b98ad; font-size: 11px; }
  .cs b { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; }
  .cs i { font-style: normal; color: #8b98ad; font-size: 10px; }
  .cs.zero b { color: rgba(255,255,255,.25); }
  .c-bst { margin-top: 7px; color: #8b98ad; font-size: 12px; line-height: 1.5; }
  .c-more { margin-top: 7px; text-align: center; color: #4FD1C5; font-size: 12px; }
  .c-det { margin-top: 8px; padding-top: 8px; border-top: 1px solid #2d3748; cursor: default; }
  .c-det .grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 3px 12px; font-size: 12.5px; }
  .c-det .spl { font-size: 12.5px; }
  @media (max-width: 760px) { .grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  `;
  function mount() {
    if (host || !document.body) return;
    host = document.createElement('div');
    host.id = 'mdbs-host';
    root = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', onDragStart);
  }
  function unmount() { if (host) { host.remove(); host = null; root = null; } }
  function sideLabel(rep, side) {
    if (side === 'A') return '玩家';
    if (side === 'C') return '其他';
    return rep.battleType === 'BOSS' ? 'BOSS' : rep.battleType === 'PVP' ? '對手' : '敵方';
  }
  function cell(v, cls) { return `<td class="${v ? cls : cls + ' zero'}">${fmt(v)}</td>`; }
  const critPct = (c, n) => n > 0 ? (c / n * 100).toFixed(1) + '%' : '—';
  const CRIT_K = 318;
  const critTheory = luk => luk == null ? '' : (luk / (luk + CRIT_K) * 100).toFixed(1) + '%';
  function critCell(c, n, cls) {
    return `<td class="c-crit${n ? '' : ' zero'}">${critPct(c, n)}<span class="pct"> ${c}/${n}</span></td>`;
  }
  const STAT_LABELS = [['HP', 'hp'], ['攻擊', 'atk'], ['防禦', 'def'], ['體力', 'sta'], ['敏捷', 'agi'], ['反應', 'spd'], ['技巧', 'tec'], ['智力', 'int'], ['幸運', 'luk']];
  function statLine(s) {
    if (!s) return '';
    return STAT_LABELS.filter(([, k]) => s[k] != null).map(([l, k]) => l + ' ' + fmt(num(s[k]))).join('｜');
  }
  function unitHead(u) {
    const tags = (u.dead ? '<span class="tag dead">倒下</span>' : '') + (u.isAssist ? '<span class="tag ast">支援</span>' : '') +
      (u.burn ? `<span class="tag burn">燒上限 −${fmt(u.burn)}</span>` : '') +
      (u.specialN ? `<span class="tag spx">特殊迴避 ×${u.specialN}</span>` : '') +
      (u.byKind.dot.n ? `<span class="tag dot">異常狀態 ${fmt(u.byKind.dot.real)}</span>` : '') +
      (u.byKind.passive.n ? `<span class="tag pas">反傷 ${fmt(u.byKind.passive.real)}</span>` : '') +
      (u.simmer && (u.simmer.soupNow + u.simmer.soupTick) ? `<span class="tag soup">番茄湯 +${fmt(u.simmer.soupNow + u.simmer.soupTick)}</span>` : '') +
      (u.simmer && u.simmer.fartN ? `<span class="tag fart">放屁 ${fmt(u.simmer.fart)}</span>` : '') +
      (u.simmer && u.simmer.bin.length ? `<span class="tag soup">回收桶 ×${u.simmer.bin.length}</span>` : '') +
      (u.isSummon ? '<span class="tag sum">分身</span>' : '') +
      (u.summonN ? `<span class="tag sum">召喚 ×${u.summonN}</span>` : '');
    const hp = u.hpLeft != null ? `剩餘 HP ${fmt(u.hpLeft)}${u.hpMax ? ' / ' + fmt(u.hpMax) : ''}` : '';
    const subline = [u.isSummon && u.ownerName ? '本體 ' + u.ownerName : '', u.sub, hp].filter(Boolean).join('｜');
    return { tags, subline };
  }
  function detHtml(u, mode) {
    const k = u.byKind;
    const item = (label, val, cls) => `<div${cls ? ` class="${cls}"` : ''}><span class="k">${label}</span><b>${val}</b></div>`;
    let burnItems = '';
    if (u.burn) {
      const base = num(u.maxHpStat);
      const after = base - u.burn;
      burnItems = item('燒掉生命上限', fmt(u.burn) + '（' + u.burnN + ' 次）', 'burn') +
        (base ? item('生命上限', fmt(base) + ' → ' + fmt(after) + '（−' + (u.burn / base * 100).toFixed(1) + '%）', 'burn') : '') +
        item('每次燒', fmt(u.burn / u.burnN), 'burn');
    }
    return `<div class="grid">
        ${burnItems}
        ${item('普攻傷害', fmt(k.normal[mode]) + '（' + k.normal.n + ' 下）')}
        ${item('技能傷害', fmt(k.skill[mode]) + '（' + k.skill.n + ' 下）')}
        ${item('反擊傷害', fmt(k.counter[mode]) + '（' + k.counter.n + ' 下）')}
        ${k.dot.n ? item('異常狀態傷害', fmt(k.dot[mode]) + '（' + k.dot.n + ' 次）') : ''}
        ${k.passive.n ? item('反傷', fmt(k.passive[mode]) + '（' + k.passive.n + ' 次）') : ''}
        ${k.fart.n ? item('臭臭茶放屁', fmt(k.fart[mode]) + '（' + k.fart.n + ' 次）', 'fart') : ''}
        ${item('爆擊率', critPct(u.crit, u.hitN) + '（' + u.crit + ' / ' + u.hitN + ' 次判定）')}
        ${u.luk != null ? item('幸運值', u.luk + (u.isSummon ? '（沿用本體，公式推估 ' : '（公式推估 ') + critTheory(u.luk) + '）') : ''}
        ${u.isSummon && u.ownerName ? item('本體', u.ownerName + (u.summonSkill ? '（' + u.summonSkill + '）' : ''), 'sum') : ''}
        ${u.summons.length ? item('分身輸出', fmt(u.summons.reduce((s2, x) => s2 + x.dealt[mode], 0)) + '（' + u.summons.length + ' 具）', 'sum') : ''}
        ${u.summons.length ? item('本體＋分身', fmt(u.dealt[mode] + u.summons.reduce((s2, x) => s2 + x.dealt[mode], 0)), 'sum') : ''}
        ${item('被格擋次數', u.blockedN)}
        ${item('最高單擊', fmt(u.maxHit))}
        ${item('攻擊落空', u.missN + ' 次')}
        ${item('一般閃避', u.dodgeN + ' 次' + (u.attackedN ? '（' + (u.dodgeN / u.attackedN * 100).toFixed(1) + '%）' : ''))}
        ${item('特殊迴避', u.specialN + ' 次' + (u.attackedN ? '（' + (u.specialN / u.attackedN * 100).toFixed(1) + '%）' : ''))}
        ${item('被攻擊', u.attackedN + ' 下')}
        ${item('幸運觸發', u.luckN + ' 次')}
        ${item('被幸運砸中', u.luckTakenN + ' 次／' + fmt(u.luckTaken))}
        ${item('治療技能', fmt(u.healTeam))}
        ${item('只補自己（吸血、自補）', fmt(u.healSolo))}
        ${item('受到治療', fmt(u.healRecv))}
        ${item('獲得 SP', fmt(u.spRecv))}
      </div>${dotList(u.dot, '異常狀態／持續傷害（這個角色造成的）')}${dotList(u.dotTaken, '受到的異常狀態／持續傷害')}${dotList(u.passiveDot, '反傷（這個角色造成的）')}${dotList(u.passiveTaken, '受到的反傷')}${simmerList(u)}${specialList(u)}`;
  }
  const rkBadge = i => `<span class="rk${i < 3 ? ' r' + (i + 1) : ''}">${i + 1}</span>`;
  function unitRows(u, sideTot, mode, i) {
    const dmg = u.dealt[mode], tot = dmg + u.luck, take = u.taken[mode];
    const pct = sideTot > 0 ? tot / sideTot * 100 : 0;
    const key = u.id;
    const { tags, subline } = unitHead(u);
    const bst = u.isBoss && u.stats ? `<tr class="bst" data-key="${esc(key)}"><td colspan="8">${esc(statLine(u.stats))}</td></tr>` : '';
    let html = `<tr class="u${bst ? ' hasbst' : ''}${state.open[key] ? ' open' : ''}" data-key="${esc(key)}">
      <td class="nm"><span class="arw">${state.open[key] ? '▾' : '▸'}</span>${rkBadge(i)}${esc(u.name)}${tags}<small>${esc(subline)}</small></td>
      ${cell(dmg, 'c-dmg')}${cell(u.luck, 'c-luck')}
      <td class="c-tot${tot ? '' : ' zero'}">${fmt(tot)} <span class="pct">${pct.toFixed(1)}%</span><div class="bar"><i style="width:${Math.min(100, pct).toFixed(1)}%"></i></div></td>
      ${cell(take, 'c-take')}${cell(u.heal, 'c-heal')}${cell(u.sp, 'c-sp')}${critCell(u.crit, u.hitN)}
    </tr>` + bst;
    if (state.open[key]) html += `<tr class="det"><td colspan="8">${detHtml(u, mode)}</td></tr>`;
    return html;
  }
  function unitCard(u, sideTot, mode, i) {
    const dmg = u.dealt[mode], tot = dmg + u.luck, take = u.taken[mode];
    const pct = sideTot > 0 ? tot / sideTot * 100 : 0;
    const key = u.id, open = !!state.open[key];
    const { tags, subline } = unitHead(u);
    const st = (label, v, cls) => `<div class="cs ${cls}${v ? '' : ' zero'}"><span>${label}</span><b>${fmt(v)}</b></div>`;
    return `<div class="card${open ? ' open' : ''}" data-key="${esc(key)}">
      <div class="c-top">
        <div class="c-nm">${rkBadge(i)}<b>${esc(u.name)}</b>${tags}${subline ? `<small>${esc(subline)}</small>` : ''}</div>
        <div class="c-big${tot ? '' : ' zero'}"><b>${fmt(tot)}</b><span>${pct.toFixed(1)}%</span></div>
      </div>
      <div class="bar"><i style="width:${Math.min(100, pct).toFixed(1)}%"></i></div>
      <div class="c-stats">
        ${st('造成', dmg, 'c-dmg')}${st('幸運', u.luck, 'c-luck')}${st('承受', take, 'c-take')}
        ${st('回血', u.heal, 'c-heal')}${st('回SP', u.sp, 'c-sp')}
        <div class="cs c-crit${u.hitN ? '' : ' zero'}"><span>爆擊</span><b>${critPct(u.crit, u.hitN)}</b><i>${u.crit}/${u.hitN}</i></div>
      </div>
      ${u.isBoss && u.stats ? `<div class="c-bst">${esc(statLine(u.stats))}</div>` : ''}
      <div class="c-more">${open ? '▴ 收起細項' : '▾ 點開看細項'}</div>
      ${open ? `<div class="c-det">${detHtml(u, mode)}</div>` : ''}
    </div>`;
  }
  function dotList(obj, title) {
    const ent = Object.entries(obj).sort((a, b) => b[1].dmg - a[1].dmg);
    if (!ent.length) return '';
    let totD = 0, totR = 0;
    const rows = ent.map(([name, d]) => {
      totD += d.dmg; totR += d.restore;
      let h = `<div class="dotl">・${esc(name)}<b>${fmt(d.dmg)}</b>（${d.n} 次${d.n ? '，每次約 ' + fmt(d.dmg / d.n) : ''}）</div>`;
      if (d.restore) h += `<div class="rst">　離開後回復<b>−${fmt(d.restore)}</b>（${d.rn} 次${d.theory > d.restore ? '，照規則應回 ' + fmt(d.theory) + '，因為當時快滿血少回了 ' + fmt(d.theory - d.restore) : ''}）　淨傷害<b>${fmt(d.dmg - d.restore)}</b></div>`;
      return h;
    }).join('');
    const sum = ent.length > 1 || totR ? `<div class="dotl">・合計<b>${fmt(totD)}</b>${totR ? `，扣掉回復後淨傷害<b>${fmt(totD - totR)}</b>` : ''}</div>` : '';
    return `<div class="spl"><span class="k">${esc(title)}</span>${rows}${sum}</div>`;
  }
  function simmerList(u) {
    const s = u.simmer;
    if (!s) return '';
    let h = '';
    const soup = s.soupNow + s.soupTick;
    if (soup) {
      h += `<div class="dotl">・番茄湯總回復<b>${fmt(soup)}</b>（立即 ${fmt(s.soupNow)}／${s.soupNowN} 碗，持續 ${fmt(s.soupTick)}／${s.soupTickN} 跳${s.soupAfterDeath ? `，其中西米倒下後還跳了 <b class="ad">${fmt(s.soupAfterDeath)}</b>` : ''}）</div>`;
      h += Object.entries(s.soupBy).sort((a, b) => (b[1].now + b[1].tick) - (a[1].now + a[1].tick))
        .map(([n, b]) => `<div class="rst">　${esc(n)}<b>${fmt(b.now + b.tick)}</b>（立即 ${fmt(b.now)}＋持續 ${fmt(b.tick)}／${b.n} 跳）</div>`).join('');
    }
    if (s.fartN) {
      h += `<div class="dotl">・臭臭茶放屁傷害<b>${fmt(s.fart)}</b>（${s.fartN} 次，每次約 ${fmt(s.fart / s.fartN)}；傷害看西米的智力）</div>`;
      h += Object.entries(s.fartBy).sort((a, b) => b[1].dmg - a[1].dmg)
        .map(([n, b]) => `<div class="rst">　${esc(n)} 放的<b>${fmt(b.dmg)}</b>（${b.n} 次）</div>`).join('');
    }
    if (s.bin.length) {
      h += `<div class="dotl">・回收桶<b>${s.bin.length} 次</b>，爬出來共回復<b>${fmt(s.binHeal)}</b> HP</div>` +
        s.bin.map((x, i) => `<div class="rst">　第 ${i + 1} 次：${esc(x.who || '？')} 被打進回收桶${x.heal != null ? `，爬出來回復<b>${fmt(x.heal)}</b>` : ''}</div>`).join('');
    }
    return h ? `<div class="spl"><span class="k">西米料理（番茄湯／臭臭茶／回收桶）</span>${h}</div>` : '';
  }
  function specialList(u) {
    const ent = Object.entries(u.special).sort((a, b) => b[1] - a[1]);
    if (!ent.length) return '';
    return `<div class="spl"><span class="k">特殊迴避內容（灰色字但不是一般閃避）</span>` +
      ent.map(([k, n]) => `<div>・${esc(k.split('〈T〉').join(u.name))}<b>×${n}</b></div>`).join('') + `</div>`;
  }
  const simpleTags = u => (u.dead ? '<span class="tag dead">倒下</span>' : '') + (u.isAssist ? '<span class="tag ast">支援</span>' : '') + (u.isSummon ? '<span class="tag sum">分身</span>' : '');
  function sideSimple(rep, units, side, mode, mob) {
    const list = units.filter(u => u.side === side);
    if (!list.length) return '';
    const S = list.reduce((s, u) => { s.tot += u.dealt[mode] + u.luck; s.take += u.taken[mode]; s.heal += u.heal; s.crit += u.crit; s.hitN += u.hitN; return s; }, { tot: 0, take: 0, heal: 0, crit: 0, hitN: 0 });
    list.sort((a, b) => (b.dealt[mode] + b.luck) - (a.dealt[mode] + a.luck));
    const pctOf = u => S.tot > 0 ? (u.dealt[mode] + u.luck) / S.tot * 100 : 0;
    const head = `<div class="side-hd"><span style="color:inherit;font-size:inherit"><i class="dot"></i>${sideLabel(rep, side)}</span><span>${list.length} 名${list.length > 1 ? `・總計 ${fmt(S.tot)}` : ''}</span></div>`;
    if (mob) {
      return `<div class="side s${side}">${head}${list.map((u, i) => {
        const tot = u.dealt[mode] + u.luck, p = pctOf(u);
        return `<div class="card simple"><div class="c-top"><div class="c-nm">${rkBadge(i)}<b>${esc(u.name)}</b>${simpleTags(u)}</div>
          <div class="c-big${tot ? '' : ' zero'}"><b>${fmt(tot)}</b><span>${p.toFixed(1)}%</span></div></div>
          <div class="bar"><i style="width:${Math.min(100, p).toFixed(1)}%"></i></div>
          <div class="sm-line"><span>承受<b class="c-take">${fmt(u.taken[mode])}</b></span>${u.heal ? `<span>回血<b class="c-heal">${fmt(u.heal)}</b></span>` : ''}<span>爆擊<b class="c-crit">${critPct(u.crit, u.hitN)}</b> <i style="font-style:normal;font-size:11px">${u.crit}/${u.hitN}</i></span></div></div>`;
      }).join('')}</div>`;
    }
    return `<div class="side s${side}">${head}
      <table class="simple"><thead><tr><th>角色</th><th>總計傷害</th><th>承受傷害</th><th>回復血量</th><th>爆擊率</th></tr></thead><tbody>
      ${list.map((u, i) => {
        const tot = u.dealt[mode] + u.luck, p = pctOf(u);
        return `<tr class="u0"><td class="nm">${rkBadge(i)}${esc(u.name)}${simpleTags(u)}</td>
          <td class="c-tot${tot ? '' : ' zero'}" style="min-width:190px">${fmt(tot)} <span class="pct">${p.toFixed(1)}%</span><div class="bar"><i style="width:${Math.min(100, p).toFixed(1)}%"></i></div></td>
          ${cell(u.taken[mode], 'c-take')}${cell(u.heal, 'c-heal')}${critCell(u.crit, u.hitN)}</tr>`;
      }).join('')}
      ${list.length > 1 ? `<tr class="sum"><td>合計</td>${cell(S.tot, 'c-tot')}${cell(S.take, 'c-take')}${cell(S.heal, 'c-heal')}${critCell(S.crit, S.hitN)}</tr>` : ''}
      </tbody></table></div>`;
  }
  const MVP_W = [['輸出', 1], ['補隊友', 0.5], ['承傷', 0.25], ['自回', 0.1], ['回SP', 0.25]];
  function contribution(mine, mode) {
    const outOf = u => u.dealt[mode] + u.luck + u.summons.reduce((s2, x) => s2 + x.dealt[mode] + x.luck, 0);
    const vals = u => [outOf(u), u.healTeam, u.taken[mode], u.healSolo, u.sp];
    const tot = MVP_W.map(() => 0);
    mine.forEach(u => vals(u).forEach((v, i) => { tot[i] += v; }));
    const used = MVP_W.map(([, w], i) => tot[i] > 0 ? w : 0);
    const wsum = used.reduce((a, b) => a + b, 0) || 1;
    return mine.map(u => {
      const v = vals(u), share = v.map((x, i) => tot[i] > 0 ? x / tot[i] : 0);
      const score = share.reduce((a, x, i) => a + x * used[i], 0) / wsum;
      return { u, out: v[0], score, parts: MVP_W.map(([n], i) => used[i] && share[i] > 0 ? `${n}${(share[i] * 100).toFixed(0)}%` : '').filter(Boolean) };
    });
  }
  function summaryBar(rep, units, mode) {
    const mine = units.filter(u => u.side === 'A' && !u.isSummon);
    if (!mine.length) return '';
    const top = (arr, f) => arr.reduce((b, u) => (f(u) > f(b) ? u : b), arr[0]);
    const cs = contribution(mine, mode);
    const all = cs.reduce((s, c) => s + c.out, 0);
    const mvp = top(cs, c => c.score), tank = top(mine, u => u.taken[mode]), healer = top(mine, u => u.healTeam);
    const tile = (cls, lb, v, who, tip) => `<div class="tile ${cls}" title="${esc(tip || who.replace(/<[^>]+>/g, ''))}"><div class="top"><span class="lb">${lb}</span><span class="v">${v}</span></div><div class="who">${who}</div></div>`;
    const rank = cs.slice().sort((a, b) => b.score - a.score).map(c => `${c.u.name} ${(c.score * 100).toFixed(1)}%（${c.parts.join('、') || '無'}）`).join('\n');
    return `<div class="sumbar">
      ${tile('t-dmg', '⚔️ 我方總傷害', fmt(all), mine.length + ' 名玩家')}
      ${tile('t-mvp', '🏆 MVP', (mvp.score * 100).toFixed(1) + '%', esc(mvp.u.name) + (mvp.parts.length ? '・' + esc(mvp.parts.join(' ')) : ''),
        '綜合貢獻＝各項佔全隊比例的加權平均（全隊都是 0 的項目不算）\n權重：輸出×1 > 補隊友×0.5 > 承受傷害×0.25 = 回SP×0.25 > 自回×0.1\n補隊友＝能補隊友的治療技能（番茄湯、小黃金樹、緊急包紮、治癒之鎖、治癒魔術…補到自己也算）\n自回＝只能補自己的（吸血、自補）\n\n' + rank)}
      ${tile('t-take', '🛡️ 最佳坦克', fmt(tank.taken[mode]), esc(tank.name))}
      ${tile('t-heal', '💚 最佳奶媽', healer.healTeam ? fmt(healer.healTeam) : '—', healer.healTeam ? esc(healer.name) : '沒有人用治療技能',
        '最佳奶媽看「治療技能」的回血：能補隊友的招都算（補到自己也算），吸血、自補不算\n\n' + mine.slice().sort((a, b) => b.healTeam - a.healTeam).map(u => `${u.name}：治療技能 ${fmt(u.healTeam)}、只補自己 ${fmt(u.healSolo)}`).join('\n'))}
    </div>`;
  }
  function sideTable(rep, units, side, mode) {
    const list = units.filter(u => u.side === side);
    if (!list.length) return '';
    const S = list.reduce((s, u) => {
      s.dmg += u.dealt[mode]; s.luck += u.luck; s.take += u.taken[mode]; s.heal += u.heal; s.sp += u.sp;
      s.crit += u.crit; s.hitN += u.hitN; return s;
    }, { dmg: 0, luck: 0, take: 0, heal: 0, sp: 0, crit: 0, hitN: 0 });
    const tot = S.dmg + S.luck;
    list.sort((a, b) => (b.dealt[mode] + b.luck) - (a.dealt[mode] + a.luck));
    return `<div class="side s${side}">
      <div class="side-hd"><span style="color:inherit;font-size:inherit"><i class="dot"></i>${sideLabel(rep, side)}</span><span>${list.length} 名・點角色列看細項</span></div>
      <table><thead><tr>
        <th>角色</th><th>造成傷害</th><th>幸運傷害</th><th>總計傷害</th><th>承受傷害</th><th>回復血量</th><th>回復SP</th><th>爆擊率</th>
      </tr></thead><tbody>
        ${list.map((u, i) => unitRows(u, tot, mode, i)).join('')}
        ${list.length > 1 ? `<tr class="sum"><td>合計</td>${cell(S.dmg, 'c-dmg')}${cell(S.luck, 'c-luck')}${cell(tot, 'c-tot')}${cell(S.take, 'c-take')}${cell(S.heal, 'c-heal')}${cell(S.sp, 'c-sp')}${critCell(S.crit, S.hitN)}</tr>` : ''}
      </tbody></table></div>`;
  }
  function sideCards(rep, units, side, mode) {
    const list = units.filter(u => u.side === side);
    if (!list.length) return '';
    const S = list.reduce((s, u) => { s.dmg += u.dealt[mode]; s.luck += u.luck; s.take += u.taken[mode]; s.heal += u.heal; return s; },
      { dmg: 0, luck: 0, take: 0, heal: 0 });
    const tot = S.dmg + S.luck;
    list.sort((a, b) => (b.dealt[mode] + b.luck) - (a.dealt[mode] + a.luck));
    return `<div class="side s${side}">
      <div class="side-hd"><span style="color:inherit;font-size:inherit"><i class="dot"></i>${sideLabel(rep, side)}</span><span>${list.length} 名${list.length > 1 ? `・總計 ${fmt(tot)}・承受 ${fmt(S.take)}${S.heal ? '・回血 ' + fmt(S.heal) : ''}` : ''}</span></div>
      ${list.map((u, i) => unitCard(u, tot, mode, i)).join('')}
    </div>`;
  }
  const narrow = () => { try { return matchMedia('(max-width: 640px)').matches; } catch (e) { return false; } };
  let wasNarrow = null;
  window.addEventListener('mdp-playback', () => { if (currentId) render(); });
  window.addEventListener('resize', () => { const n = narrow(); if (n !== wasNarrow && currentId) render(); else applyFit(); });
  function render() {
    if (!tk.on || !currentId) return;
    mount();
    if (!root) return;
    const mob = narrow();
    wasNarrow = mob;
    const pos = state.pos;
    const posStyle = mob ? '' : pos
      ? `left:${Math.max(0, Math.min(pos.left, document.documentElement.clientWidth - 160))}px;top:${Math.max(0, Math.min(pos.top, document.documentElement.clientHeight - 40))}px;`
      : 'right:16px;top:72px;';
    const playing = document.documentElement.hasAttribute('data-mdp-playing');
    if (state.hidden) {
      root.innerHTML = `<style>${CSS}</style><button class="fab${mob ? ' m' : ''}" data-act="show">📊 戰報統計${playing ? '・⏳ 播放中' : ''}</button>`;
      return;
    }
    const rep = cache.get(currentId);
    const mode = state.mode;
    let sub = `<span class="chip">#${esc(currentId)}</span>`, body;
    const simple = state.view === 'simple';
    if (rep && playing) {
      sub = `<span class="chip play">⏳ 播放中</span>` + (rep.battleType ? `<span class="chip">${esc(rep.battleType)}</span>` : '') + `<span class="chip">#${esc(currentId)}</span>`;
      body = `<div class="playing"><div class="pi">⏳</div><div class="pt">戰報逐行播放中</div>
        <div class="ps">播完最後一行才顯示傷害、MVP 與勝負</div></div>`;
    } else if (rep) {
      const units = analyze(rep);
      const t = rep.createdAt ? new Date(rep.createdAt).toLocaleString() : '';
      const rc = { WIN: 'win', LOSE: 'lose', DRAW: 'draw' }[rep.result] || '';
      sub = (playing ? `<span class="chip" title="逐行播放完才顯示勝負">⏳ 播放中</span>` : rep.result ? `<span class="chip ${rc}">${esc(RESULT[rep.result] || rep.result)}</span>` : '') +
        (rep.battleType ? `<span class="chip">${esc(rep.battleType)}</span>` : '') +
        `<span class="chip">#${esc(currentId)}</span>` + (t ? `<span class="chip">${esc(t)}</span>` : '');
      const sides = ['A', 'B', 'C'].filter(sd => units.some(u => u.side === sd));
      if (state.sideView !== 'all' && !sides.includes(state.sideView)) state.sideView = 'all';
      const cnt = sd => units.filter(u => u.side === sd).length;
      const sv = state.sideView;
      const tb = `<div class="tb">
        <div><span class="lb">顯示</span><span class="seg">
          <button data-act="side" data-s="all" class="${sv === 'all' ? 'on' : ''}">全部<i>${units.length}</i></button>
          ${sides.map(sd => `<button data-act="side" data-s="${sd}" class="${sv === sd ? 'on' : ''}">${sideLabel(rep, sd)}<i>${cnt(sd)}</i></button>`).join('')}
        </span></div>
        ${mob ? '' : `<button data-act="fit" class="fitb${state.fit ? ' on' : ''}" title="自動縮小整個面板，讓戰報在一個視窗內看完（不用捲動）">⤢ 自動縮放 <b class="fitv">${state.fit ? '' : '關'}</b></button>`}
      </div>`;
      body = tb + (sv === 'all' || sv === 'A' ? summaryBar(rep, units, mode) : '') +
        sides.filter(sd => sv === 'all' || sv === sd).map(sd => simple ? sideSimple(rep, units, sd, mode, mob) : (mob ? sideCards : sideTable)(rep, units, sd, mode)).join('');
    } else if (errors[currentId]) {
      body = `<div class="msg err">${esc(errors[currentId])}</div>`;
    } else {
      body = `<div class="msg">${esc(statusText || '等待戰報資料…')}</div>`;
    }
    const col = state.collapsed;
    root.innerHTML = `<style>${CSS}</style>
      <div class="panel${mob ? ' mob' : ''}${col ? ' col' : ''}${simple && !mob ? ' simple' : ''}" style="${posStyle}">
        <div class="hd"${mob ? ' data-act="collapse"' : ' data-drag="1"'}>
          ${mob ? '<span class="grab"></span>' : ''}
          <div class="ttlw"><span class="ttl">📊 戰報統計</span>${col ? (playing ? `<span class="chips"><span class="chip play">⏳ 播放中</span></span>` : '') : `<span class="chips">${sub}</span>`}</div>
          <div class="tools">
            ${col ? '' : `<span class="seg"><button data-act="view" data-v="simple" class="${simple ? 'on' : ''}" title="只看總計傷害、承受、回血">簡易</button><button data-act="view" data-v="detail" class="${simple ? '' : 'on'}" title="全部欄位，點角色看細項">詳細</button></span>`}
            <button data-act="collapse" class="ib" title="${col ? '展開' : '收合'}">${col ? (mob ? '▴' : '＋') : (mob ? '▾' : '－')}</button>
            <button data-act="hide" class="ib" title="縮成小按鈕">✕</button>
          </div>
        </div>
        ${col ? '' : `<div class="bd">${body}</div>`}
      </div>`;
    applyFit();
  }
  function applyFit() {
    const p = root && root.querySelector('.panel');
    if (!p) return;
    p.style.transform = ''; p.style.maxHeight = ''; p.classList.remove('dense');
    const lab = root.querySelector('.fitv');
    const mob = narrow();
    const top = p.getBoundingClientRect().top;
    const avail = Math.max(200, window.innerHeight - top - 12);
    if (mob || state.collapsed || !state.fit || !cache.get(currentId) || document.documentElement.hasAttribute('data-mdp-playing')) {
      if (!mob) p.style.maxHeight = avail + 'px';
      if (lab) lab.textContent = state.fit ? '100%' : '關';
      return;
    }
    p.style.maxHeight = 'none';
    let H = p.offsetHeight;
    if (H > avail) { p.classList.add('dense'); H = p.offsetHeight; }
    let sc = Math.min(1, avail / H);
    if (sc < 0.5) { sc = 0.5; p.style.maxHeight = Math.floor(avail / sc) + 'px'; }
    if (sc < 0.999) {
      p.style.transformOrigin = state.pos ? 'top left' : 'top right';
      p.style.transform = `scale(${sc.toFixed(3)})`;
    }
    if (lab) lab.textContent = Math.round(sc * 100) + '%';
  }
  function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      const act = btn.dataset.act;
      if (act === 'side') { state.sideView = btn.dataset.s || 'all'; render(); }
      else if (act === 'fit') { state.fit = !state.fit; save('fit', state.fit); render(); }
      else if (act === 'view') { state.view = btn.dataset.v === 'simple' ? 'simple' : 'detail'; save('view', state.view); render(); }
      else if (act === 'collapse') { if (e.target.closest('button') && e.target.closest('button') !== btn) return; state.collapsed = !state.collapsed; save('collapsed', state.collapsed); render(); }
      else if (act === 'hide') { state.hidden = true; render(); }
      else if (act === 'show') { state.hidden = false; render(); }
      return;
    }
    const row = e.target.closest('tr[data-key], .card[data-key]');
    if (row) { const k = row.dataset.key; state.open[k] = !state.open[k]; render(); }
  }
  function onDragStart(e) {
    const hd = e.target.closest('[data-drag]');
    if (!hd || e.target.closest('button')) return;
    const panel = hd.parentElement;
    const r = panel.getBoundingClientRect();
    panel.style.transformOrigin = 'top left'; panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px'; panel.style.right = 'auto';
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = ev => {
      const left = Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dy));
      panel.style.left = left + 'px'; panel.style.top = top + 'px'; panel.style.right = 'auto';
      state.pos = { left: Math.round(left), top: Math.round(top) };
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (state.pos) save('pos', state.pos); applyFit(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  }
  function routeId() { const m = location.pathname.match(/^\/reports\/(\d+)\/?$/); return m ? m[1] : null; }
  function onRoute() {
    if (!document.body) return;
    if (!tk.on) { currentId = null; unmount(); return; }
    const id = routeId();
    if (id === currentId) return;
    currentId = id;
    state.open = {};
    state.sideView = 'all';
    if (!id) { unmount(); return; }
    state.hidden = false;
    render();
    ensureData(id);
  }
  ['pushState', 'replaceState'].forEach(fn => {
    const o = history[fn];
    history[fn] = function () { const r = o.apply(this, arguments); setTimeout(onRoute, 0); return r; };
  });
  window.addEventListener('popstate', () => setTimeout(onRoute, 0));
  document.addEventListener('DOMContentLoaded', onRoute);
  setInterval(onRoute, 800);
  tk.onToggle(() => { currentId = null; onRoute(); });
})();
} }),
    Object.assign({"id": "playback", "icon": "▶️", "name": "戰報逐行播放", "desc": "Boss、切磋／茶渡、遭遇戰、戰報頁：戰鬥過程一行一行出現，最後才揭曉勝負。", "feats": ["逐行播放，可「跳過，直接看結果」、播完可重播", "播完前蓋住勝利／失敗／平手、死亡標記與死亡橫幅", "事件「遭遇戰鬥！」不先寫結果", "播放中戰報統計只顯示「⏳ 播放中」，不顯示總行數", "每一行後面顯示被打／被補的人剩多少血", "「⚙ 戰報播放」設定：逐行／直接顯示、剩餘血量、每行間隔、自動捲動"], "ver": "1.2.4", "at": "start"}, { run: function (TK) {
// ===== 戰報逐行播放 1.2.4（mydoujin_戰報播放.user.js）=====
(function () {
  'use strict';
  const tk = (typeof TK === 'object' && TK) || { on: true, onToggle() {} };
  const CFG_KEY = 'mdp:cfg';
  const DEF = { mode: 'step', sec: 0.6, hp: true };
  const load = () => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(CFG_KEY)) || {}); } catch (e) { return Object.assign({}, DEF); } };
  const save = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  let cfg = load();
  const clampSec = v => Math.max(0.05, Math.min(10, Number(v) || DEF.sec));
  cfg.sec = clampSec(cfg.sec);
  const routeOk = () => /^\/(boss|players\/[^/]+|reports\/[^/]+)?\/?$/.test(location.pathname);
  const homePage = () => /^\/?$/.test(location.pathname);
  const DEATH_BANNER = '你的角色死亡了，請進行轉生';
  const STATUS_RE = /^.+ · Lv\.\d+ · (死亡|存活)$/;
  const OUTCOME_RE = /^(勝利|失敗|敗北|平手|平局|死亡)$/;
  let guard = false, guardTimer = null;
  function ensureStyle() {
    if (document.getElementById('mdp-style')) return;
    const st = document.createElement('style');
    st.id = 'mdp-style';
    st.textContent = '[data-mdp-hide]{visibility:hidden !important}[data-mdp-gone]{display:none !important}' +
      'html[data-mdp-playing] [data-part="title"] ~ *, html[data-mdp-guard] [data-part="title"] ~ *,' +
      'html.mdp-step:not([data-mdp-reveal]) [data-mdp-report] [data-part="title"] ~ *,' +
      'html.mdp-step:not([data-mdp-reveal]) [data-mdp-report] h2 ~ span,' +
      'html[data-mdp-playing] [role="dialog"] h2 ~ span, html[data-mdp-guard] [role="dialog"] h2 ~ span{visibility:hidden !important}' +
      '[data-mdp-enc]{font-size:0 !important;color:#a0aec0 !important}' +
      '[data-mdp-enc]::after{content:"遭遇戰鬥！（勝負在戰報最後揭曉）";font-size:14px;font-weight:700}';
    (document.head || document.documentElement).appendChild(st);
  }
  function hideOutcome() {
    ensureStyle();
    document.querySelectorAll('div').forEach(d => {
      if (d.childElementCount === 0 && d.textContent.trim() === DEATH_BANNER) d.setAttribute('data-mdp-gone', '');
    });
    document.querySelectorAll('p').forEach(p => {
      if (p.childElementCount === 0 && STATUS_RE.test(p.textContent.trim())) p.setAttribute('data-mdp-hide', '');
    });
    document.querySelectorAll('[role="dialog"], [role="alertdialog"], [data-scope="dialog"][data-part="content"]').forEach(dlg => {
      dlg.querySelectorAll('span, p, div').forEach(e => {
        if (e.childElementCount === 0 && OUTCOME_RE.test(e.textContent.trim()) && !e.closest('[data-mdp-bar]')) e.setAttribute('data-mdp-hide', '');
      });
    });
    document.querySelectorAll('h2, h3, p, div, span').forEach(title => {
      if (title.childElementCount !== 0 || title.textContent.trim() !== '戰報' || title.closest('[data-mdp-bar]')) return;
      for (let s = title.nextElementSibling; s; s = s.nextElementSibling) {
        if (OUTCOME_RE.test(s.textContent.trim())) s.setAttribute('data-mdp-hide', '');
      }
    });
  }
  const ENC_RE = /^遭遇戰鬥！\s*[(（]\s*(勝利|失敗|平手)\s*[)）]$/;
  function maskEncounter() {
    if (cfg.mode !== 'step') {
      document.querySelectorAll('[data-mdp-enc]').forEach(e => e.removeAttribute('data-mdp-enc'));
      return;
    }
    ensureStyle();
    document.querySelectorAll('[role="dialog"] p, [role="dialog"] div').forEach(e => {
      if (e.childElementCount === 0 && !e.hasAttribute('data-mdp-enc') && ENC_RE.test(e.textContent.trim())) e.setAttribute('data-mdp-enc', '');
    });
  }
  function announce(playing) {
    try {
      const de = document.documentElement;
      if (playing) { ensureStyle(); de.setAttribute('data-mdp-playing', '1'); }
      else de.removeAttribute('data-mdp-playing');
      de.removeAttribute('data-mdp-progress');
      window.dispatchEvent(new CustomEvent('mdp-playback', { detail: { playing: !!playing } }));
    } catch (e) {}
  }
  function showOutcome() {
    if (!guard) document.documentElement.removeAttribute('data-mdp-guard');
    document.querySelectorAll('[data-mdp-hide]').forEach(e => e.removeAttribute('data-mdp-hide'));
    document.querySelectorAll('[data-mdp-gone]').forEach(e => e.removeAttribute('data-mdp-gone'));
  }
  const hiding = () => guard || !!(cur && cur.playing);
  function armGuard() {
    if (!tk.on || cfg.mode !== 'step') return;
    guard = true; hideOutcome();
    document.documentElement.setAttribute('data-mdp-guard', '1');
    clearTimeout(guardTimer);
    guardTimer = setTimeout(() => { guard = false; document.documentElement.removeAttribute('data-mdp-guard'); if (!hiding()) showOutcome(); }, 45000);
  }
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const battlePost = method === 'POST' && (/\/api\/dungeon\/challenge(?:[?#]|$)/.test(url) || /\/api\/players\/[^/]+\/[^/?#]+(?:[?#]|$)/.test(url));
      if (battlePost) armGuard();
      if (battlePost || (method === 'GET' && /\/api\/battle-reports\/\d+(?:[?#]|$)/.test(url))) {
        p.then(res => { if (res && res.ok) res.clone().json().then(remember).catch(() => {}); }).catch(() => {});
      }
    } catch (e) {}
    return p;
  };
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
  const msgText = row => { let t = ''; row.children[1].childNodes.forEach(n => { if (!(n.nodeType === 1 && n.hasAttribute('data-mdp-hp'))) t += n.textContent; }); return t; };
  const sigOf = box => { const r = rowsOf(box); return r.length + '|' + (r[0] ? msgText(r[0]).slice(0, 40) : '') + '|' + (r.length ? msgText(r[r.length - 1]).slice(0, 40) : ''); };
  const API = 'https://mydoujin-backend.onrender.com';
  const datasets = [];
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
    const out = {};
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
  const hpState = new WeakMap();
  function requestReport(ds) {
    if (!ds.reportId || ds.fetching || ds.failed) return;
    let token = null;
    try { token = localStorage.getItem('token'); } catch (e) {}
    if (!token) { ds.failed = true; return; }
    ds.fetching = true;
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
    if (st && st.sig === sig && (st.withP || !st.ds.participants)) return;
    const ds = matchDataset(rows);
    if (!ds) return;
    const res = computeHp(ds);
    clearChips(box);
    rows.forEach((row, k) => { const list = res[ds.idx[k]]; if (list && list.length) row.children[1].appendChild(chipEl(list)); });
    hpState.set(box, { sig, ds, withP: !!ds.participants });
    if (!ds.participants) requestReport(ds);
  }
  let cur = null;
  const seen = new WeakMap();
  const setReveal = on => { try { if (on) document.documentElement.setAttribute('data-mdp-reveal', '1'); else document.documentElement.removeAttribute('data-mdp-reveal'); } catch (e) {} };
  function startPlayback(box) {
    stopPlayback(false);
    setReveal(false);
    const rows = rowsOf(box);
    if (!rows.length) return;
    cur = { box, rows, idx: 0, playing: true, timer: null, bar: null, sig: sigOf(box) };
    seen.set(box, cur.sig);
    rows.forEach(r => { r.style.display = 'none'; });
    hideOutcome();
    announce(true);
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
    setReveal(true);
    showOutcome();
    announce(false);
    updateBar();
  }
  function stopPlayback(reveal) {
    if (!cur) return;
    clearTimeout(cur.timer);
    if (reveal !== false || !cur.box.isConnected) cur.rows.forEach(r => { r.style.display = ''; });
    if (cur.bar) cur.bar.remove();
    cur = null;
    if (!guard) showOutcome();
    announce(false);
  }
  function replay() {
    if (!cur) return;
    clearTimeout(cur.timer);
    cur.rows = rowsOf(cur.box);
    cur.rows.forEach(r => { r.style.display = 'none'; });
    cur.idx = 0; cur.playing = true;
    setReveal(false);
    hideOutcome();
    announce(true);
    updateBar();
    step();
  }
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
      ? `<span>▶ 播放中・第 ${Math.min(cur.idx, n)} 行</span><span class="dim">每行 ${clampSec(cfg.sec)} 秒</span><span class="sp"></span><button data-a="skip">跳過，直接看結果</button>`
      : `<span>✔ 播放完畢（共 ${n} 行）</span><span class="sp"></span><button data-a="replay">重播</button>`) + `</div>`;
  }
  function scan() {
    if (!tk.on) return;
    try { maskEncounter(); } catch (e) {}
    try {
      ensureStyle();
      document.documentElement.classList.toggle('mdp-step', cfg.mode === 'step');
      document.querySelectorAll('[role="dialog"] h2, [role="alertdialog"] h2, [data-part="title"]').forEach(t => {
        if (t.textContent.trim() !== '戰報') return;
        const d = t.closest('[role="dialog"], [role="alertdialog"], [data-scope="dialog"][data-part="content"]') || (t.matches('[data-part="title"]') ? t.parentElement : null);
        if (d && !d.hasAttribute('data-mdp-report')) d.setAttribute('data-mdp-report', '');
      });
      if (!cur && !findLogBoxes().length) setReveal(false);
    } catch (e) {}
    if (!routeOk()) { if (cur) stopPlayback(true); guard = false; document.documentElement.removeAttribute('data-mdp-guard'); return; }
    if (cur && !cur.box.isConnected) stopPlayback(false);
    if (cur && cur.box.isConnected && cur.playing) {
      const s = sigOf(cur.box);
      if (s !== cur.sig) startPlayback(cur.box);
    }
    const boxes = findLogBoxes().filter(b => !homePage() || b.closest('[role="dialog"]'));
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
  const hosts = new Map();
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
        <div class="hint">播放時「勝利／失敗／平手」「死亡」標籤、頂端死亡橫幅、隊伍成員存活狀態、事件視窗的「遭遇戰鬥！(結果)」都會先蓋住，最後一行出現才揭曉；戰報統計面板的勝負標籤也會等播完才出現。</div>
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
        if (cfg.mode === 'instant' && cur && cur.playing) finish();
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
      mountAt('report', () => [...document.querySelectorAll('h2')].find(h => h.textContent.replace(/⚙.*$/, '').trim() === '戰鬥過程' && !h.querySelector('[data-mdp-set]')) || null,
        (h, host) => { h.style.display = 'flex'; h.style.alignItems = 'center'; h.style.gap = '10px'; h.appendChild(host); });
    } else if (/^\/boss\/?$/.test(p)) {
      mountAt('boss', () => {
        const code = [...document.querySelectorAll('p')].find(e => e.textContent.trim().startsWith('隊伍代碼：'));
        if (code) return code.parentElement;
        const h = [...document.querySelectorAll('h2')].find(e => e.textContent.trim() === '隊伍');
        return h ? h.parentElement : null;
      }, (row, host) => row.appendChild(host), 'margin-left:auto;');
    } else if (/^\/players\/[^/]+\/?$/.test(p)) {
      mountAt('duel', () => {
        const b = [...document.querySelectorAll('button')].find(x => /^(友好切磋|切磋中)/.test(x.textContent.trim()));
        return b && b.parentElement && b.parentElement.parentElement ? b.parentElement.parentElement : null;
      }, (col, host) => col.parentElement.insertBefore(host, col), 'display:block;margin-top:24px;');
    }
  }
  document.addEventListener('click', e => {
    if (!popOpen) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (![...hosts.values()].some(h => path.includes(h))) { popOpen = false; rerenderAll(); }
  }, true);
  window.addEventListener('resize', () => { if (popOpen) hosts.forEach(h => h.isConnected && placePop(h.__sr)); });
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
  tk.onToggle(on => {
    const de = document.documentElement;
    if (on) { findLogBoxes().forEach(b => seen.set(b, sigOf(b))); schedule(); return; }
    stopPlayback(true);
    guard = false; clearTimeout(guardTimer);
    de.removeAttribute('data-mdp-guard'); de.classList.remove('mdp-step'); setReveal(false);
    showOutcome();
    document.querySelectorAll('[data-mdp-enc]').forEach(e => e.removeAttribute('data-mdp-enc'));
    document.querySelectorAll('[data-mdp-report]').forEach(e => e.removeAttribute('data-mdp-report'));
    findLogBoxes().forEach(b => { clearChips(b); hpState.delete(b); });
    popOpen = false;
    hosts.forEach(h => h.remove()); hosts.clear();
  });
})();
} }),
    Object.assign({"id": "cooldown", "icon": "⏱️", "name": "Boss 冷卻倒數", "desc": "Boss 頁「還有 N 分鐘」改成每秒跳動的「還有 M 分 SS 秒」。", "feats": ["同場打的人用戰報時間＋30 分鐘，一進頁面就準到秒", "別場打的隊友在分鐘跳號時補查校正（每段冷卻最多 8 次）", "冷卻結束顯示「已結束 ✅」並自動按「刷新」（可點「⟳ 自動刷新」開關）"], "ver": "1.0.1", "at": "start"}, { run: function (TK) {
// ===== Boss 冷卻倒數 1.0.1（mydoujin_Boss冷卻倒數.user.js）=====
(function () {
  'use strict';
  const tk = (typeof TK === 'object' && TK) || { on: true, onToggle() {} };
  const COOLDOWN_MS = 30 * 60 * 1000;
  const MIN = 60000;
  const EXACT_W = 2000;
  const MAX_PROBES = 8;
  const STORE = 'mdbc:v1';
  const CD_RE = /^(.*?)的\s*Boss\s*挑戰冷卻中，還有\s*(\d+)\s*(分鐘|秒)/;
  let apiBase = 'https://mydoujin-backend.onrender.com';
  let offset = 0;
  let state = null;
  let me = null;
  const anchorTried = new Set();
  let cds = {};
  try { cds = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { cds = {}; }
  const save = () => {
    const now = Date.now();
    for (const k of Object.keys(cds)) if (cds[k].hi < now - 10 * MIN) delete cds[k];
    try { localStorage.setItem(STORE, JSON.stringify(cds)); } catch (e) {  }
  };
  function observe(key, m, unit, tSend, tRecv) {
    let lo, hi;
    if (unit === '秒') { lo = tSend + (m - 1) * 1000; hi = tRecv + m * 1000; }
    else { lo = tSend + (m - 1) * MIN; hi = tRecv + m * MIN; }
    const c = cds[key];
    if (c && c.lo <= hi + 1000 && lo <= c.hi + 1000) {
      c.lo = Math.max(c.lo, lo); c.hi = Math.min(c.hi, hi);
      if (c.lo > c.hi) { const mid = (c.lo + c.hi) / 2; c.lo = c.hi = mid; }
    } else {
      cds[key] = { lo, hi, probes: 0, src: 'obs', id: tRecv };
    }
  }
  function clearDone(keysInBlockers, tSend) {
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
        if (c && end >= c.lo - 1500 && end <= c.hi + 1500) {
          c.lo = c.hi = end; c.src = 'report';
        }
      }
      save(); render();
    } catch (e) {  }
  }
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
      try { await window.fetch(apiBase + '/api/dungeon/party', { headers: auth() }); } catch (e) {  }
      scheduleProbe();
    }, Math.max(0, best.at - now));
  }
  const auth = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  };
  const onBoss = () => /^\/boss\/?$/.test(location.pathname);
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
        const left = (w > EXACT_W ? (c.lo + c.hi) / 2 : c.hi) - now;
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
    if (autoCount >= 3) return;
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '刷新' && !b.disabled);
    if (!btn) return;
    lastAuto = now; autoCount++;
    setTimeout(() => btn.click(), 1500);
  }
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  document.addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('[data-mdbc-tg]')) return;
    e.preventDefault(); e.stopPropagation();
    try { localStorage.setItem('mdbc:auto', autoRefreshOn() ? '0' : '1'); } catch (err) {  }
    render();
  }, true);
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
} }),
    Object.assign({"id": "finder", "icon": "🔎", "name": "角色查詢", "desc": "玩家列表與「選擇助戰」裡，依角色和等級查出誰在用。", "feats": ["玩家列表：掃描全部玩家後依角色、關鍵字篩選，點暱稱進玩家頁", "選擇助戰：掃描可借名單，顯示等級、樓層與九項能力值，一鍵「帶入」搜尋", "Lv 最低～最高篩選；角色標籤人數跟著等級範圍變", "只有按「掃描」才讀資料，結果存在本機"], "ver": "1.1.1", "at": "idle"}, { run: function (TK) {
// ===== 角色查詢 1.1.1（mydoujin_角色查詢.user.js）=====
(function () {
  'use strict';
  const tk = (typeof TK === 'object' && TK) || { on: true, onToggle() {} };
  const API = 'https://mydoujin-backend.onrender.com';
  const P_KEY = 'mdcf:players';
  const A_KEY = 'mdcf:assist';
  const P_FRESH = 30 * 60 * 1000;
  const A_FRESH = 3 * 60 * 1000;
  const SHOW_MAX = 200;
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
  const slimP = p => ({
    id: p.id, nick: p.nickname || '', lv: p.level, ch: p.characterName || '', ti: p.characterTitle || '',
    img: p.imagePath || '', fl: p.floor, hf: p.highestFloor, dead: !!p.isDead,
  });
  let pScan = null;
  function scanPlayers(onProg) {
    if (pScan) return pScan;
    pScan = (async () => {
      const q = p => `/api/players?page=${p}&limit=50&sort=level&order=desc`;
      const first = await api(q(1));
      const total = (first.pagination && first.pagination.totalPages) || 1;
      const pages = { 1: first.players || [] };
      let done = 1; onProg && onProg(done, total);
      const todo = []; for (let p = 2; p <= total; p++) todo.push(p);
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
  function makeHost(kind) {
    const host = document.createElement('div');
    host.setAttribute('data-mdcf', kind);
    const root = host.attachShadow({ mode: 'open' });
    return { host, root };
  }
  function countByChar(list) {
    const m = new Map();
    list.forEach(x => {
      if (!x.ch) return;
      const o = m.get(x.ch) || { ch: x.ch, n: 0, img: x.img };
      o.n++; m.set(x.ch, o);
    });
    return [...m.values()].sort((a, b) => b.n - a.n || a.ch.localeCompare(b.ch, 'zh-Hant'));
  }
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
  let tick = 0;
  const check = () => { if (!tk.on) return; try { mountPlayers(); mountAssist(); } catch (e) {} };
  tk.onToggle(on => { if (on) check(); else document.querySelectorAll('[data-mdcf]').forEach(e => e.remove()); });
  new MutationObserver(() => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; check(); }); })
    .observe(document, { childList: true, subtree: true });
  check();
})();
} }),
  ];
  const offAtLoad = readOff();
  const status = {};
  const ctxs = {};
  for (const m of MODS) {
    const subs = [];
    const ctx = ctxs[m.id] = { on: !offAtLoad.includes(m.id), onToggle(fn) { subs.push(fn); }, _subs: subs };
    const go = () => {
      try { m.run(ctx); status[m.id] = 'ok'; }
      catch (e) { status[m.id] = 'err'; console.error('[我的同人工具箱] ' + m.name + ' 啟動失敗', e); }
    };
    if (m.at === 'idle' && document.readyState === 'loading') { status[m.id] = 'ok'; document.addEventListener('DOMContentLoaded', go, { once: true }); }
    else go();
  }
  function setOn(id, on) {
    const ctx = ctxs[id];
    if (!ctx || ctx.on === on) return;
    ctx.on = on;
    const off = readOff().filter(x => x !== id);
    if (!on) off.push(id);
    writeOff(off);
    ctx._subs.forEach(fn => { try { fn(on); } catch (e) { console.error('[我的同人工具箱] 切換失敗', id, e); } });
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; }
    .fab { position: fixed; left: 14px; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 2147482990;
      width: 44px; height: 44px; border-radius: 50%; border: 1px solid #2d3748; background: #171c27; color: #e2e8f0;
      cursor: pointer; opacity: .85; padding: 0; overflow: visible;
      box-shadow: 0 4px 14px rgba(0,0,0,.45); transition: opacity .15s, transform .15s; }
    .fab img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; pointer-events: none; }
    .fab:hover, .fab.open { opacity: 1; transform: scale(1.08); }
    .pan { position: fixed; left: 14px; bottom: calc(68px + env(safe-area-inset-bottom)); z-index: 2147483001; width: 360px;
      max-width: calc(100vw - 28px); max-height: calc(100vh - 90px); overflow: auto; background: #1a1f2e; color: #e2e8f0;
      border: 1px solid #2d3748; border-radius: 12px; box-shadow: 0 12px 34px rgba(0,0,0,.55); font-size: 13px; display: none; }
    .pan.show { display: block; }
    .hd { display: flex; align-items: center; gap: 8px; padding: 11px 14px; border-bottom: 1px solid #2d3748; position: sticky; top: 0; background: #1a1f2e; z-index: 1; }
    .hd img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; }
    .hd b { font-size: 15px; } .hd small { color: #718096; } .hd .x { margin-left: auto; background: none; border: 0; color: #a0aec0; font-size: 16px; cursor: pointer; }
    .card { margin: 10px 12px; padding: 10px 12px; border: 1px solid #2d3748; border-radius: 10px; background: #171c27; }
    .card.off { opacity: .62; }
    .row { display: flex; align-items: center; gap: 8px; }
    .ic { font-size: 18px; width: 24px; text-align: center; }
    .nm { font-weight: bold; font-size: 14px; } .ver { color: #718096; font-size: 11px; }
    .st { font-size: 11px; padding: 1px 7px; border-radius: 9px; margin-left: 2px; white-space: nowrap; }
    .st.on { background: #1c4532; color: #9ae6b4; } .st.off { background: #2d3748; color: #a0aec0; }
    .st.err { background: #63171b; color: #feb2b2; }
    .sw { margin-left: auto; position: relative; width: 40px; height: 22px; flex: none; cursor: pointer; }
    .sw input { opacity: 0; width: 0; height: 0; position: absolute; }
    .sw span { position: absolute; inset: 0; border-radius: 11px; background: #4a5568; transition: background .15s; }
    .sw span::after { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .15s; }
    .sw input:checked + span { background: #319795; } .sw input:checked + span::after { transform: translateX(18px); }
    .ds { color: #a0aec0; margin: 6px 0 0 32px; line-height: 1.5; }
    details { margin: 6px 0 0 32px; } summary { cursor: pointer; color: #4FD1C5; font-size: 12px; user-select: none; }
    ul { margin: 6px 0 0; padding-left: 18px; color: #cbd5e0; line-height: 1.6; } li { margin: 1px 0; }
    .ft { padding: 10px 14px 14px; color: #a0aec0; font-size: 12px; line-height: 1.6; border-top: 1px solid #2d3748; }
    .ft .acts { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .btn { border: 1px solid #2d3748; background: #2d3748; color: #e2e8f0; padding: 5px 12px; border-radius: 7px; cursor: pointer; font-size: 12px; }
    .btn[disabled] { opacity: .45; cursor: default; }
  `;
  let root, pan, fab;
  const openFeats = new Set();
  function build() {
    if (root) return;
    const host = document.createElement('div');
    host.id = 'md-toolbox';
    document.documentElement.appendChild(host);
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style>
      <button class="fab" title="我的同人工具箱：查看功能、開關"><img src="${ICON}" alt="工具箱"></button>
      <div class="pan" role="dialog" aria-label="我的同人工具箱"></div>`;
    fab = root.querySelector('.fab');
    pan = root.querySelector('.pan');
    fab.addEventListener('click', () => toggle());
    pan.addEventListener('change', e => {
      const id = e.target.dataset && e.target.dataset.id;
      if (!id) return;
      setOn(id, e.target.checked);
      paint();
    });
    pan.addEventListener('toggle', e => {
      const d = e.target;
      if (d.dataset && d.dataset.id) { if (d.open) openFeats.add(d.dataset.id); else openFeats.delete(d.dataset.id); }
    }, true);
    pan.addEventListener('click', e => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'close') toggle(false);
      if (a.dataset.act === 'all') { MODS.forEach(m => setOn(m.id, true)); paint(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
    document.addEventListener('pointerdown', e => { if (pan.classList.contains('show') && !e.composedPath().includes(host)) toggle(false); }, true);
    paint();
  }
  function toggle(force) {
    const show = force === undefined ? !pan.classList.contains('show') : force;
    pan.classList.toggle('show', show);
    fab.classList.toggle('open', show);
    if (show) paint();
  }
  function paint() {
    const cards = MODS.map(m => {
      const on = ctxs[m.id].on;
      const st = status[m.id] === 'err' ? '<span class="st err">啟動失敗</span>'
        : on ? '<span class="st on">開啟</span>' : '<span class="st off">關閉</span>';
      return `<div class="card${on ? '' : ' off'}">
        <div class="row"><span class="ic">${m.icon}</span><span class="nm">${esc(m.name)}</span><span class="ver">v${esc(m.ver)}</span>${st}
          <label class="sw" title="${on ? '關閉' : '開啟'}「${esc(m.name)}」"><input type="checkbox" data-id="${m.id}" ${on ? 'checked' : ''}><span></span></label></div>
        <div class="ds">${esc(m.desc)}</div>
        <details data-id="${m.id}"${openFeats.has(m.id) ? ' open' : ''}><summary>全部功能（${m.feats.length}）</summary><ul>${m.feats.map(f => `<li>${esc(f)}</li>`).join('')}</ul></details>
      </div>`;
    }).join('');
    const anyOff = MODS.some(m => !ctxs[m.id].on);
    pan.innerHTML = `<div class="hd"><img src="${ICON}" alt=""><b>我的同人工具箱</b><small>v${esc(TK_VER)}</small><button class="x" data-act="close" title="關閉">✕</button></div>
      ${cards}
      <div class="ft">開關<b>立即生效</b>，不用重新整理；設定存在這個瀏覽器裡。
        <div class="acts"><button class="btn" data-act="all" ${anyOff ? '' : 'disabled'}>全部開啟</button></div></div>`;
  }
  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build, { once: true });
})();