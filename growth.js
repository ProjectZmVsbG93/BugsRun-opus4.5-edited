// growth.js - 虫の育成・成長システム
const GROWTH_KEY = 'bugsRaceGrowth';

// 虫ごとの好感度・レベルデータ
let growthData = {};

// レベルアップに必要な経験値
const EXP_TABLE = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 5000];

// 成長ボーナス
const GROWTH_BONUSES = {
    1: { name: 'Lv.1 初心者', speedBonus: 0, hpBonus: 0, attackBonus: 0, desc: '育成スタート!' },
    2: { name: 'Lv.2 見習い', speedBonus: 1, hpBonus: 0, attackBonus: 0, desc: 'スピード+1' },
    3: { name: 'Lv.3 一人前', speedBonus: 1, hpBonus: 1, attackBonus: 0, desc: 'HP+1' },
    4: { name: 'Lv.4 ベテラン', speedBonus: 2, hpBonus: 1, attackBonus: 0, desc: 'スピード+1' },
    5: { name: 'Lv.5 達人', speedBonus: 2, hpBonus: 2, attackBonus: 1, desc: '攻撃+1' },
    6: { name: 'Lv.6 名人', speedBonus: 3, hpBonus: 2, attackBonus: 1, desc: 'スピード+1' },
    7: { name: 'Lv.7 超人', speedBonus: 3, hpBonus: 3, attackBonus: 1, desc: 'HP+1' },
    8: { name: 'Lv.8 伝説', speedBonus: 4, hpBonus: 3, attackBonus: 2, desc: '攻撃+1' },
    9: { name: 'Lv.9 神話', speedBonus: 4, hpBonus: 4, attackBonus: 2, desc: 'HP+1' },
    10: { name: 'Lv.10 究極', speedBonus: 5, hpBonus: 5, attackBonus: 3, desc: '最終形態!' }
};

// 隠しスキル (高レベルで解放)
const HIDDEN_SKILLS = {
    'silverfish': { level: 5, skill: '電光石火', desc: '50%確率で+20cm移動' },
    'mantis': { level: 7, skill: '必殺剣', desc: '敵1体に8ダメージ' },
    'isopod': { level: 8, skill: '鉄壁', desc: '3ターン無敵' },
    'beetle': { level: 6, skill: '角砲', desc: '前方3体に3ダメージ' },
    'ladybug': { level: 5, skill: '幸運の星', desc: '全体HP+3' },
    'ant': { level: 7, skill: '軍団突撃', desc: '分身した蟻と一斉攻撃' },
    'samurai': { level: 8, skill: '居合斬り', desc: '30%即死攻撃' },
    'centipede': { level: 6, skill: '百足乱舞', desc: '全体に2ダメージ×2回' },
    'dung': { level: 9, skill: 'ビッグバン', desc: '糞爆発で全体5ダメージ' },
    'butterfly': { level: 5, skill: '蝶の舞', desc: '全体HP+2 & 自分+10cm' },
    'stagbeetle': { level: 6, skill: '必殺挟み', desc: '敵1体を即死させる' },
    'hornet': { level: 7, skill: '女王の逆鱗', desc: '全体に5ダメージ' },
    'snail': { level: 8, skill: '時の殻', desc: '時を止める(2ターン無敵+全回復)' },
    'firefly': { level: 6, skill: '蛍の導き', desc: '全体+15cm移動' },
    'houseCentipede': { level: 5, skill: '影分身', desc: '分身を3体生成' }
};

// データ読み込み
export function loadGrowthData() {
    const stored = localStorage.getItem(GROWTH_KEY);
    growthData = stored ? JSON.parse(stored) : {};
    return growthData;
}

// データ保存
export function saveGrowthData() {
    localStorage.setItem(GROWTH_KEY, JSON.stringify(growthData));
}

// 虫の成長データを取得
export function getBugGrowth(bugId) {
    if (!growthData[bugId]) {
        growthData[bugId] = {
            exp: 0,
            level: 1,
            affinity: 0, // 好感度
            raceCount: 0,
            winCount: 0
        };
    }
    return growthData[bugId];
}

// 経験値を追加
export function addExp(bugId, amount) {
    const data = getBugGrowth(bugId);
    data.exp += amount;

    // レベルアップチェック
    const oldLevel = data.level;
    while (data.level < 10 && data.exp >= EXP_TABLE[data.level]) {
        data.level++;
    }

    saveGrowthData();

    if (data.level > oldLevel) {
        return {
            levelUp: true,
            oldLevel,
            newLevel: data.level,
            bonus: GROWTH_BONUSES[data.level]
        };
    }
    return { levelUp: false };
}

// レース参加/勝利を記録
export function recordRace(bugId, isWinner, betAmount = 0, wallet = 0) {
    const data = getBugGrowth(bugId);
    data.raceCount++;

    // 基本経験値: 参加で10, 勝利で+50
    let expGain = 10;
    if (isWinner) {
        data.winCount++;
        expGain += 50;
    }

    // ★ 賭け金割合による経験値ボーナス (最も影響力が大きい)
    if (wallet > 0 && betAmount > 0) {
        const betRatio = betAmount / wallet;
        if (betRatio >= 0.5) {
            expGain += 100; // 50%以上
        } else if (betRatio >= 0.2) {
            expGain += 60;  // 20-50%
        } else if (betRatio >= 0.1) {
            expGain += 30;  // 10-20%
        } else if (betRatio >= 0.05) {
            expGain += 15;  // 5-10%
        } else if (betRatio >= 0.01) {
            expGain += 5;   // 1-5%
        }
    }

    // 好感度上昇
    data.affinity = Math.min(100, data.affinity + (isWinner ? 5 : 1));

    return addExp(bugId, expGain);
}

// レベルに応じたボーナスステータスを取得
export function getGrowthBonus(bugId) {
    const data = getBugGrowth(bugId);
    const bonus = GROWTH_BONUSES[data.level] || GROWTH_BONUSES[1];
    return {
        level: data.level,
        ...bonus,
        exp: data.exp,
        nextExp: data.level < 10 ? EXP_TABLE[data.level] : null,
        affinity: data.affinity
    };
}

// 隠しスキルがアンロックされているか
export function getUnlockedHiddenSkill(bugId) {
    const data = getBugGrowth(bugId);
    const skillData = HIDDEN_SKILLS[bugId];

    if (skillData && data.level >= skillData.level) {
        return skillData;
    }
    return null;
}

// 育成画面を描画
export function renderGrowthPanel(container, bugId, bugName, bugIcon) {
    const data = getBugGrowth(bugId);
    const bonus = GROWTH_BONUSES[data.level] || GROWTH_BONUSES[1];
    const hiddenSkill = getUnlockedHiddenSkill(bugId);
    const nextExp = data.level < 10 ? EXP_TABLE[data.level] : data.exp;
    const expPercent = Math.min(100, Math.floor((data.exp / nextExp) * 100));

    let html = `
        <div class="growth-panel">
            <div class="growth-header">
                <div class="growth-icon">${bugIcon}</div>
                <div class="growth-info">
                    <h3>${bugName}</h3>
                    <div class="growth-level">${bonus.name}</div>
                </div>
            </div>
            
            <div class="growth-stats">
                <div class="stat-row">
                    <span>好感度</span>
                    <div class="affinity-bar">
                        <div class="affinity-fill" style="width: ${data.affinity}%"></div>
                    </div>
                    <span>${data.affinity}%</span>
                </div>
                
                <div class="stat-row">
                    <span>経験値</span>
                    <div class="exp-bar">
                        <div class="exp-fill" style="width: ${expPercent}%"></div>
                    </div>
                    <span>${data.exp} / ${nextExp}</span>
                </div>
            </div>
            
            <div class="growth-bonuses">
                <h4>成長ボーナス</h4>
                <div class="bonus-grid">
                    <div class="bonus-item ${bonus.speedBonus > 0 ? 'active' : ''}">
                        ⚡スピード +${bonus.speedBonus}
                    </div>
                    <div class="bonus-item ${bonus.hpBonus > 0 ? 'active' : ''}">
                        ❤️HP +${bonus.hpBonus}
                    </div>
                    <div class="bonus-item ${bonus.attackBonus > 0 ? 'active' : ''}">
                        ⚔️攻撃 +${bonus.attackBonus}
                    </div>
                </div>
            </div>
            
            ${hiddenSkill ? `
                <div class="hidden-skill unlocked">
                    <h4>🔓 隠しスキル解放!</h4>
                    <div class="skill-name">💫 ${hiddenSkill.skill}</div>
                    <div class="skill-desc">${hiddenSkill.desc}</div>
                </div>
            ` : `
                <div class="hidden-skill locked">
                    <h4>🔒 隠しスキル</h4>
                    <div class="skill-desc">Lv.${HIDDEN_SKILLS[bugId]?.level || '?'} で解放</div>
                </div>
            `}
            
            <div class="growth-history">
                <div>総レース: ${data.raceCount}回</div>
                <div>勝利数: ${data.winCount}回</div>
                <div>勝率: ${data.raceCount > 0 ? Math.floor(data.winCount / data.raceCount * 100) : 0}%</div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// 全虫の育成状況一覧を描画
export function renderGrowthList(container, bugTemplates) {
    loadGrowthData();

    let html = `
        <div class="growth-list-header">
            <h3>🌱 虫の育成状況</h3>
            <p>レースに参加して虫を育てよう！</p>
        </div>
        <div class="growth-list-grid">
    `;

    bugTemplates.filter(b => !b.id.startsWith('index_')).forEach(bug => {
        const data = getBugGrowth(bug.id);
        const bonus = GROWTH_BONUSES[data.level] || GROWTH_BONUSES[1];
        const expPercent = data.level < 10 ? Math.floor((data.exp / EXP_TABLE[data.level]) * 100) : 100;

        html += `
            <div class="growth-list-item" onclick="window.showBugGrowthDetail && window.showBugGrowthDetail('${bug.id}')">
                <div class="growth-bug-icon">${bug.icon}</div>
                <div class="growth-bug-info">
                    <div class="growth-bug-name">${bug.name}</div>
                    <div class="growth-bug-level">${bonus.name}</div>
                    <div class="growth-mini-bar">
                        <div class="growth-mini-fill" style="width: ${expPercent}%"></div>
                    </div>
                </div>
            </div>
        `;
    });

    // レベル別恩恵一覧を追加
    html += '</div><div class="level-benefits-section"><h3>📊 レベル別恩恵</h3><div class="level-benefits-grid">';

    for (let lv = 1; lv <= 10; lv++) {
        const bonus = GROWTH_BONUSES[lv];
        const expNeeded = lv < 10 ? EXP_TABLE[lv] : '---';
        html += `
            <div class="level-benefit-item">
                <div class="level-num">Lv.${lv}</div>
                <div class="level-bonus-name">${bonus.name}</div>
                <div class="level-bonus-stats">
                    ${bonus.speedBonus > 0 ? `<span class="bonus-tag speed">速+${bonus.speedBonus}</span>` : ''}
                    ${bonus.hpBonus > 0 ? `<span class="bonus-tag hp">HP+${bonus.hpBonus}</span>` : ''}
                    ${bonus.attackBonus > 0 ? `<span class="bonus-tag atk">攻+${bonus.attackBonus}</span>` : ''}
                </div>
                <div class="level-exp-req">必要EXP: ${expNeeded}</div>
            </div>
        `;
    }

    html += '</div></div>';
    container.innerHTML = html;
}

// 初期化
loadGrowthData();
