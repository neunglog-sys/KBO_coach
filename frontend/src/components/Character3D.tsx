import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Character3DProps {
  /** 말하는 중이면 입을 뻐금뻐금 움직인다. */
  isSpeaking: boolean;
  className?: string;
}

const MODEL_URL = "/model/model_backup_2.glb";
const FRONT_ROTATION_DEG = -90; // 모델이 오른쪽을 보고 있어 정면으로 돌려준다.
const MOUTH_INTERVAL_MS = 200; // 입 여닫는 주기

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

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((obj) => {
          if (obj.name === "mouse_basic") mouseBasic = obj;
          if (obj.name === "mouse_half") mouseHalf = obj;
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
