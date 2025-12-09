// achievements.js - 実績・称号システム
const ACHIEVEMENTS_KEY = 'bugsRaceAchievements';

// 実績定義
export const ACHIEVEMENTS = [
    // === 基本実績 ===
    { id: 'first_race', name: '初参戦', desc: '初めてレースに参加した', icon: '🎮', condition: (stats) => stats.totalRaces >= 1 },
    { id: 'first_win', name: '初勝利', desc: '初めてレースに勝った', icon: '🏆', condition: (stats) => stats.wins >= 1 },
    { id: 'win_10', name: '常連勝者', desc: '10回勝利した', icon: '🥇', condition: (stats) => stats.wins >= 10 },
    { id: 'win_50', name: 'ベテラン', desc: '50回勝利した', icon: '🎖️', condition: (stats) => stats.wins >= 50 },
    { id: 'win_100', name: '伝説のギャンブラー', desc: '100回勝利した', icon: '👑', condition: (stats) => stats.wins >= 100 },

    // === 金額実績 ===
    { id: 'earn_10000', name: 'へそくり', desc: '1万円稼いだ', icon: '💴', condition: (stats) => stats.totalEarned >= 10000 },
    { id: 'earn_100000', name: '小金持ち', desc: '10万円稼いだ', icon: '💰', condition: (stats) => stats.totalEarned >= 100000 },
    { id: 'earn_1000000', name: '百万長者', desc: '100万円稼いだ', icon: '🤑', condition: (stats) => stats.totalEarned >= 1000000 },
    { id: 'earn_10000000', name: '億万長者への道', desc: '1000万円稼いだ', icon: '💎', condition: (stats) => stats.totalEarned >= 10000000 },
    { id: 'wallet_1000000', name: '資産家', desc: '所持金100万円達成', icon: '🏦', condition: (stats, wallet) => wallet >= 1000000 },

    // === 賭け金実績 ===
    { id: 'bet_high', name: 'ハイローラー', desc: '1万円以上の賭けをした', icon: '🎲', condition: (stats) => stats.maxBet >= 10000 },
    { id: 'bet_very_high', name: '勝負師', desc: '10万円以上の賭けをした', icon: '🎰', condition: (stats) => stats.maxBet >= 100000 },
    { id: 'total_bet_100000', name: '常連客', desc: '累計10万円賭けた', icon: '🃏', condition: (stats) => stats.totalBet >= 100000 },
    { id: 'total_bet_1000000', name: 'VIP', desc: '累計100万円賭けた', icon: '👔', condition: (stats) => stats.totalBet >= 1000000 },

    // === 特殊実績 ===
    { id: 'max_win_50000', name: 'ビッグウィン', desc: '1回で5万円以上獲得', icon: '🌟', condition: (stats) => stats.maxWin >= 50000 },
    { id: 'max_win_100000', name: 'ジャックポット', desc: '1回で10万円以上獲得', icon: '💫', condition: (stats) => stats.maxWin >= 100000 },
    { id: 'max_win_1000000', name: '神の一手', desc: '1回で100万円以上獲得', icon: '✨', condition: (stats) => stats.maxWin >= 1000000 },
    { id: 'comeback', name: '不死鳥', desc: '借金からプラスに復帰', icon: '🔥', condition: (stats) => stats.comebackCount >= 1 },
    { id: 'win_streak_3', name: '連勝街道', desc: '3連勝達成', icon: '🏃', condition: (stats) => stats.maxWinStreak >= 3 },
    { id: 'win_streak_5', name: '無敵艦隊', desc: '5連勝達成', icon: '🚀', condition: (stats) => stats.maxWinStreak >= 5 },
    { id: 'win_streak_10', name: '伝説', desc: '10連勝達成', icon: '⭐', condition: (stats) => stats.maxWinStreak >= 10 },

    // === レース数実績 ===
    { id: 'race_50', name: 'レース好き', desc: '50レースに参加', icon: '🏁', condition: (stats) => stats.totalRaces >= 50 },
    { id: 'race_100', name: 'マニア', desc: '100レースに参加', icon: '🎪', condition: (stats) => stats.totalRaces >= 100 },
    { id: 'race_500', name: 'オタク', desc: '500レースに参加', icon: '🤓', condition: (stats) => stats.totalRaces >= 500 },
    { id: 'race_1000', name: '廃人', desc: '1000レースに参加', icon: '💀', condition: (stats) => stats.totalRaces >= 1000 },

    // === 時間実績 ===
    { id: 'play_night', name: '夜型', desc: '深夜(0-5時)にプレイ', icon: '🌙', condition: () => { const h = new Date().getHours(); return h >= 0 && h < 5; } },
    { id: 'play_morning', name: '早起き', desc: '早朝(5-7時)にプレイ', icon: '🌅', condition: () => { const h = new Date().getHours(); return h >= 5 && h < 7; } },

    // === トーナメント実績 ===
    { id: 'tournament_join', name: 'トーナメント参加者', desc: 'トーナメントに参加した', icon: '🏟️', condition: (stats) => stats.tournamentJoined >= 1 },
    { id: 'tournament_win', name: 'チャンピオン', desc: 'トーナメントで優勝した', icon: '🏆', condition: (stats) => stats.tournamentWins >= 1 },
    { id: 'tournament_win_5', name: '常勝王者', desc: 'トーナメントで5回優勝', icon: '👑', condition: (stats) => stats.tournamentWins >= 5 }
];

// 解除済み実績を取得
export function getUnlockedAchievements() {
    const data = localStorage.getItem(ACHIEVEMENTS_KEY);
    return data ? JSON.parse(data) : [];
}

// 実績を保存
export function saveUnlockedAchievements(unlocked) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
}

// 実績をチェック
export function checkAchievements(stats, wallet) {
    const unlocked = getUnlockedAchievements();
    const newUnlocks = [];

    ACHIEVEMENTS.forEach(ach => {
        if (!unlocked.includes(ach.id)) {
            try {
                if (ach.condition(stats, wallet)) {
                    unlocked.push(ach.id);
                    newUnlocks.push(ach);
                }
            } catch (e) {
                console.error('Achievement check error:', ach.id, e);
            }
        }
    });

    if (newUnlocks.length > 0) {
        saveUnlockedAchievements(unlocked);
        showAchievementNotification(newUnlocks);
    }

    return newUnlocks;
}

// 実績解除通知を表示
export function showAchievementNotification(achievements) {
    achievements.forEach((ach, index) => {
        setTimeout(() => {
            const notification = document.createElement('div');
            notification.className = 'achievement-notification';
            notification.innerHTML = `
                <div class="achievement-icon">${ach.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">実績解除！</div>
                    <div class="achievement-name">${ach.name}</div>
                    <div class="achievement-desc">${ach.desc}</div>
                </div>
            `;
            document.body.appendChild(notification);

            setTimeout(() => notification.classList.add('show'), 100);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }, index * 1500);
    });
}

// 実績一覧を描画
export function renderAchievementsList(container) {
    const unlocked = getUnlockedAchievements();

    let html = '<div class="achievements-grid">';
    ACHIEVEMENTS.forEach(ach => {
        const isUnlocked = unlocked.includes(ach.id);
        html += `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${isUnlocked ? ach.icon : '🔒'}</div>
                <div class="achievement-name">${isUnlocked ? ach.name : '???'}</div>
                <div class="achievement-desc">${isUnlocked ? ach.desc : '条件を満たすと解除'}</div>
            </div>
        `;
    });
    html += '</div>';

    const unlockedCount = unlocked.length;
    const totalCount = ACHIEVEMENTS.length;
    const progress = Math.floor((unlockedCount / totalCount) * 100);

    container.innerHTML = `
        <div class="achievements-progress">
            <div class="progress-text">達成率: ${unlockedCount}/${totalCount} (${progress}%)</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        ${html}
    `;
}
