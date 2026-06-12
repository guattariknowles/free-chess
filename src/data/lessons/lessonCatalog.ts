import { Chess, type Square } from 'chess.js';

export type LessonCategory =
  | 'basics'
  | 'openings'
  | 'strategy'
  | 'endgames';

export type ChessLesson = {
  category: LessonCategory;
  fen: string;
  id: string;
  level: '入门' | '基础' | '进阶';
  mistake?: { explanation: string; label: string };
  points: string[];
  recommended?: {
    explanation: string;
    from: Square;
    label: string;
    promotion?: 'b' | 'n' | 'q' | 'r';
    to: Square;
  };
  summary: string;
  title: string;
  why: string;
};

export const LESSON_CATEGORY_LABELS: Record<LessonCategory, string> = {
  basics: '规则基础',
  openings: '常见开局',
  strategy: '中局思路',
  endgames: '残局基础',
};

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const LESSONS: ChessLesson[] = [
  {
    category: 'basics',
    fen: START_FEN,
    id: 'board-coordinates',
    level: '入门',
    points: ['竖线用 a 到 h，横线用 1 到 8。', '先读字母再读数字，例如 e4。', '棋盘翻转后格子名称不变。'],
    summary: '学会读出 e4、a1 这样的格子名称。',
    title: '棋盘坐标',
    why: '坐标是记录走法、阅读 PGN 和讨论局面的共同语言。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/3K4/8/8/8/8 w - - 0 1',
    id: 'piece-king',
    level: '入门',
    points: ['王每次向任意方向走一格。', '王不能走进受攻击的格子。', '两个王不能相邻。'],
    recommended: { explanation: 'Kc5 展示王向左移动一格。', from: 'd5', label: 'Kc5', to: 'c5' },
    summary: '王走得慢，但王被将死就会输掉对局。',
    title: '王怎么走',
    why: '王是唯一不能放弃的棋子，所有计划都要先保证王的安全。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1',
    id: 'piece-queen',
    level: '入门',
    points: ['后能沿横线、竖线和斜线走任意格。', '后不能越过其他棋子。', '过早深入敌阵容易被追赶。'],
    recommended: { explanation: 'Qd7+ 同时展示直线移动和将军。', from: 'd4', label: 'Qd7+', to: 'd7' },
    summary: '后结合了车和象的走法。',
    title: '后怎么走',
    why: '后价值很高，安全使用比急着进攻更重要。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1',
    id: 'piece-rook',
    level: '入门',
    points: ['车沿横线或竖线走任意格。', '车不能斜走或越子。', '开放的直线越多，车越活跃。'],
    recommended: { explanation: 'Rd8+ 沿竖线移动并将军。', from: 'd4', label: 'Rd8+', to: 'd8' },
    summary: '车擅长控制开放线和最后几排。',
    title: '车怎么走',
    why: '车在残局尤其强，但需要没有棋子阻挡的直线。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1',
    id: 'piece-bishop',
    level: '入门',
    points: ['象只能沿斜线走任意格。', '一只象始终留在同色格。', '中心兵移开后象才容易出动。'],
    recommended: { explanation: 'Bb6 展示象沿斜线移动。', from: 'd4', label: 'Bb6', to: 'b6' },
    summary: '象是远距离棋子，需要畅通的斜线。',
    title: '象怎么走',
    why: '被自己的兵堵住时，象很难发挥作用。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1',
    id: 'piece-knight',
    level: '入门',
    points: ['马走“日”字。', '马是唯一能越子的棋子。', '马在中心通常能控制更多格。'],
    recommended: { explanation: 'Nf5 是从 d4 出发的一次标准马步。', from: 'd4', label: 'Nf5', to: 'f5' },
    summary: '马的路线特殊，适合制造双重攻击。',
    title: '马怎么走',
    why: '马不能远距离移动，所以位置是否靠近战场很重要。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    id: 'piece-pawn',
    level: '入门',
    points: ['兵向前走，第一次可走一格或两格。', '兵斜着吃子，不能向前吃子。', '兵不能后退。'],
    recommended: { explanation: 'e4 利用兵第一次可前进两格的规则。', from: 'e2', label: 'e4', to: 'e4' },
    summary: '兵走得最慢，但能控制关键格并升变。',
    title: '兵怎么走',
    why: '兵不能后退，所以每次兵步都会长期改变局面。',
  },
  {
    category: 'basics',
    fen: '4k3/n7/8/8/8/8/8/R3K3 w Q - 0 1',
    id: 'capturing',
    level: '入门',
    points: ['走到敌方棋子所在格就完成吃子。', '不能吃自己的棋子。', '吃子前要检查会不会立刻被吃回。'],
    recommended: { explanation: 'Rxa7 表示白车吃掉 a7 的黑马。', from: 'a1', label: 'Rxa7', to: 'a7' },
    summary: '吃子是交换棋子的基本方式。',
    title: '怎样吃子',
    why: '多吃一个棋子不一定总是赚到，要看交换后的整体结果。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
    id: 'check',
    level: '基础',
    points: ['将军表示王正在被攻击。', '被将军必须立即回应。', '可以移王、挡住攻击或吃掉进攻棋子。'],
    recommended: { explanation: 'Ra8+ 让白车沿第 8 横线攻击黑王。', from: 'a1', label: 'Ra8+', to: 'a8' },
    summary: '将军是一种必须马上回应的威胁。',
    title: '什么是将军',
    why: '让王留在被攻击状态是不合法的。',
  },
  {
    category: 'basics',
    fen: '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1',
    id: 'checkmate',
    level: '基础',
    points: ['黑王正在被攻击。', '黑王没有安全格，也不能挡住或吃掉进攻棋子。', '将死后对局立即结束。'],
    summary: '王被将军且没有合法应对，就是将死。',
    title: '什么是将死',
    why: '目标是将死，而不是把王或所有棋子吃掉。',
  },
  {
    category: 'basics',
    fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
    id: 'draw',
    level: '基础',
    points: ['黑王没有合法走法，但没有被将军。', '这种情况叫逼和。', '重复局面、五十回合和子力不足也会和棋。'],
    summary: '并非所有不能继续的对局都是输棋。',
    title: '常见和棋',
    why: '优势方如果只顾追王，可能把必胜局面走成逼和。',
  },
  {
    category: 'basics',
    fen: 'r3k2r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R3K2R w KQkq - 4 4',
    id: 'castling',
    level: '基础',
    points: ['易位一次同时移动王和车。', '王、车未移动且中间无子。', '王不能在被将军时或经过受攻击格易位。'],
    recommended: { explanation: 'O-O：王到 g1，h1 车到 f1。', from: 'e1', label: 'O-O', to: 'g1' },
    summary: '王车易位通常能同时保护王并激活车。',
    title: '王车易位',
    why: '王离开中央后，更不容易被打开的中心线路攻击。',
  },
  {
    category: 'basics',
    fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
    id: 'en-passant',
    level: '基础',
    points: ['黑兵刚从 d7 一次走到 d5。', '白兵可在 d6 吃掉它。', '只能在对方刚走完两格后立即使用。'],
    recommended: { explanation: 'exd6：白兵到 d6，并移除 d5 黑兵。', from: 'e5', label: 'exd6 e.p.', to: 'd6' },
    summary: '吃过路兵是针对兵首次走两格的特殊吃法。',
    title: '吃过路兵',
    why: '它防止兵一次走两格逃过相邻敌兵的控制。',
  },
  {
    category: 'basics',
    fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    id: 'promotion',
    level: '基础',
    points: ['兵到达底线必须升变。', '可选后、车、象或马。', '多数时候升后最强，但不是唯一选择。'],
    recommended: { explanation: 'a8=Q 把白兵升变为后。', from: 'a7', label: 'a8=Q', promotion: 'q', to: 'a8' },
    summary: '兵走到底线后会变成更强的棋子。',
    title: '兵升变',
    why: '残局中的通路兵可能因为升变而决定胜负。',
  },
  {
    category: 'basics',
    fen: START_FEN,
    id: 'clock-basics',
    level: '基础',
    points: ['走完一步后按钟。', '加秒会在每步后补回固定时间。', '要保留完成操作的时间。'],
    summary: '棋钟限制双方整盘棋可用的思考时间。',
    title: '棋钟基础',
    why: '时间也是资源；时间用完，即使局面更好也会判负。',
  },
  {
    category: 'basics',
    fen: START_FEN,
    id: 'pgn-basics',
    level: '基础',
    points: ['PGN 是保存棋局的文本格式。', 'N/B/R/Q/K 分别表示马、象、车、后、王。', 'x、+、# 分别表示吃子、将军、将死。'],
    summary: 'PGN 用简短文字记录双方每一步棋。',
    title: 'PGN 基础',
    why: '会读 PGN 后，就能保存、导入和回放自己的对局。',
  },
  {
    category: 'openings',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    id: 'opening-italian',
    level: '进阶',
    mistake: { explanation: '3.d3 可以下，但暂时没有让象主动瞄准 f7，发展较慢。', label: '3.d3?!' },
    points: ['白象到 c4，关注 f7。', '继续易位并发展其他棋子。', '不要只盯着一次早期攻击。'],
    recommended: { explanation: '3.Bc4 同时发展象、控制中心并瞄准 f7。', from: 'f1', label: '3.Bc4', to: 'c4' },
    summary: '用快速出子和王翼压力学习开局发展。',
    title: '意大利开局',
    why: '一步同时完成多个目标，通常比只做一件事更有效。',
  },
  {
    category: 'openings',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    id: 'opening-ruy-lopez',
    level: '进阶',
    mistake: { explanation: '3.Bc4 不是坏棋，但会进入意大利开局，不再牵制 c6 马。', label: '3.Bc4' },
    points: ['白象给 c6 马施压。', '目标是增加黑方守住 e5 的难度。', '通常先易位，再决定象的退路。'],
    recommended: { explanation: '3.Bb5 形成西班牙开局的核心结构。', from: 'f1', label: '3.Bb5', to: 'b5' },
    summary: '通过间接攻击 e5 兵争夺中心。',
    title: '西班牙开局',
    why: '攻击一个防守者，有时比直接攻击目标更有力。',
  },
  {
    category: 'openings',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
    id: 'opening-queens-gambit',
    level: '进阶',
    mistake: { explanation: '2.Nc3 会挡住 c 兵，暂时失去用 c4 直接挑战 d5 的机会。', label: '2.Nc3?!' },
    points: ['c4 挑战 d5 中心兵。', '重点是中心空间，不是盲目送兵。', '被吃后常可用 e3 和象取回。'],
    recommended: { explanation: '2.c4 立即向黑方中心施压。', from: 'c2', label: '2.c4', to: 'c4' },
    summary: '用侧翼兵挑战对方中心兵。',
    title: '后翼弃兵',
    why: '侧翼兵交换中心兵，常能换来更好的中心控制。',
  },
  {
    category: 'openings',
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 2 3',
    id: 'opening-london',
    level: '进阶',
    mistake: { explanation: '3.c4 会转入后翼弃兵式结构；不是坏棋，但不再是伦敦布局。', label: '3.c4' },
    points: ['象到 f4，再用 e3、c3 稳固中心。', '固定布局也要观察对方威胁。', '不要机械照搬顺序。'],
    recommended: { explanation: '3.Bf4 是伦敦体系最有代表性的出子。', from: 'c1', label: '3.Bf4', to: 'f4' },
    summary: '提供清晰、稳固的白方发展计划。',
    title: '伦敦体系',
    why: '理解每个棋子的作用，比死记顺序更重要。',
  },
  {
    category: 'openings',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    id: 'opening-sicilian',
    level: '进阶',
    mistake: { explanation: '2.Qh5 过早出后，黑方可用 ...Nf6 发展棋子并追后。', label: '2.Qh5?!' },
    points: ['黑方用 c5 侧面挑战 d4。', '白方常先 Nf3，再走 d4。', '不对称结构让双方计划不同。'],
    recommended: { explanation: '2.Nf3 发展马，并为 d4 做准备。', from: 'g1', label: '2.Nf3', to: 'f3' },
    summary: '黑方对 1.e4 的积极反击。',
    title: '西西里防御',
    why: '黑方不照搬白方中心，而是争取不对称的主动机会。',
  },
  {
    category: 'openings',
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    id: 'opening-french',
    level: '进阶',
    mistake: { explanation: '2.e5 可以下，但立刻关闭中心会减少初学者的选择。', label: '2.e5?!' },
    points: ['黑方用 e6 支持 ...d5。', '白方用 d4 建立双兵中心。', '黑方要设法激活 c8 象。'],
    recommended: { explanation: '2.d4 占据中心，并准备应对 ...d5。', from: 'd2', label: '2.d4', to: 'd4' },
    summary: '用稳固兵链挑战白方中心。',
    title: '法兰西防御',
    why: '兵链会长期决定双方棋子的活动空间。',
  },
  {
    category: 'strategy',
    fen: '4k3/8/8/8/3q4/2N5/8/4K3 w - - 0 1',
    id: 'strategy-piece-safety',
    level: '进阶',
    mistake: { explanation: '1.Kf1? 没处理 c3 马被攻击的问题，下一步可能白白丢马。', label: '1.Kf1?' },
    points: ['对手走完先检查自己的棋子。', '没有保护的棋子很容易丢失。', '可撤退、保护、交换或制造更强威胁。'],
    recommended: { explanation: '1.Nb5 把被攻击的马移到安全格。', from: 'c3', label: '1.Nb5', to: 'b5' },
    summary: '先避免无偿丢子，再考虑进攻。',
    title: '子力安全',
    why: '初学者多数失误来自漏看某个棋子正在被攻击。',
  },
  {
    category: 'strategy',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 4',
    id: 'strategy-king-safety',
    level: '进阶',
    mistake: { explanation: '4.Qe2?! 继续把王留在中央，中心打开后更容易遭到将军。', label: '4.Qe2?!' },
    points: ['中央线路可能很快打开。', '易位同时改善王和车的位置。', '易位后也不要随便推动王前兵。'],
    recommended: { explanation: '4.O-O 让王离开中央并激活 h1 车。', from: 'e1', label: '4.O-O', to: 'g1' },
    summary: '发展完成后，通常应尽快让王离开中央。',
    title: '王的安全',
    why: '中央打开后，未易位的王会让每次将军都很危险。',
  },
  {
    category: 'strategy',
    fen: START_FEN,
    id: 'strategy-center',
    level: '进阶',
    mistake: { explanation: '1.a3?! 没争夺中心，也没有发展棋子。', label: '1.a3?!' },
    points: ['e4、d4、e5、d5 是中心四格。', '控制中心后棋子更容易转向两翼。', '可以占据中心，也可以远程控制。'],
    recommended: { explanation: '1.e4 占据中心，并打开后与 f1 象的线路。', from: 'e2', label: '1.e4', to: 'e4' },
    summary: '中心控制决定棋子能否快速进入战场。',
    title: '中心控制',
    why: '中心棋子通常有更多选择，更容易支援不同方向。',
  },
  {
    category: 'strategy',
    fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
    id: 'strategy-open-file',
    level: '进阶',
    mistake: { explanation: '1.Rb1?! 没利用完全开放的 a 线制造压力。', label: '1.Rb1?!' },
    points: ['没有兵占据的竖线叫开放线。', '车可沿开放线深入对方阵地。', '两车叠在同一线会增加压力。'],
    recommended: { explanation: '1.Ra8+ 沿开放 a 线进入第 8 横线将军。', from: 'a1', label: '1.Ra8+', to: 'a8' },
    summary: '开放线是车最自然的活动道路。',
    title: '开放线',
    why: '车放在被兵堵住的线路后面，很难发挥远距离能力。',
  },
  {
    category: 'strategy',
    fen: '2r3k1/8/8/5N2/8/8/8/4K3 w - - 0 1',
    id: 'strategy-tactics',
    level: '进阶',
    mistake: { explanation: '1.Nh6+? 虽然将军，却没有同时攻击 c8 的车。', label: '1.Nh6+?' },
    points: ['双重攻击是一步威胁两个目标。', '将军必须回应，所以带将军的双攻很强。', '马很适合制造双攻。'],
    recommended: { explanation: '1.Ne7+ 将军，同时攻击 c8 黑车。', from: 'f5', label: '1.Ne7+', to: 'e7' },
    summary: '基础战术的核心是让一步棋产生两个威胁。',
    title: '双重攻击',
    why: '对手通常一次只能处理一个问题。',
  },
  {
    category: 'endgames',
    fen: '8/4k3/8/4K3/4P3/8/8/8 w - - 0 1',
    id: 'endgame-king-pawn',
    level: '进阶',
    mistake: { explanation: '1.e5? 过早推兵会减少调整空间，兵更容易被挡住。', label: '1.e5?' },
    points: ['残局中王要主动。', '用对王争夺关键格。', '先改善王，再决定何时推兵。'],
    recommended: { explanation: '1.Kd5 让白王占据前方关键格。', from: 'e5', label: '1.Kd5', to: 'd5' },
    summary: '胜负常取决于王能否走到兵前面。',
    title: '王兵残局与对王',
    why: '残局中王从需要保护的目标变成重要进攻棋子。',
  },
  {
    category: 'endgames',
    fen: '8/8/4k3/4P3/4K3/8/8/R7 w - - 0 1',
    id: 'endgame-rook-pawn',
    level: '进阶',
    mistake: { explanation: '1.Kd4? 让王离开兵，也没有限制黑王。', label: '1.Kd4?' },
    points: ['车可以从远处把对方王切开。', '自己的王和兵要配合。', '先限制王，再逐步推兵。'],
    recommended: { explanation: '1.Ra6+ 用横向将军迫使黑王离开第 6 横线。', from: 'a1', label: '1.Ra6+', to: 'a6' },
    summary: '先用车限制王，再护送兵前进。',
    title: '基础车兵残局',
    why: '车的远距离能力能为自己的王兵争取时间。',
  },
  {
    category: 'endgames',
    fen: '7k/8/5K2/6Q1/8/8/8/8 w - - 0 1',
    id: 'endgame-queen-mate',
    level: '进阶',
    mistake: { explanation: '1.Qg6? 会逼和：黑王无路可走，但没有被将军。', label: '1.Qg6?' },
    points: ['后先限制敌王。', '自己的王负责保护后。', '最后确认敌王确实被将军。'],
    recommended: { explanation: '1.Qg7# 由白王保护白后，完成将死。', from: 'g5', label: '1.Qg7#', to: 'g7' },
    summary: '后王配合可以把单王压到边线。',
    title: '后王杀单王',
    why: '后不能安全地单独贴近敌王，需要自己的王保护。',
  },
  {
    category: 'endgames',
    fen: '7k/5K2/8/8/8/8/8/R7 w - - 0 1',
    id: 'endgame-rook-mate',
    level: '进阶',
    mistake: { explanation: '1.Ra8+? 只是将军，没有利用白王控制的逃跑格结束对局。', label: '1.Ra8+?' },
    points: ['车负责切断一排或一线。', '自己的王控制相邻逃跑格。', '把敌王赶到边线再将死。'],
    recommended: { explanation: '1.Rh1#：车控制 h 线，白王控制 g8 与 g7。', from: 'a1', label: '1.Rh1#', to: 'h1' },
    summary: '车王配合是最基本的杀王方法之一。',
    title: '车王杀单王',
    why: '车不能控制斜线，所以必须依靠王封住逃跑格。',
  },
];

const ADVANCED_CATEGORIES = new Set<LessonCategory>([
  'openings',
  'strategy',
  'endgames',
]);

export function getLessonsByCategory(
  category: LessonCategory,
): ChessLesson[] {
  return LESSONS.filter((lesson) => lesson.category === category);
}

export function validateLessonCatalog(
  lessons: ChessLesson[] = LESSONS,
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  lessons.forEach((lesson) => {
    if (ids.has(lesson.id)) {
      issues.push(`${lesson.id}: 课程 ID 重复`);
    }
    ids.add(lesson.id);

    let chess: Chess;
    try {
      chess = new Chess(lesson.fen);
    } catch {
      issues.push(`${lesson.id}: FEN 无法读取`);
      return;
    }

    if (lesson.points.length === 0 || !lesson.why.trim()) {
      issues.push(`${lesson.id}: 缺少教学解释`);
    }
    if (
      ADVANCED_CATEGORIES.has(lesson.category) &&
      (!lesson.recommended || !lesson.mistake)
    ) {
      issues.push(`${lesson.id}: 进阶课程缺少推荐走法或错误说明`);
    }

    if (lesson.recommended) {
      const tip = lesson.recommended;
      const legal = chess.moves({ verbose: true }).some(
        (move) =>
          move.from === tip.from &&
          move.to === tip.to &&
          (tip.promotion === undefined ||
            move.promotion === tip.promotion),
      );
      if (!legal) {
        issues.push(`${lesson.id}: 推荐走法不合法`);
      }
    }
  });

  return issues;
}
