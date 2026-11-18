(() => {
  "use strict";

  const Saltwind = window.Saltwind ||= {};

  Saltwind.makeRider = (kit, scene) => {
    const { T, vec, standard, solid, globe, rod, pipe, hoop, clamp, mix, dummy } = kit;
    const tau = Math.PI * 2;
    const axisX = vec(1, 0, 0);
    const axisZ = vec(0, 0, 1);
    const black = standard(0x262c35, .84);
    const tire = standard(0x212532, .89);
    const sidewall = standard(0xb38560, .74);
    const steel = standard(0xcdd8dd, .26, .88);
    const darkSteel = standard(0x576372, .32, .79);
    const amber = standard(0xc18750, .31, .67);
    const paint = new T.MeshPhysicalMaterial({
      color: 0xe35238, roughness: .29, metalness: .35, clearcoat: .9, clearcoatRoughness: .23
    });
    const cream = standard(0xffe7c3, .43, .12);
    const leather = standard(0x492b2b, .68);
    const bike = new T.Group();
    scene.add(bike);
    const rider = new T.Group();
    bike.add(rider);

    const wheelRadius = .704;
    const rear = vec(-1.225, wheelRadius, 0);
    const front = vec(1.185, wheelRadius, 0);
    const crank = vec(-.27, .772, 0);
    const seat = vec(-.73, 1.626, 0);
    const headTop = vec(.80, 1.634, 0);
    const headBottom = vec(.944, 1.363, 0);
    const pedalRadius = .242;
    const wheelGeometry = new T.TorusGeometry(.650, .054, 20, 96);
    const spokeGeometry = new T.CylinderGeometry(.0046, .0046, 1, 5);
    const capGeometry = new T.CylinderGeometry(.018, .018, .028, 8);

    function createWheel(center, isFront) {
      const wheel = new T.Group();
      wheel.position.copy(center);
      bike.add(wheel);
      solid(wheel, wheelGeometry, tire);
      hoop(wheel, vec(0, 0, 0), .606, .030, darkSteel, 84);
      hoop(wheel, vec(0, 0, 0), .580, .013, steel, 84);
      for (const sign of [-1, 1]) {
        hoop(wheel, vec(0, 0, sign * .044), .647, .013, sidewall, 88);
        hoop(wheel, vec(0, 0, sign * .023), .602, .0075, steel, 84);
      }
      rod(wheel, vec(0, 0, -.17), vec(0, 0, .17), .033, steel);
      rod(wheel, vec(0, 0, -.072), vec(0, 0, .072), .059, darkSteel);
      for (const sign of [-1, 1]) {
        const flange = solid(wheel, capGeometry, steel);
        flange.scale.set(3.8, 1, 3.8);
        flange.rotation.x = Math.PI / 2;
        flange.position.z = sign * .057;
      }
      const spokes = new T.InstancedMesh(spokeGeometry, steel, 32);
      const direction = vec(0, 0, 0);
      const up = vec(0, 1, 0);
      for (let i = 0; i < 32; i++) {
        const angle = i * tau / 32;
        const spread = i % 4 < 2 ? .31 : -.31;
        const from = vec(Math.cos(angle + spread) * .055, Math.sin(angle + spread) * .055, i % 2 ? .067 : -.067);
        const to = vec(Math.cos(angle) * .587, Math.sin(angle) * .587, i % 2 ? .009 : -.009);
        direction.subVectors(to, from);
        dummy.position.copy(from).lerp(to, .5);
        dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
        dummy.scale.set(1, direction.length(), 1);
        dummy.updateMatrix();
        spokes.setMatrixAt(i, dummy.matrix);
      }
      wheel.add(spokes);
      const valve = globe(wheel, vec(.1, .569, -.009), [.014, .042, .014], steel);
      valve.rotation.z = -.17;
      if (isFront) {
        const rotor = hoop(wheel, vec(0, 0, -.092), .118, .009, steel);
        rotor.castShadow = false;
        for (let i = 0; i < 6; i++) {
          const angle = i * tau / 6;
          rod(wheel, vec(0, 0, -.093), vec(Math.cos(angle) * .11, Math.sin(angle) * .11, -.093), .008, darkSteel);
        }
      }
      return wheel;
    }

    const backWheel = createWheel(rear, false);
    const frontWheel = createWheel(front, true);

    rod(bike, seat, headTop, .038, paint);
    rod(bike, crank, seat, .049, paint);
    rod(bike, crank, headBottom, .067, paint);
    rod(bike, headBottom, headTop, .065, paint);
    for (const side of [-1, 1]) {
      const dropout = rear.clone().setZ(side * .113);
      pipe(bike, [dropout, vec(-.88, .72, side * .124), crank.clone().setZ(side * .075)], .025, paint);
      pipe(bike, [dropout, vec(-.985, 1.20, side * .105), seat.clone().setZ(side * .033)], .021, paint);
      pipe(bike, [
        headBottom.clone().setZ(side * .036), vec(.982, 1.294, side * .109),
        vec(1.059, .94, side * .120), front.clone().setZ(side * .137)
      ], .035, paint, 22);
      globe(bike, dropout, [.047, .037, .020], steel);
    }
    for (const joint of [seat, crank, headTop, headBottom]) globe(bike, joint, [.058, .056, .056], paint);
    rod(bike, headTop.clone().add(vec(.014, -.025, 0)), vec(.752, 1.758, 0), .043, steel);
    rod(bike, vec(.752, 1.758, 0), vec(1.002, 1.807, 0), .033, darkSteel);
    rod(bike, vec(1.005, 1.807, -.263), vec(1.005, 1.807, .263), .021, steel);
    rod(bike, seat, vec(-.816, 1.776, 0), .026, steel);
    globe(bike, vec(-.813, 1.788, 0), [.200, .051, .102], leather);
    globe(bike, vec(-.706, 1.797, 0), [.174, .031, .051], leather);

    const grips = [];
    for (const side of [-1, 1]) {
      const z = side * .323;
      pipe(bike, [
        vec(1.002, 1.807, side * .225), vec(1.066, 1.807, z), vec(1.189, 1.785, z),
        vec(1.274, 1.649, z + side * .034), vec(1.221, 1.516, z + side * .047), vec(1.031, 1.509, z + side * .047)
      ], .026, leather, 36);
      for (let i = 0; i < 5; i++) {
        const band = hoop(bike, vec(1.034 + i * .020, 1.510, z + side * .047), .026, .0024, amber, 15);
        band.rotation.y = Math.PI / 2;
      }
      const hood = globe(bike, vec(1.166, 1.811, z), [.083, .046, .038], black);
      hood.rotation.z = -.36;
      pipe(bike, [vec(1.213, 1.795, z), vec(1.275, 1.720, z), vec(1.251, 1.614, z)], .012, steel);
      pipe(bike, [vec(1.122, 1.804, z), vec(.985, 1.635, z * .65), vec(.811, 1.541, z * .27), vec(.923, 1.39, z * .16)], .008, black);
      grips.push(vec(1.149, 1.858, z));
    }
    globe(bike, vec(.996, 1.835, .154), [.050, .040, .049], amber);
    rod(bike, vec(.955, 1.832, .165), vec(.922, 1.841, .202), .009, steel);
    globe(bike, vec(-1.017, 1.740, 0), [.022, .023, .050], new T.MeshStandardMaterial({
      color: 0xff542a, emissive: 0xff3817, emissiveIntensity: .34, roughness: .3
    }));
    for (const x of [-.053, .134]) {
      const y = mix(crank.y, headBottom.y, (x - crank.x) / (headBottom.x - crank.x));
      globe(bike, vec(x, y + .075, .008), [.016, .014, .016], steel);
    }

    const decalCanvas = document.createElement("canvas");
    decalCanvas.width = 256;
    decalCanvas.height = 64;
    const lettering = decalCanvas.getContext("2d");
    lettering.fillStyle = "#fff1cb";
    lettering.font = "italic 900 50px Georgia";
    lettering.textBaseline = "middle";
    lettering.fillText("SALT", 9, 35);
    lettering.fillRect(159, 30, 47, 3);
    lettering.fillRect(160, 37, 28, 2);
    const decalMap = new T.CanvasTexture(decalCanvas);
    decalMap.colorSpace = T.SRGBColorSpace;
    const decalMaterial = new T.MeshBasicMaterial({ map: decalMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const decal = new T.Mesh(new T.PlaneGeometry(.57, .142), decalMaterial);
    decal.position.copy(crank).lerp(headBottom, .48).setZ(.067);
    decal.rotation.z = Math.atan2(headBottom.y - crank.y, headBottom.x - crank.x);
    bike.add(decal);

    function sprocket(parent, center, radius, count, material) {
      const gear = new T.Group();
      gear.position.copy(center);
      parent.add(gear);
      hoop(gear, vec(0, 0, 0), radius * .93, radius > .15 ? .015 : .011, material, 50);
      const teeth = new T.InstancedMesh(new T.BoxGeometry(.018, .022, .025), material, count);
      for (let i = 0; i < count; i++) {
        const a = i * tau / count;
        dummy.position.set(radius * Math.cos(a), radius * Math.sin(a), 0);
        dummy.rotation.set(0, 0, a);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        teeth.setMatrixAt(i, dummy.matrix);
      }
      gear.add(teeth);
      for (let i = 0; i < 5; i++) {
        const a = i * tau / 5;
        rod(gear, vec(0, 0, 0), vec(Math.cos(a) * radius * .88, Math.sin(a) * radius * .88, 0), radius * .11, material);
      }
      return gear;
    }

    const crankGear = sprocket(bike, crank.clone().setZ(.178), .209, 34, darkSteel);
    sprocket(backWheel, vec(0, 0, .177), .109, 18, darkSteel);
    rod(bike, crank.clone().setZ(-.24), crank.clone().setZ(.24), .051, steel);

    function createChainPath() {
      const a = rear.clone().setZ(.193);
      const b = crank.clone().setZ(.193);
      const offset = Math.atan2(b.y - a.y, b.x - a.x);
      const tangent = Math.acos(-.100 / a.distanceTo(b));
      const sections = [
        [a, .111, offset - tangent, offset - (tau - tangent)],
        [b, .211, offset + tangent, offset - tangent]
      ];
      const points = sections.flatMap(([center, radius, from, to]) => {
        return Array.from({ length: 13 }, (_, i) => {
          const phi = mix(from, to, i / 12);
          return vec(center.x + Math.cos(phi) * radius, center.y + Math.sin(phi) * radius, center.z);
        });
      });
      return new T.CatmullRomCurve3(points, true, "centripetal");
    }

    const chainPath = createChainPath();
    const chainLength = chainPath.getLength();
    const linkCount = 76;
    const chain = new T.InstancedMesh(new T.BoxGeometry(.036, .021, .035), steel, linkCount);
    chain.frustumCulled = false;
    bike.add(chain);
    for (let i = 0; i < linkCount; i++) chain.setColorAt(i, new T.Color(i % 2 ? 0xdcb28c : 0x777c84));

    const pedals = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.copy(crank).setZ(side * .226);
      bike.add(arm);
      rod(arm, vec(0, 0, 0), vec(pedalRadius, 0, 0), .022, steel);
      globe(arm, vec(0, 0, 0), [.042, .042, .022], darkSteel);
      const platform = new T.Group();
      bike.add(platform);
      rod(platform, vec(0, 0, -side * .105), vec(0, 0, side * .07), .016, steel);
      solid(platform, new T.BoxGeometry(.145, .038, .113), black);
      for (const x of [-.065, .065]) {
        const reflex = solid(platform, new T.BoxGeometry(.015, .022, .078), amber);
        reflex.position.x = x;
      }
      pedals.push({ side, arm, platform });
    }

    const ivory = standard(0xfff2db, .83);
    const throat = standard(0xf8dfbc, .83);
    const quills = [
      standard(0xfff0db, .75), standard(0xe7dce0, .78), standard(0xc3bccb, .74),
      standard(0x77798e, .77), standard(0x373b50, .78)
    ];
    const legSkin = standard(0xa76252, .82);
    const footSkin = standard(0xdb9768, .73);
    const toeSkin = standard(0xb87961, .77);
    const scarfMaterial = new T.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, roughness: .81, side: T.DoubleSide
    });

    function loft(parent, rows, widthSegments, makePoint, material) {
      const positions = [];
      const colors = [];
      const indices = [];
      for (let i = 0; i <= rows; i++) {
        for (let j = 0; j <= widthSegments; j++) {
          const { point, color } = makePoint(i / rows, j / widthSegments);
          positions.push(point.x, point.y, point.z);
          if (color) colors.push(color.r, color.g, color.b);
          if (i === rows || j === widthSegments) continue;
          const v = i * (widthSegments + 1) + j;
          indices.push(v, v + widthSegments + 1, v + 1, v + 1, v + widthSegments + 1, v + widthSegments + 2);
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      if (colors.length) geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return solid(parent, geometry, material);
    }

    function interpolate(rows, t) {
      const f = clamp(t, 0, 1) * (rows.length - 1);
      const i = Math.floor(f);
      const w = f - i;
      const left = rows[Math.max(i - 1, 0)];
      const start = rows[i];
      const end = rows[Math.min(i + 1, rows.length - 1)];
      const right = rows[Math.min(i + 2, rows.length - 1)];
      return start.map((p, j) => {
        const d = end[j];
        const m = (d - left[j]) * .5;
        const n = (right[j] - p) * .5;
        return (2 * p - 2 * d + m + n) * w * w * w + (-3 * p + 3 * d - 2 * m - n) * w * w + m * w + p;
      });
    }

    const featherPositions = [];
    const featherIndices = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const width = Math.pow(Math.max(.0001, Math.sin(t * Math.PI)), .68) * (.63 + .37 * t);
      for (let j = 0; j <= 10; j++) {
        const a = -j * tau / 10;
        featherPositions.push(t, .28 * t * t + Math.cos(a) * width, Math.sin(a) * width);
        if (i < 14 && j < 10) {
          const n = i * 11 + j;
          featherIndices.push(n, n + 11, n + 1, n + 1, n + 11, n + 12);
        }
      }
    }
    const featherGeometry = new T.BufferGeometry();
    featherGeometry.setAttribute("position", new T.Float32BufferAttribute(featherPositions, 3));
    featherGeometry.setIndex(featherIndices);
    featherGeometry.computeVertexNormals();

    function feather(parent, from, to, width, depth, material, roll = Math.PI / 2) {
      const delta = to.clone().sub(from);
      const vane = solid(parent, featherGeometry, material);
      vane.position.copy(from);
      vane.scale.set(delta.length(), depth, width);
      vane.quaternion.setFromUnitVectors(axisX, delta.normalize());
      vane.rotateX(roll);
      return vane;
    }

    const torso = globe(rider, vec(-.609, 2.137, 0), [.834, .531, .437], ivory);
    torso.rotation.z = .24;
    globe(rider, vec(-.217, 2.270, 0), [.456, .475, .377], throat).rotation.z = .49;
    globe(rider, vec(-.506, 2.179, 0), [.612, .472, .424], ivory).rotation.z = .57;

    for (let i = -3; i <= 3; i++) {
      const z = i * .071;
      feather(rider, vec(-.99, 2.140, z), vec(-1.65 + Math.abs(i) * .045, 2.043 + Math.abs(i) * .023, z * 1.17),
        .098, .034, quills[Math.abs(i) % 3], .08);
    }

    const neckRows = [
      [2.26, -.12, .360, .321], [2.48, .054, .314, .284], [2.65, .205, .249, .235],
      [2.83, .353, .206, .183], [3.02, .513, .201, .177], [3.13, .531, .143, .149]
    ];
    loft(rider, 30, 24, (t, u) => {
      const [y, x, rx, rz] = interpolate(neckRows, t);
      return { point: vec(x + rx * Math.cos(u * tau), y, rz * Math.sin(u * tau)) };
    }, ivory);

    const neckWrap = globe(rider, vec(.204, 2.656, 0), [.276, .115, .259], standard(0x164b9e, .75));
    neckWrap.rotation.z = -.40;
    const neckTrim = globe(rider, vec(.202, 2.684, 0), [.277, .027, .264], standard(0x557abb, .69));
    neckTrim.rotation.z = -.40;
    globe(rider, vec(-.022, 2.658, .175), [.144, .103, .129], standard(0x1e56b4, .73));

    const headPivot = new T.Group();
    headPivot.position.set(.456, 2.929, 0);
    rider.add(headPivot);
    const head = new T.Group();
    head.position.copy(headPivot.position).negate();
    headPivot.add(head);
    globe(head, vec(.553, 3.102, 0), [.397, .326, .289], ivory).rotation.z = .15;
    globe(head, vec(.695, 3.021, 0), [.269, .258, .262], throat);
    for (let i = 0; i < 7; i++) {
      const w = i - 3;
      feather(head, vec(.508, 3.299, w * .038), vec(.056 + Math.abs(w) * .020, 3.372 - Math.abs(w) * .027, w * .058),
        .054, .023, quills[Math.abs(w) > 1 ? 1 : 0], .25);
    }

    const bill = [
      [.771, 3.120, .213, .137, .094], [.968, 3.079, .288, .141, .224],
      [1.231, 3.049, .300, .107, .314], [1.525, 3.025, .250, .068, .282],
      [1.793, 3.014, .191, .047, .209], [2.060, 3.014, .112, .043, .112],
      [2.218, 2.984, .052, .050, .044], [2.263, 2.927, .005, .009, .012]
    ];
    const billMaterial = new T.MeshPhysicalMaterial({
      vertexColors: true, roughness: .48, clearcoat: .29, clearcoatRoughness: .44
    });
    const honey = new T.Color(0xffce7d);
    const rose = new T.Color(0xe98b63);
    const pulp = new T.Color(0xec987f);
    const velvet = new T.Color(0xf5c29c);
    const billBase = new T.Color(0xe7b882);
    loft(head, 55, 40, (t, u) => {
      const [x, y, width, upper, lower] = interpolate(bill, t);
      const a = u * tau;
      const s = Math.sin(a);
      let color;
      if (s >= 0) {
        color = honey.clone().lerp(rose, Math.pow(t, 2.7) * .75 + (1 - s) * .13);
      } else {
        const texture = Math.sin(a * 32 + t * 7) * Math.sin(t * 92) * .035;
        color = velvet.clone().lerp(pulp, clamp(-s * .7 + t * .27 + texture, 0, 1));
      }
      color.lerp(billBase, Math.max(0, 1 - 7 * t) * .68);
      return { point: vec(x, y + s * (s >= 0 ? upper : lower), Math.cos(a) * width), color };
    }, billMaterial);

    const seam = standard(0xa25a43, .68);
    const nostril = standard(0x69534c, .72);
    const lid = standard(0xc08a58, .58);
    const iris = standard(0x8a4e26, .34);
    const blackEye = new T.MeshPhysicalMaterial({
      color: 0x100f16, roughness: .14, clearcoat: 1, clearcoatRoughness: .10
    });
    const shine = new T.MeshBasicMaterial({ color: 0xfff9e7, toneMapped: false });
    const eyes = [];
    for (const side of [-1, 1]) {
      const line = [];
      for (let i = 0; i <= 26; i++) {
        const [x, y, width] = interpolate(bill, .03 + i * .962 / 26);
        line.push(vec(x, y + .001, side * (width + .0009)));
      }
      pipe(head, line, .006, seam, 34, 7);
      const nostrilMesh = globe(head, vec(1.06, 3.141, side * .256), [.038, .011, .013], nostril);
      nostrilMesh.rotation.z = -.13;

      const eye = new T.Group();
      eye.position.set(.694, 3.214, side * .244);
      eye.rotation.y = side * .22;
      head.add(eye);
      globe(eye, vec(0, 0, 0), [.102, .105, .052], lid);
      globe(eye, vec(.003, .003, side * .032), [.082, .085, .04], blackEye);
      globe(eye, vec(.018, -.001, side * .061), [.055, .057, .016], iris);
      globe(eye, vec(.024, 0, side * .071), [.044, .051, .016], blackEye);
      globe(eye, vec(.012, .019, side * .083), [.017, .017, .007], shine);
      globe(eye, vec(.043, -.016, side * .085), [.006, .007, .004], shine);
      eyes.push(eye);
      pipe(head, [
        vec(.590, 3.289, side * .216), vec(.659, 3.317, side * .232), vec(.739, 3.294, side * .232)
      ], .016, quills[1], 15);
    }

    const movingWings = [];
    const wingPalm = standard(0xf0dfc7, .76);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const folded = new T.Group();
      folded.position.set(-.319, 2.257, side * .303);
      rider.add(folded);
      globe(folded, vec(-.242, -.064, side * .066), [.568, .274, .143], quills[1]).rotation.z = .28;
      for (let j = 0; j < 9; j++) {
        feather(folded, vec(.053 - j * .039, .058 - j * .026, side * (.100 + .007 * j)),
          vec(-.603 - j * .038, -.076 - j * .028, side * (.139 + .008 * Math.sin(j))),
          .087, .026, quills[j < 4 ? 2 : j < 7 ? 3 : 4], Math.PI / 2 + side * .19);
      }
      for (let j = 0; j < 10; j++) {
        const column = j % 5;
        const row = Math.floor(j / 5);
        feather(folded, vec(.115 - row * .264 - column * .036, .193 - column * .064, side * (.115 + row * .020)),
          vec(-.321 - row * .305 - column * .045, .083 - column * .062, side * (.206 + .019 * Math.sin(j))),
          .061, .032, quills[j % 3 === 0 ? 1 : 0], Math.PI / 2 + side * .12);
      }
      const arm = new T.Group();
      rider.add(arm);
      const armBud = globe(arm, vec(.27, 0, 0), [.305, .105, .130], ivory);
      armBud.rotation.z = -.087;
      for (let j = 0; j < 5; j++) {
        feather(arm, vec(.135, .045 - j * .026, side * .060),
          vec(.64 + j * .038, .065 - j * .041, side * (.078 + j * .016)),
          .063, .026, quills[j < 2 ? 0 : j === 2 ? 1 : 2]);
      }
      const outerWing = new T.Group();
      rider.add(outerWing);
      for (let j = 0; j < 4; j++) {
        feather(outerWing, vec(0, .050 - j * .031, side * .011), vec(.94 + j * .05, .04 - j * .040, side * .004),
          .042, .025, quills[j < 2 ? 0 : 1], Math.PI / 2);
      }
      const fingers = new T.Group();
      bike.add(fingers);
      globe(fingers, vec(-.029, .006, 0), [.102, .061, .073], wingPalm);
      for (let j = 0; j < 3; j++) {
        const z = j * .035 - .035;
        pipe(fingers, [vec(-.03, .030, z), vec(.041, .018, z), vec(.061, -.032, z), vec(.034, -.050, z)], .018, wingPalm, 11, 7);
      }
      movingWings.push({ side, folded, arm, outerWing, fingers, grip: grips[i] });
    }

    const trailingCloth = [];
    for (let tail = 0; tail < 2; tail++) {
      const clothLength = tail ? 1.24 : 1.68;
      const stripe = new T.Color(tail ? 0x234f9c : 0x235ac6);
      const highlight = new T.Color(0x91bbff);
      const hem = new T.Color(0x19356f);
      const mesh = loft(rider, 32, 12, (t, u) => {
        const edge = Math.min(u, 1 - u);
        const color = stripe.clone().lerp(hem, edge < .06 ? .83 : .0);
        if ((edge > .06 && edge < .17) || (t > .86 && t < .89)) color.lerp(highlight, .67);
        color.multiplyScalar(.92 + .1 * Math.sin(t * 44 + u * 32));
        return { point: vec(-t * clothLength, u * .23, 0), color };
      }, scarfMaterial);
      mesh.geometry.attributes.position.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false;
      trailingCloth.push(mesh.geometry);
    }

    function createFoot(side) {
      const foot = new T.Group();
      bike.add(foot);
      const shape = new T.Shape();
      shape.moveTo(-.123, -.053);
      shape.bezierCurveTo(-.03, -.067, .068, -.091, .199, -.113);
      shape.quadraticCurveTo(.237, -.106, .218, -.072);
      shape.lineTo(.198, -.039);
      shape.quadraticCurveTo(.277, -.036, .284, .004);
      shape.quadraticCurveTo(.264, .037, .200, .039);
      shape.lineTo(.220, .079);
      shape.quadraticCurveTo(.238, .109, .188, .112);
      shape.quadraticCurveTo(.076, .083, -.113, .054);
      shape.quadraticCurveTo(-.152, .007, -.123, -.053);
      const web = new T.ExtrudeGeometry(shape, {
        depth: .025, bevelEnabled: true, bevelThickness: .015, bevelSize: .011, bevelSegments: 3, curveSegments: 9
      });
      const pad = solid(foot, web, footSkin);
      pad.rotation.x = -Math.PI / 2;
      for (const z of [-.085, 0, .085]) {
        pipe(foot, [vec(-.081, .022, 0), vec(.096, .032, z * .64), vec(z === 0 ? .248 : .201, .023, z)], .013, toeSkin, 10, 7);
      }
      globe(foot, vec(-.092, .041, 0), [.067, .064, .051], footSkin);
      return {
        side, foot, calf: solid(bike, new T.CylinderGeometry(.038, .051, 1, 12), legSkin),
        thigh: solid(bike, new T.CylinderGeometry(.065, .111, 1, 14), throat),
        knee: globe(bike, vec(0, 0, 0), [.070, .070, .067], legSkin),
        fluffy: globe(bike, vec(0, 0, 0), [.157, .232, .143], ivory)
      };
    }

    const legs = [createFoot(-1), createFoot(1)];
    const axisY = vec(0, 1, 0);
    const direction = vec(0, 0, 0);
    const ankle = vec(0, 0, 0);
    const hip = vec(0, 0, 0);
    const knee = vec(0, 0, 0);
    const elbow = vec(0, 0, 0);
    const chainPoint = vec(0, 0, 0);
    const chainDirection = vec(0, 0, 0);
    let lastCrank = 0;

    function alignLimb(mesh, start, end) {
      direction.subVectors(end, start);
      mesh.position.copy(start).lerp(end, .5);
      mesh.scale.y = direction.length();
      mesh.quaternion.setFromUnitVectors(axisY, direction.normalize());
    }

    function alignWing(mesh, start, end) {
      mesh.position.copy(start);
      direction.copy(end).sub(start);
      mesh.scale.x = direction.length();
      mesh.quaternion.setFromUnitVectors(axisX, direction.normalize());
    }

    function pose(distance, time, velocity, reaction) {
      const crankAngle = .4 - distance / wheelRadius * .516;
      const riding = Math.min(velocity * .20, 1);
      const beat = Math.cos(crankAngle * 2);
      const bob = .035 * beat * riding + .009 * Math.sin(time * 2.3);
      const shift = .019 * Math.sin(crankAngle) * riding;
      bike.rotation.x = Math.sin(crankAngle) * .028 * riding;
      rider.position.set(0, bob, shift);
      headPivot.rotation.z = .028 * Math.sin(crankAngle + .4) * riding + .080 * reaction;
      headPivot.rotation.y = -.13 * reaction + .034 * Math.sin(time * 1.8);
      const blinkWindow = (time + 1.5) % 4.17;
      const blink = blinkWindow < .185 ? Math.sin(blinkWindow / .185 * Math.PI) : 0;
      for (const eye of eyes) eye.scale.y = 1 - .94 * blink;

      backWheel.rotation.z = frontWheel.rotation.z = -distance / wheelRadius;
      crankGear.rotation.z = crankAngle;
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const { side, platform, arm } = pedals[i];
        const phase = crankAngle + (side < 0 ? Math.PI : 0);
        arm.rotation.z = phase;
        platform.position.set(crank.x + pedalRadius * Math.cos(phase), crank.y + pedalRadius * Math.sin(phase), side * .326);
        platform.rotation.z = .116 * Math.sin(phase - .55);
        leg.foot.rotation.z = platform.rotation.z;
        leg.foot.position.copy(platform.position).add(vec(-.033, .036, side * .003));
        ankle.set(-.090, .077, 0).applyAxisAngle(axisZ, platform.rotation.z).add(leg.foot.position);
        hip.set(-.589, 1.986 + bob, side * .271 + shift);
        direction.copy(ankle).sub(hip);
        const d = clamp(direction.length(), .04, 1.462);
        const a = .772;
        const b = .691;
        const along = (a * a - b * b + d * d) / (2 * d);
        const bend = Math.sqrt(Math.max(0, a * a - along * along));
        direction.normalize();
        knee.copy(hip).addScaledVector(direction, along);
        knee.addScaledVector(vec(-direction.y, direction.x, side * .082).normalize(), bend);
        alignLimb(leg.thigh, hip, knee);
        alignLimb(leg.calf, knee, ankle);
        leg.knee.position.copy(knee);
        leg.fluffy.position.copy(hip).lerp(knee, .16);
        leg.fluffy.quaternion.copy(leg.thigh.quaternion);
      }

      if (crankAngle !== lastCrank) {
        const progress = -(crankAngle - .4) * .209 / chainLength;
        for (let i = 0; i < linkCount; i++) {
          const u = (i / linkCount + progress) % 1;
          chainPath.getPointAt(u, chainPoint);
          chainPath.getTangentAt(u, chainDirection);
          dummy.position.copy(chainPoint);
          dummy.rotation.set(0, 0, Math.atan2(chainDirection.y, chainDirection.x));
          dummy.scale.set(1, i % 2 ? 1 : .88, 1);
          dummy.updateMatrix();
          chain.setMatrixAt(i, dummy.matrix);
        }
        chain.instanceMatrix.needsUpdate = true;
        lastCrank = crankAngle;
      }

      for (const wing of movingWings) {
        const shoulder = vec(-.218, 2.307, wing.side * .367);
        elbow.set(.48, 2.047 + .027 * Math.sin(crankAngle), wing.side * .474);
        const wrist = wing.grip.clone().sub(rider.position);
        alignWing(wing.arm, shoulder, elbow);
        alignWing(wing.outerWing, elbow, wrist);
        wing.folded.rotation.x = wing.side * (.04 + .034 * beat * riding);
        wing.fingers.position.copy(wing.grip);
        wing.fingers.rotation.z = -.15 + (wing.side > 0 ? reaction * .18 : 0);
      }

      for (let tail = 0; tail < trailingCloth.length; tail++) {
        const geometry = trailingCloth[tail];
        const positions = geometry.attributes.position;
        const wind = .33 + .67 * clamp(velocity / 10, 0, 1);
        for (let i = 0; i <= 32; i++) {
          const t = i / 32;
          const wave = time * (3.8 + wind) - t * 8.3 + tail * 1.67;
          const lift = Math.sin(wave + 1.5) * .11 * t + Math.sin(t * 5.1) * .07;
          const twist = Math.sin(wave * .68) * t;
          for (let j = 0; j <= 12; j++) {
            const r = j / 12;
            const w = (r - .5) * (.185 - t * .069);
            const cleft = Math.max(0, 1 + (t - 1) * 14) * Math.sin(r * Math.PI) * .105;
            positions.setXYZ(i * 13 + j,
              .055 - (tail ? 1.24 : 1.68) * t + cleft + .05 * t * Math.cos(wave),
              2.666 + (tail ? -.21 : .12) * t + lift * wind + w * Math.cos(twist) - (1 - wind) * t * .15,
              .188 + tail * .048 + .128 * t + Math.sin(wave) * t * .17 * wind + w * Math.sin(twist));
          }
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
      }
    }

    return { pose };
  };
})();
