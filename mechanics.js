import { gameState } from './state.js';
import * as El from './elements.js';
import { COURSES, BUG_TEMPLATES, CONDITIONS, RACE_DISTANCE } from './data.js';
import * as UI from './ui.js';
import { renderBettingScreen } from './betting.js';
import * as Daily from './daily.js';
import * as Growth from './growth.js';
import * as Lab from './lab.js';

// レース終了時の勝者を一時保存する変数
let finishedWinner = null;

// --- 追証・強制決済チェック機能 (完全版・借金対応) ---
function checkMarginCall() {
    const PORTFOLIO_KEY = 'bugsRacePortfolio';
    const STOCK_KEY = 'bugsRaceStocks';
    const WALLET_KEY = 'bugsRaceWallet';

    // データ読み込み
    let portfolio = JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || [];
    let stockData = JSON.parse(localStorage.getItem(STOCK_KEY)) || { prices: {} };

    // 所持金は gameState.wallet (メモリ上の最新) を使用
    let currentWallet = gameState.wallet;

    let marginCallOccurred = false;
    let messages = [];

    // ポートフォリオを逆順にチェック
    for (let i = portfolio.length - 1; i >= 0; i--) {
        const pos = portfolio[i];

        // レバレッジ1倍（現物）なら強制決済の対象外
        if (pos.leverage == 1) continue;

        const currentPrice = stockData.prices[pos.id];
        // データ不整合エラー回避
        if (typeof currentPrice === 'undefined') continue;

        // 評価額計算
        // 損益 = (現在値 - 取得値) * 株数
        const profit = (currentPrice - pos.buyPrice) * pos.amount;
        const valuation = pos.margin + profit; // 有効証拠金

        // 維持率判定 (30%以下でロスカット)
        const maintenanceRate = valuation / pos.margin;

        if (maintenanceRate <= 0.3) {
            marginCallOccurred = true;

            // ★修正: マイナスもそのまま適用（所持金から減算）
            const returnAmount = Math.floor(valuation);
            currentWallet += returnAmount;

            // 損失額計算 (元本 - 回収額)
            const loss = pos.margin - returnAmount;

            let msg = `【強制決済】\n「${pos.name}」の株価急落により、証拠金維持率が30%を下回ったため強制決済されました。\n(損失: -${loss.toLocaleString()}円, 回収: ${returnAmount.toLocaleString()}円)`;

            if (returnAmount < 0) {
                msg += `\n不足分 ${Math.abs(returnAmount).toLocaleString()}円 が所持金から差し引かれました。`;
            }

            messages.push(msg);

            // ポートフォリオから削除
            portfolio.splice(i, 1);
        }
    }

    // 変更があれば保存して通知
    if (marginCallOccurred) {
        // データを更新
        localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));

        // ウォレットをgameStateとlocalStorageの両方に反映
        gameState.wallet = currentWallet;
        localStorage.setItem(WALLET_KEY, currentWallet);

        // 通知
        alert(messages.join('\n\n'));

        // UI更新 (mechanics.jsでimportしているUIモジュールを使用)
        UI.updateWalletDisplay();
    }
}

// 株価データのキー
const STOCK_KEY = 'bugsRaceStocks';

// setupNewRace関数 (モード対応版)
// 引数: mode ('normal', '1v1', 'all'), selectedIds (1v1用のID配列)
export function setupNewRace(mode = 'normal', selectedIds = []) {
    finishedWinner = null;

    // コースと天気の決定
    gameState.currentCourse = COURSES[Math.floor(Math.random() * COURSES.length)];
    gameState.weather = pickWeather(gameState.currentCourse);
    gameState.volcanoLavaPos = -10;

    // インデックス銘柄を除外した虫リスト + アクティブなキメラ
    // (BUG_TEMPLATESはdata.jsからimportされている前提)
    const normalBugs = BUG_TEMPLATES.filter(t => !t.id.startsWith('index_'));
    const activeChimeras = Lab.getActiveChimeras();
    const baseBugs = [...normalBugs, ...activeChimeras];
    let participants = [];

    // --- モードによる参加者決定 ---
    if (mode === 'all') {
        // オールスター: 全員参加 (シャッフルはする)
        participants = [...baseBugs].sort(() => 0.5 - Math.random());

    } else if (mode === '1v1') {
        // タイマン: 指定された2匹
        participants = baseBugs.filter(b => selectedIds.includes(b.id));

        // 安全策: 万が一足りない場合はランダム補充
        if (participants.length < 2) {
            const others = baseBugs.filter(b => !selectedIds.includes(b.id));
            while (participants.length < 2) {
                const add = others.splice(Math.floor(Math.random() * others.length), 1)[0];
                participants.push(add);
            }
        }

    } else {
        // ノーマル (デフォルト): ランダム5匹
        const shuffled = [...baseBugs].sort(() => 0.5 - Math.random());
        participants = shuffled.slice(0, 5);
    }
    // ----------------------------

    // 虫データの生成 (ステータス決定)
    gameState.bugs = participants.map(template => {
        const conditionKeys = Object.keys(CONDITIONS);
        const condition = conditionKeys[Math.floor(Math.random() * conditionKeys.length)];
        let hp = template.hp;

        // 特定の虫のコンディション補正
        if (template.id === 'isopod' || template.id === 'beetle') {
            if (condition === '不調') hp -= 1;
            if (condition === '絶不調') hp -= 2;
        }

        return {
            ...template,
            originalCondition: condition,
            condition: condition,
            currentHp: hp,
            maxHp: hp,
            currentPos: 0,
            isDead: false,
            isStunned: false,
            isPoisoned: false,
            isInvincible: false,
            isFlying: false,
            isUnhealable: false,
            counters: { northStar: 0, minions: 0, poopSize: 0, form: 'larva', skipTurn: false },
            odds: calculateOdds(template, condition)
        };
    });

    applyPassiveWeatherEffects();
    if (['月食', '新月'].includes(gameState.weather)) {
        gameState.bugs.forEach(b => b.odds = calculateOdds(b, b.condition));
    }

    // ベット情報の初期化
    gameState.bet = { targetId: null, amount: 0, odds: 0, isLoan: false };
    if (El.betAmountInput) El.betAmountInput.value = 100;

    // 画面描画
    renderBettingScreen();
}

function pickWeather(course) {
    const rand = Math.random() * 100;
    let sum = 0;
    for (const w of course.weatherTable) {
        sum += w.weight;
        if (rand < sum) return w.type;
    }
    return course.weatherTable[0].type;
}

function calculateOdds(bug, condition) {
    const condMult = CONDITIONS[condition].val;
    const powerScore = (bug.speed * 2 + bug.hp + bug.attack) * condMult;
    let odds = (200 / powerScore).toFixed(1);
    if (odds < 1.1) odds = 1.1;
    if (odds > 50) odds = 50.0;
    return parseFloat(odds);
}

export function startRace() {
    UI.switchScreen('race');
    UI.renderRaceTrack();
    UI.updateWeatherDisplay();

    if (El.raceActionLog) {
        El.raceActionLog.innerHTML = '';
    }

    document.querySelectorAll('.status-log').forEach(el => el.innerHTML = '');

    UI.logMessage(null, `レース開始！ コース: ${gameState.currentCourse.name}`);
    UI.updateRaceRanking();
    El.nextTurnBtn.disabled = false;
    El.nextTurnBtn.textContent = "次へ進む！";
}

export function processTurn() {
    if (finishedWinner !== null) {
        UI.switchScreen('result');
        processResult(finishedWinner);
        return;
    }

    UI.clearAttackVisuals();
    El.nextTurnBtn.disabled = true;

    document.querySelectorAll('.status-log').forEach(el => el.innerHTML = '');

    if (Math.random() < gameState.currentCourse.weatherChangeRate) {
        const newWeather = pickWeather(gameState.currentCourse);
        if (newWeather !== gameState.weather) {
            gameState.weather = newWeather;
            UI.updateWeatherDisplay();
            applyPassiveWeatherEffects();
            UI.logMessage(null, `【天候変化】${gameState.weather} に変わった！`);
        }
    }
    applyTurnStartWeather();
    gameState.bugs.forEach(bug => {
        if (bug.isDead) return;
        bug.isInvincible = false;
        if (bug.isFlying) bug.isInvincible = true;
        if (bug.isStunned) { UI.logMessage(bug.id, `${bug.name}は動けない！`); bug.isStunned = false; return; }
        if (bug.isPoisoned) {
            const dmg = 1; bug.currentHp -= dmg; UI.logMessage(bug.id, `${bug.name}は毒で${dmg}ダメージ！`);
            if (bug.currentHp <= 0) { killBug(bug, '毒で力尽きた'); return; }
            if (Math.random() < 0.3) { bug.isPoisoned = false; UI.logMessage(bug.id, `${bug.name}の毒が治った！`); }
        }
        executeBugAction(bug);
        if (bug.currentPos > RACE_DISTANCE) bug.currentPos = RACE_DISTANCE;
        UI.updateRacerVisuals(bug);
    });
    checkRaceStatus();
}

function executeBugAction(bug) {
    if (bug.id === 'shrimp') {
        if (bug.counters.skipTurn) {
            UI.logMessage(bug.id, `${bug.name}は力を溜めている...`); bug.counters.skipTurn = false;
            if (Math.random() < 0.3) { healBug(bug, 1); UI.logMessage(bug.id, `${bug.name}は少し回復した(+1)`); }
            return;
        }
        bug.counters.skipTurn = true;
    }
    if (bug.id === 'butterfly') {
        if (bug.counters.form === 'larva') bug.skills = ['脱皮する', '葉っぱを食べる'];
        else if (bug.counters.form === 'pupa') bug.skills = ['かたくなる', 'もぞもぞしている'];
        else bug.skills = ['前進', '蜜を吸う', '鱗粉を撒き散らす', 'バタフライナイフ', '胡蝶の夢'];
    }
    const skill = bug.skills[Math.floor(Math.random() * bug.skills.length)];
    const condMult = CONDITIONS[bug.condition].val;

    switch (skill) {
        case '前進':
            let baseMove = bug.speed;
            if (bug.id === 'silverfish') baseMove = 25 + Math.random() * 10;
            if (bug.id === 'mantis') baseMove = 5 + Math.random() * 10;
            if (bug.id === 'isopod') baseMove = 5 + Math.random() * 5;
            if (bug.id === 'shrimp') baseMove = 10 + Math.random() * 10;
            if (bug.id === 'ladybug') baseMove = 15;
            if (bug.id === 'antlion') baseMove = 12 + Math.random() * 10;
            if (bug.id === 'ant') baseMove = 15;
            if (bug.id === 'beetle') baseMove = 5 + Math.random() * 5;
            if (bug.id === 'worm') baseMove = 10 + Math.random() * 5;
            if (bug.id === 'cicada') baseMove = 15 + Math.random() * 5;
            if (bug.id === 'samurai') baseMove = 10 + Math.random() * 5;
            if (bug.id === 'dung') baseMove = 10 + Math.random() * 5;
            if (bug.id === 'butterfly' && bug.counters.form === 'adult') baseMove = 20 + Math.random() * 5;
            if (bug.id === 'centipede') baseMove = 10 + Math.random() * 5;
            let move = baseMove * condMult;
            if (bug.id === 'antlion' && bug.counters.doubleMove) { move *= 2; bug.counters.doubleMove = false; }
            if (bug.id === 'dung') { const growth = Math.floor(move / 2); bug.counters.poopSize += growth; UI.logMessage(bug.id, `${bug.name}のフンが大きくなった(+${growth}cm)`); }
            applyWeatherMoveMod(bug, move); break;
        case 'ぶつかる':
            const targetS = getRandomTarget(bug);
            if (targetS) { UI.showAttackVisual(bug.id, targetS.id); damageBug(targetS, 2); damageBug(bug, 2); UI.logMessage(bug.id, `${bug.name}が${targetS.name}にぶつかった！(双方2ダメ)`); } break;
        case 'ヒラヒラしている': bug.isInvincible = true; UI.logMessage(bug.id, `${bug.name}はヒラヒラして攻撃をかわす構え！`); break;
        case 'オロオロしている': UI.logMessage(bug.id, `${bug.name}はオロオロしている...`); break;
        case '逆走': bug.currentPos = Math.max(0, bug.currentPos - 10); UI.logMessage(bug.id, `${bug.name}は逆走した！(-10cm)`); break;
        case '鎌を突き刺す': attackTarget(bug, 3, '鎌を突き刺した'); break;
        case '鎌を振り下ろす': attackTarget(bug, 4, '鎌を振り下ろした'); break;
        case '羽ばたく':
            const leaders = gameState.bugs.filter(b => !b.isDead && b.currentPos > bug.currentPos);
            if (leaders.length > 0) { const target = leaders[0]; bug.currentPos = target.currentPos; UI.logMessage(bug.id, `${bug.name}が羽ばたいて${target.name}に追いついた！`); }
            else UI.logMessage(bug.id, `${bug.name}は羽ばたいたが誰も前にいなかった...`); break;
        case '捕食':
            if (Math.random() < 0.05 * condMult) {
                const prey = getRandomTarget(bug);
                if (prey) {
                    UI.showAttackVisual(bug.id, prey.id, '#ffeb3b');
                    killBug(prey, 'オオカマキリに捕食された');
                    UI.logMessage(bug.id, `${bug.name}の捕食成功！`);
                }
            }
            else UI.logMessage(bug.id, `${bug.name}は捕食を試みたが失敗...`); break;
        case 'オトモを呼ぶ': bug.counters.minions++; UI.logMessage(bug.id, `${bug.name}はオトモを呼んだ！(現在${bug.counters.minions}匹)`);
            if (Math.random() < 0.5) attackTarget(bug, 2, 'オトモの攻撃'); else { bug.currentPos += 5; UI.logMessage(bug.id, `オトモが${bug.name}を運んだ！(+5cm)`); } break;
        case 'ワイはグソクムシ界の大王やぞ！！！': healBug(bug, 2); UI.logMessage(bug.id, `${bug.name}「ワイはグソクムシ界の大王やぞ！！！」(気持ちよくなってHP+2)`); break;
        case 'ハイパーシャコパンチ': attackTarget(bug, 5, 'ハイパーシャコパンチ'); break;
        case '衝撃波':
            const targetsW = getOtherAliveBugs(bug);
            if (targetsW.length > 0) { const dmgPer = Math.floor(9 / targetsW.length) || 1; targetsW.forEach(t => { UI.showAttackVisual(bug.id, t.id, '#4FC3F7'); damageBug(t, dmgPer); }); UI.logMessage(bug.id, `${bug.name}の衝撃波！(全体に約${dmgPer}ダメ)`); } break;
        case '閃光弾': bug.isInvincible = true; bug.currentPos += 10; UI.logMessage(bug.id, `${bug.name}の閃光弾！(無敵＆+10cm)`); break;
        case '回復': healBug(bug, 1); UI.logMessage(bug.id, `${bug.name}は回復した(+1)`); break;
        case '北斗七星ゲージを貯める':
            let gain = Math.floor(Math.random() * 3) + 1;
            if (bug.condition === '絶好調') gain += 2; if (bug.condition === '絶不調') gain -= 2;
            bug.counters.northStar += Math.max(1, gain); UI.logMessage(bug.id, `${bug.name}はゲージを溜めた！(現在${bug.counters.northStar})`); break;
        case '北斗千手殺':
            const targetL = getRandomTarget(bug);
            if (targetL) { UI.showAttackVisual(bug.id, targetL.id); const dmg = bug.counters.northStar >= 7 ? (2 + Math.random()) : (1 + Math.random()); damageBug(targetL, Math.floor(dmg)); damageBug(targetL, Math.floor(dmg)); UI.logMessage(bug.id, `${bug.name}の北斗千手殺！${targetL.name}に連撃！`); } break;
        case '北斗有情破顔拳':
            if (bug.counters.northStar >= 7) { UI.logMessage(bug.id, `${bug.name}「北斗有情破顔拳！！！」`); getOtherAliveBugs(bug).forEach(t => { UI.showAttackVisual(bug.id, t.id, '#ffeb3b'); killBug(t, '北斗有情破顔拳で爆発'); }); bug.counters.northStar = 0; }
            else UI.logMessage(bug.id, `${bug.name}は技を放とうとしたがゲージが足りない...`); break;
        case '残悔積歩拳': const targetZ = getRandomTarget(bug); if (targetZ) { UI.showAttackVisual(bug.id, targetZ.id, '#8D6E63'); targetZ.currentPos = Math.max(0, targetZ.currentPos - 15); UI.logMessage(bug.id, `${bug.name}の残悔積歩拳！${targetZ.name}を15cm後退させた！`); } break;
        case '突進': attackTarget(bug, 1, '突進'); break;
        case '翅の手入れ': bug.counters.doubleMove = true; UI.logMessage(bug.id, `${bug.name}は翅の手入れをしている(次ターン移動2倍)`); break;
        case '仲間を呼ぶ': bug.counters.minions += Math.floor(Math.random() * 2) + 1; UI.logMessage(bug.id, `${bug.name}は仲間を呼んだ！(現在${bug.counters.minions}匹)`); break;
        case '仲間と一緒に前進する': applyWeatherMoveMod(bug, 5 * bug.counters.minions); UI.logMessage(bug.id, `${bug.name}は仲間と進んだ！`); break;
        case '仲間と一緒に攻撃する': attackTarget(bug, bug.counters.minions, '集団攻撃'); break;
        case '突き刺す': attackTarget(bug, 4, '突き刺し'); break;
        case '突き飛ばす': const targetP = getRandomTarget(bug); if (targetP) { UI.showAttackVisual(bug.id, targetP.id, '#8D6E63'); targetP.currentPos = Math.max(0, targetP.currentPos - 15); UI.logMessage(bug.id, `${bug.name}は${targetP.name}を突き飛ばした！(-15cm)`); } break;
        case '吹き飛ばす': const targetB = getRandomTarget(bug); if (targetB) { UI.showAttackVisual(bug.id, targetB.id, '#8D6E63'); targetB.currentPos = Math.max(0, targetB.currentPos - 25); UI.logMessage(bug.id, `${bug.name}は${targetB.name}を吹き飛ばした！(-25cm)`); } break;
        case '巻き付く': attackTarget(bug, 3, '巻き付き'); break;
        case '土を食べる': healBug(bug, 3); UI.logMessage(bug.id, `${bug.name}は土を食べて回復した(+3)`); break;
        case '土に潜る': bug.isInvincible = true; applyWeatherMoveMod(bug, 10); UI.logMessage(bug.id, `${bug.name}は土に潜って進んだ！(無敵&10cm)`); break;
        case '落とし穴を掘る': const targetH = getRandomTarget(bug); if (targetH) { UI.showAttackVisual(bug.id, targetH.id, '#8D6E63'); targetH.isStunned = true; UI.logMessage(bug.id, `${bug.name}は${targetH.name}を落とし穴にハメた！`); } break;
        case '小便をかける': attackTarget(bug, 2, '小便'); break;
        case '超音波':
            const targetsC = getOtherAliveBugs(bug);
            if (targetsC.length > 0) { const dmgC = Math.floor(6 / targetsC.length) || 1; targetsC.forEach(t => { UI.showAttackVisual(bug.id, t.id, '#4FC3F7'); damageBug(t, dmgC); }); UI.logMessage(bug.id, `${bug.name}の超音波！(全体に約${dmgC}ダメ)`); } break;
        case '死んだフリ': bug.isInvincible = true; UI.logMessage(bug.id, `${bug.name}は死んだフリをした！(無敵)`); break;
        case '面打ち': attackTarget(bug, 4, '面打ち'); break;
        case '胴打ち': const targetD = getRandomTarget(bug); if (targetD) { UI.showAttackVisual(bug.id, targetD.id); damageBug(targetD, 2); targetD.isStunned = true; UI.logMessage(bug.id, `${bug.name}の胴打ち！${targetD.name}は動けない！`); } break;
        case '小手打ち': const targetK = getRandomTarget(bug); if (targetK) { UI.showAttackVisual(bug.id, targetK.id); damageBug(targetK, 3); targetK.isStunned = true; UI.logMessage(bug.id, `${bug.name}の小手打ち！${targetK.name}は動けない！`); } break;
        case '疾駆け': applyWeatherMoveMod(bug, 25); UI.logMessage(bug.id, `${bug.name}の疾駆け！(25cm)`); break;
        case '胡蝶の夢': UI.logMessage(bug.id, `${bug.name}は夢を見ている...(何もしない)`); break;
        case '噛み付く': const targetC2 = getRandomTarget(bug); if (targetC2) { UI.showAttackVisual(bug.id, targetC2.id, '#9c27b0'); targetC2.isPoisoned = true; UI.logMessage(bug.id, `${bug.name}は${targetC2.name}に噛み付いて毒を与えた！`); } break;
        case '天井に張り付く': bug.isFlying = true; UI.logMessage(bug.id, `${bug.name}は天井に張り付いた！(攻撃無効)`); break;
        case 'ロケットダイブ': if (bug.isFlying) { attackTarget(bug, 5, 'ロケットダイブ'); damageBug(bug, 1); UI.logMessage(bug.id, `${bug.name}は反動を受けた(1ダメ)`); bug.isFlying = false; } else UI.logMessage(bug.id, `${bug.name}はロケットダイブしようとしたが天井にいなかった...`); break;
        case '脱皮する':
            bug.counters.form = 'pupa';
            bug.speed = 0;
            bug.attack = 0;
            bug.icon = '<img src="butterfly_pupa.png" class="bug-img" alt="オオムラサキ(蛹)">';
            bug.name = 'オオムラサキ(蛹)';
            UI.logMessage(bug.id, `${bug.name}はサナギになった！`);
            break;
        case '葉っぱを食べる': healBug(bug, 2); UI.logMessage(bug.id, `${bug.name}は葉っぱを食べて回復した`); break;
        case 'かたくなる': bug.currentHp += 5; UI.logMessage(bug.id, `${bug.name}はかたくなった(一時的HP増加)`); break;
        case 'もぞもぞしている':
            if (Math.random() < 0.5) {
                bug.counters.form = 'adult'; bug.speed = 10; bug.attack = 4; bug.name = 'オオムラサキ(成虫)'; bug.icon = '<img src="butterfly_adult.png" class="bug-img" alt="オオムラサキ">';
                UI.logMessage(bug.id, `${bug.name}は羽化した！`);
            } else {
                UI.logMessage(bug.id, `${bug.name}は羽化の準備中...`);
            }
            break;
        case '蜜を吸う': healBug(bug, 5); UI.logMessage(bug.id, `${bug.name}は蜜を吸って回復した(+5)`); break;
        case '鱗粉を撒き散らす':
            const allTargetsR = getOtherAliveBugs(bug);
            if (allTargetsR.length > 0) {
                const targetsR = [...allTargetsR].sort(() => 0.5 - Math.random()).slice(0, 3);
                targetsR.forEach(t => {
                    UI.showAttackVisual(bug.id, t.id, '#4FC3F7');
                    damageBug(t, 3);
                });
                const names = targetsR.map(t => t.name).join('と');
                UI.logMessage(bug.id, `${bug.name}は鱗粉を撒き散らした！${names}に3ダメージ`);
            } else {
                UI.logMessage(bug.id, `${bug.name}は鱗粉を撒こうとしたが相手がいない...`);
            }
            break;
        case 'バタフライナイフ': attackTarget(bug, 5, 'バタフライナイフ'); break;
        case '糞直球':
            if (bug.counters.poopSize >= 4) {
                const targetF = getRandomTarget(bug);
                if (targetF) {
                    UI.showAttackVisual(bug.id, targetF.id);
                    damageBug(targetF, 4);
                    bug.counters.poopSize -= 4;
                    UI.logMessage(bug.id, `${bug.name}の糞直球！${targetF.name}に4ダメージ(フン-4cm)`);
                }
            } else UI.logMessage(bug.id, `${bug.name}は糞直球を投げようとしたがフンが足りない...`);
            break;
        case '糞球大車輪':
            if (bug.counters.poopSize >= 6) {
                const targetW = getRandomTarget(bug);
                if (targetW) {
                    UI.showAttackVisual(bug.id, targetW.id);
                    damageBug(targetW, 2); damageBug(targetW, 2); damageBug(targetW, 2);
                    bug.counters.poopSize -= 6;
                    UI.logMessage(bug.id, `${bug.name}の糞球大車輪！${targetW.name}に2ダメx3(フン-6cm)`);
                }
            } else UI.logMessage(bug.id, `${bug.name}は糞球大車輪をしようとしたがフンが足りない...`);
            break;
        case 'フンを食べる':
            if (bug.counters.poopSize >= 3) {
                healBug(bug, 3);
                bug.counters.poopSize -= 3;
                UI.logMessage(bug.id, `${bug.name}はフンを食べて回復した(+3)(フン-3cm)`);
            } else UI.logMessage(bug.id, `${bug.name}はフンを食べようとしたが足りない...`);
            break;
        case 'フンをなすりつける':
            if (bug.counters.poopSize >= 1) {
                const targetN = getRandomTarget(bug);
                if (targetN) {
                    UI.showAttackVisual(bug.id, targetN.id);
                    damageBug(targetN, 1);
                    targetN.isUnhealable = true;
                    bug.counters.poopSize -= 1;
                    UI.logMessage(bug.id, `${bug.name}は${targetN.name}にフンをなすりつけた！(1ダメ＆回復不可)(フン-1cm)`);
                }
            } else UI.logMessage(bug.id, `${bug.name}はフンをなすりつけようとしたが足りない...`);
            break;
        case '糞命の選択':
            if (bug.counters.poopSize >= 2) {
                const temp = bug.currentHp;
                bug.currentHp = bug.counters.poopSize;
                bug.counters.poopSize = temp;
                UI.logMessage(bug.id, `糞命の選択！${bug.name}は命と糞を入れ替えた！(HP${bug.currentHp}, フン${bug.counters.poopSize}cm)`);
            } else UI.logMessage(bug.id, `${bug.name}は選択しようとしたがフンが足りない...`);
            break;
        // === ノコギリクワガタのスキル ===
        case '挟む':
            const targetClamp = getRandomTarget(bug);
            if (targetClamp) {
                UI.showAttackVisual(bug.id, targetClamp.id, '#8B4513');
                damageBug(targetClamp, 3);
                targetClamp.isStunned = true;
                UI.logMessage(bug.id, `${bug.name}は${targetClamp.name}を挟んだ！(3ダメ＋スタン)`);
            }
            break;
        case '投げ飛ばす':
            const targetThrow = getRandomTarget(bug);
            if (targetThrow) {
                UI.showAttackVisual(bug.id, targetThrow.id, '#8D6E63');
                damageBug(targetThrow, 2);
                targetThrow.currentPos = Math.max(0, targetThrow.currentPos - 20);
                UI.logMessage(bug.id, `${bug.name}は${targetThrow.name}を投げ飛ばした！(2ダメ＆-20cm)`);
            }
            break;
        case '角で突き上げる':
            attackTarget(bug, 5, '角で突き上げ');
            break;
        case 'にらみ合い':
            const targetsGlare = getOtherAliveBugs(bug);
            if (targetsGlare.length > 0) {
                targetsGlare.forEach(t => { t.isStunned = true; });
                UI.logMessage(bug.id, `${bug.name}のにらみ合い！全員が動けない！`);
            }
            break;
        // === ゲジゲジのスキル ===
        case '高速移動':
            let speedMove = 30 + Math.random() * 20;
            applyWeatherMoveMod(bug, speedMove);
            UI.logMessage(bug.id, `${bug.name}は超高速で移動した！`);
            break;
        case '毒液を飛ばす':
            const targetVenom = getRandomTarget(bug);
            if (targetVenom) {
                UI.showAttackVisual(bug.id, targetVenom.id, '#9c27b0');
                damageBug(targetVenom, 2);
                targetVenom.isPoisoned = true;
                UI.logMessage(bug.id, `${bug.name}は${targetVenom.name}に毒液を飛ばした！(2ダメ＋毒)`);
            }
            break;
        case '脱皮で逃げる':
            bug.isInvincible = true;
            bug.currentPos += 15;
            UI.logMessage(bug.id, `${bug.name}は脱皮して逃げた！(無敵＋15cm)`);
            break;
        case '分裂する':
            if (!bug.counters.clones) bug.counters.clones = 0;
            bug.counters.clones++;
            bug.currentHp += 2;
            UI.logMessage(bug.id, `${bug.name}は分裂した！(分身${bug.counters.clones}体＆HP+2)`);
            break;
        // === カタツムリのスキル ===
        case 'ゆっくり進む':
            bug.currentPos += 8;
            bug.isInvincible = true;
            UI.logMessage(bug.id, `${bug.name}はゆっくりだが確実に進んだ(+8cm＆無敵)`);
            break;
        case '殻に籠もる':
            bug.isInvincible = true;
            healBug(bug, 3);
            UI.logMessage(bug.id, `${bug.name}は殻に籠もった！(無敵＆HP+3)`);
            break;
        case 'ヌメヌメトラップ':
            const targetSlime = getRandomTarget(bug);
            if (targetSlime) {
                UI.showAttackVisual(bug.id, targetSlime.id, '#81C784');
                targetSlime.isStunned = true;
                targetSlime.currentPos = Math.max(0, targetSlime.currentPos - 5);
                UI.logMessage(bug.id, `${bug.name}は${targetSlime.name}をヌルヌルにした！(スタン＆-5cm)`);
            }
            break;
        case '殻投げ':
            const targetShell = getRandomTarget(bug);
            if (targetShell) {
                UI.showAttackVisual(bug.id, targetShell.id);
                damageBug(targetShell, 4);
                damageBug(bug, 2);
                UI.logMessage(bug.id, `${bug.name}は殻を投げた！${targetShell.name}に4ダメ(反動2ダメ)`);
            }
            break;
        case 'でんでん太鼓':
            getOtherAliveBugs(bug).forEach(t => { t.isStunned = true; });
            UI.logMessage(bug.id, `${bug.name}のでんでん太鼓！全員が動けない！`);
            break;
        // === ゲンジボタルのスキル ===
        case '癒しの光':
            gameState.bugs.filter(b => !b.isDead).forEach(b => healBug(b, 2));
            UI.logMessage(bug.id, `${bug.name}の癒しの光！全員のHP+2`);
            break;
        case '閃光':
            getOtherAliveBugs(bug).forEach(t => { t.isStunned = true; });
            UI.logMessage(bug.id, `${bug.name}の閃光！眩しい光で全員がスタン！`);
            break;
        case '光の軌跡':
            bug.currentPos += 10;
            const ally = gameState.bugs.filter(b => !b.isDead && b.id !== bug.id)[Math.floor(Math.random() * (gameState.bugs.filter(b => !b.isDead && b.id !== bug.id).length))];
            if (ally) { ally.currentPos += 5; UI.logMessage(bug.id, `${bug.name}の光の軌跡！自分+10cm、${ally.name}+5cm`); }
            else { UI.logMessage(bug.id, `${bug.name}の光の軌跡！(+10cm)`); }
            break;
        case '蛍火':
            if (Math.random() < 0.3) {
                const targetFirefly = getRandomTarget(bug);
                if (targetFirefly) { killBug(targetFirefly, '蛍火に焼かれた'); UI.logMessage(bug.id, `${bug.name}の蛍火が${targetFirefly.name}を焼き尽くした！`); }
            } else {
                getOtherAliveBugs(bug).forEach(t => damageBug(t, 1));
                UI.logMessage(bug.id, `${bug.name}の蛍火！全員に1ダメージ`);
            }
            break;
        // === オオスズメバチのスキル ===
        case '毒針':
            const targetSting = getRandomTarget(bug);
            if (targetSting) {
                UI.showAttackVisual(bug.id, targetSting.id, '#FF5722');
                if (Math.random() < 0.25) {
                    killBug(targetSting, 'スズメバチの毒針で絶命');
                    UI.logMessage(bug.id, `${bug.name}の毒針が${targetSting.name}の急所を捉えた！即死！`);
                } else {
                    damageBug(targetSting, 4);
                    targetSting.isPoisoned = true;
                    UI.logMessage(bug.id, `${bug.name}の毒針！${targetSting.name}に4ダメ＋毒`);
                }
            }
            damageBug(bug, 1);
            break;
        case '一斉攻撃':
            const allTargets = getOtherAliveBugs(bug);
            allTargets.forEach(t => {
                UI.showAttackVisual(bug.id, t.id, '#FF5722');
                damageBug(t, 2);
            });
            UI.logMessage(bug.id, `${bug.name}の一斉攻撃！全員に2ダメージ`);
            break;
        case '狂暴化':
            if (!bug.counters.enraged) bug.counters.enraged = false;
            bug.counters.enraged = true;
            bug.attack *= 2;
            UI.logMessage(bug.id, `${bug.name}は狂暴化した！攻撃力2倍！`);
            break;
        case '女王の威厳':
            getOtherAliveBugs(bug).forEach(t => {
                if (Math.random() < 0.3) {
                    t.isStunned = true;
                    UI.logMessage(t.id, `${t.name}は${bug.name}の威厳に怯んだ！`);
                }
            });
            bug.currentPos += 10;
            UI.logMessage(bug.id, `${bug.name}は威風堂々と進んだ(+10cm)`);
            break;

        // === キメラ専用スキル (頭部系) ===
        case '角突き':
            attackTarget(bug, 3, '角で突いた');
            break;
        case '複眼照準':
            bug.counters.accuracy = true;
            bug.currentPos += 10;
            UI.logMessage(bug.id, `${bug.name}は複眼で獲物を捉えた！次の攻撃命中率UP`);
            break;
        case '仲間を呼ぶ':
            if (Math.random() < 0.4) {
                getOtherAliveBugs(bug).forEach(t => damageBug(t, 1));
                UI.logMessage(bug.id, `${bug.name}が仲間を呼んだ！全員に1ダメ`);
            } else {
                UI.logMessage(bug.id, `${bug.name}は仲間を呼んだが誰も来なかった...`);
            }
            break;
        case '毒顎':
            const targetVenomHead = getRandomTarget(bug);
            if (targetVenomHead) {
                damageBug(targetVenomHead, 2);
                targetVenomHead.isPoisoned = true;
                UI.showAttackVisual(bug.id, targetVenomHead.id, '#9C27B0');
                UI.logMessage(bug.id, `${bug.name}の毒顎！${targetVenomHead.name}に2ダメ+毒`);
            }
            break;
        case '糸吐き':
            const targetSilk = getRandomTarget(bug);
            if (targetSilk) {
                targetSilk.isStunned = true;
                UI.logMessage(bug.id, `${bug.name}が糸を吐いて${targetSilk.name}を拘束！`);
            }
            break;
        case '360度視界':
            bug.isInvincible = true;
            bug.currentPos += 8;
            UI.logMessage(bug.id, `${bug.name}は全方位を警戒しながら進んだ(+8cm, 回避UP)`);
            break;
        case '猛毒注入':
            const targetInject = getRandomTarget(bug);
            if (targetInject) {
                damageBug(targetInject, 5);
                targetInject.isPoisoned = true;
                UI.showAttackVisual(bug.id, targetInject.id, '#4A148C');
                UI.logMessage(bug.id, `${bug.name}の猛毒注入！${targetInject.name}に5ダメ+猛毒`);
            }
            break;

        // === キメラ専用スキル (胴体系) ===
        case '丸まる':
            bug.isInvincible = true;
            UI.logMessage(bug.id, `${bug.name}は丸まって防御態勢！`);
            break;
        case '殻籠り':
            healBug(bug, 3);
            bug.isInvincible = true;
            UI.logMessage(bug.id, `${bug.name}は殻に籠って回復(+3, 無敵)`);
            break;
        case 'ハイパーアーマー':
            bug.currentHp += 2;
            bug.maxHp += 2;
            UI.logMessage(bug.id, `${bug.name}の外骨格が硬化！最大HP+2`);
            break;
        case '糞転がし':
            bug.currentPos += 15;
            if (Math.random() < 0.3) {
                const targetDung = getRandomTarget(bug);
                if (targetDung) {
                    damageBug(targetDung, 2);
                    UI.logMessage(bug.id, `${bug.name}の糞が${targetDung.name}にぶつかった！`);
                }
            }
            UI.logMessage(bug.id, `${bug.name}は糞を転がしながら進んだ(+15cm)`);
            break;
        case '再生':
            healBug(bug, 4);
            UI.logMessage(bug.id, `${bug.name}の体が再生した(+4HP)`);
            break;
        case '変態準備':
            bug.attack += 1;
            bug.speed += 2;
            UI.logMessage(bug.id, `${bug.name}は変態の準備をしている...攻撃+1, 速度+2`);
            break;
        case '幸運の加護':
            if (Math.random() < 0.5) {
                bug.currentPos += 20;
                UI.logMessage(bug.id, `${bug.name}に幸運の加護！大きく前進(+20cm)`);
            } else {
                healBug(bug, 2);
                UI.logMessage(bug.id, `${bug.name}に幸運の加護！HP回復(+2)`);
            }
            break;
        case '不死身':
            if (bug.currentHp <= 2) {
                bug.currentHp = bug.maxHp;
                UI.logMessage(bug.id, `${bug.name}は不死身！HP全回復！`);
            } else {
                bug.currentPos += 10;
                UI.logMessage(bug.id, `${bug.name}は不死身の精神で進んだ(+10cm)`);
            }
            break;

        // === キメラ専用スキル (脚系) ===
        case '多脚走行':
            bug.currentPos += 25;
            UI.logMessage(bug.id, `${bug.name}の多脚走行！(+25cm)`);
            break;
        case '高速移動':
            bug.currentPos += 30;
            UI.logMessage(bug.id, `${bug.name}の高速移動！(+30cm)`);
            break;
        case '大ジャンプ':
            bug.currentPos += 35;
            UI.logMessage(bug.id, `${bug.name}の大ジャンプ！(+35cm)`);
            break;
        case '踏ん張り':
            bug.isInvincible = true;
            bug.currentPos += 5;
            UI.logMessage(bug.id, `${bug.name}は踏ん張った！(+5cm, 無敵)`);
            break;
        case '粘液トラップ':
            getOtherAliveBugs(bug).forEach(t => {
                if (Math.random() < 0.3) t.isStunned = true;
            });
            UI.logMessage(bug.id, `${bug.name}が粘液トラップを仕掛けた！`);
            break;
        case '壁歩き':
            bug.currentPos += 20;
            bug.isInvincible = true;
            UI.logMessage(bug.id, `${bug.name}は壁を歩いてショートカット！(+20cm)`);
            break;
        case 'スーパージャンプ':
            bug.currentPos += 50;
            UI.logMessage(bug.id, `${bug.name}のスーパージャンプ！(+50cm)`);
            break;
        case '水上走行':
            bug.currentPos += 18;
            bug.isInvincible = true;
            UI.logMessage(bug.id, `${bug.name}は水面を走った！(+18cm)`);
            break;

        // === キメラ専用スキル (翼系) ===
        case '鱗粉撒き':
            getOtherAliveBugs(bug).forEach(t => {
                damageBug(t, 1);
                if (Math.random() < 0.3) t.isStunned = true;
            });
            UI.logMessage(bug.id, `${bug.name}が鱗粉を撒き散らした！全員に1ダメ`);
            break;
        case 'ホバリング':
            bug.isFlying = true;
            bug.isInvincible = true;
            bug.currentPos += 12;
            UI.logMessage(bug.id, `${bug.name}はホバリングで回避！(+12cm)`);
            break;
        case '回避飛行':
            bug.isInvincible = true;
            bug.currentPos += 15;
            UI.logMessage(bug.id, `${bug.name}の回避飛行！(+15cm, 無敵)`);
            break;
        case '群れ召喚':
            getOtherAliveBugs(bug).forEach(t => {
                damageBug(t, 3);
            });
            UI.logMessage(bug.id, `${bug.name}が群れを召喚！全員に3ダメ`);
            break;

        // === キメラ専用スキル (武器系) ===
        case 'ハイパーパンチ':
            const targetPunch = getRandomTarget(bug);
            if (targetPunch) {
                UI.showAttackVisual(bug.id, targetPunch.id, '#FF5722');
                damageBug(targetPunch, 8);
                UI.logMessage(bug.id, `${bug.name}のハイパーパンチ！${targetPunch.name}に8ダメージ！`);
            }
            break;
        case '鎌斬り':
            attackTarget(bug, 5, '鎌で斬りつけた');
            break;
        case '挟撃':
            const targetPincer = getRandomTarget(bug);
            if (targetPincer) {
                UI.showAttackVisual(bug.id, targetPincer.id);
                damageBug(targetPincer, 4);
                targetPincer.isStunned = true;
                UI.logMessage(bug.id, `${bug.name}の挟撃！${targetPincer.name}に4ダメ+スタン`);
            }
            break;
        case '猛毒尾撃':
            const targetTail = getRandomTarget(bug);
            if (targetTail) {
                damageBug(targetTail, 6);
                targetTail.isPoisoned = true;
                UI.showAttackVisual(bug.id, targetTail.id, '#9C27B0');
                UI.logMessage(bug.id, `${bug.name}の猛毒尾撃！${targetTail.name}に6ダメ+毒`);
            }
            break;
        case '噛み付き':
            attackTarget(bug, 4, '噛み付いた');
            break;
        case '百爪乱舞':
            getOtherAliveBugs(bug).forEach(t => {
                if (Math.random() < 0.6) {
                    damageBug(t, 2);
                    UI.showAttackVisual(bug.id, t.id);
                }
            });
            UI.logMessage(bug.id, `${bug.name}の百爪乱舞！`);
            break;
        case '角突進':
            const targetCharge = getRandomTarget(bug);
            if (targetCharge) {
                damageBug(targetCharge, 5);
                bug.currentPos += 15;
                UI.showAttackVisual(bug.id, targetCharge.id);
                UI.logMessage(bug.id, `${bug.name}の角突進！${targetCharge.name}に5ダメ+前進(+15cm)`);
            }
            break;

        // === キメラ専用スキル (尻尾・特殊器官系) ===
        case '毒尻尾':
            const targetTailP = getRandomTarget(bug);
            if (targetTailP) {
                damageBug(targetTailP, 3);
                targetTailP.isPoisoned = true;
                UI.logMessage(bug.id, `${bug.name}の毒尻尾！${targetTailP.name}に3ダメ+毒`);
            }
            break;
        case '分裂':
            healBug(bug, bug.maxHp);
            UI.logMessage(bug.id, `${bug.name}は分裂して再生！HP全回復`);
            break;
        case '発光':
            getOtherAliveBugs(bug).forEach(t => {
                if (Math.random() < 0.4) t.isStunned = true;
            });
            UI.logMessage(bug.id, `${bug.name}が光った！近くの虫がスタン`);
            break;
        case '一撃必殺針':
            const targetBee = getRandomTarget(bug);
            if (targetBee && Math.random() < 0.2) {
                killBug(targetBee, '一撃必殺針で絶命');
                UI.logMessage(bug.id, `${bug.name}の一撃必殺針！${targetBee.name}は即死！`);
                damageBug(bug, 5);
            } else {
                UI.logMessage(bug.id, `${bug.name}の一撃必殺針は外れた...`);
            }
            break;
        case '蜘蛛の糸':
            getOtherAliveBugs(bug).forEach(t => {
                if (Math.random() < 0.5) {
                    t.isStunned = true;
                    UI.logMessage(t.id, `${t.name}は蜘蛛の糸に絡まった！`);
                }
            });
            break;
        case '猛毒分泌':
            getOtherAliveBugs(bug).forEach(t => {
                t.isPoisoned = true;
            });
            UI.logMessage(bug.id, `${bug.name}が猛毒を分泌！全員毒状態`);
            break;
        case 'フェロモン':
            bug.currentPos += 25;
            UI.logMessage(bug.id, `${bug.name}のフェロモンで他の虫が混乱！(+25cm)`);
            break;
        case '放電':
            getOtherAliveBugs(bug).forEach(t => {
                damageBug(t, 2);
                if (Math.random() < 0.3) t.isStunned = true;
            });
            UI.logMessage(bug.id, `${bug.name}が放電！全員に2ダメ`);
            break;
        case '酸噴射':
            const targetAcid = getRandomTarget(bug);
            if (targetAcid) {
                damageBug(targetAcid, 6);
                UI.showAttackVisual(bug.id, targetAcid.id, '#8BC34A');
                UI.logMessage(bug.id, `${bug.name}の酸噴射！${targetAcid.name}に6ダメージ`);
            }
            break;

        // === スキルが見つからない場合のデフォルト ===
        default:
            // 未実装スキルは前進として扱う
            let defaultMove = bug.speed;
            applyWeatherMoveMod(bug, defaultMove);
            UI.logMessage(bug.id, `${bug.name}は${skill}を使った(前進)`);
            break;
    }
}

function applyWeatherMoveMod(bug, moveAmount) {
    let finalMove = moveAmount;
    switch (gameState.weather) {
        case '雨': finalMove *= 0.5; break;
        case '雪': finalMove -= 5; break;
        case '強風': finalMove *= 2; break;
        case '追い風': finalMove += 5; break;
        case '向かい風': finalMove -= 5; break;
    }
    if (finalMove < 0) finalMove = 0;
    bug.currentPos += finalMove;
    UI.logMessage(bug.id, `${bug.name}は${Math.floor(finalMove)}cm進んだ`);
}

function getRandomTarget(attacker) {
    const targets = getOtherAliveBugs(attacker);
    if (targets.length === 0) return null;
    return targets[Math.floor(Math.random() * targets.length)];
}

function getOtherAliveBugs(me) { return gameState.bugs.filter(b => b.id !== me.id && !b.isDead); }

function attackTarget(attacker, dmg, moveName) {
    const target = getRandomTarget(attacker);
    if (target) {
        UI.showAttackVisual(attacker.id, target.id);
        if (gameState.weather === '濃霧') { UI.logMessage(attacker.id, `${attacker.name}の${moveName}は濃霧で当たらなかった！`); return; }
        let finalDmg = dmg;
        if (gameState.weather === '霧') finalDmg -= 1;
        if (finalDmg < 0) finalDmg = 0;
        damageBug(target, finalDmg);
        UI.logMessage(attacker.id, `${attacker.name}の${moveName}！${target.name}に${finalDmg}ダメージ`);
    } else UI.logMessage(attacker.id, `${attacker.name}は${moveName}を繰り出したが相手がいない...`);
}

function damageBug(bug, amount) {
    if (bug.isDead) return;

    if (bug.isInvincible) { UI.logMessage(bug.id, `${bug.name}は攻撃を無効化した！`); return; }
    bug.currentHp -= amount;
    // UI.logMessage(bug.id, `${bug.name}に${amount}ダメージ`);
    if (bug.currentHp <= 0) killBug(bug, '力尽きた');
}

function healBug(bug, amount) {
    if (bug.isUnhealable) { UI.logMessage(bug.id, `${bug.name}は回復できない！`); return; }
    bug.currentHp = Math.min(bug.currentHp + amount, bug.maxHp);
}

function applyPassiveWeatherEffects() {
    gameState.bugs.forEach(b => b.condition = b.originalCondition);
    if (gameState.weather === '月食') { gameState.bugs.forEach(b => b.condition = '絶好調'); }
    else if (gameState.weather === '新月') { gameState.bugs.forEach(b => b.condition = '絶不調'); }
}

function applyTurnStartWeather() {
    const aliveBugs = gameState.bugs.filter(b => !b.isDead);
    const deadBugs = gameState.bugs.filter(b => b.isDead);

    switch (gameState.weather) {
        case '溶岩流':
            gameState.volcanoLavaPos += 5;
            UI.logMessage(null, `【溶岩流】溶岩が迫ってきた！(現在${gameState.volcanoLavaPos}cm)`);
            aliveBugs.forEach(b => { if (b.currentPos <= gameState.volcanoLavaPos) { damageBug(b, 1); UI.logMessage(b.id, `${b.name}は溶岩に焼かれた！(1ダメ)`); } });
            break;
        case '噴火':
            UI.logMessage(null, `【噴火】地裂噴火が発生！！！`);
            const eruptionPos = Math.random() * RACE_DISTANCE;
            aliveBugs.forEach(b => { if (Math.abs(b.currentPos - eruptionPos) < 10) { damageBug(b, 10); UI.logMessage(b.id, `${b.name}は噴火に巻き込まれた！(10ダメ)`); } });
            break;
        case '曇り': if (Math.random() < 0.1 && aliveBugs.length > 0) killBug(aliveBugs[Math.floor(Math.random() * aliveBugs.length)], '鳥に連れ去られた'); break;
        case '小雨': aliveBugs.forEach(b => healBug(b, 2)); UI.logMessage(null, `【小雨】みんなのHPが2回復`); break;
        case '日照り': aliveBugs.forEach(b => damageBug(b, 1)); UI.logMessage(null, `【日照り】みんなに1ダメージ`); break;
        case '砂嵐': if (aliveBugs.length > 0) { const v = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; v.isStunned = true; UI.logMessage(v.id, `【砂嵐】${v.name}は砂が目に入って動けない！`); } break;
        case '突風': if (aliveBugs.length > 0) { const v = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; v.currentPos = Math.max(0, v.currentPos - 10); UI.logMessage(v.id, `【突風】${v.name}が10cm吹き飛ばされた！`); UI.updateRacerVisuals(v); } break;
        case '竜巻': if (Math.random() < 0.3 && aliveBugs.length > 0) { const v = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; const r = Math.random(); if (r < 0.33) { v.currentPos = Math.max(0, v.currentPos - 10); UI.logMessage(v.id, `【竜巻】${v.name}が風に吹き飛ばされた！(-10cm)`); } else if (r < 0.66) { v.currentPos = Math.max(0, v.currentPos - 20); UI.logMessage(v.id, `【竜巻】${v.name}が豪風に吹き飛ばされた！(-20cm)`); } else { killBug(v, '場外まで吹き飛ばされた'); } UI.updateRacerVisuals(v); } break;
        case '嵐': if (Math.random() < 0.3 && aliveBugs.length > 0) { const v = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; const r = Math.random(); if (r < 0.33) { v.currentPos = Math.max(0, v.currentPos - 20); UI.logMessage(v.id, `【嵐】${v.name}が豪風で戻された！(-20cm)`); } else if (r < 0.66) { v.currentPos += 10; UI.logMessage(v.id, `【嵐】${v.name}が風に押された！(+10cm)`); } else { damageBug(v, 4); UI.logMessage(v.id, `【嵐】${v.name}に小石が命中！(4ダメ)`); } UI.updateRacerVisuals(v); } break;
        case '雷': if (aliveBugs.length > 0) { const v = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; damageBug(v, 3); UI.logMessage(v.id, `【雷】${v.name}に落雷！(3ダメ)`); } break;
        case '轟雷': if (aliveBugs.length > 0) { const v = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; if (Math.random() < 0.3) killBug(v, '轟雷に打たれた'); else { damageBug(v, 3); UI.logMessage(v.id, `【轟雷】${v.name}に落雷！(3ダメ)`); } } break;
        case '日食': if (Math.random() < 0.3) { const r = Math.random(); if (r < 0.33 && aliveBugs.length >= 3) { [...aliveBugs].sort(() => 0.5 - Math.random()).slice(0, 3).forEach(v => damageBug(v, 3)); UI.logMessage(null, `【日食】イノシシ乱入！3匹にダメージ`); } else if (r < 0.66 && aliveBugs.length > 0) { const v = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; damageBug(v, 5); UI.logMessage(v.id, `【日食】${v.name}がトカゲに噛まれた！(5ダメ)`); } else if (aliveBugs.length > 0) killBug(aliveBugs[Math.floor(Math.random() * aliveBugs.length)], 'スズメに食べられた'); } break;
        case '満月': if (deadBugs.length > 0 && Math.random() < 0.3) { const l = deadBugs[Math.floor(Math.random() * deadBugs.length)]; l.isDead = false; l.currentHp = 4; UI.logMessage(l.id, `【満月】奇跡！${l.name}が復活した！`); UI.updateRacerVisuals(l); } break;
        case '桜吹雪': aliveBugs.forEach(b => damageBug(b, 1)); UI.logMessage(null, `【桜吹雪】全員に1ダメージ`); if (Math.random() < 0.3 && aliveBugs.length > 0) { const l = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; healBug(l, 3); l.isStunned = true; UI.logMessage(l.id, `【桜吹雪】${l.name}はキノコを食べて回復したが痺れた！(+3回復/行動不能)`); } break;
        case '三日月': if (aliveBugs.length > 0) { const l = aliveBugs[Math.floor(Math.random() * aliveBugs.length)]; healBug(l, 3); UI.logMessage(l.id, `【三日月】${l.name}の体力が回復した(+3)`); } break;
        // === 洞窟コースの天候 ===
        case '暗闇':
            aliveBugs.forEach(b => {
                if (Math.random() < 0.3) {
                    b.currentPos = Math.max(0, b.currentPos - 5);
                    UI.logMessage(b.id, `【暗闇】${b.name}は暗闘で道に迷った(-5cm)`);
                }
            });
            break;
        case 'コウモリ襲来':
            aliveBugs.forEach(b => {
                if (Math.random() < 0.5) {
                    damageBug(b, 2);
                    UI.logMessage(b.id, `【コウモリ襲来】${b.name}はコウモリに噛まれた！(2ダメ)`);
                }
            });
            break;
        case '落盤':
            if (aliveBugs.length > 0) {
                const victim = aliveBugs[Math.floor(Math.random() * aliveBugs.length)];
                if (Math.random() < 0.2) {
                    killBug(victim, '落盤に押し潰された');
                } else {
                    damageBug(victim, 5);
                    victim.isStunned = true;
                    UI.logMessage(victim.id, `【落盤】${victim.name}は岩に当たった！(5ダメ＋スタン)`);
                }
            }
            break;
        case '地底湖':
            aliveBugs.forEach(b => {
                healBug(b, 3);
                b.currentPos += 5;
            });
            UI.logMessage(null, `【地底湖】清らかな水で全員回復＆前進(HP+3, +5cm)`);
            break;
        // === 遺跡コースの天候 ===
        case '床トラップ':
            if (aliveBugs.length > 0) {
                const victims = [...aliveBugs].sort(() => 0.5 - Math.random()).slice(0, 2);
                victims.forEach(v => {
                    v.currentPos = Math.max(0, v.currentPos - 10);
                    damageBug(v, 2);
                    UI.logMessage(v.id, `【床トラップ】${v.name}は罠にかかった！(2ダメ＆-10cm)`);
                });
            }
            break;
        case '矢の雨':
            aliveBugs.forEach(b => {
                const arrows = Math.floor(Math.random() * 3) + 1;
                damageBug(b, arrows);
                UI.logMessage(b.id, `【矢の雨】${b.name}に${arrows}本の矢が命中！(${arrows}ダメ)`);
            });
            break;
        case '宝箱発見':
            if (aliveBugs.length > 0) {
                const lucky = aliveBugs[Math.floor(Math.random() * aliveBugs.length)];
                lucky.currentPos += 20;
                healBug(lucky, 5);
                UI.logMessage(lucky.id, `【宝箱発見】${lucky.name}は宝箱を見つけた！(+20cm＆HP+5)`);
            }
            break;
        case '石像が動く':
            if (aliveBugs.length > 0) {
                const target = aliveBugs[Math.floor(Math.random() * aliveBugs.length)];
                damageBug(target, 4);
                target.currentPos = Math.max(0, target.currentPos - 15);
                UI.logMessage(target.id, `【石像が動く】${target.name}は石像に殴られた！(4ダメ＆-15cm)`);
            }
            break;
        case '神の祝福':
            aliveBugs.forEach(b => {
                healBug(b, 5);
                b.currentPos += 10;
            });
            UI.logMessage(null, `【神の祝福】古代の神が祝福を与えた！(全員HP+5, +10cm)`);
            break;
        // === 宇宙コースの天候 ===
        case '無重力':
            aliveBugs.forEach(b => {
                const drift = Math.floor(Math.random() * 30) - 10;
                b.currentPos = Math.max(0, b.currentPos + drift);
                UI.logMessage(b.id, `【無重力】${b.name}は${drift >= 0 ? '+' : ''}${drift}cm漂流した`);
            });
            break;
        case '隕石':
            const meteorPos = Math.random() * RACE_DISTANCE;
            UI.logMessage(null, `【隕石】${Math.floor(meteorPos)}cm地点に隕石が落下！`);
            aliveBugs.forEach(b => {
                if (Math.abs(b.currentPos - meteorPos) < 15) {
                    damageBug(b, 6);
                    UI.logMessage(b.id, `${b.name}は隕石に巻き込まれた！(6ダメ)`);
                }
            });
            break;
        case 'ブラックホール':
            if (aliveBugs.length > 0) {
                const sucked = aliveBugs[Math.floor(Math.random() * aliveBugs.length)];
                if (Math.random() < 0.3) {
                    killBug(sucked, 'ブラックホールに吸い込まれた');
                } else {
                    sucked.currentPos = 0;
                    UI.logMessage(sucked.id, `【ブラックホール】${sucked.name}はスタートに戻された！`);
                }
            }
            break;
        case 'ワープゾーン':
            aliveBugs.forEach(b => {
                const warp = Math.floor(Math.random() * 50);
                b.currentPos = warp;
                UI.logMessage(b.id, `【ワープ】${b.name}は${warp}cm地点にワープした！`);
            });
            break;
        case 'オーロラ':
            aliveBugs.forEach(b => {
                b.condition = '絶好調';
                healBug(b, 3);
            });
            UI.logMessage(null, `【オーロラ】美しいオーロラに包まれ全員絶好調＆回復(HP+3)`);
            break;
    }
}

function killBug(bug, reason) {
    bug.currentHp = 0;
    bug.isDead = true;
    UI.logMessage(bug.id, `${bug.name}は${reason}...`);
    UI.updateRacerVisuals(bug);
}

function checkRaceStatus() {
    const survivors = gameState.bugs.filter(b => !b.isDead);
    const goalers = gameState.bugs.filter(b => b.currentPos >= RACE_DISTANCE);
    let raceFinished = false; let winner = null;
    if (goalers.length > 0) { goalers.sort((a, b) => b.currentPos - a.currentPos); winner = goalers[0]; raceFinished = true; }
    else if (survivors.length === 1) { winner = survivors[0]; raceFinished = true; UI.logMessage(winner.id, `生き残ったのは${winner.name}だけだ！優勝！`); }
    else if (survivors.length === 0) { raceFinished = true; }
    if (raceFinished) endRace(winner); else setTimeout(() => { El.nextTurnBtn.disabled = false; }, 600);
}

function endRace(winner) {
    El.nextTurnBtn.textContent = "結果を見る！";
    El.nextTurnBtn.disabled = false;
    finishedWinner = winner;
}

function processResult(winner) {
    // === トーナメント用: lastWinnerを保存 ===
    if (winner) {
        gameState.lastWinner = winner;
    }

    gameState.stats.totalRaces++;
    gameState.stats.totalBet += gameState.bet.amount;

    // --- ここから株価変動・上場廃止処理 ---
    const STOCK_KEY = 'bugsRaceStocks'; // キー定義
    const storedData = localStorage.getItem(STOCK_KEY);
    // 新しいデータ構造に対応 (lowPriceCounts, relistCounts を追加)
    let stockData = storedData ? JSON.parse(storedData) : { prices: {}, streaks: {}, history: {}, lowPriceCounts: {}, relistCounts: {} };

    // データ初期化補正 (既存データに新項目がない場合の対応)
    if (!stockData.lowPriceCounts) stockData.lowPriceCounts = {};
    if (!stockData.relistCounts) stockData.relistCounts = {};

    BUG_TEMPLATES.forEach(t => {
        if (!stockData.prices[t.id]) {
            // 初期上場
            const basePrice = Math.floor((t.speed * 2 + t.hp * 2 + t.attack * 5) * (1.8 + Math.random() * 0.4));
            stockData.prices[t.id] = basePrice;
            stockData.streaks[t.id] = 0;
            stockData.history[t.id] = [basePrice];
            stockData.lowPriceCounts[t.id] = 0;
            stockData.relistCounts[t.id] = 0;
        }
    });

    // 順位リスト作成
    const ranking = [...gameState.bugs].sort((a, b) => {
        if (a.isDead && !b.isDead) return 1;
        if (!a.isDead && b.isDead) return -1;
        return b.currentPos - a.currentPos;
    });

    const rankMultipliers = [1.15, 1.05, 1.0, 0.95, 0.85]; // 1位～5位

    ranking.forEach((bug, index) => {
        const currentPrice = stockData.prices[bug.id];
        let multiplier = rankMultipliers[index] || 1.0;

        // 連勝・連敗ボーナス
        let streak = stockData.streaks[bug.id] || 0;
        if (index === 0) {
            streak = streak > 0 ? streak + 1 : 1;
        } else if (index >= 3) {
            streak = streak < 0 ? streak - 1 : -1;
        } else {
            streak = 0;
        }
        stockData.streaks[bug.id] = streak;

        const streakBonus = Math.min(Math.max(streak * 0.02, -0.2), 0.2);
        multiplier += streakBonus;

        // ★追加: 再上場ボーナス (relistCount)
        // 再上場するほど、負けた時の下げ幅が減り、勝った時の上げ幅が増える
        const relist = stockData.relistCounts[bug.id] || 0;
        if (relist > 0) {
            if (multiplier < 1.0) {
                // 下げ幅緩和: 1回につき +2% (最大で1.0まで)
                multiplier = Math.min(1.0, multiplier + (relist * 0.02));
            } else if (multiplier > 1.0) {
                // 上げ幅強化: 1回につき +3%
                multiplier += (relist * 0.03);
            }
        }

        // 乱数要素
        const randomFluctuation = 0.98 + Math.random() * 0.04;

        // 新価格計算
        let newPrice = Math.floor(currentPrice * multiplier * randomFluctuation);
        if (newPrice < 10) newPrice = 10;

        // ★追加: 連続10円(ストップ安)カウント & 上場廃止判定
        if (newPrice === 10) {
            stockData.lowPriceCounts[bug.id] = (stockData.lowPriceCounts[bug.id] || 0) + 1;
        } else {
            stockData.lowPriceCounts[bug.id] = 0; // 価格が上がればリセット
        }

        // 上場廃止チェック (3回連続10円)
        if (stockData.lowPriceCounts[bug.id] >= 3) {
            // 上場廃止処理を実行し、新価格（再上場価格）を取得
            newPrice = handleDelisting(bug, stockData);
        }

        // データ更新
        stockData.prices[bug.id] = newPrice;

        // 履歴更新
        if (!stockData.history[bug.id]) stockData.history[bug.id] = [];
        stockData.history[bug.id].push(newPrice);
        if (stockData.history[bug.id].length > 10) stockData.history[bug.id].shift();
    });

    localStorage.setItem(STOCK_KEY, JSON.stringify(stockData));

    // ------------------------------------------------
    // ★追加: 投資信託 (インデックス) の価格再計算
    // ------------------------------------------------

    // 1. 通常の虫(インデックス以外)の情報を取得
    // BUG_TEMPLATES は mechanics.js で import されている前提
    const normalBugs = BUG_TEMPLATES.filter(b => !b.id.startsWith('index_'));

    const currentPrices = normalBugs.map(b => ({
        id: b.id,
        price: stockData.prices[b.id] || 10,
        attack: b.attack // 武闘派判定用
    }));

    // 価格順にソート (高い順)
    currentPrices.sort((a, b) => b.price - a.price);

    // 平均価格計算用関数 (小数点以下切り捨て)
    const calcIndexPrice = (targetBugs) => {
        if (targetBugs.length === 0) return 10;
        const sum = targetBugs.reduce((acc, b) => acc + b.price, 0);
        return Math.floor(sum / targetBugs.length);
    };

    // (A) MUSHIX: 全銘柄平均
    const priceMushix = calcIndexPrice(currentPrices);

    // (B) PRIME 5: 上位5銘柄平均
    const pricePrime = calcIndexPrice(currentPrices.slice(0, 5));

    // (C) SPEED: スピード20以上の銘柄平均
    const speedBugs = currentPrices.filter(b => b.speed >= 20);
    const priceSpeed = calcIndexPrice(speedBugs.length > 0 ? speedBugs : currentPrices.slice(0, 3));

    // (D) TANK: HP10以上の銘柄平均
    const tankBugs = currentPrices.filter(b => b.hp >= 10);
    const priceTank = calcIndexPrice(tankBugs.length > 0 ? tankBugs : currentPrices.slice(0, 3));

    // (E) TOXIC: 毒スキル持ち銘柄平均 (スズメバチ、ムカデ、サソリ系のID)
    const toxicIds = ['hornet', 'centipede', 'scorpion', 'spider'];
    const toxicBugs = currentPrices.filter(b => toxicIds.some(id => b.id && b.id.includes(id)));
    const priceToxic = calcIndexPrice(toxicBugs.length > 0 ? toxicBugs : currentPrices.slice(0, 3));

    // データ更新関数
    const updateIndexStock = (id, price) => {
        stockData.prices[id] = price;

        // 履歴更新
        if (!stockData.history[id]) stockData.history[id] = [];
        stockData.history[id].push(price);
        if (stockData.history[id].length > 10) stockData.history[id].shift();

        // インデックスは個別の連勝記録や上場廃止カウントは関係ないのでリセット
        stockData.streaks[id] = 0;
        stockData.lowPriceCounts[id] = 0;
    };

    updateIndexStock('index_mushix', priceMushix);
    updateIndexStock('index_prime', pricePrime);
    updateIndexStock('index_speed', priceSpeed);
    updateIndexStock('index_tank', priceTank);
    updateIndexStock('index_toxic', priceToxic);

    // 再保存 (インデックス価格を含めて上書き保存)
    localStorage.setItem(STOCK_KEY, JSON.stringify(stockData));
    // ------------------------------------------------

    // 追証チェック
    checkMarginCall();
    // --- 株価変動処理ここまで ---

    let won = false; let payout = 0;
    const finalRanking = [...gameState.bugs]
        .sort((a, b) => {
            if (a.isDead && !b.isDead) return 1;
            if (!a.isDead && b.isDead) return -1;
            return b.currentPos - a.currentPos;
        });

    if (winner) {
        if (!gameState.stats.winners[winner.name]) {
            gameState.stats.winners[winner.name] = 0;
        }
        gameState.stats.winners[winner.name]++;

        El.winnerAnnouncement.textContent = `優勝: ${winner.name}！`;
        El.winnerAnnouncement.style.color = '#d84315';
        if (gameState.bet.targetId === winner.id) {
            won = true;
            payout = Math.floor(gameState.bet.amount * gameState.bet.odds);
            gameState.stats.wins++;
            gameState.stats.totalEarned += payout;
            if (payout > gameState.stats.maxWin) {
                gameState.stats.maxWin = payout;
            }
        }
    } else {
        El.winnerAnnouncement.textContent = `全滅... 勝者なし`;
        El.winnerAnnouncement.style.color = '#5d4037';
        if (gameState.bet.targetId === 'ALL_DEAD') {
            won = true;
            payout = Math.floor(gameState.bet.amount * gameState.bet.odds);
            gameState.stats.wins++;
            gameState.stats.totalEarned += payout;
        } else if (gameState.bet.targetId !== 'ALL_DEAD') {
            payout = gameState.bet.amount;
            El.winnerAnnouncement.textContent += " (レース不成立 - 返金)";
            won = true;
        }
    }

    if (won) {
        if (gameState.bet.isLoan) {
            const loanAmount = 500;
            const afterRepayment = payout - loanAmount;
            gameState.wallet += afterRepayment;
            El.payoutInfo.innerHTML = `<p class="win-msg">おめでとうございます！</p><p>払い戻し: ${payout.toLocaleString()}円</p><p>借金${loanAmount.toLocaleString()}円を返済しました</p><p>純利益: ${afterRepayment.toLocaleString()}円</p>`;
        } else {
            gameState.wallet += payout;
            El.payoutInfo.innerHTML = `<p class="win-msg">おめでとうございます！</p><p>払い戻し: ${payout.toLocaleString()}円</p>`;
        }
    } else {
        if (gameState.bet.isLoan) {
            gameState.wallet -= 500;
            El.payoutInfo.innerHTML = `<p class="lose-msg">残念...</p><p>借金: 500円</p><p>現在の所持金: ${gameState.wallet.toLocaleString()}円</p>`;
        } else {
            El.payoutInfo.innerHTML = `<p class="lose-msg">残念...</p><p>没収: ${gameState.bet.amount.toLocaleString()}円</p>`;
        }
    }

    const rankingDiv = document.getElementById('result-final-ranking');
    if (rankingDiv) {
        rankingDiv.innerHTML = '<h4>最終順位</h4>';
        finalRanking.forEach((bug, index) => {
            const item = document.createElement('div');
            item.className = 'ranking-item';
            const position = index + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}位`;
            item.innerHTML = `
                <span class="ranking-position">${medal}</span>
                <span>${bug.name}</span>
                <span>${bug.isDead ? '脱落' : Math.floor(bug.currentPos) + 'cm'}</span>
            `;
            rankingDiv.appendChild(item);
        });
    }

    const resultStats = document.getElementById('result-stats');
    if (resultStats) {
        let profit;
        let betInfo;

        if (gameState.bet.isLoan) {
            if (won) {
                profit = payout - 500;
                betInfo = `借金ベット: 500円`;
            } else {
                profit = -500;
                betInfo = `借金ベット: 500円 (没収)`;
            }
        } else {
            profit = won ? payout - gameState.bet.amount : -gameState.bet.amount;
            betInfo = `賭け金: ${gameState.bet.amount.toLocaleString()}円`;
        }

        resultStats.innerHTML = `
            <div>${betInfo}</div>
            <div>${won ? `獲得: ${payout.toLocaleString()}円${gameState.bet.isLoan ? ' (借金500円返済後)' : ''}` : '没収'}</div>
            <div style="font-weight: bold; color: ${profit >= 0 ? '#4caf50' : '#f44336'};">
                ${profit >= 0 ? '+' : ''}${profit.toLocaleString()}円
            </div>
        `;
    }

    // === デイリーチャレンジ進捗更新 ===
    try {
        // レース参加数
        Daily.updateDailyProgress('race_count', 1);

        // 賭け金総額
        Daily.updateDailyProgress('bet_total', gameState.bet.amount);

        if (won) {
            // 勝利数
            Daily.updateDailyProgress('win_count', 1);

            // 稼いだ金額
            const earned = gameState.bet.isLoan ? payout - 500 : payout;
            if (earned > 0) Daily.updateDailyProgress('earn_total', earned);

            // 高オッズ勝利
            if (gameState.bet.odds >= 5) {
                Daily.updateDailyProgress('win_with_high_odds', 1);
            }

            // 指名買い (勝った虫の名前でチェック)
            if (winner && winner.name) {
                Daily.updateDailyProgress('bet_on_bug', 1, winner.name);
            }
        }
    } catch (e) {
        console.error('Daily progress update error:', e);
    }

    // === 虫の育成経験値更新 ===
    try {
        const betAmount = gameState.bet.amount || 0;
        const walletBeforeBet = gameState.wallet + betAmount; // 賭け前の所持金
        gameState.bugs.forEach(bug => {
            const isWinner = winner && winner.id === bug.id;
            const result = Growth.recordRace(bug.id, isWinner, betAmount, walletBeforeBet);
            if (result.levelUp) {
                UI.logMessage(bug.id, `🎉 ${bug.name}がLv.${result.newLevel}にレベルアップ！`);
            }
        });
    } catch (e) {
        console.error('Growth update error:', e);
    }

    UI.updateWalletDisplay();
    localStorage.setItem('bugsRaceStats', JSON.stringify(gameState.stats));
    UI.updateHomeStats();
}

// --- 追加: 上場廃止 & 再上場処理 ---
function handleDelisting(bug, stockData) {
    const PORTFOLIO_KEY = 'bugsRacePortfolio';
    const WALLET_KEY = 'bugsRaceWallet';

    // 1. 保有株の強制決済
    let portfolio = JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || [];
    let currentWallet = gameState.wallet;
    let hasStock = false;
    let returnTotal = 0;

    // 逆順ループで削除
    for (let i = portfolio.length - 1; i >= 0; i--) {
        if (portfolio[i].id === bug.id) {
            hasStock = true;
            const pos = portfolio[i];

            // 廃止価格(10円)で強制決済
            const liquidationPrice = 10;
            const liquidationValue = liquidationPrice * pos.amount; // 価値はこれだけ

            // 信用取引等の損益計算
            // 損益 = (10円 - 取得単価) * 株数
            const profit = (liquidationPrice - pos.buyPrice) * pos.amount;
            const returnAmount = Math.max(0, pos.margin + profit);

            currentWallet += returnAmount;
            returnTotal += returnAmount;

            portfolio.splice(i, 1); // 削除
        }
    }

    // 変更があれば保存
    if (hasStock) {
        localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
        gameState.wallet = currentWallet;
        localStorage.setItem(WALLET_KEY, currentWallet);
        UI.updateWalletDisplay();

        alert(`📉【上場廃止通知】\n「${bug.name}」は経営破綻により上場廃止となりました。\n保有株は整理価格(10円)で強制決済されました。\n(返還額: ${returnTotal.toLocaleString()}円)`);
    }

    // 2. 再上場処理
    stockData.relistCounts[bug.id] = (stockData.relistCounts[bug.id] || 0) + 1;
    const relistCount = stockData.relistCounts[bug.id];

    // カウントリセット
    stockData.lowPriceCounts[bug.id] = 0;
    stockData.streaks[bug.id] = 0;

    // 再上場価格の決定
    // 基本計算式 + 再上場回数に応じた上乗せ (1回につき +100円など)
    // さらに「新生」感を出すために少し高めに設定
    const basePrice = Math.floor((bug.speed * 2 + bug.hp * 2 + bug.attack * 5) * 2.0);
    const bonusPrice = relistCount * 150;
    const newListingPrice = basePrice + bonusPrice;

    // 履歴をリセットして新価格を入れる（グラフが途切れる演出の代わり）
    stockData.history[bug.id] = [newListingPrice];

    // ニュース速報風メッセージ（ログに残す）
    UI.logMessage(null, `📢【速報】${bug.name}が「新生${bug.name}」として再上場しました！(公開価格:${newListingPrice}円)`);

    return newListingPrice;
}