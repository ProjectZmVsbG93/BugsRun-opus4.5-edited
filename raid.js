// raid.js - レイドバトルシステム
import { gameState } from './state.js';
import { BUG_TEMPLATES } from './data.js';
import * as UI from './ui.js';

// レイド状態
export const raidState = {
    isActive: false,
    boss: null,
    bugTeam: [],
    turn: 0,
    bet: { targetWin: null, amount: 0 }, // 'bugs' or 'boss'
    log: []
};

// ボス定義 (複数のアクション付き)
export const BOSSES = [
    {
        id: 'frog',
        name: '巨大ヒキガエル',
        icon: '🐸',
        hp: 100,
        maxHp: 100,
        actions: [
            { name: '舌攻撃', weight: 30, effect: 'instant_kill_one', desc: '1匹を即死させる' },
            { name: 'ジャンプ', weight: 25, effect: 'damage_all_3', desc: '全体に3ダメージ' },
            { name: '威嚇', weight: 20, effect: 'stun_random', desc: 'ランダム1匹をスタン' },
            { name: '丸呑み', weight: 15, effect: 'instant_kill_one', desc: '1匹を即死させる' },
            { name: '休憩', weight: 10, effect: 'nothing', desc: '何もしない' }
        ]
    },
    {
        id: 'lizard',
        name: 'オオトカゲ',
        icon: '🦎',
        hp: 80,
        maxHp: 80,
        actions: [
            { name: '尻尾スイング', weight: 30, effect: 'damage_all_3', desc: '全体に3ダメージ' },
            { name: '噛みつき', weight: 25, effect: 'damage_one_6', desc: '1匹に6ダメージ' },
            { name: '体当たり', weight: 20, effect: 'damage_all_2', desc: '全体に2ダメージ' },
            { name: '睨みつけ', weight: 15, effect: 'stun_all', desc: '全員をスタン' },
            { name: '日光浴', weight: 10, effect: 'heal_boss', desc: 'HP+10回復' }
        ]
    },
    {
        id: 'bird',
        name: '猛禽類',
        icon: '🦅',
        hp: 60,
        maxHp: 60,
        actions: [
            { name: '急降下', weight: 30, effect: 'damage_two_6', desc: '2匹に6ダメージ' },
            { name: '羽ばたき', weight: 25, effect: 'damage_all_2', desc: '全体に2ダメージ' },
            { name: '捕食', weight: 20, effect: 'instant_kill_one', desc: '1匹を即死させる' },
            { name: '威嚇飛行', weight: 15, effect: 'stun_random', desc: 'ランダム1匹スタン' },
            { name: '羽繕い', weight: 10, effect: 'nothing', desc: '何もしない' }
        ]
    },
    {
        id: 'spider',
        name: '大蜘蛛',
        icon: '🕷️',
        hp: 120,
        maxHp: 120,
        actions: [
            { name: '毒牙', weight: 25, effect: 'damage_one_4_poison', desc: '1匹に4ダメ+毒' },
            { name: '蜘蛛の糸', weight: 25, effect: 'stun_all', desc: '全員をスタン' },
            { name: '巣に捕らえる', weight: 20, effect: 'instant_kill_one', desc: '1匹を即死' },
            { name: '多脚攻撃', weight: 20, effect: 'damage_all_2', desc: '全体に2ダメージ' },
            { name: '糸の修復', weight: 10, effect: 'heal_boss', desc: 'HP+15回復' }
        ]
    },
    {
        id: 'snake',
        name: '大蛇',
        icon: '🐍',
        hp: 90,
        maxHp: 90,
        actions: [
            { name: '丸呑み', weight: 25, effect: 'instant_kill_one', desc: '1匹を即死させる' },
            { name: '締め付け', weight: 25, effect: 'damage_one_8', desc: '1匹に8ダメージ' },
            { name: '毒液噴射', weight: 20, effect: 'damage_all_2_poison', desc: '全体2ダメ+毒' },
            { name: 'とぐろを巻く', weight: 15, effect: 'defense_up', desc: '次のターン防御' },
            { name: '睨む', weight: 15, effect: 'stun_random', desc: 'ランダム1匹スタン' }
        ]
    }
];

// レイドオッズ
const RAID_ODDS = {
    bugs: 2.0,  // 虫チーム勝利
    boss: 1.5   // ボス勝利
};

// レイド開始
export function startRaid(bossId = null) {
    // ボス選択 (ランダム or 指定)
    if (bossId) {
        raidState.boss = JSON.parse(JSON.stringify(BOSSES.find(b => b.id === bossId)));
    } else {
        const randomBoss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
        raidState.boss = JSON.parse(JSON.stringify(randomBoss));
    }

    // 虫チーム選出 (ランダム5匹)
    const baseBugs = BUG_TEMPLATES.filter(t => !t.id.startsWith('index_'));
    const shuffled = [...baseBugs].sort(() => 0.5 - Math.random());
    raidState.bugTeam = shuffled.slice(0, 5).map(bug => ({
        ...bug,
        currentHp: bug.hp,
        maxHp: bug.hp,
        isDead: false,
        isPoisoned: false,
        isStunned: false
    }));

    raidState.isActive = true;
    raidState.turn = 0;
    raidState.log = [];
    raidState.bet = { targetWin: null, amount: 0 };

    return {
        boss: raidState.boss,
        bugTeam: raidState.bugTeam,
        odds: RAID_ODDS
    };
}

// ベット
export function placeBet(targetWin, amount) {
    if (amount > gameState.wallet) return false;
    if (targetWin !== 'bugs' && targetWin !== 'boss') return false;

    gameState.wallet -= amount;
    localStorage.setItem('bugsRaceWallet', gameState.wallet);
    UI.updateWalletDisplay();

    raidState.bet = { targetWin, amount };
    return true;
}

// ターン処理
export function processRaidTurn() {
    if (!raidState.isActive) return null;

    raidState.turn++;
    const turnLog = { turn: raidState.turn, actions: [] };

    // 虫チームの攻撃
    const aliveBugs = raidState.bugTeam.filter(b => !b.isDead);
    aliveBugs.forEach(bug => {
        if (bug.isStunned) {
            bug.isStunned = false;
            turnLog.actions.push({ actor: bug.name, action: 'スタンで動けない' });
            return;
        }

        // 毒ダメージ
        if (bug.isPoisoned) {
            bug.currentHp = Math.max(0, bug.currentHp - 1);
            turnLog.actions.push({ actor: bug.name, action: '毒で1ダメージ' });
            if (bug.currentHp <= 0) {
                bug.isDead = true;
                turnLog.actions.push({ actor: bug.name, action: '倒れた！' });
                return;
            }
        }

        // ボスに攻撃
        const damage = bug.attack;
        raidState.boss.hp = Math.max(0, raidState.boss.hp - damage);
        turnLog.actions.push({ actor: bug.name, action: `${raidState.boss.name}に${damage}ダメージ！` });
    });

    // ボスが倒れたか確認
    if (raidState.boss.hp <= 0) {
        return endRaid('bugs', turnLog);
    }

    // ボスの行動
    const bossAction = selectBossAction();
    turnLog.actions.push({ actor: raidState.boss.name, action: `${bossAction.name}！` });
    applyBossAction(bossAction, turnLog);

    // 虫が全滅か確認
    if (raidState.bugTeam.every(b => b.isDead)) {
        return endRaid('boss', turnLog);
    }

    raidState.log.push(turnLog);
    return {
        finished: false,
        turn: turnLog,
        bossHp: raidState.boss.hp,
        bugTeam: raidState.bugTeam
    };
}

// ボスのアクションを選択
function selectBossAction() {
    const actions = raidState.boss.actions;
    const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const action of actions) {
        rand -= action.weight;
        if (rand <= 0) return action;
    }
    return actions[0];
}

// ボスアクション適用
function applyBossAction(action, turnLog) {
    const aliveBugs = raidState.bugTeam.filter(b => !b.isDead);
    if (aliveBugs.length === 0) return;

    const randomBug = () => aliveBugs[Math.floor(Math.random() * aliveBugs.length)];

    switch (action.effect) {
        case 'instant_kill_one':
            const target = randomBug();
            target.isDead = true;
            target.currentHp = 0;
            turnLog.actions.push({ actor: raidState.boss.name, action: `${target.name}を即死させた！` });
            break;

        case 'damage_all_3':
            aliveBugs.forEach(bug => {
                bug.currentHp = Math.max(0, bug.currentHp - 3);
                if (bug.currentHp <= 0) bug.isDead = true;
            });
            turnLog.actions.push({ actor: raidState.boss.name, action: '全員に3ダメージ！' });
            break;

        case 'damage_all_2':
            aliveBugs.forEach(bug => {
                bug.currentHp = Math.max(0, bug.currentHp - 2);
                if (bug.currentHp <= 0) bug.isDead = true;
            });
            turnLog.actions.push({ actor: raidState.boss.name, action: '全員に2ダメージ！' });
            break;

        case 'damage_one_6':
            const target6 = randomBug();
            target6.currentHp = Math.max(0, target6.currentHp - 6);
            if (target6.currentHp <= 0) target6.isDead = true;
            turnLog.actions.push({ actor: raidState.boss.name, action: `${target6.name}に6ダメージ！` });
            break;

        case 'damage_one_8':
            const target8 = randomBug();
            target8.currentHp = Math.max(0, target8.currentHp - 8);
            if (target8.currentHp <= 0) target8.isDead = true;
            turnLog.actions.push({ actor: raidState.boss.name, action: `${target8.name}に8ダメージ！` });
            break;

        case 'damage_two_6':
            const shuffledBugs = [...aliveBugs].sort(() => 0.5 - Math.random());
            shuffledBugs.slice(0, 2).forEach(bug => {
                bug.currentHp = Math.max(0, bug.currentHp - 6);
                if (bug.currentHp <= 0) bug.isDead = true;
            });
            turnLog.actions.push({ actor: raidState.boss.name, action: '2匹に6ダメージ！' });
            break;

        case 'damage_one_4_poison':
            const targetPoison = randomBug();
            targetPoison.currentHp = Math.max(0, targetPoison.currentHp - 4);
            targetPoison.isPoisoned = true;
            if (targetPoison.currentHp <= 0) targetPoison.isDead = true;
            turnLog.actions.push({ actor: raidState.boss.name, action: `${targetPoison.name}に4ダメ+毒！` });
            break;

        case 'damage_all_2_poison':
            aliveBugs.forEach(bug => {
                bug.currentHp = Math.max(0, bug.currentHp - 2);
                bug.isPoisoned = true;
                if (bug.currentHp <= 0) bug.isDead = true;
            });
            turnLog.actions.push({ actor: raidState.boss.name, action: '全員に2ダメ+毒！' });
            break;

        case 'stun_random':
            const targetStun = randomBug();
            targetStun.isStunned = true;
            turnLog.actions.push({ actor: raidState.boss.name, action: `${targetStun.name}をスタン！` });
            break;

        case 'stun_all':
            aliveBugs.forEach(bug => { bug.isStunned = true; });
            turnLog.actions.push({ actor: raidState.boss.name, action: '全員をスタン！' });
            break;

        case 'heal_boss':
            const healAmount = Math.min(15, raidState.boss.maxHp - raidState.boss.hp);
            raidState.boss.hp += healAmount;
            turnLog.actions.push({ actor: raidState.boss.name, action: `HP+${healAmount}回復！` });
            break;

        case 'defense_up':
            // 次ターンダメージカット（シンプル化のため今は何もしない）
            turnLog.actions.push({ actor: raidState.boss.name, action: '防御態勢！' });
            break;

        case 'nothing':
            turnLog.actions.push({ actor: raidState.boss.name, action: '様子を見ている...' });
            break;
    }
}

// レイド終了
function endRaid(winner, turnLog) {
    raidState.isActive = false;
    raidState.log.push(turnLog);

    let payout = 0;
    let won = false;

    if (raidState.bet.amount > 0) {
        if (raidState.bet.targetWin === winner) {
            payout = Math.floor(raidState.bet.amount * RAID_ODDS[winner]);
            gameState.wallet += payout;
            localStorage.setItem('bugsRaceWallet', gameState.wallet);
            UI.updateWalletDisplay();
            won = true;
        }
    }

    return {
        finished: true,
        winner: winner,
        payout: payout,
        won: won,
        turn: turnLog
    };
}

// リセット
export function resetRaid() {
    raidState.isActive = false;
    raidState.boss = null;
    raidState.bugTeam = [];
    raidState.turn = 0;
    raidState.bet = { targetWin: null, amount: 0 };
    raidState.log = [];
}

// レイド画面をレンダリング
export function renderRaidScreen(container) {
    if (!raidState.boss) {
        container.innerHTML = '<p>レイドが開始されていません</p>';
        return;
    }

    let html = `
        <div class="raid-screen">
            <div class="raid-boss">
                <div class="boss-icon">${raidState.boss.icon}</div>
                <div class="boss-name">${raidState.boss.name}</div>
                <div class="boss-hp-bar">
                    <div class="boss-hp-fill" style="width: ${(raidState.boss.hp / raidState.boss.maxHp) * 100}%"></div>
                </div>
                <div class="boss-hp-text">${raidState.boss.hp} / ${raidState.boss.maxHp}</div>
            </div>
            
            <div class="raid-vs">VS</div>
            
            <div class="raid-team">
    `;

    raidState.bugTeam.forEach(bug => {
        const hpPercent = bug.maxHp > 0 ? (bug.currentHp / bug.maxHp) * 100 : 0;
        html += `
            <div class="raid-bug ${bug.isDead ? 'dead' : ''} ${bug.isPoisoned ? 'poisoned' : ''} ${bug.isStunned ? 'stunned' : ''}">
                <span class="raid-bug-icon">${bug.icon}</span>
                <span class="raid-bug-name">${bug.name}</span>
                <div class="raid-bug-hp">
                    <div class="raid-hp-fill" style="width: ${hpPercent}%"></div>
                </div>
            </div>
        `;
    });

    html += `
            </div>
            
            <div class="raid-log" id="raid-log">
    `;

    raidState.log.slice(-3).forEach(log => {
        log.actions.forEach(a => {
            html += `<div class="raid-log-entry">[T${log.turn}] ${a.actor}: ${a.action}</div>`;
        });
    });

    html += `
            </div>
            
            <div class="raid-actions">
                <button id="btn-raid-turn" class="btn-primary">次のターン</button>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
