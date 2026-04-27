/* ===================================================
   麻雀点数計算アプリ  script.js
=================================================== */

// ===== 定数 =====
var MAN   = 'man';
var PIN   = 'pin';
var SOU   = 'sou';
var JIHAI = 'jihai';

var JIHAI_NAMES = ['東', '南', '西', '北', '白', '發', '中'];

// ===== 状態 =====
var hand      = [];
var agari     = 'ron';
var oyako     = 'ko';
var counts    = { dora: 0, akaDora: 0, uraDora: 0 };
var richi     = false;
var ippatsu   = false;
var lastResult = null;
var records    = { best: null, yakuStats: {}, agariCount: 0 };
var API_BASE   = './api';


/* --------------------------------------------------
   ユーティリティ
-------------------------------------------------- */

function tileLabel(t) {
  if (t.suit === MAN) return t.num + '萬';
  if (t.suit === PIN) return t.num + '筒';
  if (t.suit === SOU) return t.num + '索';
  return JIHAI_NAMES[parseInt(t.num) - 1];
}

function tileId(t) {
  return t.suit + '_' + t.num;
}

function tileKey(t) {
  var s = t.suit === MAN ? 'm' : t.suit === PIN ? 'p' : t.suit === SOU ? 's' : 'z';
  return t.num + s;
}

function isYaochu(t) {
  if (t.suit === JIHAI) return true;
  return t.num === '1' || t.num === '9';
}

function roundUp10(n)  { return Math.ceil(n / 10)  * 10;  }
function roundUp100(n) { return Math.ceil(n / 100) * 100; }

function sortTiles(tiles) {
  var order = { man: 0, pin: 1, sou: 2, jihai: 3 };
  return tiles.slice().sort(function(a, b) {
    if (order[a.suit] !== order[b.suit]) return order[a.suit] - order[b.suit];
    return parseInt(a.num) - parseInt(b.num);
  });
}


/* --------------------------------------------------
   牌グリッド描画
-------------------------------------------------- */

function renderGrids() {
  var grids = {
    manGrid:   { suit: MAN,   nums: [1,2,3,4,5,6,7,8,9] },
    pinGrid:   { suit: PIN,   nums: [1,2,3,4,5,6,7,8,9] },
    souGrid:   { suit: SOU,   nums: [1,2,3,4,5,6,7,8,9] },
    jikaiGrid: { suit: JIHAI, nums: [1,2,3,4,5,6,7]     },
  };
  Object.keys(grids).forEach(function(id) {
    var suit = grids[id].suit;
    var nums = grids[id].nums;
    var el = document.getElementById(id);
    el.innerHTML = '';
    nums.forEach(function(n) { el.appendChild(makeTileBtn(n, suit)); });
  });
}

function makeTileBtn(num, suit) {
  var btn = document.createElement('button');
  btn.className = 'tile-btn ' + suit;

  var key = num + (suit === MAN ? 'm' : suit === PIN ? 'p' : suit === SOU ? 's' : 'z');
  var countInHand = hand.filter(function(t) { return tileKey(t) === key; }).length;
  if (countInHand >= 4) btn.disabled = true;

  var numDiv = document.createElement('div');
  numDiv.className = 'tile-num';
  numDiv.textContent = suit === JIHAI ? JIHAI_NAMES[num - 1] : num;

  var suitDiv = document.createElement('div');
  suitDiv.className = 'tile-suit';
  suitDiv.textContent = suit === MAN ? '萬' : suit === PIN ? '筒' : suit === SOU ? '索' : '';

  btn.appendChild(numDiv);
  btn.appendChild(suitDiv);
  btn.onclick = (function(n, s) { return function() { addTile(n, s); }; })(num, suit);
  return btn;
}


/* --------------------------------------------------
   手牌操作
-------------------------------------------------- */

function addTile(num, suit) {
  if (hand.length >= 14) return;
  var key = num + (suit === MAN ? 'm' : suit === PIN ? 'p' : suit === SOU ? 's' : 'z');
  if (hand.filter(function(t) { return tileKey(t) === key; }).length >= 4) return;
  hand.push({ num: num.toString(), suit: suit });
  renderHand();
  renderGrids();
}

function removeTile(idx) {
  hand.splice(idx, 1);
  renderHand();
  renderGrids();
}

function clearHand() {
  hand = [];
  renderHand();
  renderGrids();
  document.getElementById('resultArea').style.display = 'none';
  document.getElementById('errorMsg').style.display   = 'none';
}

function renderHand() {
  var disp = document.getElementById('handDisplay');
  disp.innerHTML = '';

  if (hand.length === 0) {
    disp.innerHTML = '<span class="hand-empty">牌を選択してください</span>';
    return;
  }

  hand.forEach(function(t, i) {
    var el = document.createElement('div');
    el.className = 'hand-tile' + (i === hand.length - 1 ? ' agari-tile' : '');
    el.textContent = tileLabel(t);

    if (i === hand.length - 1) {
      var mark = document.createElement('div');
      mark.className = 'agari-mark';
      mark.textContent = agari === 'tsumo' ? 'ツモ' : 'ロン';
      el.appendChild(mark);
    }

    el.onclick = (function(idx) { return function() { removeTile(idx); }; })(i);
    disp.appendChild(el);
  });
}


/* --------------------------------------------------
   コントロール操作
-------------------------------------------------- */

function setAgari(v) {
  agari = v;
  document.getElementById('ronBtn').classList.toggle('active',   v === 'ron');
  document.getElementById('tsumoBtn').classList.toggle('active', v === 'tsumo');
  renderHand();
}

function setOyako(v) {
  oyako = v;
  document.getElementById('oyaBtn').classList.toggle('active', v === 'oya');
  document.getElementById('koBtn').classList.toggle('active',  v === 'ko');
}

function changeNum(key, d) {
  counts[key] = Math.max(0, Math.min(10, counts[key] + d));
  document.getElementById(key + 'Count').textContent = counts[key];
  if (key === 'uraDora' && counts[key] > 0 && !richi) {
    richi = true;
    document.getElementById('richiBtn').classList.add('active');
  }
}

function toggleRichi() {
  richi = !richi;
  document.getElementById('richiBtn').classList.toggle('active', richi);
  if (!richi) {
    ippatsu = false;
    document.getElementById('ippatsuBtn').classList.remove('active');
  }
}

function toggleIppatsu() {
  if (!richi) {
    richi = true;
    document.getElementById('richiBtn').classList.add('active');
  }
  ippatsu = !ippatsu;
  document.getElementById('ippatsuBtn').classList.toggle('active', ippatsu);
}


/* --------------------------------------------------
   アガり形探索
-------------------------------------------------- */

function findMentsu(tiles) {
  if (tiles.length === 0) return [[]];
  if (tiles.length < 3)   return [];

  var sorted  = sortTiles(tiles);
  var results = [];

  function pick(arr, combos) {
    if (arr.length === 0) { results.push(combos); return; }
    if (arr.length < 3)   return;

    var t    = arr[0];
    var rest = arr.slice(1);

    var si2 = rest.findIndex(function(x) { return tileId(x) === tileId(t); });
    if (si2 >= 0) {
      var rest2 = rest.slice();
      rest2.splice(si2, 1);
      var si3 = rest2.findIndex(function(x) { return tileId(x) === tileId(t); });
      if (si3 >= 0) {
        var rest3 = rest2.slice();
        rest3.splice(si3, 1);
        pick(rest3, combos.concat([{ type: 'kotsu', tiles: [t, rest[si2], rest2[si3]] }]));
      }
    }

    if (t.suit !== JIHAI) {
      var n  = parseInt(t.num);
      var r1 = rest.slice();
      var i1 = r1.findIndex(function(x) { return x.suit === t.suit && parseInt(x.num) === n + 1; });
      if (i1 >= 0) {
        var mid = r1[i1];
        r1.splice(i1, 1);
        var i2 = r1.findIndex(function(x) { return x.suit === t.suit && parseInt(x.num) === n + 2; });
        if (i2 >= 0) {
          var hi = r1[i2];
          r1.splice(i2, 1);
          pick(r1, combos.concat([{ type: 'shuntsu', tiles: [t, mid, hi] }]));
        }
      }
    }
  }

  pick(sorted, []);
  return results;
}

function findHand(tiles) {
  if (tiles.length !== 14) return null;

  var agariTile = tiles[tiles.length - 1];
  var sorted    = sortTiles(tiles);
  var results   = [];

  var ct = checkChiitoi(sorted, agariTile);
  if (ct) results.push(ct);

  var ks = checkKokushi(sorted, agariTile);
  if (ks) results.push(ks);

  var seen = {};
  sorted.forEach(function(pair) {
    var pid = tileId(pair);
    if (seen[pid]) return;
    var pCount = sorted.filter(function(t) { return tileId(t) === pid; }).length;
    if (pCount < 2) return;
    seen[pid] = true;

    var without = sorted.slice();
    var pi1 = without.findIndex(function(t) { return tileId(t) === pid; }); without.splice(pi1, 1);
    var pi2 = without.findIndex(function(t) { return tileId(t) === pid; }); without.splice(pi2, 1);

    var combos = findMentsu(without);
    combos.forEach(function(m) {
      if (m.length === 4) results.push({ jantou: pair, mentsu: m, agariTile: agariTile });
    });
  });

  return results.length > 0 ? results : null;
}

function checkChiitoi(sorted, agariTile) {
  var cnts = {};
  sorted.forEach(function(t) { var k = tileId(t); cnts[k] = (cnts[k] || 0) + 1; });
  if (Object.values(cnts).every(function(v) { return v === 2; }) && Object.keys(cnts).length === 7)
    return { special: 'chiitoi', agariTile: agariTile };
  return null;
}

function checkKokushi(sorted, agariTile) {
  var required = [
    'man_1','man_9','pin_1','pin_9','sou_1','sou_9',
    'jihai_1','jihai_2','jihai_3','jihai_4','jihai_5','jihai_6','jihai_7'
  ];
  var ids = sorted.map(tileId);
  if (!required.every(function(k) { return ids.indexOf(k) >= 0; })) return null;
  var cnts = {};
  ids.forEach(function(k) { cnts[k] = (cnts[k] || 0) + 1; });
  if (required.some(function(k) { return cnts[k] === 2; })) return { special: 'kokushi', agariTile: agariTile };
  return null;
}


/* --------------------------------------------------
   役判定
-------------------------------------------------- */

function isPinfu(h) {
  if (!h.mentsu || h.mentsu.some(function(m) { return m.type !== 'shuntsu'; })) return false;
  var YAKUHAI = ['jihai_1','jihai_2','jihai_3','jihai_4','jihai_5','jihai_6','jihai_7'];
  if (YAKUHAI.indexOf(tileId(h.jantou)) >= 0) return false;
  var at = h.agariTile;
  var m  = h.mentsu.find(function(x) { return x.tiles.some(function(t) { return tileId(t) === tileId(at); }); });
  if (!m || m.type !== 'shuntsu') return false;
  var nums   = m.tiles.map(function(t) { return parseInt(t.num); }).sort(function(a,b){return a-b;});
  var agariN = parseInt(at.num);
  if (agariN === nums[0] && nums[0] === 1) return false;
  if (agariN === nums[2] && nums[2] === 9) return false;
  return true;
}

function isTanyao(h) {
  if (h.special) return false;
  return [h.jantou].concat(h.mentsu.reduce(function(a,m){return a.concat(m.tiles);},[])).every(function(t){return !isYaochu(t);});
}

function isIipeiko(h) {
  if (h.special) return false;
  var s = h.mentsu.filter(function(m){return m.type==='shuntsu';});
  for (var i=0;i<s.length;i++)
    for (var j=i+1;j<s.length;j++)
      if (s[i].tiles.map(tileId).sort().join()===s[j].tiles.map(tileId).sort().join()) return true;
  return false;
}

function isRyanpeiko(h) {
  if (h.special) return false;
  var s = h.mentsu.filter(function(m){return m.type==='shuntsu';});
  if (s.length < 4) return false;
  var keys = s.map(function(m){return m.tiles.map(tileId).sort().join();});
  return (keys[0]===keys[1]&&keys[2]===keys[3])||(keys[0]===keys[2]&&keys[1]===keys[3])||(keys[0]===keys[3]&&keys[1]===keys[2]);
}

function isIttsu(h) {
  if (h.special) return false;
  var s = h.mentsu.filter(function(m){return m.type==='shuntsu';});
  var suits = [MAN, PIN, SOU];
  for (var i=0;i<suits.length;i++) {
    var suit = suits[i];
    var of2 = s.filter(function(m){return m.tiles[0].suit===suit;});
    if (of2.some(function(m){return parseInt(m.tiles[0].num)===1;}) &&
        of2.some(function(m){return parseInt(m.tiles[0].num)===4;}) &&
        of2.some(function(m){return parseInt(m.tiles[0].num)===7;})) return true;
  }
  return false;
}

function isSanshokuDoujun(h) {
  if (h.special) return false;
  var s = h.mentsu.filter(function(m){return m.type==='shuntsu';});
  for (var n=1;n<=7;n++) {
    if ([MAN,PIN,SOU].every(function(suit){return s.some(function(m){return m.tiles[0].suit===suit&&parseInt(m.tiles[0].num)===n;});})) return true;
  }
  return false;
}

function isSanshokuDoukou(h) {
  if (h.special) return false;
  var k = h.mentsu.filter(function(m){return m.type==='kotsu';});
  for (var n=1;n<=9;n++) {
    if ([MAN,PIN,SOU].every(function(suit){return k.some(function(m){return m.tiles[0].suit===suit&&m.tiles[0].num===n.toString();});})) return true;
  }
  return false;
}

function isToitoi(h) {
  if (h.special) return false;
  return h.mentsu.every(function(m){return m.type==='kotsu';});
}

function isSanankou(h) {
  if (h.special) return false;
  return h.mentsu.filter(function(m){return m.type==='kotsu';}).length >= 3;
}

function isChanta(h) {
  if (h.special) return false;
  if (!isYaochu(h.jantou)) return false;
  return h.mentsu.every(function(m){return m.tiles.some(function(t){return isYaochu(t);});});
}

function isHonroutou(h) {
  if (h.special) return false;
  if (!isYaochu(h.jantou)) return false;
  return h.mentsu.every(function(m){return m.type==='kotsu'&&m.tiles.every(function(t){return isYaochu(t);});});
}

function isShousangen(h) {
  if (h.special) return false;
  var D = ['jihai_5','jihai_6','jihai_7'];
  var jIsDragon = D.indexOf(tileId(h.jantou)) >= 0;
  var dk = h.mentsu.filter(function(m){return m.type==='kotsu'&&D.indexOf(tileId(m.tiles[0]))>=0;}).length;
  return jIsDragon && dk === 2;
}

function isDaisangen(h) {
  if (h.special) return false;
  return ['jihai_5','jihai_6','jihai_7'].every(function(d){return h.mentsu.some(function(m){return m.type==='kotsu'&&tileId(m.tiles[0])===d;});});
}

function isHonitsu(h) {
  if (h.special) return false;
  var all = [h.jantou].concat(h.mentsu.reduce(function(a,m){return a.concat(m.tiles);},[]));
  var suits = all.filter(function(t){return t.suit!==JIHAI;}).map(function(t){return t.suit;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  return suits.length === 1 && all.some(function(t){return t.suit===JIHAI;});
}

function isChinitsu(h) {
  if (h.special) return false;
  var all = [h.jantou].concat(h.mentsu.reduce(function(a,m){return a.concat(m.tiles);},[]));
  var suits = all.map(function(t){return t.suit;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  return suits.length === 1 && suits[0] !== JIHAI;
}

function isTsuuiisou(h) {
  if (h.special === 'chiitoi') return hand.every(function(t){return t.suit===JIHAI;});
  if (!h.mentsu) return false;
  return [h.jantou].concat(h.mentsu.reduce(function(a,m){return a.concat(m.tiles);},[])).every(function(t){return t.suit===JIHAI;});
}

function isChinroutou(h) {
  if (!h.mentsu) return false;
  return [h.jantou].concat(h.mentsu.reduce(function(a,m){return a.concat(m.tiles);},[])).every(function(t){return isYaochu(t)&&t.suit!==JIHAI;});
}

function isRyuisou(h) {
  var G = ['sou_2','sou_3','sou_4','sou_6','sou_8','jihai_6'];
  if (h.special === 'chiitoi') return hand.every(function(t){return G.indexOf(tileId(t))>=0;});
  if (!h.mentsu) return false;
  return [h.jantou].concat(h.mentsu.reduce(function(a,m){return a.concat(m.tiles);},[])).every(function(t){return G.indexOf(tileId(t))>=0;});
}

function isChurenpoutou(h) {
  if (h.special) return false;
  var all = [h.jantou].concat(h.mentsu.reduce(function(a,m){return a.concat(m.tiles);},[]));
  var suits = all.map(function(t){return t.suit;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  if (suits.length !== 1 || suits[0] === JIHAI) return false;
  var cnts = {};
  all.forEach(function(t){cnts[t.num]=(cnts[t.num]||0)+1;});
  return cnts['1']>=3 && cnts['9']>=3 && [2,3,4,5,6,7,8].every(function(n){return cnts[n.toString()]>=1;});
}

function isSuuankou(h) {
  if (!h.mentsu) return false;
  return agari==='tsumo' && h.mentsu.filter(function(m){return m.type==='kotsu';}).length===4;
}

function detectYaku(h, agariMode, isRichi, isIppatsu) {
  var yaku = [];

  if (h.special === 'kokushi') return [{ name: '国士無双', han: 13, yakuman: true }];
  if (isDaisangen(h))    yaku.push({ name: '大三元',   han: 13, yakuman: true });
  if (isTsuuiisou(h))    yaku.push({ name: '字一色',   han: 13, yakuman: true });
  if (isChinroutou(h))   yaku.push({ name: '清老頭',   han: 13, yakuman: true });
  if (isRyuisou(h))      yaku.push({ name: '緑一色',   han: 13, yakuman: true });
  if (isChurenpoutou(h)) yaku.push({ name: '九連宝燈', han: 13, yakuman: true });
  if (isSuuankou(h))     yaku.push({ name: '四暗刻',   han: 13, yakuman: true });
  if (yaku.some(function(y){return y.yakuman;})) return yaku;

  if (h.special === 'chiitoi') {
    yaku.push({ name: '七対子', han: 2 });
    if (isRichi)   yaku.push({ name: '立直', han: 1 });
    if (isIppatsu) yaku.push({ name: '一発', han: 1 });
    return yaku;
  }

  if (isRichi)   yaku.push({ name: '立直',        han: 1 });
  if (isIppatsu) yaku.push({ name: '一発',        han: 1 });
  if (agariMode === 'tsumo') yaku.push({ name: '門前清自摸和', han: 1 });
  if (isTanyao(h))                        yaku.push({ name: '断么九',    han: 1 });
  if (isPinfu(h))                         yaku.push({ name: '平和',      han: 1 });
  if (!isRyanpeiko(h) && isIipeiko(h))    yaku.push({ name: '一盃口',    han: 1 });
  if (isRyanpeiko(h))                     yaku.push({ name: '二盃口',    han: 3 });
  if (isIttsu(h))                         yaku.push({ name: '一気通貫',  han: 2 });
  if (isSanshokuDoujun(h))                yaku.push({ name: '三色同順',  han: 2 });
  if (isSanshokuDoukou(h))                yaku.push({ name: '三色同刻',  han: 2 });
  if (isToitoi(h))                        yaku.push({ name: '対々和',    han: 2 });
  if (isSanankou(h))                      yaku.push({ name: '三暗刻',    han: 2 });
  if (isShousangen(h))                    yaku.push({ name: '小三元',    han: 2 });
  if (isHonroutou(h))                     yaku.push({ name: '混老頭',    han: 2 });
  if (isChanta(h) && !isHonroutou(h))     yaku.push({ name: '混全帯么九', han: 2 });
  if (isHonitsu(h) && !isChinitsu(h))     yaku.push({ name: '混一色',    han: 3 });
  if (isChinitsu(h))                      yaku.push({ name: '清一色',    han: 6 });

  [{ id:'jihai_5', name:'白' },{ id:'jihai_6', name:'發' },{ id:'jihai_7', name:'中' }].forEach(function(d) {
    if (h.mentsu.some(function(m){return m.type==='kotsu'&&tileId(m.tiles[0])===d.id;}))
      yaku.push({ name: d.name, han: 1 });
  });

  return yaku;
}


/* --------------------------------------------------
   符計算
-------------------------------------------------- */

function calcFu(h, agariMode) {
  if (h.special === 'chiitoi') return 25;
  if (h.special === 'kokushi') return 30;
  if (isPinfu(h) && agariMode === 'tsumo') return 20;
  if (isPinfu(h) && agariMode === 'ron')   return 30;

  var fu  = agariMode === 'tsumo' ? 20 : 30;
  var jid = tileId(h.jantou);
  if (['jihai_5','jihai_6','jihai_7'].indexOf(jid) >= 0) fu += 2;
  if (['jihai_1','jihai_2','jihai_3','jihai_4'].indexOf(jid) >= 0) fu += 2;

  h.mentsu.forEach(function(m) {
    if (m.type === 'kotsu') fu += isYaochu(m.tiles[0]) ? 8 : 4;
  });

  var at  = h.agariTile;
  var inM = h.mentsu.find(function(m){return m.tiles.some(function(t){return tileId(t)===tileId(at);});});
  if (inM && inM.type === 'shuntsu') {
    var nums   = inM.tiles.map(function(t){return parseInt(t.num);}).sort(function(a,b){return a-b;});
    var agariN = parseInt(at.num);
    if (agariN === nums[1])                       fu += 2;
    else if (agariN === nums[0] && nums[2] === 3) fu += 2;
    else if (agariN === nums[2] && nums[0] === 7) fu += 2;
  } else {
    fu += 2;
  }

  if (agariMode === 'ron') fu += 10;
  return roundUp10(fu);
}


/* --------------------------------------------------
   点数テーブル
-------------------------------------------------- */

function getScoreTable(fu, han, isOya) {
  if (han >= 13) return { name: '数え役満', score: isOya ? 48000 : 32000 };
  if (han >= 11) return { name: '三倍満',   score: isOya ? 36000 : 24000 };
  if (han >= 8)  return { name: '倍満',     score: isOya ? 24000 : 16000 };
  if (han >= 6)  return { name: '跳満',     score: isOya ? 18000 : 12000 };
  if (han >= 5 || (han >= 4 && fu >= 30) || (han >= 3 && fu >= 70))
                 return { name: '満貫',     score: isOya ? 12000 :  8000 };
  var bp = fu * Math.pow(2, han + 2);
  return { name: '', score: roundUp100(bp * (isOya ? 6 : 4)) };
}

function getTsumoScore(fu, han, isOya) {
  if (han >= 13) return isOya ? { oya:0, ko:16000, total:48000 } : { oya:16000, ko:8000,  total:32000 };
  if (han >= 11) return isOya ? { oya:0, ko:12000, total:36000 } : { oya:12000, ko:6000,  total:24000 };
  if (han >= 8)  return isOya ? { oya:0, ko:8000,  total:24000 } : { oya:8000,  ko:4000,  total:16000 };
  if (han >= 6)  return isOya ? { oya:0, ko:6000,  total:18000 } : { oya:6000,  ko:3000,  total:12000 };
  if (han >= 5 || (han >= 4 && fu >= 30) || (han >= 3 && fu >= 70))
    return isOya ? { oya:0, ko:4000, total:12000 } : { oya:4000, ko:2000, total:8000 };

  var bp = fu * Math.pow(2, han + 2);
  if (isOya) {
    var ko = roundUp100(bp * 2);
    return { oya: 0, ko: ko, total: ko * 3 };
  } else {
    var oya = roundUp100(bp * 2);
    var ko2 = roundUp100(bp);
    return { oya: oya, ko: ko2, total: oya + ko2 * 2 };
  }
}


/* --------------------------------------------------
   エラー表示
-------------------------------------------------- */

function showError(msg) {
  var e = document.getElementById('errorMsg');
  e.textContent   = msg;
  e.style.display = 'block';
  document.getElementById('resultArea').style.display = 'none';
}


/* --------------------------------------------------
   点数計算メイン
-------------------------------------------------- */

function calculate() {
  document.getElementById('errorMsg').style.display   = 'none';
  document.getElementById('resultArea').style.display = 'none';

  if (hand.length !== 14) {
    showError('手牌は14枚（最後がアガり牌）になるように入力してください。現在：' + hand.length + '枚');
    return;
  }

  var hands = findHand(hand);
  if (!hands || hands.length === 0) {
    showError('アガり形が見つかりません。手牌の入力を確認してください。');
    return;
  }

  var doraHan = counts.dora + counts.akaDora + (richi ? counts.uraDora : 0);
  var bestResult = null;
  var bestHan    = -1;

  hands.forEach(function(h) {
    var yaku = detectYaku(h, agari, richi, ippatsu);
    var han  = yaku.reduce(function(s,y){return s+y.han;}, 0) + doraHan;
    var fu   = calcFu(h, agari);

    var hasRealYaku = yaku.some(function(y){return y.yakuman;}) ||
                      yaku.some(function(y){return y.name !== '門前清自摸和';}) ||
                      (agari === 'tsumo' && yaku.some(function(y){return y.name === '門前清自摸和';}));
    if (!hasRealYaku && agari === 'ron') return;

    if (han > bestHan) {
      bestHan    = han;
      bestResult = { h:h, yaku:yaku, han:han, fu:fu, doraHan:doraHan };
    }
  });

  if (!bestResult) {
    showError('役がありません。ロンの場合は最低1役必要です。');
    return;
  }

  var h        = bestResult.h;
  var yaku     = bestResult.yaku;
  var han      = bestResult.han;
  var fu       = bestResult.fu;
  var dh       = bestResult.doraHan;
  var isOya    = oyako === 'oya';
  var isYakuman = yaku.some(function(y){return y.yakuman;});

  var totalScore = 0;
  var fuHanText  = '';
  var tsumoOya   = 0;
  var tsumoKo    = 0;

  if (isYakuman) {
    var cnt  = yaku.filter(function(y){return y.yakuman;}).length;
    totalScore = (isOya ? 48000 : 32000) * cnt;
    fuHanText  = cnt > 1 ? 'ダブル役満' : '役満';
  } else if (agari === 'ron') {
    var r  = getScoreTable(fu, han, isOya);
    totalScore = r.score;
    fuHanText  = r.name ? r.name : fu + '符 ' + han + '翻';
  } else {
    var r2 = getTsumoScore(fu, han, isOya);
    totalScore = r2.total;
    tsumoOya   = r2.oya;
    tsumoKo    = r2.ko;
    var r3 = getScoreTable(fu, han, isOya);
    fuHanText  = r3.name ? r3.name : fu + '符 ' + han + '翻';
  }

  document.getElementById('resultLabel').textContent = (isOya?'親':'子') + '・' + (agari==='ron'?'ロン':'ツモ');
  document.getElementById('resultScore').textContent = totalScore.toLocaleString();
  document.getElementById('fuHanLabel').textContent  = fuHanText;
  document.getElementById('fuResult').textContent    = isYakuman ? '-' : fu + '符';
  document.getElementById('hanResult').textContent   = han + '翻' + (dh > 0 ? ' (ドラ' + dh + ')' : '');

  var tDiv = document.getElementById('tsumoDetail');
  if (agari === 'tsumo') {
    tDiv.style.display = 'grid';
    if (isOya) {
      document.getElementById('oyaPayLabel').textContent = '各子の支払い';
      document.getElementById('oyaPay').textContent      = tsumoKo.toLocaleString() + '点';
      document.getElementById('koPayLabel').textContent  = '';
      document.getElementById('koPay').textContent       = '';
    } else {
      document.getElementById('oyaPayLabel').textContent = '親の支払い';
      document.getElementById('oyaPay').textContent      = tsumoOya.toLocaleString() + '点';
      document.getElementById('koPayLabel').textContent  = '子の支払い';
      document.getElementById('koPay').textContent       = tsumoKo.toLocaleString() + '点';
    }
  } else {
    tDiv.style.display = 'none';
  }

  var tagContainer = document.getElementById('yakuTags');
  tagContainer.innerHTML = '';
  if (yaku.length === 0) {
    tagContainer.innerHTML = '<span style="color:var(--text-tertiary);font-size:13px;">役なし（ドラのみ）</span>';
  } else {
    yaku.forEach(function(y) {
      var tag = document.createElement('span');
      var cls = y.yakuman ? 'yakuman' : y.han>=6 ? 'mangan' : y.han>=3 ? 'han3' : y.han>=2 ? 'han2' : 'han1';
      tag.className   = 'yaku-tag ' + cls;
      tag.textContent = y.name + (y.yakuman ? '' : ' ' + y.han + '翻');
      tagContainer.appendChild(tag);
    });
  }

  document.getElementById('resultArea').style.display = 'block';

  var rb = document.getElementById('recordBtn');
  rb.textContent = 'この結果を記録する';
  rb.classList.remove('recorded');
  rb.disabled = false;

  lastResult = {
    hand:       hand.slice(),
    yaku:       yaku,
    han:        han,
    fu:         fu,
    totalScore: totalScore,
    fuHanText:  fuHanText,
    agari:      agari,
    oyako:      oyako,
    isYakuman:  isYakuman,
  };
}


/* --------------------------------------------------
   点数記録機能（PHP API版）
-------------------------------------------------- */

async function loadRecords() {
  try {
    var res  = await fetch(API_BASE + '/get_records.php');
    var data = await res.json();
    if (data.success) {
      records = {
        best:       data.best,
        yakuStats:  data.yakuStats,
        agariCount: data.agariCount,
      };
      renderRecords();
    }
  } catch(e) {
    console.error('記録の取得に失敗しました', e);
  }
}

async function recordResult() {
  if (!lastResult) return;

  var rb = document.getElementById('recordBtn');
  rb.textContent = '保存中...';
  rb.disabled    = true;

  try {
    var res = await fetch(API_BASE + '/save_record.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        hand:       lastResult.hand,
        yaku:       lastResult.yaku,
        han:        lastResult.han,
        fu:         lastResult.fu,
        totalScore: lastResult.totalScore,
        fuHanText:  lastResult.fuHanText,
        agari:      lastResult.agari,
        oyako:      lastResult.oyako,
        isYakuman:  lastResult.isYakuman,
      }),
    });
    var data = await res.json();

    if (data.success) {
      rb.textContent = '✓ 記録しました';
      rb.classList.add('recorded');
      await loadRecords();

      var card = document.getElementById('resultArea');
      card.classList.remove('flash');
      void card.offsetWidth;
      card.classList.add('flash');
      setTimeout(function(){ card.classList.remove('flash'); }, 700);
    } else {
      rb.textContent = '保存失敗 - 再試行';
      rb.disabled    = false;
    }
  } catch(e) {
    console.error(e);
    rb.textContent = '通信エラー - 再試行';
    rb.disabled    = false;
  }
}

function resetRecords() {
  if (!confirm('記録をすべてリセットしますか？')) return;
  records = { best: null, yakuStats: {}, agariCount: 0 };
  renderRecords();
}

function renderRecords() {
  renderBestRecord();
  renderYakuStats();
}

function renderBestRecord() {
  var body = document.getElementById('bestRecordBody');
  var best = records.best;

  if (!best) {
    body.innerHTML = '<span class="record-empty">まだ記録がありません</span>';
    return;
  }

  var agariLabel = (best.oyako === 'oya' ? '親' : '子') + '・' + (best.agari_type === 'ron' ? 'ロン' : 'ツモ');

  var tilesHtml = best.hand.map(function(t, i) {
    var isLast = i === best.hand.length - 1;
    return '<div class="best-hand-tile' + (isLast ? ' agari' : '') + '">' + tileLabel(t) + '</div>';
  }).join('');

  var yakuHtml = best.yaku.map(function(y) {
    var cls = y.yakuman ? 'yakuman' : y.han>=6 ? 'mangan' : y.han>=3 ? 'han3' : y.han>=2 ? 'han2' : 'han1';
    return '<span class="yaku-tag ' + cls + '">' + y.name + (y.yakuman ? '' : ' ' + y.han + '翻') + '</span>';
  }).join('');

  body.innerHTML =
    '<div class="best-record-body">' +
      '<div class="best-hand-tiles">' + tilesHtml + '</div>' +
      '<div class="best-record-meta">' +
        '<span class="best-record-score">' + best.total_score.toLocaleString() + '点</span>' +
        '<span class="best-record-sub">' + best.fu_han_text + '　' + agariLabel + '</span>' +
      '</div>' +
      '<div class="best-record-yaku">' + (yakuHtml || '<span style="color:var(--text-tertiary);font-size:12px;">役なし（ドラのみ）</span>') + '</div>' +
      '<div class="best-record-datetime">記録日時：' + best.created_at + '</div>' +
    '</div>';
}

function renderYakuStats() {
  var body  = document.getElementById('yakuStatsBody');
  var total = document.getElementById('recordTotal');
  var stats = records.yakuStats || {};
  var count = records.agariCount || 0;

  total.textContent = count + '回アガり';

  var entries = Object.keys(stats).map(function(k){return [k, stats[k]];}).sort(function(a,b){return b[1]-a[1];});
  if (entries.length === 0) {
    body.innerHTML = '<span class="record-empty">まだ記録がありません</span>';
    return;
  }

  var maxCount = entries[0][1];
  var rows = entries.map(function(entry) {
    var name = entry[0];
    var cnt  = entry[1];
    var pct  = maxCount > 0 ? Math.round((cnt / maxCount) * 100) : 0;
    return '<tr>' +
      '<td class="yaku-stats-name">' + name + '</td>' +
      '<td class="yaku-stats-bar-wrap"><div class="yaku-stats-bar-bg"><div class="yaku-stats-bar-fill" style="width:' + pct + '%"></div></div></td>' +
      '<td class="yaku-stats-count"><strong>' + cnt + '</strong> 回</td>' +
      '</tr>';
  }).join('');

  body.innerHTML = '<table class="yaku-stats-table"><tbody>' + rows + '</tbody></table>';
}


/* --------------------------------------------------
   初期化
-------------------------------------------------- */
renderGrids();
loadRecords();
