// tournament.js - トーナメントモード
import { gameState } from './state.js';
import * as UI from './ui.js';
import { COURSES, BUG_TEMPLATES, CONDITIONS, RACE_DISTANCE } from './data.js';

// トーナメント状態
export const tournamentState = {
    isActive: false,
    round: 0, // 0: 準々決勝, 1: 準決勝, 2: 決勝
    participants: [],
    bracket: [], // [[A,B], [C,D], [E,F], [G,H]]
    results: [], // 各ラウンドの勝者
    currentMatchIndex: 0,
    betMultiplier: 3 // 通常の3倍払戻し
};

const ROUND_NAMES = ['準々決勝', '準決勝', '決勝'];

// トーナメント開始
export function startTournament() {
    tournamentState.isActive = true;
    tournamentState.round = 0;
    tournamentState.results = [];
    tournamentState.currentMatchIndex = 0;

    // 全虫からランダムに8匹選出
    const baseBugs = BUG_TEMPLATES.filter(t => !t.id.startsWith('index_'));
    const shuffled = [...baseBugs].sort(() => 0.5 - Math.random());
    tournamentState.participants = shuffled.slice(0, 8);

    // 対戦カード作成
    tournamentState.bracket = [
        [tournamentState.participants[0], tournamentState.participants[1]],
        [tournamentState.participants[2], tournamentState.participants[3]],
        [tournamentState.participants[4], tournamentState.participants[5]],
        [tournamentState.participants[6], tournamentState.participants[7]]
    ];

    renderTournamentBracket();
    showTournamentScreen();
}

// トーナメント表表示
export function renderTournamentBracket() {
    const container = document.getElementById('tournament-bracket');
    if (!container) return;

    const roundNames = ROUND_NAMES;
    let html = '<div class="bracket-wrapper">';

    // 左側（準々決勝4試合）
    html += '<div class="bracket-column">';
    html += `<div class="round-label">${roundNames[0]}</div>`;
    tournamentState.bracket.forEach((match, i) => {
        const winner = tournamentState.results[i];
        html += `<div class="match-card ${tournamentState.currentMatchIndex === i && tournamentState.round === 0 ? 'active' : ''}">`;
        match.forEach(bug => {
            const isWinner = winner && winner.id === bug.id;
            const isLoser = winner && winner.id !== bug.id;
            html += `<div class="match-bug ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">${bug.icon || bug.name}</div>`;
        });
        html += '</div>';
    });
    html += '</div>';

    // 中央（準決勝2試合）
    html += '<div class="bracket-column">';
    html += `<div class="round-label">${roundNames[1]}</div>`;
    if (tournamentState.results.length >= 4) {
        const semifinalBracket = [
            [tournamentState.results[0], tournamentState.results[1]],
            [tournamentState.results[2], tournamentState.results[3]]
        ];
        semifinalBracket.forEach((match, i) => {
            const winner = tournamentState.results[4 + i];
            const matchIdx = 4 + i;
            html += `<div class="match-card ${tournamentState.currentMatchIndex === i && tournamentState.round === 1 ? 'active' : ''}">`;
            match.forEach(bug => {
                if (!bug) { html += '<div class="match-bug empty">???</div>'; return; }
                const isWinner = winner && winner.id === bug.id;
                const isLoser = winner && winner.id !== bug.id;
                html += `<div class="match-bug ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">${bug.icon || bug.name}</div>`;
            });
            html += '</div>';
        });
    } else {
        html += '<div class="match-card"><div class="match-bug empty">???</div><div class="match-bug empty">???</div></div>';
        html += '<div class="match-card"><div class="match-bug empty">???</div><div class="match-bug empty">???</div></div>';
    }
    html += '</div>';

    // 右側（決勝）
    html += '<div class="bracket-column">';
    html += `<div class="round-label">${roundNames[2]}</div>`;
    if (tournamentState.results.length >= 6) {
        const finalMatch = [tournamentState.results[4], tournamentState.results[5]];
        const champion = tournamentState.results[6];
        html += `<div class="match-card ${tournamentState.round === 2 ? 'active' : ''}">`;
        finalMatch.forEach(bug => {
            if (!bug) { html += '<div class="match-bug empty">???</div>'; return; }
            const isWinner = champion && champion.id === bug.id;
            const isLoser = champion && champion.id !== bug.id;
            html += `<div class="match-bug ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">${bug.icon || bug.name}</div>`;
        });
        html += '</div>';
    } else {
        html += '<div class="match-card final"><div class="match-bug empty">???</div><div class="match-bug empty">???</div></div>';
    }
    html += '</div>';

    // 優勝者表示
    html += '<div class="bracket-column champion-column">';
    html += '<div class="round-label">👑 優勝</div>';
    if (tournamentState.results.length >= 7) {
        const champion = tournamentState.results[6];
        html += `<div class="champion-display">${champion.icon || champion.name}<br><strong>${champion.name}</strong></div>`;
    } else {
        html += '<div class="champion-display empty">???</div>';
    }
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

// トーナメント画面表示
export function showTournamentScreen() {
    const screen = document.getElementById('tournament-screen');
    if (screen) {
        // 全画面非表示
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        screen.classList.remove('hidden');
    }
}

// 次の試合へ
export function proceedToNextMatch() {
    let matchBugs = [];

    if (tournamentState.round === 0) {
        // 準々決勝
        matchBugs = tournamentState.bracket[tournamentState.currentMatchIndex];
    } else if (tournamentState.round === 1) {
        // 準決勝
        matchBugs = [
            tournamentState.results[tournamentState.currentMatchIndex * 2],
            tournamentState.results[tournamentState.currentMatchIndex * 2 + 1]
        ];
    } else if (tournamentState.round === 2) {
        // 決勝
        matchBugs = [tournamentState.results[4], tournamentState.results[5]];
    }

    return matchBugs.map(b => b.id);
}

// 試合結果を記録
export function recordMatchResult(winner) {
    tournamentState.results.push(winner);

    const matchesPerRound = [4, 2, 1];
    tournamentState.currentMatchIndex++;

    if (tournamentState.currentMatchIndex >= matchesPerRound[tournamentState.round]) {
        tournamentState.currentMatchIndex = 0;
        tournamentState.round++;

        if (tournamentState.round > 2) {
            // トーナメント終了
            endTournament(winner);
            return true;
        }
    }

    renderTournamentBracket();
    return false;
}

// トーナメント終了
export function endTournament(champion) {
    tournamentState.isActive = false;

    const container = document.getElementById('tournament-result');
    if (container) {
        container.innerHTML = `
            <div class="tournament-champion-announce">
                <h2>🏆 トーナメント優勝！ 🏆</h2>
                <div class="champion-icon">${champion.icon || '🐛'}</div>
                <h3>${champion.name}</h3>
                <p>おめでとうございます！</p>
            </div>
        `;
    }
    renderTournamentBracket();
}

// トーナメント状態リセット
export function resetTournament() {
    tournamentState.isActive = false;
    tournamentState.round = 0;
    tournamentState.participants = [];
    tournamentState.bracket = [];
    tournamentState.results = [];
    tournamentState.currentMatchIndex = 0;
}

// 現在のラウンド名を取得
export function getCurrentRoundName() {
    return ROUND_NAMES[tournamentState.round] || '終了';
}

// トーナメントがアクティブかどうか
export function isTournamentActive() {
    return tournamentState.isActive;
}
