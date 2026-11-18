'use strict';
function buildCyclist(scene){
  const {T,v,TAU,paint,group,mesh,oval,box,rod,between,ring,curve,sculpt,canvasTexture,batch}=Atelier;
  const drive=Atelier.drive,bike=group(scene);bike.position.z=.13;bike.scale.setScalar(drive.modelScale);
  const frame=group(bike),wheels=[],cranks=[],legs=[],eyes=[];
  const ink=paint('#293d3c',.43,.25),chrome=paint('#ccd8ce',.26,.77),steel=paint('#869a95',.32,.62);
  const red=paint('#e96840',.35,.21),redDark=paint('#a8462c',.48,.18);
  const tire=paint('#293c3b',.9),rubber=paint('#49534b',.85),sidewall=paint('#ddbc86',.84);
  const saddle=paint('#915232',.50),leather=paint('#ad6b42',.49),milk=paint('#fff2d8',.65),ivory=paint('#f2e5cf',.7);
  const warm=paint('#e4d8bd'),feather=paint('#345051',.72),darkFeather=paint('#283e40',.76);
  const citron=paint('#e6a54f',.58),skin=paint('#e3a05c',.62),web=paint('#eba25c',.57);
  const teal=paint('#268983',.72),deepTeal=paint('#205d5a'),scarf=paint('#e76342',.78);
  const seat=[-.48,1.61,0],bottom=[-.10,.736,0],rear=[-1.04,.695,0],front=[1.04,.695,0],headL=[.745,1.26,0],headH=[.648,1.60,0];
  function line(a,b,r,m=red,end=r){return rod(frame,a,b,r,m,end,16)}
  // The rims, hubs, alternating spoke crossings, valve stems and sidewall lettering
  // share each wheel's local axle so even the small details travel with the tyre.
  for(const wx of [-1.04,1.04]){
    const wheel=group(bike);wheel.position.set(wx,.695,0);wheels.push(wheel);
    ring(wheel,0,0,0,.633,.058,tire,88);
    for(const s of [-1,1]){
      ring(wheel,0,0,s*.032,.624,.034,sidewall,88);
      ring(wheel,0,0,s*.033,.586,.016,chrome,72);
      ring(wheel,0,0,s*.049,.640,.006,rubber,80);
      ring(wheel,0,0,s*.046,.607,.006,'#eed5a3',80);
      rod(wheel,[0,0,s*.052],[0,0,s*.088],.084,steel,.075,18);
      for(let k=0;k<15;k++){
        const a=k*TAU/15+(s>0?.105:0),b=a+(k%2?.52:-.52);
        rod(wheel,[.070*Math.cos(b),.070*Math.sin(b),s*.08],[.58*Math.cos(a),.58*Math.sin(a),s*.018],.0074,chrome,.006,6);
      }
    }
    rod(wheel,[0,0,-.13],[0,0,.13],.043,ink);
    rod(wheel,[.31,.50,.022],[.282,.452,.022],.012,ink);
    for(let j=0;j<5;j++){
      const a=.72+j*.060,r=.647;
      const hash=box(wheel,r*Math.cos(a),r*Math.sin(a),.052,.016,.035,.006,'#f1d9ad');hash.rotation.z=a;
    }
    batch(wheel);
  }
  // Brazed touring frame, twin stays, fork blades, mudguards, leather cockpit.
  line(bottom,seat,.056);line(seat,headH,.050);line(bottom,headL,.069);line(headL,headH,.068);
  for(const s of [-1,1]){
    line([bottom[0],bottom[1],s*.067],[rear[0],rear[1],s*.122],.032,red,.023);
    line([seat[0],seat[1]-.028,s*.044],[rear[0],rear[1],s*.122],.027,red,.022);
    curve(frame,[[headL[0],headL[1],s*.045],[.798,1.118,s*.118],[.884,.848,s*.130],[front[0],front[1],s*.132]],.035,red,26);
    for(const wx of [-1.04,1.04]){
      rod(frame,[wx,.695,s*.123],[wx,.695,s*.156],.056,steel,.044,8);
      rod(frame,[wx,.695,s*.157],[wx,.695,s*.166],.026,chrome,.026,6);
    }
    curve(frame,[[-1.06,.704,s*.137],[-1.36,.95,s*.106],[-1.59,1.15,s*.069]],.013,chrome,12,5);
    curve(frame,[[1.04,.70,s*.145],[1.32,.92,s*.10],[1.55,1.16,s*.069]],.011,chrome,12,5);
  }
  for(const wx of [-1.04,1.04]){
    const f=[];
    for(let j=0;j<=24;j++){const a=(26+j*130/24)*Math.PI/180;f.push([wx+Math.cos(a)*.730,.695+Math.sin(a)*.730,0])}
    curve(frame,f,.037,'#bd8f59',30,8);
  }
  // Frame transfer: a maker's name printed on both sides of the down tube.
  const transfer=canvasTexture(512,96,c=>{c.fillStyle='#fff1cf';c.font='italic bold 76px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('PELAGO',252,52)});
  const transferMat=new T.MeshBasicMaterial({map:transfer,transparent:true,depthWrite:false,side:T.DoubleSide});
  for(const s of [-1,1]){
    const o=mesh(frame,new T.PlaneGeometry(.50,.094),transferMat,.33,1.012,s*.068);o.rotation.z=.553;
  }
  const d0=v(...bottom),d1=v(...headL);
  for(const f of [.70,.77])rod(frame,d0.clone().lerp(d1,f),d0.clone().lerp(d1,f+.026),.071,milk);
  line(seat,[-.532,1.783,0],.039,chrome);line([-.496,1.655,0],[-.506,1.69,0],.062,ink);
  oval(frame,-.54,1.80,0,.247,.077,.155,saddle);oval(frame,-.397,1.796,0,.20,.055,.091,leather);
  curve(frame,[[-.713,1.775,0],[-.60,1.696,0],[-.43,1.721,0],[-.36,1.765,0]],.015,chrome,16);
  line(headH,[.602,1.778,0],.042,chrome);line([.602,1.778,0],[.833,1.837,0],.037,chrome);
  curve(frame,[[.76,1.85,-.37],[.86,1.86,-.26],[.85,1.842,0],[.86,1.86,.26],[.76,1.85,.37]],.030,chrome,26);
  for(const s of [-1,1]){
    curve(frame,[[.85,1.86,s*.25],[.78,1.86,s*.365],[.68,1.82,s*.407]],.043,leather,14);
    for(let j=0;j<4;j++)oval(frame,.696+j*.030,1.825+j*.008,s*(.399-j*.018),.011,.044,.042,saddle);
    line([.79,1.82,s*.30],[.715,1.73,s*.355],.015,chrome);
    curve(frame,[[.79,1.82,s*.307],[1.008,1.62,s*.32],[.98,1.35,s*.23],[.78,1.246,s*.087]],.010,ink,22,6);
  }
  const brass=paint('#d8ae62',.27,.66);
  oval(frame,.857,1.925,.222,.073,.051,.076,brass);line([.857,1.87,.222],[.857,1.926,.222],.024,ink);
  line([.86,1.90,.242],[.803,1.912,.30],.011,ink);oval(frame,.794,1.913,.31,.022,.014,.022,ink);
  const lens=new T.MeshStandardMaterial({color:'#ffdf98',roughness:.17,metalness:.14,emissive:'#ffc26c',emissiveIntensity:.38});
  line([.746,1.43,0],[.932,1.526,0],.020,chrome);oval(frame,.981,1.551,0,.112,.092,.092,deepTeal);
  rod(frame,[1.058,1.55,0],[1.087,1.55,0],.079,brass,.073,24);oval(frame,1.087,1.55,0,.017,.067,.067,lens);
  // A wind-up chain transmission with straight common tangents and circular wraps.
  const R=drive.chainring,r=drive.sprocket,C=v(bottom[0],bottom[1],0),D=v(rear[0],rear[1],0),chainZ=.143;
  const axis=C.clone().sub(D).normalize(),perp=v(-axis.y,axis.x,0),q=(R-r)/C.distanceTo(D);
  const top=axis.clone().multiplyScalar(-q).addScaledVector(perp,Math.sqrt(1-q*q)),low=axis.clone().multiplyScalar(-q).addScaledVector(perp,-Math.sqrt(1-q*q));
  const chainPts=[];
  const chainPoint=(center,radius,n)=>center.clone().addScaledVector(n,radius).setZ(chainZ);
  function addArc(center,radius,start,end){while(end>=start)end-=TAU;for(let j=0;j<=24;j++){const a=start+(end-start)*j/24;chainPts.push(v(center.x+radius*Math.cos(a),center.y+radius*Math.sin(a),chainZ))}}
  chainPts.push(chainPoint(D,r,top));
  addArc(C,R,Math.atan2(top.y,top.x),Math.atan2(low.y,low.x));
  addArc(D,r,Math.atan2(low.y,low.x),Math.atan2(top.y,top.x));
  const path=new T.CurvePath();for(let i=1;i<chainPts.length;i++)path.add(new T.LineCurve3(chainPts[i-1],chainPts[i]));
  mesh(frame,new T.TubeGeometry(path,116,.015,6,false),ink);
  const linkGeom=new T.SphereGeometry(1,6,4),chain=new T.InstancedMesh(linkGeom,steel,57);
  bike.add(chain);const linkPose=new T.Object3D();linkPose.scale.set(.020,.012,.017);chain.frustumCulled=false;
  const disk=group(bike);disk.position.copy(C);disk.position.z=chainZ;
  ring(disk,0,0,0,R-.018,.022,chrome,48);ring(disk,0,0,0,.117,.014,steel,32);
  for(let j=0;j<5;j++){const a=TAU*j/5;rod(disk,[0,0,0],[.183*Math.cos(a),.183*Math.sin(a),0],.016,steel)}
  for(let j=0;j<30;j++){const a=TAU*j/30;const tooth=box(disk,.201*Math.cos(a),.201*Math.sin(a),0,.028,.014,.026,steel);tooth.rotation.z=a}
  ring(frame,D.x,D.y,chainZ,r-.012,.018,chrome,24);
  line([C.x,C.y,-.22],[C.x,C.y,.22],.055,steel);batch(disk);
  for(const s of [-1,1]){
    const crank=group(bike);crank.position.set(C.x,C.y,s*.191);cranks.push(crank);
    rod(crank,[0,0,0],[.26,0,0],.022,chrome,.029);oval(crank,0,0,0,.052,.050,.029,ink);
    rod(crank,[.26,0,0],[.26,0,s*.088],.023,steel);
    batch(crank);
  }
  batch(frame);

  const rider=group(bike),plumage=group(rider),head=group(rider);
  // The torso and neck overlap at their broadest section, leaving a continuous throat.
  sculpt(plumage,[[-1.28,2.31,.018,.018],[-1.10,2.29,.18,.21],[-.81,2.25,.33,.34],[-.42,2.24,.45,.41],[-.08,2.28,.455,.394],[.19,2.36,.335,.315],[.34,2.48,.16,.20],[.38,2.57,.024,.03]],milk);
  for(let j=0;j<5;j++){
    const s=(j-2)*.10;
    sculpt(plumage,[[-1.54+Math.abs(s)*.45,2.40+s*.12,.010,.012,s],[-1.32,2.36,.067,.062,s],[-1.02,2.33,.092,.075,s*.8],[-.83,2.32,.025,.025,s*.65]],j%2?darkFeather:feather,22,12);
  }
  sculpt(plumage,[[.055,2.32,.28,.25],[.162,2.55,.292,.275],[.213,2.75,.205,.208],[.167,2.96,.173,.183],[.132,3.135,.179,.189],[.216,3.31,.209,.195],[.35,3.39,.152,.165]],milk,46,32);
  const breeze=group(rider);breeze.position.set(.14,2.736,0);
  oval(breeze,0,0,0,.257,.105,.258,scarf).rotation.z=-.10;
  oval(breeze,-.213,.027,.025,.116,.095,.095,redDark);
  const tails=[];
  for(let j=0;j<2;j++){
    const tail=group(breeze);tail.position.set(-.215,.020,j?.078:-.04);tails.push(tail);
    const len=j?.62:.78;
    sculpt(tail,[[-len,.075+j*.08,.006,.008],[-len*.84,.096+j*.065,.044,.025],[-len*.59,.045+j*.035,.052,.037],[-len*.28,.085,.060,.042],[0,0,.032,.032]],j?scarf:redDark,26,12);
    const stripe=box(tail,-len*.81,.102+j*.06,.018,.031,.07,.035,'#f6af70');stripe.rotation.z=-.16;
  }
  // The far wing reaches the opposite grip. The near wing shows several overlapping
  // ranks of primaries, with a deliberately strong dark trailing edge.
  for(const s of [-1,1]){
    const wing=group(plumage);wing.position.z=s*.305;
    sculpt(wing,[[-1.317,2.257,.020,.018],[-1.077,2.26,.112,.076],[-.65,2.31,.252,.134],[-.32,2.35,.277,.167],[-.079,2.38,.212,.126],[.023,2.37,.066,.051]],ivory,34,22);
    for(let j=0;j<5;j++){
      const yy=2.16+j*.065,x0=-1.32+j*.074,z=s*(.056+j*.012);
      sculpt(wing,[[x0,yy-.036,.009,.014,z],[x0+.175,yy-.005,.043,.036,z+s*.015],[-.77+j*.035,yy+.063,.074,.049,z+s*.034],[-.48+j*.043,yy+.13,.042,.037,z+s*.021]],j%2?feather:darkFeather,20,12);
    }
    for(let j=0;j<4;j++){
      const yy=2.201+j*.065,z=s*.129;
      sculpt(wing,[[-.88+j*.09,yy,.014,.015,z],[-.68+j*.057,yy+.056,.075,.030,z+s*.026],[-.39+j*.074,yy+.105,.077,.043,z+s*.021],[-.16+j*.03,yy+.115,.020,.015,z]],j%2?milk:warm,20,14);
    }
    sculpt(wing,[[-.18,2.38,.115,.092,s*.077],[.033,2.30,.124,.103,s*.076],[.23,2.13,.098,.088,s*.063],[.48,2.006,.072,.073,s*.056],[.695,1.90,.045,.049,s*.070],[.783,1.874,.017,.021,s*.065]],ivory,33,18);
    for(let j=0;j<3;j++){
      const z=s*(.045+j*.021);
      sculpt(wing,[[.41,2.04+j*.02,.036,.039,z],[.55,1.965+j*.012,.045,.035,z],[.70+j*.022,1.88,.039,.033,z],[.742+j*.025,1.857,.012,.014,z]],j===0?feather:warm,16,12);
    }
  }
  batch(plumage);
  head.position.set(.223,3.29,0);
  const face=group(head);
  oval(face,.098,.123,0,.366,.319,.279,milk);
  oval(face,.187,.049,0,.28,.213,.237,milk);
  // Separate mandibles give the long bill its characteristic falling pouch and hooked nail.
  sculpt(face,[[.257,.081,.052,.151],[.363,.026,.137,.213],[.563,-.052,.172,.210],[.815,-.090,.163,.174],[1.071,-.073,.128,.125],[1.309,-.025,.072,.072],[1.537,.028,.026,.031],[1.59,.039,.006,.009]],paint('#f1ae65',.52),52,32);
  for(const s of [-1,1]){
    curve(face,[[.375,.024,s*.195],[.566,-.064,s*.204],[.874,-.149,s*.153],[1.21,-.085,s*.090],[1.477,.012,s*.038]],.0082,'#d99557',32,6);
    curve(face,[[.365,-.015,s*.186],[.629,-.156,s*.161],[.88,-.197,s*.104],[1.15,-.122,s*.068]],.0063,'#e5a05b',26,6);
  }
  sculpt(face,[[.254,.163,.084,.156],[.424,.150,.093,.213],[.67,.118,.065,.194],[.942,.097,.051,.147],[1.19,.083,.039,.105],[1.451,.078,.032,.049],[1.566,.069,.037,.029],[1.593,.028,.019,.015]],paint('#e99543',.44),54,32);
  for(const s of [-1,1]){
    curve(face,[[.297,.112,s*.150],[.47,.095,s*.211],[.72,.072,s*.18],[.985,.062,s*.139],[1.23,.054,s*.092],[1.51,.048,s*.037]],.011,'#925332',35,7);
    curve(face,[[.484,.216,s*.123],[.73,.17,s*.105],[1.13,.128,s*.056],[1.44,.108,s*.021]],.009,'#f6bd72',32,7);
    oval(face,.496,.192,s*.141,.054,.012,.014,'#af713e').rotation.z=-.11;
    const eye=group(head);eye.position.set(.235,.187,s*.238);eyes.push(eye);
    const surround=oval(eye,0,0,0,.115,.104,.052,'#e8b76c');surround.rotation.z=.08;
    oval(eye,.005,.006,s*.034,.087,.082,.038,'#fff1d2');
    oval(eye,.014,.008,s*.059,.065,.069,.031,ink);
    oval(eye,.027,.032,s*.088,.021,.022,.011,'#fffbea');
    curve(face,[[.132,.267,s*.206],[.207,.29,s*.219],[.291,.28,s*.204]],.014,warm,15,7);
  }
  // The cycling cap is an elliptical hemisphere. The middle gore is separately
  // coloured and the seams follow the crown all the way down to its sweatband.
  const cap=group(face);cap.position.set(.064,.292,0);cap.rotation.z=.12;
  const capGeo=new T.SphereGeometry(1,56,22,0,TAU,0,Math.PI*.50);
  const capMesh=mesh(cap,capGeo,teal);capMesh.scale.set(.345,.200,.283);
  oval(cap,0,0,0,.352,.043,.285,deepTeal);
  const patchPos=[],patchIdx=[];
  for(let j=0;j<=34;j++){
    const a=j*Math.PI/34;
    for(let k=0;k<=8;k++){
      const b=(k/8-.5)*.57,co=Math.cos(b);
      patchPos.push(-.347*Math.cos(a)*co,.203*Math.sin(a)*co,.286*Math.sin(b));
      if(j<34&&k<8){const q=j*9+k;patchIdx.push(q,q+1,q+9,q+1,q+10,q+9)}
    }
  }
  const patchGeo=new T.BufferGeometry();patchGeo.setAttribute('position',new T.Float32BufferAttribute(patchPos,3));patchGeo.setIndex(patchIdx);patchGeo.computeVertexNormals();
  const capStripe=paint('#e3b669').clone();capStripe.side=T.DoubleSide;mesh(cap,patchGeo,capStripe);
  for(const s of [-1,1]){
    const pts=[];for(let k=0;k<=16;k++){const a=k*Math.PI/16;pts.push([-.349*Math.cos(a)*.96,.204*Math.sin(a)*.96,s*.082])}
    curve(cap,pts,.006,'#f6de9d',22,6);
  }
  const brim=oval(cap,.284,-.008,0,.225,.034,.244,deepTeal);brim.rotation.z=.12;
  const brimTop=oval(cap,.287,.008,0,.215,.025,.238,teal);brimTop.rotation.z=.12;
  oval(cap,0,.204,0,.032,.019,.031,deepTeal);
  batch(face);
  for(const s of [-1,1]){
    const leg=group(bike);
    const thigh=rod(leg,[0,0,0],[0,1,0],.050,skin,.040,15),shin=rod(leg,[0,0,0],[0,1,0],.037,citron,.027,15);
    const knee=oval(leg,0,0,0,.055,.052,.052,skin);
    const cuff=oval(leg,0,0,0,.078,.092,.083,ivory);
    const foot=group(leg),pedal=group(leg);
    box(pedal,0,0,0,.22,.048,.111,ink);
    for(const x of [-.065,0,.065])box(pedal,x,.025,0,.013,.009,.106,steel);
    // A scalloped web spans the three digits. Rounded toes protrude from its leading edge.
    const footOutline=[[-.079,0],[-.034,-.051],[.125,-.108],[.103,-.065],[.184,-.019],[.126,.007],[.157,.087],[.049,.052],[-.025,.064]];
    Atelier.slab(foot,footOutline,-.013,.016,web,.012);
    oval(foot,-.032,.035,0,.062,.049,.052,web);
    for(const [tx,tz] of [[.125,-.108],[.184,-.019],[.157,.087]])curve(foot,[[-.05,.029,0],[.030,.033,tz*.4],[tx,.017,tz]],.014,skin,10,7);
    batch(foot);batch(pedal);legs.push({s,thigh,shin,knee,cuff,foot,pedal});
  }
  return function updateCyclist(t,phase,bellMotion){
    const bob=.016*Math.cos(phase*2),sway=.017*Math.sin(phase),radius=.26;
    rider.position.set(0,bob,sway*.65);rider.rotation.z=.007*Math.sin(phase*2);
    head.rotation.z=.017*Math.sin(phase*2-.4)+bellMotion*.075;head.rotation.y=.046*Math.sin(t*.66)+bellMotion*.13;
    tails.forEach((tail,i)=>{tail.rotation.z=.065*Math.sin(t*5.6-i*.7);tail.rotation.y=.105*Math.sin(t*4.2+i)});
    const blink=t%4.83;eyes.forEach(eye=>eye.scale.y=blink>4.63?.10+.90*Math.abs((blink-4.73)/.10):1);
    disk.rotation.z=phase;wheels.forEach(w=>w.rotation.z=phase*R/r);
    const chainOffset=-phase*R/path.getLength();
    for(let j=0;j<57;j++){const f=((j/57+chainOffset)%1+1)%1;linkPose.position.copy(path.getPointAt(f));linkPose.updateMatrix();chain.setMatrixAt(j,linkPose.matrix)}chain.instanceMatrix.needsUpdate=true;
    legs.forEach(({s,thigh,shin,knee,cuff,foot,pedal},i)=>{
      const a=phase+i*Math.PI,px=C.x+radius*Math.cos(a),py=C.y+radius*Math.sin(a),pz=s*.269;
      cranks[i].rotation.z=a;pedal.position.set(px,py,pz);foot.position.set(px-.014,py+.055,pz);
      foot.rotation.z=-.09+.12*Math.cos(a);
      const hip=v(-.37,1.965+bob,pz+sway*.5),ankle=v(px-.052,py+.103,pz);
      const dx=ankle.x-hip.x,dy=ankle.y-hip.y,dist=Math.hypot(dx,dy),u=dx/dist,w=dy/dist;
      const thighLen=.72,shinLen=.82,along=(thighLen**2-shinLen**2+dist**2)/(2*dist),offset=Math.sqrt(Math.max(0,thighLen**2-along**2));
      const joint=v(hip.x+u*along+w*offset,hip.y+w*along-u*offset,pz+s*.015);
      between(thigh,hip,joint);between(shin,joint,ankle);knee.position.copy(joint);cuff.position.copy(hip).lerp(joint,.075);
    });
  };
}
