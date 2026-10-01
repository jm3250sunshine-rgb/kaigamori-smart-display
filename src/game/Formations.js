// 9人制アメリカンフットボールのフォーメーションデータ
// フィールド上の相対座標（X: 進行方向ヤード数 offset, Y: フィールド幅 0〜53.3ヤードにおける位置）
// オフェンス 9人: OL(5), TE(1), QB(1), RB(1), WR(1)
// ディフェンス 9人: DL, LB, CB, S

export const FIELD_WIDTH_YARDS = 53.3; // アメフトフィールドの標準幅 (ヤード)

export const OFFENSE_FORMATIONS = {
  pro_set: {
    id: 'pro_set',
    name: 'Pro Set (バランス)',
    description: '標準的なバランス型フォーメーション。ラン・パス共に有効。',
    players: [
      // Line 6 (Center at Y=26.65, Guards, Tackles, TE)
      { role: 'OL', pos: 'LT', relX: -0.5, relY: 22.65 },
      { role: 'OL', pos: 'LG', relX: -0.5, relY: 24.65 },
      { role: 'OL', pos: 'C',  relX: -0.5, relY: 26.65 },
      { role: 'OL', pos: 'RG', relX: -0.5, relY: 28.65 },
      { role: 'OL', pos: 'RT', relX: -0.5, relY: 30.65 },
      { role: 'TE', pos: 'TE', relX: -0.5, relY: 32.65, route: 'out' },
      // Backfield & Receiver
      { role: 'QB', pos: 'QB', relX: -2.0, relY: 26.65 },
      { role: 'RB', pos: 'RB', relX: -5.0, relY: 26.65, route: 'run_offtackle' },
      { role: 'WR', pos: 'WR', relX: -0.5, relY: 8.0, route: 'fly' },
    ]
  },
  shotgun_spread: {
    id: 'shotgun_spread',
    name: 'Shotgun Spread (パス重視)',
    description: 'QBが深く構え、スプレッドに展開。パス攻撃に最適。',
    players: [
      { role: 'OL', pos: 'LT', relX: -0.5, relY: 22.65 },
      { role: 'OL', pos: 'LG', relX: -0.5, relY: 24.65 },
      { role: 'OL', pos: 'C',  relX: -0.5, relY: 26.65 },
      { role: 'OL', pos: 'RG', relX: -0.5, relY: 28.65 },
      { role: 'OL', pos: 'RT', relX: -0.5, relY: 30.65 },
      { role: 'TE', pos: 'TE', relX: -0.5, relY: 42.0, route: 'corner' }, // Flex TE
      { role: 'QB', pos: 'QB', relX: -5.0, relY: 26.65 },
      { role: 'RB', pos: 'RB', relX: -5.0, relY: 29.5, route: 'screen' },
      { role: 'WR', pos: 'WR', relX: -0.5, relY: 6.0, route: 'slant' },
    ]
  },
  i_formation: {
    id: 'i_formation',
    name: 'I-Formation (パワーラン)',
    description: 'QBとRBが縦一直線に並び、パワフルな中央突破を狙う。',
    players: [
      { role: 'OL', pos: 'LT', relX: -0.5, relY: 22.65 },
      { role: 'OL', pos: 'LG', relX: -0.5, relY: 24.65 },
      { role: 'OL', pos: 'C',  relX: -0.5, relY: 26.65 },
      { role: 'OL', pos: 'RG', relX: -0.5, relY: 28.65 },
      { role: 'OL', pos: 'RT', relX: -0.5, relY: 30.65 },
      { role: 'TE', pos: 'TE', relX: -0.5, relY: 32.65, route: 'flat' },
      { role: 'QB', pos: 'QB', relX: -2.0, relY: 26.65 },
      { role: 'RB', pos: 'RB', relX: -6.0, relY: 26.65, route: 'power_dive' },
      { role: 'WR', pos: 'WR', relX: -0.5, relY: 8.0, route: 'post' },
    ]
  },
  singleback_ace: {
    id: 'singleback_ace',
    name: 'Singleback Ace (バランス型)',
    description: '単独のRBを深めに配置し、プレイアクションや多様なパスに対応。',
    players: [
      { role: 'OL', pos: 'LT', relX: -0.5, relY: 22.65 },
      { role: 'OL', pos: 'LG', relX: -0.5, relY: 24.65 },
      { role: 'OL', pos: 'C',  relX: -0.5, relY: 26.65 },
      { role: 'OL', pos: 'RG', relX: -0.5, relY: 28.65 },
      { role: 'OL', pos: 'RT', relX: -0.5, relY: 30.65 },
      { role: 'TE', pos: 'TE', relX: -0.5, relY: 32.65, route: 'curl' },
      { role: 'QB', pos: 'QB', relX: -3.5, relY: 26.65 },
      { role: 'RB', pos: 'RB', relX: -7.0, relY: 26.65, route: 'draw' },
      { role: 'WR', pos: 'WR', relX: -0.5, relY: 6.0, route: 'out' },
    ]
  },
  trips_right: {
    id: 'trips_right',
    name: 'Trips Right (右集中)',
    description: '右サイドにターゲットを集中させ、ミスマッチを誘う。',
    players: [
      { role: 'OL', pos: 'LT', relX: -0.5, relY: 18.65 },
      { role: 'OL', pos: 'LG', relX: -0.5, relY: 20.65 },
      { role: 'OL', pos: 'C',  relX: -0.5, relY: 22.65 },
      { role: 'OL', pos: 'RG', relX: -0.5, relY: 24.65 },
      { role: 'OL', pos: 'RT', relX: -0.5, relY: 26.65 },
      { role: 'TE', pos: 'TE', relX: -0.5, relY: 35.0, route: 'post' },
      { role: 'QB', pos: 'QB', relX: -4.0, relY: 22.65 },
      { role: 'RB', pos: 'RB', relX: -4.0, relY: 18.0, route: 'swing' },
      { role: 'WR', pos: 'WR', relX: -0.5, relY: 44.0, route: 'fly' },
    ]
  },
  goal_line_offense: {
    id: 'goal_line_offense',
    name: 'Goal Line Heavy (短距離突破)',
    description: '密集したラインで確実に1〜2ヤードを奪う超重厚オフェンス。',
    players: [
      { role: 'OL', pos: 'LT', relX: -0.5, relY: 21.65 },
      { role: 'OL', pos: 'LG', relX: -0.5, relY: 23.65 },
      { role: 'OL', pos: 'C',  relX: -0.5, relY: 25.65 },
      { role: 'OL', pos: 'RG', relX: -0.5, relY: 27.65 },
      { role: 'OL', pos: 'RT', relX: -0.5, relY: 29.65 },
      { role: 'TE', pos: 'TE', relX: -0.5, relY: 31.65, route: 'block' },
      { role: 'QB', pos: 'QB', relX: -1.5, relY: 25.65 },
      { role: 'RB', pos: 'RB', relX: -4.5, relY: 25.65, route: 'wedge' },
      { role: 'WR', pos: 'WR', relX: -0.5, relY: 33.65, route: 'quick_slant' },
    ]
  },

  // スペシャルプレイ (キッキング)
  punt_offense: {
    id: 'punt_offense',
    name: 'Punt (パント)',
    description: 'キックによって自陣深くから敵陣奥深くへボールを蹴り出す。',
    isKicking: true,
    players: [
      { role: 'OL', pos: 'LS', relX: -0.5, relY: 26.65 },
      { role: 'OL', pos: 'L1', relX: -0.5, relY: 22.0 },
      { role: 'OL', pos: 'L2', relX: -0.5, relY: 24.0 },
      { role: 'OL', pos: 'R1', relX: -0.5, relY: 29.3 },
      { role: 'OL', pos: 'R2', relX: -0.5, relY: 31.3 },
      { role: 'TE', pos: 'TE', relX: -0.5, relY: 35.0, route: 'gunner' },
      { role: 'WR', pos: 'G1', relX: -0.5, relY: 8.0, route: 'gunner' },
      { role: 'RB', pos: 'FB', relX: -6.0, relY: 25.0, route: 'upback' },
      { role: 'QB', pos: 'P',  relX: -12.0, relY: 26.65, isPunter: true },
    ]
  },
  field_goal_offense: {
    id: 'field_goal_offense',
    name: 'Field Goal (フィールドゴール)',
    description: '3点獲得を狙うキックプレイ。',
    isKicking: true,
    players: [
      { role: 'OL', pos: 'LS', relX: -0.5, relY: 26.65 },
      { role: 'OL', pos: 'L1', relX: -0.5, relY: 21.0 },
      { role: 'OL', pos: 'L2', relX: -0.5, relY: 23.5 },
      { role: 'OL', pos: 'L3', relX: -0.5, relY: 25.0 },
      { role: 'OL', pos: 'R1', relX: -0.5, relY: 28.3 },
      { role: 'OL', pos: 'R2', relX: -0.5, relY: 29.8 },
      { role: 'OL', pos: 'R3', relX: -0.5, relY: 32.3 },
      { role: 'RB', pos: 'H',  relX: -7.0, relY: 26.65, isHolder: true },
      { role: 'QB', pos: 'K',  relX: -9.5, relY: 25.5, isKicker: true },
    ]
  }
};

export const DEFENSE_FORMATIONS = {
  def_5_3: {
    id: 'def_5_3',
    name: '5-3 Defense (標準ラン警戒)',
    description: '5人のDLと3人のLBで中央のランを遮断する。',
    players: [
      { role: 'DL', pos: 'DE1', relX: 1.5, relY: 20.0 },
      { role: 'DL', pos: 'DT1', relX: 1.0, relY: 24.0 },
      { role: 'DL', pos: 'NT',  relX: 1.0, relY: 26.65 },
      { role: 'DL', pos: 'DT2', relX: 1.0, relY: 29.3 },
      { role: 'DL', pos: 'DE2', relX: 1.5, relY: 33.3 },
      { role: 'LB', pos: 'OLB1', relX: 4.5, relY: 18.0 },
      { role: 'LB', pos: 'MLB',  relX: 5.0, relY: 26.65 },
      { role: 'LB', pos: 'OLB2', relX: 4.5, relY: 35.0 },
      { role: 'S',  pos: 'FS',   relX: 12.0, relY: 26.65 },
    ]
  },
  def_4_4: {
    id: 'def_4_4',
    name: '4-4 Defense (バランス型)',
    description: '4DLと4LBでショートパスとランの両方に対応。',
    players: [
      { role: 'DL', pos: 'DE1', relX: 1.5, relY: 21.0 },
      { role: 'DL', pos: 'DT1', relX: 1.0, relY: 24.65 },
      { role: 'DL', pos: 'DT2', relX: 1.0, relY: 28.65 },
      { role: 'DL', pos: 'DE2', relX: 1.5, relY: 32.3 },
      { role: 'LB', pos: 'LB1', relX: 4.5, relY: 14.0 },
      { role: 'LB', pos: 'MLB1', relX: 4.5, relY: 23.5 },
      { role: 'LB', pos: 'MLB2', relX: 4.5, relY: 29.8 },
      { role: 'LB', pos: 'LB2', relX: 4.5, relY: 39.0 },
      { role: 'S',  pos: 'FS',   relX: 11.0, relY: 26.65 },
    ]
  },
  def_6_2: {
    id: 'def_6_2',
    name: '6-2 Heavy (ライン重視)',
    description: 'フロントラインを6人で敷き詰め、ランを完全に防ぐ。',
    players: [
      { role: 'DL', pos: 'DE1', relX: 1.0, relY: 17.0 },
      { role: 'DL', pos: 'DT1', relX: 1.0, relY: 21.0 },
      { role: 'DL', pos: 'DT2', relX: 1.0, relY: 24.65 },
      { role: 'DL', pos: 'DT3', relX: 1.0, relY: 28.65 },
      { role: 'DL', pos: 'DT4', relX: 1.0, relY: 32.3 },
      { role: 'DL', pos: 'DE2', relX: 1.0, relY: 36.3 },
      { role: 'LB', pos: 'MLB1', relX: 4.0, relY: 22.0 },
      { role: 'LB', pos: 'MLB2', relX: 4.0, relY: 31.3 },
      { role: 'S',  pos: 'FS',   relX: 10.0, relY: 26.65 },
    ]
  },
  def_4_3_nickel: {
    id: 'def_4_3_nickel',
    name: '4-3 Nickel (パス警戒)',
    description: '2人のDBでフィールド全域のパスをカバレッジ。',
    players: [
      { role: 'DL', pos: 'DE1', relX: 1.5, relY: 21.0 },
      { role: 'DL', pos: 'DT1', relX: 1.0, relY: 24.65 },
      { role: 'DL', pos: 'DT2', relX: 1.0, relY: 28.65 },
      { role: 'DL', pos: 'DE2', relX: 1.5, relY: 32.3 },
      { role: 'LB', pos: 'WLB', relX: 4.5, relY: 18.0 },
      { role: 'LB', pos: 'MLB', relX: 5.0, relY: 26.65 },
      { role: 'LB', pos: 'SLB', relX: 4.5, relY: 35.0 },
      { role: 'CB', pos: 'CB1', relX: 6.0, relY: 8.0 },
      { role: 'S',  pos: 'FS',  relX: 13.0, relY: 30.0 },
    ]
  },
  def_3_4_cover2: {
    id: 'def_3_4_cover2',
    name: '3-4 Cover 2 (ロングパス対応)',
    description: '3DL 4LB 2S のディープカバー。大遠投パスを封殺。',
    players: [
      { role: 'DL', pos: 'DE1', relX: 1.5, relY: 21.0 },
      { role: 'DL', pos: 'NT',  relX: 1.0, relY: 26.65 },
      { role: 'DL', pos: 'DE2', relX: 1.5, relY: 32.3 },
      { role: 'LB', pos: 'OLB1', relX: 4.0, relY: 15.0 },
      { role: 'LB', pos: 'ILB1', relX: 4.5, relY: 23.0 },
      { role: 'LB', pos: 'ILB2', relX: 4.5, relY: 30.3 },
      { role: 'LB', pos: 'OLB2', relX: 4.0, relY: 38.0 },
      { role: 'S',  pos: 'SS',   relX: 12.0, relY: 16.0 },
      { role: 'S',  pos: 'FS',   relX: 13.0, relY: 37.0 },
    ]
  },
  def_blitz: {
    id: 'def_blitz',
    name: 'All-Out Blitz (全員突撃)',
    description: '一か八かの全員ブリッツ。QBサックを狙う超強気陣形。',
    players: [
      { role: 'DL', pos: 'DE1', relX: 0.8, relY: 19.0 },
      { role: 'DL', pos: 'DT1', relX: 0.8, relY: 23.0 },
      { role: 'DL', pos: 'NT',  relX: 0.8, relY: 26.65 },
      { role: 'DL', pos: 'DT2', relX: 0.8, relY: 30.3 },
      { role: 'DL', pos: 'DE2', relX: 0.8, relY: 34.3 },
      { role: 'LB', pos: 'LB1', relX: 1.5, relY: 15.0 },
      { role: 'LB', pos: 'LB2', relX: 1.5, relY: 38.0 },
      { role: 'LB', pos: 'MLB', relX: 2.0, relY: 26.65 },
      { role: 'S',  pos: 'FS',  relX: 8.0, relY: 26.65 },
    ]
  },

  // スペシャル対応ディフェンス
  def_punt_return: {
    id: 'def_punt_return',
    name: 'Punt Defense',
    description: 'パントのブロックまたはキックリターンに備える。',
    players: [
      { role: 'DL', pos: 'R1', relX: 1.0, relY: 18.0 },
      { role: 'DL', pos: 'R2', relX: 1.0, relY: 22.0 },
      { role: 'DL', pos: 'R3', relX: 1.0, relY: 26.65 },
      { role: 'DL', pos: 'R4', relX: 1.0, relY: 31.0 },
      { role: 'DL', pos: 'R5', relX: 1.0, relY: 35.0 },
      { role: 'LB', pos: 'B1', relX: 3.0, relY: 12.0 },
      { role: 'LB', pos: 'B2', relX: 3.0, relY: 41.0 },
      { role: 'S',  pos: 'S1', relX: 15.0, relY: 26.65 },
      { role: 'S',  pos: 'PR', relX: 35.0, relY: 26.65, isReturner: true },
    ]
  },
  def_fg_block: {
    id: 'def_fg_block',
    name: 'FG Block',
    description: 'FGをブロックするために全速力で突撃。',
    players: [
      { role: 'DL', pos: 'R1', relX: 0.8, relY: 19.0 },
      { role: 'DL', pos: 'R2', relX: 0.8, relY: 21.5 },
      { role: 'DL', pos: 'R3', relX: 0.8, relY: 24.0 },
      { role: 'DL', pos: 'R4', relX: 0.8, relY: 26.65 },
      { role: 'DL', pos: 'R5', relX: 0.8, relY: 29.3 },
      { role: 'DL', pos: 'R6', relX: 0.8, relY: 31.8 },
      { role: 'DL', pos: 'R7', relX: 0.8, relY: 34.3 },
      { role: 'LB', pos: 'B1', relX: 1.5, relY: 16.0 },
      { role: 'LB', pos: 'B2', relX: 1.5, relY: 37.3 },
    ]
  }
};
