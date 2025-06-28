// App.jsx
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import Hammer from "hammerjs";

export default function App() {
  const containerRef = useRef();
  const modelRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const sceneRef = useRef();

  const [cameraStream, setCameraStream] = useState(null);
  const [modelPlaced, setModelPlaced] = useState(false);
  const isDragging = useRef(false);
  const scale = useRef(1);
  const rotation = useRef(0);

  useEffect(() => {
    // === Scene Setup ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    camera.position.z = 2;
    sceneRef.current = scene;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 4, 6);
    scene.add(dirLight);

    // Load model (but don't add to scene until placed)
    const loader = new GLTFLoader();
    loader.load(process.env.PUBLIC_URL + "/chair.glb",(gltf) => {
    const model = gltf.scene;
    model.scale.set(0.5, 0.5, 0.5);
    model.visible = false;
    scene.add(model);
    modelRef.current = model;
  },
  undefined,
  (error) => {
    console.error("Failed to load GLB:", error);
  }
);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // === Gesture Setup ===
    const hammer = new Hammer(containerRef.current);
    hammer.get("pinch").set({ enable: true });
    hammer.get("rotate").set({ enable: true });

    hammer.on("pan", (e) => {
      if (!modelRef.current || !modelPlaced) return;
      const dx = (e.deltaX / window.innerWidth) * 2;
      const dy = -(e.deltaY / window.innerHeight) * 2;
      modelRef.current.position.x += dx;
      modelRef.current.position.y += dy;
    });

    hammer.on("pinch", (e) => {
      if (!modelRef.current || !modelPlaced) return;
      scale.current = e.scale;
      modelRef.current.scale.setScalar(scale.current * 0.5);
    });

    hammer.on("rotate", (e) => {
      if (!modelRef.current || !modelPlaced) return;
      rotation.current = e.rotation;
      modelRef.current.rotation.y = rotation.current * (Math.PI / 180);
    });

    return () => hammer.destroy();
  }, []);

  // === Tap to Place ===
  useEffect(() => {
    const onClick = (e) => {
      if (!modelRef.current || modelPlaced) return;

      const bounds = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = -((e.clientY - bounds.top) / bounds.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x, y }, cameraRef.current);

      const groundZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundZ, point);

      modelRef.current.position.copy(point);
      modelRef.current.visible = true;
      setModelPlaced(true);
    };

    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [modelPlaced]);

  // === Start Camera ===
   useEffect(() => {
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } }
      });
      setCameraStream(stream);
    } catch (err) {
      console.warn("Back camera not found, trying default camera...");
      // fallback to any camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
    }
  }

  startCamera();
}, []);


  return (
    <>
      {/* Camera Feed */}
      {cameraStream && (
        <video
          autoPlay
          playsInline
          muted
          ref={(video) => {
            if (video) video.srcObject = cameraStream;
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            objectFit: "cover",
            zIndex: -1,
          }}
        />
      )}

      {/* Three.js canvas */}
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      />

      {/* Instructions */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          width: "100%",
          textAlign: "center",
          color: "white",
          fontSize: "16px",
          textShadow: "0 0 5px black",
        }}
      >
        {modelPlaced
          ? "Drag, pinch, or rotate the object"
          : "Tap on screen to place the object"}
      </div>
    </>
  );
}
