const progressBar=document.getElementById("progressBar");
const statusText=document.getElementById("status");
const toast=document.getElementById("toast");
const fileInput=document.getElementById("fileInput");
const title=document.getElementById("title");

function showToast(msg){
 toast.textContent=msg;
 toast.classList.add("show");
 setTimeout(()=>toast.classList.remove("show"),2500);
}

function toggleTheme(){
 document.body.classList.toggle("dark");
 document.body.classList.toggle("light");
}

function switchMode(){
 const mode=document.getElementById("modeSelect").value;
 document.body.classList.remove("mode-jpg2pdf","mode-pdf2jpg");
 document.body.classList.add(mode==="jpg2pdf"?"mode-jpg2pdf":"mode-pdf2jpg");

 if(mode==="jpg2pdf"){
  title.textContent="JPG → PDF";
  fileInput.accept="image/jpeg,image/png";
  fileInput.multiple=true;
 }else{
  title.textContent="PDF → JPG";
  fileInput.accept="application/pdf";
  fileInput.multiple=false;
 }
 document.getElementById("preview").innerHTML="";
}

fileInput.addEventListener("change",()=>{
 const preview=document.getElementById("preview");
 preview.innerHTML="";
 for(const f of fileInput.files){
  if(f.type.startsWith("image")){
   const img=document.createElement("img");
   img.src=URL.createObjectURL(f);
   preview.appendChild(img);
  }
 }
});

/* ripple */
document.addEventListener("click",e=>{
 if(e.target.classList.contains("ripple")){
  const s=document.createElement("span");
  const r=e.target.getBoundingClientRect();
  s.style.left=e.clientX-r.left+"px";
  s.style.top=e.clientY-r.top+"px";
  e.target.appendChild(s);
  setTimeout(()=>s.remove(),600);
 }
});

function setActive(a){
 document.querySelector(".glow-btn").classList.toggle("active",a);
}
function setSpeed(p){
 const speed=4-(p/100)*2.8;
 document.querySelector(".glow-btn").style.setProperty("--ringSpeed",speed+"s");
}

async function handleConvert(){
 if(!fileInput.files.length) return showToast("Select file");
 const mode=document.getElementById("modeSelect").value;
 setActive(true);

 if(mode==="jpg2pdf") await jpg2pdf();
 else await pdf2jpg();

 setActive(false);
}

async function jpg2pdf(){
 const {jsPDF}=window.jspdf;
 const pdf=new jsPDF();
 const start=performance.now();

 for(let i=0;i<fileInput.files.length;i++){
  const data=await readData(fileInput.files[i]);
  const img=new Image(); img.src=data;
  await new Promise(r=>{
   img.onload=()=>{
    const w=pdf.internal.pageSize.getWidth();
    const h=(img.height*w)/img.width;
    if(i) pdf.addPage();
    pdf.addImage(img,"JPEG",0,0,w,h);
    const pct=((i+1)/fileInput.files.length)*100;
    progressBar.style.width=pct+"%";
    setSpeed(pct);
    r();
   };
  });
 }
 pdf.save("converted.pdf");
 statusText.textContent=`Done in ${((performance.now()-start)/1000).toFixed(2)}s`;
 showToast("PDF generated");
}

async function pdf2jpg(){
 const zip=new JSZip();
 const start=performance.now();
 const reader=new FileReader();

 reader.onload=async function(){
  const pdf=await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
  for(let p=1;p<=pdf.numPages;p++){
   const page=await pdf.getPage(p);
   const vp=page.getViewport({scale:2});
   const canvas=document.createElement("canvas");
   const ctx=canvas.getContext("2d");
   canvas.width=vp.width; canvas.height=vp.height;
   await page.render({canvasContext:ctx,viewport:vp}).promise;
   const base64=canvas.toDataURL("image/jpeg",0.95).split(",")[1];
   zip.file(`page-${p}.jpg`,base64,{base64:true});
   const pct=(p/pdf.numPages)*100;
   progressBar.style.width=pct+"%";
   setSpeed(pct);
  }
  const blob=await zip.generateAsync({type:"blob"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="pages.zip";
  a.click();
  statusText.textContent=`Done in ${((performance.now()-start)/1000).toFixed(2)}s`;
  showToast("ZIP ready");
 };

 reader.readAsArrayBuffer(fileInput.files[0]);
}

function readData(f){
 return new Promise((res,rej)=>{
  const r=new FileReader();
  r.onload=e=>res(e.target.result);
  r.onerror=rej;
  r.readAsDataURL(f);
 });
}
