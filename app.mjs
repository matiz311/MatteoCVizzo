import { renderPage, renderCase, validatePresentation, findCaseForEvidence } from "./render.mjs";

let data=JSON.parse(document.querySelector("#cv-initial-data").textContent);
const state={tab:"cv",query:"",year:"all",allCases:false,allProjects:false};
let refreshing=false;
function paint(){
  document.querySelector("#cv-app").innerHTML=renderPage(data,state);
  document.title=`${data.profile.name} · ${data.presentation.labels.documentTitle}`;
  document.documentElement.lang=data.presentation.locale.split("-")[0];
  for(const [key,value] of Object.entries(data.presentation.theme))document.documentElement.style.setProperty(`--${key}`,value);
  document.querySelector('meta[name="description"]').content=data.profile.summary;
  bind();
}
function openCase(id){
  const item=data.cases.find(entry=>entry.id===id);if(!item)return;
  const dialog=document.querySelector("#case-dialog");
  dialog.innerHTML=renderCase(item,data.presentation);
  dialog.querySelector("[data-close]").addEventListener("click",()=>dialog.close());
  dialog.showModal();
}
function renderArchive(){
  const queryElement=document.querySelector("[data-search]");
  const focused=document.activeElement===queryElement,selection=queryElement?.selectionStart;
  paint();
  if(focused){const input=document.querySelector("[data-search]");input?.focus();if(typeof selection==="number")input?.setSelectionRange(selection,selection);}
}
function bind(){
  document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{state.tab=button.dataset.tab;paint();}));
  document.querySelectorAll("[data-print]").forEach(button=>button.addEventListener("click",()=>window.print()));
  document.querySelectorAll("[data-refresh]").forEach(button=>button.addEventListener("click",()=>refresh(true)));
  document.querySelectorAll("[data-project-toggle]").forEach(button=>button.addEventListener("click",()=>{state.allProjects=!state.allProjects;paint();}));
  document.querySelectorAll("[data-case-toggle]").forEach(button=>button.addEventListener("click",()=>{state.allCases=!state.allCases;paint();}));
  document.querySelectorAll("[data-case]").forEach(button=>button.addEventListener("click",()=>openCase(button.dataset.case)));
  document.querySelectorAll("[data-evidence]").forEach(button=>button.addEventListener("click",()=>{const id=findCaseForEvidence(button.dataset.evidence,data);if(id)openCase(id);}));
  document.querySelector("[data-search]")?.addEventListener("input",event=>{state.query=event.target.value;renderArchive();});
  document.querySelector("[data-year]")?.addEventListener("change",event=>{state.year=event.target.value;paint();});
  document.querySelector("[data-clear]")?.addEventListener("click",()=>{state.query="";paint();document.querySelector("[data-search]")?.focus();});
  document.querySelector("[data-reset]")?.addEventListener("click",()=>{state.query="";state.year="all";paint();});
  document.querySelectorAll("[data-open-portfolio]").forEach(button=>button.addEventListener("click",()=>{state.tab="portfolio";paint();document.querySelector("#cases")?.scrollIntoView({behavior:"smooth",block:"start"});}));
}
async function refresh(announce=false){
  if(refreshing)return;refreshing=true;
  const message=document.querySelector("#live-message");
  try{
    const response=await fetch("./data/cv.json",{cache:"no-store",headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error("data-unavailable");
    const next=await response.json();
    if(next.schemaVersion!==1||!next.presentation?.labels||!next.profile?.name||!Array.isArray(next.cases))throw new Error("invalid-data");
    validatePresentation(next.presentation);
    const changed=next.metadata.sourceRevision!==data.metadata.sourceRevision;
    if(changed){data=next;paint();}
    if(announce)document.querySelector("#live-message").textContent=data.presentation.labels.reloadSuccess;
  }catch{if(message)message.textContent=data.presentation.labels.reloadFailed;}
  finally{refreshing=false;}
}
document.querySelector("#case-dialog").addEventListener("click",event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
bind();
refresh();
setInterval(()=>{if(document.visibilityState==="visible")refresh();},300000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh();});
