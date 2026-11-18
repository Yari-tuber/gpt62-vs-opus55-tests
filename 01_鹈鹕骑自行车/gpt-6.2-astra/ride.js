'use strict';
(() => {
  const $=id=>document.getElementById(id),stage=$('stage'),viewport=$('viewport');
  const setIcon=(button,id)=>button.querySelector('use').setAttribute('href','#'+id);
  const ns='http://www.w3.org/2000/svg',map=$('contours');
  function mapLine(d,opacity=1){
    const line=document.createElementNS(ns,'path');line.setAttribute('d',d);line.setAttribute('opacity',opacity);map.append(line);
  }
  // Etched depth contours at the edges of the sheet, leaving the model a clear silhouette.
  for(let i=0;i<17;i++){
    const off=i*14;
    mapLine('M '+(-190+off)+' 860 C '+(-190+off)+' 720 '+(6+off)+' 772 '+(28+off)+' 684 S '+(-32+off)+' 604 '+(13+off)+' 551 S '+(16+off*.7)+' 458 -62 '+(455-off*.72),.55+i*.013);
    mapLine('M '+(901+off)+' -65 C '+(926+off)+' 34 '+(1017+off)+' -1 '+(1045+off)+' 71 S '+(1030+off)+' 176 '+(1116+off)+' 189 S '+(1263+off)+' 201 '+(1305+off)+' 253 S '+(1356+off)+' 322 1506 '+(296+off*.65),.58);
  }
  for(const [x,y] of [[362,125],[88,372],[381,651],[1260,614],[1359,336],[938,83],[675,720]]){
    mapLine('M '+(x-4)+' '+y+' h8 M '+x+' '+(y-4)+' v8',.87);
  }
  function windRose(x,y){
    const rose=document.createElementNS(ns,'g');rose.setAttribute('transform','translate('+x+' '+y+') rotate(16)');
    rose.innerHTML='<circle r="23" stroke-dasharray="1 5"/><path d="M0-30v8m0 44v8m-30-30h8m44 0h8"/><path d="M0-18 5 10 0 6z" fill="currentColor"/><path d="M0-18-5 10 0 6z"/>';map.append(rose);
  }
  windRose(1327,557);
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'})}
  catch{$('fallback').hidden=false;return}
  const {T,drive,canvasTexture}=Atelier;
  viewport.append(renderer.domElement);renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.85));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.09;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-6,6,3,-3,.1,72);
  // A painted studio environment gives the polished frame and bell soft reflections.
  const panorama=canvasTexture(512,256,(c,w,h)=>{
    const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#c1e3e6');sky.addColorStop(.32,'#f8f1d3');sky.addColorStop(.50,'#bbcdbf');sky.addColorStop(.64,'#5b8581');sky.addColorStop(1,'#63736a');c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(const [x,y,rx,ry] of [[122,60,67,23],[380,79,39,15]]){c.save();c.translate(x,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'#fff8db');g.addColorStop(1,'rgba(255,248,219,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore()}
  });
  panorama.mapping=T.EquirectangularReflectionMapping;
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(panorama);scene.environment=environment.texture;pmrem.dispose();panorama.dispose();
  const hemi=new T.HemisphereLight('#eff9ed','#d3ba90',1.62);scene.add(hemi);
  const key=new T.DirectionalLight('#fff0cd',2.58);key.position.set(-3.5,8,5);key.castShadow=true;scene.add(key);
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-5.5,near:.5,far:23});key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.00025;key.shadow.normalBias=.012;
  const edge=new T.DirectionalLight('#ecfbf5',1.16);edge.position.set(3.6,4,-5);scene.add(edge);
  const updateCoast=buildCoast(scene),updateCyclist=buildCyclist(scene);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const presets=[
    {yaw:.37,pitch:.315,span:10.7,height:6.40,y:1.31,x:-.05},
    {yaw:.145,pitch:.105,span:5.75,height:4.85,y:2.03,x:.05},
    {yaw:.66,pitch:.83,span:10.85,height:6.52,y:.69,x:0}
  ];
  let activeView=0;
  const view={...presets[0],zoom:1},goal={...view};
  const speeds=[.5,.75,1,1.25,1.5,2];let speedIndex=2,playing=!reduced,evening=false,lightMix=0;
  let elapsed=0,coastTime=0,phase=-.47,distance=0,bellAge=10,oldTime=0,frameId=0;
  const route=$('routePath'),routeLength=route.getTotalLength(),mapDot=$('mapDot');
  let w=1,h=1,ratio=1;
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  function chooseView(i){
    activeView=i;const p=presets[i];Object.assign(goal,p,{yaw:view.yaw+wrap(p.yaw-view.yaw),zoom:1});
    document.querySelectorAll('[data-view]').forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));
    if(reduced)Object.assign(view,goal);wake();
  }
  function resize(){
    w=viewport.clientWidth;h=viewport.clientHeight;if(!w||!h)return;
    ratio=w/h;renderer.setSize(w,h,false);positionCamera();wake();
  }
  function positionCamera(){
    const small=w<=650,portrait=ratio<.95;
    const fullHeight=Math.max(view.height,view.span*(portrait?.98:1)/ratio)/view.zoom;
    const fullWidth=fullHeight*ratio;
    const xBias=small?.008:clamp((ratio-1)*.078+.019,.022,.099);
    const yBias=small?(portrait?.595:.57):.530;
    camera.left=-fullWidth*(.5+xBias);camera.right=fullWidth*(.5-xBias);
    camera.top=fullHeight*yBias;camera.bottom=-fullHeight*(1-yBias);
    const cp=Math.cos(view.pitch),dist=17;
    camera.position.set(view.x+dist*cp*Math.sin(view.yaw),view.y+dist*Math.sin(view.pitch),dist*cp*Math.cos(view.yaw));
    camera.lookAt(view.x,view.y,0);camera.updateProjectionMatrix();
  }
  const day={sky:new T.Color('#eff9ed'),ground:new T.Color('#d3ba90'),sun:new T.Color('#fff0cd'),edge:new T.Color('#ecfbf5')};
  const dusk={sky:new T.Color('#f5cfb4'),ground:new T.Color('#ac8275'),sun:new T.Color('#ffad72'),edge:new T.Color('#a5cbd3')};
  function lighting(){
    hemi.color.lerpColors(day.sky,dusk.sky,lightMix);hemi.groundColor.lerpColors(day.ground,dusk.ground,lightMix);
    key.color.lerpColors(day.sun,dusk.sun,lightMix);edge.color.lerpColors(day.edge,dusk.edge,lightMix);
    key.position.set(-3.5-3.6*lightMix,8-3.35*lightMix,5-2.5*lightMix);hemi.intensity=1.62-.33*lightMix;edge.intensity=1.16+.28*lightMix;
  }
  function playbackUI(){
    $('statusText').textContent=playing?'骑行中':'已暂停';document.body.classList.toggle('paused',!playing);
    setIcon($('playBtn'),playing?'pause':'play');$('playBtn').setAttribute('aria-label',playing?'暂停骑行':'继续骑行');
    $('pace').textContent=speeds[speedIndex]+'×';$('slower').disabled=speedIndex===0;$('faster').disabled=speedIndex===speeds.length-1;
    $('speed').textContent=playing?(18.6*speeds[speedIndex]).toFixed(1):'0.0';
  }
  function togglePlay(){playing=!playing;playbackUI();syncSound();wake()}
  function changeSpeed(n){speedIndex=clamp(speedIndex+n,0,speeds.length-1);playbackUI();wake()}
  $('playBtn').onclick=togglePlay;$('slower').onclick=()=>changeSpeed(-1);$('faster').onclick=()=>changeSpeed(1);
  document.querySelectorAll('[data-view]').forEach((b,i)=>b.onclick=()=>chooseView(i));
  $('lightBtn').onclick=()=>{
    evening=!evening;const el=$('lightBtn');document.body.classList.toggle('evening',evening);el.setAttribute('aria-pressed',String(evening));el.setAttribute('aria-label',evening?'切换日间光照':'切换日落光照');
    el.querySelector('span').textContent=evening?'日落':'日光';setIcon(el,evening?'moon':'sun');if(reduced){lightMix=Number(evening);lighting()}wake();
  };
  const pointers=new Map();let pinch=0,inertiaX=0,inertiaY=0;
  function pinchLength(){const [a,b]=Array.from(pointers.values());return Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}
  viewport.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2)pinch=pinchLength();
    inertiaX=inertiaY=0;viewport.classList.add('grabbing');wake();
  });
  viewport.addEventListener('pointermove',e=>{
    const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(pointers.size===2){const d=pinchLength();goal.zoom=clamp(goal.zoom*d/Math.max(1,pinch),.72,1.85);pinch=d}
    if(pointers.size===1){inertiaX=-dx*.0064;inertiaY=dy*.0041;goal.yaw+=inertiaX;goal.pitch=clamp(goal.pitch+inertiaY,.035,1.15)}
    if(reduced)Object.assign(view,goal);wake();
  });
  function release(e){
    pointers.delete(e.pointerId);
    if(!pointers.size)viewport.classList.remove('grabbing');
    if(e.type==='pointercancel'||reduced){inertiaX=inertiaY=0}wake();
  }
  viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);
  viewport.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))release(e)});
  viewport.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?h:1);goal.zoom=clamp(goal.zoom*Math.exp(-clamp(delta,-280,280)*.0014),.72,1.85);if(reduced)view.zoom=goal.zoom;wake()},{passive:false});
  viewport.addEventListener('dblclick',()=>chooseView(activeView));
  $('fullBtn').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{/* Some embedded browsers disable fullscreen. */}
  };
  if(!document.fullscreenEnabled)$('fullBtn').hidden=true;
  document.addEventListener('fullscreenchange',()=>{$('fullBtn').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏');resize()});
  // Both the surf and the bicycle bell are synthesized locally.
  let audioCtx=null,ambience=null,sound=false,swell=null;
  function audio(){
    if(!audioCtx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;audioCtx=new AC()}
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx;
  }
  function startSurf(ctx){
    if(ambience)return;const n=ctx.sampleRate*5,buffer=ctx.createBuffer(1,n,ctx.sampleRate),data=buffer.getChannelData(0);let brown=0;
    for(let i=0;i<n;i++){brown=(brown+.025*(Math.random()*2-1))/1.025;data[i]=brown*5+(Math.random()*2-1)*.058}
    const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),mod=ctx.createGain();ambience=ctx.createGain();
    noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=850;filter.Q.value=.42;
    swell=ctx.createOscillator();swell.frequency.value=.12;mod.gain.value=360;swell.connect(mod).connect(filter.frequency);
    ambience.gain.value=0;noise.connect(filter).connect(ambience).connect(ctx.destination);swell.start();noise.start();
  }
  function syncSound(){if(ambience)ambience.gain.setTargetAtTime(sound&&playing&&!document.hidden?.20:0,audioCtx.currentTime,.28)}
  $('audioBtn').onclick=()=>{
    const ctx=audio();if(!ctx)return;startSurf(ctx);sound=!sound;syncSound();
    $('audioBtn').setAttribute('aria-pressed',String(sound));$('audioBtn').title=sound?'关闭海岸环境音':'开启海岸环境音';setIcon($('audioBtn'),sound?'sound':'mute');
  };
  function bell(){
    bellAge=0;wake();const b=$('bellBtn');b.classList.remove('ringing');void b.offsetWidth;b.classList.add('ringing');
    const ctx=audio();if(!ctx)return;
    for(const delay of [0,.145])for(const [hz,vol,decay] of [[1675,.102,.58],[2387,.043,.33],[3720,.022,.20],[4231,.009,.12]]){
      const start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(hz*(delay?1.025:1),start);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(vol*(delay?.74:1),start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+decay);
      osc.connect(gain).connect(ctx.destination);osc.start(start);osc.stop(start+decay+.02);osc.onended=()=>{osc.disconnect();gain.disconnect()};
    }
  }
  $('bellBtn').onclick=bell;
  document.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
    if(e.code==='Space'&&!e.target.closest('button,input,select')){e.preventDefault();togglePlay()}
    if(/^[123]$/.test(e.key))chooseView(Number(e.key)-1);
    if(e.key.toLowerCase()==='b')bell();
    if(e.target===viewport){
      const arrows={ArrowLeft:[.18,0],ArrowRight:[-.18,0],ArrowUp:[0,.10],ArrowDown:[0,-.10]};
      if(arrows[e.key]){e.preventDefault();const [dx,dy]=arrows[e.key];goal.yaw+=dx;goal.pitch=clamp(goal.pitch+dy,.035,1.15);if(reduced)Object.assign(view,goal);wake()}
    }
  });
  let shownSecond=-1;
  function clockUI(){
    const sec=Math.floor(elapsed);if(sec!==shownSecond){shownSecond=sec;$('timer').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
    const p=route.getPointAtLength((distance%2400)/2400*routeLength);mapDot.setAttribute('cx',p.x.toFixed(2));mapDot.setAttribute('cy',p.y.toFixed(2));
  }
  function wake(){if(!frameId&&!document.hidden){oldTime=performance.now();frameId=requestAnimationFrame(draw)}}
  function draw(now){
    frameId=0;const dt=Math.min(.050,Math.max(0,(now-oldTime)/1000));oldTime=now;
    if(playing){
      const speed=speeds[speedIndex],metres=dt*18.6/3.6*speed;
      elapsed+=dt;coastTime+=dt*speed;distance+=metres;
      phase-=metres/drive.tyreMetres*drive.sprocket/drive.chainring;
    }
    bellAge+=dt;
    if(!pointers.size&&(Math.abs(inertiaX)+Math.abs(inertiaY)>.0003)){
      const k=Math.exp(-12*dt);inertiaX*=k;inertiaY*=k;goal.yaw+=inertiaX*dt*22;goal.pitch=clamp(goal.pitch+inertiaY*dt*22,.035,1.15);
    }
    const damp=1-Math.exp(-dt*(pointers.size?22:8.5));let changing=false;
    for(const prop of Object.keys(view)){
      const diff=goal[prop]-view[prop];if(Math.abs(diff)>.00018){view[prop]+=diff*damp;changing=true}else view[prop]=goal[prop];
    }
    const targetLight=Number(evening);
    if(Math.abs(targetLight-lightMix)>.001){lightMix+=(targetLight-lightMix)*(1-Math.exp(-dt*4.5));lighting();changing=true}
    updateCoast(coastTime,distance);
    const ringMotion=bellAge<1.2&&!reduced?Math.sin(bellAge*15)*Math.exp(-bellAge*3.5):0;
    updateCyclist(coastTime,phase,ringMotion);clockUI();positionCamera();renderer.render(scene,camera);
    if(playing||changing||bellAge<1.2||pointers.size)frameId=requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange',()=>{syncSound();if(document.hidden){cancelAnimationFrame(frameId);frameId=0}else wake()});
  new ResizeObserver(resize).observe(stage);playbackUI();resize();
})();
