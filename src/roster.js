// Portrait order within each team matches its atlas, left to right and top to bottom.
const teams = [
  ['harbor', '港卫', '#ffc177', 'arc', [
    ['棱锚', 'ANCHOR', '重装护航', '沉锚三叠', '铁链破浪', '封港落雷'],
    ['流梭', 'SHUTTLE', '机动突击', '双梭掠影', '弧轨回穿', '光轨折返'],
    ['燧臂', 'SPARKHAND', '重焊护具', '电花连锤', '焊弧追打', '熔栓合击'],
    ['兰舵', 'HELMSMAN', '长衣近卫', '偏舵绞击', '过舷飞步', '逆帆断潮'],
    ['紫绷', 'VIOLET WRAP', '护臂格斗', '脉冲三拍', '急救反突', '夜港静电'],
    ['潜钟', 'BELL DIVER', '深潜重甲', '闷钟双震', '海床推浪', '沉钟共振'],
    ['铜扳', 'BRASS WRENCH', '近身压制', '铜齿咬合', '扳轮斗步', '超转乱流'],
    ['旗裁', 'SIGNAL CUT', '披风反制', '折旗回刺', '夜令穿行', '落幕红庭'],
    ['银绳', 'SILVER LINE', '轻装攀援', '绳环三扣', '飞扣越舷', '救援极索'],
    ['沧骨', 'BATHYAL', '潜航外骨骼', '沧骨开潮', '潜桥穿阵', '千尺水压'],
  ]],
  ['ember', '炉焰', '#ff8267', 'flare', [
    ['绯辫', 'RUBY BRAID', '铜甲拳手', '绯炉弹舌', '赤轨逐日', '三火烙印'],
    ['灶铠', 'KILN WARD', '重炉守卫', '炉门叩响', '铁炭冲城', '金灶崩流'],
    ['灰舞', 'ASH WALTZ', '飘步旋击', '烬花低旋', '白灰卷身', '未熄余烬'],
    ['焙轮', 'KILN WHEEL', '背负熔炉', '侧炉三撞', '炭轮滚压', '闭炉震陨'],
    ['赤盔', 'RED VISOR', '钢厂重击', '铆火敲门', '灯下追炉', '铁盔化阳'],
    ['烟信', 'SOOT COURIER', '烟幕游击', '黑烟短打', '窑道错纵', '火票封缄'],
    ['栗锻', 'CHESTNUT', '手锻刚拳', '栗炭挑肩', '翻砧跨步', '汗火浇铜'],
    ['鳞烛', 'SCALE WICK', '热鳞探路', '烛浪拨鳞', '热路折脊', '烛阵砍风'],
    ['铸酒', 'MOLTEN CASK', '熔造监工', '酒红点炉', '熔溪压境', '铸火裁决'],
    ['铜目', 'COPPER EYE', '老练火工', '双目灼击', '铜环追闪', '机匣回燃'],
  ]],
  ['tide', '潮汐', '#65d9ff', 'wave', [
    ['蓝井', 'BLUE WELL', '深井潜员', '井蓝拍岸', '角鲨上浮', '海压封井'],
    ['瑚绡', 'CORAL SILK', '分衫决斗', '红珊点潮', '绡浪穿簇', '群礁裂鸣'],
    ['跃涌', 'SURF PILOT', '冲浪机师', '浪尖三点', '踏涌破空', '百帆回潮'],
    ['珠幔', 'PEARL VEIL', '薄甲卸力', '珠帘柔击', '满月覆水', '珠落千波'],
    ['湛帆', 'DEEP SAIL', '远航船长', '展帆连擒', '弓桅穿舱', '深蓝锚崩'],
    ['凝水', 'ICE SKIM', '贴地疾行', '浮冰碎点', '白瀑滑身', '凝海封径'],
    ['藻岸', 'KELP COAT', '长衣近打', '碧藻弯勾', '森潮倒卷', '长岸拦鲸'],
    ['涡鳍', 'TURBINE FIN', '短鳍连击', '鳍拍三涡', '逆鳍踏潮', '螺线破舱'],
    ['玫湾', 'ROSE BAY', '打捞竞速', '湾湾三响', '朝红破浪', '珠辉路标'],
    ['岩礁', 'REEF LAMP', '礁群测绘', '礁灯静撞', '斜流越脊', '群岛接力'],
  ]],
  ['storm', '霆云', '#a69cff', 'bolt', [
    ['紫飓', 'VIOLET GALE', '风衣突关', '飓压寸肘', '卷云跨步', '紫风席卷'],
    ['黄跃', 'YELLOW LEAP', '极速腿法', '金跃双踢', '雷靴扫风', '万级落踏'],
    ['衡圈', 'GROUND COIL', '接地翼衣', '偏振触拳', '落地跳弧', '回路闭合'],
    ['青脉', 'CYAN PULSE', '跳闪快打', '折线连指', '跨脉迁移', '风暴余压'],
    ['追霆', 'STORM CHASER', '绝缘格挡', '霆衣逆震', '追云断喉', '双相崩伏'],
    ['梅棱', 'PLUM FACET', '棱面掌法', '梅风切法', '弯轨飞棱', '六面起雷'],
    ['絮电', 'PALE STATIC', '静电工程', '云絮轻拍', '乱序跃升', '雪相电池'],
    ['赤风', 'RED RIGGER', '架线劲拳', '赤索缠腕', '上架背追', '红线坠地'],
    ['钴站', 'RELAY WARD', '中继盾拳', '钴护连盘', '换站直通', '夜站并网'],
    ['听针', 'AERIAL PIN', '轻翼空翻', '针尖振翅', '银针穿云', '听天裂帘'],
  ]],
  ['thorn', '花棘', '#a9ec80', 'bloom', [
    ['叶巡', 'LEAF WATCH', '林间截击', '潜叶折枝', '叶隙抢位', '巡界扬林'],
    ['血蔷', 'CRIMSON BRIAR', '刺腕压制', '蔷刃绕指', '攀架飞刺', '红园闭幕'],
    ['椒园', 'PEPPER GREEN', '重垫园丁', '椒槌连鞭', '轰棚拖枝', '热土暴长'],
    ['草阱', 'REED TRAP', '苇甲轻足', '折苇设阱', '草间斜跑', '千针围猎'],
    ['兰面', 'ORCHID MASK', '短袍舞者', '兰拈续捶', '轻兰滑窗', '夜兰盛开'],
    ['藤巢', 'VINE NEST', '攀藤游击', '细藤三绕', '掠高潜根', '层巢坠落'],
    ['翠药', 'MOSS MEDIC', '长衫医师', '药臼双敲', '苔地回诊', '青方封经'],
    ['麴甲', 'RUST HARVEST', '苔铁收割', '苔甲啮合', '铁镰扫禾', '曲种崩壳'],
    ['解蜜', 'AMBER DRAUGHT', '琥珀制剂', '蜜腔短封', '解毒绕柱', '琥珀空灌'],
    ['玉袖', 'JADE SLEEVE', '散袖柔术', '双袖回漩', '玉步潜芽', '玉兰裂窗'],
  ]],
  ['glass', '晶棱', '#86fff0', 'prism', [
    ['镜冠', 'MIRROR CROWN', '镜盾反制', '反光三折', '镜门滑步', '冠镜分解'],
    ['钴袵', 'COBALT COLLAR', '高领震掌', '领口回弹', '钴峰压线', '蓝晶复相'],
    ['灰晶', 'SMOKE QUARTZ', '重肩撞击', '灰壳硬切', '石英轰肩', '岩晶受压'],
    ['绯盾', 'PINK SHARD', '力场拳手', '绯膜斩落', '红晶投身', '盾心解体'],
    ['玄棱', 'INDIGO PRISM', '旋转斗篷', '玄披错位', '纵棱换面', '折光深井'],
    ['绿凿', 'EMERALD CHISEL', '晶矿工拳', '绿凿透缝', '矿道猛钻', '晶层破心'],
    ['幽雕', 'LILAC CHISEL', '软步刻刀', '雕影回身', '紫晶掠痕', '一线切玉'],
    ['水像', 'AQUA DOUBLE', '镜像幻步', '浅像回打', '映水错身', '万面归一'],
    ['赤辉', 'RUBY REFLEX', '踢拳强攻', '红辉扫腿', '赤光斜出', '晶核过载'],
    ['粉金', 'ROSE ALLOY', '双臂强守', '金粉点震', '披玫撞门', '金枝落盘'],
  ]],
  ['ink', '夜墨', '#db9cf1', 'ink', [
    ['墨砚', 'INKSTONE', '长衣截拳', '湿墨落笔', '砚边凌步', '干笔万划'],
    ['素画', 'PAPER LIGHT', '轻拳写意', '纸心三皱', '笔锋穿渡', '露白飞画'],
    ['靛递', 'INDIGO RUN', '暗巷穿梭', '靛影过幕', '夜递转角', '收件无光'],
    ['霓壁', 'NEON MURAL', '织袖重打', '高墙三印', '抬漆冲门', '落虹泼墨'],
    ['乌毫', 'DARK BRUSH', '粗毫拳套', '乌毫连诀', '刷地拔根', '一笔乱山'],
    ['网印', 'SCREEN BLUE', '丝网腕术', '格纹蓝击', '印口穿低', '复印千层'],
    ['米衫', 'RICE CANVAS', '宽袖拆招', '藏袖点肩', '白布拖影', '旧卷断寸'],
    ['炭像', 'CHARCOAL', '色粉飞步', '炭枝敲线', '素描追垂', '青影立墙'],
    ['巷戏', 'ALLEY ACT', '补丁拳手', '街灯双转', '巷外飞脚', '橘灯谢幕'],
    ['刺镜', 'NEEDLE LENS', '精准腕击', '镜纹四刺', '纹路偏移', '紫针束缚'],
  ]],
  ['sand', '沙旅', '#ffcd83', 'dust', [
    ['赭行', 'OCHRE TREK', '远行斗篷', '赭风垂踢', '沙尘滑斩', '行路崩丘'],
    ['岩驼', 'STONE CARAVAN', '车队推盾', '岩驼三顶', '沙墙开道', '石脊贯空'],
    ['绿泽', 'OASIS HERB', '荒漠近医', '绿药飞手', '逐草穿沙', '清旱开渠'],
    ['陶暮', 'TERRA DUSK', '长袍腿法', '土陶低扫', '暮鸢抬膝', '红陶飞散'],
    ['夜砂', 'NIGHT DUNE', '沙夜斥候', '沙夜点将', '荒地跃界', '目镜染沙'],
    ['蜂照', 'HONEY SOL', '锋步冲拳', '蜂照三疾', '黄风赶日', '刺阳爆身'],
    ['烟绫', 'SMOKE SILK', '救援截步', '烟线打扣', '斜阳背走', '绫罗救星'],
    ['白荫', 'SUN SHADE', '白衣工程', '白荫曲拳', '蓝臂越流', '烈日投影'],
    ['弯铜', 'BRONZE BEND', '铜胫踢拳', '弯铜斜鞭', '浑沙踢门', '荒脊裂轮'],
    ['曜卫', 'SOLAR WARD', '赤甲禁卫', '曜盘平铲', '守日冲阵', '飞阳坠关'],
  ]],
  ['forge', '机工', '#9fc8ff', 'gear', [
    ['磁砧', 'MAG ANVIL', '磁力重装', '三极磁锇', '逆极推身', '砧盘坍落'],
    ['玫匠', 'ROSE SETTER', '精巧格技', '镶玫连钻', '珠扣越界', '戒面全开'],
    ['铆航', 'SHIP RIVET', '造船重拳', '铆船敲档', '入坞推轨', '船肋合模'],
    ['轻铝', 'LIGHT ALLOY', '分节轻甲', '轻铝连旋', '越梁落膝', '铝翼回折'],
    ['锻辫', 'FORGE BEARD', '炉锻掌击', '辫火三锻', '翻铁靠肩', '黑锻重锤'],
    ['格频', 'BRASS GRID', '精密走线', '格频短振', '回路疾冲', '频纹导流'],
    ['钢钳', 'STEEL CLAMP', '双钳摔打', '推钳三齿', '钢索收身', '大钳翻倒'],
    ['银簧', 'SILVER SPRING', '薄片疾行', '银簧反弹', '护板侧奔', '压缩极放'],
    ['灶钴', 'COBALT COOK', '耐热近身', '锅铲回打', '煽风起灶', '钴厨生火'],
    ['阀赤', 'VALVE RED', '铜阀腕击', '铜阀弹开', '压差冲波', '阀门断控'],
  ]],
  ['echo', '回声', '#ff9fe0', 'note', [
    ['汐弦', 'TIDAL STRING', '高领弦手', '汐弦拨击', '分弦掠身', '万弦齐鸣'],
    ['混响', 'ROOM TONE', '打击调音', '混响三点', '拾音追步', '回室爆鸣'],
    ['鼓垫', 'PAD DRUM', '肩垫鼓拍', '边鼓三砸', '鼓垫突盆', '反拍落轰'],
    ['银幕', 'SILVER STAGE', '银纱快拳', '银帘三起', '白纱飞头', '收幕银弧'],
    ['绿调', 'GREEN TEMPO', '曲调反制', '旋调敲拨', '对位归拍', '绿调结句'],
    ['霓步', 'NEON STEP', '快步舞手', '霓步双旋', '偏拍抢位', '飞步响场'],
    ['白腔', 'IVORY VOICE', '声压近拳', '白声三震', '高腔穿台', '唱盘过载'],
    ['蓝绒', 'VELVET TONE', '台口技匠', '绒布拨弦', '上品滑音', '旧琴裂奏'],
    ['黄听', 'YELLOW LISTEN', '重靴测音', '黄线逐拍', '直耳跨台', '响度极限'],
    ['赤掌灯', 'RED SPOTLIGHT', '舞台总领', '镜灯三闪', '导光追影', '封场落灯'],
  ]],
];

export const TEAMS = teams.map(([id, name, color, effect]) => ({ id, name, color, effect }));
const patterns = [
  [
    ['jab', 'hook', 'cleave'], ['cross', 'jab', 'drop'], ['hook', 'lift', 'cleave'],
    ['jab', 'cross', 'hook'], ['lift', 'jab', 'drop'],
  ],
  [
    ['rush', 'lift', 'drop'], ['cross', 'rush', 'cleave'], ['rush', 'hook', 'drop'],
    ['lift', 'cross', 'cleave'], ['rush', 'jab', 'cross'],
  ],
  [
    ['pulse', 'cross', 'burst'], ['pulse', 'lift', 'burst'], ['cross', 'pulse', 'burst'],
    ['drop', 'pulse', 'burst'], ['pulse', 'hook', 'burst'],
  ],
];
const shortDescriptions = ['近身 · 快速多段', '追击 · 跨步压近', '终结 · 消耗能量'];

function signature(name, slot, team, member, theme) {
  const variant = (team * 3 + member * 7 + slot) % 10;
  const pattern = patterns[slot][(variant + team + member * (slot + 1)) % 5];
  const strikeCount = [3 + variant % 2, 3 + variant % 3, 4 + variant % 3][slot];
  const stride = 6 + (member + slot * 2) % 6;
  const start = [7 + variant % 4, 13 + variant % 4, 16 + variant % 5][slot];
  const steps = Array.from({ length: strikeCount }, (_, hit) => {
    const last = hit === strikeCount - 1;
    return {
      at: start + stride * hit,
      kind: pattern[last ? 2 : hit % 2],
      damage: (slot === 2 ? 4 : slot + 3) + (last ? 4 + (member + team) % 4 : 0),
      push: last ? [39, 62, 81][slot] + variant : 9 + (variant + hit) % 6,
    };
  });
  return {
    name, description: shortDescriptions[slot], slot, effect: theme, steps,
    end: steps.at(-1).at + 18 + (slot * 2 + member) % 7,
    reach: [139 + variant * 3, 161 + variant * 2, 219 + variant * 9][slot],
    drive: [1 + variant * 0.18, 24 + member * 0.65, 9 + (member + team) % 7][slot],
    cost: slot === 2 ? 32 + (team + member) % 7 : 0,
    pitch: 108 + team * 18 + member * 4 + slot * 34,
  };
}

export const ROSTER = teams.flatMap(([team, family, color, effect, members], group) =>
  members.map(([name, roman, style, ...moves], index) => ({
    id: team + '-' + roman.toLowerCase().replaceAll(' ', '-'),
    name, roman, style, team, family, color: team === 'harbor' && index === 1 ? '#64eddd' : color, effect, index,
    speed: group === 0 && index < 2 ? [3.5, 4.25][index] : 3.35 + (index * 3 + group) % 12 * 0.095,
    weight: group === 0 && index === 0 ? 1.14 : 0.97 + (index + group * 3) % 9 * 0.019,
    reach: group === 0 && index === 0 ? 14 : (index * 2 + group) % 8 * 2,
    signatures: moves.map((move, slot) => signature(move, slot, group, index, effect)),
  })),
);

export const DEFAULT_ROSTER = ['harbor-anchor', 'harbor-shuttle'];
const byId = new Map(ROSTER.map(character => [character.id, character]));
export const findFighter = id => byId.get(id);
