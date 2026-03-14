/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Vector3,
  MeshPhysicalMaterial,
  InstancedMesh,
  Clock,
  AmbientLight,
  SphereGeometry,
  ShaderChunk,
  Scene,
  Color,
  Object3D,
  SRGBColorSpace,
  MathUtils,
  PMREMGenerator,
  Vector2,
  WebGLRenderer,
  PerspectiveCamera,
  PointLight,
  ACESFilmicToneMapping,
  Plane,
  Raycaster
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

class ThreeApp {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  cameraMinAspect?: number;
  cameraMaxAspect?: number;
  cameraFov: number;
  maxPixelRatio?: number;
  minPixelRatio?: number;
  scene: Scene;
  renderer!: WebGLRenderer;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render!: () => void;
  onBeforeRender = (_time: { elapsed: number; delta: number }) => { void _time; };
  onAfterRender = (_time: { elapsed: number; delta: number }) => { void _time; };
  onAfterResize = (_size: any) => { void _size; };
  private isVisible = false;
  private isRunning = false;
  isDisposed = false;
  private intersectionObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private resizeTimeout?: NodeJS.Timeout;
  private clock = new Clock();
  private time = { elapsed: 0, delta: 0 };
  private animationFrameId?: number;
  private config: any;

  constructor(config: any) {
    this.config = { ...config };
    this.camera = new PerspectiveCamera();
    this.cameraFov = this.camera.fov;
    this.scene = new Scene();
    
    if (this.config.canvas) {
      this.canvas = this.config.canvas;
    } else {
      throw new Error('Three: Missing canvas parameter');
    }
    
    this.canvas.style.display = 'block';
    const rendererOptions = {
      canvas: this.canvas,
      powerPreference: 'high-performance' as const,
      antialias: false,
      alpha: true,
      ...(this.config.rendererOptions ?? {})
    };
    
    try {
      this.renderer = new WebGLRenderer(rendererOptions);
      this.renderer.outputColorSpace = SRGBColorSpace;
    } catch (error) {
      console.warn('WebGL initialization failed, BallPit disabled:', error);
      this.isDisposed = true;
      return;
    }
    
    this.render = this.defaultRender.bind(this);
    this.setupObservers();
  }

  private setupObservers() {
    if (this.isDisposed) return;
    
    if (!(this.config.size instanceof Object)) {
      window.addEventListener('resize', this.handleResize.bind(this));
      if (this.config.size === 'parent' && this.canvas.parentNode) {
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.canvas.parentNode as Element);
      }
    }
    this.intersectionObserver = new IntersectionObserver(this.handleIntersection.bind(this), {
      root: null,
      rootMargin: '0px',
      threshold: 0
    });
    this.intersectionObserver.observe(this.canvas);
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    this.isVisible = entries[0].isIntersecting;
    if (this.isVisible) {
      this.start();
    } else {
      this.stop();
    }
  }

  private handleVisibilityChange() {
    if (this.isVisible) {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    }
  }

  private handleResize() {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(this.resize.bind(this), 100);
  }

  resize() {
    let width, height;
    if (this.config.size instanceof Object) {
      width = this.config.size.width;
      height = this.config.size.height;
    } else if (this.config.size === 'parent' && this.canvas.parentNode) {
      width = (this.canvas.parentNode as HTMLElement).offsetWidth;
      height = (this.canvas.parentNode as HTMLElement).offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    this.size.width = width;
    this.size.height = height;
    this.size.ratio = width / height;
    this.updateCamera();
    this.updateRenderer();
    this.onAfterResize(this.size);
  }

  private updateCamera() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.adjustFov(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.adjustFov(this.cameraMaxAspect);
      } else {
        this.camera.fov = this.cameraFov;
      }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }

  private adjustFov(targetAspect: number) {
    const tan = Math.tan(MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / targetAspect);
    this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(tan));
  }

  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const fov = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(fov / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    }
  }

  private updateRenderer() {
    this.renderer.setSize(this.size.width, this.size.height);
    let pixelRatio = window.devicePixelRatio;
    if (this.maxPixelRatio && pixelRatio > this.maxPixelRatio) {
      pixelRatio = this.maxPixelRatio;
    } else if (this.minPixelRatio && pixelRatio < this.minPixelRatio) {
      pixelRatio = this.minPixelRatio;
    }
    this.renderer.setPixelRatio(pixelRatio);
    this.size.pixelRatio = pixelRatio;
  }

  private start() {
    if (this.isRunning) return;
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.time.delta = this.clock.getDelta();
      this.time.elapsed += this.time.delta;
      this.onBeforeRender(this.time);
      this.render();
      this.onAfterRender(this.time);
    };
    this.isRunning = true;
    this.clock.start();
    animate();
  }

  private stop() {
    if (this.isRunning && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.isRunning = false;
      this.clock.stop();
    }
  }

  private defaultRender() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    this.stop();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.isDisposed = true;
  }
}

const pointerMap = new Map();
const currentPointer = new Vector2();
let listenersAdded = false;

function createPointer(config: any) {
  const pointer = {
    position: new Vector2(),
    nPosition: new Vector2(),
    hover: false,
    touching: false,
    onEnter: () => {},
    onMove: () => {},
    onClick: () => {},
    onLeave: () => {},
    dispose: () => {},
    ...config
  };

  if (!pointerMap.has(config.domElement)) {
    pointerMap.set(config.domElement, pointer);
    if (!listenersAdded) {
      document.body.addEventListener('pointermove', handlePointerMove);
      document.body.addEventListener('pointerleave', handlePointerLeave);
      document.body.addEventListener('click', handleClick);
      document.body.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.body.addEventListener('touchend', handleTouchEnd, { passive: false });
      listenersAdded = true;
    }
  }

  pointer.dispose = () => {
    pointerMap.delete(config.domElement);
    if (pointerMap.size === 0) {
      document.body.removeEventListener('pointermove', handlePointerMove);
      document.body.removeEventListener('pointerleave', handlePointerLeave);
      document.body.removeEventListener('click', handleClick);
      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchmove', handleTouchMove);
      document.body.removeEventListener('touchend', handleTouchEnd);
      listenersAdded = false;
    }
  };

  return pointer;
}

function handlePointerMove(e: PointerEvent) {
  currentPointer.x = e.clientX;
  currentPointer.y = e.clientY;
  processInteraction();
}

function processInteraction() {
  for (const [elem, pointer] of pointerMap) {
    const rect = elem.getBoundingClientRect();
    if (isInside(rect)) {
      updatePointerPosition(pointer, rect);
      if (!pointer.hover) {
        pointer.hover = true;
        pointer.onEnter(pointer);
      }
      pointer.onMove(pointer);
    } else if (pointer.hover && !pointer.touching) {
      pointer.hover = false;
      pointer.onLeave(pointer);
    }
  }
}

function handleClick(e: MouseEvent) {
  currentPointer.x = e.clientX;
  currentPointer.y = e.clientY;
  for (const [elem, pointer] of pointerMap) {
    const rect = elem.getBoundingClientRect();
    updatePointerPosition(pointer, rect);
    if (isInside(rect)) pointer.onClick(pointer);
  }
}

function handlePointerLeave() {
  for (const pointer of pointerMap.values()) {
    if (pointer.hover) {
      pointer.hover = false;
      pointer.onLeave(pointer);
    }
  }
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length > 0) {
    e.preventDefault();
    currentPointer.x = e.touches[0].clientX;
    currentPointer.y = e.touches[0].clientY;
    for (const [elem, pointer] of pointerMap) {
      const rect = elem.getBoundingClientRect();
      if (isInside(rect)) {
        pointer.touching = true;
        updatePointerPosition(pointer, rect);
        if (!pointer.hover) {
          pointer.hover = true;
          pointer.onEnter(pointer);
        }
        pointer.onMove(pointer);
      }
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length > 0) {
    e.preventDefault();
    currentPointer.x = e.touches[0].clientX;
    currentPointer.y = e.touches[0].clientY;
    for (const [elem, pointer] of pointerMap) {
      const rect = elem.getBoundingClientRect();
      updatePointerPosition(pointer, rect);
      if (isInside(rect)) {
        if (!pointer.hover) {
          pointer.hover = true;
          pointer.touching = true;
          pointer.onEnter(pointer);
        }
        pointer.onMove(pointer);
      } else if (pointer.hover && pointer.touching) {
        pointer.onMove(pointer);
      }
    }
  }
}

function handleTouchEnd() {
  for (const pointer of pointerMap.values()) {
    if (pointer.touching) {
      pointer.touching = false;
      if (pointer.hover) {
        pointer.hover = false;
        pointer.onLeave(pointer);
      }
    }
  }
}

function updatePointerPosition(pointer: any, rect: DOMRect) {
  pointer.position.x = currentPointer.x - rect.left;
  pointer.position.y = currentPointer.y - rect.top;
  pointer.nPosition.x = (pointer.position.x / rect.width) * 2 - 1;
  pointer.nPosition.y = (-pointer.position.y / rect.height) * 2 + 1;
}

function isInside(rect: DOMRect) {
  const { x, y } = currentPointer;
  return x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
}

const { randFloat, randFloatSpread } = MathUtils;

class Physics {
  config: any;
  positionData: Float32Array;
  velocityData: Float32Array;
  sizeData: Float32Array;
  center = new Vector3();

  constructor(config: any) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.initPositions();
    this.setSizes();
  }

  private initPositions() {
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const idx = 3 * i;
      positionData[idx] = randFloatSpread(2 * config.maxX);
      positionData[idx + 1] = randFloatSpread(2 * config.maxY);
      positionData[idx + 2] = randFloatSpread(2 * config.maxZ);
    }
  }

  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = randFloat(config.minSize, config.maxSize);
    }
  }

  update(time: { delta: number }) {
    const { config, center, positionData, sizeData, velocityData } = this;
    const pos = new Vector3();
    const vel = new Vector3();
    const otherPos = new Vector3();
    const otherVel = new Vector3();
    const diff = new Vector3();
    const push = new Vector3();
    const velPush = new Vector3();
    const otherVelPush = new Vector3();
    const centerPos = new Vector3();

    let startIdx = 0;
    if (config.controlSphere0) {
      startIdx = 1;
      centerPos.fromArray(positionData, 0);
      centerPos.lerp(center, 0.1).toArray(positionData, 0);
      new Vector3(0, 0, 0).toArray(velocityData, 0);
    }

    for (let i = startIdx; i < config.count; i++) {
      const idx = 3 * i;
      pos.fromArray(positionData, idx);
      vel.fromArray(velocityData, idx);
      vel.y -= time.delta * config.gravity * sizeData[i];
      vel.multiplyScalar(config.friction);
      vel.clampLength(0, config.maxVelocity);
      pos.add(vel);
      pos.toArray(positionData, idx);
      vel.toArray(velocityData, idx);
    }

    for (let i = startIdx; i < config.count; i++) {
      const idx = 3 * i;
      pos.fromArray(positionData, idx);
      vel.fromArray(velocityData, idx);
      const radius = sizeData[i];

      for (let j = i + 1; j < config.count; j++) {
        const otherIdx = 3 * j;
        otherPos.fromArray(positionData, otherIdx);
        otherVel.fromArray(velocityData, otherIdx);
        const otherRadius = sizeData[j];
        diff.copy(otherPos).sub(pos);
        const dist = diff.length();
        const sumRadius = radius + otherRadius;
        
        // 增加碰撞判断：如果其中一个球是彩蛋（索引 1），且它已经被点击“破裂”，则不再参与碰撞。
        // 或者简单点，我们这里直接计算碰撞。为了让彩蛋不受拨动影响，我们已经在下面排除了 controlSphere0。
        // 但为了让彩蛋更稳固，我们可以减小其他球对它的推力影响，或者让它的质量表现得很大。
        // 但为了保持简单且响应点击，暂时保持原生碰撞，仅在被光标（索引 0）交互时忽略它。
        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          push.copy(diff).normalize().multiplyScalar(0.5 * overlap);
          velPush.copy(push).multiplyScalar(Math.max(vel.length(), 1));
          otherVelPush.copy(push).multiplyScalar(Math.max(otherVel.length(), 1));
          
          // 如果 i 是 1（彩蛋），它不受推力影响
          if (i !== 1) {
            pos.sub(push);
            vel.sub(velPush);
            pos.toArray(positionData, idx);
            vel.toArray(velocityData, idx);
          }
          
          // 如果 j 是 1（彩蛋），它不受推力影响
          if (j !== 1) {
            otherPos.add(push);
            otherVel.add(otherVelPush);
            otherPos.toArray(positionData, otherIdx);
            otherVel.toArray(velocityData, otherIdx);
          }
        }
      }

      if (config.controlSphere0) {
        // 如果是彩蛋球（索引1），让它免疫鼠标推力
        if (i !== 1) {
          diff.copy(centerPos).sub(pos);
          const dist = diff.length();
          const sumRadius0 = radius + sizeData[0];
          if (dist < sumRadius0) {
            const overlap = sumRadius0 - dist;
            push.copy(diff.normalize()).multiplyScalar(overlap);
            velPush.copy(push).multiplyScalar(Math.max(vel.length(), 2));
            pos.sub(push);
            vel.sub(velPush);
          }
        }
      }

      if (Math.abs(pos.x) + radius > config.maxX) {
        pos.x = Math.sign(pos.x) * (config.maxX - radius);
        vel.x = -vel.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(pos.y) + radius > config.maxY) {
          pos.y = Math.sign(pos.y) * (config.maxY - radius);
          vel.y = -vel.y * config.wallBounce;
        }
      } else if (pos.y - radius < -config.maxY) {
        pos.y = -config.maxY + radius;
        vel.y = -vel.y * config.wallBounce;
      }
      const maxBoundary = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(pos.z) + radius > maxBoundary) {
        pos.z = Math.sign(pos.z) * (config.maxZ - radius);
        vel.z = -vel.z * config.wallBounce;
      }
      pos.toArray(positionData, idx);
      vel.toArray(velocityData, idx);
    }
  }
}

class SubsurfaceMaterial extends MeshPhysicalMaterial {
  uniforms: any;

  constructor(params?: any) {
    super(params);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 }
    };
    this.defines = this.defines || {};
    this.defines.USE_UV = '';
    
    this.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader =
        `
        uniform float thicknessPower;
        uniform float thicknessScale;
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
      ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `
        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          #ifdef USE_COLOR
            // 根据 Three.js 的不同版本，vColor 可能是 vec3 也可能是 vec4。为了兼容，我们将其转换为 vec3。
            vec3 vColor3 = vec3(vColor);
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor3;
          #else
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuseColor.rgb;
          #endif
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }

        void main() {
      `
      );
      const lightsFragment = ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        `
          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', lightsFragment);
    };
  }
}

const defaultConfig = {
  count: 200,
  colors: [0xff6b9d, 0xffa500, 0xffd93d, 0x6bcf7f, 0x4ecdc4, 0x45b7d1, 0xa78bfa, 0xf472b6],
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: {
    metalness: 0.5,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.15
  },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

const tempObject = new Object3D();

class Spheres extends InstancedMesh {
  config: any;
  physics: Physics;
  ambientLight: AmbientLight;
  light: PointLight;

  constructor(renderer: WebGLRenderer, config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    const roomEnv = new RoomEnvironment();
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envMap = pmremGenerator.fromScene(roomEnv).texture;
    const geometry = new SphereGeometry();
    const material = new SubsurfaceMaterial({ envMap, ...finalConfig.materialParams });
    material.envMapRotation.x = -Math.PI / 2;
    super(geometry, material, finalConfig.count);
    this.config = finalConfig;
    this.physics = new Physics(finalConfig);
    this.ambientLight = new AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    this.add(this.ambientLight);
    // 缩小跟随鼠标的光源：使用白色，降低强度，并增加距离衰减
    this.light = new PointLight(0xffffff, 80, 8);
    this.add(this.light);

    this.setColors(finalConfig.colors);
  }

  setColors(colors: number[]) {
    if (Array.isArray(colors) && colors.length > 1) {
      const colorArray = colors.map(c => new Color(c));
      for (let i = 0; i < this.count; i++) {
        let color;
        // 索引 1 作为绿色彩蛋球，索引 0 是不可见的鼠标跟随器
        if (i === 1) {
          color = new Color(0x39ff14); // 极其鲜艳的霓虹绿
        } else {
          const ratio = i / (this.count - 1);
          const scaledIdx = ratio * (colors.length - 1);
          const idx = Math.floor(scaledIdx);
          const alpha = scaledIdx - idx;
          const startColor = colorArray[idx];
          const endColor = idx >= colors.length - 1 ? startColor : colorArray[idx + 1];
          color = new Color().copy(startColor).lerp(endColor, alpha);
        }
        
        this.setColorAt(i, color);
      }
      if (this.instanceColor) this.instanceColor.needsUpdate = true;
    }
  }

  update(time: { delta: number }) {
    this.physics.update(time);

    // 动态更新彩蛋颜色（实例 1），实现渐变炫彩效果
    if (this.physics.sizeData[1] > 0) {
      const hue = (performance.now() * 0.001) % 1; // 变化速度加快一点
      const eggColor = new Color().setHSL(hue, 1, 0.6);
      this.setColorAt(1, eggColor);
    }
    
    if (this.instanceColor) this.instanceColor.needsUpdate = true;

    for (let i = 0; i < this.count; i++) {
      tempObject.position.fromArray(this.physics.positionData, 3 * i);
      // 永远隐藏索引为 0 的球体（它只作为碰撞体积和光源跟随鼠标）
      if (i === 0) {
        tempObject.scale.setScalar(0);
      } else if (i === 1) {
        // 彩蛋变为原来的1.2倍大，且当 sizeData 为 0 时消失
        if (this.physics.sizeData[1] > 0) {
          tempObject.scale.setScalar(this.physics.sizeData[1] * 1.2);
        } else {
          tempObject.scale.setScalar(0);
        }
      } else {
        tempObject.scale.setScalar(this.physics.sizeData[i]);
      }
      tempObject.updateMatrix();
      this.setMatrixAt(i, tempObject.matrix);
      if (i === 0) this.light.position.copy(tempObject.position);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

function createBallpit(canvas: HTMLCanvasElement, config = {}) {
  const app = new ThreeApp({
    canvas,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true }
  });
  let spheres: Spheres;
  app.renderer.toneMapping = ACESFilmicToneMapping;
  app.camera.position.set(0, 0, 20);
  app.camera.lookAt(0, 0, 0);
  app.cameraMaxAspect = 1.5;
  app.resize();
  
  function initialize(cfg: any) {
    if (spheres) {
      app.scene.remove(spheres);
    }
    spheres = new Spheres(app.renderer, cfg);
    app.scene.add(spheres);
  }
  
  initialize(config);

  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const intersection = new Vector3();
  let paused = false;

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';

  const pointer = createPointer({
    domElement: canvas,
    onMove() {
      raycaster.setFromCamera(pointer.nPosition, app.camera);
      app.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersection);
      spheres.physics.center.copy(intersection);
      spheres.config.controlSphere0 = true;
    },
    onLeave() {
      spheres.config.controlSphere0 = false;
    },
    onClick() {
      // 当点击时检测是否命中了绿色彩蛋球 (实例 1)
      raycaster.setFromCamera(pointer.nPosition, app.camera);
      const intersects = raycaster.intersectObject(spheres);
      if (intersects.length > 0 && intersects[0].instanceId === 1) {
        
        // 确保它没有已经被点击过（可以通过判断它的大小是否大于 0）
        if (spheres.physics.sizeData[1] <= 0) return;

        // 触发彩带效果
        const defaults = {
          spread: 360,
          ticks: 100,
          gravity: 1,
          decay: 0.94,
          startVelocity: 30,
          colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"],
          zIndex: 9999
        };

        function shoot() {
          confetti({
            ...defaults,
            particleCount: 40,
            scalar: 1.2,
            shapes: ["circle"]
          });

          confetti({
            ...defaults,
            particleCount: 10,
            scalar: 0.75,
            shapes: ["circle", "square"]
          });
        }

        setTimeout(shoot, 0);
        setTimeout(shoot, 100);
        setTimeout(shoot, 200);

        // “破裂”效果：将该彩蛋球缩小至 0，使其消失，并不再参与后续碰撞
        spheres.physics.sizeData[1] = 0;
        
        // 给周围的球施加一个爆炸的力（可选）
        const eggPos = new Vector3().fromArray(spheres.physics.positionData, 3 * 1);
        const force = new Vector3();
        for (let i = 2; i < spheres.config.count; i++) {
          const otherPos = new Vector3().fromArray(spheres.physics.positionData, 3 * i);
          const dist = eggPos.distanceTo(otherPos);
          if (dist < 3) {
            force.copy(otherPos).sub(eggPos).normalize().multiplyScalar((3 - dist) * 2);
            spheres.physics.velocityData[3 * i] += force.x;
            spheres.physics.velocityData[3 * i + 1] += force.y;
            spheres.physics.velocityData[3 * i + 2] += force.z;
          }
        }
      }
    }
  });

  app.onBeforeRender = (time) => {
    if (!paused) spheres.update(time);
  };

  app.onAfterResize = (size) => {
    spheres.config.maxX = size.wWidth / 2;
    spheres.config.maxY = size.wHeight / 2;
  };

  return {
    three: app,
    get spheres() {
      return spheres;
    },
    setCount(count: number) {
      initialize({ ...spheres.config, count });
    },
    togglePause() {
      paused = !paused;
    },
    dispose() {
      pointer.dispose();
      app.dispose();
    }
  };
}

export interface BallPitProps {
  className?: string;
  count?: number;
  gravity?: number;
  friction?: number;
  wallBounce?: number;
  followCursor?: boolean;
  colors?: number[];
}

export function BallPit({ className = '', followCursor = true, count = 250, gravity = 0.8, friction = 0.9975, wallBounce = 0.95, colors, ...props }: BallPitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config: any = { followCursor, count, gravity, friction, wallBounce, ...props };
    if (colors) config.colors = colors;

    try {
      instanceRef.current = createBallpit(canvas, config);
      if (instanceRef.current?.three?.isDisposed) {
        setFailed(true);
      }
    } catch (error) {
      console.warn('BallPit creation failed:', error);
      setFailed(true);
    }

    return () => {
      if (instanceRef.current) {
        try {
          instanceRef.current.dispose();
        } catch {
          // Ignore disposal errors
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return null;

  return <canvas className={className} ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
