// gacha.js - ガチャシステム
const GACHA_COLLECTION_KEY = 'bugsRaceGachaCollection';
const GACHA_PRICE = 1000; // 1回1000円
const GACHA_10_PRICE = 9000; // 10連9000円 (1回分お得)

// レアリティ設定
const RARITIES = {
    N: { name: 'ノーマル', color: '#9E9E9E', rate: 50 },
    R: { name: 'レア', color: '#4CAF50', rate: 30 },
    SR: { name: 'スーパーレア', color: '#2196F3', rate: 15 },
    SSR: { name: 'ウルトラレア', color: '#9C27B0', rate: 4 },
    UR: { name: 'レジェンド', color: '#FF9800', rate: 1 }
};

// ガチャアイテム定義
export const GACHA_ITEMS = [
    // カード - N
    { id: 'card_silverfish_n', name: '紙魚カード', rarity: 'N', icon: '🐟', type: 'card' },
    { id: 'card_ant_n', name: 'クロヤマアリカード', rarity: 'N', icon: '🐜', type: 'card' },
    { id: 'card_worm_n', name: 'ミミズカード', rarity: 'N', icon: '🪱', type: 'card' },
    { id: 'card_snail_n', name: 'カタツムリカード', rarity: 'N', icon: '🐌', type: 'card' },
    { id: 'card_firefly_n', name: 'ホタルカード', rarity: 'N', icon: '✨', type: 'card' },

    // カード - R
    { id: 'card_ladybug_r', name: 'ナナホシテントウカード', rarity: 'R', icon: '🐞', type: 'card' },
    { id: 'card_cicada_r', name: 'アブラゼミカード', rarity: 'R', icon: '🦗', type: 'card' },
    { id: 'card_samurai_r', name: 'サムライアリカード', rarity: 'R', icon: '⚔️', type: 'card' },
    { id: 'card_centipede_r', name: 'オオムカデカード', rarity: 'R', icon: '🐛', type: 'card' },
    { id: 'card_houseCentipede_r', name: 'ゲジゲジカード', rarity: 'R', icon: '🦎', type: 'card' },

    // カード - SR
    { id: 'card_mantis_sr', name: 'オオカマキリカード', rarity: 'SR', icon: '🦗', type: 'card' },
    { id: 'card_beetle_sr', name: 'カブトムシカード', rarity: 'SR', icon: '🪲', type: 'card' },
    { id: 'card_shrimp_sr', name: 'モンハナシャコカード', rarity: 'SR', icon: '🦐', type: 'card' },
    { id: 'card_stagbeetle_sr', name: 'ノコギリクワガタカード', rarity: 'SR', icon: '🪲', type: 'card' },
    { id: 'card_hornet_sr', name: 'オオスズメバチカード', rarity: 'SR', icon: '🐝', type: 'card' },

    // カード - SSR
    { id: 'card_isopod_ssr', name: 'ダイオウグソクムシカード', rarity: 'SSR', icon: '👑', type: 'card' },
    { id: 'card_dung_ssr', name: 'フンコロガシカード', rarity: 'SSR', icon: '💩', type: 'card' },
    { id: 'card_butterfly_ssr', name: 'オオムラサキカード', rarity: 'SSR', icon: '🦋', type: 'card' },

    // カード - UR
    { id: 'card_allstar_ur', name: '虫さんオールスターズ', rarity: 'UR', icon: '🌟', type: 'card' },

    // スキン - SR
    { id: 'skin_gold_beetle', name: '黄金カブトムシスキン', rarity: 'SR', icon: '✨🪲', type: 'skin', target: 'beetle' },
    { id: 'skin_pink_ladybug', name: 'ピンクテントウスキン', rarity: 'SR', icon: '💖🐞', type: 'skin', target: 'ladybug' },
    { id: 'skin_rainbow_butterfly', name: '虹色オオムラサキスキン', rarity: 'SR', icon: '🌈🦋', type: 'skin', target: 'butterfly' },

    // スキン - SSR
    { id: 'skin_mecha_mantis', name: 'メカカマキリスキン', rarity: 'SSR', icon: '🤖🦗', type: 'skin', target: 'mantis' },
    { id: 'skin_diamond_shrimp', name: 'ダイヤモンドシャコスキン', rarity: 'SSR', icon: '💎🦐', type: 'skin', target: 'shrimp' },

    // スキン - UR
    { id: 'skin_cosmic_hornet', name: 'コズミックスズメバチ', rarity: 'UR', icon: '🌌🐝', type: 'skin', target: 'hornet' },

    // お守り - R
    { id: 'charm_luck_small', name: '小さな幸運のお守り', rarity: 'R', icon: '🍀', type: 'charm', effect: { odds: 0.05 } },
    { id: 'charm_speed_small', name: '疾風のお守り', rarity: 'R', icon: '💨', type: 'charm', effect: { speed: 0.05 } },

    // お守り - SR
    { id: 'charm_luck_medium', name: '幸運のお守り', rarity: 'SR', icon: '🌟', type: 'charm', effect: { odds: 0.1 } },
    { id: 'charm_fortune', name: '金運のお守り', rarity: 'SR', icon: '💰', type: 'charm', effect: { payout: 0.05 } },

    // お守り - SSR
    { id: 'charm_luck_large', name: '大吉のお守り', rarity: 'SSR', icon: '🏆', type: 'charm', effect: { odds: 0.2 } },

    // お守り - UR
    { id: 'charm_miracle', name: '奇跡のお守り', rarity: 'UR', icon: '✨', type: 'charm', effect: { odds: 0.3, payout: 0.1 } }
];

// コレクションを取得
export function getCollection() {
    const data = localStorage.getItem(GACHA_COLLECTION_KEY);
    return data ? JSON.parse(data) : {};
}

// コレクションを保存
function saveCollection(collection) {
    localStorage.setItem(GACHA_COLLECTION_KEY, JSON.stringify(collection));
}

// 1回ガチャを引く
export function pullGacha() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'N';

    for (const [rarity, data] of Object.entries(RARITIES)) {
        cumulative += data.rate;
        if (rand < cumulative) {
            selectedRarity = rarity;
            break;
        }
    }

    // 該当レアリティのアイテムをランダム選択
    const itemsOfRarity = GACHA_ITEMS.filter(item => item.rarity === selectedRarity);
    const selectedItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];

    // コレクションに追加
    const collection = getCollection();
    if (!collection[selectedItem.id]) {
        collection[selectedItem.id] = 0;
    }
    collection[selectedItem.id]++;
    saveCollection(collection);

    return selectedItem;
}

// 10連ガチャ
export function pullGacha10() {
    const results = [];
    for (let i = 0; i < 10; i++) {
        results.push(pullGacha());
    }
    return results;
}

// ガチャ料金
export function getGachaPrice(count = 1) {
    return count === 10 ? GACHA_10_PRICE : GACHA_PRICE * count;
}

// コレクション達成率
export function getCollectionProgress() {
    const collection = getCollection();
    const owned = Object.keys(collection).length;
    const total = GACHA_ITEMS.length;
    return { owned, total, percent: Math.floor((owned / total) * 100) };
}

// ガチャ演出付きで結果を表示
export function showGachaResult(item, container) {
    const rarityData = RARITIES[item.rarity];

    container.innerHTML = `
        <div class="gacha-result ${item.rarity.toLowerCase()}">
            <div class="gacha-rarity" style="color: ${rarityData.color}">${rarityData.name}</div>
            <div class="gacha-icon">${item.icon}</div>
            <div class="gacha-name">${item.name}</div>
            <div class="gacha-type">${getTypeLabel(item.type)}</div>
        </div>
    `;
}

// 10連結果表示
export function showGacha10Results(items, container) {
    let html = '<div class="gacha-10-results">';
    items.forEach(item => {
        const rarityData = RARITIES[item.rarity];
        html += `
            <div class="gacha-result-small ${item.rarity.toLowerCase()}">
                <div class="gacha-icon">${item.icon}</div>
                <div class="gacha-rarity-badge" style="background: ${rarityData.color}">${item.rarity}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// タイプラベル
function getTypeLabel(type) {
    switch (type) {
        case 'card': return '🃏 カード';
        case 'skin': return '🎨 スキン';
        case 'charm': return '🔮 お守り';
        default: return type;
    }
}

// コレクション一覧を描画
export function renderCollection(container) {
    const collection = getCollection();
    const progress = getCollectionProgress();

    let html = `
        <div class="collection-header">
            <h3>🎁 コレクション</h3>
            <div class="collection-progress">
                ${progress.owned} / ${progress.total} (${progress.percent}%)
            </div>
        </div>
        <div class="collection-grid">
    `;

    // レアリティ順に並べる
    const rarityOrder = ['UR', 'SSR', 'SR', 'R', 'N'];
    const sortedItems = [...GACHA_ITEMS].sort((a, b) =>
        rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
    );

    sortedItems.forEach(item => {
        const owned = collection[item.id] || 0;
        const rarityData = RARITIES[item.rarity];
        const effectDesc = getCharmEffectDescription(item);

        html += `
            <div class="collection-item ${owned > 0 ? 'owned' : 'not-owned'}" 
                 style="border-color: ${rarityData.color}"
                 title="${effectDesc}">
                <div class="collection-icon">${owned > 0 ? item.icon : '❓'}</div>
                <div class="collection-name">${owned > 0 ? item.name : '???'}</div>
                <div class="collection-rarity" style="color: ${rarityData.color}">${item.rarity}</div>
                ${owned > 1 ? `<div class="collection-count">x${owned}</div>` : ''}
                ${owned > 0 && effectDesc ? `<div class="collection-effect">${effectDesc}</div>` : ''}
            </div>
        `;
    });

    html += '</div>';

    // お守り効果説明セクション
    html += `
        <div class="charm-effects-section">
            <h4>🔮 お守り効果一覧</h4>
            <div class="charm-list">
    `;

    GACHA_ITEMS.filter(item => item.type === 'charm').forEach(charm => {
        const owned = collection[charm.id] || 0;
        const rarityData = RARITIES[charm.rarity];
        html += `
            <div class="charm-info ${owned > 0 ? 'owned' : 'locked'}">
                <span class="charm-icon">${charm.icon}</span>
                <span class="charm-name" style="color: ${rarityData.color}">${charm.name}</span>
                <span class="charm-effect-text">${getCharmEffectDescription(charm)}</span>
                ${owned > 0 ? '<span class="charm-owned">✓ 所持</span>' : '<span class="charm-locked">🔒</span>'}
            </div>
        `;
    });

    html += '</div></div>';
    container.innerHTML = html;
}

// お守りの効果説明を生成
function getCharmEffectDescription(item) {
    if (item.type !== 'charm' || !item.effect) return '';

    const effects = [];
    if (item.effect.odds) {
        effects.push(`オッズ +${Math.floor(item.effect.odds * 100)}%`);
    }
    if (item.effect.payout) {
        effects.push(`払戻 +${Math.floor(item.effect.payout * 100)}%`);
    }
    if (item.effect.speed) {
        effects.push(`スピード +${Math.floor(item.effect.speed * 100)}%`);
    }

    return effects.join(' / ');
}
