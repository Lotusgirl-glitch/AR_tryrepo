// File: src/ARMarkerless.js
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ARButton } from "three/examples/jsm/webxr/ARButton";

export default function ARMarkerless() {
  const selectedModelRef = useRef(null);

  useEffect(() => {
    let camera, scene, renderer, controller, reticle;
    let model = null;
    let scaleUpButton, scaleDownButton, rotateButton;

    init();

    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      document.body.appendChild(renderer.domElement);

      document.body.appendChild(
        ARButton.createButton(renderer, {
          requiredFeatures: ["hit-test"],
        })
      );

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
            createFloatingButtons();
          }

          selectedModelRef.current.position.setFromMatrixPosition(reticle.matrix);
          selectedModelRef.current.quaternion.setFromRotationMatrix(reticle.matrix);
        } else if (selectedModelRef.current) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera({ x: 0, y: 0 }, camera);
          const intersects = raycaster.intersectObjects([
            scaleUpButton,
            scaleDownButton,
            rotateButton,
          ], true);

          if (intersects.length > 0) {
            const objectHit = intersects[0].object;
            if (objectHit.name === "scaleUp") {
              selectedModelRef.current.scale.multiplyScalar(1.1);
            } else if (objectHit.name === "scaleDown") {
              selectedModelRef.current.scale.multiplyScalar(0.9);
            } else if (objectHit.name === "rotate") {
              selectedModelRef.current.rotation.y += Math.PI / 8;
            }
          }
        }
      });
      scene.add(controller);

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

          updateFloatingButtonsPosition();
          renderer.render(scene, camera);
        });
      });

      window.addEventListener("resize", onWindowResize);
    }

    function createFloatingButtons() {
      const buttonGeo = new THREE.BoxGeometry(0.08, 0.04, 0.01);

      const matUp = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      scaleUpButton = new THREE.Mesh(buttonGeo, matUp);
      scaleUpButton.name = "scaleUp";
      scene.add(scaleUpButton);

      const matDown = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      scaleDownButton = new THREE.Mesh(buttonGeo, matDown);
      scaleDownButton.name = "scaleDown";
      scene.add(scaleDownButton);

      const matRotate = new THREE.MeshBasicMaterial({ color: 0x0000ff });
      rotateButton = new THREE.Mesh(buttonGeo, matRotate);
      rotateButton.name = "rotate";
      scene.add(rotateButton);
    }

    function updateFloatingButtonsPosition() {
      if (!camera || !scaleUpButton || !scaleDownButton || !rotateButton) return;

      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);

      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);

      const up = new THREE.Vector3();
      up.copy(camera.up);

      const right = new THREE.Vector3();
      camDir.clone().cross(up).normalize();

      const offset = 0.5;

      scaleUpButton.position.copy(camPos)
        .add(camDir.clone().multiplyScalar(offset))
        .add(right.clone().multiplyScalar(0.15))
        .add(up.clone().multiplyScalar(-0.1));

      scaleDownButton.position.copy(camPos)
        .add(camDir.clone().multiplyScalar(offset))
        .add(right.clone().multiplyScalar(-0.15))
        .add(up.clone().multiplyScalar(-0.1));

      rotateButton.position.copy(camPos)
        .add(camDir.clone().multiplyScalar(offset))
        .add(up.clone().multiplyScalar(-0.25));
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  return null;
}
