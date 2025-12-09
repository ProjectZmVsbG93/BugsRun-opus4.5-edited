// encyclopedia.js - 虫図鑑システム
import { BUG_TEMPLATES } from './data.js';

// 隠しスキルデータ (growth.jsと同期)
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

// スキル詳細データ
const SKILL_DETAILS = {
    // 基本スキル
    '前進': { target: '自分', effect: '前進', damage: 0, desc: '基本移動。虫ごとに移動距離が異なる' },
    'ぶつかる': { target: 'ランダム1体', effect: '双方ダメージ', damage: 2, desc: '相手と自分に2ダメージ' },
    'ヒラヒラしている': { target: '自分', effect: '無敵', damage: 0, desc: '次の攻撃を回避' },
    'オロオロしている': { target: '-', effect: 'なし', damage: 0, desc: '何も起こらない' },
    '逆走': { target: '自分', effect: '後退', damage: 0, desc: '10cm後退する' },

    // カマキリ
    '鎌を突き刺す': { target: 'ランダム1体', effect: 'ダメージ', damage: 3, desc: '単体攻撃' },
    '鎌を振り下ろす': { target: 'ランダム1体', effect: 'ダメージ', damage: 4, desc: '強力な単体攻撃' },
    '羽ばたく': { target: '自分', effect: '移動', damage: 0, desc: '先頭の虫と同じ位置まで移動' },
    '捕食': { target: 'ランダム1体', effect: '即死(5%)', damage: 999, desc: '5%の確率で即死させる' },

    // グソクムシ
    'オトモを呼ぶ': { target: '自分', effect: 'バフ+追加行動', damage: 0, desc: 'オトモ+1。50%で攻撃or移動' },
    'ワイはグソクムシ界の大王やぞ！！！': { target: '自分', effect: '回復', damage: 0, desc: 'HP+2回復' },

    // シャコ
    'ハイパーシャコパンチ': { target: 'ランダム1体', effect: 'ダメージ', damage: 5, desc: '強力な単体攻撃' },
    '衝撃波': { target: '全体', effect: 'ダメージ', damage: 9, desc: '全体に計9ダメージを分配' },
    '閃光弾': { target: '自分', effect: '無敵+移動', damage: 0, desc: '無敵+10cm移動' },
    '回復': { target: '自分', effect: '回復', damage: 0, desc: 'HP+1回復' },

    // テントウムシ
    '北斗七星ゲージを貯める': { target: '自分', effect: 'ゲージ+', damage: 0, desc: 'ゲージを1~3増加' },
    '北斗千手殺': { target: 'ランダム1体', effect: 'ダメージ', damage: 2, desc: 'ゲージ7以上で威力2倍' },
    '北斗有情破顔拳': { target: '全体', effect: '即死', damage: 999, desc: 'ゲージ7消費で全体即死' },
    '残悔積歩拳': { target: 'ランダム1体', effect: '後退', damage: 0, desc: '対象を15cm後退' },

    // ウスバカゲロウ
    '突進': { target: 'ランダム1体', effect: 'ダメージ', damage: 1, desc: '単体攻撃' },
    '翅の手入れ': { target: '自分', effect: 'バフ', damage: 0, desc: '次ターン移動距離2倍' },

    // アリ
    '仲間を呼ぶ': { target: '自分', effect: '仲間+', damage: 0, desc: '仲間を1~2匹追加' },
    '仲間と一緒に前進する': { target: '自分', effect: '移動', damage: 0, desc: '仲間数×5cm移動' },
    '仲間と一緒に攻撃する': { target: 'ランダム1体', effect: 'ダメージ', damage: 0, desc: '仲間数分のダメージ' },

    // カブトムシ
    '突き刺す': { target: 'ランダム1体', effect: 'ダメージ', damage: 4, desc: '単体攻撃' },
    '突き飛ばす': { target: 'ランダム1体', effect: '後退', damage: 0, desc: '対象を15cm後退' },
    '吹き飛ばす': { target: 'ランダム1体', effect: '後退', damage: 0, desc: '対象を25cm後退' },

    // ミミズ
    '巻き付く': { target: 'ランダム1体', effect: 'ダメージ', damage: 3, desc: '単体攻撃' },
    '土を食べる': { target: '自分', effect: '回復', damage: 0, desc: 'HP+3回復' },
    '土に潜る': { target: '自分', effect: '無敵+移動', damage: 0, desc: '無敵+10cm移動' },
    '落とし穴を掘る': { target: 'ランダム1体', effect: 'スタン', damage: 0, desc: '対象をスタン' },

    // セミ
    '小便をかける': { target: 'ランダム1体', effect: 'ダメージ', damage: 2, desc: '単体攻撃' },
    '超音波': { target: '全体', effect: 'ダメージ', damage: 6, desc: '全体に計6ダメージを分配' },
    '死んだフリ': { target: '自分', effect: '無敵', damage: 0, desc: '次の攻撃を回避' },

    // サムライアリ
    '面打ち': { target: 'ランダム1体', effect: 'ダメージ', damage: 4, desc: '単体攻撃' },
    '胴打ち': { target: 'ランダム1体', effect: 'ダメージ+スタン', damage: 2, desc: '2ダメ+スタン' },
    '小手打ち': { target: 'ランダム1体', effect: 'ダメージ+スタン', damage: 3, desc: '3ダメ+スタン' },
    '疾駆け': { target: '自分', effect: '移動', damage: 0, desc: '25cm移動' },

    // フンコロガシ
    '糞直球': { target: 'ランダム1体', effect: 'ダメージ', damage: 4, desc: 'フン4cm以上で4ダメ' },
    '糞球大車輪': { target: '自分', effect: '移動', damage: 0, desc: 'フンサイズ分移動' },
    'フンを食べる': { target: '自分', effect: '回復', damage: 0, desc: 'フン消費でHP回復' },
    'フンをなすりつける': { target: 'ランダム1体', effect: '毒', damage: 0, desc: '対象を毒状態' },
    '糞命の選択': { target: '?', effect: 'ランダム', damage: 0, desc: '4効果からランダム' },

    // オオムラサキ
    '脱皮する': { target: '自分', effect: '進化', damage: 0, desc: '幼虫→サナギに進化' },
    '葉っぱを食べる': { target: '自分', effect: '回復', damage: 0, desc: 'HP+2回復' },
    'かたくなる': { target: '自分', effect: 'HP増加', damage: 0, desc: '一時的にHP+5' },
    'もぞもぞしている': { target: '自分', effect: '進化(50%)', damage: 0, desc: '50%で成虫に進化' },
    '蜜を吸う': { target: '自分', effect: '回復', damage: 0, desc: 'HP+5回復' },
    '鱗粉を撒き散らす': { target: 'ランダム3体', effect: 'ダメージ', damage: 3, desc: '最大3体に3ダメ' },
    'バタフライナイフ': { target: 'ランダム1体', effect: 'ダメージ', damage: 5, desc: '単体攻撃' },
    '胡蝶の夢': { target: '-', effect: 'なし', damage: 0, desc: '何も起こらない' },

    // ムカデ
    '噛み付く': { target: 'ランダム1体', effect: '毒', damage: 0, desc: '対象を毒状態' },
    '天井に張り付く': { target: '自分', effect: '飛行', damage: 0, desc: '飛行状態(攻撃無効)' },
    'ロケットダイブ': { target: 'ランダム1体', effect: 'ダメージ+自傷', damage: 5, desc: '5ダメ+自分1ダメ' },

    // 隠しスキル
    '電光石火': { target: '自分', effect: '移動(50%)', damage: 0, desc: '50%で+20cm' },
    '必殺剣': { target: 'ランダム1体', effect: 'ダメージ', damage: 8, desc: '強力な単体攻撃' },
    '鉄壁': { target: '自分', effect: '無敵', damage: 0, desc: '3ターン無敵' },
    '角砲': { target: '前方3体', effect: 'ダメージ', damage: 3, desc: '前方3体に3ダメ' },
    '幸運の星': { target: '全体', effect: '回復', damage: 0, desc: '全体HP+3' },
    '軍団突撃': { target: '全体', effect: 'ダメージ', damage: 0, desc: '仲間数+2ダメージ' },
    '居合斬り': { target: 'ランダム1体', effect: '即死(30%)', damage: 5, desc: '30%即死、他5ダメ' },
    '百足乱舞': { target: '全体', effect: 'ダメージ', damage: 4, desc: '全体に2ダメ×2' },
    'ビッグバン': { target: '全体', effect: 'ダメージ', damage: 5, desc: 'フン10以上で全体5ダメ' },
    '蝶の舞': { target: '全体+自分', effect: '回復+移動', damage: 0, desc: '全体HP+2、自分+10cm' },
    '必殺挟み': { target: 'ランダム1体', effect: '即死', damage: 999, desc: '確定即死' },
    '女王の逆鱗': { target: '全体', effect: 'ダメージ', damage: 5, desc: '全体に5ダメ' },
    '時の殻': { target: '自分', effect: '無敵+回復', damage: 0, desc: '2ターン無敵+HP全回復' },
    '蛍の導き': { target: '全体', effect: '移動', damage: 0, desc: '全員+15cm' },
    '影分身': { target: '自分', effect: '分身', damage: 0, desc: '分身を3体生成' }
};

// 更新ログ
const UPDATE_LOG = [
    {
        version: '2.5.0', date: '2024-12-09', changes: [
            '📖 図鑑機能を追加',
            '🌱 隠しスキルを実装 (15種類)',
            '✨ お守りオッズ・払戻ボーナスを追加',
            '🎮 介入システムの時空の歪みを修正',
            '🧬 キメラの尻尾・特殊器官購入を修正'
        ]
    },
    {
        version: '2.4.0', date: '2024-12-08', changes: [
            '📈 株式市場クイックビューを追加',
            '🌱 育成レベルボーナス表示を追加',
            '🎮 介入ボタンをレースヘッダーに移動',
            '📅 デイリートーナメント参戦チャレンジを修正'
        ]
    },
    {
        version: '2.3.0', date: '2024-12-07', changes: [
            '🏆 トーナメントモードを追加',
            '🧬 キメラ作成機能を追加',
            '🎰 ガチャシステムを追加',
            '🌍 新コース3種を追加 (洞窟、遺跡、宇宙)'
        ]
    },
    {
        version: '2.0.0', date: '2024-12-01', changes: [
            '🎮 基本レースシステムを実装',
            '🐛 虫15種類を追加',
            '🌤️ 天候システムを実装',
            '💰 ベッティングシステムを実装'
        ]
    }
];

// 図鑑モーダルを表示
export function showEncyclopedia() {
    const modal = document.createElement('div');
    modal.id = 'encyclopedia-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';

    const container = document.createElement('div');
    container.style.cssText = 'background:white; padding:20px; border-radius:15px; max-width:800px; width:100%; max-height:90vh; overflow-y:auto;';

    // タブ
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h2 style="margin:0;">📖 虫図鑑</h2>
            <button id="close-encyclopedia" style="background:none; border:none; font-size:24px; cursor:pointer;">✕</button>
        </div>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button class="encyclopedia-tab active" data-tab="bugs" style="padding:10px 20px; border:none; background:#4CAF50; color:white; border-radius:8px; cursor:pointer;">🐛 虫一覧</button>
            <button class="encyclopedia-tab" data-tab="skills" style="padding:10px 20px; border:none; background:#e0e0e0; border-radius:8px; cursor:pointer;">⚔️ スキル</button>
            <button class="encyclopedia-tab" data-tab="log" style="padding:10px 20px; border:none; background:#e0e0e0; border-radius:8px; cursor:pointer;">📋 更新ログ</button>
        </div>
        <div id="encyclopedia-content"></div>
    `;

    modal.appendChild(container);
    document.body.appendChild(modal);

    // イベント
    modal.querySelector('#close-encyclopedia').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // タブ切り替え
    modal.querySelectorAll('.encyclopedia-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.encyclopedia-tab').forEach(t => {
                t.classList.remove('active');
                t.style.background = '#e0e0e0';
                t.style.color = '#333';
            });
            tab.classList.add('active');
            tab.style.background = '#4CAF50';
            tab.style.color = 'white';
            renderTabContent(tab.dataset.tab);
        });
    });

    renderTabContent('bugs');

    function renderTabContent(tabId) {
        const content = modal.querySelector('#encyclopedia-content');

        if (tabId === 'bugs') {
            content.innerHTML = BUG_TEMPLATES.map(bug => {
                const hiddenSkill = HIDDEN_SKILLS[bug.id];
                return `
                    <div style="border:1px solid #ddd; border-radius:10px; padding:15px; margin-bottom:15px;">
                        <div style="display:flex; align-items:center; gap:15px; margin-bottom:10px;">
                            <div style="font-size:40px; width:50px; height:50px; display:flex; align-items:center; justify-content:center; overflow:hidden;">${bug.icon.includes('<img') ? bug.icon.replace('class="bug-img"', 'style="width:50px; height:50px; object-fit:contain;"') : bug.icon}</div>
                            <div>
                                <h3 style="margin:0 0 5px 0;">${bug.name}</h3>
                                <span style="background:#${getTypeColor(bug.type)}; color:white; padding:3px 8px; border-radius:12px; font-size:12px;">${bug.type}</span>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:10px;">
                            <div style="text-align:center; background:#e3f2fd; padding:8px; border-radius:8px;">
                                <div style="font-size:12px; color:#666;">Speed</div>
                                <div style="font-size:20px; font-weight:bold; color:#1976D2;">${bug.speed}</div>
                            </div>
                            <div style="text-align:center; background:#e8f5e9; padding:8px; border-radius:8px;">
                                <div style="font-size:12px; color:#666;">HP</div>
                                <div style="font-size:20px; font-weight:bold; color:#388E3C;">${bug.hp}</div>
                            </div>
                            <div style="text-align:center; background:#ffebee; padding:8px; border-radius:8px;">
                                <div style="font-size:12px; color:#666;">Attack</div>
                                <div style="font-size:20px; font-weight:bold; color:#D32F2F;">${bug.attack}</div>
                            </div>
                        </div>
                        <div style="font-size:12px; color:#666; margin-bottom:8px;">
                            <strong>スキル:</strong> ${bug.skills.join(', ')}
                        </div>
                        ${hiddenSkill ? `<div style="font-size:12px; background:#FFF3E0; padding:8px; border-radius:8px; margin-bottom:8px;">
                            <strong>🔓 隠しスキル (Lv.${hiddenSkill.level}):</strong> ${hiddenSkill.skill} - ${hiddenSkill.desc}
                        </div>` : ''}
                        <div style="font-size:12px; color:#888;">${bug.desc}</div>
                    </div>
                `;
            }).join('');
        } else if (tabId === 'skills') {
            const skillEntries = Object.entries(SKILL_DETAILS);
            content.innerHTML = `
                <div style="display:grid; gap:10px;">
                    ${skillEntries.map(([name, info]) => `
                        <div style="border:1px solid #ddd; border-radius:8px; padding:10px; display:grid; grid-template-columns:150px 100px 80px 1fr; gap:10px; align-items:center;">
                            <div style="font-weight:bold;">${name}</div>
                            <div style="font-size:12px; color:#666;">対象: ${info.target}</div>
                            <div style="font-size:12px; color:${info.damage > 0 ? '#D32F2F' : '#666'};">
                                ${info.damage > 0 ? `💥${info.damage === 999 ? '即死' : info.damage}ダメ` : info.effect}
                            </div>
                            <div style="font-size:12px; color:#888;">${info.desc}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (tabId === 'log') {
            content.innerHTML = UPDATE_LOG.map(log => `
                <div style="border:1px solid #ddd; border-radius:10px; padding:15px; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h3 style="margin:0;">v${log.version}</h3>
                        <span style="color:#666; font-size:12px;">${log.date}</span>
                    </div>
                    <ul style="margin:0; padding-left:20px;">
                        ${log.changes.map(change => `<li style="margin-bottom:5px;">${change}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        }
    }

    function getTypeColor(type) {
        const colors = {
            'スピード': '2196F3',
            'バランス': '9C27B0',
            'タンク': '4CAF50',
            '攻撃型タンク': 'FF9800',
            'チャージ': 'E91E63',
            'アタック': 'F44336',
            '高級タンク': '00BCD4',
            '進化': 'FFEB3B',
            'パワー': '795548',
            'サポート': '03A9F4',
            '超攻撃': 'D32F2F'
        };
        return colors[type] || '607D8B';
    }
}
