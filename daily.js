// daily.js - デイリーチャレンジシステム
const DAILY_KEY = 'bugsRaceDailyChallenge';
const DAILY_PROGRESS_KEY = 'bugsRaceDailyProgress';

// チャレンジ種類
const CHALLENGE_TYPES = [
    { type: 'win_count', name: '勝利せよ', descFn: (n) => `${n}回勝利する`, valueFn: () => Math.floor(Math.random() * 3) + 1, rewardFn: (n) => n * 3000 },
    { type: 'race_count', name: 'レースに参加', descFn: (n) => `${n}レースに参加する`, valueFn: () => Math.floor(Math.random() * 7) + 3, rewardFn: (n) => n * 500 },
    { type: 'bet_total', name: '大勝負', descFn: (n) => `合計${n.toLocaleString()}円賭ける`, valueFn: () => (Math.floor(Math.random() * 5) + 1) * 10000, rewardFn: (n) => Math.floor(n * 0.2) },
    { type: 'win_with_high_odds', name: '穴狙い', descFn: (n) => `オッズ${n}倍以上で勝利`, valueFn: () => Math.floor(Math.random() * 10) + 5, rewardFn: (n) => n * 2000 },
    { type: 'earn_total', name: '稼ぎまくれ', descFn: (n) => `合計${n.toLocaleString()}円稼ぐ`, valueFn: () => (Math.floor(Math.random() * 10) + 1) * 5000, rewardFn: (n) => Math.floor(n * 0.3) },
    { type: 'win_streak', name: '連勝せよ', descFn: (n) => `${n}連勝する`, valueFn: () => Math.floor(Math.random() * 2) + 2, rewardFn: (n) => n * 5000 },
    { type: 'bet_on_bug', name: '指名買い', descFn: (n, bug) => `${bug}に賭けて勝て`, valueFn: () => 1, rewardFn: () => 8000, needsBug: true },
    { type: 'all_star', name: 'オールスター', descFn: () => 'オールスターモードで勝利', valueFn: () => 1, rewardFn: () => 10000 },
    { type: 'tournament_join', name: 'トーナメント参戦', descFn: () => 'トーナメントに参加する', valueFn: () => 1, rewardFn: () => 5000 }
];

// 虫リスト (簡易版)
const BUG_NAMES = ['紙魚', 'オオカマキリ', 'ダイオウグソクムシ', 'モンハナシャコ', 'ナナホシテントウ',
    'ウスバカゲロウ', 'クロヤマアリ', 'カブトムシ', 'ミミズ', 'アブラゼミ',
    'サムライアリ', 'フンコロガシ', 'オオムラサキ', 'オオムカデ',
    'ノコギリクワガタ', 'ゲジゲジ', 'カタツムリ', 'ゲンジボタル', 'オオスズメバチ'];

// 今日の日付キー
function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// 日替わりチャレンジを生成
function generateDailyChallenges() {
    const today = getTodayKey();
    const seed = hashCode(today);
    const rng = seededRandom(seed);

    const challenges = [];
    const usedTypes = new Set();

    for (let i = 0; i < 3; i++) {
        let typeIndex;
        do {
            typeIndex = Math.floor(rng() * CHALLENGE_TYPES.length);
        } while (usedTypes.has(typeIndex));
        usedTypes.add(typeIndex);

        const type = CHALLENGE_TYPES[typeIndex];
        const value = type.valueFn();
        const reward = type.rewardFn(value);

        let bugName = null;
        if (type.needsBug) {
            bugName = BUG_NAMES[Math.floor(rng() * BUG_NAMES.length)];
        }

        challenges.push({
            id: `${today}_${i}`,
            type: type.type,
            name: type.name,
            desc: type.descFn(value, bugName),
            target: value,
            reward: reward,
            bugName: bugName
        });
    }

    return { date: today, challenges };
}

// シード付き乱数
function seededRandom(seed) {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// 今日のチャレンジを取得
export function getTodayChallenges() {
    const stored = localStorage.getItem(DAILY_KEY);
    const today = getTodayKey();

    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
            return data;
        }
    }

    // 新しいチャレンジを生成
    const newData = generateDailyChallenges();
    localStorage.setItem(DAILY_KEY, JSON.stringify(newData));

    // 進捗もリセット
    localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify({ date: today, progress: {} }));

    return newData;
}

// 進捗を取得
export function getDailyProgress() {
    const stored = localStorage.getItem(DAILY_PROGRESS_KEY);
    const today = getTodayKey();

    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
            return data.progress;
        }
    }

    return {};
}

// 進捗を更新
export function updateDailyProgress(type, value = 1, extra = null) {
    const today = getTodayKey();
    const challenges = getTodayChallenges();
    const progress = getDailyProgress();

    challenges.challenges.forEach(ch => {
        if (ch.type === type) {
            // 特殊条件チェック
            if (ch.bugName && extra !== ch.bugName) return;

            if (!progress[ch.id]) progress[ch.id] = 0;
            progress[ch.id] += value;
        }
    });

    localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify({ date: today, progress }));
    return progress;
}

// 報酬を受け取る
export function claimDailyReward(challengeId) {
    const challenges = getTodayChallenges();
    const progress = getDailyProgress();

    const challenge = challenges.challenges.find(ch => ch.id === challengeId);
    if (!challenge) return 0;

    const current = progress[challengeId] || 0;
    if (current >= challenge.target && !progress[`${challengeId}_claimed`]) {
        progress[`${challengeId}_claimed`] = true;
        localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify({ date: getTodayKey(), progress }));
        return challenge.reward;
    }

    return 0;
}

// チャレンジUIを描画
export function renderDailyChallenges(container) {
    const data = getTodayChallenges();
    const progress = getDailyProgress();

    let html = `<div class="daily-header"><h3>📅 本日のチャレンジ</h3></div>`;
    html += '<div class="daily-challenges">';

    data.challenges.forEach(ch => {
        const current = progress[ch.id] || 0;
        const completed = current >= ch.target;
        const claimed = progress[`${ch.id}_claimed`];
        const percent = Math.min(100, Math.floor((current / ch.target) * 100));

        html += `
            <div class="daily-challenge ${completed ? 'completed' : ''} ${claimed ? 'claimed' : ''}">
                <div class="challenge-info">
                    <div class="challenge-name">${ch.name}</div>
                    <div class="challenge-desc">${ch.desc}</div>
                    <div class="challenge-progress-bar">
                        <div class="challenge-progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="challenge-progress-text">${current} / ${ch.target}</div>
                </div>
                <div class="challenge-reward">
                    <div class="reward-amount">💰 ${ch.reward.toLocaleString()}円</div>
                    ${completed && !claimed ? `<button class="btn-claim" data-id="${ch.id}">受取</button>` : ''}
                    ${claimed ? '<span class="claimed-badge">✓ 受取済</span>' : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // 受取ボタンのイベント
    container.querySelectorAll('.btn-claim').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const reward = claimDailyReward(id);
            if (reward > 0) {
                // ウォレットに追加 (main.jsから呼ばれることを想定)
                if (window.addToWallet) window.addToWallet(reward);
                alert(`🎉 ${reward.toLocaleString()}円 を獲得しました！`);
                renderDailyChallenges(container);
            }
        });
    });
}
