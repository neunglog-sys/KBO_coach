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
  className?: string;
}

const MODEL_URL = "/model/3d/260609_Rig_v2_opt.glb";
const FRONT_ROTATION_DEG = 0; // 모델 정면(+Z) 기준 회전 보정.
const MOUTH_INTERVAL_MS = 200; // (구형 모델용) 입 여닫는 주기
const MOTION_NAME = "hi"; // 인사(손 흔들기) 클립 — 인사 시 1회 재생
const WALK_NAME = "walk"; // 걷기 클립 — 기본 루프(항상 재생)
const MOUTH_LERP = 0.4; // 입모양 보간 속도(0~1, 클수록 빠름)
const IDLE_SMILE = 0.0; // 말 안 할 때 기본 미소 정도(0=다문 입). 필요하면 0.3 등으로.
const MOUTH_SHAPES: MouthShape[] = ["smile", "A", "E", "I", "O", "W"];
const MODEL_FRAME_HEIGHT = 1.8;
const MODEL_VERTICAL_OFFSET = 0.08;
const RUN_MS = 3500;        // 한 번 트리거 시 걷기/뛰기 지속 시간
const RUN_SPEED = 1.7;      // 재생 속도 배수(1=걷기, >1=뛰기 느낌)

export default function Character3D({ isSpeaking, greetSignal, runSignal, className }: Character3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // 애니메이션 루프가 항상 최신 isSpeaking 값을 읽도록 ref로 보관
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;
  // 모델 로드 후 채워지는 "인사 모션 재생" 함수. 외부 greetSignal 변화 시 호출.
  const greetRef = useRef<(() => void) | null>(null);
  // 모델 로드 후 채워지는 "뛰기(빠른 걷기) 트리거" 함수. runSignal 변화 시 호출.
  const runRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 400;
    let height = mount.clientHeight || 400;
    let disposed = false;

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
    let walkStopPending = false;    // 시간 만료 후 '현재 걷기 사이클을 마치고' 정자세로 멈추기 위한 대기 플래그
    // 입모양 shape key(morph target)를 가진 메시들.
    // body 메시가 여러 primitive(입술/입속 등)로 쪼개져 각각 morph를 갖기 때문에 전부 모아 동시에 구동한다.
    const mouthMeshes: THREE.Mesh[] = [];

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

        // 중앙 정렬 + 크기 정규화
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = MODEL_FRAME_HEIGHT / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += MODEL_VERTICAL_OFFSET;

        root.add(model);

        // 평소엔 멈춤(bind 포즈). "걷다/뛰다" 텍스트(runSignal) 때만 잠깐 걷기/뛰기,
        // 인사(greetSignal) 때만 손 흔들기. 둘 다 끝나면 다시 멈춤.
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const walkClip =
            THREE.AnimationClip.findByName(gltf.animations, WALK_NAME) ?? gltf.animations[0];
          const hiClip = THREE.AnimationClip.findByName(gltf.animations, MOTION_NAME);

          // 걷기는 항상 '재생'시키되 평소엔 첫 프레임(서있는 자세)에 멈춰둔다 → 깔끔한 정지 포즈.
          walkAction = mixer.clipAction(walkClip);
          walkAction.setLoop(THREE.LoopRepeat, Infinity);
          walkAction.play();
          walkAction.paused = true;
          walkAction.time = 0;

          let hiAction: THREE.AnimationAction | null = null;
          if (hiClip) {
            hiAction = mixer.clipAction(hiClip);
            hiAction.setLoop(THREE.LoopOnce, 1);
            hiAction.clampWhenFinished = false;
            // 인사 끝 → 걷기(정지 포즈)로 복귀
            mixer.addEventListener("finished", (e) => {
              if (e.action === hiAction && walkAction) {
                hiUntil = 0;
                walkAction.setEffectiveWeight(1);
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

          // 인사 1회: 걷기 끄고(weight 0) 인사 재생 → 끝나면 정지 포즈 복귀.
          const playHi = () => {
            if (!hiAction || !walkAction) return;
            runUntil = 0;
            walkStopPending = false;
            walkAction.paused = true;
            walkAction.time = 0;
            walkAction.setEffectiveWeight(0);
            hiAction.reset().setEffectiveWeight(1).play();
            hiUntil = performance.now() + hiClip!.duration * 1000 + 400;
            renderQuietUntil = hiUntil;
          };

          if (hiAction) playHi(); // 등장 시 인사 1회 후 정지
          greetRef.current = playHi;

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
      },
      undefined,
      (err) => console.error("[Character3D] 모델 로드 실패", err)
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
      const motionActive = walkAction != null && (now < runUntil || now < hiUntil || walkStopPending);
      // 모션 종료 직후 정자세 복귀 로직이 실행될 프레임을 보장(발화가 renderQuietUntil을 덮어써도 꼬리 유지).
      if (motionActive) renderQuietUntil = Math.max(renderQuietUntil, now + 300);
      // 걷기 루프(idleLooping) 중엔 항상 렌더. 그 외엔 발화/인트로/모션/정착 동안만.
      const active = idleLooping || speakingRef.current || introRunning || motionActive || now < renderQuietUntil;
      if (!active) return;

      // 걷기/뛰기 시간이 끝나면 즉시 끊지 않고 '현재 사이클을 마치고' 멈추도록 예약한다.
      // 실제 정지는 mixer의 'loop' 이벤트(사이클 경계=정자세)에서 수행 → 부자연스러운 스냅 방지.
      if (walkAction && now >= hiUntil && now >= runUntil && !walkAction.paused) {
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
      envTexture.dispose();
      pmrem.dispose();
      dracoLoader.dispose();
      renderer.dispose();
      greetRef.current = null;
      runRef.current = null;
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
