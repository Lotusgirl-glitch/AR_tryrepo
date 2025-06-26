import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ARButton } from "three/examples/jsm/webxr/ARButton";

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
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      document.body.appendChild(renderer.domElement);

      // AR Button with DOM Overlay
      document.body.appendChild(
        ARButton.createButton(renderer, {
          requiredFeatures: ["hit-test"],
          domOverlay: { root: document.body },
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

      // AR Session start
      renderer.xr.addEventListener("sessionstart", async () => {
        const session = renderer.xr.getSession();
        const viewerSpace = await session.requestReferenceSpace("viewer");
        const refSpace = renderer.xr.getReferenceSpace();
        const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

        // Show scale/rotate buttons
        createDomControls();

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

    function createDomControls() {
      const style = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 20px;
        z-index: 10000;
      `;

      const container = document.createElement("div");
      container.setAttribute("style", style);
      container.id = "ar-controls";

      // Scale Down
      const scaleDown = document.createElement("button");
      scaleDown.textContent = "-";
      scaleDown.style.fontSize = "24px";
      scaleDown.onclick = () => {
        if (selectedModelRef.current) {
          selectedModelRef.current.scale.multiplyScalar(0.9);
        }
      };

      // Scale Up
      const scaleUp = document.createElement("button");
      scaleUp.textContent = "+";
      scaleUp.style.fontSize = "24px";
      scaleUp.onclick = () => {
        if (selectedModelRef.current) {
          selectedModelRef.current.scale.multiplyScalar(1.1);
        }
      };

      // Rotate
      const rotateBtn = document.createElement("button");
      rotateBtn.textContent = "⟳";
      rotateBtn.style.fontSize = "24px";
      rotateBtn.onclick = () => {
        if (selectedModelRef.current) {
          selectedModelRef.current.rotation.y += THREE.MathUtils.degToRad(15);
        }
      };

      container.appendChild(scaleDown);
      container.appendChild(rotateBtn);
      container.appendChild(scaleUp);
      document.body.appendChild(container);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  return null;
}
