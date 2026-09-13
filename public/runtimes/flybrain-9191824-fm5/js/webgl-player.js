/* Presentation-only adapter. Reads the upstream state and never advances the brain. */
(function () {
 const button = document.createElement('button');
 button.className = 'tool-btn'; button.textContent = '3D loading';
 document.querySelector('.toolbar-left').append(button);
 let renderer, enabled = true, ready = false;
 const fallback = () => { enabled=false; if(renderer) renderer.domElement.style.display='none'; button.textContent='2D view'; button.setAttribute('aria-pressed','false'); };
 try {
  renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0x152017,1);
  renderer.outputEncoding=THREE.sRGBEncoding;
  const surface=renderer.domElement;
  Object.assign(surface.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'1'});
  document.body.append(surface);
  surface.addEventListener('webglcontextlost', e=>{e.preventDefault();fallback();});
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe7f7dc,0x43321c,1.2));
  const light=new THREE.DirectionalLight(0xffedce,1.4); light.position.set(-200,-300,500); scene.add(light);
  const camera=new THREE.OrthographicCamera();camera.position.z=1000;
  const insect=new THREE.Group();scene.add(insect);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(10000,10000),new THREE.MeshStandardMaterial({color:0x263624,roughness:.96}));floor.position.z=-4;scene.add(floor);
  const grid=new THREE.GridHelper(10000,200,0x465a39,0x30402c);grid.rotation.x=Math.PI/2;grid.position.z=-3;scene.add(grid);
  // A soft contact shadow is inexpensive and avoids a second shadow render pass.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=64;shadowCanvas.height=64;
  const shadowCtx=shadowCanvas.getContext('2d');const gradient=shadowCtx.createRadialGradient(32,32,2,32,32,32);
  gradient.addColorStop(0,'rgba(0,0,0,.55)');gradient.addColorStop(1,'rgba(0,0,0,0)');
  shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(95,110),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  shadow.position.z=-2;scene.add(shadow);
  const effects=document.createElement('canvas');
  Object.assign(effects.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'2',background:'transparent'});
  document.body.append(effects);const feedback=effects.getContext('2d');
  const quality=document.createElement('button');quality.className='tool-btn';quality.textContent='Quality: Auto';
  document.querySelector('.toolbar-left').append(quality);
  let lowQuality=false,autoQuality=true,slowFrames=0,lastFrame=performance.now();
  quality.onclick=()=>{autoQuality=false;lowQuality=!lowQuality;renderer.setPixelRatio(lowQuality?1:Math.min(devicePixelRatio,1.5));quality.textContent=lowQuality?'Quality: Low':'Quality: High';};
  const foodMeshes=[];
  const foodGeometry=new THREE.SphereGeometry(1,16,10);
  const foodMaterial=new THREE.MeshStandardMaterial({color:0xffc536,roughness:.35});
  fetch('./fly-mesh.json').then(r=>{if(!r.ok)throw Error('mesh unavailable');return r.json();}).then(parts=>{
   parts.forEach(p=>{
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(p.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(p.normals,3));
    const wing=p.name.startsWith('wing');
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:new THREE.Color(...p.color),roughness:p.roughness,metalness:wing?.1:0,transparent:wing,opacity:wing?.52:1,side:THREE.DoubleSide}));
    // Give each part a local pivot, keeping the exported Blender geometry in place.
    geometry.computeBoundingBox();const pivot=geometry.boundingBox.getCenter(new THREE.Vector3());
    geometry.translate(-pivot.x,-pivot.y,-pivot.z);mesh.position.copy(pivot);
    mesh.userData={wing,name:p.name,base:pivot.clone()};insect.add(mesh);
    if(wing){
      const lines=[];
      for(let n=-1;n<=1;n++)lines.push(0,-18,1,n*7,18,1);
      const veins=new THREE.BufferGeometry();veins.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
      mesh.add(new THREE.LineSegments(veins,new THREE.LineBasicMaterial({color:0xc2cfaf,transparent:true,opacity:.55})));
    }
   });ready=true;button.textContent='3D: On';button.setAttribute('aria-pressed','true');
  }).catch(fallback);
  button.onclick=()=>{if(!ready)return;enabled=!enabled;surface.style.display=enabled?'block':'none';button.textContent=enabled?'3D: On':'3D: Off';button.setAttribute('aria-pressed',String(enabled));};
  let width=0,height=0;
  const upstreamDraw=draw;
  draw=function(){
   upstreamDraw();
   if(!enabled||!ready||document.hidden){surface.style.display='none';effects.style.display='none';return;}
   effects.style.display='block';
   surface.style.display='block';
   const w=innerWidth,h=innerHeight;
   if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h);effects.width=w;effects.height=h;}
   // Orthographic camera exactly matches screenToWorld and the upstream pan/zoom.
   camera.left=-w/(2*zoomLevel);camera.right=w/(2*zoomLevel);
   camera.top=h/(2*zoomLevel);camera.bottom=-h/(2*zoomLevel);
   camera.near=.1;camera.far=2000;
   camera.position.set(w/2-panX/zoomLevel,-h/2+panY/zoomLevel,1000);
   camera.updateProjectionMatrix();
   insect.position.set(fly.x,-fly.y,0);
   insect.rotation.z=facingDir-Math.PI/2;
   // Reflect model Y so its head matches the original top-down fly.
   insect.scale.set(1,-1,1);
   const time=performance.now();const moving=Math.min(Math.abs(speed)/2,1);
   const grooming=behavior.current==='groom';
   insect.children.forEach((mesh,i)=>{
    const phase=time*.012+i*Math.PI*.65;
    if(mesh.userData.wing)mesh.rotation.y=Math.sin(time*.03+i)*moving*.1;
    if(mesh.userData.name.startsWith('leg')){
      mesh.rotation.x=Math.sin(phase)*(grooming?.35:moving*.18);
      mesh.rotation.z=Math.cos(phase)*(grooming?.2:moving*.12);
    }
    if(mesh.userData.name.startsWith('antenna'))mesh.rotation.z=Math.sin(time*.004+i)*moving*.12;
   });
   shadow.position.set(fly.x,-fly.y,-2);shadow.rotation.z=insect.rotation.z;
   feedback.clearRect(0,0,w,h);
   const toScreen=(x,y)=>({x:(x-w/2)*zoomLevel+w/2+panX,y:(y-h/2)*zoomLevel+h/2+panY});
   ripples.forEach(r=>{const age=Math.max(0,Math.min(1,(Date.now()-r.startTime)/500));const point=toScreen(r.x,r.y);
    feedback.beginPath();feedback.arc(point.x,point.y,age*30*zoomLevel,0,Math.PI*2);feedback.strokeStyle='rgba(255,179,95,'+(1-age)+')';feedback.lineWidth=3;feedback.stroke();});
   if(isDragging&&dragToolOrigin==='air'&&windArrowEnd){
    const a=dragStart,b=windArrowEnd,angle=Math.atan2(b.y-a.y,b.x-a.x);
    feedback.beginPath();feedback.moveTo(a.x,a.y);feedback.lineTo(b.x,b.y);
    feedback.moveTo(b.x-14*Math.cos(angle-.45),b.y-14*Math.sin(angle-.45));feedback.lineTo(b.x,b.y);feedback.lineTo(b.x-14*Math.cos(angle+.45),b.y-14*Math.sin(angle+.45));
    feedback.strokeStyle='#a3ecff';feedback.lineWidth=3;feedback.stroke();
   }
   const elapsed=time-lastFrame;lastFrame=time;
   if(autoQuality&&!lowQuality){slowFrames=elapsed>35?slowFrames+1:Math.max(0,slowFrames-1);if(slowFrames>90){lowQuality=true;renderer.setPixelRatio(1);quality.textContent='Quality: Auto (low)';}}

   while(foodMeshes.length<food.length){const m=new THREE.Mesh(foodGeometry,foodMaterial);scene.add(m);foodMeshes.push(m);}
   foodMeshes.forEach((m,i)=>{m.visible=i<food.length;if(m.visible){m.position.set(food[i].x,-food[i].y,4);m.scale.setScalar(food[i].radius||6);}});
   const ll=BRAIN.stimulate.lightLevel; light.intensity=ll>=1?1.4:ll>=.5?.7:.18;
   renderer.render(scene,camera);
  };
 } catch(e) { fallback(); }
})();
