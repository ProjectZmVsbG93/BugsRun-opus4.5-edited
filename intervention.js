// intervention.js - レース中介入システム
import { gameState } from './state.js';
import * as UI from './ui.js';

// 介入アイテム定義
export const INTERVENTION_ITEMS = [
    {
        id: 'banana',
        name: 'バナナの皮',
        icon: '🍌',
        costPercent: 0.02, // 所持金の2%
        effect: 'stun_random',
        desc: 'ランダムな虫1匹をスリップさせてスタン'
    },
    {
        id: 'energy_drink',
        name: 'エナドリ投下',
        icon: '🥤',
        costPercent: 0.03, // 3%
        effect: 'speed_up_random',
        desc: 'ランダムな虫のスピードを一時的に+5'
    },
    {
        id: 'insecticide',
        name: '殺虫スプレー',
        icon: '🧴',
        costPercent: 0.05, // 5%
        effect: 'damage_random',
        desc: 'ランダムな虫に3ダメージ'
    },
    {
        id: 'smoke_bomb',
        name: '煙幕',
        icon: '💨',
        costPercent: 0.04, // 4%
        effect: 'cancel_all',
        desc: '次のターン全虫の行動をキャンセル'
    },
    {
        id: 'sniper',
        name: '狙撃',
        icon: '🎯',
        costPercent: 0.08, // 8%
        effect: 'damage_target',
        desc: '先頭の虫に5ダメージ'
    },
    {
        id: 'healing',
        name: '回復薬',
        icon: '💊',
        costPercent: 0.06, // 6%
        effect: 'heal_random',
        desc: 'ランダムな虫のHPを全回復'
    },
    {
        id: 'lightning',
        name: '落雷',
        icon: '⚡',
        costPercent: 0.10, // 10%
        effect: 'damage_all',
        desc: '全虫に2ダメージ'
    },
    {
        id: 'blackhole',
        name: '時空の歪み',
        icon: '🌀',
        costPercent: 0.15, // 15%
        effect: 'position_shuffle',
        desc: '全虫の位置をランダムシャッフル'
    }
];

// 介入アイテム使用
export function useInterventionItem(itemId) {
    const item = INTERVENTION_ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, message: 'アイテムが見つかりません' };

    // コスト計算
    const cost = Math.floor(gameState.wallet * item.costPercent);
    if (cost <= 0) return { success: false, message: '所持金が少なすぎます' };
    if (gameState.wallet < cost) return { success: false, message: '所持金が足りません' };

    // 所持金を減らす
    gameState.wallet -= cost;
    localStorage.setItem('bugsRaceWallet', gameState.wallet);
    UI.updateWalletDisplay();

    // 効果発動
    const result = applyInterventionEffect(item);

    return {
        success: true,
        cost: cost,
        item: item,
        result: result
    };
}

// 介入効果を適用
function applyInterventionEffect(item) {
    const aliveBugs = gameState.bugs.filter(b => !b.isDead);
    if (aliveBugs.length === 0) return { message: '対象がいません' };

    const randomBug = aliveBugs[Math.floor(Math.random() * aliveBugs.length)];

    switch (item.effect) {
        case 'stun_random':
            randomBug.isStunned = true;
            UI.logMessage(randomBug.id, `🍌 ${randomBug.name}がバナナで滑った！スタン！`);
            return { target: randomBug.name, effect: 'スタン' };

        case 'speed_up_random':
            randomBug.currentPos += 10;
            UI.logMessage(randomBug.id, `🥤 ${randomBug.name}がエナドリでパワーアップ！+10cm！`);
            UI.updateRacerVisuals(randomBug);
            return { target: randomBug.name, effect: 'スピードUP' };

        case 'damage_random':
            randomBug.currentHp = Math.max(0, randomBug.currentHp - 3);
            UI.logMessage(randomBug.id, `🧴 ${randomBug.name}に殺虫スプレー！3ダメージ！`);
            if (randomBug.currentHp <= 0) {
                randomBug.isDead = true;
                UI.logMessage(randomBug.id, `${randomBug.name}は倒れた！`);
            }
            UI.updateRacerVisuals(randomBug);
            return { target: randomBug.name, effect: '3ダメージ' };

        case 'cancel_all':
            aliveBugs.forEach(bug => { bug.isStunned = true; });
            UI.logMessage('system', `💨 煙幕で全虫がスタン！`);
            return { effect: '全員スタン' };

        case 'damage_target':
            // 先頭の虫を狙う
            const sorted = [...aliveBugs].sort((a, b) => b.currentPos - a.currentPos);
            const leader = sorted[0];
            leader.currentHp = Math.max(0, leader.currentHp - 5);
            UI.logMessage(leader.id, `🎯 ${leader.name}に狙撃！5ダメージ！`);
            if (leader.currentHp <= 0) {
                leader.isDead = true;
                UI.logMessage(leader.id, `${leader.name}は倒れた！`);
            }
            UI.updateRacerVisuals(leader);
            return { target: leader.name, effect: '5ダメージ' };

        case 'heal_random':
            randomBug.currentHp = randomBug.maxHp;
            UI.logMessage(randomBug.id, `💊 ${randomBug.name}のHPが全回復！`);
            UI.updateRacerVisuals(randomBug);
            return { target: randomBug.name, effect: 'HP全回復' };

        case 'damage_all':
            aliveBugs.forEach(bug => {
                bug.currentHp = Math.max(0, bug.currentHp - 2);
                if (bug.currentHp <= 0) {
                    bug.isDead = true;
                }
            });
            UI.logMessage('system', `⚡ 落雷！全虫に2ダメージ！`);
            aliveBugs.forEach(bug => UI.updateRacerVisuals(bug));
            return { effect: '全体2ダメージ' };

        case 'position_shuffle':
            const positions = aliveBugs.map(b => b.currentPos);
            // シャッフル
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            aliveBugs.forEach((bug, i) => {
                bug.currentPos = positions[i];
            });
            UI.logMessage('system', `🌀 時空の歪みで位置がシャッフル！`);
            aliveBugs.forEach(bug => UI.updateRacerVisuals(bug));
            return { effect: '位置シャッフル' };

        default:
            return { message: '効果なし' };
    }
}

// アイテムのコストを計算
export function getItemCost(itemId) {
    const item = INTERVENTION_ITEMS.find(i => i.id === itemId);
    if (!item) return 0;
    return Math.floor(gameState.wallet * item.costPercent);
}

// 介入パネルをレンダリング
export function renderInterventionPanel(container) {
    let html = `
        <div class="intervention-panel">
            <h4>🎮 介入アイテム</h4>
            <div class="intervention-items">
    `;

    INTERVENTION_ITEMS.forEach(item => {
        const cost = getItemCost(item.id);
        const canAfford = gameState.wallet >= cost && cost > 0;
        html += `
            <button class="intervention-item ${canAfford ? '' : 'disabled'}" 
                    data-item-id="${item.id}"
                    title="${item.desc}"
                    ${canAfford ? '' : 'disabled'}>
                <span class="item-icon">${item.icon}</span>
                <span class="item-name">${item.name}</span>
                <span class="item-cost">💰${cost.toLocaleString()}</span>
            </button>
        `;
    });

    html += `
            </div>
            <div class="intervention-log" id="intervention-log"></div>
        </div>
    `;

    container.innerHTML = html;

    // イベントリスナー追加
    container.querySelectorAll('.intervention-item:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = btn.dataset.itemId;
            const item = INTERVENTION_ITEMS.find(i => i.id === itemId);
            const cost = getItemCost(itemId);

            if (confirm(`${item.icon} ${item.name} を使用しますか？\nコスト: ${cost.toLocaleString()}円\n効果: ${item.desc}`)) {
                const result = useInterventionItem(itemId);
                if (result.success) {
                    const log = document.getElementById('intervention-log');
                    if (log) {
                        log.innerHTML = `<div class="intervention-result">✓ ${item.name}を使用！${result.cost.toLocaleString()}円消費</div>`;
                    }
                    // パネル再描画
                    renderInterventionPanel(container);
                } else {
                    alert(result.message);
                }
            }
        });
    });
}
