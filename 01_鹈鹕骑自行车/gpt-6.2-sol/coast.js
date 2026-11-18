(() => {
  "use strict";

  const Saltwind = window.Saltwind ||= {};

  Saltwind.makeCoast = (kit, scene) => {
    const { T, vec, standard, solid, globe, rod, random, dummy } = kit;
    const day = vec(-.247, .142, -.948).normalize();
    const moon = vec(.036, .177, -.955).normalize();
    const light = { value: day.clone() };
    const nightMix = { value: 0 };
    const clock = { value: 0 };
    const travel = { value: 0 };
    const wind = { value: 0 };
    const tau = 2 * Math.PI;
    const mod = (value, size) => ((value % size) + size) % size;

    const sky = new T.Mesh(new T.SphereGeometry(640, 36, 20), new T.ShaderMaterial({
      side: T.BackSide, depthTest: false, depthWrite: false,
      uniforms: { sunDir: light, night: nightMix, time: clock },
      vertexShader: [
        "varying vec3 vPosition;",
        "void main() {",
        "  vPosition = position;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vPosition;",
        "uniform vec3 sunDir;",
        "uniform float night;",
        "uniform float time;",
        "float hash(vec2 p) { return fract(sin(dot(p, vec2(143.7, 211.1))) * 43758.5453); }",
        "float noise(vec2 p) {",
        "  vec2 i = floor(p), f = fract(p);",
        "  f = f*f*(3.-2.*f);",
        "  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+1.), f.x), f.y);",
        "}",
        "float cloud(vec2 p) {",
        "  return .53*noise(p)+.26*noise(p*2.12)+.13*noise(p*4.23)+.08*noise(p*8.1);",
        "}",
        "void main() {",
        "  vec3 ray = normalize(vPosition);",
        "  float y = ray.y;",
        "  float vertical = max(0.,y);",
        "  float alignment = clamp(dot(ray,sunDir),0.,1.);",
        "  float angle = acos(alignment);",
        "  vec3 peach = mix(vec3(.86,.433,.295), vec3(.116,.151,.276), night);",
        "  vec3 blue = mix(vec3(.243,.433,.607), vec3(.017,.027,.071), night);",
        "  vec3 sky = mix(peach, blue, smoothstep(-.035,.29,y));",
        "  sky += exp(-vertical*13.)*mix(vec3(.34,.148,.085),vec3(.047,.038,.079),night);",
        "  sky += exp(-angle*8.)*mix(vec3(.73,.27,.087),vec3(.15,.187,.28),night);",
        "  float disk = 1.-smoothstep(mix(.047,.028,night),mix(.050,.030,night),angle);",
        "  float stripes = smoothstep(.19,.96,noise(ray.xz*150.+y*170.));",
        "  sky += disk*mix(vec3(2.8,1.63,.77),vec3(.99,1.22,1.60)-stripes*.18, night);",
        "  vec2 p = ray.xz / (max(y,.016)+.22);",
        "  p = p*vec2(3.2,12.5)+vec2(time*.020,0.);",
        "  float cloudMask = smoothstep(.51,.71,cloud(p)*.92+.085*noise(p*.43));",
        "  cloudMask *= smoothstep(.015,.095,y)*(1.-smoothstep(.46,.78,y));",
        "  vec3 cloudColor = mix(vec3(.86,.56,.445),vec3(.11,.13,.24),night);",
        "  cloudColor += pow(alignment,16.)*mix(vec3(.56,.28,.143),vec3(.09,.12,.17),night);",
        "  sky = mix(sky,cloudColor,cloudMask*.61);",
        "  vec2 star = vec2(atan(ray.z,ray.x), y)*vec2(230.,310.);",
        "  vec2 cell = floor(star);",
        "  vec2 center = vec2(hash(cell+1.1),hash(cell+28.7))*.6+.2;",
        "  float starDistance = length(fract(star)-center);",
        "  float speck = smoothstep(.993,1.,hash(cell))*exp(-135.*starDistance*starDistance);",
        "  sky += vec3(.48,.68,1.)*speck*night*smoothstep(.07,.30,y)*(1.-cloudMask);",
        "  gl_FragColor = vec4(sky,1.);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "}"
      ].join("\n")
    }));
    sky.renderOrder = -100;
    sky.frustumCulled = false;
    scene.add(sky);

    const oceanGeometry = new T.PlaneGeometry(800, 500, 140, 110);
    oceanGeometry.rotateX(-Math.PI / 2);
    oceanGeometry.translate(0, -1.38, -252.49);
    const sea = new T.Mesh(oceanGeometry, new T.ShaderMaterial({
      uniforms: { sunDir: light, night: nightMix, time: clock, travel },
      vertexShader: [
        "uniform float time;",
        "uniform float travel;",
        "varying vec3 surface;",
        "void main() {",
        "  vec3 pos = position;",
        "  vec3 wavePos = pos + vec3(travel*.11,0.,0.);",
        "  pos.y += sin(dot(wavePos.xz,vec2(.65,.43))+time*1.44)*.044;",
        "  pos.y += sin(dot(wavePos.xz,vec2(.22,-.7))-time*1.1)*.05;",
        "  surface = pos;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 sunDir;",
        "uniform float time;",
        "uniform float travel;",
        "uniform float night;",
        "varying vec3 surface;",
        "void main() {",
        "  vec2 p = surface.xz + vec2(travel*.11,0.);",
        "  float phase = time;",
        "  vec2 dh = vec2(0.);",
        "  dh += vec2(.62,.5)*cos(dot(p,vec2(.62,.5))+phase*1.07)*.13;",
        "  dh += vec2(.28,-1.25)*cos(dot(p,vec2(.28,-1.25))+phase*1.86)*.068;",
        "  dh += vec2(1.73,.66)*cos(dot(p,vec2(1.73,.66))-phase*1.3)*.036;",
        "  dh += vec2(.91,3.9)*cos(dot(p,vec2(.91,3.9))+phase*3.96)*.021;",
        "  dh += vec2(2.9,7.2)*cos(dot(p,vec2(2.9,7.2))-phase*4.1)*.010;",
        "  vec3 N = normalize(vec3(-dh.x,1.,-dh.y));",
        "  vec3 V = normalize(cameraPosition-surface);",
        "  vec3 H = normalize(V+sunDir);",
        "  float fresnel = pow(1.-clamp(dot(N,V),0.,1.),4.);",
        "  vec3 base = mix(vec3(.034,.196,.242),vec3(.012,.066,.117),night);",
        "  vec3 reflection = mix(vec3(.42,.35,.36),vec3(.082,.131,.229),night);",
        "  vec3 water = mix(base,reflection,fresnel*.84);",
        "  float highlight = pow(max(0.,dot(N,H)),170.);",
        "  float gleam = pow(max(0.,dot(N,H)),30.);",
        "  water += (highlight*1.82+gleam*.27)*mix(vec3(1.32,.674,.273),vec3(.25,.55,1.10),night);",
        "  float foam = sin(p.x*1.6-time*1.1)*.14+sin(p.x*.69+time*2.2)*.13;",
        "  float shoreline = (p.y+3.0+foam)*8.;",
        "  float wash = exp(-shoreline*shoreline);",
        "  water += vec3(.44,.51,.47)*wash*(.52+.48*cos(p.x*4.26+time));",
        "  float fog = smoothstep(40.,385.,distance(surface,cameraPosition));",
        "  vec3 haze = mix(vec3(.91,.49,.35),vec3(.119,.158,.282),night);",
        "  gl_FragColor = vec4(mix(water,haze,fog),1.);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "}"
      ].join("\n")
    }));
    scene.add(sea);

    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = roadCanvas.height = 512;
    const asphalt = roadCanvas.getContext("2d");
    asphalt.fillStyle = "#5b5352";
    asphalt.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 27000; i++) {
      const r = random();
      asphalt.fillStyle = r > .47 ? "rgba(232,205,181,.14)" : "rgba(28,25,33,.22)";
      const size = .35 + 2.6 * Math.pow(random(), 2.5);
      asphalt.fillRect(random() * 512, random() * 512, size * 1.3, size);
    }
    for (let i = 0; i < 13; i++) {
      const x = random() * 512;
      const y = random() * 512;
      const radius = 22 + random() * 41;
      const blotch = asphalt.createRadialGradient(x, y, 0, x, y, radius);
      blotch.addColorStop(0, "rgba(231,201,178,.07)");
      blotch.addColorStop(1, "rgba(231,201,178,0)");
      asphalt.fillStyle = blotch;
      asphalt.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    const asphaltTexture = new T.CanvasTexture(roadCanvas);
    asphaltTexture.colorSpace = T.SRGBColorSpace;
    asphaltTexture.wrapS = asphaltTexture.wrapT = T.RepeatWrapping;
    asphaltTexture.repeat.set(23, 1.1);
    asphaltTexture.anisotropy = 8;

    const road = solid(scene, new T.PlaneGeometry(184, 6.38), new T.MeshStandardMaterial({ map: asphaltTexture, roughness: .96 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -.002, .93);
    road.castShadow = false;
    const roadBed = standard(0x82776a, .98);
    const shoulder = standard(0xa79981, .98);
    const paintLine = standard(0xf2cd94, .83);
    const whiteLine = standard(0xdec9ae, .91);
    const rockMaterials = [standard(0x999087, .96), standard(0x6f7078, .94), standard(0xb2a190, .99), standard(0x857e7d, .94)];
    const railMat = standard(0xa39b87, .86);
    const railShade = standard(0x817d74, .94);
    const postCap = standard(0xcec2a5, .86);

    function box(parent, width, height, depth, x, y, z, material) {
      const mesh = solid(parent, new T.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      return mesh;
    }

    box(scene, 184, 1.37, .55, 0, -.70, -2.41, roadBed);
    box(scene, 184, .14, .39, 0, -.087, -2.274, shoulder);
    box(scene, 184, .16, 8.0, 0, -.098, 7.91, shoulder);
    box(scene, 184, .006, .035, 0, .003, -1.84, whiteLine).castShadow = false;
    box(scene, 184, .006, .033, 0, .003, 3.59, whiteLine).castShadow = false;

    const rockShape = new T.IcosahedronGeometry(1, 1);
    const lowerRockShape = new T.IcosahedronGeometry(1, 0);
    const segmentLength = 14.4;
    const scenerySegments = [];
    const master = new T.Group();
    const paintStrip = box(master, 1.27, .006, .045, 0, .006, 1.74, paintLine);
    paintStrip.castShadow = false;
    for (const x of [-6, -3.6, -1.2, 1.2, 3.6, 6]) {
      const strip = paintStrip.clone();
      strip.position.x = x;
      master.add(strip);
    }
    master.remove(paintStrip);

    for (const height of [.255, .577]) {
      box(master, segmentLength, .057, .078, 0, height, -2.426, railMat);
      box(master, segmentLength, .016, .082, 0, height + .035, -2.426, postCap);
    }
    for (let i = 0; i < 6; i++) {
      const x = i * 2.4 - 6;
      box(master, .111, .688, .115, x, .334, -2.45, railShade);
      box(master, .138, .044, .142, x, .699, -2.45, postCap);
      const reflector = box(master, .095, .039, .009, x, .54, -2.385, paintLine);
      reflector.castShadow = false;
    }
    for (let i = 0; i < 42; i++) {
      const stone = solid(master, i % 3 ? lowerRockShape : rockShape, rockMaterials[i % 4]);
      stone.position.set((random() - .5) * segmentLength, -.35 - random() * .72, -2.6 - random() * 1.12);
      stone.scale.set(.26 + random() * .60, .14 + random() * .49, .19 + random() * .52);
      stone.rotation.set(random(), random() * tau, random());
      stone.castShadow = false;
    }

    const grassGeometry = new T.BufferGeometry();
    grassGeometry.setAttribute("position", new T.Float32BufferAttribute([
      -.51, 0, 0, .51, 0, 0, -.31, .50, .12,
      .37, .50, .14, .25, .80, .26, .30, 1, .58
    ], 3));
    grassGeometry.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 2, 4, 5]);
    grassGeometry.computeVertexNormals();
    const grassMaterial = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .95, side: T.DoubleSide });
    grassMaterial.onBeforeCompile = shader => {
      shader.uniforms.uWind = wind;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uWind;")
        .replace("#include <begin_vertex>", [
          "#include <begin_vertex>",
          "#ifdef USE_INSTANCING",
          "float wave = sin(uWind*3.9 + instanceMatrix[3].x*.32 + instanceMatrix[3].z*.71);",
          "transformed.z += wave * position.y * position.y * .84;",
          "#endif"
        ].join("\n"));
    };
    const blades = new T.InstancedMesh(grassGeometry, grassMaterial, 938);
    const blooms = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), standard(0xffffff, .9), 125);
    const colors = [0xae9b68, 0x8c835d, 0x79774e, 0x535a4c, 0xc4af77, 0xd3b577];
    const flowerColors = [0xffd587, 0xf6c4a1, 0xf8e0af, 0xbb8fa0];
    for (let i = 0; i < 938; i++) {
      const x = (random() - .5) * segmentLength;
      const cliffSide = i % 3 === 0;
      const z = cliffSide ? -2.42 + random() * .34 : 4.02 + random() * 3.17;
      const height = .061 + Math.pow(random(), 1.4) * (cliffSide ? .27 : .68);
      dummy.position.set(x, -.026, z);
      dummy.rotation.set(0, random() * tau, (random() - .5) * .55);
      dummy.scale.set(.026 + random() * .055, height, .085 + random() * .041);
      dummy.updateMatrix();
      blades.setMatrixAt(i, dummy.matrix);
      blades.setColorAt(i, new T.Color(colors[i % colors.length]));
      if (i >= 125) continue;
      dummy.position.set(x + (random() - .5) * .056, height * .67, z);
      dummy.scale.set(.019, .024 + height * .016, .018);
      dummy.updateMatrix();
      blooms.setMatrixAt(i, dummy.matrix);
      blooms.setColorAt(i, new T.Color(flowerColors[i % flowerColors.length]));
    }
    master.add(blades, blooms);
    for (let i = -4; i <= 4; i++) {
      const group = i === 0 ? master : master.clone(true);
      scene.add(group);
      scenerySegments.push({ group, start: i * segmentLength });
    }

    function rockIsland(x, z, width, height, depth, far = false) {
      const rings = [
        [-1.56, 1.0], [-.65, .98], [.24, .89], [.50, .80], [.71, .72], [.92, .60], [1.01, .29], [1.04, .0]
      ];
      const positions = [];
      const colors = [];
      const indices = [];
      const steps = 39;
      const stratas = far
        ? [0x5b6579, 0x626779, 0x727586, 0x636c80, 0x767382, 0x777e8c, 0x787a83, 0x777b89]
        : [0x605f67, 0x7c726e, 0xac9382, 0xc4aa8e, 0xac927c, 0xbda78d, 0x9e947b, 0x8b906e];
      for (let i = 0; i < rings.length; i++) {
        const [y, radius] = rings[i];
        const baseColor = new T.Color(stratas[i]);
        for (let j = 0; j <= steps; j++) {
          const theta = j / steps * tau;
          const profile = 1 + Math.sin(theta * 3. + .6) * .17 + Math.sin(theta * 7.) * .078 + Math.sin(theta * 13. + i * .84) * .038;
          const uneven = .67 + Math.sin(theta * 2. - .34) * .19 + Math.cos(theta * 5. + i * .52) * .14;
          positions.push(
            x + Math.cos(theta) * width * profile * radius + i * .12,
            i === 0 ? y : -1.32 + (y + .62) * height * .61 * (.8 + uneven * .25),
            z + Math.sin(theta) * depth * profile * radius
          );
          const color = baseColor.clone().multiplyScalar(.83 + .23 * uneven);
          colors.push(color.r, color.g, color.b);
          if (i < rings.length - 1 && j < steps) {
            const index = i * (steps + 1) + j;
            indices.push(index, index + steps + 1, index + 1, index + 1, index + steps + 1, index + steps + 2);
          }
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = solid(scene, geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: .94, flatShading: true }));
      mesh.castShadow = false;
      return mesh;
    }

    rockIsland(-99, -186, 47, 6.7, 20, true);
    rockIsland(11, -141, 42, 4.0, 17, true);
    rockIsland(-57, -81, 23, 4.1, 9, true);
    rockIsland(28, -58, 14, 3.2, 6, true);
    rockIsland(-36, -43, 12.4, 3.4, 7.2);
    rockIsland(18, -44, 6.2, 2.6, 6.5);
    const lighthouseIsland = rockIsland(-14.1, -23.7, 6.5, 2.7, 4.1);
    rockIsland(10, 17, 23, 4.4, 11);
    rockIsland(-44, 27, 25, 8.0, 12);
    rockIsland(36, 35, 26, 7.6, 16);

    const lighthouse = new T.Group();
    lighthouse.position.set(-13.52, 1.05, -23.62);
    scene.add(lighthouse);
    const limestone = standard(0xdfceb3, .85);
    const lighthouseRed = standard(0xb25443, .67);
    const greyMetal = standard(0x374d55, .51, .25);
    const lightGlass = new T.MeshPhysicalMaterial({ color: 0xffefbe, roughness: .20, emissive: 0xffa74c, emissiveIntensity: .25 });
    function lighthouseRing(radiusTop, radiusBottom, length, y, material) {
      const ring = solid(lighthouse, new T.CylinderGeometry(radiusTop, radiusBottom, length, 16), material);
      ring.position.y = y;
      ring.castShadow = false;
      return ring;
    }
    lighthouseRing(.58, .62, .22, .11, limestone);
    lighthouseRing(.412, .535, 1.45, .85, limestone);
    lighthouseRing(.384, .412, .45, 1.801, lighthouseRed);
    lighthouseRing(.363, .385, .60, 2.328, limestone);
    lighthouseRing(.47, .36, .13, 2.66, greyMetal);
    lighthouseRing(.229, .25, .39, 2.901, lightGlass);
    lighthouseRing(.035, .390, .235, 3.225, lighthouseRed);
    globe(lighthouse, vec(0, 3.372, 0), [.043, .053, .043], greyMetal).castShadow = false;
    for (let i = 0; i < 8; i++) {
      const a = i * tau / 8;
      rod(lighthouse, vec(Math.cos(a) * .264, 2.685, Math.sin(a) * .264), vec(Math.cos(a) * .264, 3.114, Math.sin(a) * .264), .015, greyMetal);
    }
    for (let i = 0; i < 3; i++) {
      const door = box(lighthouse, i ? .121 : .172, i ? .156 : .395, .025, 0, i * .78 + .31, .48 - i * .049, greyMetal);
      door.castShadow = false;
    }
    const beamPivot = new T.Group();
    beamPivot.position.y = 2.888;
    lighthouse.add(beamPivot);
    const beam = new T.Mesh(new T.ConeGeometry(2.4, 26, 40, 1, true), new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      uniforms: { night: nightMix },
      vertexShader: [
        "varying vec2 vUv;",
        "void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }"
      ].join("\n"),
      fragmentShader: [
        "varying vec2 vUv; uniform float night;",
        "void main() {",
        "  gl_FragColor = vec4(1.,.68,.34,.086 * smoothstep(.0,.98,vUv.y)*night);",
        "  #include <colorspace_fragment>",
        "}"
      ].join("\n")
    }));
    beam.rotation.z = Math.PI / 2;
    beam.position.x = 13;
    beamPivot.add(beam);

    const birdColor = standard(0x54515e, .87);
    const birdGeometry = new T.BufferGeometry();
    birdGeometry.setAttribute("position", new T.Float32BufferAttribute([
      0, .015, -.058, .14, .073, -.15, .33, .052, -.07, .61, -.03, .052,
      .33, -.01, .066, .11, .0, .092, 0, 0, .031
    ], 3));
    birdGeometry.setIndex([0, 1, 2, 0, 2, 5, 0, 5, 6, 2, 4, 5, 2, 3, 4]);
    birdGeometry.computeVertexNormals();
    birdColor.side = T.DoubleSide;
    const gulls = [];
    for (let i = 0; i < 7; i++) {
      const bird = new T.Group();
      const body = globe(bird, vec(0, 0, 0), [.066, .040, .173], birdColor);
      body.castShadow = false;
      const wings = [-1, 1].map(side => {
        const wing = new T.Mesh(birdGeometry, birdColor);
        wing.scale.x = side;
        bird.add(wing);
        return wing;
      });
      bird.scale.setScalar(.55 + random() * .64);
      scene.add(bird);
      gulls.push({ bird, wings, base: random() * 12 });
    }

    const specks = new T.BufferGeometry();
    const fleckLocations = [];
    const fleckNames = [];
    for (let i = 0; i < 255; i++) {
      fleckLocations.push((random() - .5) * 43, .12 + random() * 5.3, (random() - .59) * 13);
      fleckNames.push(random());
    }
    specks.setAttribute("position", new T.Float32BufferAttribute(fleckLocations, 3));
    specks.setAttribute("seed", new T.Float32BufferAttribute(fleckNames, 1));
    const flecks = new T.Points(specks, new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { time: clock, travel, night: nightMix },
      vertexShader: [
        "uniform float time, travel, night;",
        "attribute float seed;",
        "varying float opacity;",
        "void main() {",
        "  vec3 p = position;",
        "  p.x = mod(p.x + 22. - travel*.46 + time*.18,44.)-22.;",
        "  p.y += sin(seed*64.+time*1.6)*(.15+seed*.2);",
        "  p.z += cos(seed*89.+time*.9)*.39;",
        "  vec4 view = modelViewMatrix * vec4(p,1.);",
        "  gl_Position = projectionMatrix * view;",
        "  gl_PointSize = clamp((23.+seed*13.) / max(1., -view.z),1.,5.);",
        "  opacity = (.14 + .31*pow(max(0.,sin(time*1.8+seed*55.)),3.))*(.72+night*.28);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float night;",
        "varying float opacity;",
        "void main() {",
        "  float mask = 1.-smoothstep(.10,.50,length(gl_PointCoord-.5));",
        "  gl_FragColor = vec4(mix(vec3(1.,.72,.41),vec3(.66,.78,1.),night), mask*opacity);",
        "  #include <colorspace_fragment>",
        "}"
      ].join("\n")
    }));
    flecks.frustumCulled = false;
    scene.add(flecks);

    function move(time, distance, blend, camera, reducedMotion) {
      nightMix.value = blend;
      clock.value = time;
      wind.value = time;
      travel.value = distance;
      light.value.copy(day).lerp(moon, blend).normalize();
      sky.position.copy(camera.position);
      asphaltTexture.offset.x = mod(distance / 8, 1);
      for (const { group, start } of scenerySegments) group.position.x = start - mod(distance, segmentLength);
      lighthouseIsland.position.x = -1.9 * Math.sin(distance * .005);
      lighthouse.position.x = -13.52 + lighthouseIsland.position.x;
      lightGlass.emissiveIntensity = .21 + 2.2 * blend;
      beam.visible = blend > .10;
      beamPivot.rotation.y = reducedMotion ? -.45 : time * .68 + .3;
      flecks.visible = !reducedMotion;
      for (let i = 0; i < gulls.length; i++) {
        const { bird, wings, base } = gulls[i];
        const u = time * .34 + base;
        const path = mod(time * (2.9 + i * .073) - distance * .14 + i * 4.1 + base, 98) - 51;
        bird.position.set(path, 3.1 + Math.sin(u) * .82 + i * .18, -13.1 - i * 2.65 + Math.sin(u * .63) * 1.7);
        bird.rotation.y = Math.PI * .38 + Math.cos(u) * .11;
        const beat = Math.sin(u * 12.0) * (.32 + .30 * Math.max(0, Math.cos(u * 1.1)));
        wings[0].rotation.z = -beat;
        wings[1].rotation.z = beat;
      }
    }

    return { move, lightDirection: light.value };
  };
})();
