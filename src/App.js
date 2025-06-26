import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import "./App.css";

export default function ARMarkerless() {
  const selectedModelRef = useRef(null);

  useEffect(() => {
    let camera, scene, renderer, controller, reticle;
    let model = null;

    init();

    function init() {
      // Scene & Camera
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight * 0.85); // leave space for buttons
      renderer.xr.enabled = true;
      document.getElementById("xr-container").appendChild(renderer.domElement);

      // AR Button
      document.getElementById("xr-container").appendChild(
        ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
      );

      // Light
      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      // Model loader
      const loader = new GLTFLoader();
      loader.load(process.env.PUBLIC_URL + "/model.glb", (gltf) => {
        model = gltf.scene;
        model.scale.set(0.4, 0.4, 0.4);
      });

      // Reticle
      const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      reticle = new THREE.Mesh(geometry, material);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      // Controller
      controller = renderer.xr.getController(0);
      controller.addEventListener("select", () => {
        if (reticle.visible && model) {
          if (!selectedModelRef.current) {
            selectedModelRef.current = model.clone();
            scene.add(selectedModelRef.current);
          }

          selectedModelRef.current.position.setFromMatrixPosition(reticle.matrix);
          selectedModelRef.current.quaternion.setFromRotationMatrix(reticle.matrix);
        }
      });
      scene.add(controller);

      // Hit Test Loop
      renderer.xr.addEventListener("sessionstart", async () => {
        const session = renderer.xr.getSession();
        const viewerSpace = await session.requestReferenceSpace("viewer");
        const refSpace = renderer.xr.getReferenceSpace();
        const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

        renderer.setAnimationLoop((timestamp, frame) => {
          if (frame) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0];
              const pose = hit.getPose(refSpace);
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            } else {
              reticle.visible = false;
            }
          }

          renderer.render(scene, camera);
        });
      });

      window.addEventListener("resize", onWindowResize);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / (window.innerHeight * 0.85);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight * 0.85);
    }
  }, []);

  const scaleUp = () => {
    if (selectedModelRef.current) {
      selectedModelRef.current.scale.multiplyScalar(1.1);
    }
  };

  const scaleDown = () => {
    if (selectedModelRef.current) {
      selectedModelRef.current.scale.multiplyScalar(0.9);
    }
  };

  return (
    <>
      <div id="xr-container"></div>
      <div
        id="scale-controls"
        style={{
          position: "relative",
          height: "15vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <button onClick={scaleDown} style={{ fontSize: "2rem" }}>-</button>
        <button onClick={scaleUp} style={{ fontSize: "2rem" }}>+</button>
      </div>
    </>
  );
}
