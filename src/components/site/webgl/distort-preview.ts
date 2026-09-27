import * as THREE from "three";

const vertex = /* glsl */ `
uniform vec2 uVel;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  // La lámina se curva en la dirección del movimiento.
  // (coordenadas locales de una lámina 1×1)
  p.x += uVel.x * sin(uv.y * 3.14159) * 0.16;
  p.y -= uVel.y * sin(uv.x * 3.14159) * 0.16;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragment = /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uScaleA;
uniform vec2 uScaleB;
uniform float uMix;
uniform float uAlpha;
uniform float uTime;
uniform vec2 uVel;
varying vec2 vUv;

vec2 cover(vec2 uv, vec2 s) { return (uv - 0.5) * s + 0.5; }

vec3 sampleRGB(sampler2D t, vec2 uv, vec2 s, vec2 shift) {
  float r = texture2D(t, cover(uv + shift, s)).r;
  float g = texture2D(t, cover(uv, s)).g;
  float b = texture2D(t, cover(uv - shift, s)).b;
  return vec3(r, g, b);
}

void main() {
  vec2 uv = vUv;
  float speed = length(uVel);
  // Ondas líquidas durante el cambio de proyecto.
  float trans = sin(uMix * 3.14159);
  uv.x += sin(uv.y * 18.0 + uTime * 5.0) * 0.012 * trans;
  uv.y += cos(uv.x * 14.0 + uTime * 4.0) * 0.012 * trans;
  vec2 shift = uVel * 0.035 + vec2(0.004) * trans;

  vec3 a = sampleRGB(uA, uv, uScaleA, shift);
  vec3 b = sampleRGB(uB, uv, uScaleB, shift);
  // Barrido con borde ondulado de A → B.
  float edge = uMix * 1.3 - 0.15 + sin(uv.x * 9.0 + uTime * 3.0) * 0.04;
  float m = smoothstep(edge + 0.08, edge - 0.08, 1.0 - uv.y);
  vec3 col = mix(a, b, m);
  // Viñeta y leve brillo según la velocidad.
  float vig = smoothstep(1.1, 0.35, length(uv - 0.5));
  col *= mix(0.85, 1.0, vig);
  col += speed * 0.06;
  gl_FragColor = vec4(col, uAlpha);
  #include <colorspace_fragment>
}
`;

/**
 * Vista previa de proyectos que sigue al cursor, dibujada en WebGL: se curva
 * con el movimiento, separa canales de color con la velocidad y cambia de
 * imagen con una onda líquida.
 */
export class DistortPreview {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1000, 1000);
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private textures: THREE.Texture[] = [];
  private loader = new THREE.TextureLoader();
  private pos = new THREE.Vector2(-9999, -9999);
  private target = new THREE.Vector2(-9999, -9999);
  private vel = new THREE.Vector2();
  private current = -1;
  private visible = false;
  private alpha = 0;
  private mix = 1;
  private raf = 0;
  private last = performance.now();
  private width: number;
  private height: number;

  constructor(private canvas: HTMLCanvasElement, urls: string[]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.width = Math.min(420, window.innerWidth * 0.26);
    this.height = this.width * 1.25;

    const blank = new THREE.DataTexture(new Uint8Array([75, 46, 33, 255]), 1, 1);
    blank.needsUpdate = true;
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      uniforms: {
        uA: { value: blank },
        uB: { value: blank },
        uScaleA: { value: new THREE.Vector2(1, 1) },
        uScaleB: { value: new THREE.Vector2(1, 1) },
        uMix: { value: 1 },
        uAlpha: { value: 0 },
        uTime: { value: 0 },
        uVel: { value: new THREE.Vector2() },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 32, 32), this.material);
    this.mesh.scale.set(this.width, this.height, 1);
    this.scene.add(this.mesh);

    this.textures = urls.map((url) => {
      const tex = this.loader.load(url, () => this.updateScales());
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      return tex;
    });
    this.resize();
  }

  private coverScale(tex: THREE.Texture) {
    const img = tex.image as { width?: number; height?: number } | undefined;
    if (!img?.width || !img?.height) return new THREE.Vector2(1, 1);
    const ta = img.width / img.height;
    const pa = this.width / this.height;
    return ta > pa ? new THREE.Vector2(pa / ta, 1) : new THREE.Vector2(1, ta / pa);
  }

  private updateScales() {
    const u = this.material.uniforms;
    u.uScaleA.value = this.coverScale(u.uA.value);
    u.uScaleB.value = this.coverScale(u.uB.value);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.left = 0;
    this.camera.right = w;
    this.camera.top = 0;
    this.camera.bottom = h;
    this.camera.updateProjectionMatrix();
  }

  move(x: number, y: number) {
    this.target.set(x, y);
    if (this.pos.x < -9000) this.pos.set(x, y);
    this.ensureLoop();
  }

  show(index: number) {
    const tex = this.textures[index];
    if (!tex) return;
    const u = this.material.uniforms;
    if (!this.visible || this.current === -1) {
      u.uA.value = tex;
      u.uB.value = tex;
      this.mix = 1;
    } else if (index !== this.current) {
      u.uA.value = u.uB.value;
      u.uB.value = tex;
      this.mix = 0;
    }
    this.updateScales();
    this.current = index;
    this.visible = true;
    this.ensureLoop();
  }

  hide() {
    this.visible = false;
    this.ensureLoop();
  }

  private ensureLoop() {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      const prev = this.pos.clone();
      this.pos.lerp(this.target, 1 - Math.pow(0.0005, dt));
      const v = this.pos.clone().sub(prev).divideScalar(Math.max(dt, 0.001) * 1400);
      this.vel.lerp(v.clampScalar(-1, 1), 0.2);
      this.alpha += ((this.visible ? 1 : 0) - this.alpha) * (1 - Math.pow(0.002, dt));
      this.mix = Math.min(1, this.mix + dt * 1.6);

      const u = this.material.uniforms;
      u.uTime.value = now / 1000;
      u.uVel.value.copy(this.vel);
      u.uAlpha.value = this.alpha;
      u.uMix.value = this.mix;
      this.mesh.position.set(this.pos.x, this.pos.y, 0);
      this.mesh.rotation.z = -this.vel.x * 0.12;
      this.mesh.scale.set(this.width * (0.85 + this.alpha * 0.15), -this.height * (0.85 + this.alpha * 0.15), 1);
      this.renderer.render(this.scene, this.camera);

      const idle = !this.visible && this.alpha < 0.01 && this.vel.length() < 0.001;
      if (idle) {
        this.raf = 0;
        this.renderer.clear();
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.textures.forEach((t) => t.dispose());
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
