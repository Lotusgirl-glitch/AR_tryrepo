import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import "./App.css";

export default function ARMarkerless() {
  const selectedModelRef = useRef(null);

  // Scale functions
  function scaleUp() {
    if (selectedModelRef.current) {
      selectedModelRef.current.scale.multiplyScalar(1.1);
    }
  }

  function scaleDown() {
    if (selectedModelRef.current) {
      selectedModelRef.current.scale.multiplyScalar(0.9);
    }
  }

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
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      document.body.appendChild(renderer.domElement);

      // Add AR button
      document.body.appendChild(
        ARButton.createButton(renderer, {
          requiredFeatures: ["hit-test"],
        })
      );

      // Light
      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      // Load model
      const loader = new GLTFLoader();
      loader.load(process.env.PUBLIC_URL + "/model.glb", (gltf) => {
        model = gltf.scene;
        model.scale.set(0.4, 0.4, 0.4);
      });

      // Reticle
      const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(
        -Math.PI / 2
      );
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

      // XR Session start
      renderer.xr.addEventListener("sessionstart", async () => {
        const session = renderer.xr.getSession();
        const viewerSpace = await session.requestReferenceSpace("viewer");
        const refSpace = renderer.xr.getReferenceSpace();
        const hitTestSource = await session.requestHitTestSource({
          space: viewerSpace,
        });

        // Inject buttons dynamically AFTER AR starts
        const buttonContainer = document.createElement("div");
        buttonContainer.style.position = "absolute";
        buttonContainer.style.bottom = "20px";
        buttonContainer.style.left = "50%";
        buttonContainer.style.transform = "translateX(-50%)";
        buttonContainer.style.zIndex = "10";
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "1rem";

        const minusBtn = document.createElement("button");
        minusBtn.innerText = "-";
        minusBtn.onclick = scaleDown;

        const plusBtn = document.createElement("button");
        plusBtn.innerText = "+";
        plusBtn.onclick = scaleUp;

        // Optional styling (or use a className)
        [minusBtn, plusBtn].forEach((btn) => {
          btn.style.fontSize = "1.5rem";
          btn.style.padding = "0.5rem 1rem";
          btn.style.background = "white";
          btn.style.border = "none";
          btn.style.borderRadius = "8px";
          btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
          btn.style.cursor = "pointer";
        });

        buttonContainer.appendChild(minusBtn);
        buttonContainer.appendChild(plusBtn);
        document.body.appendChild(buttonContainer);

        // Track frame loop
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

      // Resize
      window.addEventListener("resize", onWindowResize, false);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  return null; // UI is injected manually after XR starts
}

 
