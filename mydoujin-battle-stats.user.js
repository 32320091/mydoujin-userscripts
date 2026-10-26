// ==UserScript==
// @name         我的同人｜戰報統計面板
// @namespace    mydoujin-battle-stats
// @version      1.23.0
// @description  在戰報頁顯示玩家與 BOSS 的造成傷害、幸運傷害、總計傷害、承受傷害、回復血量、回復 SP、每人爆擊率，以及燒掉的生命上限、角色特殊迴避、中毒／出血／凍傷等異常狀態與反傷
// @match        https://mydoujin.online/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';
  // 工具箱開關：裝在「我的同人工具箱」裡時可即時開關；單獨安裝時永遠開啟
  const tk = (typeof TK === 'object' && TK) || { on: true, onToggle() {} };

  const API = 'https://mydoujin-backend.onrender.com';
  const cache = new Map();   // reportId -> 戰報 JSON
  const errors = {};
  const pending = new Set();
  let currentId = null;
  let host = null, root = null;
  let statusText = '';
  const state = {
    mode: 'shown',
    collapsed: load('collapsed', false),
    fit: load('fit', true),            // 自動縮放：整個面板縮到一個視窗看得完
    sideView: 'all',                   // 顯示哪一邊：all／A（玩家）／B（BOSS／對手）／C（其他）
    view: load('view', 'detail'),       // simple = 簡易（總計／承受／回血），detail = 詳細（全部欄位＋點開細項）
    hidden: false,
    pos: load('pos', null),
    size: load('size', null),          // 手動拖曳的大小 {w, h}；null＝預設大小＋自動縮放
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

  // 名字前面帶一整句台詞的（「一隻小小的白鳥從收容單元的門縫裡鑽了出來。懲戒鳥」）只留句號後面的名字；完整名字放在滑鼠提示
  const shortName = n => { const s2 = String(n || '').split(/[。！？!?]/).map(x => x.trim()).filter(Boolean); return s2.length ? s2[s2.length - 1] : String(n || ''); };
  function newUnit(p, side) {
    const full = p.characterName || p.name || '?';
    return {
      id: p.userId || p.entityId || p._id || p.name,
      side,
      name: shortName(full),
      full,
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
      byKind: { normal: { real: 0, shown: 0, n: 0 }, skill: { real: 0, shown: 0, n: 0 }, counter: { real: 0, shown: 0, n: 0 }, dot: { real: 0, shown: 0, n: 0 }, passive: { real: 0, shown: 0, n: 0 }, fart: { real: 0, shown: 0, n: 0 }, finale: { real: 0, shown: 0, n: 0 } },
      simmer: null,   // 西米（死靈廚師）專屬：番茄湯、臭臭茶放屁、回收桶
      luck: 0, luckN: 0, luckTaken: 0, luckTakenN: 0,
      heal: 0, healTeam: 0, healSolo: 0, selfHeal: {}, healRecv: 0, sp: 0, spRecv: 0,   // healTeam＝治療技能（補隊友、或能補隊友的技能補到自己）、healSolo＝只能補自己（吸血、自補）
      crit: 0, hitN: 0, blockedN: 0, maxHit: 0, missN: 0, dodgeN: 0,
      hpLeft: null, hpMax: null, dead: false, deathN: 0,
      revN: 0, revBy: {}, revivedN: 0, finaleBy: {},   // 把倒下的隊友拉起來（例：初音 Chance Time「跟著歌聲重新站了起來」）／自己被拉起來幾次
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

  // 會補隊友的治療技能（就算這次剛好補到自己也算治療技能）：希露菲治癒魔術／無詠唱治癒、西米料理、回收桶；
  // 其他技能只要同一場有補過別人也會自動算進來（例如酷拉皮卡治癒之鎖、同人的小黃金樹、緊急包紮）
  const TEAM_HEAL_SKILLS = ['sylphy_healing', 'sylphy_chantless_healing', 'simmer_cook', 'simmer_recycle_bin'];
  const REVIVE_MSG = /重新站了起來|復活了|起死回生|甦醒過來/;
  const TEAM_HEAL_MSG = /治癒之鎖|治癒魔術|小黃金樹|緊急包紮|番茄湯/;
  /* 召喚物名字：召喚訊息的寫法每個角色都不一樣，名字不一定在開頭，例如
     「玩偶的影子像水一樣漫開，黑色的多臂 月蝕盡絕黑阿修羅 從水面底下慢慢升了起來。」
     「太歲星君 朝 流螢 的方向抬了抬下巴，十二神將「白虎」化成一頭白色的猛虎…」
     所以改看「這隻召喚物之後被打／出手／倒下」的紀錄，那些紀錄會用空白把名字夾起來：
       對 白虎 造成了／白虎 倒下了！／白虎 身上燒出了／被 白虎 躲開了／白虎 直直地衝向…
     依出現次數投票；都沒有紀錄時才從召喚訊息猜。寶月夜宵的四隻直接比對。 */
  const KNOWN_SUMMONS = ['邪經文大僧正', '月蝕盡絕黑阿修羅', '魄啜繚亂弟切花魁', '殉國禁獄鬼軍曹'];
  const PUNCT = /[，。！？、；：,.!?;:「」『』（）()—…]/;
  const NAME_PATTERNS = [
    /對\s+(.+?)\s+造成了/, /^\s*(.+?)\s+倒下了/, /^\s*(.+?)\s+身上/, /被\s+(.+?)\s+(?:用\S+)?(?:躲開|閃開|閃過|避開|抵擋)/,
    /(?:砸向|撞向|斬向|捲到了旁邊的|衝向|往)\s+(.+?)(?:\s+身上|，|！|$)/,
  ];
  function summonName(l, logs) {
    const msg = String(l.message || '').trim();
    const known = KNOWN_SUMMONS.find(n => msg.includes(n));
    if (known) return known;
    const sid = l.targetId;
    const rel = logs.filter(x => x && x !== l && x.type !== 'SUMMON' && (x.actorId === sid || x.targetId === sid));
    const vote = new Map();
    const add = (n, w, min = 2) => { n = String(n || '').trim(); if (n.length >= min && n.length <= 24 && !PUNCT.test(n)) vote.set(n, (vote.get(n) || 0) + w); };
    // 1) 結構化的句型：被打的時候「對 名字 造成了」最可靠
    rel.forEach(x => {
      const m = String(x.message || '');
      if (x.targetId === sid) NAME_PATTERNS.forEach(re => { const r = m.match(re); if (r) add(r[1], 3, 1); });
      if (x.actorId === sid) { const r = m.match(/^\s*(\S+(?:\s+T-\d+)?)\s/); if (r) add(r[1], 1); }
    });
    // 2) 再不行：統計這些紀錄裡被空白夾住的詞
    if (!vote.size) rel.forEach(x => String(x.message || '').split(/\s+/).forEach(t => add(t.split(PUNCT)[0], 1)));
    if (vote.size) {
      const inMsg = n => msg.includes(n) ? 0.5 : 0;   // 平手時偏好召喚訊息裡也有的名字
      return [...vote.entries()].sort((p, q) => (q[1] + inMsg(q[0])) - (p[1] + inMsg(p[0])) || p[0].length - q[0].length)[0][0];
    }
    // 3) 完全沒有其他紀錄：從召喚訊息猜（「」裡的字 → 被空白夾在中間的詞 → 最後一句）
    const q = msg.match(/「([^」]{1,16})」/);
    if (q) return q[1];
    const toks = msg.split(/\s+/).filter(Boolean);
    const pick = toks.length >= 3 ? toks[1] : (toks[0] || '');
    return pick.split(PUNCT).filter(Boolean).pop() || '';
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

    /* 別人交的資料（遺志）：75F 骸骨獵殺者「接收到來自陌生攻略者的資料」叫出來的援軍，actorId = legacy_xxx，participants 裡沒有。
       名字取紀錄裡最常出現的「○○的遺志」；原主人從登場文字「懶米的西米」「褪色者的寶月夜宵」抓。
       另外放一區「遺志」，不算進玩家的 MVP／總傷害。要在召喚物之前登記，遺志叫出來的召喚物才會跟著歸到這一區。 */
    const legacyIds = [...new Set(logs.flatMap(l => l ? [l.actorId, l.targetId] : []).filter(x => typeof x === 'string' && /^legacy_/.test(x)))];
    legacyIds.forEach(lid => {
      const own = logs.filter(l => l && l.actorId === lid);
      const cnt = new Map();
      own.forEach(l => {
        if (/^skull_reaper_|arrive|intercept/.test(l.skillId || '')) return;   // 登場／代擋文字常提到別人的名字，不拿來決定名字
        if (l.targetId && l.targetId !== lid && (/^legacy_/.test(l.targetId) || byId.has(l.targetId) && byId.get(l.targetId).side === 'A')) return;   // 補／加持隊友的文字開頭常是隊友的名字（初音拉人「壺頭哥的遺志 跟著歌聲重新站了起來」）
        const m = String(l.message || '');
        (m.match(/[^\s，。！？：、「」—]+?的遺志/g) || []).forEach(n => cnt.set(n, (cnt.get(n) || 0) + (m.trim().startsWith(n) ? 3 : 1)));
      });
      const name = [...cnt.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] || '陌生攻略者的遺志';
      const base = name.replace(/的遺志$/, '');
      const reOwner = new RegExp('([^\\s，。！？：、「」—]+)的' + escRe(base) + '(?!的遺志)');
      let owner = '';
      for (const l of own) { const m = String(l.message || '').match(reOwner); if (m && !/遺志$/.test(m[1])) { owner = m[1]; break; } }
      const u = newUnit({ name }, 'D');
      u.id = lid; u.isLegacy = true; u.legacyOwner = owner;
      u.name = owner ? `${base}（${owner}）` : name; u.full = name; u.names = [name];
      u.sub = owner ? `${owner} 交出的資料` : '陌生攻略者的資料';
      units.push(u); byId.set(lid, u);
    });

    /* 召喚物：戰報把分身當成獨立行動者（actorId = summon_1），participants 裡沒有它。
       先掃一遍 SUMMON 紀錄，把它登記成召喚者「同陣營」的單位，否則會被丟進「其他」而不計入我方輸出。
       例：菠蘿頭 shadow_clone_jutsu →「菠蘿頭的影分身 從白煙裡滾了出來。」
       實測分身的能力值＝本體（同技能非爆擊均傷 237 vs 251、爆擊 951 vs 958），
       但 HP 上限只有 1，被打中就消失（戰報會寫 4075 點傷害但 actualDamage 只有 1）。 */
    logs.forEach(l => {
      if (!l || l.type !== 'SUMMON' || !l.targetId) return;
      const owner = byId.get(l.actorId);
      const nm = summonName(l, logs) || ((owner ? owner.name : '') + '的分身') || String(l.targetId);
      let u = byId.get(l.targetId);
      if (!u) { u = newUnit({ name: nm }, owner ? owner.side : 'C'); u.id = l.targetId; units.push(u); byId.set(l.targetId, u); }
      u.name = shortName(nm); u.full = nm; u.names = [nm];
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
        if (kind !== 'finale' && shown > a.maxHit) a.maxHit = shown;
      }
      if (t) { t.taken.real += real; t.taken.shown += shown; if (CRITABLE[kind]) t.attackedN++; }
    };

    logs.forEach((l, i) => {
      if (!l || typeof l !== 'object') return;
      const a = get(l.actorId), t = get(l.targetId);
      const v = num(l.value);
      if (a && l.skillId) { const pre = String(l.skillId).split('_')[0]; if (!IGNORE_PREFIX[pre] && !prefixOwner[pre]) prefixOwner[pre] = a; }
      // 天方夜「全劇終」：場上所有角色倒下 → 對手剩下的血量全部算成天方夜打的
      if (a && (l.skillId === 'black_tome_final_page' || /寫下「全劇終」/.test(String(l.message || '')))) {
        units.filter(u => u.side !== a.side && !u.isSummon && !u.isLegacy && num(u.maxHpStat) > 0).forEach(u => {
          const rem = Math.max(0, num(u.maxHpStat) - u.taken.real + u.healRecv);
          if (!rem) return;
          hit(a, u, rem, rem, 'finale', l);
          a.finaleBy[u.name] = (a.finaleBy[u.name] || 0) + rem;
        });
      }
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
              cook.healTeam += v;   // 番茄湯是補全隊的料理
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
          // 拉起倒下的隊友：目標已經倒下、或文字寫「重新站了起來／復活」的治療
          if (t && (t.dead || REVIVE_MSG.test(msg))) {
            if (a && a !== t) { a.revN++; a.revBy[t.name] = (a.revBy[t.name] || 0) + 1; }
            t.revivedN++; t.dead = false;
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
          // 少數技能只把回復寫在文字裡（例如芙莉蓮解除魔力限制「恢復了 12 SP」）
          const msg = String(l.message || '');
          const ms = msg.match(/恢復了\s*(\d+)\s*SP/);
          if (ms && a) { a.sp += num(ms[1]); a.spRecv += num(ms[1]); }
          const mh = msg.match(/恢復了\s*(\d+)\s*HP/);
          if (mh && a) { a.heal += num(mh[1]); const k = TEAM_HEAL_MSG.test(msg) ? 'msg:team' : (l.skillId || l.passiveId || 'msg:'); a.selfHeal[k] = (a.selfHeal[k] || 0) + num(mh[1]); a.healRecv += num(mh[1]); }
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
          if (a) { a.dead = true; a.deathN++; }
          break;
        case 'HP_REMAINING':
          if (a) { a.hpLeft = v; a.hpMax = l.maxHp != null ? num(l.maxHp) : null; }
          break;
      }
    });
    // 補到自己的治療：如果同一招在這場有補過別人（或是已知的補師技能），就算治療技能；否則算只能補自己（吸血、自補）
    const teamSkills = new Set(TEAM_HEAL_SKILLS);
    logs.forEach(l => { if (l && l.type === 'HEAL' && l.targetId && l.actorId !== l.targetId && (l.skillId || l.passiveId)) teamSkills.add(l.skillId || l.passiveId); });
    teamSkills.add('msg:team');
    units.forEach(u => Object.entries(u.selfHeal).forEach(([k, v]) => { if (teamSkills.has(k)) u.healTeam += v; else u.healSolo += v; }));
    return units;
  }

  /* ---------- UI ---------- */
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
  .rz { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: nwse-resize; z-index: 3; touch-action: none;
    background: linear-gradient(135deg, transparent 0 45%, #4FD1C5 45% 52%, transparent 52% 64%, #4FD1C5 64% 71%, transparent 71%); opacity: .55; }
  .rz:hover { opacity: 1; }
  .panel.sized { max-width: calc(100vw - 8px); }
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
  .side.sD .side-hd .dot { background: #63b3ed; box-shadow: 0 0 6px rgba(99,179,237,.6); }
  .side.sD .bar i { background: linear-gradient(90deg,#2b6cb0,#63b3ed); }
  .side.sD .bar { background: rgba(99,179,237,.13); }
  .side.sD .c-tot, .side.sD .c-big b { color: #90cdf4; }
  table.simple td.nm { min-width: 0; }
  td.nm { white-space: normal; overflow-wrap: anywhere; min-width: 150px; max-width: 280px; }
  td.nm .tag { white-space: nowrap; }
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
  .tag.rev { color: #fbd38d; border-color: #d69e2e; background: rgba(214,158,46,.12); font-weight: 700; cursor: help; }
  .tag.rvd { color: #faf089; border-color: #b7791f; }
  .tag.fin { color: #e9d8fd; border-color: #805ad5; background: rgba(128,90,213,.18); font-weight: 700; cursor: help; }
  .grid .rev b { color: #fbd38d; }
  .tag.dot { color: #9ae6b4; border-color: #68d391; }
  .tag.pas { color: #90cdf4; border-color: #63b3ed; }
  .tag.sum { color: #d6bcfa; border-color: #b794f4; }
  .tag.lgc { color: #90cdf4; border-color: #4299e1; background: rgba(66,153,225,.12); }
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
    root.addEventListener('dblclick', e => { if (e.target.closest('[data-rz]')) { state.size = null; save('size', null); render(); } });
  }
  function unmount() { if (host) { host.remove(); host = null; root = null; } }

  function sideLabel(rep, side) {
    if (side === 'A') return '玩家';
    if (side === 'D') return '遺志（陌生攻略者的資料）';
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
      revTags(u) +
      (u.isLegacy ? '<span class="tag lgc">遺志</span>' : '') +
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
        ${k.finale.n ? item('全劇終（對手剩餘血量）', fmt(k.finale[mode]), 'rev') : ''}
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
        ${u.revN ? item('拉起隊友', u.revN + ' 人次（' + Object.keys(u.revBy).length + ' 人）', 'rev') : ''}
        ${u.deathN ? item('倒下次數', u.deathN + ' 次' + (u.revivedN ? '（被拉起 ' + u.revivedN + ' 次）' : '')) : ''}
        ${item('受到治療', fmt(u.healRecv))}
        ${item('獲得 SP', fmt(u.spRecv))}
      </div>${dotList(u.dot, '異常狀態／持續傷害（這個角色造成的）')}${dotList(u.dotTaken, '受到的異常狀態／持續傷害')}${dotList(u.passiveDot, '反傷（這個角色造成的）')}${dotList(u.passiveTaken, '受到的反傷')}${reviveList(u)}${simmerList(u)}${specialList(u)}`;
  }

  // 電腦：表格的一列
  const rkBadge = i => `<span class="rk${i < 3 ? ' r' + (i + 1) : ''}">${i + 1}</span>`;
  function unitRows(u, sideTot, mode, i) {
    const dmg = u.dealt[mode], tot = dmg + u.luck, take = u.taken[mode];
    const pct = sideTot > 0 ? tot / sideTot * 100 : 0;
    const key = u.id;
    const { tags, subline } = unitHead(u);
    const bst = u.isBoss && u.stats ? `<tr class="bst" data-key="${esc(key)}"><td colspan="8">${esc(statLine(u.stats))}</td></tr>` : '';
    let html = `<tr class="u${bst ? ' hasbst' : ''}${state.open[key] ? ' open' : ''}" data-key="${esc(key)}">
      <td class="nm"><span class="arw">${state.open[key] ? '▾' : '▸'}</span>${rkBadge(i)}${nmTxt(u)}${tags}<small>${esc(subline)}</small></td>
      ${cell(dmg, 'c-dmg')}${cell(u.luck, 'c-luck')}
      <td class="c-tot${tot ? '' : ' zero'}">${fmt(tot)} <span class="pct">${pct.toFixed(1)}%</span><div class="bar"><i style="width:${Math.min(100, pct).toFixed(1)}%"></i></div></td>
      ${cell(take, 'c-take')}${cell(u.heal, 'c-heal')}${cell(u.sp, 'c-sp')}${critCell(u.crit, u.hitN)}
    </tr>` + bst;
    if (state.open[key]) html += `<tr class="det"><td colspan="8">${detHtml(u, mode)}</td></tr>`;
    return html;
  }

  // 手機：每個角色一張卡片，主數字放大，其他數字排成格子；點卡片展開細項
  function unitCard(u, sideTot, mode, i) {
    const dmg = u.dealt[mode], tot = dmg + u.luck, take = u.taken[mode];
    const pct = sideTot > 0 ? tot / sideTot * 100 : 0;
    const key = u.id, open = !!state.open[key];
    const { tags, subline } = unitHead(u);
    const st = (label, v, cls) => `<div class="cs ${cls}${v ? '' : ' zero'}"><span>${label}</span><b>${fmt(v)}</b></div>`;
    return `<div class="card${open ? ' open' : ''}" data-key="${esc(key)}">
      <div class="c-top">
        <div class="c-nm">${rkBadge(i)}<b>${nmTxt(u)}</b>${tags}${subline ? `<small>${esc(subline)}</small>` : ''}</div>
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

  // 拉人：「拉起 N 人次（M 人）」，滑鼠移上去看拉了誰；被拉起來的人標「被拉起 ×k」
  function revTags(u) {
    let h = '';
    if (u.revN) {
      const ent = Object.entries(u.revBy).sort((a, b) => b[1] - a[1]);
      h += `<span class="tag rev" title="${esc('拉起來的隊友：\n' + ent.map(([n, c]) => `${n} ×${c}`).join('\n'))}">拉起 ${u.revN} 人次（${ent.length} 人）</span>`;
    }
    if (u.revivedN) h += `<span class="tag rvd">被拉起 ×${u.revivedN}</span>`;
    if (u.byKind.finale.n) h += `<span class="tag fin" title="${esc('全劇終：對手剩下的血量全部算給這個角色\n' + Object.entries(u.finaleBy).map(([n, v]) => `${n} ${fmt(v)}`).join('\n'))}">全劇終 +${fmt(u.byKind.finale.real)}</span>`;
    return h;
  }
  function reviveList(u) {
    const ent = Object.entries(u.revBy).sort((a, b) => b[1] - a[1]);
    if (!ent.length) return '';
    return `<div class="spl"><span class="k">拉起倒下的隊友：共 ${u.revN} 人次、${ent.length} 人</span>` +
      ent.map(([n, c]) => `<div>・${esc(n)}<b>×${c}</b></div>`).join('') + `</div>`;
  }

  // 簡易模式：只看名次、總計傷害（佔比）、承受、回血、爆擊率；不展開細項
  const nmTxt = u => u.full && u.full !== u.name ? `<span title="${esc(u.full)}">${esc(u.name)}</span>` : esc(u.name);
  const simpleTags = u => (u.dead ? '<span class="tag dead">倒下</span>' : '') + (u.isAssist ? '<span class="tag ast">支援</span>' : '') + revTags(u) + (u.isLegacy ? '<span class="tag lgc">遺志</span>' : '') + (u.isSummon ? '<span class="tag sum">分身</span>' : '');
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
        return `<div class="card simple"><div class="c-top"><div class="c-nm">${rkBadge(i)}<b>${nmTxt(u)}</b>${simpleTags(u)}</div>
          <div class="c-big${tot ? '' : ' zero'}"><b>${fmt(tot)}</b><span>${p.toFixed(1)}%</span></div></div>
          <div class="bar"><i style="width:${Math.min(100, p).toFixed(1)}%"></i></div>
          <div class="sm-line"><span>承受<b class="c-take">${fmt(u.taken[mode])}</b></span>${u.heal ? `<span>回血<b class="c-heal">${fmt(u.heal)}</b></span>` : ''}<span>爆擊<b class="c-crit">${critPct(u.crit, u.hitN)}</b> <i style="font-style:normal;font-size:11px">${u.crit}/${u.hitN}</i></span></div></div>`;
      }).join('')}</div>`;
    }
    return `<div class="side s${side}">${head}
      <table class="simple"><thead><tr><th>角色</th><th>總計傷害</th><th>承受傷害</th><th>回復血量</th><th>爆擊率</th></tr></thead><tbody>
      ${list.map((u, i) => {
        const tot = u.dealt[mode] + u.luck, p = pctOf(u);
        return `<tr class="u0"><td class="nm">${rkBadge(i)}${nmTxt(u)}${simpleTags(u)}</td>
          <td class="c-tot${tot ? '' : ' zero'}" style="min-width:190px">${fmt(tot)} <span class="pct">${p.toFixed(1)}%</span><div class="bar"><i style="width:${Math.min(100, p).toFixed(1)}%"></i></div></td>
          ${cell(u.taken[mode], 'c-take')}${cell(u.heal, 'c-heal')}${critCell(u.crit, u.hitN)}</tr>`;
      }).join('')}
      ${list.length > 1 ? `<tr class="sum"><td>合計</td>${cell(S.tot, 'c-tot')}${cell(S.take, 'c-take')}${cell(S.heal, 'c-heal')}${critCell(S.crit, S.hitN)}</tr>` : ''}
      </tbody></table></div>`;
  }

  // 頂部摘要：我方總傷害、MVP（綜合貢獻）、最佳坦克、最佳奶媽
  // MVP 綜合貢獻＝各項佔全隊比例的加權平均，權重：輸出（含幸運、分身）×1 > 補隊友×0.5 > 承受傷害×0.25 = 回 SP×0.25 > 自回×0.1；
  // 補隊友＝治療技能全算（能補隊友的招：番茄湯、小黃金樹、緊急包紮、治癒之鎖、治癒魔術…補到自己也算）
  //      自回＝只能補自己的（吸血、自補），單獨一項。
  // 全隊都是 0 的項目不列入。所有玩家的綜合貢獻加起來是 100%。
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

  // 窄螢幕（手機直拿）改用卡片＋底部抽屜；轉橫或電腦就回到表格
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
      // 逐行播放中：數字全部先不顯示，播完才出現
      sub = `<span class="chip play">⏳ 播放中</span>` + (rep.battleType ? `<span class="chip">${esc(rep.battleType)}</span>` : '') + `<span class="chip">#${esc(currentId)}</span>`;
      body = `<div class="playing"><div class="pi">⏳</div><div class="pt">戰報逐行播放中</div>
        <div class="ps">播完最後一行才顯示傷害、MVP 與勝負</div></div>`;
    } else if (rep) {
      const units = analyze(rep);
      const t = rep.createdAt ? new Date(rep.createdAt).toLocaleString() : '';
      const rc = { WIN: 'win', LOSE: 'lose', DRAW: 'draw' }[rep.result] || '';
      // 戰報逐行播放還在播時，先不顯示勝負（播完才揭曉）
      sub = (playing ? `<span class="chip" title="逐行播放完才顯示勝負">⏳ 播放中</span>` : rep.result ? `<span class="chip ${rc}">${esc(RESULT[rep.result] || rep.result)}</span>` : '') +
        (rep.battleType ? `<span class="chip">${esc(rep.battleType)}</span>` : '') +
        `<span class="chip">#${esc(currentId)}</span>` + (t ? `<span class="chip">${esc(t)}</span>` : '');
      const sides = ['A', 'D', 'B', 'C'].filter(sd => units.some(u => u.side === sd));
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
    const sz = !mob && state.size ? state.size : null;
    const szStyle = sz ? `width:${sz.w}px;` + (col ? '' : `height:${sz.h}px;`) : '';
    root.innerHTML = `<style>${CSS}</style>
      <div class="panel${mob ? ' mob' : ''}${col ? ' col' : ''}${simple && !mob ? ' simple' : ''}${sz ? ' sized' : ''}" style="${posStyle}${szStyle}">
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
        ${col || mob ? '' : '<div class="rz" data-rz="1" title="拖曳調整大小（雙擊恢復預設大小）"></div>'}
      </div>`;
    applyFit();
  }

  // 自動縮放：量出面板完整高度，超過視窗就整個等比縮小（最小 50%，再不夠才捲動）
  function applyFit() {
    const p = root && root.querySelector('.panel');
    if (!p) return;
    p.style.transform = ''; p.style.maxHeight = ''; p.classList.remove('dense');
    const lab = root.querySelector('.fitv');
    const mob = narrow();
    const top = p.getBoundingClientRect().top;
    const avail = Math.max(200, window.innerHeight - top - 12);
    if (!mob && state.size && !state.collapsed) {
      p.style.height = Math.min(state.size.h, avail) + 'px';
      if (lab) lab.textContent = '手動';
      return;
    }
    if (mob || state.collapsed || !state.fit || !cache.get(currentId) || document.documentElement.hasAttribute('data-mdp-playing')) {
      if (!mob) p.style.maxHeight = avail + 'px';      // 不縮放時也不要超出視窗底部
      if (lab) lab.textContent = state.fit ? '100%' : '關';
      return;
    }
    p.style.maxHeight = 'none';
    let H = p.offsetHeight;
    if (H > avail) { p.classList.add('dense'); H = p.offsetHeight; }   // 先把行距收緊，還不夠再縮放
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
      else if (act === 'fit') { if (state.size) { state.size = null; save('size', null); state.fit = true; } else state.fit = !state.fit; save('fit', state.fit); render(); }
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
    if (e.target.closest('[data-rz]')) { onResizeStart(e); return; }
    const hd = e.target.closest('[data-drag]');
    if (!hd || e.target.closest('button')) return;
    const panel = hd.parentElement;
    const r = panel.getBoundingClientRect();
    // 縮放時改成以左上角為準，畫面位置不跳動
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

  // 右下角拖曳調整大小（展開時才有）；大小會記住，雙擊恢復預設
  function onResizeStart(e) {
    const panel = e.target.closest('.panel');
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    panel.style.transform = ''; panel.style.maxHeight = 'none';
    panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px'; panel.style.right = 'auto';
    state.pos = { left: Math.round(r.left), top: Math.round(r.top) };
    const sx = e.clientX, sy = e.clientY, w0 = r.width, h0 = r.height;
    const move = ev => {
      const w = Math.max(360, Math.min(window.innerWidth - r.left - 4, w0 + ev.clientX - sx));
      const h = Math.max(160, Math.min(window.innerHeight - r.top - 4, h0 + ev.clientY - sy));
      panel.style.width = w + 'px'; panel.style.height = h + 'px';
      state.size = { w: Math.round(w), h: Math.round(h) };
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      save('pos', state.pos);
      if (state.size) { save('size', state.size); render(); }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  }

  /* ---------- SPA 路由監聽 ---------- */
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
