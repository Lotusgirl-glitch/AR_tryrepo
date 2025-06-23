/*import React, { useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

function App() {
  useEffect(() => {
    let camera, scene, renderer, controller;
    let reticle;
    let model;

    init();
    animate();

    function init() {
      const container = document.createElement('div');
      document.body.appendChild(container);

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
      container.appendChild(renderer.domElement);

      document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      // Load your 3D model
      const loader = new GLTFLoader();
      loader.load(process.env.PUBLIC_URL + '/model.glb', (gltf) => {
      model = gltf.scene;
      model.scale.set(0.6, 0.6, 0.6);
     });



      const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      reticle = new THREE.Mesh(geometry, material);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      controller = renderer.xr.getController(0);
      controller.addEventListener('select', () => {
        if (reticle.visible && model) {
          const clone = model.clone();
          clone.position.setFromMatrixPosition(reticle.matrix);
          clone.quaternion.setFromRotationMatrix(reticle.matrix);
          scene.add(clone);
        }
      });
      scene.add(controller);

      renderer.xr.addEventListener('sessionstart', async () => {
        const session = renderer.xr.getSession();

        const viewerReferenceSpace = await session.requestReferenceSpace('viewer');
        const hitTestSource = await session.requestHitTestSource({ space: viewerReferenceSpace });

        renderer.setAnimationLoop((timestamp, frame) => {
          if (frame) {
            const referenceSpace = renderer.xr.getReferenceSpace();
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {
              const hit = hitTestResults[0];
              const pose = hit.getPose(referenceSpace);
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            } else {
              reticle.visible = false;
            }
          }

          renderer.render(scene, camera);
        });
      });

      window.addEventListener('resize', onWindowResize, false);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
    }
  }, []);

  return null;
}

export default App; */


import React, { useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

function App() {
  useEffect(() => {
    let camera, scene, renderer, controller;
    let reticle;
    let model;
    let selectedObject = null;
    let startX = 0, startY = 0;
    let startDistance = 0;
    let initialScale = new THREE.Vector3();

    init();
    animate();

    function init() {
      const container = document.createElement('div');
      document.body.appendChild(container);

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      container.appendChild(renderer.domElement);

      document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      const loader = new GLTFLoader();
      loader.load( process.env.PUBLIC_URL + '/model.glb', (gltf) => {
        model = gltf.scene;
        model.scale.set(0.6, 0.6, 0.6);
      });

      const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      reticle = new THREE.Mesh(geometry, material);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      controller = renderer.xr.getController(0);
      controller.addEventListener('select', () => {
        if (reticle.visible && model) {
          const clone = model.clone();
          clone.position.setFromMatrixPosition(reticle.matrix);
          clone.quaternion.setFromRotationMatrix(reticle.matrix);
          scene.add(clone);
          selectedObject = clone;
        }
      });
      scene.add(controller);

      // Touch Events
      renderer.domElement.addEventListener('touchstart', onTouchStart, false);
      renderer.domElement.addEventListener('touchmove', onTouchMove, false);
      renderer.domElement.addEventListener('touchend', onTouchEnd, false);

      renderer.xr.addEventListener('sessionstart', async () => {
        const session = renderer.xr.getSession();

        const viewerReferenceSpace = await session.requestReferenceSpace('viewer');
        const hitTestSource = await session.requestHitTestSource({ space: viewerReferenceSpace });

        renderer.setAnimationLoop((timestamp, frame) => {
          if (frame) {
            const referenceSpace = renderer.xr.getReferenceSpace();
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {
              const hit = hitTestResults[0];
              const pose = hit.getPose(referenceSpace);
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            } else {
              reticle.visible = false;
            }
          }

          renderer.render(scene, camera);
        });
      });

      window.addEventListener('resize', onWindowResize, false);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
    }

    // === Touch Gestures ===
    function onTouchStart(event) {
      if (!selectedObject) return;

      if (event.touches.length === 1) {
        // Single finger: drag
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
      } else if (event.touches.length === 2) {
        // Two fingers: pinch to scale or rotate
        startDistance = getTouchDistance(event.touches);
        initialScale.copy(selectedObject.scale);
      }
    }

    function onTouchMove(event) {
      if (!selectedObject) return;

      if (event.touches.length === 1) {
        // Dragging: translate in X-Y plane
        const deltaX = (event.touches[0].clientX - startX) / window.innerWidth;
        const deltaY = (event.touches[0].clientY - startY) / window.innerHeight;
        selectedObject.position.x += deltaX;
        selectedObject.position.y -= deltaY;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
      } else if (event.touches.length === 2) {
        // Pinch to zoom
        const newDistance = getTouchDistance(event.touches);
        const scaleFactor = newDistance / startDistance;
        selectedObject.scale.set(
          initialScale.x * scaleFactor,
          initialScale.y * scaleFactor,
          initialScale.z * scaleFactor
        );

        // Optional: Rotate by angle change
        const angle = getTouchAngle(event.touches);
        selectedObject.rotation.y = angle;
      }
    }

    function onTouchEnd() {
      // Clear gestures
    }

    function getTouchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchAngle(touches) {
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      return Math.atan2(dy, dx);
    }
  }, []);

  return null;
}

export default App;




