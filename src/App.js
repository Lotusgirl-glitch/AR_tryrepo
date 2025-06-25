import React, { useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

export default function ARMarkerless() {
  useEffect(() => {
    let camera, scene, renderer, controller, reticle;
    let model = null;
    let selectedModel = null; // globally scoped now


    init();

    function init() {
      // Scene & Camera
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      document.body.appendChild(renderer.domElement);

      // Add AR button
      document.body.appendChild(ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test']
      }));

      // Light
      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      // Load model
      const loader = new GLTFLoader();
      loader.load( process.env.PUBLIC_URL + '/model.glb', (gltf) => {
        model = gltf.scene;
        model.scale.set(0.4, 0.4, 0.4);
      });

      // Reticle (used for hit test visualization)
      const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      reticle = new THREE.Mesh(geometry, material);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      // Controller setup
      controller = renderer.xr.getController(0);
      let selectedModel = null;

/*controller.addEventListener('select', () => {
  if (reticle.visible && model) {
    if (!placed) {
      // Place model first time
      selectedModel = model.clone();
      selectedModel.position.setFromMatrixPosition(reticle.matrix);
      selectedModel.quaternion.setFromRotationMatrix(reticle.matrix);
      scene.add(selectedModel);
      placed = true;
    } else if (selectedModel) {
      // Raycast from camera to reticle
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x: 0, y: 0 }, camera); // center of screen
      const intersects = raycaster.intersectObject(selectedModel, true);

      if (intersects.length > 0) {
        // If model was tapped again → move it
        selectedModel.position.setFromMatrixPosition(reticle.matrix);
        selectedModel.quaternion.setFromRotationMatrix(reticle.matrix);
      }
    }
  }
}); */

controller.addEventListener('select', () => {
  if (reticle.visible && model) {
    if (!selectedModel) {
      // First placement
      selectedModel = model.clone();
      scene.add(selectedModel);
    }

    // Move the model to new reticle position every time
    selectedModel.position.setFromMatrixPosition(reticle.matrix);
    selectedModel.quaternion.setFromRotationMatrix(reticle.matrix);
  }
});


      scene.add(controller);

      // Start XR session
      renderer.xr.addEventListener('sessionstart', async () => {
        const session = renderer.xr.getSession();
        const viewerSpace = await session.requestReferenceSpace('viewer');
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

      // Resize
      window.addEventListener('resize', onWindowResize, false);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  return null;
}
