 // ModelViewerAR.js
import React, { useEffect, useRef } from 'react';

export default function ModelViewerAR({
  src,
  alt = "3D model",
  title = "View in your space",
  scale = "1 1 1",
  autoRotate = true,
  cameraControls = true,
  color = "#ffffff"
}) {
  const viewerRef = useRef();

  useEffect(() => {
    const scriptId = 'model-viewer-cdn';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      script.id = scriptId;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.model?.materials?.forEach((mat) => {
        mat.pbrMetallicRoughness?.setBaseColorFactor?.([1, 1, 1, 1]);
      });
    }
  }, [color]);

  const takeScreenshot = () => {
    const canvas = viewerRef.current?.shadowRoot?.querySelector('canvas');
    if (canvas) {
      const dataURL = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataURL;
      a.download = "model-screenshot.png";
      a.click();
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <model-viewer
        ref={viewerRef}
        src={src}
        alt={alt}
        ar
        ar-modes="scene-viewer webxr quick-look"
        camera-controls={cameraControls}
        auto-rotate={autoRotate}
        scale={scale}
        shadow-intensity="1"
        exposure="1"
        style={{ width: '100%', height: '100%' }}
      >
        <button slot="ar-button" style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          zIndex: 10
        }}>
          {title}
        </button>
      </model-viewer>

      {/* Screenshot button */}
      <button onClick={takeScreenshot} style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px 12px',
        cursor: 'pointer',
        zIndex: 100
      }}>📷 Screenshot</button>
    </div>
  );
}
