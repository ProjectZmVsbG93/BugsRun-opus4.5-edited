// main.js
import { gameState } from './state.js';
import * as El from './elements.js';
import * as UI from './ui.js';
import { setupNewRace, processTurn } from './mechanics.js';
import { WEATHER_INFO } from './data.js';
import { BUG_TEMPLATES } from './data.js';

// === 新機能モジュールをインポート ===
import * as Tournament from './tournament.js';
import * as Achievements from './achievements.js';
import * as Daily from './daily.js';
import * as Gacha from './gacha.js';
import * as Growth from './growth.js';
import * as Intervention from './intervention.js';
import * as Raid from './raid.js';
import * as Lab from './lab.js';
import * as Encyclopedia from './encyclopedia.js';

// ウォレットに追加する関数（デイリーチャレンジ報酬用）
window.addToWallet = function (amount) {
    gameState.wallet += amount;
    localStorage.setItem('bugsRaceWallet', gameState.wallet);
    UI.updateWalletDisplay();
};

function init() {
    console.log("Initializing BugsRace (Modules)...");
    const savedWallet = localStorage.getItem('bugsRaceWallet');
    if (savedWallet) {
        gameState.wallet = parseInt(savedWallet);
    }
    const savedStats = localStorage.getItem('bugsRaceStats');
    if (savedStats) {
        gameState.stats = JSON.parse(savedStats);
    }
    UI.updateWalletDisplay();
    UI.updateHomeStats();

    // === ハンバーガーメニュー ===
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const menuDropdown = document.getElementById('menu-dropdown');

    if (menuToggleBtn && menuDropdown) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('hidden');
            menuToggleBtn.classList.toggle('active');
        });

        // 外側クリックで閉じる
        document.addEventListener('click', (e) => {
            if (!menuDropdown.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                menuDropdown.classList.add('hidden');
                menuToggleBtn.classList.remove('active');
            }
        });

        // メニュー項目クリックで閉じる
        menuDropdown.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                menuDropdown.classList.add('hidden');
                menuToggleBtn.classList.remove('active');
            });
        });
    }

    // === 実績ボタン ===
    const achievementBtn = document.getElementById('achievement-btn');
    const achievementModal = document.getElementById('achievement-modal');
    const achievementCloseBtn = document.getElementById('achievement-close-btn');
    const achievementList = document.getElementById('achievement-list');

    if (achievementBtn) {
        achievementBtn.addEventListener('click', () => {
            if (achievementModal) {
                achievementModal.classList.remove('hidden');
                if (achievementList) {
                    Achievements.renderAchievementsList(achievementList);
                }
            }
        });
    }
    if (achievementCloseBtn) {
        achievementCloseBtn.addEventListener('click', () => {
            if (achievementModal) achievementModal.classList.add('hidden');
        });
    }
    if (achievementModal) {
        achievementModal.addEventListener('click', (e) => {
            if (e.target === achievementModal) achievementModal.classList.add('hidden');
        });
    }

    // === デイリーチャレンジボタン ===
    const dailyBtn = document.getElementById('daily-btn');
    const dailyModal = document.getElementById('daily-modal');
    const dailyCloseBtn = document.getElementById('daily-close-btn');
    const dailyList = document.getElementById('daily-list');

    if (dailyBtn) {
        dailyBtn.addEventListener('click', () => {
            if (dailyModal) {
                dailyModal.classList.remove('hidden');
                if (dailyList) {
                    Daily.renderDailyChallenges(dailyList);
                }
            }
        });
    }
    if (dailyCloseBtn) {
        dailyCloseBtn.addEventListener('click', () => {
            if (dailyModal) dailyModal.classList.add('hidden');
        });
    }
    if (dailyModal) {
        dailyModal.addEventListener('click', (e) => {
            if (e.target === dailyModal) dailyModal.classList.add('hidden');
        });
    }

    const growthBtn = document.getElementById('growth-btn');
    const growthModal = document.getElementById('growth-modal');
    const growthCloseBtn = document.getElementById('growth-close-btn');
    const growthList = document.getElementById('growth-list');

    if (growthBtn) {
        growthBtn.addEventListener('click', () => {
            if (growthModal) {
                growthModal.classList.remove('hidden');
                if (growthList) {
                    Growth.renderGrowthList(growthList, BUG_TEMPLATES);
                }
            }
        });
    }
    if (growthCloseBtn) {
        growthCloseBtn.addEventListener('click', () => {
            if (growthModal) growthModal.classList.add('hidden');
        });
    }
    if (growthModal) {
        growthModal.addEventListener('click', (e) => {
            if (e.target === growthModal) growthModal.classList.add('hidden');
        });
    }

    // === 株式市場ボタン ===
    const stockBtn = document.getElementById('stock-btn');
    const stockModal = document.getElementById('stock-modal');
    const stockCloseBtn = document.getElementById('stock-close-btn');
    const stockContent = document.getElementById('stock-content');

    if (stockBtn) {
        stockBtn.addEventListener('click', () => {
            if (stockModal) {
                stockModal.classList.remove('hidden');
                renderStockPrices();
            }
        });
    }
    if (stockCloseBtn) {
        stockCloseBtn.addEventListener('click', () => {
            if (stockModal) stockModal.classList.add('hidden');
        });
    }
    if (stockModal) {
        stockModal.addEventListener('click', (e) => {
            if (e.target === stockModal) stockModal.classList.add('hidden');
        });
    }

    // 株価一覧表示 (クイック確認)
    function renderStockPrices() {
        const stockData = JSON.parse(localStorage.getItem('bugsRaceStocks') || '{}');
        const prices = stockData.prices || {};
        const history = stockData.history || {};

        // 株式銘柄 (shop.jsのBUG_INFOと一致)
        const stockBugs = [
            { id: 'silverfish', name: '紙魚', icon: '🐟' },
            { id: 'mantis', name: 'オオカマキリ', icon: '🦗' },
            { id: 'isopod', name: 'ダイオウグソクムシ', icon: '🦐' },
            { id: 'shrimp', name: 'モンハナシャコ', icon: '🥊' },
            { id: 'ladybug', name: 'ナナホシテントウ', icon: '🐞' },
            { id: 'antlion', name: 'ウスバカゲロウ', icon: '🦋' },
            { id: 'ant', name: 'クロヤマアリ', icon: '🐜' },
            { id: 'beetle', name: 'カブトムシ', icon: '🪲' },
            { id: 'worm', name: 'ミミズ', icon: '🪱' },
            { id: 'cicada', name: 'アブラゼミ', icon: '📢' },
            { id: 'samurai', name: 'サムライアリ', icon: '⚔️' },
            { id: 'dung', name: 'フンコロガシ', icon: '💩' },
            { id: 'butterfly', name: 'オオムラサキ', icon: '🦋' },
            { id: 'centipede', name: 'オオムカデ', icon: '🐛' },
            { id: 'stagbeetle', name: 'ノコギリクワガタ', icon: '🪲' },
            { id: 'houseCentipede', name: 'ゲジゲジ', icon: '🦎' },
            { id: 'snail', name: 'カタツムリ', icon: '🐌' },
            { id: 'firefly', name: 'ゲンジボタル', icon: '✨' },
            { id: 'hornet', name: 'オオスズメバチ', icon: '🐝' }
        ];

        let html = '<div class="stock-list">';

        stockBugs.forEach(bug => {
            const price = prices[bug.id] || 100;
            const hist = history[bug.id] || [100];
            const change = hist.length > 1 ? price - hist[hist.length - 2] : 0;
            const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : '';
            const changeStr = change > 0 ? `+${change}` : change.toString();

            html += `
                <div class="stock-item ${changeClass}">
                    <span class="stock-icon">${bug.icon}</span>
                    <span class="stock-name">${bug.name}</span>
                    <span class="stock-price">¥${price}</span>
                    <span class="stock-change ${changeClass}">${changeStr}</span>
                    <span class="stock-chart">${renderMiniChart(hist)}</span>
                </div>
            `;
        });

        html += '</div><h3 style="margin-top:15px; font-size:0.95rem;">📊 インデックス</h3><div class="stock-list">';

        // インデックス
        const indexes = [
            { id: 'index_mushix', name: 'MUSHIX', icon: '📈' },
            { id: 'index_prime', name: 'PRIME 5', icon: '👑' },
            { id: 'index_speed', name: 'SPEED', icon: '⚡' },
            { id: 'index_tank', name: 'TANK', icon: '🛡️' },
            { id: 'index_toxic', name: 'TOXIC', icon: '☠️' }
        ];

        indexes.forEach(idx => {
            const price = prices[idx.id] || 100;
            const hist = history[idx.id] || [100];
            const change = hist.length > 1 ? price - hist[hist.length - 2] : 0;
            const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : '';
            const changeStr = change > 0 ? `+${change}` : change.toString();

            html += `
                <div class="stock-item index-item ${changeClass}">
                    <span class="stock-icon">${idx.icon}</span>
                    <span class="stock-name">${idx.name}</span>
                    <span class="stock-price">¥${price}</span>
                    <span class="stock-change ${changeClass}">${changeStr}</span>
                    <span class="stock-chart">${renderMiniChart(hist)}</span>
                </div>
            `;
        });

        html += '</div>';
        if (stockContent) stockContent.innerHTML = html;
    }

    // ショップで売買ボタン
    document.getElementById('btn-go-shop-stock')?.addEventListener('click', () => {
        if (stockModal) stockModal.classList.add('hidden');
        // ショップモーダルを開く (既存のショップ機能へ)
        const shopBtn = document.getElementById('shop-btn');
        if (shopBtn) shopBtn.click();
    });

    // ミニチャート描画
    function renderMiniChart(history) {
        if (!history || history.length < 2) return '━';
        const max = Math.max(...history);
        const min = Math.min(...history);
        const range = max - min || 1;
        const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        return history.slice(-8).map(v => {
            const idx = Math.floor(((v - min) / range) * 7);
            return chars[Math.min(7, Math.max(0, idx))];
        }).join('');
    }

    // ポートフォリオ表示
    function renderPortfolio() {
        const stockData = JSON.parse(localStorage.getItem('bugsRaceStocks') || '{}');
        const holdings = stockData.holdings || {};
        const shorts = stockData.shorts || {};
        const prices = stockData.prices || {};

        let html = '<div class="portfolio-section"><h3>💼 保有株</h3>';
        let totalValue = 0;

        if (Object.keys(holdings).length === 0) {
            html += '<p style="color:#999">保有株がありません</p>';
        } else {
            html += '<div class="stock-list">';
            Object.entries(holdings).forEach(([id, data]) => {
                const currentPrice = prices[id] || 100;
                const profit = (currentPrice - data.avgPrice) * data.amount;
                totalValue += currentPrice * data.amount;
                html += `
                    <div class="stock-item">
                        <span class="stock-name">${id}</span>
                        <span>${data.amount}株</span>
                        <span>取得: ¥${data.avgPrice}</span>
                        <span>現在: ¥${currentPrice}</span>
                        <span class="${profit >= 0 ? 'up' : 'down'}">${profit >= 0 ? '+' : ''}${profit}円</span>
                    </div>
                `;
            });
            html += `</div><p style="font-weight:bold">総資産: ¥${totalValue}</p>`;
        }

        html += '</div><div class="portfolio-section"><h3>📉 空売りポジション</h3>';
        if (Object.keys(shorts).length === 0) {
            html += '<p style="color:#999">空売りポジションがありません</p>';
        } else {
            html += '<div class="stock-list">';
            Object.entries(shorts).forEach(([id, data]) => {
                const currentPrice = prices[id] || 100;
                const profit = (data.shortPrice - currentPrice) * data.amount;
                html += `
                    <div class="stock-item">
                        <span class="stock-name">${id}</span>
                        <span>${data.amount}株</span>
                        <span>空売価格: ¥${data.shortPrice}</span>
                        <span>現在: ¥${currentPrice}</span>
                        <span class="${profit >= 0 ? 'up' : 'down'}">${profit >= 0 ? '+' : ''}${profit}円</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        html += '</div>';
        if (stockContent) stockContent.innerHTML = html;
    }

    // 売買画面表示
    function renderTrade() {
        const stockData = JSON.parse(localStorage.getItem('bugsRaceStocks') || '{}');
        const prices = stockData.prices || {};

        let html = `
            <div class="trade-section">
                <div class="trade-form">
                    <label>銘柄選択:</label>
                    <select id="trade-stock">
        `;

        BUG_TEMPLATES.filter(b => !b.id.startsWith('index_')).forEach(bug => {
            html += `<option value="${bug.id}">${bug.icon} ${bug.name} (¥${prices[bug.id] || 100})</option>`;
        });

        html += `
                    </select>
                    <label>数量:</label>
                    <input type="number" id="trade-amount" value="1" min="1" max="100">
                    <div class="trade-buttons">
                        <button class="btn-primary" id="btn-buy" style="background:#4CAF50">📈 買い</button>
                        <button class="btn-primary" id="btn-sell" style="background:#f44336">📉 売り</button>
                        <button class="btn-primary" id="btn-short" style="background:#9C27B0">🔻 空売り</button>
                        <button class="btn-primary" id="btn-cover" style="background:#FF9800">🔺 買戻し</button>
                    </div>
                </div>
                <div id="trade-result" style="margin-top:15px; padding:10px; text-align:center;"></div>
            </div>
        `;
        if (stockContent) stockContent.innerHTML = html;

        // 売買ボタンイベント
        document.getElementById('btn-buy')?.addEventListener('click', () => executeTrade('buy'));
        document.getElementById('btn-sell')?.addEventListener('click', () => executeTrade('sell'));
        document.getElementById('btn-short')?.addEventListener('click', () => executeTrade('short'));
        document.getElementById('btn-cover')?.addEventListener('click', () => executeTrade('cover'));
    }

    // 売買実行
    function executeTrade(action) {
        const stockId = document.getElementById('trade-stock')?.value;
        const amount = parseInt(document.getElementById('trade-amount')?.value) || 1;
        const stockData = JSON.parse(localStorage.getItem('bugsRaceStocks') || '{}');
        const price = stockData.prices?.[stockId] || 100;
        const cost = price * amount;
        const resultDiv = document.getElementById('trade-result');

        if (!stockData.holdings) stockData.holdings = {};
        if (!stockData.shorts) stockData.shorts = {};

        let message = '';

        if (action === 'buy') {
            if (gameState.wallet < cost) {
                message = '💸 所持金が足りません！';
            } else {
                gameState.wallet -= cost;
                if (!stockData.holdings[stockId]) stockData.holdings[stockId] = { amount: 0, avgPrice: 0 };
                const h = stockData.holdings[stockId];
                h.avgPrice = Math.floor((h.avgPrice * h.amount + price * amount) / (h.amount + amount));
                h.amount += amount;
                message = `✅ ${stockId}を${amount}株、¥${cost}で購入しました！`;
            }
        } else if (action === 'sell') {
            if (!stockData.holdings[stockId] || stockData.holdings[stockId].amount < amount) {
                message = '❌ 売却する株がありません！';
            } else {
                stockData.holdings[stockId].amount -= amount;
                if (stockData.holdings[stockId].amount <= 0) delete stockData.holdings[stockId];
                gameState.wallet += cost;
                message = `💰 ${stockId}を${amount}株、¥${cost}で売却しました！`;
            }
        } else if (action === 'short') {
            if (gameState.wallet < cost * 1.5) {
                message = '💸 証拠金が足りません！(価格の1.5倍必要)';
            } else {
                gameState.wallet -= Math.floor(cost * 0.5); // 証拠金として50%
                if (!stockData.shorts[stockId]) stockData.shorts[stockId] = { amount: 0, shortPrice: 0 };
                const s = stockData.shorts[stockId];
                s.shortPrice = Math.floor((s.shortPrice * s.amount + price * amount) / (s.amount + amount));
                s.amount += amount;
                message = `🔻 ${stockId}を${amount}株空売りしました！`;
            }
        } else if (action === 'cover') {
            if (!stockData.shorts[stockId] || stockData.shorts[stockId].amount < amount) {
                message = '❌ 買い戻すポジションがありません！';
            } else {
                const s = stockData.shorts[stockId];
                const profit = (s.shortPrice - price) * amount;
                gameState.wallet += Math.floor(s.shortPrice * amount * 0.5) + profit; // 証拠金返却+利益
                s.amount -= amount;
                if (s.amount <= 0) delete stockData.shorts[stockId];
                message = `🔺 ${stockId}を${amount}株買い戻しました！${profit >= 0 ? '利益' : '損失'}: ${profit}円`;
            }
        }

        localStorage.setItem('bugsRaceStocks', JSON.stringify(stockData));
        localStorage.setItem('bugsRaceWallet', gameState.wallet);
        UI.updateWalletDisplay();
        if (resultDiv) resultDiv.innerHTML = `<p style="color:${message.includes('✅') || message.includes('💰') || message.includes('🔺') ? '#4CAF50' : '#f44336'}">${message}</p>`;
    }

    const gachaBtn = document.getElementById('gacha-btn');
    const gachaModal = document.getElementById('gacha-modal');
    const gachaCloseBtn = document.getElementById('gacha-close-btn');
    const gachaResultArea = document.getElementById('gacha-result-area');
    const btnGacha1 = document.getElementById('btn-gacha-1');
    const btnGacha10 = document.getElementById('btn-gacha-10');
    const btnShowCollection = document.getElementById('btn-show-collection');
    const collectionArea = document.getElementById('collection-area');

    if (gachaBtn) {
        gachaBtn.addEventListener('click', () => {
            if (gachaModal) {
                gachaModal.classList.remove('hidden');
                if (gachaResultArea) gachaResultArea.innerHTML = '<p style="color:#888;">ガチャを引いてみよう！</p>';
            }
        });
    }
    if (gachaCloseBtn) {
        gachaCloseBtn.addEventListener('click', () => {
            if (gachaModal) gachaModal.classList.add('hidden');
        });
    }
    if (gachaModal) {
        gachaModal.addEventListener('click', (e) => {
            if (e.target === gachaModal) gachaModal.classList.add('hidden');
        });
    }
    if (btnGacha1) {
        btnGacha1.addEventListener('click', () => {
            const price = Gacha.getGachaPrice(1);
            if (gameState.wallet < price) {
                alert('お金が足りません！');
                return;
            }
            gameState.wallet -= price;
            localStorage.setItem('bugsRaceWallet', gameState.wallet);
            UI.updateWalletDisplay();

            const result = Gacha.pullGacha();
            if (gachaResultArea) Gacha.showGachaResult(result, gachaResultArea);
        });
    }
    if (btnGacha10) {
        btnGacha10.addEventListener('click', () => {
            const price = Gacha.getGachaPrice(10);
            if (gameState.wallet < price) {
                alert('お金が足りません！');
                return;
            }
            gameState.wallet -= price;
            localStorage.setItem('bugsRaceWallet', gameState.wallet);
            UI.updateWalletDisplay();

            const results = Gacha.pullGacha10();
            if (gachaResultArea) Gacha.showGacha10Results(results, gachaResultArea);
        });
    }
    if (btnShowCollection) {
        btnShowCollection.addEventListener('click', () => {
            if (collectionArea) {
                collectionArea.classList.toggle('hidden');
                if (!collectionArea.classList.contains('hidden')) {
                    Gacha.renderCollection(collectionArea);
                }
            }
        });
    }

    // === トーナメントモード ===
    const modeTournament = document.getElementById('mode-tournament');
    const tournamentScreen = document.getElementById('tournament-screen');
    const btnNextTournamentMatch = document.getElementById('btn-next-tournament-match');
    const btnTournamentBack = document.getElementById('btn-tournament-back');
    const tournamentRoundInfo = document.getElementById('tournament-round-info');

    if (modeTournament) {
        modeTournament.addEventListener('click', () => {
            Tournament.startTournament();
            if (tournamentScreen) {
                // すべての画面を非表示にしてトーナメント画面を表示
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                tournamentScreen.classList.remove('hidden');
                tournamentScreen.classList.add('active');
            }
            if (tournamentRoundInfo) {
                tournamentRoundInfo.textContent = Tournament.getCurrentRoundName();
            }
        });
    }
    if (btnNextTournamentMatch) {
        btnNextTournamentMatch.addEventListener('click', () => {
            if (!Tournament.isTournamentActive()) {
                // トーナメント終了 → ホームに戻る
                UI.switchScreen('home');
                return;
            }
            // 次の試合の虫を取得してレース開始
            const matchBugIds = Tournament.proceedToNextMatch();
            setupNewRace('1v1', matchBugIds);
            UI.switchScreen('betting');
        });
    }
    if (btnTournamentBack) {
        btnTournamentBack.addEventListener('click', () => {
            Tournament.resetTournament();
            UI.switchScreen('mode-select');
        });
    }

    // === レイドモード ===
    const modeRaid = document.getElementById('mode-raid');
    const raidScreen = document.getElementById('raid-screen');
    const raidPreview = document.getElementById('raid-preview');
    const raidBattle = document.getElementById('raid-battle');
    const raidBetting = document.getElementById('raid-betting');
    const btnBetBugs = document.getElementById('btn-bet-bugs');
    const btnBetBoss = document.getElementById('btn-bet-boss');
    const btnRaidBack = document.getElementById('btn-raid-back');

    if (modeRaid) {
        modeRaid.addEventListener('click', () => {
            const result = Raid.startRaid();
            if (raidScreen) {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                raidScreen.classList.remove('hidden');
                raidScreen.classList.add('active');
            }
            if (raidBetting) raidBetting.classList.remove('hidden');
            if (raidBattle) raidBattle.classList.add('hidden');
            // プレビュー表示
            if (raidPreview) {
                raidPreview.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 4rem;">${result.boss.icon}</div>
                        <div style="font-size: 1.5rem; color: #e91e63; font-weight: bold;">${result.boss.name}</div>
                        <div style="color: #666;">HP: ${result.boss.hp}</div>
                        <div style="margin: 15px 0; font-size: 1.5rem;">VS</div>
                        <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                            ${result.bugTeam.map(bug => `<span title="${bug.name}" style="font-size: 1.5rem;">${bug.icon}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        });
    }

    function startRaidBattle(target) {
        const amountInput = document.getElementById('raid-bet-amount');
        const amount = parseInt(amountInput?.value) || 100;

        if (amount > gameState.wallet) {
            alert('所持金が足りません');
            return;
        }

        Raid.placeBet(target, amount);

        if (raidBetting) raidBetting.classList.add('hidden');
        if (raidBattle) raidBattle.classList.remove('hidden');

        Raid.renderRaidScreen(raidBattle);

        // ターン進行ボタン
        const btnRaidTurn = document.getElementById('btn-raid-turn');
        if (btnRaidTurn) {
            btnRaidTurn.onclick = () => {
                const result = Raid.processRaidTurn();
                Raid.renderRaidScreen(raidBattle);

                if (result && result.finished) {
                    setTimeout(() => {
                        const winText = result.winner === 'bugs' ? '🐛 虫チームの勝利！' : '👹 ボスの勝利！';
                        const msg = result.won
                            ? `${winText}\n報酬: ${result.payout.toLocaleString()}円 獲得！`
                            : `${winText}\n残念...賭け金没収`;
                        alert(msg);
                        UI.updateWalletDisplay();
                    }, 500);
                }
            };
        }
    }

    if (btnBetBugs) {
        btnBetBugs.addEventListener('click', () => startRaidBattle('bugs'));
    }
    if (btnBetBoss) {
        btnBetBoss.addEventListener('click', () => startRaidBattle('boss'));
    }
    if (btnRaidBack) {
        btnRaidBack.addEventListener('click', () => {
            Raid.resetRaid();
            UI.switchScreen('mode-select');
        });
    }

    // === 配合ラボ ===
    const modeLab = document.getElementById('mode-lab');
    const labScreen = document.getElementById('lab-screen');
    const labContent = document.getElementById('lab-content');
    const btnLabBack = document.getElementById('btn-lab-back');

    if (modeLab) {
        modeLab.addEventListener('click', () => {
            if (labScreen) {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                labScreen.classList.remove('hidden');
                labScreen.classList.add('active');
            }
            if (labContent) {
                Lab.renderLabScreen(labContent);
            }
        });
    }
    if (btnLabBack) {
        btnLabBack.addEventListener('click', () => UI.switchScreen('mode-select'));
    }

    // ラボパーツ購入用グローバル関数
    window.buyLabPart = function (partId, price) {
        if (gameState.wallet < price) {
            alert('所持金が足りません');
            return;
        }
        gameState.wallet -= price;
        localStorage.setItem('bugsRaceWallet', gameState.wallet);
        UI.updateWalletDisplay();

        const result = Lab.buyPart(partId, price + gameState.wallet);
        if (result.success) {
            alert(`${result.part.name} を購入しました！`);
            if (labContent) Lab.renderLabScreen(labContent);
        }
    };

    // Event Listeners
    if (El.gameStartBtn) {
        El.gameStartBtn.addEventListener('click', startGameFlow);
    }
    if (El.shopBtn) {
        El.shopBtn.addEventListener('click', () => {
            window.location.href = 'shop.html';
        });
    }
    if (El.toBettingBtn) El.toBettingBtn.addEventListener('click', () => UI.switchScreen('betting'));
    if (El.nextTurnBtn) El.nextTurnBtn.addEventListener('click', () => {
        processTurn();
        // 介入クールダウンを減らす
        if (window.decreaseInterventionCooldown) {
            window.decreaseInterventionCooldown();
        }
    });

    // ★修正: 「次のレースへ」ボタンを押したとき、モード選択画面に戻る
    if (El.nextRaceBtn) {
        El.nextRaceBtn.addEventListener('click', () => {
            // 実績チェック
            Achievements.checkAchievements(gameState.stats, gameState.wallet);

            // トーナメント中なら結果を記録
            if (Tournament.isTournamentActive()) {
                // 勝者を記録（gameState.lastWinnerがあれば）
                if (gameState.lastWinner) {
                    const isFinished = Tournament.recordMatchResult(gameState.lastWinner);
                    if (tournamentRoundInfo) {
                        tournamentRoundInfo.textContent = Tournament.getCurrentRoundName();
                    }
                }
                // トーナメント画面に戻る
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                if (tournamentScreen) {
                    tournamentScreen.classList.remove('hidden');
                    tournamentScreen.classList.add('active');
                }
                return;
            }

            UI.switchScreen('mode-select');
        });
    }

    // Statistics Modal
    if (El.statsToggleBtn) El.statsToggleBtn.addEventListener('click', () => {
        El.statsModal.classList.remove('hidden');
        UI.updateStatsDisplay();
    });
    if (El.statsCloseBtn) El.statsCloseBtn.addEventListener('click', () => {
        El.statsModal.classList.add('hidden');
    });
    if (El.statsModal) El.statsModal.addEventListener('click', (e) => {
        if (e.target === El.statsModal) El.statsModal.classList.add('hidden');
    });

    // --- データ管理モーダルのロジック ---
    const dataModal = document.getElementById('data-modal');
    const dataManageBtn = document.getElementById('data-manage-btn');
    const dataCloseBtn = document.getElementById('data-close-btn');
    const exportArea = document.getElementById('export-area');
    const btnCopy = document.getElementById('btn-copy-data');
    const importArea = document.getElementById('import-area');
    const btnImport = document.getElementById('btn-import-data');

    // 開く
    if (dataManageBtn) {
        dataManageBtn.addEventListener('click', () => {
            dataModal.classList.remove('hidden');
            // 現在のデータをJSON化して表示
            const allData = {
                wallet: localStorage.getItem('bugsRaceWallet'),
                stats: localStorage.getItem('bugsRaceStats'),
                // ショップ関連のデータも一緒に
                inventory: localStorage.getItem('bugsRaceInventory'),
                stocks: localStorage.getItem('bugsRaceStocks'),
                portfolio: localStorage.getItem('bugsRacePortfolio'),
                fx: localStorage.getItem('bugsRaceFxPositions') // 旧FXデータも念のため
            };
            // null除外
            Object.keys(allData).forEach(key => {
                if (allData[key] === null) delete allData[key];
            });

            exportArea.value = JSON.stringify(allData);
        });
    }

    // 閉じる
    if (dataCloseBtn) {
        dataCloseBtn.addEventListener('click', () => dataModal.classList.add('hidden'));
    }
    if (dataModal) {
        dataModal.addEventListener('click', (e) => {
            if (e.target === dataModal) dataModal.classList.add('hidden');
        });
    }

    // コピー
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            exportArea.select();
            document.execCommand('copy');
            alert('データをクリップボードにコピーしました！');
        });
    }

    // インポート
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            const jsonStr = importArea.value.trim();
            if (!jsonStr) {
                alert('データが空です');
                return;
            }

            try {
                const data = JSON.parse(jsonStr);

                if (!confirm('現在のデータを上書きして読み込みますか？\n(この操作は取り消せません)')) return;

                // データをローカルストレージに保存
                if (data.wallet) localStorage.setItem('bugsRaceWallet', data.wallet);
                if (data.stats) localStorage.setItem('bugsRaceStats', data.stats);
                if (data.inventory) localStorage.setItem('bugsRaceInventory', data.inventory);
                if (data.stocks) localStorage.setItem('bugsRaceStocks', data.stocks);
                if (data.portfolio) localStorage.setItem('bugsRacePortfolio', data.portfolio);
                if (data.fx) localStorage.setItem('bugsRaceFxPositions', data.fx);

                alert('データの読み込みに成功しました！\nページをリロードします。');
                location.reload();

            } catch (e) {
                alert('データの形式が正しくありません。\n' + e);
            }
        });
    }
    // Quick bet buttons
    document.querySelectorAll('.btn-quick-bet').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            document.querySelectorAll('.bet-input').forEach(input => {
                if (amount === 'all') {
                    input.value = gameState.wallet;
                } else {
                    const numAmount = parseInt(amount);
                    input.value = Math.min(numAmount, gameState.wallet);
                }
            });
        });
    });

    // Clear log button
    if (El.clearLogBtn) {
        El.clearLogBtn.addEventListener('click', () => {
            if (El.raceActionLog) {
                El.raceActionLog.innerHTML = '';
            }
        });
    }

    // Initial Screen
    UI.switchScreen('home');
}

function startGameFlow() {
    console.log("Starting game flow...");
    setupNewRace();
    UI.switchScreen('course');

    // Populate Course Reveal
    if (El.revealCourseName) El.revealCourseName.textContent = gameState.currentCourse.name;
    if (El.revealCourseDesc) El.revealCourseDesc.textContent = gameState.currentCourse.desc;
    if (El.revealWeatherIcon) El.revealWeatherIcon.innerHTML = WEATHER_INFO[gameState.weather].icon;
    if (El.revealWeatherText) El.revealWeatherText.textContent = gameState.weather;
}

// --- モード選択 & タイマン機能のロジック ---

// 1. ホーム画面の「レースに出場する」ボタン
const btnToMode = document.getElementById('btn-to-mode-select');
if (btnToMode) {
    btnToMode.addEventListener('click', () => {
        UI.switchScreen('mode-select');
    });
}

// 2. モード選択画面のカードクリックイベント
document.getElementById('mode-normal')?.addEventListener('click', () => {
    // ノーマルモードで開始
    setupNewRace('normal');
    UI.switchScreen('betting');
});

document.getElementById('mode-all')?.addEventListener('click', () => {
    // オールスターモードで開始
    setupNewRace('all');
    UI.switchScreen('betting');
});

document.getElementById('mode-1v1')?.addEventListener('click', () => {
    // タイマン: 虫選択画面へ移動
    renderBugSelectionScreen();
    UI.switchScreen('bug-select');
});

// 戻るボタン
document.getElementById('btn-back-from-mode')?.addEventListener('click', () => {
    UI.switchScreen('home');
});
document.getElementById('btn-back-from-select')?.addEventListener('click', () => {
    UI.switchScreen('mode-select');
});


// --- タイマン用: 虫選択処理 ---
let selectedForDuel = []; // 選択された虫のIDを保存

function renderBugSelectionScreen() {
    const grid = document.getElementById('bug-selection-grid');
    if (!grid) return;
    grid.innerHTML = '';
    selectedForDuel = []; // リセット
    updateDuelButtonState();

    // BUG_TEMPLATES は data.js から import されている前提
    // インデックス以外の虫 + アクティブなキメラを表示
    const normalBugs = BUG_TEMPLATES.filter(b => !b.id.startsWith('index_'));
    const activeChimeras = Lab.getActiveChimeras();
    const bugs = [...normalBugs, ...activeChimeras];

    bugs.forEach(bug => {
        const div = document.createElement('div');
        div.className = 'bug-select-card';
        div.innerHTML = `
            <div style="font-size:3rem; margin-bottom:5px;">${bug.icon}</div>
            <div style="font-weight:bold; font-size:0.9rem;">${bug.name}</div>
            <div style="font-size:0.8rem; color:#666;">攻:${bug.attack} 速:${bug.speed} HP:${bug.hp}</div>
        `;

        div.onclick = () => toggleBugSelection(bug.id, div);
        grid.appendChild(div);
    });
}

function toggleBugSelection(id, element) {
    const index = selectedForDuel.indexOf(id);

    if (index >= 0) {
        // 既に選択されていたら解除
        selectedForDuel.splice(index, 1);
        element.classList.remove('selected');
    } else {
        // 未選択なら追加 (ただし2匹まで)
        if (selectedForDuel.length < 2) {
            selectedForDuel.push(id);
            element.classList.add('selected');
        } else {
            // 既に2匹選んでいる場合は、古い方を消して新しい方を入れる（またはアラート）
            // ここではシンプルに何もしない（入れ替えたい場合はUIが複雑になるため）
            // alert("選べるのは2匹までです！"); 
        }
    }
    updateDuelButtonState();
}

function updateDuelButtonState() {
    const status = document.getElementById('select-status');
    const btn = document.getElementById('btn-confirm-1v1');

    if (status) status.textContent = `現在: ${selectedForDuel.length} / 2 匹選択中`;

    if (btn) {
        if (selectedForDuel.length === 2) {
            btn.disabled = false;
            status.style.color = '#e91e63'; // 完了色
        } else {
            btn.disabled = true;
            status.style.color = '#333';
        }
    }
}

// 決定ボタン (1v1開始)
document.getElementById('btn-confirm-1v1')?.addEventListener('click', () => {
    if (selectedForDuel.length === 2) {
        setupNewRace('1v1', selectedForDuel);
        UI.switchScreen('betting');
    }
});

// === 介入ボタン (3ターンに1回のみ使用可能) ===
let interventionCooldown = 0;
const interventionBtn = document.getElementById('intervention-btn');
const interventionCooldownDiv = document.getElementById('intervention-cooldown');
let interventionPanelVisible = false;

function updateInterventionUI() {
    if (interventionBtn) {
        if (interventionCooldown > 0) {
            interventionBtn.disabled = true;
            interventionBtn.textContent = `🎮 介入 (${interventionCooldown}ターン後)`;
            if (interventionCooldownDiv) {
                interventionCooldownDiv.textContent = `クールダウン中: あと${interventionCooldown}ターン`;
            }
        } else {
            interventionBtn.disabled = false;
            interventionBtn.textContent = '🎮 介入する';
            if (interventionCooldownDiv) {
                interventionCooldownDiv.textContent = '';
            }
        }
    }
}

if (interventionBtn) {
    interventionBtn.addEventListener('click', () => {
        if (interventionCooldown > 0) {
            alert(`介入はあと${interventionCooldown}ターン後に使用可能です`);
            return;
        }

        // 介入パネルを表示
        const container = document.createElement('div');
        container.id = 'intervention-modal';
        container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; justify-content:center; align-items:center;';

        const panel = document.createElement('div');
        panel.style.cssText = 'background:white; padding:20px; border-radius:15px; max-width:500px; max-height:80vh; overflow-y:auto;';

        Intervention.renderInterventionPanel(panel);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ 閉じる';
        closeBtn.style.cssText = 'display:block; margin:15px auto 0; padding:10px 20px; background:#ccc; border:none; border-radius:5px; cursor:pointer;';
        closeBtn.onclick = () => container.remove();
        panel.appendChild(closeBtn);

        container.appendChild(panel);
        container.onclick = (e) => { if (e.target === container) container.remove(); };
        document.body.appendChild(container);

        // クールダウン開始
        interventionCooldown = 3;
        updateInterventionUI();
    });
}

// ターン進行時にクールダウンを減らす (グローバル関数として公開)
window.decreaseInterventionCooldown = function () {
    if (interventionCooldown > 0) {
        interventionCooldown--;
        updateInterventionUI();
    }
};

// === 図鑑ボタン ===
const encyclopediaBtn = document.getElementById('encyclopedia-btn');
if (encyclopediaBtn) {
    encyclopediaBtn.addEventListener('click', () => {
        Encyclopedia.showEncyclopedia();
        // メニューを閉じる
        const menuDropdown = document.getElementById('menu-dropdown');
        if (menuDropdown) menuDropdown.classList.add('hidden');
    });
}

// 起動
document.addEventListener('DOMContentLoaded', init);