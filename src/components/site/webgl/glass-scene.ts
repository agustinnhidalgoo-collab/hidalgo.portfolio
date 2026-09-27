import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const BUTTER = new THREE.Color("#F2E6B3");
const COCOA = new THREE.Color("#4B2E21");

export interface GlassSceneOptions {
  canvas: HTMLCanvasElement;
  word: string;
  caption: string;
  mobile: boolean;
}

/** Ruido simplex 3D (Ashima Arts, licencia MIT) para la deformación líquida. */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float liquid(vec3 p){
  return snoise(p*uFreq+vec3(0.0,uTime*0.28,uTime*0.16))*uAmp
       + snoise(p*uFreq*1.9-vec3(uTime*0.2))*uAmp*0.22;
}
vec3 displaced(vec3 p){ return p + normalize(p)*liquid(p); }
`;

/**
 * Escena de la portada: “HIDALGO” en una placa al fondo y, delante, una gota de
 * vidrio líquido con transmisión física (refracción, dispersión cromática y
 * reflejos de un entorno de estudio). Sigue al cursor y se deforma con la velocidad.
 */
export class GlassScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private glass: THREE.Mesh;
  private plate: THREE.Mesh;
  private plateTexture: THREE.CanvasTexture;
  private uniforms = { uTime: { value: 0 }, uAmp: { value: 0.12 }, uFreq: { value: 0.62 } };
  private pointer = new THREE.Vector2(0, 0);
  private target = new THREE.Vector2(0, 0);
  private velocity = 0;
  private progress = 0;
  private timer = new THREE.Timer();
  private raf = 0;
  private running = false;
  private disposed = false;
  private opts: GlassSceneOptions;

  constructor(opts: GlassSceneOptions) {
    this.opts = opts;
    const { canvas, mobile } = opts;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = COCOA.clone();

    // Reflejos de un estudio neutro, con una luz cálida principal.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const key = new THREE.DirectionalLight(BUTTER, 2.2);
    key.position.set(3, 4, 5);
    this.scene.add(key, new THREE.AmbientLight(BUTTER, 0.25));

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8);

    // Placa con la tipografía (se ve refractada a través del vidrio).
    this.plateTexture = new THREE.CanvasTexture(document.createElement("canvas"));
    this.plateTexture.colorSpace = THREE.SRGBColorSpace;
    this.plateTexture.anisotropy = 4;
    this.plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.plateTexture, toneMapped: false }));
    this.plate.position.z = -2.5;
    this.scene.add(this.plate);

    // Gota de vidrio.
    const geometry = new THREE.IcosahedronGeometry(1.15, mobile ? 48 : 96);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1,
      thickness: 1.35,
      roughness: 0.015,
      ior: 1.5,
      dispersion: 2.2,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      attenuationColor: BUTTER,
      attenuationDistance: 6,
      iridescence: 0.35,
      iridescenceIOR: 1.3,
      specularIntensity: 1,
      envMapIntensity: 1.4,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\nuniform float uTime;\nuniform float uAmp;\nuniform float uFreq;\n${NOISE}`)
        .replace(
          "#include <beginnormal_vertex>",
          /* glsl */ `
          vec3 _p = position;
          vec3 _t = normalize(cross(normal, abs(normal.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0)));
          vec3 _b = normalize(cross(normal, _t));
          float _e = 0.01;
          vec3 _d0 = displaced(_p);
          vec3 _d1 = displaced(_p + _t * _e);
          vec3 _d2 = displaced(_p + _b * _e);
          vec3 objectNormal = normalize(cross(_d1 - _d0, _d2 - _d0));
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif
          `,
        )
        .replace("#include <begin_vertex>", "vec3 transformed = displaced(position);");
    };
    this.glass = new THREE.Mesh(geometry, material);
    this.scene.add(this.glass);

    this.resize();
    this.drawPlate();
  }

  /** Dibuja la palabra a todo el ancho visible y una línea de texto técnica. */
  drawPlate() {
    const { word, caption } = this.opts;
    const view = this.viewSizeAt(this.plate.position.z);
    this.plate.scale.set(view.w, view.h, 1);

    const scale = Math.min(window.devicePixelRatio, 2);
    const W = Math.round(Math.min(4096, window.innerWidth * scale * 1.2));
    const H = Math.round((W * view.h) / view.w);
    let canvas = this.plateTexture.image as HTMLCanvasElement;
    if (canvas.width !== W || canvas.height !== H) {
      // Una textura ya subida a la GPU no puede cambiar de tamaño: se crea otra.
      canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      this.plateTexture.dispose();
      this.plateTexture = new THREE.CanvasTexture(canvas);
      this.plateTexture.colorSpace = THREE.SRGBColorSpace;
      this.plateTexture.anisotropy = 4;
      (this.plate.material as THREE.MeshBasicMaterial).map = this.plateTexture;
      (this.plate.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#4B2E21";
    ctx.fillRect(0, 0, W, H);

    // Retícula técnica muy sutil
    ctx.strokeStyle = "rgba(242,230,179,0.07)";
    ctx.lineWidth = Math.max(1, W / 1600);
    const step = W / 24;
    for (let x = step; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = step; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Palabra: se ajusta al 92 % del ancho
    ctx.fillStyle = "#F2E6B3";
    ctx.textBaseline = "alphabetic";
    let size = 100;
    ctx.font = `900 ${size}px "Archivo Variable", Archivo, Arial, sans-serif`;
    const measured = ctx.measureText(word).width;
    size = (size * W * 0.92) / measured;
    ctx.font = `900 ${size}px "Archivo Variable", Archivo, Arial, sans-serif`;
    const m = ctx.measureText(word);
    const textH = m.actualBoundingBoxAscent;
    ctx.fillText(word, (W - m.width) / 2, H / 2 + textH / 2);

    // Leyenda técnica debajo
    const small = Math.max(12, W / 110);
    ctx.font = `700 ${small}px "Archivo Variable", Archivo, Arial, sans-serif`;
    ctx.fillStyle = "rgba(242,230,179,0.75)";
    const capY = H / 2 + textH / 2 + small * 2.6;
    ctx.fillText(caption.toUpperCase(), W * 0.04, capY);
    const right = "[ PORTFOLIO — ES / EN — " + new Date().getFullYear() + " ]";
    ctx.fillText(right, W * 0.96 - ctx.measureText(right).width, capY);

    this.plateTexture.needsUpdate = true;
  }

  private viewSizeAt(z: number) {
    const dist = this.camera.position.z - z;
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist;
    return { w: h * this.camera.aspect, h };
  }

  resize() {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // En pantallas verticales la gota se achica para no tapar todo.
    this.glass.scale.setScalar(this.camera.aspect < 0.8 ? 0.62 : 1);
    this.camera.updateProjectionMatrix();
  }

  /** Posición del cursor normalizada (-1..1). */
  setPointer(x: number, y: number) {
    const nx = x * 2 - 1;
    const ny = -(y * 2 - 1);
    this.velocity = Math.min(1, this.velocity + Math.hypot(nx - this.target.x, ny - this.target.y) * 2);
    this.target.set(nx, ny);
  }

  /** Avance del scroll (0 = portada, 1 = dentro del vidrio). */
  setProgress(p: number) {
    this.progress = p;
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.timer.reset();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.render();
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  renderOnce() {
    this.render();
  }

  private render() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();
    this.uniforms.uTime.value = t;

    // Sigue al cursor con inercia; la velocidad agita el líquido.
    this.pointer.lerp(this.target, 1 - Math.pow(0.001, dt));
    this.velocity *= Math.pow(0.12, dt);
    this.uniforms.uAmp.value = 0.1 + this.velocity * 0.2 + Math.sin(t * 0.7) * 0.02;

    const p = this.progress;
    const baseScale = this.camera.aspect < 0.8 ? 0.62 : 1;
    const range = this.camera.aspect < 0.8 ? 0.5 : 1.3;
    this.glass.position.x = this.pointer.x * range * (1 - p);
    this.glass.position.y = this.pointer.y * range * 0.55 * (1 - p) + Math.sin(t * 0.9) * 0.08;
    this.glass.rotation.x = t * 0.18 + this.pointer.y * 0.4;
    this.glass.rotation.y = t * 0.24 + this.pointer.x * 0.6;
    this.glass.scale.setScalar(baseScale * (1 + p * p * 7));
    this.camera.position.z = 8 - p * 3.5;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.glass.geometry.dispose();
    (this.glass.material as THREE.Material).dispose();
    this.plate.geometry.dispose();
    (this.plate.material as THREE.Material).dispose();
    this.plateTexture.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
