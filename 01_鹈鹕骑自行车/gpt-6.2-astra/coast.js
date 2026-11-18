'use strict';
function buildCoast(scene){
  const {T,v,TAU,paint,group,mesh,oval,box,rod,ring,curve,sculpt,slab,random,canvasTexture,shadow,batch}=Atelier;
  const rand=random(27181),pick=a=>a[Math.floor(rand()*a.length)],between=(lo,hi)=>lo+(hi-lo)*rand();
  const fixed=group(scene),geology=group(fixed),small=group(fixed),time={value:0};
  const chalk='#fff1d3',iron='#284e4d',tangerine='#de6746';
  const outline=[[-4.52,-1.50],[-4.18,-2.06],[-3.30,-2.25],[-1.55,-2.46],[.12,-2.40],[2.19,-2.38],[3.45,-2.17],[4.24,-1.80],[4.54,-1.24],[4.6,.72],[4.32,1.47],[3.74,1.98],[2.52,2.26],[.38,2.45],[-1.55,2.36],[-3.34,2.14],[-4.14,1.77],[-4.57,1.02]];
  const water=paint('#3fafa9',.33,.13).clone();
  water.onBeforeCompile=s=>{
    s.uniforms.seaTime=time;
    s.vertexShader='varying vec2 seaPoint;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n seaPoint=position.xz;');
    s.fragmentShader='uniform float seaTime; varying vec2 seaPoint;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=seaPoint;
      float flow=p.y*26.0+1.4*sin(p.x*3.4+seaTime*.7)+.65*sin(p.x*5.7-p.y*2.8-seaTime*.55)+seaTime*1.3;
      float crest=smoothstep(.91,.99,sin(flow))*smoothstep(.05,.84,sin(p.x*8.0+p.y*4.4+sin(p.y*12.0)+seaTime*.33));
      float shallow=.5+.5*sin(p.y*2.1+sin(p.x*1.2));
      diffuseColor.rgb*=.89+shallow*.13;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.74,.93,.78),crest*.47);
    `);
  };
  slab(geology,outline.map(([x,z])=>[x*.985,z*.98]),-1.03,-.94,paint('#265b5c'),.045);
  slab(geology,outline,-.90,-.49,[water,paint('#298a8b',.48,.1)],.082);
  const shore=[[-4.04,-.45],[-3.90,-1.18],[-3.40,-1.65],[-2.70,-1.72],[-2.10,-1.56],[-1.48,-1.64],[-.96,-1.37],[-.48,-1.24],[.18,-1.39],[.85,-1.18],[1.45,-1.30],[1.99,-1.10],[2.52,-1.23],[3.08,-1.03],[3.67,-.96],[4.01,-.61],[4.07,.38],[3.90,.62],[3.37,.77],[2.87,.70],[2.41,.92],[1.86,.97],[1.24,.88],[.78,1.15],[.21,1.11],[-.31,1.22],[-.77,1.04],[-1.36,1.09],[-1.93,.90],[-2.55,1.05],[-3.13,.87],[-3.66,.92],[-4.04,.51]];
  slab(geology,shore.map(([x,z])=>[x*1.036,z*1.11]),-.46,-.36,paint('#d6c796'),.045);
  slab(geology,shore.map(([x,z])=>[x*1.015,z*1.055]),-.36,-.20,paint('#a8896c'),.042);
  slab(geology,shore,-.21,-.075,[paint('#b6ba80'),paint('#bda78a')],.045);
  const asphalt=paint('#526566',.96).clone();
  const grain=canvasTexture(256,256,c=>{
    c.fillStyle='#e8e6df';c.fillRect(0,0,256,256);
    for(let i=0;i<4800;i++){const l=Math.floor(between(120,243));c.fillStyle='rgb('+l+','+l+','+l+')';c.globalAlpha=between(.18,.5);c.fillRect(rand()*256,rand()*256,between(.5,1.8),between(.5,1.7))}
  });
  grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(1.2,1.2);asphalt.map=grain;
  const roadway=[[-4.03,-.60],[-3.9,-.67],[3.86,-.67],[4.02,-.59],[4.04,.46],[3.93,.57],[-3.91,.57],[-4.04,.48]];
  slab(geology,roadway,-.08,-.018,[asphalt,paint('#8c968a')],.018);
  for(const z of [-.59,.49])box(small,0,.004,z,7.86,.006,.024,'#e4dcb3');
  const dashes=[];
  for(let i=0;i<15;i++)dashes.push(box(scene,0,.008,-.17,.268,.009,.028,'#efbd70'));
  shadow(scene,-.1,-1.22,.08,11.8,6.65,.52);
  shadow(scene,-.18,.014,.12,3.65,.84,.52);
  for(const x of [-1.04,1.04])shadow(scene,x,.017,.09,.65,.26,.76);
  // A narrow enamel maker's plate fastened to the seaward face of the plinth.
  const plaque=group(small);plaque.position.set(.24,-.72,2.458);plaque.rotation.y=.077;
  box(plaque,0,0,0,1.47,.223,.038,'#195c5e');
  const enamel=canvasTexture(768,108,c=>{c.fillStyle='#195c5e';c.fillRect(0,0,768,108);c.fillStyle='#f4eac8';c.font='bold 54px Consolas, monospace';c.textAlign='center';c.textBaseline='middle';c.fillText('P E L A G O   /   0 1',384,57)});
  mesh(plaque,new T.PlaneGeometry(1.29,.182),new T.MeshBasicMaterial({map:enamel}),0,0,.024);
  for(const x of [-.685,.685])oval(plaque,x,0,.026,.027,.027,.012,'#e5bd7c');
  const rockGeo=new T.DodecahedronGeometry(1,0),stoneColors=['#7e9690','#8b9e93','#a6aaa0','#b7b8a8','#7c918a'];
  function rock(x,y,z,size,col){
    const r=mesh(small,rockGeo,paint(col||pick(stoneColors)),x,y,z);
    r.scale.set(size*between(.8,1.3),size*between(.50,.83),size*between(.65,.98));r.rotation.set(rand()*.4,rand()*6,rand()*.3);return r;
  }
  // Follow the irregular front of the shore with individual stones and pools of spume.
  for(let i=17;i<shore.length-1;i++){
    const [x,z]=shore[i],[nx,nz]=shore[i+1];
    for(let j=0;j<3;j++){
      const t=(j+rand()*.5)/3,px=x+(nx-x)*t,pz=z+(nz-z)*t;
      rock(px,-.31+rand()*.04,pz+.05,between(.075,.20));
      if(rand()>.32){const s=between(.08,.16);oval(small,px,-.399,pz+between(.18,.26),s,.009,s*.35,'#dce8cd')}
    }
  }
  const seaRocks=[[-3.7,1.43,.30],[-3.42,1.6,.13],[-1.60,1.56,.23],[-1.32,1.52,.12],[.94,1.40,.19],[3.70,1.02,.27],[3.73,-1.56,.26],[-2.9,-2.0,.17]];
  function waterRing(p,x,z,size){
    const g=ring(p,x,-.397,z,size,.009,'#cae3cf',44);g.rotation.x=Math.PI/2;g.scale.y=.53;
  }
  seaRocks.forEach(([x,z,s])=>{rock(x,-.397,z,s);waterRing(small,x,z,s*1.25)});
  // The striped masonry lighthouse and its tiny keeper's cottage.
  const tower=group(small);tower.position.set(-3.05,-.025,-1.06);
  rod(tower,[0,0,0],[0,.115,0],.35,'#9d9278',.31,24);
  const bands=['#f1e7cf','#d75c43','#f4ead2','#d75c43','#f6ead2'];
  for(let j=0;j<5;j++)rod(tower,[0,.10+j*.226,0],[0,.326+j*.226,0],.265-j*.019,bands[j],.246-j*.019,28);
  box(tower,0,.22,.244,.12,.22,.021,'#426462');box(tower,.005,.23,.256,.088,.16,.012,'#284e49');
  for(const [y,r] of [[.65,.221],[1.065,.187]])box(tower,0,y,r,.062,.094,.014,iron);
  rod(tower,[0,1.205,0],[0,1.27,0],.26,iron,.26,32);
  for(let j=0;j<10;j++){const a=j*TAU/10;rod(tower,[.24*Math.cos(a),1.26,.24*Math.sin(a)],[.24*Math.cos(a),1.375,.24*Math.sin(a)],.010,iron)}
  const rail=ring(tower,0,1.37,0,.24,.012,iron,36);rail.rotation.x=Math.PI/2;
  rod(tower,[0,1.27,0],[0,1.535,0],.148,'#b1d2bd',.148,12);
  const lampMat=new T.MeshStandardMaterial({color:'#ffd380',emissive:'#ffa242',emissiveIntensity:.45,roughness:.3});
  oval(tower,.016,1.40,.065,.089,.105,.091,lampMat);
  for(let j=0;j<6;j++){const a=j*TAU/6;rod(tower,[.151*Math.cos(a),1.27,.151*Math.sin(a)],[.151*Math.cos(a),1.54,.151*Math.sin(a)],.012,iron)}
  rod(tower,[0,1.545,0],[0,1.70,0],.232,iron,.015,16);rod(tower,[0,1.68,0],[0,1.81,0],.015,iron);
  const shed=group(small);shed.position.set(-2.36,-.018,-1.14);shed.rotation.y=-.22;
  box(shed,0,.17,0,.53,.37,.38,'#e2c89c');box(shed,.12,.11,.197,.11,.22,.014,iron);
  box(shed,-.1,.19,.198,.12,.11,.018,'#698c84');
  for(const side of [-1,1]){const slope=box(shed,0,.415,side*.105,.61,.043,.27,tangerine);slope.rotation.x=side*.5}
  box(shed,-.15,.47,-.08,.07,.19,.08,'#be957d');
  for(const [x,z] of [[-3.7,-.84],[-2.0,-.87],[2.25,-.88],[3.05,-.86],[3.69,-.84]]){
    rod(small,[x,-.04,z],[x,.26,z],.048,chalk,.041,8);rod(small,[x,.16,z],[x,.23,z],.049,tangerine,.047,8);
  }
  // Hand-sown tufts, sea pinks and the occasional wind-bent leaf.
  const leaf=new T.ConeGeometry(1,1,4),foliage=['#608e74','#79966b','#97a66b','#789c79'];
  function tuft(x,z,size,flower){
    for(let i=0;i<5;i++){
      const angle=rand()*TAU,h=size*between(.48,1.25),o=mesh(small,leaf,paint(pick(foliage)),x+Math.cos(angle)*size*.17,-.043+h*.40,z+Math.sin(angle)*size*.18);
      o.scale.set(size*between(.08,.16),h,size*.11);o.rotation.set(Math.sin(angle)*.34,angle,-.22-Math.cos(angle)*.28);
    }
    if(flower)for(let i=0;i<2;i++){
      const a=v(x+i*.038,-.04,z),b=v(x+.02+i*.04,.04+size*.8+i*.02,z+.014);
      rod(small,a,b,.007,'#66816a',.005,5);const bloom=mesh(small,rockGeo,paint(flower),b.x,b.y,b.z);bloom.scale.set(.038,.028,.033);
    }
  }
  for(let i=0;i<45;i++){
    const x=between(-3.85,3.82),back=i%3===0,z=back?between(-.94,-.74):between(.63,Math.abs(x)<2?.90:.76);
    tuft(x,z,between(.08,.21),i%5===0?pick(['#f4bb64','#e68d78','#f4e6be']):null);
  }
  // A red channel marker and a little stitched canvas sail.
  const buoy=group(scene);buoy.position.set(-2.69,-.41,1.63);waterRing(small,-2.69,1.63,.20);
  rod(buoy,[0,.025,0],[0,.13,0],.115,tangerine,.085,16);rod(buoy,[0,.13,0],[0,.32,0],.052,chalk,.036);
  rod(buoy,[0,.21,0],[0,.29,0],.052,tangerine,.046);oval(buoy,0,.34,0,.043,.04,.043,iron);
  const boat=group(scene);boat.position.set(2.48,-.385,1.69);boat.rotation.y=-.30;
  sculpt(boat,[[-.45,.09,.009,.007],[-.35,.09,.097,.15],[-.05,.085,.122,.193],[.25,.11,.095,.15],[.48,.16,.012,.008]],'#ad664d',28,16);
  oval(boat,-.01,.167,0,.4,.033,.169,chalk);
  rod(boat,[-.08,.15,0],[-.08,.92,0],.018,iron,.012);
  function sail(a,b,c,m,bulge){
    const n=10,pos=[],indices=[];
    for(let i=0;i<=n;i++)for(let j=0;j<=n-i;j++){
      const u=i/n,w=j/n,r=1-u-w;pos.push(a[0]*r+b[0]*u+c[0]*w,a[1]*r+b[1]*u+c[1]*w,a[2]*r+b[2]*u+c[2]*w+bulge*27*u*w*r);
    }
    const at=(i,j)=>i*(n+1)-i*(i-1)/2+j;
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){indices.push(at(i,j),at(i+1,j),at(i,j+1));if(j<n-i-1)indices.push(at(i+1,j),at(i+1,j+1),at(i,j+1))}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();const material=paint(m).clone();material.side=T.DoubleSide;mesh(boat,g,material);
  }
  sail([-.055,.87,.012],[-.055,.26,.012],[.36,.30,.008],'#f5cf8b',.055);
  sail([-.106,.76,.002],[-.38,.27,.002],[-.106,.27,.002],tangerine,.029);
  rod(boat,[-.39,.254,.016],[.366,.28,.016],.011,iron);waterRing(small,2.47,1.69,.47);
  const gulls=[];
  for(const [x,y,z,s] of [[-2.88,2.50,-1.70,.72],[-2.35,2.76,-1.87,.52],[2.94,2.33,-1.75,.61]]){
    const bird=group(scene);bird.position.set(x,y,z);bird.scale.setScalar(s);const wings=[];
    oval(bird,0,0,0,.111,.042,.05,chalk);oval(bird,.102,-.007,0,.057,.015,.022,'#bc8051');
    for(const side of [-1,1]){const wing=group(bird);wings.push(wing);curve(wing,[[0,0,0],[-.025,.09,.19*side],[-.12,.055,.36*side],[-.19,.00,.46*side]],.020,chalk,14,5)}
    gulls.push({bird,wings,x,y,z});
  }
  const reflector=group(small);reflector.position.set(3.44,0,.75);
  rod(reflector,[0,-.04,0],[0,.43,0],.025,iron);
  const plate=box(reflector,0,.36,0,.225,.12,.035,'#f1d9a1');plate.rotation.z=-.06;
  box(reflector,0,.36,.019,.15,.029,.009,tangerine);
  batch(small);
  return function updateCoast(t,distance){
    time.value=t;const span=7.73,drive=Atelier.drive,travel=distance*drive.wheelRadius*drive.modelScale/drive.tyreMetres;
    dashes.forEach((dash,i)=>{dash.position.x=((i*span/15-travel)%span+span)%span-span/2;const edge=Math.min(1,(span/2-Math.abs(dash.position.x))/.15);dash.scale.x=.268*edge});
    boat.position.y=-.385+Math.sin(t*1.38)*.018;boat.rotation.x=Math.sin(t*1.19)*.049;boat.rotation.z=.024*Math.sin(t*.86);
    buoy.position.y=-.41+.021*Math.sin(t*1.57+1);buoy.rotation.z=.09*Math.sin(t*1.28);
    gulls.forEach(({bird,wings,x,y,z},i)=>{const a=t*.39+i*2;bird.position.set(x+Math.sin(a)*.32,y+.09*Math.cos(a*1.5),z+.15*Math.cos(a));bird.rotation.z=.045*Math.cos(a);wings.forEach((wing,j)=>wing.rotation.x=(j?1:-1)*(.14+.24*Math.sin(t*3.35+i)))});
  };
}
