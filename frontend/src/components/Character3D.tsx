import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getTargetWeights, type MouthShape } from "../lipSync";

interface Character3DProps {
  /** 말하는 중이면 입을 움직인다. */
  isSpeaking: boolean;
  className?: string;
}

const MODEL_URL = "/model/3d/mouth_test2.glb";
const FRONT_ROTATION_DEG = 0; // mouth_test2는 정면(+Z) 제작 → 보정 불필요. 옆으로 보이면 조정.
const MOUTH_INTERVAL_MS = 200; // (구형 모델용) 입 여닫는 주기
const MOTION_NAME = "hi"; // 재생할 애니메이션(모션) 클립 이름
const MOUTH_LERP = 0.4; // 입모양 보간 속도(0~1, 클수록 빠름)
const IDLE_SMILE = 0.0; // 말 안 할 때 기본 미소 정도(0=다문 입). 필요하면 0.3 등으로.
const MOUTH_SHAPES: MouthShape[] = ["smile", "A", "E", "I", "O", "W"];

export default function Character3D({ isSpeaking, className }: Character3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // 애니메이션 루프가 항상 최신 isSpeaking 값을 읽도록 ref로 보관
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const root = new THREE.Group();
    root.rotation.y = THREE.MathUtils.degToRad(FRONT_ROTATION_DEG);
    scene.add(root);

    let mouseBasic: THREE.Object3D | null = null;
    let mouseHalf: THREE.Object3D | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    // 입모양 shape key(morph target)를 가진 메시들.
    // body 메시가 여러 primitive(입술/입속 등)로 쪼개져 각각 morph를 갖기 때문에 전부 모아 동시에 구동한다.
    const mouthMeshes: THREE.Mesh[] = [];

    const loader = new GLTFLoader();
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
        const scale = 2.4 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        root.add(model);

        // "hi" 모션 재생 (없으면 첫 번째 클립으로 폴백)
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const clip =
            THREE.AnimationClip.findByName(gltf.animations, MOTION_NAME) ??
            gltf.animations[0];
          mixer.clipAction(clip).play();
        }
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
    });
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

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
