import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ARButton } from "three/examples/jsm/webxr/ARButton";

export default function ARMarkerless() {
  const selectedModelRef = useRef(null);

  useEffect(() => {
    let camera, scene, renderer, controller, reticle;
    let model = null;

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

    init();

    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      document.body.appendChild(renderer.domElement);

      document.body.appendChild(ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"]
      }));

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      const loader = new GLTFLoader();
      loader.load(process.env.PUBLIC_URL + "/model.glb", (gltf) => {
        model = gltf.scene;
        model.scale.set(0.4, 0.4, 0.4);
      });

      const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      reticle = new THREE.Mesh(geometry, material);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

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

      renderer.xr.addEventListener("sessionstart", async () => {
        // Show scale buttons only when AR session starts
        const buttonDiv = document.createElement("div");
        buttonDiv.style.position = "absolute";
        buttonDiv.style.bottom = "20px";
        buttonDiv.style.left = "50%";
        buttonDiv.style.transform = "translateX(-50%)";
        buttonDiv.style.display = "flex";
        buttonDiv.style.gap = "1rem";
        buttonDiv.style.zIndex = "100";

        const minus = document.createElement("button");
        minus.textContent = "-";
        minus.style.fontSize = "24px";
        minus.style.padding = "10px 20px";
        minus.onclick = scaleDown;

        const plus = document.createElement("button");
        plus.textContent = "+";
        plus.style.fontSize = "24px";
        plus.style.padding = "10px 20px";
        plus.onclick = scaleUp;

        buttonDiv.appendChild(minus);
        buttonDiv.appendChild(plus);
        document.body.appendChild(buttonDiv);

        // HIT TEST SETUP
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

      window.addEventListener("resize", onWindowResize, false);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  return null;
}
 
