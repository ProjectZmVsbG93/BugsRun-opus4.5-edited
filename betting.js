// betting.js
import { gameState } from './state.js';
import * as El from './elements.js';
import { CONDITIONS } from './data.js';
import { updateWalletDisplay } from './ui.js';
import { startRace } from './mechanics.js';

export function renderBettingScreen() {
    if (!El.bettingBugList) return;
    El.bettingBugList.innerHTML = '';

    // ★ お守りボーナス計算
    let charmOddsBonus = 0;
    let charmPayoutBonus = 0;
    try {
        const collection = JSON.parse(localStorage.getItem('bugsRaceGachaCollection') || '{}');
        const CHARM_EFFECTS = [
            { id: 'charm_luck_small', odds: 0.05, payout: 0 },
            { id: 'charm_luck_medium', odds: 0.1, payout: 0 },
            { id: 'charm_luck_large', odds: 0.2, payout: 0 },
            { id: 'charm_fortune', odds: 0, payout: 0.05 },
            { id: 'charm_miracle', odds: 0.3, payout: 0.1 }
        ];
        for (const charm of CHARM_EFFECTS) {
            const count = collection[charm.id];
            if (count && count > 0) {
                charmOddsBonus += charm.odds;
                charmPayoutBonus += charm.payout;
            }
        }
    } catch (e) { /* ignore */ }

    const oddsPercentDisplay = charmOddsBonus > 0 ? ` <span class="charm-bonus">+${Math.round(charmOddsBonus * 100)}%</span>` : '';
    const payoutPercentDisplay = charmPayoutBonus > 0 ? ` <span class="charm-bonus">+${Math.round(charmPayoutBonus * 100)}%</span>` : '';

    // お守りボーナス表示
    if (charmOddsBonus > 0 || charmPayoutBonus > 0) {
        const charmInfoDiv = document.createElement('div');
        charmInfoDiv.className = 'charm-bonus-info';
        charmInfoDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); padding: 10px; border-radius: 10px; margin-bottom: 15px; text-align: center;">
                <strong>🍀 お守り効果発動中！</strong>
                ${charmOddsBonus > 0 ? `<span style="margin-left: 10px; color: #4CAF50;">オッズ +${Math.round(charmOddsBonus * 100)}%</span>` : ''}
                ${charmPayoutBonus > 0 ? `<span style="margin-left: 10px; color: #FF9800;">払戻 +${Math.round(charmPayoutBonus * 100)}%</span>` : ''}
            </div>
        `;
        El.bettingBugList.appendChild(charmInfoDiv);
    }

    // --- ステージ情報 & クイックベットボタン表示 ---
    const course = gameState.currentCourse;
    if (course) {
        // 天候確率の計算
        const totalWeight = course.weatherTable.reduce((sum, w) => sum + w.weight, 0);
        const weatherInfo = course.weatherTable.map(w => {
            const prob = Math.round((w.weight / totalWeight) * 100);
            return `${w.type}:${prob}%`;
        }).join(' / ');

        const infoDiv = document.createElement('div');
        infoDiv.className = 'bet-header-info'; // CSSクラス適用

        infoDiv.innerHTML = `
            <div class="bet-stage-row">
                <div class="bet-stage-name">🏟️ ${course.name}</div>
                <div class="bet-weather-rate">天候変化率: ${Math.round(course.weatherChangeRate * 100)}%</div>
            </div>
            <div class="bet-weather-detail">
                内訳: ${weatherInfo}
            </div>
            <div class="quick-bet-section">
                <div class="quick-bet-label">💰 クイックベット</div>
                <div class="quick-bet-grid">
                    <button class="quick-bet-btn" onclick="applyQuickBet(0.01)">1%</button>
                    <button class="quick-bet-btn" onclick="applyQuickBet(0.05)">5%</button>
                    <button class="quick-bet-btn" onclick="applyQuickBet(0.10)">10%</button>
                    <button class="quick-bet-btn" onclick="applyQuickBet(0.25)">25%</button>
                    <button class="quick-bet-btn" onclick="applyQuickBet(0.50)">50%</button>
                    <button class="quick-bet-btn" onclick="applyQuickBet(1.00)">全額</button>
                </div>
            </div>
        `;
        El.bettingBugList.appendChild(infoDiv);
    }
    // ----------------------------------------------------

    const canLoanBet = gameState.wallet < 100;
    const loanNotice = document.getElementById('loan-bet-notice');
    if (loanNotice) {
        if (canLoanBet) {
            loanNotice.classList.remove('hidden');
        } else {
            loanNotice.classList.add('hidden');
        }
    }

    gameState.bugs.forEach(bug => {
        const row = document.createElement('div');
        row.className = 'betting-row';

        const speedStars = '★'.repeat(Math.min(5, Math.ceil(bug.speed / 4)));
        const hpStars = '★'.repeat(Math.min(5, Math.ceil(bug.hp / 3)));
        const atkStars = '★'.repeat(Math.min(5, bug.attack));

        // 払い戻しにお守りボーナスを適用
        const payoutMult = 1 + charmPayoutBonus;
        const potentialWin100 = Math.floor(100 * bug.odds * payoutMult);
        const potentialWin500 = Math.floor(500 * bug.odds * payoutMult);
        const canBet = gameState.wallet >= 100;

        row.innerHTML = `
            <div class="bet-info-col">
                <div class="bug-name">${bug.name}</div>
                <div class="bug-condition-wrap">
                    <span class="condition-badge ${CONDITIONS[bug.condition].class}">${bug.condition}</span>
                    <span class="odds-display">${bug.odds}倍${oddsPercentDisplay}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="bet-image-col">
                    ${bug.icon}
                </div>
                <div class="bet-stats-col">
                    <div>Spd: ${speedStars}</div>
                    <div>HP : ${hpStars}</div>
                    <div>Atk: ${atkStars}</div>
                    <div class="potential-win">
                        ${canBet ? `100円で勝つと: ${potentialWin100.toLocaleString()}円${payoutPercentDisplay}` : `借金500円で勝つと: ${potentialWin500.toLocaleString()}円${payoutPercentDisplay}`}
                    </div>
                </div>
            </div>
            <div class="bet-action-col">
                ${canBet ? `
                <div class="bet-input-wrap">
                    <input type="number" id="bet-input-${bug.id}" class="bet-input" min="100" step="100" placeholder="0" max="${gameState.wallet}">
                    <span>円</span>
                </div>
                <button class="btn-bet" onclick="placeBetOnBug('${bug.id}')">ベット</button>
                ` : `
                <div class="bet-input-wrap">
                    <input type="number" id="bet-input-${bug.id}" class="bet-input" value="500" disabled style="background: #f0f0f0;">
                    <span>円</span>
                </div>
                <button class="btn-bet btn-loan-bet" onclick="placeLoanBetOnBug('${bug.id}')">ベット</button>
                `}
            </div>
            <div class="bet-desc-col">
                ${bug.desc}
            </div>
        `;
        El.bettingBugList.appendChild(row);
    });
}

// Window関数への登録（HTMLのonclick属性から呼ぶため）
window.placeBetOnBug = function (bugId) {
    const input = document.getElementById(`bet-input-${bugId}`);
    const amount = parseInt(input.value);

    if (!amount || amount <= 0) {
        alert('掛け金を入力してください');
        return;
    }
    if (amount > gameState.wallet) {
        alert('所持金が足りません');
        return;
    }
    if (amount % 100 !== 0) {
        alert('掛け金は100円単位でお願いします');
        return;
    }

    // ★ お守り払戻ボーナス計算
    let payoutBonus = 0;
    try {
        const collection = JSON.parse(localStorage.getItem('bugsRaceGachaCollection') || '{}');
        if (collection['charm_fortune'] && collection['charm_fortune'] > 0) payoutBonus += 0.05;
        if (collection['charm_miracle'] && collection['charm_miracle'] > 0) payoutBonus += 0.1;
    } catch (e) { /* ignore */ }

    const bug = gameState.bugs.find(b => b.id === bugId);
    gameState.bet = { targetId: bugId, amount: amount, odds: bug.odds, isLoan: false, payoutBonus: payoutBonus };
    gameState.wallet -= amount;
    updateWalletDisplay();

    const inputs = document.querySelectorAll('.bet-input');
    const buttons = document.querySelectorAll('.btn-bet');
    inputs.forEach(i => i.disabled = true);
    buttons.forEach(b => b.disabled = true);

    document.querySelectorAll('.betting-row').forEach(row => row.classList.remove('selected'));
    const selectedRow = input.closest('.betting-row');
    selectedRow.classList.add('selected');

    const potentialWin = Math.floor(amount * bug.odds * (1 + payoutBonus));
    const bonusDisplay = payoutBonus > 0 ? ` (+${Math.round(payoutBonus * 100)}% 払戻ボーナス)` : '';
    if (confirm(`${bug.name}に${amount.toLocaleString()}円賭けてレースを開始しますか？\n\n勝った場合の払い戻し: ${potentialWin.toLocaleString()}円${bonusDisplay}`)) {
        startRace();
    } else {
        gameState.wallet += amount;
        updateWalletDisplay();
        gameState.bet = { targetId: null, amount: 0, odds: 0, isLoan: false, payoutBonus: 0 };
        inputs.forEach(i => i.disabled = false);
        buttons.forEach(b => b.disabled = false);
        selectedRow.classList.remove('selected');
    }
};

window.placeLoanBetOnBug = function (bugId) {
    const LOAN_AMOUNT = 500;

    // ★ お守り払戻ボーナス計算
    let payoutBonus = 0;
    try {
        const collection = JSON.parse(localStorage.getItem('bugsRaceGachaCollection') || '{}');
        if (collection['charm_fortune'] && collection['charm_fortune'] > 0) payoutBonus += 0.05;
        if (collection['charm_miracle'] && collection['charm_miracle'] > 0) payoutBonus += 0.1;
    } catch (e) { /* ignore */ }

    const bug = gameState.bugs.find(b => b.id === bugId);
    const potentialWin = Math.floor(LOAN_AMOUNT * bug.odds * (1 + payoutBonus));
    const bonusDisplay = payoutBonus > 0 ? ` (+${Math.round(payoutBonus * 100)}% 払戻ボーナス)` : '';

    if (confirm(`${bug.name}に借金${LOAN_AMOUNT}円で賭けてレースを開始しますか？\n\n勝った場合の払い戻し: ${potentialWin.toLocaleString()}円${bonusDisplay} (借金${LOAN_AMOUNT}円を返済後、残りを獲得)\n負けた場合: 借金${LOAN_AMOUNT}円が残ります`)) {
        gameState.bet = { targetId: bugId, amount: LOAN_AMOUNT, odds: bug.odds, isLoan: true, payoutBonus: payoutBonus };

        const buttons = document.querySelectorAll('.btn-bet');
        buttons.forEach(b => b.disabled = true);

        document.querySelectorAll('.betting-row').forEach(row => row.classList.remove('selected'));
        const row = document.querySelector(`#bet-input-${bugId}`).closest('.betting-row');
        row.classList.add('selected');

        startRace();
    }
};

// --- ★追加: クイックベット計算処理 ---
window.applyQuickBet = function (percentage) {
    // 所持金に対する割合を計算
    let amount = Math.floor(gameState.wallet * percentage);

    // 100円単位に切り捨て (例: 1250円 -> 1200円)
    amount = Math.floor(amount / 100) * 100;

    // 最低100円 (所持金が足りていれば)
    if (amount < 100 && gameState.wallet >= 100) amount = 100;

    // 所持金が100円未満なら0
    if (gameState.wallet < 100) amount = 0;

    // すべての入力欄に値を反映
    const inputs = document.querySelectorAll('.bet-input');
    inputs.forEach(input => {
        // disabledになっていない（借金ベット用ではない）入力欄のみ更新
        if (!input.disabled) {
            input.value = amount;
        }
    });
};