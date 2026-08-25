const vertexShader = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime, uAttenuation, uLineThickness;
uniform float uBaseRadius, uRadiusStep, uScaleRate;
uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
uniform float uFadeIn, uFadeOut;
uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
uniform vec2 uResolution, uMouse;
uniform vec3 uColor, uColorTwo;
uniform int uRingCount;

const float HP = 1.5707963;
const float CYCLE = 3.45;

float fade(float t) {
  return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);
}

float ring(vec2 p, float ri, float cut, float t0, float px) {
  float t = mod(uTime + t0, CYCLE);
  float r = ri + t / CYCLE * uScaleRate;
  float d = abs(length(p) - r);
  float a = atan(abs(p.y), abs(p.x)) / HP;
  float th = max(1.0 - a, 0.5) * px * uLineThickness;
  float h = 1.0 - smoothstep(th, th * 1.5, d);
  d += pow(cut * a, 3.0) * r;
  return h * exp(-uAttenuation * d) * fade(t);
}

void main() {
  float px = 1.0 / min(uResolution.x, uResolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;
  float cr = cos(uRotation), sr = sin(uRotation);
  p = mat2(cr, -sr, sr, cr) * p;
  p -= uMouse * uMouseInfluence;
  float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
  p /= sc;
  vec3 c = vec3(0.0);
  float rcf = max(float(uRingCount) - 1.0, 1.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);
    vec2 pr = p - fi * uParallax * uMouse;
    vec3 rc = mix(uColor, uColorTwo, fi / rcf);
    c = mix(c, rc, vec3(ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px)));
  }
  c *= 1.0 + uBurst * 2.0;
  float ringMask = max(c.r, max(c.g, c.b));
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uNoiseAmount * max(ringMask, 0.0);
  gl_FragColor = vec4(c, max(ringMask, 0.0) * uOpacity);
}
`;

class MagicRings {
  constructor(selector, options = {}) {
    this.container = document.querySelector(selector);
    if (!this.container) {
      console.warn('MagicRings: container not found', selector);
      return;
    }

    this.props = {
      color: options.color || '#fc42ff',
      colorTwo: options.colorTwo || '#42fcff',
      speed: options.speed || 1,
      ringCount: options.ringCount || 6,
      attenuation: options.attenuation || 10,
      lineThickness: options.lineThickness || 2,
      baseRadius: options.baseRadius || 0.35,
      radiusStep: options.radiusStep || 0.1,
      scaleRate: options.scaleRate || 0.1,
      opacity: options.opacity || 1,
      blur: options.blur || 0,
      noiseAmount: options.noiseAmount || 0.1,
      rotation: options.rotation || 0,
      ringGap: options.ringGap || 1.5,
      fadeIn: options.fadeIn || 0.7,
      fadeOut: options.fadeOut || 0.5,
      followMouse: options.followMouse !== undefined ? options.followMouse : false,
      mouseInfluence: options.mouseInfluence || 0.2,
      hoverScale: options.hoverScale || 1.2,
      parallax: options.parallax || 0.05,
      clickBurst: options.clickBurst !== undefined ? options.clickBurst : false
    };

    this.mouse = [0, 0];
    this.smoothMouse = [0, 0];
    this.hoverAmount = 0;
    this.isHovered = false;
    this.burst = 0;
    this.elapsed = 0;
    this.lastTime = 0;
    this.frameId = 0;
    this.isVisible = false;
    this.isPageVisible = !document.hidden;

    this.init();
  }

  init() {
    const mount = this.container;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      console.warn('MagicRings: WebGL not supported');
      return;
    }

    if (!renderer.capabilities.isWebGL2) {
      renderer.dispose();
      console.warn('MagicRings: WebGL2 required');
      return;
    }

    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;
    this.scene = scene;
    this.camera = camera;

    this.uniforms = {
      uTime: { value: 0 },
      uAttenuation: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Color() },
      uColorTwo: { value: new THREE.Color() },
      uLineThickness: { value: 0 },
      uBaseRadius: { value: 0 },
      uRadiusStep: { value: 0 },
      uScaleRate: { value: 0 },
      uRingCount: { value: 0 },
      uOpacity: { value: 1 },
      uNoiseAmount: { value: 0 },
      uRotation: { value: 0 },
      uRingGap: { value: 1.6 },
      uFadeIn: { value: 0.5 },
      uFadeOut: { value: 0.75 },
      uMouse: { value: new THREE.Vector2() },
      uMouseInfluence: { value: 0 },
      uHoverAmount: { value: 0 },
      uHoverScale: { value: 1 },
      uParallax: { value: 0 },
      uBurst: { value: 0 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.material = material;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    scene.add(quad);
    this.quad = quad;

    this.resize();
    this.bindEvents();
    this.tryStart();
  }

  setColors(color, colorTwo) {
    this.props.color = color;
    this.props.colorTwo = colorTwo;
  }

  resize() {
    const mount = this.container;
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(dpr);
    this.uniforms.uResolution.value.set(w * dpr, h * dpr);
  }

  bindEvents() {
    const mount = this.container;

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(mount);

    this.onMouseMove = (e) => {
      const rect = mount.getBoundingClientRect();
      this.mouse[0] = (e.clientX - rect.left) / rect.width - 0.5;
      this.mouse[1] = -((e.clientY - rect.top) / rect.height - 0.5);
    };
    this.onMouseEnter = () => { this.isHovered = true; };
    this.onMouseLeave = () => {
      this.isHovered = false;
      this.mouse[0] = 0;
      this.mouse[1] = 0;
    };
    this.onClick = () => { this.burst = 1; };

    mount.addEventListener('mousemove', this.onMouseMove);
    mount.addEventListener('mouseenter', this.onMouseEnter);
    mount.addEventListener('mouseleave', this.onMouseLeave);
    mount.addEventListener('click', this.onClick);

    this.onVisibilityChange = () => {
      this.isPageVisible = !document.hidden;
      this.isPageVisible ? this.tryStart() : this.tryStop();
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry.isIntersecting;
        this.isVisible ? this.tryStart() : this.tryStop();
      },
      { threshold: 0 }
    );
    this.intersectionObserver.observe(mount);
  }

  animate(time) {
    this.frameId = requestAnimationFrame(this.animate.bind(this));
    const p = this.props;

    const dt = this.lastTime === 0 ? 0 : Math.min(time - this.lastTime, 100);
    this.lastTime = time;
    this.elapsed += dt * 0.001 * p.speed;

    this.smoothMouse[0] += (this.mouse[0] - this.smoothMouse[0]) * 0.08;
    this.smoothMouse[1] += (this.mouse[1] - this.smoothMouse[1]) * 0.08;
    this.hoverAmount += ((this.isHovered ? 1 : 0) - this.hoverAmount) * 0.08;
    this.burst *= 0.95;
    if (this.burst < 0.001) this.burst = 0;

    this.uniforms.uTime.value = this.elapsed;
    this.uniforms.uAttenuation.value = p.attenuation;
    this.uniforms.uColor.value.set(p.color);
    this.uniforms.uColorTwo.value.set(p.colorTwo);
    this.uniforms.uLineThickness.value = p.lineThickness;
    this.uniforms.uBaseRadius.value = p.baseRadius;
    this.uniforms.uRadiusStep.value = p.radiusStep;
    this.uniforms.uScaleRate.value = p.scaleRate;
    this.uniforms.uRingCount.value = p.ringCount;
    this.uniforms.uOpacity.value = p.opacity;
    this.uniforms.uNoiseAmount.value = p.noiseAmount;
    this.uniforms.uRotation.value = (p.rotation * Math.PI) / 180;
    this.uniforms.uRingGap.value = p.ringGap;
    this.uniforms.uFadeIn.value = p.fadeIn;
    this.uniforms.uFadeOut.value = p.fadeOut;
    this.uniforms.uMouse.value.set(this.smoothMouse[0], this.smoothMouse[1]);
    this.uniforms.uMouseInfluence.value = p.followMouse ? p.mouseInfluence : 0;
    this.uniforms.uHoverAmount.value = this.hoverAmount;
    this.uniforms.uHoverScale.value = p.hoverScale;
    this.uniforms.uParallax.value = p.parallax;
    this.uniforms.uBurst.value = p.clickBurst ? this.burst : 0;

    this.renderer.render(this.scene, this.camera);
  }

  tryStart() {
    if (this.isVisible && this.isPageVisible && this.frameId === 0) {
      this.lastTime = 0;
      this.frameId = requestAnimationFrame(this.animate.bind(this));
    }
  }

  tryStop() {
    if (this.frameId !== 0) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  destroy() {
    this.tryStop();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();

    const mount = this.container;
    mount.removeEventListener('mousemove', this.onMouseMove);
    mount.removeEventListener('mouseenter', this.onMouseEnter);
    mount.removeEventListener('mouseleave', this.onMouseLeave);
    mount.removeEventListener('click', this.onClick);

    if (this.renderer) {
      mount.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
    this.material?.dispose();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MagicRings;
}