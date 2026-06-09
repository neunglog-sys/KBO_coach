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
  className?: string;
}

const MODEL_URL = "/model/3d/model_260608_opt.glb";
const FRONT_ROTATION_DEG = 0; // 모델 정면(+Z) 기준 회전 보정.
const MOUTH_INTERVAL_MS = 200; // (구형 모델용) 입 여닫는 주기
const MOTION_NAME = "hi"; // 재생할 애니메이션(모션) 클립 이름
const MOUTH_LERP = 0.4; // 입모양 보간 속도(0~1, 클수록 빠름)
const IDLE_SMILE = 0.0; // 말 안 할 때 기본 미소 정도(0=다문 입). 필요하면 0.3 등으로.
const MOUTH_SHAPES: MouthShape[] = ["smile", "A", "E", "I", "O", "W"];
const MODEL_FRAME_HEIGHT = 2.15;
const MODEL_VERTICAL_OFFSET = 0.08;

export default function Character3D({ isSpeaking, greetSignal, className }: Character3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // 애니메이션 루프가 항상 최신 isSpeaking 값을 읽도록 ref로 보관
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;
  // 모델 로드 후 채워지는 "인사 모션 재생" 함수. 외부 greetSignal 변화 시 호출.
  const greetRef = useRef<(() => void) | null>(null);

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
    let renderQuietUntil = 0;       // 로드·리사이즈·발화 직후 잠깐 렌더 유지(정착)용
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

        // "hi" 모션 재생 (없으면 첫 번째 클립으로 폴백) — 1회만(무한루프 X)
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const clip =
            THREE.AnimationClip.findByName(gltf.animations, MOTION_NAME) ??
            gltf.animations[0];
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          introRunning = true;
          mixer.addEventListener("finished", () => {
            introRunning = false;
          });
          // 외부 인사 트리거 시 손 흔들기 모션을 처음부터 다시 1회 재생.
          greetRef.current = () => {
            action.reset();
            action.play();
            introRunning = true;
            // 모션 길이 동안 렌더 루프가 깨어있도록 유지.
            renderQuietUntil = performance.now() + clip.duration * 1000 + 300;
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
      const active = speakingRef.current || introRunning || now < renderQuietUntil;
      if (!active) return;

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
