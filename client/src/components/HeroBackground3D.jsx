import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * HeroBackground3D - Scoped Three.js wireframe grid plane for Landing Page Hero
 * - Line material only (no fill/texture)
 * - Very slow autonomous drift/rotation
 * - Subtle mouse & scroll parallax tilt
 * - Strictly subordinate to content (opacity ~0.14)
 * - Comprehensive WebGL resource cleanup on unmount
 */
export default function HeroBackground3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 12);

    // 2. WebGL Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Low-Poly Plane Wireframe Geometry
    // Plane oriented horizontally-tilted like architectural blueprints
    const planeGeo = new THREE.PlaneGeometry(28, 20, 22, 16);
    const wireframeGeo = new THREE.WireframeGeometry(planeGeo);

    // Line material only (no fill/texture) using accent-primary (#1F3D2B) at low opacity
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x1f3d2b,
      transparent: true,
      opacity: 0.13,
      linewidth: 1,
    });

    const wireframeMesh = new THREE.LineSegments(wireframeGeo, lineMaterial);
    // Initial isometric perspective tilt
    const baseRotX = -Math.PI / 3.4;
    const baseRotY = 0;
    const baseRotZ = -Math.PI / 14;

    wireframeMesh.rotation.set(baseRotX, baseRotY, baseRotZ);
    wireframeMesh.position.set(0, -1.2, 0);
    scene.add(wireframeMesh);

    // 4. Parallax & Motion Variables
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let animationFrameId = null;

    const onMouseMove = (e) => {
      // Normalize mouse coordinates from -1 to 1
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // 5. Window Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    // 6. Animation Loop (Drift + Parallax)
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = (performance.now() - startTime) / 1000;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Scroll progress subtle tilt
      const scrollY = window.scrollY || 0;
      const scrollOffset = Math.min(scrollY / 1000, 1) * 0.15;

      // Very slow autonomous drift (barely perceptible) + subtle parallax tilt
      wireframeMesh.rotation.z = baseRotZ + Math.sin(elapsedTime * 0.15) * 0.015;
      wireframeMesh.rotation.x = baseRotX + mouseY * 0.035 - scrollOffset;
      wireframeMesh.rotation.y = baseRotY + mouseX * 0.04;
      wireframeMesh.position.y = -1.2 + Math.cos(elapsedTime * 0.18) * 0.08 - scrollOffset * 1.5;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup and dispose on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);

      // WebGL & Three.js disposal
      planeGeo.dispose();
      wireframeGeo.dispose();
      lineMaterial.dispose();
      scene.remove(wireframeMesh);
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
    />
  );
}
