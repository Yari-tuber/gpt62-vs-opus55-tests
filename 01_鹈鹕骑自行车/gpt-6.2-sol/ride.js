(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const app = document.getElementById("ride");
  const status = document.getElementById("loading");
  const playButton = document.getElementById("play");
  const bellButton = document.getElementById("bell");
  const lightButton = document.getElementById("sunlight");
  const range = document.getElementById("pace");
  const buttons = Array.from(document.querySelectorAll("[data-view]"));

  function createKit(T) {
    const vec = (x, y, z) => new T.Vector3(x, y, z);
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const mix = (a, b, t) => a + (b - a) * t;
    const standard = (color, roughness, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const sphere = new T.SphereGeometry(1, 30, 20);
    const cylinder = new T.CylinderGeometry(1, 1, 1, 13);
    const up = vec(0, 1, 0);
    let state = 3327183;

    function random() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    }

    function solid(parent, geometry, material) {
      const mesh = new T.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function globe(parent, center, scale, material) {
      const mesh = solid(parent, sphere, material);
      mesh.position.copy(center);
      mesh.scale.fromArray(scale);
      return mesh;
    }

    function rod(parent, start, end, radius, material) {
      const mesh = solid(parent, cylinder, material);
      const delta = end.clone().sub(start);
      mesh.scale.set(radius, delta.length(), radius);
      mesh.position.copy(start).lerp(end, .5);
      mesh.quaternion.setFromUnitVectors(up, delta.normalize());
      return mesh;
    }

    function pipe(parent, points, radius, material, segments = 20, sides = 10) {
      const path = new T.CatmullRomCurve3(points);
      return solid(parent, new T.TubeGeometry(path, segments, radius, sides, false), material);
    }

    function hoop(parent, center, radius, thickness, material, segments = 64) {
      const mesh = solid(parent, new T.TorusGeometry(radius, thickness, 9, segments), material);
      mesh.position.copy(center);
      return mesh;
    }

    return { T, vec, clamp, mix, standard, solid, globe, rod, pipe, hoop, random, dummy: new T.Object3D() };
  }

  function createReflectionMap(T) {
    const image = document.createElement("canvas");
    image.width = 256;
    image.height = 128;
    const ctx = image.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, image.height);
    gradient.addColorStop(0, "#889fb4");
    gradient.addColorStop(.38, "#a9b7c2");
    gradient.addColorStop(.54, "#d0a789");
    gradient.addColorStop(.60, "#695b61");
    gradient.addColorStop(1, "#39313e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, image.width, image.height);
    const panels = [[64, 42, 32, "#ffecd2"], [169, 36, 26, "#f2f5ff"], [231, 60, 28, "#f5ba88"]];
    for (const [x, y, radius, color] of panels) {
      const glare = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glare.addColorStop(0, color);
      glare.addColorStop(.27, color + "dd");
      glare.addColorStop(1, color + "00");
      ctx.fillStyle = glare;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    const map = new T.CanvasTexture(image);
    map.mapping = T.EquirectangularReflectionMapping;
    map.colorSpace = T.SRGBColorSpace;
    return map;
  }

  function addContactShadows(T, scene) {
    const image = document.createElement("canvas");
    image.width = image.height = 128;
    const ctx = image.getContext("2d");
    const diffuse = ctx.createRadialGradient(64, 64, 2, 64, 64, 63);
    diffuse.addColorStop(0, "rgba(17,10,15,.80)");
    diffuse.addColorStop(.40, "rgba(17,10,15,.51)");
    diffuse.addColorStop(.76, "rgba(17,10,15,.14)");
    diffuse.addColorStop(1, "rgba(17,10,15,0)");
    ctx.fillStyle = diffuse;
    ctx.fillRect(0, 0, 128, 128);
    const map = new T.CanvasTexture(image);
    map.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshBasicMaterial({ map, transparent: true, opacity: .65, depthWrite: false });
    for (const x of [-1.225, 1.185]) {
      const mesh = new T.Mesh(new T.PlaneGeometry(.82, .62), material);
      mesh.position.set(x, .005, 0);
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
    }
    const beneath = new T.Mesh(new T.PlaneGeometry(3.6, 1.55), material.clone());
    beneath.material.opacity = .49;
    beneath.position.set(-.05, .004, -.05);
    beneath.rotation.x = -Math.PI / 2;
    scene.add(beneath);
  }

  function createPost(T, renderer) {
    const hdr = renderer.extensions.has("EXT_color_buffer_float");
    const options = {
      type: hdr ? T.HalfFloatType : T.UnsignedByteType,
      minFilter: T.LinearFilter, magFilter: T.LinearFilter, generateMipmaps: false
    };
    const image = new T.WebGLRenderTarget(1, 1, options);
    const glow = new T.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false });
    const scratch = glow.clone();
    const passScene = new T.Scene();
    const passCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const v = [
      "varying vec2 vUv;",
      "void main() { vUv = uv; gl_Position = vec4(position.xy,0.,1.); }"
    ].join("\n");

    const extract = new T.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false, vertexShader: v,
      uniforms: { source: { value: image.texture }, stepSize: { value: new T.Vector2() }, threshold: { value: hdr ? .87 : .68 } },
      fragmentShader: [
        "varying vec2 vUv; uniform sampler2D source; uniform vec2 stepSize; uniform float threshold;",
        "void main() {",
        "  vec3 a = texture2D(source,vUv+vec2(stepSize.x,stepSize.y)).rgb;",
        "  vec3 b = texture2D(source,vUv+vec2(stepSize.x,-stepSize.y)).rgb;",
        "  vec3 c = texture2D(source,vUv+vec2(-stepSize.x,stepSize.y)).rgb;",
        "  vec3 d = texture2D(source,vUv-stepSize).rgb;",
        "  vec3 col = (a+b+c+d)*.25;",
        "  float peak = max(max(col.r,col.g),col.b);",
        "  gl_FragColor = vec4(col * smoothstep(threshold,threshold+.48,peak),1.);",
        "}"
      ].join("\n")
    });

    const blur = new T.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false, vertexShader: v,
      uniforms: { source: { value: null }, direction: { value: new T.Vector2() } },
      fragmentShader: [
        "varying vec2 vUv; uniform sampler2D source; uniform vec2 direction;",
        "void main() {",
        "  vec3 col = texture2D(source,vUv).rgb*.227027;",
        "  col += (texture2D(source,vUv+direction*1.384615).rgb + texture2D(source,vUv-direction*1.384615).rgb)*.316216;",
        "  col += (texture2D(source,vUv+direction*3.230769).rgb + texture2D(source,vUv-direction*3.230769).rgb)*.070270;",
        "  gl_FragColor = vec4(col,1.);",
        "}"
      ].join("\n")
    });

    const final = new T.ShaderMaterial({
      depthTest: false, depthWrite: false, vertexShader: v,
      uniforms: {
        source: { value: image.texture }, bloom: { value: glow.texture },
        texel: { value: new T.Vector2() }, time: { value: 0 }, night: { value: 0 }
      },
      fragmentShader: [
        "varying vec2 vUv; uniform sampler2D source,bloom; uniform vec2 texel; uniform float time,night;",
        "float luma(vec3 c) { return dot(c,vec3(.299,.587,.114)); }",
        "void main() {",
        "  vec3 origin = texture2D(source,vUv).rgb;",
        "  vec3 a = texture2D(source,vUv+vec2(texel.x,0.)).rgb;",
        "  vec3 b = texture2D(source,vUv-vec2(texel.x,0.)).rgb;",
        "  vec3 c = texture2D(source,vUv+vec2(0.,texel.y)).rgb;",
        "  vec3 d = texture2D(source,vUv-vec2(0.,texel.y)).rgb;",
        "  float edgeX = abs(luma(a)-luma(b));",
        "  float edgeY = abs(luma(c)-luma(d));",
        "  vec3 edge = mix((a+b)*.5,(c+d)*.5,step(edgeX,edgeY));",
        "  vec3 col = mix(origin,edge,smoothstep(.09,.44,max(edgeX,edgeY))*.22);",
        "  col += texture2D(bloom,vUv).rgb * mix(.21,.32,night);",
        "  vec2 p = (vUv-.5)*vec2(1.11,.94);",
        "  col *= 1. - dot(p,p)*.18;",
        "  gl_FragColor = vec4(col,1.);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "  float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy + floor(time*16.),vec2(.06711056,.00583715))));",
        "  gl_FragColor.rgb += (grain-.5) * mix(.043,.031,night);",
        "}"
      ].join("\n")
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), extract);
    quad.frustumCulled = false;
    passScene.add(quad);
    const bufferSize = new T.Vector2();

    function pass(material, target) {
      quad.material = material;
      renderer.setRenderTarget(target);
      renderer.render(passScene, passCamera);
    }

    return {
      resize() {
        renderer.getDrawingBufferSize(bufferSize);
        image.setSize(bufferSize.x, bufferSize.y);
        glow.setSize(Math.max(1, Math.round(bufferSize.x / 4)), Math.max(1, Math.round(bufferSize.y / 4)));
        scratch.setSize(glow.width, glow.height);
        extract.uniforms.stepSize.value.set(1.4 / image.width, 1.4 / image.height);
        final.uniforms.texel.value.set(1 / image.width, 1 / image.height);
      },
      draw(scene, camera, time, night) {
        renderer.setRenderTarget(image);
        renderer.render(scene, camera);
        pass(extract, glow);
        blur.uniforms.source.value = glow.texture;
        blur.uniforms.direction.value.set(1.6 / glow.width, 0);
        pass(blur, scratch);
        blur.uniforms.source.value = scratch.texture;
        blur.uniforms.direction.value.set(0, 1.6 / glow.height);
        pass(blur, glow);
        final.uniforms.time.value = time;
        final.uniforms.night.value = night;
        pass(final, null);
      }
    };
  }

  function start() {
    const T = window.THREE;
    const kit = createKit(T);
    const { vec, mix, clamp } = kit;
    const renderer = new T.WebGLRenderer({ alpha: false, antialias: false, powerPreference: "high-performance" });
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-label", "鹈鹕在海岸公路上骑行的三维动画");
    stage.append(canvas);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    const scene = new T.Scene();
    scene.fog = new T.FogExp2(0xe7b59a, .015);
    scene.environment = createReflectionMap(T);
    scene.environmentIntensity = .58;

    const hemisphere = new T.HemisphereLight(0xffe5d4, 0x8b7974, 1.55);
    const key = new T.DirectionalLight(0xffc693, 3.15);
    const fill = new T.DirectionalLight(0xe6efff, 1.65);
    const rim = new T.DirectionalLight(0xffd3ac, .72);
    fill.position.set(1, 3.1, 6.7);
    rim.position.set(-4, 3.5, -.5);
    key.target.position.set(0, .1, 0);
    key.castShadow = true;
    const shadowSize = matchMedia("(max-width: 700px)").matches ? 1024 : 2048;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    const shadow = key.shadow.camera;
    shadow.left = -6.8;
    shadow.right = 6.8;
    shadow.top = 6.5;
    shadow.bottom = -6.5;
    shadow.near = .1;
    shadow.far = 31;
    shadow.updateProjectionMatrix();
    key.shadow.normalBias = .016;
    key.shadow.bias = -.00015;
    key.shadow.radius = 3;
    scene.add(hemisphere, key, key.target, fill, rim);
    addContactShadows(T, scene);

    const camera = new T.PerspectiveCamera(36, 1, .06, 980);
    const post = createPost(T, renderer);
    const coast = window.Saltwind.makeCoast(kit, scene);
    const rider = window.Saltwind.makeRider(kit, scene);
    const motionSetting = matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionSetting.matches;
    let aspect = 1;
    let width = 1;
    let height = 1;
    let currentShift = -1;
    let projectionDirty = true;

    const presets = {
      side: { yaw: .46, elevation: .137, radius: 8.05, center: 1.63, shift: .169 },
      close: { yaw: .75, elevation: .122, radius: 5.20, center: 2.19, shift: .145 },
      orbit: { yaw: .40, elevation: .209, radius: 8.54, center: 1.62, shift: .15 }
    };

    let view = "side";
    let draggingYaw = 0;
    let draggingHeight = 0;
    let zoom = 1;
    let motionTime = 0;
    let ambientTime = 0;
    let distance = 0;
    let requestedSpeed = Number(range.value);
    let playing = !reduced;
    let velocity = playing ? requestedSpeed * (24 / 3.6) : 0;
    let nighttime = false;
    let lightBlend = 0;
    let bellTime = -10;
    let audio;
    let ringTimer;
    let before = performance.now();

    const cameraState = { yaw: .46, elevation: .137, radius: 8.05, center: 1.63, shift: .169 };
    const focus = vec(.20, 1.63, 0);
    const palette = {
      skyDay: new T.Color(0xffe5d4), skyNight: new T.Color(0x9fbfff),
      groundDay: new T.Color(0x9b7971), groundNight: new T.Color(0x555875),
      keyDay: new T.Color(0xffc495), keyNight: new T.Color(0x8fb6ff),
      fillDay: new T.Color(0xe5efff), fillNight: new T.Color(0x9bbcf8),
      rimDay: new T.Color(0xffdab6), rimNight: new T.Color(0xb2a3e0),
      fogDay: new T.Color(0xeab59b), fogNight: new T.Color(0x344568)
    };

    function resize() {
      width = Math.max(1, stage.clientWidth);
      height = Math.max(1, stage.clientHeight);
      aspect = width / height;
      const budget = Math.sqrt(3200000 / (width * height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.72, budget));
      renderer.setSize(width, height, false);
      projectionDirty = true;
      post.resize();
    }
    window.addEventListener("resize", resize);
    resize();

    function updateView(dt, immediate = false) {
      const preset = presets[view];
      const portrait = aspect < 1.05;
      const autoYaw = reduced ? 0 : view === "orbit" ? .87 * Math.sin(motionTime * .42 - .32) : .055 * Math.sin(motionTime * .36);
      const autoElevation = !reduced && view === "orbit" ? .065 * Math.sin(motionTime * .36) : 0;
      const radius = preset.radius * zoom * Math.max(1, (view === "close" ? .76 : .91) / aspect);
      const t = immediate ? 1 : 1 - Math.exp(-dt * 5.5);
      cameraState.yaw = mix(cameraState.yaw, preset.yaw + autoYaw + draggingYaw, t);
      cameraState.elevation = mix(cameraState.elevation, clamp(preset.elevation + autoElevation + draggingHeight, .016, 1.04), t);
      cameraState.radius = mix(cameraState.radius, radius, t);
      cameraState.center = mix(cameraState.center, preset.center, t);
      cameraState.shift = mix(cameraState.shift, portrait ? .014 : preset.shift * clamp((aspect - 1.05) / .41, 0, 1), t);
      focus.set(.205, cameraState.center, 0);
      const horizontal = Math.cos(cameraState.elevation) * cameraState.radius;
      camera.position.set(
        focus.x + Math.sin(cameraState.yaw) * horizontal,
        focus.y + Math.sin(cameraState.elevation) * cameraState.radius,
        focus.z + Math.cos(cameraState.yaw) * horizontal
      );
      camera.lookAt(focus);
      if (projectionDirty || Math.abs(currentShift - cameraState.shift) > .00014) {
        currentShift = cameraState.shift;
        camera.fov = portrait ? 40 : 36;
        camera.setViewOffset(width, height, -width * currentShift, -height * (portrait ? .107 : .048), width, height);
        projectionDirty = false;
      }
    }

    function updateLight(light) {
      key.position.copy(light).multiplyScalar(17).add(key.target.position);
      hemisphere.color.copy(palette.skyDay).lerp(palette.skyNight, lightBlend);
      hemisphere.groundColor.copy(palette.groundDay).lerp(palette.groundNight, lightBlend);
      hemisphere.intensity = mix(1.55, .71, lightBlend);
      key.color.copy(palette.keyDay).lerp(palette.keyNight, lightBlend);
      key.intensity = mix(3.15, 1.55, lightBlend);
      fill.color.copy(palette.fillDay).lerp(palette.fillNight, lightBlend);
      fill.intensity = mix(1.65, 1.04, lightBlend);
      rim.color.copy(palette.rimDay).lerp(palette.rimNight, lightBlend);
      rim.intensity = mix(.72, .76, lightBlend);
      scene.fog.color.copy(palette.fogDay).lerp(palette.fogNight, lightBlend);
      scene.environmentIntensity = mix(.58, .29, lightBlend);
    }

    function setView(next) {
      view = next;
      draggingYaw = 0;
      draggingHeight = 0;
      zoom = 1;
      for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.view === view));
    }

    function toggleLights() {
      nighttime = !nighttime;
      app.classList.toggle("night", nighttime);
      lightButton.setAttribute("aria-label", nighttime ? "切换至落日" : "切换至月夜");
      document.getElementById("light-name").textContent = nighttime ? "月夜" : "落日";
    }

    function togglePlaying(force) {
      playing = typeof force === "boolean" ? force : !playing;
      playButton.classList.toggle("paused", !playing);
      playButton.setAttribute("aria-label", playing ? "暂停骑行" : "继续骑行");
    }

    function ringBell() {
      bellTime = ambientTime;
      clearTimeout(ringTimer);
      bellButton.classList.remove("ringing");
      requestAnimationFrame(() => bellButton.classList.add("ringing"));
      ringTimer = setTimeout(() => bellButton.classList.remove("ringing"), 460);
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        audio ||= new Audio();
        if (audio.state === "suspended") audio.resume().catch(() => {});
        const now = audio.currentTime + .012;
        for (const [index, pitch] of [1134, 1829, 2643, 3109].entries()) {
          const voice = audio.createOscillator();
          const envelope = audio.createGain();
          const start = now + index * .002;
          voice.type = "sine";
          voice.frequency.setValueAtTime(pitch, start);
          voice.frequency.exponentialRampToValueAtTime(pitch * .982, start + .36);
          envelope.gain.setValueAtTime(.001, start);
          envelope.gain.exponentialRampToValueAtTime(.12 / (index + 1), start + .006);
          envelope.gain.exponentialRampToValueAtTime(.0001, start + .64 - index * .082);
          voice.connect(envelope);
          envelope.connect(audio.destination);
          voice.start(start);
          voice.stop(start + .68);
          voice.onended = () => { voice.disconnect(); envelope.disconnect(); };
        }
      } catch {
        // Keep the visual bell response if audio is unavailable.
      }
    }

    const pointers = new Map();
    function pinchDistance() {
      const [a, b] = pointers.values();
      return Math.max(14, Math.hypot(a.x - b.x, a.y - b.y));
    }
    stage.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      stage.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      stage.classList.add("dragging");
    });
    stage.addEventListener("pointermove", event => {
      if (!pointers.has(event.pointerId)) return;
      const p = pointers.get(event.pointerId);
      const oldPinch = pointers.size > 1 ? pinchDistance() : 0;
      if (pointers.size === 1) {
        draggingYaw -= (event.clientX - p.x) * .0086;
        draggingHeight = clamp(draggingHeight + (event.clientY - p.y) * .0054, -.19, .91);
      }
      p.x = event.clientX;
      p.y = event.clientY;
      if (oldPinch) zoom = clamp(zoom * oldPinch / pinchDistance(), .69, 1.66);
    });

    function release(event) {
      pointers.delete(event.pointerId);
      stage.classList.toggle("dragging", pointers.size > 0);
    }
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    stage.addEventListener("lostpointercapture", release);
    stage.addEventListener("wheel", event => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 17 : event.deltaMode === 2 ? 110 : 1);
      zoom = clamp(zoom * Math.exp(clamp(delta, -180, 180) * .00145), .69, 1.66);
    }, { passive: false });

    const pace = document.getElementById("pace-value");
    const speedNumber = document.getElementById("kmh");
    let lastReadout = -1;

    for (const button of buttons) button.addEventListener("click", () => setView(button.dataset.view));
    range.addEventListener("input", () => {
      requestedSpeed = Number(range.value);
      pace.value = requestedSpeed.toFixed(1) + "×";
    });
    playButton.addEventListener("click", () => togglePlaying());
    lightButton.addEventListener("click", toggleLights);
    bellButton.addEventListener("click", ringBell);
    motionSetting.addEventListener("change", event => {
      reduced = event.matches;
      if (reduced) togglePlaying(false);
    });
    window.addEventListener("keydown", event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target.matches?.("button, input, textarea, select")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlaying();
      }
      if (event.key === "1") setView("side");
      if (event.key === "2") setView("close");
      if (event.key === "3") setView("orbit");
      if (event.key.toLowerCase() === "l") toggleLights();
      if (event.key.toLowerCase() === "b") ringBell();
    });

    function frame(now) {
      const dt = clamp((now - before) / 1000, 0, .05);
      before = now;
      velocity = mix(velocity, playing ? requestedSpeed * (24 / 3.6) : 0, 1 - Math.exp(-dt * 7.5));
      if (!playing && velocity < .015) velocity = 0;
      distance += velocity * dt;
      ambientTime += dt;
      if (!reduced || playing) motionTime += dt;
      lightBlend = mix(lightBlend, nighttime ? 1 : 0, reduced ? 1 : 1 - Math.exp(-dt * 1.88));
      const kmh = Math.round(velocity * 3.6);
      if (kmh !== lastReadout) {
        speedNumber.textContent = String(kmh);
        lastReadout = kmh;
      }
      updateView(dt);
      coast.move(motionTime, distance, lightBlend, camera, reduced);
      updateLight(coast.lightDirection);
      const reaction = Math.max(0, 1 - (ambientTime - bellTime) * 2.5);
      rider.pose(distance, motionTime, velocity, reaction);
      post.draw(scene, camera, motionTime, lightBlend);
    }

    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      renderer.setAnimationLoop(null);
      status.textContent = "图形上下文已断开，正在等待恢复…";
      status.hidden = false;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      resize();
      before = performance.now();
      status.hidden = true;
      renderer.setAnimationLoop(frame);
    });

    togglePlaying(playing);
    updateView(0, true);
    for (const control of [range, playButton, bellButton, lightButton, ...buttons]) control.disabled = false;
    status.hidden = true;
    renderer.setAnimationLoop(frame);
  }

  try {
    start();
  } catch (error) {
    status.textContent = "无法启动 3D 场景。请使用支持 WebGL 2 的浏览器打开此页面。";
    console.error(error);
  }
})();
