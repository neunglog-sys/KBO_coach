import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getTargetWeights, type MouthShape } from "../lipSync";

interface Character3DProps {
  /** 말하는 중이면 입을 움직인다. */
  isSpeaking: boolean;
  /** 값이 바뀔 때마다(증가) 인사(손 흔들기) 모션을 1회 재생한다. */
  greetSignal?: number;
  /** 값이 바뀔 때마다(증가) 잠깐 뛰는(빠른 걷기) 모션을 재생한다. */
  runSignal?: number;
  /** 값이 바뀔 때마다(증가) 던지기(throw) 모션을 1회 재생한다. */
  throwSignal?: number;
  /** 값이 바뀔 때마다(증가) 배트 스윙(swing) 모션을 1회 재생한다. */
  swingSignal?: number;
  /** 응원팀 코드(HT 등). 팀별 유니폼 색/로고 스킨 적용. 바뀌면 즉시 갱신. */
  teamCode?: string;
  className?: string;
  onReady?: () => void;
}

/** 팀별 유니폼 색(헥사=sRGB 디자인값)·로고 스킨. 코드 없거나 미정의 팀은 모델 기본값 유지. */
type TeamSkin = {
  materials: Record<string, string>;
  marking: string;
  logo: string;
};

const texturePath = (folder: "logo" | "marking", file: string) => `/img/${folder}/${file}`;

const TEAM_SKINS: Record<string, TeamSkin> = {
  HH: {
    materials: {
      M_uniform_main: "#FC4E00FF",
      M_uniform_st: "#FFFFFFFF",
      M_uniform_arm: "#FC4E00FF",
      M_uniform_arm_st: "#FFFFFFFF",
      M_hat: "#FC4E00FF",
      M_hat_brim: "#FC4E00FF",
      M_hat_tours: "#FC4E00FF",
      M_hat_button: "#FC4E00FF",
    },
    marking: texturePath("marking", "HH.png"),
    logo: texturePath("logo", "deajeon.png"),
  },
  HT: {
    materials: {
      M_uniform_main: "#E10822FF",
      M_uniform_st: "#000000FF",
      M_uniform_arm: "#E10822FF",
      M_uniform_arm_st: "#000000FF",
      M_uniform_button: "#E10822FF",
      M_hat: "#E10822FF",
      M_hat_brim: "#E10822FF",
      M_hat_tours: "#E10822FF",
      M_hat_button: "#E10822FF",
    },
    marking: texturePath("marking", "KIA.png"),
    logo: texturePath("logo", "gwangju.png"),
  },
  OB: {
    materials: {
      M_uniform_main: "#010036FF",
      M_uniform_st: "#FFFFFFFF",
      M_uniform_arm: "#010036FF",
      M_uniform_arm_st: "#FFFFFFFF",
      M_uniform_button: "#FFFFFFFF",
      M_hat: "#010036FF",
      M_hat_brim: "#010036FF",
      M_hat_tours: "#FFFFFFFF",
      M_hat_button: "#FFFFFFFF",
    },
    marking: texturePath("marking", "DS.png"),
    logo: texturePath("logo", "dosan.png"),
  },
  WO: {
    materials: {
      M_uniform_main: "#820024FF",
      M_uniform_st: "#F145ACFF",
      M_uniform_arm: "#820024FF",
      M_uniform_arm_st: "#F145ACFF",
      M_uniform_button: "#820024FF",
      M_hat: "#820024FF",
      M_hat_brim: "#820024FF",
      M_hat_tours: "#F145ACFF",
      M_hat_button: "#820024FF",
    },
    marking: texturePath("marking", "KH.png"),
    logo: texturePath("logo", "heroes.png"),
  },
  LT: {
    materials: {
      M_uniform_main: "#60B1E4FF",
      M_uniform_st: "#D20C30FF",
      M_uniform_arm: "#60B1E4FF",
      M_uniform_arm_st: "#D20C30FF",
      M_uniform_button: "#D20C30FF",
      M_hat: "#60B1E4FF",
      M_hat_brim: "#D20C30FF",
      M_hat_tours: "#D20C30FF",
      M_hat_button: "#60B1E4FF",
    },
    marking: texturePath("marking", "LT.png"),
    logo: texturePath("logo", "busan.png"),
  },
  NC: {
    materials: {
      M_uniform_main: "#18375EFF",
      M_uniform_st: "#A77A4EFF",
      M_uniform_arm: "#18375EFF",
      M_uniform_arm_st: "#A77A4EFF",
      M_uniform_button: "#18375EFF",
      M_hat: "#18375EFF",
      M_hat_brim: "#A77A4EFF",
      M_hat_tours: "#A77A4EFF",
      M_hat_button: "#18375EFF",
    },
    marking: texturePath("marking", "NC.png"),
    logo: texturePath("logo", "changwon.png"),
  },
  SS: {
    materials: {
      M_uniform_main: "#005FA7FF",
      M_uniform_st: "#9F9CA0FF",
      M_uniform_arm: "#005FA7FF",
      M_uniform_arm_st: "#9F9CA0FF",
      M_uniform_button: "#005FA7FF",
      M_hat: "#005FA7FF",
      M_hat_brim: "#005FA7FF",
      M_hat_tours: "#005FA7FF",
      M_hat_button: "#005FA7FF",
    },
    marking: texturePath("marking", "SS.png"),
    logo: texturePath("logo", "daegu.png"),
  },
  KT: {
    materials: {
      M_uniform_main: "#221E1FFF",
      M_uniform_st: "#ED1B23FF",
      M_uniform_arm: "#221E1FFF",
      M_uniform_arm_st: "#ED1B23FF",
      M_uniform_button: "#ED1B23FF",
      M_hat: "#221E1FFF",
      M_hat_brim: "#ED1B23FF",
      M_hat_tours: "#ED1B23FF",
      M_hat_button: "#ED1B23FF",
    },
    marking: texturePath("marking", "KT.png"),
    logo: texturePath("logo", "suwon.png"),
  },
  SK: {
    materials: {
      M_uniform_main: "#C80021FF",
      M_uniform_st: "#DA9A11FF",
      M_uniform_arm: "#C80021FF",
      M_uniform_arm_st: "#DA9A11FF",
      M_uniform_button: "#C80021FF",
      M_hat: "#C80021FF",
      M_hat_brim: "#DA9A11FF",
      M_hat_tours: "#DA9A11FF",
      M_hat_button: "#C80021FF",
    },
    marking: texturePath("marking", "SSG.png"),
    logo: texturePath("logo", "incheon.png"),
  },
  LG: {
    materials: {
      M_uniform_main: "#FFFFFFFF",
      M_uniform_st: "#BE0737FF",
      M_uniform_arm: "#FFFFFFFF",
      M_uniform_arm_st: "#BE0737FF",
      M_uniform_button: "#BE0737FF",
      M_hat: "#000000FF",
      M_hat_brim: "#BE0737FF",
      M_hat_tours: "#BE0737FF",
      M_hat_button: "#BE0737FF",
    },
    marking: texturePath("marking", "TW.png"),
    logo: texturePath("logo", "lg.png"),
  },
};
// 유니폼 본판 / 스티치(보조) 머티리얼 이름 (모델 머티리얼명과 일치)
const SKIN_TEXTURE_MATS: Record<"marking" | "logo", string> = {
  marking: "M_marking",
  logo: "M_logo",
};

const MODEL_VERSION = "260615-opt-20260615";
const MODEL_URL = `/model/3d/260615_opt.glb?v=${MODEL_VERSION}`;
const FRONT_ROTATION_DEG = 0; // 모델 정면(+Z) 기준 회전 보정.
const MOUTH_INTERVAL_MS = 200; // (구형 모델용) 입 여닫는 주기
const MOTION_NAME = "hi"; // 인사(손 흔들기) 클립 — 인사 시 1회 재생
const WALK_NAME = "walk"; // 걷기 클립 — 기본 루프(항상 재생)
const THROW_NAME = "throw"; // 던지기 클립 — throwSignal 시 1회 재생
const SWING_NAME = "swing"; // 배트 스윙 클립 — swingSignal 시 1회 재생
const MOUTH_LERP = 0.4; // 입모양 보간 속도(0~1, 클수록 빠름)
const IDLE_SMILE = 0.0; // 말 안 할 때 기본 미소 정도(0=다문 입). 필요하면 0.3 등으로.
const MOUTH_SHAPES: MouthShape[] = ["smile", "A", "E", "I", "O", "W"];
const MODEL_FRAME_HEIGHT = 2.3;
const MODEL_VERTICAL_OFFSET = 0.08;
const RUN_MS = 3500;        // 한 번 트리거 시 걷기/뛰기 지속 시간
const RUN_SPEED = 1.7;      // 재생 속도 배수(1=걷기, >1=뛰기 느낌)
// 터치 드래그 회전: 캔버스 가로폭의 이 비율만큼 끌면 360° 회전(작을수록 민감).
const DRAG_TURN_RATIO = 0.6;
// 손을 떼면 정면으로 되돌아가는 보간 속도(0~1, 클수록 빠름).
const ROTATE_RETURN_LERP = 0.18;

export default function Character3D({ isSpeaking, greetSignal, runSignal, throwSignal, swingSignal, teamCode, className, onReady }: Character3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  // 애니메이션 루프가 항상 최신 isSpeaking 값을 읽도록 ref로 보관
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;
  // 모델 로드 후 채워지는 "팀 스킨 적용" 함수. teamCode 변화 시 호출(모델 재로드 없이 색/로고만 갱신).
  const applySkinRef = useRef<((code?: string) => void) | null>(null);
  // 로드 콜백이 항상 최신 teamCode를 읽도록 ref로 보관
  const teamCodeRef = useRef(teamCode);
  teamCodeRef.current = teamCode;
  // 모델 로드 후 채워지는 "인사 모션 재생" 함수. 외부 greetSignal 변화 시 호출.
  const greetRef = useRef<(() => void) | null>(null);
  // 모델 로드 후 채워지는 "뛰기(빠른 걷기) 트리거" 함수. runSignal 변화 시 호출.
  const runRef = useRef<(() => void) | null>(null);
  // 모델 로드 후 채워지는 "던지기 모션 재생" 함수. throwSignal 변화 시 호출.
  const throwRef = useRef<(() => void) | null>(null);
  // 모델 로드 후 채워지는 "배트 스윙 모션 재생" 함수. swingSignal 변화 시 호출.
  const swingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 400;
    let height = mount.clientHeight || 400;
    let disposed = false;
    let notifiedReady = false;

    const scene = new THREE.Scene(); // 배경 투명 (alpha)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(0, 0.4, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 고DPI에서 픽셀 수 과다 → GPU 절약
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // 톤매핑 + 노출: 칙칙함 줄이고 밝고 자연스러운 색감으로.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    // 환경맵: PBR 재질에 부드러운 반사광을 줘서 입체감/광택을 살린다. (칙칙함 해소 핵심)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    // 위쪽 하늘색 / 아래쪽 바닥색 그라데이션 조명 → 자연스러운 음영.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c4d0, 0.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);
    // 뒤쪽 림라이트: 윤곽을 살짝 띄워 배경과 분리.
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    const root = new THREE.Group();
    root.rotation.y = THREE.MathUtils.degToRad(FRONT_ROTATION_DEG);
    scene.add(root);

    let mouseBasic: THREE.Object3D | null = null;
    let mouseHalf: THREE.Object3D | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let introRunning = false;       // 인트로 모션 재생 중에만 렌더
    let idleLooping = false;        // 걷기 루프 재생 중 → 렌더 루프 항상 활성
    let renderQuietUntil = 0;       // 로드·리사이즈·발화 직후 잠깐 렌더 유지(정착)용
    // 걷기(뛰기)/인사 상태머신용 — 평소엔 멈춤(bind 포즈), 트리거 때만 재생
    let walkAction: THREE.AnimationAction | null = null;
    let runUntil = 0;               // 걷기/뛰기 종료 시각(>now면 재생 중)
    let hiUntil = 0;                // 인사 재생 중 종료 시각(이 동안 걷기 제어 정지)
    let throwUntil = 0;             // 던지기 재생 중 종료 시각(이 동안 걷기 제어 정지)
    let swingUntil = 0;            // 배트 스윙 재생 중 종료 시각(이 동안 걷기 제어 정지)
    let walkStopPending = false;    // 시간 만료 후 '현재 걷기 사이클을 마치고' 정자세로 멈추기 위한 대기 플래그
    // 입모양 shape key(morph target)를 가진 메시들.
    // body 메시가 여러 primitive(입술/입속 등)로 쪼개져 각각 morph를 갖기 때문에 전부 모아 동시에 구동한다.
    const mouthMeshes: THREE.Mesh[] = [];

    // === 터치 드래그로 좌우 360° 회전 ===
    let dragging = false;
    let dragPointerId = -1;
    let dragStartX = 0;
    let dragStartRotY = 0;
    let returnTarget: number | null = null;
    const FRONT_RAD = THREE.MathUtils.degToRad(FRONT_ROTATION_DEG);
    // LLM이 발화하거나 모션 중이면 캐릭터 조작을 막고 정면으로 복귀시킨다.
    const isLocked = () => {
      const t = performance.now();
      return speakingRef.current
        || (walkAction != null && (t < runUntil || t < hiUntil || t < throwUntil || t < swingUntil));
    };

    const loader = new GLTFLoader();
    // Draco 압축 모델 디코딩용. 디코더는 public/draco/ 에 번들(오프라인 동작).
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((obj) => {
          if (obj.name === "mouse_basic") mouseBasic = obj;
          if (obj.name === "mouse_half") mouseHalf = obj;
          // A/E/I/O/W/smile morph target을 가진 메시 전부 수집
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh && mesh.morphTargetDictionary) {
            const dict = mesh.morphTargetDictionary;
            if ("A" in dict || "smile" in dict) mouthMeshes.push(mesh);
          }
        });

        // 크기 정규화: 전체(배트 포함) bbox로 스케일 — 화면에 다 들어오도록.
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = MODEL_FRAME_HEIGHT / maxDim;

        // 중앙 정렬 기준: 배트(Material_0)는 한쪽으로 튀어나와 bbox를 비대칭으로 만들어
        // 몸통이 치우쳐 보인다 → 배트를 제외한 '몸통' bbox 중심으로 정렬한다.
        const bodyBox = new THREE.Box3();
        let hasBody = false;
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          if (mats.some((m) => (m as THREE.Material)?.name === "Material_0")) return; // 배트 제외
          bodyBox.expandByObject(mesh);
          hasBody = true;
        });
        const center = (hasBody ? bodyBox : box).getCenter(new THREE.Vector3());

        // 화면 중앙 정렬·회전 축을 '두 발 사이 한가운데'에 맞춘다.
        // 배트나 팔 때문에 몸통 bbox가 한쪽으로 치우쳐도 발 중심 기준으로 제자리 회전하게 한다.
        if (hasBody) {
          const minY = bodyBox.min.y;
          const footCeil = minY + (bodyBox.max.y - minY || 1) * 0.22;
          const footBox = new THREE.Box3();
          const vtx = new THREE.Vector3();
          model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.geometry) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            if (mats.some((m) => (m as THREE.Material)?.name === "Material_0")) return; // 배트 제외
            const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
            if (!posAttr) return;
            for (let i = 0; i < posAttr.count; i++) {
              vtx.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
              if (vtx.y <= footCeil) footBox.expandByPoint(vtx);
            }
          });
          if (!footBox.isEmpty()) {
            const footCenter = footBox.getCenter(new THREE.Vector3());
            center.x = footCenter.x;
            center.z = footCenter.z;
          }
        }

        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += MODEL_VERTICAL_OFFSET;

        root.add(model);

        // ===== 팀 스킨(유니폼 색/로고) =====
        // 유니폼/로고 머티리얼을 이름으로 수집 + 원본 색·로고맵 백업(다른 팀으로 바꾸면 복원).
        const skinMaterials = new Map<string, THREE.MeshStandardMaterial[]>();
        const originalColors = new Map<THREE.MeshStandardMaterial, THREE.Color>();
        const originalMaps = new Map<THREE.MeshStandardMaterial, THREE.Texture | null>();
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mm of mats) {
            const m = mm as THREE.MeshStandardMaterial;
            if (!m.name) continue;
            const list = skinMaterials.get(m.name) ?? [];
            list.push(m);
            skinMaterials.set(m.name, list);
            if (!originalColors.has(m)) originalColors.set(m, m.color.clone());
            if (!originalMaps.has(m)) originalMaps.set(m, m.map);
          }
        });

        const texLoader = new THREE.TextureLoader();
        const texCache = new Map<string, THREE.Texture>();
        const logoMats = skinMaterials.get(SKIN_TEXTURE_MATS.logo) ?? [];
        const originalLogoMaps = originalMaps;
        const logoTexCache = texCache;
        const normalizeColor = (color: string) => color.length === 9 ? color.slice(0, 7) : color;

        const applyTexture = (materialName: string, url: string) => {
          const mats = skinMaterials.get(materialName);
          if (!mats?.length) return;

          const finalize = (texture: THREE.Texture) => {
            for (const material of mats) {
              const old = originalMaps.get(material);
              if (old) {
                texture.flipY = old.flipY;
                texture.wrapS = old.wrapS;
                texture.wrapT = old.wrapT;
                texture.channel = old.channel;
              } else {
                texture.flipY = false;
              }
              texture.colorSpace = THREE.SRGBColorSpace;
              material.map = texture;
              material.color.setRGB(1, 1, 1);
              material.transparent = true;
              material.needsUpdate = true;
            }
            renderQuietUntil = performance.now() + 500;
          };

          const cached = texCache.get(url);
          if (cached) finalize(cached);
          else {
            const texture = texLoader.load(url, (loaded) => finalize(loaded));
            texCache.set(url, texture);
          }
        };

        const applySkin = (code?: string) => {
          const skin = code ? TEAM_SKINS[code] : undefined;
          if (skin) {
            for (const [materialName, color] of Object.entries(skin.materials)) {
              const mats = skinMaterials.get(materialName);
              if (!mats?.length) continue;
              const nextColor = new THREE.Color().setStyle(normalizeColor(color));
              for (const material of mats) {
                material.color.copy(nextColor);
                material.needsUpdate = true;
              }
            }
            applyTexture(SKIN_TEXTURE_MATS.marking, skin.marking);
            if (skin.logo && logoMats.length) {
              const url = skin.logo;
              const finalize = (t: THREE.Texture) => {
                for (const m of logoMats) {
                  const old = originalLogoMaps.get(m);
                  // glTF 텍스처 설정(flipY/래핑/채널)을 그대로 따라가야 UV가 맞는다.
                  if (old) { t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT; t.channel = old.channel; }
                  else t.flipY = false;
                  t.colorSpace = THREE.SRGBColorSpace;
                  m.map = t;
                  m.color.setRGB(1, 1, 1); // 베이스컬러 흰색이라야 로고 색이 그대로 보임
                  m.transparent = true;
                  m.needsUpdate = true;
                }
                renderQuietUntil = performance.now() + 500;
              };
              const cached = logoTexCache.get(url);
              if (cached) finalize(cached);
              else {
                const tex = texLoader.load(url, (t) => finalize(t));
                logoTexCache.set(url, tex);
              }
            }
          } else {
            // 스킨 없는 팀 → 원본 색/로고로 복원
            for (const [m, c] of originalColors) { m.color.copy(c); m.needsUpdate = true; }
            for (const [m, map] of originalLogoMaps) { m.map = map; m.needsUpdate = true; }
          }
          renderQuietUntil = performance.now() + 500;
        };
        applySkinRef.current = applySkin;
        applySkin(teamCodeRef.current);

        // 평소엔 멈춤(bind 포즈). "걷다/뛰다" 텍스트(runSignal) 때만 잠깐 걷기/뛰기,
        // 인사(greetSignal) 때만 손 흔들기. 둘 다 끝나면 다시 멈춤.
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const walkClip =
            THREE.AnimationClip.findByName(gltf.animations, WALK_NAME) ?? gltf.animations[0];
          const hiClip = THREE.AnimationClip.findByName(gltf.animations, MOTION_NAME);
          const throwClip = THREE.AnimationClip.findByName(gltf.animations, THROW_NAME);

          // 걷기는 항상 '재생'시키되 평소엔 첫 프레임(서있는 자세)에 멈춰둔다 → 깔끔한 정지 포즈.
          walkAction = mixer.clipAction(walkClip);
          walkAction.setLoop(THREE.LoopRepeat, Infinity);
          walkAction.play();
          walkAction.paused = true;
          walkAction.time = 0;

          // 모션 전환 크로스페이드(초). 하드 스위치 시 한 프레임 bind 포즈(배트+공 든 기본자세)가
          // 깜빡이던 문제 → 걷기(정지)↔원샷 사이를 부드럽게 블렌딩해 깜빡임 제거.
          const FADE = 0.18;
          // 원샷 모션(인사/던지기/스윙) 1회 재생: 걷기에서 크로스페이드 인. 종료 시각 반환.
          const playOnce = (
            action: THREE.AnimationAction | null,
            clip: THREE.AnimationClip | null | undefined,
          ): number => {
            if (!action || !clip || !walkAction) return 0;
            runUntil = 0; hiUntil = 0; throwUntil = 0; swingUntil = 0;
            walkStopPending = false;
            walkAction.paused = true;
            walkAction.time = 0;
            walkAction.enabled = true;
            walkAction.setEffectiveWeight(1);
            walkAction.play();
            action.reset();
            action.enabled = true;
            action.setEffectiveTimeScale(1);
            action.clampWhenFinished = true; // 마지막 프레임 유지 → 종료 시 bind 포즈 스냅 방지
            action.play();
            action.crossFadeFrom(walkAction, FADE, false);
            return performance.now() + clip.duration * 1000 + 400;
          };
          // 원샷 종료 → 걷기(정지 포즈)로 크로스페이드 백.
          const returnToWalk = (from: THREE.AnimationAction | null) => {
            if (!walkAction) return;
            walkAction.paused = true;
            walkAction.time = 0;
            walkAction.enabled = true;
            walkAction.play();
            if (from) walkAction.crossFadeFrom(from, FADE, false);
            else walkAction.setEffectiveWeight(1);
            renderQuietUntil = performance.now() + FADE * 1000 + 250;
          };

          let hiAction: THREE.AnimationAction | null = null;
          if (hiClip) {
            hiAction = mixer.clipAction(hiClip);
            hiAction.setLoop(THREE.LoopOnce, 1);
            hiAction.clampWhenFinished = false;
            // 인사 끝 → 걷기(정지 포즈)로 복귀
            mixer.addEventListener("finished", (e) => {
              if (e.action === hiAction && walkAction) {
                hiUntil = 0;
                returnToWalk(hiAction);
              }
            });
          }

          let throwAction: THREE.AnimationAction | null = null;
          if (throwClip) {
            throwAction = mixer.clipAction(throwClip);
            throwAction.setLoop(THREE.LoopOnce, 1);
            throwAction.clampWhenFinished = false;
            // 던지기 끝 → 걷기(정지 포즈)로 복귀
            mixer.addEventListener("finished", (e) => {
              if (e.action === throwAction && walkAction) {
                throwUntil = 0;
                returnToWalk(throwAction);
              }
            });
          }

          const swingClip = THREE.AnimationClip.findByName(gltf.animations, SWING_NAME);
          let swingAction: THREE.AnimationAction | null = null;
          if (swingClip) {
            swingAction = mixer.clipAction(swingClip);
            swingAction.setLoop(THREE.LoopOnce, 1);
            swingAction.clampWhenFinished = false;
            // 배트 휘두르기 끝 → 걷기(정지 포즈)로 복귀
            mixer.addEventListener("finished", (e) => {
              if (e.action === swingAction && walkAction) {
                swingUntil = 0;
                returnToWalk(swingAction);
              }
            });
          }

          // 걷기 시간이 만료돼도 사이클 중간에 끊지 않고, 한 사이클이 끝나는 'loop' 경계(=정자세)에서
          // 멈춘다 → 갑자기 정자세로 스냅하지 않고 자연스럽게 마무리.
          mixer.addEventListener("loop", (e) => {
            if (e.action === walkAction && walkStopPending && walkAction) {
              walkStopPending = false;
              walkAction.paused = true;
              walkAction.time = 0;
              renderQuietUntil = performance.now() + 200; // 정지 자세 한 번 적용 후 렌더 정지
            }
          });

          // 인사 1회: 걷기→인사 크로스페이드 → 끝나면 정지 포즈로 크로스페이드 백.
          const playHi = () => {
            hiUntil = playOnce(hiAction, hiClip);
            renderQuietUntil = hiUntil;
          };

          if (hiAction) playHi(); // 등장 시 인사 1회 후 정지
          greetRef.current = playHi;

          // 던지기 1회.
          throwRef.current = () => {
            throwUntil = playOnce(throwAction, throwClip);
            renderQuietUntil = throwUntil;
          };

          // 배트 스윙 1회.
          swingRef.current = () => {
            swingUntil = playOnce(swingAction, swingClip);
            renderQuietUntil = swingUntil;
          };

          // 걷기/뛰기: RUN_MS 동안 재생 후 정지(첫 프레임).
          runRef.current = () => {
            if (!walkAction) return;
            runUntil = performance.now() + RUN_MS;
            walkStopPending = false;
            walkAction.setEffectiveWeight(1);
            walkAction.setEffectiveTimeScale(RUN_SPEED);
            walkAction.paused = false;
            renderQuietUntil = runUntil + 300; // 움직이는 동안 렌더 유지
          };
        }
        renderQuietUntil = performance.now() + 1500; // 로드 직후 모델 표시·입모양 정착 위해 잠깐 렌더
        renderer.render(scene, camera);
        requestAnimationFrame(() => {
          if (disposed || notifiedReady) return;
          notifiedReady = true;
          onReadyRef.current?.();
        });
      },
      undefined,
      (err) => {
        console.error("[Character3D] 모델 로드 실패", err);
        if (!disposed && !notifiedReady) {
          notifiedReady = true;
          onReadyRef.current?.();
        }
      }
    );

    let raf = 0;
    let mouthTimer = 0;
    let mouthOpen = false;
    let last = performance.now();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = now - last;
      last = now;

      // 유휴(말 안 함 + 인트로 끝 + 정착 끝)면 렌더·업데이트 스킵 → GPU/팬 절약. 발화 중엔 정착 여유 400ms.
      if (speakingRef.current) renderQuietUntil = now + 400;
      // 걷기/인사 모션이 진행 중(또는 사이클 마무리 대기 중)이면 TTS가 도중에 끊겨도 끝까지 돌려야
      // 정자세로 복귀한다. (이게 없으면 발화 중단 시 렌더가 멈춰 걷는 자세 그대로 얼어붙음)
      const motionActive = walkAction != null && (now < runUntil || now < hiUntil || now < throwUntil || now < swingUntil || walkStopPending);
      // 모션 종료 직후 정자세 복귀 로직이 실행될 프레임을 보장(발화가 renderQuietUntil을 덮어써도 꼬리 유지).
      if (motionActive) renderQuietUntil = Math.max(renderQuietUntil, now + 300);
      // 드래그 도중 LLM이 동작을 시작하면 즉시 조작을 풀고 정면으로 복귀시킨다.
      if (dragging && isLocked()) {
        dragging = false;
        dragPointerId = -1;
        const twoPi = Math.PI * 2;
        returnTarget = FRONT_RAD + Math.round((root.rotation.y - FRONT_RAD) / twoPi) * twoPi;
      }
      if (isLocked() && !dragging && returnTarget === null && Math.abs(root.rotation.y - FRONT_RAD) > 0.001) {
        const twoPi = Math.PI * 2;
        returnTarget = FRONT_RAD + Math.round((root.rotation.y - FRONT_RAD) / twoPi) * twoPi;
      }
      // 손을 뗀 뒤 또는 응답 시작 뒤 정면으로 부드럽게 복귀.
      if (returnTarget !== null && !dragging) {
        root.rotation.y += (returnTarget - root.rotation.y) * ROTATE_RETURN_LERP;
        if (Math.abs(returnTarget - root.rotation.y) < 0.001) {
          root.rotation.y = FRONT_RAD;
          returnTarget = null;
        }
        renderQuietUntil = Math.max(renderQuietUntil, now + 100);
      }
      // 걷기 루프(idleLooping) 중엔 항상 렌더. 그 외엔 발화/인트로/모션/드래그/복귀/정착 동안만.
      const active = idleLooping || speakingRef.current || introRunning || motionActive
        || dragging || returnTarget !== null || now < renderQuietUntil;
      if (!active) return;

      // 걷기/뛰기 시간이 끝나면 즉시 끊지 않고 '현재 사이클을 마치고' 멈추도록 예약한다.
      // 실제 정지는 mixer의 'loop' 이벤트(사이클 경계=정자세)에서 수행 → 부자연스러운 스냅 방지.
      if (walkAction && now >= hiUntil && now >= runUntil && now >= throwUntil && now >= swingUntil && !walkAction.paused) {
        walkStopPending = true;
      }

      if (mixer) mixer.update(dt / 1000); // 모션 클립 진행

      // 입모양 립싱크: 공유 스토어의 목표값(Azure viseme 기반)으로 morph 보간.
      // body가 여러 primitive로 쪼개져 있으므로 morph를 가진 메시 전부에 동일하게 적용.
      if (mouthMeshes.length > 0) {
        const target = getTargetWeights();
        for (const mesh of mouthMeshes) {
          const dict = mesh.morphTargetDictionary;
          const infl = mesh.morphTargetInfluences;
          if (!dict || !infl) continue;
          for (const name of MOUTH_SHAPES) {
            const idx = dict[name];
            if (idx === undefined) continue;
            // 말 안 할 때: 모음은 0, smile만 IDLE_SMILE로
            let t = target[name];
            if (!speakingRef.current) t = name === "smile" ? IDLE_SMILE : 0;
            infl[idx] += (t - infl[idx]) * MOUTH_LERP;
          }
        }
      }

      if (mouseBasic && mouseHalf) {
        if (speakingRef.current) {
          mouthTimer += dt;
          if (mouthTimer >= MOUTH_INTERVAL_MS) {
            mouthTimer = 0;
            mouthOpen = !mouthOpen;
            mouseBasic.visible = !mouthOpen; // 다문 입
            mouseHalf.visible = mouthOpen; // 벌린 입
          }
        } else {
          // 말하지 않을 때는 다문 입 고정
          mouseBasic.visible = true;
          mouseHalf.visible = false;
          mouthOpen = false;
          mouthTimer = 0;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // === 터치/마우스 드래그로 좌우 360° 회전 ===
    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";

    const onPointerDown = (e: PointerEvent) => {
      if (isLocked()) return;
      dragging = true;
      dragPointerId = e.pointerId;
      dragStartX = e.clientX;
      dragStartRotY = root.rotation.y;
      returnTarget = null;
      canvas.style.cursor = "grabbing";
      try { canvas.setPointerCapture(e.pointerId); } catch { /* 캡처 미지원 무시 */ }
      renderQuietUntil = performance.now() + 200;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== dragPointerId) return;
      const w = mount.clientWidth || width || 360;
      const radPerPx = (Math.PI * 2) / (w * DRAG_TURN_RATIO);
      root.rotation.y = dragStartRotY + (e.clientX - dragStartX) * radPerPx;
      renderQuietUntil = performance.now() + 200;
    };
    const endDrag = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== dragPointerId) return;
      dragging = false;
      dragPointerId = -1;
      canvas.style.cursor = "grab";
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* 무시 */ }
      const twoPi = Math.PI * 2;
      returnTarget = FRONT_RAD + Math.round((root.rotation.y - FRONT_RAD) / twoPi) * twoPi;
      renderQuietUntil = performance.now() + 1000;
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    const resizeObserver = new ResizeObserver(() => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderQuietUntil = performance.now() + 200; // 리사이즈 후 한 번 다시 그림
    });
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      envTexture.dispose();
      pmrem.dispose();
      dracoLoader.dispose();
      renderer.dispose();
      greetRef.current = null;
      runRef.current = null;
      throwRef.current = null;
      swingRef.current = null;
      applySkinRef.current = null;
      walkAction = null;
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // greetSignal 이 바뀌면(0 제외) 인사 모션 재생. 모델 로드 전이면 무시.
  useEffect(() => {
    if (!greetSignal) return;
    greetRef.current?.();
  }, [greetSignal]);

  // runSignal 이 바뀌면(0 제외) 뛰기(빠른 걷기) 트리거. 모델 로드 전이면 무시.
  useEffect(() => {
    if (!runSignal) return;
    runRef.current?.();
  }, [runSignal]);

  // throwSignal 이 바뀌면(0 제외) 던지기 모션 1회 재생. 모델 로드 전이면 무시.
  useEffect(() => {
    if (!throwSignal) return;
    throwRef.current?.();
  }, [throwSignal]);

  // swingSignal 이 바뀌면(0 제외) 배트 스윙 모션 1회 재생. 모델 로드 전이면 무시.
  useEffect(() => {
    if (!swingSignal) return;
    swingRef.current?.();
  }, [swingSignal]);

  // teamCode 가 바뀌면 유니폼 색/로고 스킨 갱신(모델 재로드 없이). 로드 전이면 로드 콜백이 적용.
  useEffect(() => {
    applySkinRef.current?.(teamCode);
  }, [teamCode]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ aspectRatio: "1 / 1" }}
      aria-label="야구 초보자를 안내하는 야구공 캐릭터"
      role="img"
    />
  );
}
