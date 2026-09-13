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
    mesh.userData.wing=wing;insect.add(mesh);
   });ready=true;button.textContent='3D: On';button.setAttribute('aria-pressed','true');
  }).catch(fallback);
  button.onclick=()=>{if(!ready)return;enabled=!enabled;surface.style.display=enabled?'block':'none';button.textContent=enabled?'3D: On':'3D: Off';button.setAttribute('aria-pressed',String(enabled));};
  let width=0,height=0;
  const upstreamDraw=draw;
  draw=function(){
   upstreamDraw();
   if(!enabled||!ready){surface.style.display='none';return;}
   surface.style.display='block';
   const w=innerWidth,h=innerHeight;
   if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h);}
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
   insect.children.forEach((mesh,i)=>{if(mesh.userData.wing)mesh.rotation.y=Math.sin(performance.now()*.018+i)*Math.min(Math.abs(speed)*.02,.1);});
   while(foodMeshes.length<food.length){const m=new THREE.Mesh(foodGeometry,foodMaterial);scene.add(m);foodMeshes.push(m);}
   foodMeshes.forEach((m,i)=>{m.visible=i<food.length;if(m.visible){m.position.set(food[i].x,-food[i].y,4);m.scale.setScalar(food[i].radius||6);}});
   const ll=BRAIN.stimulate.lightLevel; light.intensity=ll>=1?1.4:ll>=.5?.7:.18;
   renderer.render(scene,camera);
  };
 } catch(e) { fallback(); }
})();
