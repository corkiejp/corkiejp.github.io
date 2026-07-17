const engineSelect=document.getElementById('engine');
const form=document.getElementById('searchForm');
const queryInput=document.getElementById('query');
const statusEl=document.getElementById('status');
const quickLinksEl=document.getElementById('quickLinks');
const engineListEl=document.getElementById('engineList');
const saveCurrentEngineBtn=document.getElementById('saveCurrentEngine');
let currentSettings;
function getPrefillQuery(){
  try{
    const url=new URL(window.location.href);
    return (url.searchParams.get('prefill')||url.searchParams.get('q')||'').trim();
  }catch{
    return '';
  }
}
function renderEngineOptions(allEngines,selectedId){engineSelect.innerHTML='';Object.entries(allEngines).forEach(([id,engine])=>{const option=document.createElement('option');option.value=id;option.textContent=engine.name;if(id===selectedId)option.selected=true;engineSelect.appendChild(option);});}
function renderQuickLinks(links){quickLinksEl.innerHTML='';links.forEach((link)=>{const a=document.createElement('a');a.className='quick-link';a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.innerHTML='<span class="quick-link-title"></span><span class="quick-link-url"></span>';a.querySelector('.quick-link-title').textContent=link.name;a.querySelector('.quick-link-url').textContent=link.url;quickLinksEl.appendChild(a);});}
function renderEngineList(allEngines,selectedId){engineListEl.innerHTML='';Object.entries(allEngines).forEach(([id,engine])=>{const item=document.createElement('div');item.className='engine-item';const selectedText=id===selectedId?'Current default':engine.builtin?'Built-in':'Custom';item.innerHTML='<div class="engine-meta"><strong></strong><span></span></div><div>'+selectedText+'</div>';item.querySelector('strong').textContent=engine.name;item.querySelector('span').textContent=engine.searchUrl;engineListEl.appendChild(item);});}
async function init(){
  currentSettings=await readSettings();
  const allEngines=getAllEngines(currentSettings.customEngines);
  const selectedId=allEngines[currentSettings.engine]?currentSettings.engine:STORAGE_DEFAULTS.engine;
  renderEngineOptions(allEngines,selectedId);
  renderQuickLinks(currentSettings.quickLinks);
  renderEngineList(allEngines,selectedId);
  const prefill=getPrefillQuery();
  if(prefill){
    queryInput.value=prefill;
    queryInput.focus();
    queryInput.setSelectionRange(prefill.length,prefill.length);
    statusEl.textContent='Imported browser search query into the local page. Press Enter to search.';
  }else{
    statusEl.textContent='Default engine: '+allEngines[selectedId].name+'. No search request is made until you submit.';
  }
}
form.addEventListener('submit',async(event)=>{event.preventDefault();const rawQuery=queryInput.value.trim();if(!rawQuery){queryInput.focus();return;}const allEngines=getAllEngines(currentSettings.customEngines);const selectedId=allEngines[engineSelect.value]?engineSelect.value:STORAGE_DEFAULTS.engine;await storageSet({engine:selectedId});const target=allEngines[selectedId].searchUrl.replace('%s',encodeURIComponent(rawQuery));window.location.assign(target);});
init().catch((error)=>{console.error('Init failed',error);statusEl.textContent='Could not load extension settings.';});
