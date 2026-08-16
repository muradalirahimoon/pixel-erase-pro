import './style.css';
import * as THREE from 'three';
import { removeBackground } from '@imgly/background-removal';
import { createWorker } from 'tesseract.js';

const intro = document.getElementById('intro');
const introCanvas = document.getElementById('introCanvas');

function initIntro(){
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, .1, 100);
  camera.position.z = 7;
  const renderer = new THREE.WebGLRenderer({canvas:introCanvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth,innerHeight);

  const group = new THREE.Group();
  scene.add(group);
  const geo = new THREE.IcosahedronGeometry(2.0,2);
  const mat = new THREE.MeshStandardMaterial({color:0x7c3aed,metalness:.75,roughness:.18,wireframe:true,transparent:true,opacity:.55});
  group.add(new THREE.Mesh(geo,mat));
  const particles = new THREE.BufferGeometry();
  const count = 700;
  const pos = new Float32Array(count*3);
  for(let i=0;i<count*3;i++) pos[i]=(Math.random()-.5)*16;
  particles.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pm = new THREE.PointsMaterial({color:0x67e8f9,size:.018,transparent:true,opacity:.8});
  group.add(new THREE.Points(particles,pm));
  const light = new THREE.PointLight(0x8b5cf6,16,18); light.position.set(3,3,4); scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff,.5));

  function tick(){
    requestAnimationFrame(tick);
    group.rotation.x += .002; group.rotation.y += .004;
    renderer.render(scene,camera);
  }
  tick();
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
}
initIntro();
setTimeout(()=>intro.classList.add('fade'),10000);

const dropzone=document.getElementById('dropzone');
const input=document.getElementById('fileInput');
const chooseBtn=document.getElementById('chooseBtn');
const editor=document.getElementById('editor');
const sourceCanvas=document.getElementById('sourceCanvas');
const resultCanvas=document.getElementById('resultCanvas');
const sourceCtx=sourceCanvas.getContext('2d');
const resultCtx=resultCanvas.getContext('2d');
const processBtn=document.getElementById('processBtn');
const downloadBtn=document.getElementById('downloadBtn');
const resetBtn=document.getElementById('resetBtn');
const fileName=document.getElementById('fileName');
const status=document.getElementById('status');
const emptyResult=document.getElementById('emptyResult');
const tabs=[...document.querySelectorAll('.tab')];
const textTools=document.getElementById('textTools');
const textQuery=document.getElementById('textQuery');
const findTextBtn=document.getElementById('findTextBtn');
const ocrStatus=document.getElementById('ocrStatus');
const ocrResults=document.getElementById('ocrResults');
let currentFile=null, mode='background', resultBlob=null;

chooseBtn.onclick=()=>input.click();
dropzone.onclick=e=>{if(e.target===dropzone) input.click()};
['dragenter','dragover'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.classList.remove('drag')}));
dropzone.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(f) loadImage(f)});
input.onchange=()=>{if(input.files[0]) loadImage(input.files[0])};

tabs.forEach(t=>t.onclick=()=>{
  tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
  mode=t.dataset.mode;
  processBtn.textContent=mode==='background'?'Remove Background':'Prepare Text Removal';
  textTools.classList.toggle('hidden',mode!=='text');
});

function loadImage(file){
  if(!file.type.startsWith('image/')) return alert('Please select an image file.');
  currentFile=file; fileName.textContent=file.name; editor.classList.remove('hidden'); dropzone.classList.add('hidden');
  const img=new Image();
  img.onload=()=>{
    const max=1800, scale=Math.min(1,max/Math.max(img.width,img.height));
    sourceCanvas.width=Math.round(img.width*scale);sourceCanvas.height=Math.round(img.height*scale);
    resultCanvas.width=sourceCanvas.width;resultCanvas.height=sourceCanvas.height;
    sourceCtx.clearRect(0,0,sourceCanvas.width,sourceCanvas.height);
    sourceCtx.drawImage(img,0,0,sourceCanvas.width,sourceCanvas.height);
    resultCtx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
    emptyResult.style.display='grid'; downloadBtn.disabled=true; resultBlob=null; status.textContent='Ready';
  };
  img.src=URL.createObjectURL(file);
}

processBtn.onclick=async()=>{
  if(!currentFile) return;
  if(mode==='text'){document.getElementById('textTools').scrollIntoView({behavior:'smooth'});return;}
  processBtn.disabled=true;status.textContent='Loading AI model / processing…';
  try{
    resultBlob=await removeBackground(currentFile);
    const img=new Image();
    img.onload=()=>{
      resultCtx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
      resultCtx.drawImage(img,0,0,resultCanvas.width,resultCanvas.height);
      emptyResult.style.display='none';downloadBtn.disabled=false;status.textContent='Background removed ✓';processBtn.disabled=false;
    };
    img.src=URL.createObjectURL(resultBlob);
  }catch(err){
    console.error(err);status.textContent='Processing failed. Try a smaller image or refresh.';processBtn.disabled=false;
  }
};

downloadBtn.onclick=()=>{
  if(!resultBlob) return;
  const a=document.createElement('a');a.href=URL.createObjectURL(resultBlob);
  a.download=(currentFile?.name||'image').replace(/\.[^.]+$/,'')+'-no-background.png';a.click();
};

resetBtn.onclick=()=>location.reload();

findTextBtn.onclick=async()=>{
  if(!currentFile || !textQuery.value.trim()) return;
  findTextBtn.disabled=true;ocrStatus.textContent='Scanning text…';ocrResults.innerHTML='';
  try{
    const worker=await createWorker('eng');
    const {data}=await worker.recognize(sourceCanvas);
    const q=textQuery.value.trim().toLowerCase();
    const matches=(data.words||[]).filter(w=>(w.text||'').toLowerCase().includes(q));
    if(!matches.length){ocrStatus.textContent='No matching text found.';await worker.terminate();findTextBtn.disabled=false;return;}
    ocrStatus.textContent=`Found ${matches.length} matching region(s).`;
    matches.forEach((w,i)=>{
      const b=w.bbox;
      const btn=document.createElement('button');btn.className='secondary';btn.style.margin='6px 6px 0 0';
      btn.textContent=`Select "${w.text.trim()}" #${i+1}`;
      btn.onclick=()=>simpleFill(b);
      ocrResults.appendChild(btn);
    });
    await worker.terminate();
  }catch(e){console.error(e);ocrStatus.textContent='OCR could not complete in this browser.'}
  findTextBtn.disabled=false;
};

function simpleFill(b){
  // Simple cleanup for flat/simple backgrounds. For complex backgrounds, use a true inpainting model/API.
  const pad=4;
  const x=Math.max(0,b.x0-pad),y=Math.max(0,b.y0-pad);
  const w=Math.min(sourceCanvas.width-x,(b.x1-b.x0)+pad*2);
  const h=Math.min(sourceCanvas.height-y,(b.y1-b.y0)+pad*2);
  const sample=sourceCtx.getImageData(Math.max(0,x-2),Math.max(0,y-2),1,1).data;
  resultCtx.clearRect(0,0,resultCanvas.width,resultCanvas.height);
  resultCtx.drawImage(sourceCanvas,0,0);
  resultCtx.fillStyle=`rgb(${sample[0]},${sample[1]},${sample[2]})`;
  resultCtx.fillRect(x,y,w,h);
  emptyResult.style.display='none';
  resultBlob=null;
  resultCanvas.toBlob(b=>{resultBlob=b;downloadBtn.disabled=false},'image/png');
  status.textContent='Selected text area cleaned (simple-fill mode).';
}
