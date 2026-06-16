type SttMisheardRule = {
  target: string;
  heardAs: string[];
};

const PARTICLES = [
  "인가요", "이에요", "예요", "이야", "이냐", "은가", "가요",
  "이라", "라고", "이랑", "으로", "에서", "에게", "한테", "부터", "까지", "처럼", "보다",
  "은", "는", "이", "가", "을", "를", "에", "와", "과", "로", "도", "만", "랑", "야", "냐", "요",
];

// 정상 야구 표현/축약어가 아니라, STT가 발음을 잘못 받아쓴 후보만 넣는다.
const MISHEARD_RULES: SttMisheardRule[] = [
  {
    target: "볼넷",
    heardAs: [
      "플렛", "플랫", "플렡", "플냇", "플넷", "플렛트", "플래트",
      "폴렛", "폴랫", "폴냇", "폴넷",
      "포렛", "포랫", "포냇", "포넷",
      "볼렛", "볼냇", "볼넽", "본넷", "보넷", "벌넷", "벌렛",
    ],
  },
  {
    target: "도루",
    heardAs: ["보루", "보로", "보료", "보르", "도로", "도르", "도료", "돌루", "돌우", "토루", "토로", "토르"],
  },
  {
    target: "도루자",
    heardAs: ["보루자", "보로자", "도로자", "도르자", "토루자", "토로자"],
  },
  {
    target: "스트라이크",
    heardAs: [
      "스트라익", "스트라잌", "스트라이끼", "스트라이키", "스트라이끄",
      "스트레익", "스트레잌", "스토라이크", "스토라익", "스투라이크",
    ],
  },
  {
    target: "보크",
    heardAs: ["보그", "보끄", "포크", "포끄", "보쿠", "보크으"],
  },
  {
    target: "폭투",
    heardAs: ["복투", "폭토", "폭트", "포투", "포토", "폭뜨", "복뜨"],
  },
  {
    target: "포일",
    heardAs: ["포이", "포일드", "포일트", "포익", "포얼", "포엘"],
  },
  {
    target: "병살",
    heardAs: ["병설", "병사", "병사리", "병서리", "병쌀"],
  },
  {
    target: "병살타",
    heardAs: ["병설타", "병사타", "병사리타", "병서리타", "병쌀타"],
  },
  {
    target: "더블플레이",
    heardAs: ["더블프레이", "더블프레", "더블플레", "더블프래이", "더블프래"],
  },
  {
    target: "견제",
    heardAs: ["견재", "견재구", "견제고", "견제구우", "견재고", "견재구우"],
  },
  {
    target: "태그업",
    heardAs: ["테그업", "택업", "태겁", "테겁"],
  },
  {
    target: "태그아웃",
    heardAs: ["테그아웃", "태가웃", "택아웃", "테가웃"],
  },
  {
    target: "리터치",
    heardAs: ["리터취", "리터치이", "리터치가", "리터츠", "리터치으"],
  },
  {
    target: "포스아웃",
    heardAs: ["포스아웃트", "포사웃", "포스아우", "포스아웅", "포스아웃으"],
  },
  {
    target: "사구",
    heardAs: ["사국", "사고", "사그", "사구우", "싸구"],
  },
  {
    target: "데드볼",
    heardAs: ["대드볼", "데드보", "데드벌", "대드벌", "데드볼르"],
  },
  {
    target: "몸에 맞는 공",
    heardAs: ["몸마즌공", "몸마는공", "몸맞는궁", "몸맞는곰", "몸마즌볼", "몸마는볼"],
  },
  {
    target: "번트",
    heardAs: ["번뜨", "버트", "번트으", "번트가"],
  },
  {
    target: "희생번트",
    heardAs: ["희생번뜨", "희생버트", "희생번트으", "희생번트가"],
  },
  {
    target: "희생플라이",
    heardAs: ["희생프라이", "희생플레", "희생플라이이", "희생플라이가"],
  },
  {
    target: "스퀴즈번트",
    heardAs: ["스퀴즈버트", "스퀴즈번뜨", "스퀴즈번트으", "스퀴즈번트가"],
  },
  {
    target: "히트앤런",
    heardAs: ["힛앤런", "히튼런", "히트앤넌", "히트앤렁"],
  },
  {
    target: "런앤히트",
    heardAs: ["런앤힛", "런앤히뜨", "런앤히트으"],
  },
  {
    target: "2루타",
    heardAs: ["이루타", "이르타", "투루타", "투르타", "이루타아"],
  },
  {
    target: "3루타",
    heardAs: ["삼누타", "삼르타", "쓰리루타", "쓰리르타", "삼루타아"],
  },
  {
    target: "홈런",
    heardAs: ["홈넌", "홈런느", "홈런가", "홈넌느"],
  },
  {
    target: "만루홈런",
    heardAs: ["만루홈넌", "만루홈런느", "만루홈넌느"],
  },
  {
    target: "타율",
    heardAs: ["타유리", "타유", "타율르", "타율루"],
  },
  {
    target: "출루율",
    heardAs: ["출누율", "출루률", "출루유리", "출루유", "출루율르"],
  },
  {
    target: "장타율",
    heardAs: ["장타률", "장타유리", "장타유", "장타율르"],
  },
  {
    target: "OPS",
    heardAs: ["오피애스", "오피쓰", "오피에쓰", "오피에스", "오피스"],
  },
  {
    target: "ERA",
    heardAs: ["이라에이", "이알애이", "이알에이", "이라 애이"],
  },
  {
    target: "WHIP",
    heardAs: ["윕", "휩프", "휩", "위프"],
  },
  {
    target: "평균자책점",
    heardAs: ["평균자첵", "평군자책", "평자첵", "평자책", "평균자책쩜"],
  },
  {
    target: "자책점",
    heardAs: ["자첵", "자책쩜", "자책점므", "자책저미"],
  },
  {
    target: "세이브",
    heardAs: ["세입", "세이부", "세이브으", "세이브가"],
  },
  {
    target: "홀드",
    heardAs: ["홀더", "홀뜨", "홀드으", "홀드가"],
  },
  {
    target: "블론세이브",
    heardAs: ["블론세입", "블로운세입", "블론세이부", "블론세이브으"],
  },
  {
    target: "실책",
    heardAs: ["실첵", "실책으", "애러", "에러"],
  },
  {
    target: "타점",
    heardAs: ["타저미", "타점므", "타점이"],
  },
  {
    target: "득점",
    heardAs: ["득저미", "득점므", "득점이"],
  },
  {
    target: "승률",
    heardAs: ["승유리", "승률르", "승률루"],
  },
  {
    target: "SSG",
    heardAs: ["애스애스지", "에세지", "에쓱지", "에스쥐", "에쓰에쓰지"],
  },
  {
    target: "KIA",
    heardAs: ["키아", "키야", "카이아", "케아이에이", "케이아"],
  },
  {
    target: "LG",
    heardAs: ["엘쥐", "앨지", "앨쥐", "엘쥐이"],
  },
  {
    target: "KT",
    heardAs: ["케티", "케디", "케이디", "케이티이"],
  },
  {
    target: "NC",
    heardAs: ["앤씨", "앤시", "엔시이", "엔씨이"],
  },
  {
    target: "두산",
    heardAs: ["투산"],
  },
  {
    target: "롯데",
    heardAs: ["롯대", "로떼", "롯떼"],
  },
  {
    target: "삼성",
    heardAs: ["삼송"],
  },
  {
    target: "한화",
    heardAs: ["한와", "환화", "한하"],
  },
];

const PARTICLE_PATTERN = PARTICLES.map(escapeRegExp).join("|");
const LEFT_BOUNDARY = "(^|[^가-힣A-Za-z0-9])";
const RIGHT_BOUNDARY = "(?=$|[^가-힣A-Za-z0-9])";

function isTargetWithParticle(value: string, target: string) {
  if (!value.startsWith(target) || value === target) return false;
  const suffix = value.slice(target.length);
  return PARTICLES.includes(suffix);
}

const RULES = MISHEARD_RULES.map((rule) => ({
  ...rule,
  heardAs: [...rule.heardAs]
    .filter((heardAs) => !isTargetWithParticle(heardAs, rule.target))
    .sort((a, b) => b.length - a.length),
}));

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceHeardAs(text: string, heardAs: string, target: string) {
  const pattern = new RegExp(`${LEFT_BOUNDARY}(${escapeRegExp(heardAs)})(?:(${PARTICLE_PATTERN}))?${RIGHT_BOUNDARY}`, "gi");
  return text.replace(pattern, (_full, prefix: string, _matched: string, particle = "") => `${prefix}${target}${particle}`);
}

export function normalizeBaseballSttText(raw: string) {
  let normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return normalized;

  for (const rule of RULES) {
    for (const heardAs of rule.heardAs) {
      normalized = replaceHeardAs(normalized, heardAs, rule.target);
    }
  }

  return normalized;
}