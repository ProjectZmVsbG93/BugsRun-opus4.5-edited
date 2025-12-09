// lab.js - 配合ラボシステム
const LAB_KEY = 'bugsRaceLabData';

// パーツデータ (拡張版)
export const DNA_PARTS = {
    // 頭部 (攻撃力補正 + 頭部スキル)
    heads: [
        { id: 'head_mantis', name: 'カマキリの頭', icon: '🦗', stat: 'attack', bonus: 2, skill: '捕食', price: 15000 },
        { id: 'head_beetle', name: 'カブトムシの頭', icon: '🪲', stat: 'attack', bonus: 1, skill: '角突き', price: 10000 },
        { id: 'head_hornet', name: 'スズメバチの頭', icon: '🐝', stat: 'attack', bonus: 3, skill: '複眼照準', price: 25000 },
        { id: 'head_ant', name: 'アリの頭', icon: '🐜', stat: 'attack', bonus: 1, skill: '仲間を呼ぶ', price: 5000 },
        { id: 'head_centipede', name: 'ムカデの頭', icon: '🐛', stat: 'attack', bonus: 2, skill: '毒顎', price: 12000 },
        { id: 'head_spider', name: '蜘蛛の頭', icon: '🕷️', stat: 'attack', bonus: 2, skill: '糸吐き', price: 18000 },
        { id: 'head_dragonfly', name: 'トンボの頭', icon: '🪰', stat: 'attack', bonus: 1, skill: '360度視界', price: 14000 },
        { id: 'head_scorpion', name: 'サソリの頭', icon: '🦂', stat: 'attack', bonus: 3, skill: '猛毒注入', price: 30000 }
    ],

    // 胴体 (HP補正 + 防御スキル)
    bodies: [
        { id: 'body_isopod', name: 'グソクムシの甲羅', icon: '🦐', stat: 'hp', bonus: 5, skill: '丸まる', price: 30000 },
        { id: 'body_snail', name: 'カタツムリの殻', icon: '🐌', stat: 'hp', bonus: 8, skill: '殻籠り', price: 40000 },
        { id: 'body_beetle', name: 'カブトの甲羅', icon: '🪲', stat: 'hp', bonus: 4, skill: 'ハイパーアーマー', price: 20000 },
        { id: 'body_dung', name: 'フンコロガシの外骨格', icon: '💩', stat: 'hp', bonus: 3, skill: '糞転がし', price: 15000 },
        { id: 'body_worm', name: 'ミミズの柔軟体', icon: '🪱', stat: 'hp', bonus: 2, skill: '再生', price: 8000 },
        { id: 'body_caterpillar', name: 'イモムシの胴体', icon: '🐛', stat: 'hp', bonus: 3, skill: '変態準備', price: 12000 },
        { id: 'body_ladybug', name: 'テントウムシの甲羅', icon: '🐞', stat: 'hp', bonus: 4, skill: '幸運の加護', price: 22000 },
        { id: 'body_cockroach', name: 'ゴキブリの外骨格', icon: '🪳', stat: 'hp', bonus: 6, skill: '不死身', price: 35000 }
    ],

    // 脚 (スピード補正 + 移動スキル)
    legs: [
        { id: 'leg_centipede', name: 'ゲジの百足', icon: '🦎', stat: 'speed', bonus: 6, skill: '多脚走行', price: 35000 },
        { id: 'leg_silverfish', name: '紙魚の脚', icon: '🐟', stat: 'speed', bonus: 5, skill: '高速移動', price: 28000 },
        { id: 'leg_cricket', name: 'バッタの跳躍脚', icon: '🦗', stat: 'speed', bonus: 4, skill: '大ジャンプ', price: 22000 },
        { id: 'leg_ant', name: 'アリの6本脚', icon: '🐜', stat: 'speed', bonus: 3, skill: '踏ん張り', price: 15000 },
        { id: 'leg_snail', name: 'カタツムリの這行筋', icon: '🐌', stat: 'speed', bonus: -2, skill: '粘液トラップ', price: 3000 },
        { id: 'leg_spider', name: '蜘蛛の8本脚', icon: '🕷️', stat: 'speed', bonus: 5, skill: '壁歩き', price: 30000 },
        { id: 'leg_flea', name: 'ノミの脚', icon: '🦟', stat: 'speed', bonus: 8, skill: 'スーパージャンプ', price: 50000 },
        { id: 'leg_water', name: 'アメンボの水脚', icon: '💧', stat: 'speed', bonus: 4, skill: '水上走行', price: 25000 }
    ],

    // 翼 (特殊スキル)
    wings: [
        { id: 'wing_butterfly', name: 'オオムラサキの羽', icon: '🦋', skill: '蝶の舞', price: 50000 },
        { id: 'wing_cicada', name: 'セミの透明翅', icon: '📢', skill: '爆音', price: 35000 },
        { id: 'wing_firefly', name: 'ホタルの発光器', icon: '✨', skill: '閃光', price: 45000 },
        { id: 'wing_dragonfly', name: 'トンボの四枚羽', icon: '🪰', skill: '高速飛行', price: 60000 },
        { id: 'wing_moth', name: '蛾の鱗粉翅', icon: '🦋', skill: '鱗粉撒き', price: 40000 },
        { id: 'wing_bee', name: 'ミツバチの羽', icon: '🐝', skill: 'ホバリング', price: 38000 },
        { id: 'wing_fly', name: 'ハエの羽', icon: '🪰', skill: '回避飛行', price: 32000 },
        { id: 'wing_locust', name: 'イナゴの翅', icon: '🦗', skill: '群れ召喚', price: 55000 }
    ],

    // 武器 (攻撃スキル)
    weapons: [
        { id: 'weapon_shrimp', name: 'シャコのパンチ', icon: '🥊', skill: 'ハイパーパンチ', price: 80000 },
        { id: 'weapon_hornet', name: 'スズメバチの毒針', icon: '🐝', skill: '毒針', price: 55000 },
        { id: 'weapon_mantis', name: 'カマキリの鎌', icon: '🦗', skill: '鎌斬り', price: 65000 },
        { id: 'weapon_stagbeetle', name: 'クワガタの顎', icon: '🪲', skill: '挟撃', price: 70000 },
        { id: 'weapon_scorpion', name: 'サソリの尾', icon: '🦂', skill: '猛毒尾撃', price: 90000 },
        { id: 'weapon_ant', name: 'アリの大顎', icon: '🐜', skill: '噛み付き', price: 45000 },
        { id: 'weapon_centipede', name: 'ムカデの毒爪', icon: '🐛', skill: '百爪乱舞', price: 75000 },
        { id: 'weapon_beetle', name: 'カブトの角', icon: '🪲', skill: '角突進', price: 60000 }
    ],

    // 新カテゴリ: 尻尾/付属器官 (特殊効果)
    tails: [
        { id: 'tail_scorpion', name: 'サソリの尾', icon: '🦂', skill: '毒尻尾', price: 50000 },
        { id: 'tail_worm', name: 'ミミズの尾', icon: '🪱', skill: '分裂', price: 35000 },
        { id: 'tail_firefly', name: 'ホタルの発光尾', icon: '✨', skill: '発光', price: 40000 },
        { id: 'tail_bee', name: '蜂の針', icon: '🐝', skill: '一撃必殺針', price: 60000 }
    ],

    // 新カテゴリ: 特殊器官
    organs: [
        { id: 'organ_silk', name: '蜘蛛の糸腺', icon: '🕸️', skill: '蜘蛛の糸', price: 45000 },
        { id: 'organ_venom', name: '毒腺', icon: '☠️', skill: '猛毒分泌', price: 55000 },
        { id: 'organ_pheromone', name: 'フェロモン腺', icon: '💕', skill: 'フェロモン', price: 50000 },
        { id: 'organ_electric', name: '電気器官', icon: '⚡', skill: '放電', price: 70000 },
        { id: 'organ_acid', name: '酸腺', icon: '🧪', skill: '酸噴射', price: 60000 }
    ]
};

// ラボデータ
let labData = {
    ownedParts: {},  // { partId: count }
    chimeras: [],    // 作成したキメラ虫リスト
    activeChimeraIds: [] // レースに参加させるキメラID
};

// データ読み込み
export function loadLabData() {
    const stored = localStorage.getItem(LAB_KEY);
    if (stored) {
        labData = JSON.parse(stored);
    }
    return labData;
}

// データ保存
export function saveLabData() {
    localStorage.setItem(LAB_KEY, JSON.stringify(labData));
}

// パーツ購入
export function buyPart(partId, wallet) {
    const allParts = [...DNA_PARTS.heads, ...DNA_PARTS.bodies, ...DNA_PARTS.legs, ...DNA_PARTS.wings, ...DNA_PARTS.weapons];
    const part = allParts.find(p => p.id === partId);

    if (!part) return { success: false, message: 'パーツが見つかりません' };
    if (wallet < part.price) return { success: false, message: '所持金が足りません' };

    if (!labData.ownedParts[partId]) {
        labData.ownedParts[partId] = 0;
    }
    labData.ownedParts[partId]++;
    saveLabData();

    return { success: true, cost: part.price, part: part };
}

// パーツ所持数確認
export function getOwnedParts() {
    return labData.ownedParts;
}

// キメラ作成
export function createChimera(name, headId, bodyId, legId, wingId = null, weaponId = null, tailId = null, organId = null) {
    // パーツ確認
    const parts = { head: headId, body: bodyId, leg: legId };
    if (wingId) parts.wing = wingId;
    if (weaponId) parts.weapon = weaponId;
    if (tailId) parts.tail = tailId;
    if (organId) parts.organ = organId;

    // 所持パーツ消費チェック
    for (const [key, id] of Object.entries(parts)) {
        if (!labData.ownedParts[id] || labData.ownedParts[id] < 1) {
            return { success: false, message: `${key}パーツが足りません` };
        }
    }

    // パーツ消費
    for (const id of Object.values(parts)) {
        labData.ownedParts[id]--;
    }

    // パーツ情報取得 (全カテゴリを含む)
    const allParts = [
        ...DNA_PARTS.heads, ...DNA_PARTS.bodies, ...DNA_PARTS.legs,
        ...DNA_PARTS.wings, ...DNA_PARTS.weapons,
        ...(DNA_PARTS.tails || []), ...(DNA_PARTS.organs || [])
    ];
    const headPart = allParts.find(p => p.id === headId);
    const bodyPart = allParts.find(p => p.id === bodyId);
    const legPart = allParts.find(p => p.id === legId);
    const wingPart = wingId ? allParts.find(p => p.id === wingId) : null;
    const weaponPart = weaponId ? allParts.find(p => p.id === weaponId) : null;
    const tailPart = tailId ? allParts.find(p => p.id === tailId) : null;
    const organPart = organId ? allParts.find(p => p.id === organId) : null;

    // ステータス計算
    let speed = 12; // ベース値
    let hp = 8;
    let attack = 2;
    const skills = ['前進'];

    // ステータスボーナス適用
    if (headPart && headPart.stat === 'attack') attack += headPart.bonus;
    if (bodyPart && bodyPart.stat === 'hp') hp += bodyPart.bonus;
    if (legPart && legPart.stat === 'speed') speed += legPart.bonus;

    // ★ 全パーツからスキル追加
    if (headPart && headPart.skill) skills.push(headPart.skill);
    if (bodyPart && bodyPart.skill) skills.push(bodyPart.skill);
    if (legPart && legPart.skill) skills.push(legPart.skill);
    if (wingPart && wingPart.skill) skills.push(wingPart.skill);
    if (weaponPart && weaponPart.skill) skills.push(weaponPart.skill);
    if (tailPart && tailPart.skill) skills.push(tailPart.skill);
    if (organPart && organPart.skill) skills.push(organPart.skill);

    // キメラ作成
    const chimera = {
        id: `chimera_${Date.now()}`,
        name: name,
        icon: `${headPart.icon}${bodyPart.icon}`,
        speed: Math.max(1, speed),
        hp: Math.max(1, hp),
        attack: Math.max(1, attack),
        type: 'キメラ',
        skills: skills,
        desc: `配合ラボで生まれたキメラ虫。(${headPart.name}+${bodyPart.name}+${legPart.name})`,
        parts: parts,
        isActive: false
    };

    labData.chimeras.push(chimera);
    saveLabData();

    return { success: true, chimera: chimera };
}

// キメラ一覧取得
export function getChimeras() {
    return labData.chimeras;
}

// キメラのアクティブ状態切り替え
export function toggleChimeraActive(chimeraId) {
    const chimera = labData.chimeras.find(c => c.id === chimeraId);
    if (!chimera) return false;

    chimera.isActive = !chimera.isActive;

    // アクティブIDリスト更新
    if (chimera.isActive) {
        if (!labData.activeChimeraIds.includes(chimeraId)) {
            labData.activeChimeraIds.push(chimeraId);
        }
    } else {
        labData.activeChimeraIds = labData.activeChimeraIds.filter(id => id !== chimeraId);
    }

    saveLabData();
    return chimera.isActive;
}

// アクティブなキメラをBUG形式で取得
export function getActiveChimeras() {
    return labData.chimeras.filter(c => c.isActive);
}

// キメラ削除
export function deleteChimera(chimeraId) {
    labData.chimeras = labData.chimeras.filter(c => c.id !== chimeraId);
    labData.activeChimeraIds = labData.activeChimeraIds.filter(id => id !== chimeraId);
    saveLabData();
    return true;
}

// ラボ画面レンダリング
export function renderLabScreen(container) {
    loadLabData();

    let html = `
        <div class="lab-container">
            <div class="lab-header">
                <h2>🧬 配合ラボ</h2>
                <p>DNAパーツを組み合わせてオリジナルの虫を作ろう！</p>
            </div>
            
            <div class="lab-tabs">
                <button class="lab-tab active" data-tab="parts">パーツ購入</button>
                <button class="lab-tab" data-tab="create">キメラ作成</button>
                <button class="lab-tab" data-tab="list">キメラ一覧</button>
            </div>
            
            <div class="lab-content" id="lab-tab-content">
                <!-- タブ内容がここに表示される -->
            </div>
        </div>
    `;

    container.innerHTML = html;

    // タブ切り替え
    container.querySelectorAll('.lab-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.lab-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderLabTab(container.querySelector('#lab-tab-content'), tab.dataset.tab);
        });
    });

    // 初期タブ表示
    renderLabTab(container.querySelector('#lab-tab-content'), 'parts');
}

// ラボタブ内容レンダリング
function renderLabTab(container, tabName) {
    switch (tabName) {
        case 'parts':
            renderPartsTab(container);
            break;
        case 'create':
            renderCreateTab(container);
            break;
        case 'list':
            renderListTab(container);
            break;
    }
}

// パーツ購入タブ
function renderPartsTab(container) {
    let html = '<div class="parts-grid">';

    const categories = [
        { name: '頭部', key: 'heads' },
        { name: '胴体', key: 'bodies' },
        { name: '脚', key: 'legs' },
        { name: '翼', key: 'wings' },
        { name: '武器', key: 'weapons' },
        { name: '尻尾', key: 'tails' },
        { name: '特殊器官', key: 'organs' }
    ];

    categories.forEach(cat => {
        html += `<div class="parts-category"><h4>${cat.name}</h4>`;
        DNA_PARTS[cat.key].forEach(part => {
            const owned = labData.ownedParts[part.id] || 0;
            html += `
                <div class="part-item" data-part-id="${part.id}" data-price="${part.price}">
                    <span class="part-icon">${part.icon}</span>
                    <span class="part-name">${part.name}</span>
                    <span class="part-info">${part.stat ? `${part.stat}+${part.bonus}` : part.skill}</span>
                    <span class="part-price">💰${part.price.toLocaleString()}</span>
                    <span class="part-owned">所持: ${owned}</span>
                    <button class="btn-buy-part">購入</button>
                </div>
            `;
        });
        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;

    // 購入イベント
    container.querySelectorAll('.btn-buy-part').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.part-item');
            const partId = item.dataset.partId;
            const price = parseInt(item.dataset.price);

            if (confirm(`このパーツを購入しますか？\n価格: ${price.toLocaleString()}円`)) {
                if (window.buyLabPart) {
                    window.buyLabPart(partId, price);
                } else {
                    alert('購入機能が利用できません');
                }
            }
        });
    });
}

// キメラ作成タブ
function renderCreateTab(container) {
    let html = `
        <div class="create-form">
            <div class="form-group">
                <label>キメラ名:</label>
                <input type="text" id="chimera-name" placeholder="名前を入力" maxlength="10">
            </div>
            
            <div class="form-group">
                <label>頭部 (必須):</label>
                <select id="select-head">
                    <option value="">選択...</option>
                    ${DNA_PARTS.heads.map(p => {
        const owned = labData.ownedParts[p.id] || 0;
        return owned > 0 ? `<option value="${p.id}">${p.icon} ${p.name} (所持:${owned})</option>` : '';
    }).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>胴体 (必須):</label>
                <select id="select-body">
                    <option value="">選択...</option>
                    ${DNA_PARTS.bodies.map(p => {
        const owned = labData.ownedParts[p.id] || 0;
        return owned > 0 ? `<option value="${p.id}">${p.icon} ${p.name} (所持:${owned})</option>` : '';
    }).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>脚 (必須):</label>
                <select id="select-leg">
                    <option value="">選択...</option>
                    ${DNA_PARTS.legs.map(p => {
        const owned = labData.ownedParts[p.id] || 0;
        return owned > 0 ? `<option value="${p.id}">${p.icon} ${p.name} (所持:${owned})</option>` : '';
    }).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>翼 (任意):</label>
                <select id="select-wing">
                    <option value="">なし</option>
                    ${DNA_PARTS.wings.map(p => {
        const owned = labData.ownedParts[p.id] || 0;
        return owned > 0 ? `<option value="${p.id}">${p.icon} ${p.name} - ${p.skill} (所持:${owned})</option>` : '';
    }).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>武器 (任意):</label>
                <select id="select-weapon">
                    <option value="">なし</option>
                    ${DNA_PARTS.weapons.map(p => {
        const owned = labData.ownedParts[p.id] || 0;
        return owned > 0 ? `<option value="${p.id}">${p.icon} ${p.name} - ${p.skill} (所持:${owned})</option>` : '';
    }).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>尻尾 (任意):</label>
                <select id="select-tail">
                    <option value="">なし</option>
                    ${DNA_PARTS.tails.map(p => {
        const owned = labData.ownedParts[p.id] || 0;
        return owned > 0 ? `<option value="${p.id}">${p.icon} ${p.name} - ${p.skill} (所持:${owned})</option>` : '';
    }).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>特殊器官 (任意):</label>
                <select id="select-organ">
                    <option value="">なし</option>
                    ${DNA_PARTS.organs.map(p => {
        const owned = labData.ownedParts[p.id] || 0;
        return owned > 0 ? `<option value="${p.id}">${p.icon} ${p.name} - ${p.skill} (所持:${owned})</option>` : '';
    }).join('')}
                </select>
            </div>
            
            <button id="btn-create-chimera" class="btn-primary">キメラを作成！</button>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById('btn-create-chimera').addEventListener('click', () => {
        const name = document.getElementById('chimera-name').value.trim();
        const head = document.getElementById('select-head').value;
        const body = document.getElementById('select-body').value;
        const leg = document.getElementById('select-leg').value;
        const wing = document.getElementById('select-wing').value || null;
        const weapon = document.getElementById('select-weapon').value || null;
        const tail = document.getElementById('select-tail').value || null;
        const organ = document.getElementById('select-organ').value || null;

        if (!name) { alert('名前を入力してください'); return; }
        if (!head || !body || !leg) { alert('頭部・胴体・脚は必須です'); return; }

        const result = createChimera(name, head, body, leg, wing, weapon, tail, organ);
        if (result.success) {
            alert(`🧬 ${result.chimera.name} を作成しました！\nSpeed:${result.chimera.speed} HP:${result.chimera.hp} ATK:${result.chimera.attack}`);
            renderCreateTab(container);
        } else {
            alert(result.message);
        }
    });
}

// キメラ一覧タブ
function renderListTab(container) {
    const chimeras = getChimeras();

    if (chimeras.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">まだキメラがいません。パーツを集めて作成しましょう！</p>';
        return;
    }

    let html = '<div class="chimera-list">';

    chimeras.forEach(chimera => {
        html += `
            <div class="chimera-card ${chimera.isActive ? 'active' : ''}">
                <div class="chimera-icon">${chimera.icon}</div>
                <div class="chimera-info">
                    <div class="chimera-name">${chimera.name}</div>
                    <div class="chimera-stats">
                        ⚡${chimera.speed} ❤️${chimera.hp} ⚔️${chimera.attack}
                    </div>
                    <div class="chimera-skills">${chimera.skills.join(', ')}</div>
                </div>
                <div class="chimera-actions">
                    <button class="btn-toggle-active ${chimera.isActive ? 'active' : ''}" data-id="${chimera.id}">
                        ${chimera.isActive ? '✓ Active' : '休止中'}
                    </button>
                    <button class="btn-delete-chimera" data-id="${chimera.id}">🗑️</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // アクティブ切り替え
    container.querySelectorAll('.btn-toggle-active').forEach(btn => {
        btn.addEventListener('click', () => {
            const isActive = toggleChimeraActive(btn.dataset.id);
            renderListTab(container);
        });
    });

    // 削除
    container.querySelectorAll('.btn-delete-chimera').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('このキメラを削除しますか？')) {
                deleteChimera(btn.dataset.id);
                renderListTab(container);
            }
        });
    });
}

// 初期化
loadLabData();
