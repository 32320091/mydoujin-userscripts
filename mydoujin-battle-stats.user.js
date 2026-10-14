// ==UserScript==
// @name         我的同人｜戰報統計面板
// @namespace    mydoujin-battle-stats
// @version      1.13.0
// @description  在戰報頁顯示玩家與 BOSS 的造成傷害、幸運傷害、總計傷害、承受傷害、回復血量、回復 SP、每人爆擊率，以及燒掉的生命上限、角色特殊迴避、中毒／出血／凍傷等異常狀態與反傷；並自動累積逐筆傷害樣本與 BOSS 圖鑑（數值＋使用過的技能），可匯出 CSV
// @match        https://mydoujin.online/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const API = 'https://mydoujin-backend.onrender.com';
  const cache = new Map();   // reportId -> 戰報 JSON
  const errors = {};
  const pending = new Set();
  let currentId = null;
  let host = null, root = null;
  let statusText = '';
  const state = { menu: false,
    mode: 'shown',                     // 固定用戰報文字上的數字（已移除「實際扣血」切換）
    collapsed: load('collapsed', false),
    hidden: false,
    pos: load('pos', null),
    open: {},
  };

  function load(k, d) { try { const v = localStorage.getItem('mdbs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('mdbs:' + k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- 攔截網站自己抓戰報的請求，不額外打 API ---------- */
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

  /* ---------- 統計 ---------- */
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
      simmer: null,   // 西米（死靈廚師）專屬：番茄湯、臭臭茶放屁、回收桶
      luck: 0, luckN: 0, luckTaken: 0, luckTakenN: 0,
      heal: 0, healRecv: 0, sp: 0, spRecv: 0,
      crit: 0, hitN: 0, blockedN: 0, maxHit: 0, missN: 0, dodgeN: 0,
      hpLeft: null, hpMax: null, dead: false,
      burn: 0, burnN: 0,
      attackedN: 0, specialN: 0, special: {},
      dot: {}, dotTaken: {},   // 持續傷害／異常狀態：{ 名稱: { dmg, n, restore, rn } }
      passiveDot: {}, passiveTaken: {},   // 被動反傷
      // 召喚物（例：菠蘿頭的影分身）。分身是獨立行動者，但算在召喚者同一陣營
      isSummon: false, ownerId: null, ownerName: '', summonSkill: '', summonN: 0, summons: [],
    };
  }

  const escRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 一般閃避：「…被 角色名 躲開了／閃開了」，灰燼的「被 灰燼 用翻滾躲開了」也算一般閃避
  // 其他灰色（閃避色）紀錄算角色特殊迴避，例如「用翻滾的無敵幀躲開了」「攻擊穿過亡靈史內趴」
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

    /* 召喚物：戰報把分身當成獨立行動者（actorId = summon_1），participants 裡沒有它。
       先掃一遍 SUMMON 紀錄，把它登記成召喚者「同陣營」的單位，否則會被丟進「其他」而不計入我方輸出。
       例：菠蘿頭 shadow_clone_jutsu →「菠蘿頭的影分身 從白煙裡滾了出來。」
       實測分身的能力值＝本體（同技能非爆擊均傷 237 vs 251、爆擊 951 vs 958），
       但 HP 上限只有 1，被打中就消失（戰報會寫 4075 點傷害但 actualDamage 只有 1）。 */
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
      if (owner && u.luk == null) u.luk = owner.luk;          // 分身沿用本體能力值
      if (owner && owner.summons.indexOf(u) < 0) owner.summons.push(u);
    });

    /* 持續傷害（BUFF_EFFECT）：紀錄裡只寫了「誰被扣血」，要自己找出是誰放的 */
    const buffSrc = {};          // 受害者 id -> { buffId: 施放者 id }
    const applyLog = [];         // BUFF_APPLY 紀錄，用來比對狀態名稱（例如「酸蝕」）
    const prefixOwner = {};      // 技能 id 前綴 -> 使用者（viper_decay ↔ viper_poison_cloud）
    const lastDotSrc = {};       // 受害者|名稱 -> 施放者
    let lastZoneEnd = '';        // 最近一個散去的毒氣區域（腐蝕毒霧／毒雲瘴壁／蝮蛇領域…）
    const pending = {};          // 受害者 id -> { 衰變名稱: 上次回復後累積的衰變 }
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

    /* 異常狀態傷害：型別是 DAMAGE 但沒有 skillId，靠 source / passiveId / 訊息判斷
       例：壺頭哥「積累的傷口一齊裂開…血如泉湧」＝出血、「霜華自骨縫裡炸開…凍傷了」＝凍傷
       這類傷害不會爆擊，處理方式比照薇蝮的毒（BUFF_EFFECT）：算進造成傷害，但獨立列出、不進爆擊率分母 */
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

    /* 西米（simmer）：
       - 番茄湯：上菜時立即回 智力×0.9（HEAL，skillId simmer_cook），之後每跳 智力×0.15（BUFF_EFFECT，buffId simmer_dish_tomato_soup，
         actorId 是喝湯的人）。持續回復算回西米身上，西米倒下後還在跳的也算，另外標出來。
       - 臭臭茶：喝過的隊友被打時「憋不住放了一個屁」反打攻擊者（DAMAGE，source SIMMER_FART，actorId 是西米），傷害看西米智力。
       - 回收桶（被動 simmer_recycle_bin）：只算「X 被這一擊打進了回收桶」那一句（掀蓋子、台詞都不算），
         接著那筆「從桶裡爬了出來…恢復了 N HP」（HEAL，skillId simmer_recycle_bin）記成這次救回的血。 */
    const simOf = u => u.simmer || (u.simmer = { soupNow: 0, soupNowN: 0, soupTick: 0, soupTickN: 0, soupAfterDeath: 0, soupBy: {}, fart: 0, fartN: 0, fartBy: {}, bin: [], binHeal: 0 });
    const lastDish = {};          // 隊友 id → 最後端給他的料理名稱
    const soupOwner = {};         // 喝湯的人 id → 端湯的西米
    let simmerUnit = null;

    // 只有普攻／技能／反擊會判定爆擊；異常狀態與反傷不會，不能算進爆擊率分母
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
          if (a && t && a.side !== t.side) {   // 只記對手上的狀態，自己給自己的增益不算
            (buffSrc[t.id] = buffSrc[t.id] || {})[l.buffId || ''] = a.id;
            applyLog.push({ victim: t.id, actor: a.id, msg: String(l.message || '') });
          }
          break;
        case 'BUFF_EFFECT': {
          // actorId = 被影響的人（例如「桐人 在毒雲瘴壁中衰變，失去了 278 點生命」）
          const msg = String(l.message || '');
          if (!a || !v) break;
          if (l.buffId === 'simmer_dish_tomato_soup' || (/番茄湯/.test(msg) && /恢復|回復/.test(msg))) {
            a.healRecv += v;
            const cook = soupOwner[a.id] || simmerUnit;
            if (cook) {
              cook.heal += v;
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
          // 有些反擊（例如盾反）後面還會另外記一筆 isCounter 的 DAMAGE，避免重複計算
          let dup = false;
          for (let j = i + 1; j < Math.min(logs.length, i + 6); j++) {
            const x = logs[j];
            if (x && (x.type === 'DAMAGE' || x.type === 'BLOCK') && x.isCounter && (num(x.value) === v || x.actorId === l.actorId)) { dup = true; break; }
          }
          if (!dup) hit(a, t, v, v, 'counter', l);
          break;
        }
        case 'LUCK_EVENT': {
          // actorId/targetId = 被砸中的人；opponentId = 觸發幸運事件的對手
          const src = get(l.opponentId);
          if (src) { src.luck += v; src.luckN++; }
          if (t) { t.luckTaken += v; t.luckTakenN++; t.taken.real += v; t.taken.shown += v; }
          break;
        }
        case 'HEAL': {
          const msg = String(l.message || '');
          // 「桐人 離開毒氣，衰變的傷勢回復了 834 HP」：不是桐人自己的治療，而是把衰變扣掉的血還回來
          if (!l.skillId && /離開毒氣|衰變的傷勢/.test(msg)) {
            const victim = t || a;
            if (!victim) break;
            victim.healRecv += v;
            // 規則（3 場戰報驗證）：回復＝上次回復後累積衰變的一半（捨去），但不會超過當下缺的血量
            // 多種毒氣重疊時，依各自累積的衰變比例分攤這次回復
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
          if (a) a.heal += v;
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
          // 少數技能只把回復寫在文字裡（例如芙莉蓮解除魔力限制「恢復了 12 SP」）
          const msg = String(l.message || '');
          const ms = msg.match(/恢復了\s*(\d+)\s*SP/);
          if (ms && a) { a.sp += num(ms[1]); a.spRecv += num(ms[1]); }
          const mh = msg.match(/恢復了\s*(\d+)\s*HP/);
          if (mh && a) { a.heal += num(mh[1]); a.healRecv += num(mh[1]); }
          // 燒生命上限（例如酷拉皮卡緋紅眼「燃燒掉 174 點生命上限」），整場戰鬥不會回來
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
    return units;
  }

  /* ---------- 傷害樣本累積（給傷害／爆擊／命中公式迴歸用） ----------
     每看過一份戰報就把逐筆傷害存進 localStorage，同一份戰報只會存一次。
     欄位刻意包含「段」（第N擊）與攻守雙方九項能力，因為多段技能每段基礎值差很多，
     不分段做迴歸會被雜訊蓋掉。 */
  const SAMP_KEY = 'mdbs:samples', SAMP_IDS = 'mdbs:sampleIds';
  const SAMP_MAX = 30000, SAMP_ID_MAX = 3000;
  const SAMP_COLS = ['戰報', '時間', '類型', '技能', '階級', '段', '來源', '被動',
    '攻方', '攻方等級', '攻擊', '智力', '技巧', '敏捷', '速度', '體力', '幸運',
    '守方', '守方防禦', '守方等級', '戰報傷害', '實際扣血', '爆擊', '格擋', '普攻', '反擊'];
  let SAMP_N = -1;

  function loadSamples() { try { return JSON.parse(localStorage.getItem(SAMP_KEY) || '[]'); } catch (e) { return []; } }
  function loadSampledIds() { try { return JSON.parse(localStorage.getItem(SAMP_IDS) || '[]'); } catch (e) { return []; } }
  function sampleCount() { if (SAMP_N < 0) SAMP_N = loadSamples().length; return SAMP_N; }

  function collectSamples(id, rep) {
    const key = String(id);
    const ids = loadSampledIds();
    if (ids.indexOf(key) >= 0) return;
    const P = rep.participants || {};
    const S = {}, NM = {}, LV = {};
    [...(P.players || []), ...(P.enemies || [])].forEach(p => {
      const k = p.userId || p.entityId || p._id || p.name;
      S[k] = p.stats || {}; NM[k] = p.characterName || p.name || '?';
      LV[k] = p.level == null ? '' : p.level;
    });
    // 召喚物（分身）：participants 裡沒有，能力值沿用召喚者，名稱用戰報寫的分身名以便迴歸時分開
    (rep.logs || []).forEach(l => {
      if (!l || l.type !== 'SUMMON' || !l.targetId) return;
      const o = l.actorId;
      if (S[o] && !S[l.targetId]) { S[l.targetId] = S[o]; LV[l.targetId] = LV[o]; }
      const mn = String(l.message || '').match(/^\s*(\S+?)\s/);
      NM[l.targetId] = (mn && mn[1]) || ((NM[o] || '') + '的分身');
    });
    const ts = rep.createdAt || '';
    const rows = [];
    (rep.logs || []).forEach(l => {
      if (!l || typeof l !== 'object') return;
      const ty = l.type;
      if (ty !== 'DAMAGE' && ty !== 'BLOCK' && ty !== 'COUNTER' && ty !== 'MISS' && ty !== 'LUCK_EVENT') return;
      // 幸運事件的 actorId 是被砸中的人，真正的來源是 opponentId
      const aid = ty === 'LUCK_EVENT' ? l.opponentId : l.actorId;
      const tid = l.targetId || (ty === 'LUCK_EVENT' ? l.actorId : null);
      const a = S[aid], t = S[tid];
      if (!a && !t) return;
      const v = num(l.value);
      const real = l.actualDamage != null ? num(l.actualDamage) : v;
      const msg = String(l.message || '');
      const seg = (msg.match(/第\s*(\d+)\s*[擊道發]/) || [])[1] || '';
      rows.push([key, ts, ty, l.skillId || '', l.skillTier || '', seg, l.source || '', l.passiveId || '',
        NM[aid] || '', LV[aid] == null ? '' : LV[aid],
        a ? num(a.atk) : '', a ? num(a.int) : '', a ? num(a.tec) : '', a ? num(a.agi) : '',
        a ? num(a.spd) : '', a ? num(a.sta) : '', a ? num(a.luk) : '',
        NM[tid] || '', t ? num(t.def) : '', LV[tid] == null ? '' : LV[tid],
        ty === 'MISS' ? 0 : v, ty === 'MISS' ? 0 : real,
        l.isCrit ? 1 : 0, (l.blocked || ty === 'BLOCK') ? 1 : 0, l.isNormalAttack ? 1 : 0, l.isCounter ? 1 : 0]);
    });
    let all = loadSamples().concat(rows);
    if (all.length > SAMP_MAX) all = all.slice(all.length - SAMP_MAX);
    ids.push(key);
    const idArr = ids.length > SAMP_ID_MAX ? ids.slice(ids.length - SAMP_ID_MAX) : ids;
    if (!writeSamples(all, idArr)) {
      // 空間不足：砍掉最舊的一半再試一次
      const half = all.slice(Math.floor(all.length / 2));
      if (writeSamples(half, idArr)) all = half; else return;
    }
    SAMP_N = all.length;
  }

  function writeSamples(all, idArr) {
    try {
      localStorage.setItem(SAMP_KEY, JSON.stringify(all));
      localStorage.setItem(SAMP_IDS, JSON.stringify(idArr));
      return true;
    } catch (e) { return false; }
  }

  /* ---------- BOSS 圖鑑累積 ----------
     每看過一份 BOSS 戰報，就把王的樓層、等級、九項能力與「牠用過的每一個技能」存進 localStorage。
     同一份戰報只會併入一次；技能以 skillId（被動用 passiveId）為鍵累積次數／傷害／爆擊。 */
  const BOSS_KEY = 'mdbs:bossdex', BOSS_IDS = 'mdbs:bossdexIds';
  const BOSS_COLS = ['樓層', '名稱', '稱號', '等級', 'HP', '攻擊', '防禦', '體力', '敏捷', '反應速度', '技巧', '智力', '幸運',
    '取樣場次', '技能ID', '招式名', '類型', '反擊', '使用次數', '造成傷害次數', '平均傷害', '最大傷害', '爆擊次數'];
  let BOSS_N = -1;

  function loadDex() { try { return JSON.parse(localStorage.getItem(BOSS_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function loadDexIds() { try { return JSON.parse(localStorage.getItem(BOSS_IDS) || '[]'); } catch (e) { return []; } }
  function bossCount() { if (BOSS_N < 0) BOSS_N = Object.keys(loadDex()).length; return BOSS_N; }

  function collectBosses(id, rep) {
    const en = rep && rep.participants && rep.participants.enemies;
    if (!Array.isArray(en) || !en.length) return;
    const ids = loadDexIds();
    const key = String(id);
    if (ids.indexOf(key) >= 0) return;
    const dex = loadDex();
    const map = {};
    let touched = false;
    en.forEach(e => {
      if (!e || !e.stats || !(e.entityId || e.monsterId)) return;
      const mk = e.monsterId || e.name;
      map[e.entityId || e._id] = mk;
      const b = dex[mk] || (dex[mk] = { 名稱: e.name, 稱號: e.title || '', 樓層: {}, 等級: e.level, 數值: e.stats, 技能: {}, 場次: 0 });
      b.名稱 = e.name; if (e.title) b.稱號 = e.title;
      if (e.level != null) b.等級 = e.level;
      if (e.stats) b.數值 = e.stats;
      if (e.floor != null) b.樓層[e.floor] = (b.樓層[e.floor] || 0) + 1;
      b.場次++; touched = true;
    });
    if (!touched) return;
    (rep.logs || []).forEach(l => {
      const mk = map[l.actorId];
      if (!mk) return;
      const sid = l.skillId || (l.passiveId ? '被動:' + l.passiveId : null);
      if (!sid) return;
      const b = dex[mk];
      const t = b.技能[sid] || (b.技能[sid] = { n: 0, dn: 0, sum: 0, max: 0, crit: 0, 普攻: false, 反擊: false, 名: '' });
      t.n++;
      if (l.isNormalAttack) t.普攻 = true;
      if (l.isCounter) t.反擊 = true;
      if (l.isCrit) t.crit++;
      if (l.type === 'DAMAGE') { const v = num(l.value); t.dn++; t.sum += v; if (v > t.max) t.max = v; }
      if (!t.名 && l.message) {
        const m = String(l.message).match(new RegExp('^' + escRe(String(b.名稱 || '')) + '\\s*(.{2,20}?)[，,、：:]'));
        if (m) t.名 = m[1];
      }
    });
    ids.push(key);
    const idArr = ids.length > SAMP_ID_MAX ? ids.slice(ids.length - SAMP_ID_MAX) : ids;
    try {
      localStorage.setItem(BOSS_KEY, JSON.stringify(dex));
      localStorage.setItem(BOSS_IDS, JSON.stringify(idArr));
      BOSS_N = Object.keys(dex).length;
    } catch (e) {}
  }

  function exportDex() {
    const dex = loadDex();
    const keys = Object.keys(dex);
    if (!keys.length) return 0;
    const rows = [];
    keys.map(k => dex[k])
      .sort((a, b) => (Math.min.apply(null, Object.keys(a.樓層).map(Number).concat([9999]))) - (Math.min.apply(null, Object.keys(b.樓層).map(Number).concat([9999]))) || String(a.名稱).localeCompare(String(b.名稱)))
      .forEach(b => {
        const f = Object.keys(b.樓層).map(Number).sort((x, y) => x - y).join('/');
        const s2 = b.數值 || {};
        const base = [f, b.名稱, b.稱號, b.等級, s2.hp, s2.atk, s2.def, s2.sta, s2.agi, s2.spd, s2.tec, s2.int, s2.luk, b.場次];
        const sk = Object.entries(b.技能).sort((x, y) => y[1].n - x[1].n);
        if (!sk.length) { rows.push(base.concat(['', '', '', '', '', '', '', '', ''])); return; }
        sk.forEach(([sid, t]) => rows.push(base.concat([sid, t.名, t.普攻 ? '普攻' : (sid.indexOf('被動:') === 0 ? '被動' : '技能'),
          t.反擊 ? 'Y' : '', t.n, t.dn, t.dn ? Math.round(t.sum / t.dn) : '', t.max, t.crit])));
      });
    const q = x => { const v = String(x == null ? '' : x); return /[",\n]/.test(v) ? '"' + v.split('"').join('""') + '"' : v; };
    const csv = '\ufeff' + [BOSS_COLS.join(',')].concat(rows.map(r => r.map(q).join(','))).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const d = new Date();
    const p2 = x => String(x).padStart(2, '0');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mydoujin_bossdex_' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '_' + keys.length + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    return keys.length;
  }

  function exportSamples() {
    const rows = loadSamples();
    if (!rows.length) return 0;
    const q = x => { const v = String(x == null ? '' : x); return /[",\n]/.test(v) ? '"' + v.split('"').join('""') + '"' : v; };
    const csv = '﻿' + [SAMP_COLS.join(',')].concat(rows.map(r => r.map(q).join(','))).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const d = new Date();
    const p2 = x => String(x).padStart(2, '0');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mydoujin_damage_samples_' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '_' + rows.length + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    return rows.length;
  }

  /* ---------- UI ---------- */
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RESULT = { WIN: '勝利', LOSE: '敗北', DRAW: '平手' };

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .panel { position: fixed; z-index: 2147483000; width: 940px; max-width: calc(100vw - 32px); max-height: calc(100vh - 24px);
    display: flex; flex-direction: column; background: #171c27; color: rgba(255,255,255,.88); border: 1px solid #3a4558; border-radius: 12px;
    box-shadow: 0 14px 40px rgba(0,0,0,.55); font: 14px/1.5 "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; overflow: hidden; }
  .hd { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: linear-gradient(180deg,#1f2636,#191f2c);
    border-bottom: 1px solid #2d3748; cursor: move; user-select: none; }
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
  .menu { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; background: #121722; border-bottom: 1px solid #2d3748; }
  .menu button { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; padding: 6px 12px; }
  .menu button em { font-style: normal; color: #4FD1C5; font-weight: 700; font-variant-numeric: tabular-nums; }
  .menu button.warn { color: #f6878b; border-color: rgba(246,135,139,.45); margin-left: auto; }
  .menu button.warn:hover { background: rgba(246,135,139,.12); }
  .bd { overflow: auto; padding: 10px 12px 14px; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .side { margin-bottom: 14px; }
  .side-hd { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-weight: 700; color: #e2c897; margin: 2px 2px 6px; }
  .side-hd span { font-weight: 400; color: #8b98ad; font-size: 12px; text-align: right; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #2d3748; border-radius: 8px; overflow: hidden; }
  th, td { padding: 7px 9px; border-bottom: 1px solid rgba(255,255,255,.06); white-space: nowrap; }
  th { font-size: 12px; font-weight: 600; color: #8b98ad; text-align: right; background: #1f2636; position: sticky; top: 0; }
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
  .bar { height: 4px; border-radius: 2px; background: rgba(79,209,197,.13); margin-top: 3px; overflow: hidden; }
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
  .panel.mob .ttlw { flex-direction: column; gap: 0; align-items: flex-start; }
  .panel.mob .sub { max-width: 100%; }
  .panel.mob .tools button { font-size: 16px; padding: 6px 12px; min-width: 40px; }
  .panel.mob .menu button { flex: 1 1 30%; justify-content: center; font-size: 13px; padding: 9px 6px; margin-left: 0; }
  .panel.mob .tools button.ib { width: 40px; height: 36px; font-size: 17px; }
  .panel.mob .bd { padding: 8px 10px 16px; }
  .card { background: #1f2636; border: 1px solid #2d3748; border-radius: 10px; padding: 10px 11px; margin-bottom: 8px; cursor: pointer; }
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
  // 2026-09-23 以 51 場戰報、2348 次判定迴歸：爆擊率 = 幸運 ÷（幸運 + 318），95% CI K=[289,350]
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
        ${item('受到治療', fmt(u.healRecv))}
        ${item('獲得 SP', fmt(u.spRecv))}
      </div>${dotList(u.dot, '異常狀態／持續傷害（這個角色造成的）')}${dotList(u.dotTaken, '受到的異常狀態／持續傷害')}${dotList(u.passiveDot, '反傷（這個角色造成的）')}${dotList(u.passiveTaken, '受到的反傷')}${simmerList(u)}${specialList(u)}`;
  }

  // 電腦：表格的一列
  function unitRows(u, sideTot, mode) {
    const dmg = u.dealt[mode], tot = dmg + u.luck, take = u.taken[mode];
    const pct = sideTot > 0 ? tot / sideTot * 100 : 0;
    const key = u.id;
    const { tags, subline } = unitHead(u);
    const bst = u.isBoss && u.stats ? `<tr class="bst" data-key="${esc(key)}"><td colspan="8">${esc(statLine(u.stats))}</td></tr>` : '';
    let html = `<tr class="u${bst ? ' hasbst' : ''}${state.open[key] ? ' open' : ''}" data-key="${esc(key)}">
      <td class="nm"><span class="arw">${state.open[key] ? '▾' : '▸'}</span>${esc(u.name)}${tags}<small>${esc(subline)}</small></td>
      ${cell(dmg, 'c-dmg')}${cell(u.luck, 'c-luck')}
      <td class="c-tot${tot ? '' : ' zero'}">${fmt(tot)} <span class="pct">${pct.toFixed(1)}%</span><div class="bar"><i style="width:${Math.min(100, pct).toFixed(1)}%"></i></div></td>
      ${cell(take, 'c-take')}${cell(u.heal, 'c-heal')}${cell(u.sp, 'c-sp')}${critCell(u.crit, u.hitN)}
    </tr>` + bst;
    if (state.open[key]) html += `<tr class="det"><td colspan="8">${detHtml(u, mode)}</td></tr>`;
    return html;
  }

  // 手機：每個角色一張卡片，主數字放大，其他數字排成格子；點卡片展開細項
  function unitCard(u, sideTot, mode) {
    const dmg = u.dealt[mode], tot = dmg + u.luck, take = u.taken[mode];
    const pct = sideTot > 0 ? tot / sideTot * 100 : 0;
    const key = u.id, open = !!state.open[key];
    const { tags, subline } = unitHead(u);
    const st = (label, v, cls) => `<div class="cs ${cls}${v ? '' : ' zero'}"><span>${label}</span><b>${fmt(v)}</b></div>`;
    return `<div class="card${open ? ' open' : ''}" data-key="${esc(key)}">
      <div class="c-top">
        <div class="c-nm"><b>${esc(u.name)}</b>${tags}${subline ? `<small>${esc(subline)}</small>` : ''}</div>
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

  /* 西米專屬：番茄湯（立即＋持續，逐位隊友）、臭臭茶放屁（逐位喝茶的隊友）、回收桶 */
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

  function sideTable(rep, units, side, mode) {
    const list = units.filter(u => u.side === side);
    if (!list.length) return '';
    const S = list.reduce((s, u) => {
      s.dmg += u.dealt[mode]; s.luck += u.luck; s.take += u.taken[mode]; s.heal += u.heal; s.sp += u.sp;
      s.crit += u.crit; s.hitN += u.hitN; return s;
    }, { dmg: 0, luck: 0, take: 0, heal: 0, sp: 0, crit: 0, hitN: 0 });
    const tot = S.dmg + S.luck;
    list.sort((a, b) => (b.dealt[mode] + b.luck) - (a.dealt[mode] + a.luck));
    return `<div class="side">
      <div class="side-hd">${sideLabel(rep, side)}<span>${list.length} 名・點角色列看細項</span></div>
      <table><thead><tr>
        <th>角色</th><th>造成傷害</th><th>幸運傷害</th><th>總計傷害</th><th>承受傷害</th><th>回復血量</th><th>回復SP</th><th>爆擊率</th>
      </tr></thead><tbody>
        ${list.map(u => unitRows(u, tot, mode)).join('')}
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
    return `<div class="side">
      <div class="side-hd">${sideLabel(rep, side)}<span>${list.length} 名${list.length > 1 ? `・總計 ${fmt(tot)}・承受 ${fmt(S.take)}${S.heal ? '・回血 ' + fmt(S.heal) : ''}` : ''}</span></div>
      ${list.map(u => unitCard(u, tot, mode)).join('')}
    </div>`;
  }

  // 窄螢幕（手機直拿）改用卡片＋底部抽屜；轉橫或電腦就回到表格
  const narrow = () => { try { return matchMedia('(max-width: 640px)').matches; } catch (e) { return false; } };
  let wasNarrow = null;
  window.addEventListener('resize', () => { const n = narrow(); if (n !== wasNarrow && currentId) render(); });

  function render() {
    if (!currentId) return;
    mount();
    if (!root) return;
    const mob = narrow();
    wasNarrow = mob;
    const pos = state.pos;
    const posStyle = mob ? '' : pos
      ? `left:${Math.max(0, Math.min(pos.left, document.documentElement.clientWidth - 160))}px;top:${Math.max(0, Math.min(pos.top, document.documentElement.clientHeight - 40))}px;`
      : 'right:16px;top:72px;';
    if (state.hidden) {
      root.innerHTML = `<style>${CSS}</style><button class="fab${mob ? ' m' : ''}" data-act="show">📊 戰報統計</button>`;
      return;
    }
    const rep = cache.get(currentId);
    const mode = state.mode;
    let sub = '#' + currentId, body;
    if (rep) {
      try { collectSamples(currentId, rep); } catch (e) {}
      try { collectBosses(currentId, rep); } catch (e) {}
      const units = analyze(rep);
      const t = rep.createdAt ? new Date(rep.createdAt).toLocaleString() : '';
      sub = `#${currentId}・${rep.battleType || ''}・${RESULT[rep.result] || rep.result || ''}・${t}`;
      const fn = mob ? sideCards : sideTable;
      body = fn(rep, units, 'A', mode) + fn(rep, units, 'B', mode) + fn(rep, units, 'C', mode);
    } else if (errors[currentId]) {
      body = `<div class="msg err">${esc(errors[currentId])}</div>`;
    } else {
      body = `<div class="msg">${esc(statusText || '等待戰報資料…')}</div>`;
    }
    const col = state.collapsed;
    const menuBar = `
            <button data-act="export" title="匯出累積的逐筆傷害樣本（CSV，給傷害公式迴歸用）">📦 匯出樣本 <em>${sampleCount()}</em></button>
            <button data-act="dex" title="匯出累積的 BOSS 圖鑑（樓層、數值、用過的技能）">👑 匯出王鑑 <em>${bossCount()}</em></button>
            <button data-act="purge" class="warn" title="清空累積的傷害樣本（要按兩次）">🗑 清空樣本</button>`;
    root.innerHTML = `<style>${CSS}</style>
      <div class="panel${mob ? ' mob' : ''}${col ? ' col' : ''}" style="${posStyle}">
        <div class="hd"${mob ? ' data-act="collapse"' : ' data-drag="1"'}>
          ${mob ? '<span class="grab"></span>' : ''}
          <div class="ttlw"><span class="ttl">📊 戰報統計</span>${col ? '' : `<span class="sub">${esc(sub)}</span>`}</div>
          <div class="tools">
            ${col ? '' : `<button data-act="menu" class="ib${state.menu ? ' on' : ''}" title="樣本／王鑑／清空">⋯</button>`}
            <button data-act="collapse" class="ib" title="${col ? '展開' : '收合'}">${col ? (mob ? '▴' : '＋') : (mob ? '▾' : '－')}</button>
            <button data-act="hide" class="ib" title="縮成小按鈕">✕</button>
          </div>
        </div>
        ${state.menu && !col ? `<div class="menu">${menuBar}</div>` : ''}
        ${col ? '' : `<div class="bd">${body}</div>`}
      </div>`;
  }

  function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      const act = btn.dataset.act;
      if (act === 'export') {
        const n2 = exportSamples();
        btn.textContent = n2 ? '已匯出 ' + n2 : '沒有樣本';
        setTimeout(() => { if (btn.isConnected) render(); }, 1800);
      }
      else if (act === 'dex') {
        const n3 = exportDex();
        btn.textContent = n3 ? '已匯出 ' + n3 : '還沒有王';
        setTimeout(() => { if (btn.isConnected) render(); }, 1800);
      }
      else if (act === 'purge') {
        if (btn.dataset.sure === '1') {
          try { localStorage.removeItem(SAMP_KEY); localStorage.removeItem(SAMP_IDS); } catch (e) {}
          SAMP_N = 0; render();
        } else {
          btn.dataset.sure = '1'; btn.textContent = '⚠ 再按一次確認清空';
          setTimeout(() => { if (btn.isConnected) { btn.dataset.sure = ''; btn.textContent = '🗑 清空樣本'; } }, 3000);
        }
      }
      else if (act === 'collapse') { if (e.target.closest('button') && e.target.closest('button') !== btn) return; state.collapsed = !state.collapsed; if (state.collapsed) state.menu = false; save('collapsed', state.collapsed); render(); }
      else if (act === 'menu') { state.menu = !state.menu; render(); }
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
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = ev => {
      const left = Math.max(0, Math.min(window.innerWidth - 80, ev.clientX - dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dy));
      panel.style.left = left + 'px'; panel.style.top = top + 'px'; panel.style.right = 'auto';
      state.pos = { left: Math.round(left), top: Math.round(top) };
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (state.pos) save('pos', state.pos); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  }

  /* ---------- SPA 路由監聽 ---------- */
  function routeId() { const m = location.pathname.match(/^\/reports\/(\d+)\/?$/); return m ? m[1] : null; }
  function onRoute() {
    if (!document.body) return;
    const id = routeId();
    if (id === currentId) return;
    currentId = id;
    state.open = {};
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
})();
