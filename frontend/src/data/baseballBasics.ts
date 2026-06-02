export const basics = [
  { title: "그라운드", src: "img/그라운드.png" },
  { title: "볼카운트", src: "img/볼카운트.png" },
  { title: "스트라이크존", src: "img/스트라이크존.png" },
  { title: "아웃세이프", src: "img/아웃세이프.png" },
  { title: "잠실구장", src: "img/잠실구장.png" },
  { title: "진루순서", src: "img/진루순서.png" },
  { title: "포수진영", src: "img/포수진영.png" },
].sort((a, b) => a.title.localeCompare(b.title, "ko"));

export const fallbackAnswers = [
  {
    keyword: "스트라이크",
    answer:
      "스트라이크는 타자가 칠 수 있는 공이 스트라이크존을 지나갔거나, 타자가 헛스윙했을 때 올라가요. 스트라이크 3개가 되면 삼진 아웃입니다.",
  },
  {
    keyword: "볼넷",
    answer:
      "볼넷은 투수가 스트라이크존 밖으로 던진 공이 4개가 되었을 때 타자가 1루로 나가는 상황이에요.",
  },
  {
    keyword: "아웃",
    answer:
      "아웃은 공격 팀 선수가 플레이에서 물러나는 판정이에요. 한 이닝에서 아웃 3개가 되면 공격과 수비가 바뀝니다.",
  },
  {
    keyword: "진루",
    answer:
      "진루는 주자가 1루, 2루, 3루, 홈 방향으로 이동하는 것을 말해요. 홈까지 들어오면 1점을 얻습니다.",
  },
];
