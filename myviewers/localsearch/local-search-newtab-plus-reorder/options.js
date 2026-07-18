const defaultEngineEl=document.getElementById('defaultEngine');
const settingsStatusEl=document.getElementById('settingsStatus');
const linksListEl=document.getElementById('linksList');
const enginesListEl=document.getElementById('enginesList');
const addLinkBtn=document.getElementById('addLinkBtn');
const resetLinksBtn=document.getElementById('resetLinksBtn');
const addEngineBtn=document.getElementById('addEngineBtn');
const resetEnginesBtn=document.getElementById('resetEnginesBtn');
const exportBtn=document.getElementById('exportBtn');
const importBtn=document.getElementById('importBtn');
const importFileEl=document.getElementById('importFile');
const linkNameEl=document.getElementById('linkName');
const linkUrlEl=document.getElementById('linkUrl');
const engineNameEl=document.getElementById('engineName');
const engineTemplateEl=document.getElementById('engineTemplate');
const copyLocalBlankUrlBtn = document.getElementById('copyLocalBlankUrlBtn');
const localBlankHelpEl = document.getElementById('localBlankHelp');
let settings;
function setStatus(message){settingsStatusEl.textContent=message;}
function renderDefaultEngineDropdown(allEngines,selectedId){defaultEngineEl.innerHTML='';Object.entries(allEngines).forEach(([id,engine])=>{const option=document.createElement('option');option.value=id;option.textContent=engine.name;if(id===selectedId)option.selected=true;defaultEngineEl.appendChild(option);});}
function buildActionButtons(type,index,length){return '<div class="item-actions"><button type="button" data-move-up="'+type+':'+index+'" '+(index===0?'disabled':'')+'>Up</button><button type="button" data-move-down="'+type+':'+index+'" '+(index===length-1?'disabled':'')+'>Down</button><button type="button" data-remove="'+type+':'+index+'">Remove</button></div>';}
function renderLinks(){linksListEl.innerHTML='';settings.quickLinks.forEach((link,index)=>{const item=document.createElement('div');item.className='item';item.innerHTML='<div class="item-top"><div><strong></strong><div class="muted"></div></div>'+buildActionButtons('link',index,settings.quickLinks.length)+'</div>';item.querySelector('strong').textContent=link.name;item.querySelector('.muted').textContent=link.url;linksListEl.appendChild(item);});}
function renderEngines(){enginesListEl.innerHTML='';settings.customEngines.forEach((engine,index)=>{const item=document.createElement('div');item.className='item';item.innerHTML='<div class="item-top"><div><strong></strong><div class="muted"></div></div>'+buildActionButtons('engine',index,settings.customEngines.length)+'</div>';item.querySelector('strong').textContent=engine.name;item.querySelector('.muted').textContent=engine.searchUrl;enginesListEl.appendChild(item);});if(!settings.customEngines.length){const empty=document.createElement('div');empty.className='item';empty.innerHTML='<div class="muted">No custom engines added yet.</div>';enginesListEl.appendChild(empty);}}
function sanitizeImportedSettings(raw){const quickLinks=Array.isArray(raw.quickLinks)?raw.quickLinks.filter((item)=>item&&typeof item.name==='string'&&isValidUrl(item.url)).map((item)=>({name:item.name.trim()||'Untitled',url:item.url.trim()})):[...DEFAULT_QUICK_LINKS];const customEngines=Array.isArray(raw.customEngines)?raw.customEngines.filter((item)=>item&&typeof item.name==='string'&&typeof item.searchUrl==='string'&&isValidTemplate(item.searchUrl)).map((item)=>({id:typeof item.id==='string'&&item.id.trim()?item.id.trim():createEngineId(item.name),name:item.name.trim()||'Custom engine',searchUrl:item.searchUrl.trim()})):[];const allEngines=getAllEngines(customEngines);const engine=typeof raw.engine==='string'&&allEngines[raw.engine]?raw.engine:STORAGE_DEFAULTS.engine;return{engine,quickLinks,customEngines};}
function downloadJson(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function detectBrowserFamily() {
  const ua = navigator.userAgent || '';
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Chrome/') || ua.includes('Chromium/') || ua.includes('Edg/')) return 'chromium';
  return 'other';
}

if (copyLocalBlankUrlBtn && localBlankHelpEl) {
  copyLocalBlankUrlBtn.addEventListener('click', async () => {
    const urlField = document.getElementById('localBlankUrl');
    if (!urlField) return;

    const value = urlField.value.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      localBlankHelpEl.textContent = 'Copied. Paste this into your browser’s custom search engine URL field.';
    } catch (error) {
      console.error('Clipboard copy failed', error);
      localBlankHelpEl.textContent = 'Copy failed. Select and copy the URL manually.';
    }
  });

  const family = detectBrowserFamily();
  if (family === 'chromium') {
    localBlankHelpEl.textContent = 'Chrome/Comet: paste this into Settings → Search engine → Manage search engines and site search.';
  } else if (family === 'firefox') {
    localBlankHelpEl.textContent = 'Firefox: paste this into about:preferences#search under Search shortcuts or custom engines.';
  } else {
    localBlankHelpEl.textContent = 'Use this in your browser’s search engine settings.';
  }
}

async function persistAndRender(message){await storageSet({engine:settings.engine,customEngines:settings.customEngines,quickLinks:settings.quickLinks});const allEngines=getAllEngines(settings.customEngines);if(!allEngines[settings.engine]){settings.engine=STORAGE_DEFAULTS.engine;await storageSet({engine:settings.engine});}renderDefaultEngineDropdown(allEngines,settings.engine);renderLinks();renderEngines();setStatus(message);}
defaultEngineEl.addEventListener('change',async()=>{const allEngines=getAllEngines(settings.customEngines);settings.engine=allEngines[defaultEngineEl.value]?defaultEngineEl.value:STORAGE_DEFAULTS.engine;await storageSet({engine:settings.engine});setStatus('Saved default engine: '+allEngines[settings.engine].name);});
addLinkBtn.addEventListener('click',async()=>{const name=linkNameEl.value.trim();const url=linkUrlEl.value.trim();if(!name||!isValidUrl(url)){setStatus('Enter a link name and a valid full URL.');return;}settings.quickLinks.push({name,url});linkNameEl.value='';linkUrlEl.value='';await persistAndRender('Added quick link: '+name);});
resetLinksBtn.addEventListener('click',async()=>{settings.quickLinks=[...DEFAULT_QUICK_LINKS];await persistAndRender('Restored default quick links.');});
addEngineBtn.addEventListener('click',async()=>{const name=engineNameEl.value.trim();const searchUrl=engineTemplateEl.value.trim();if(!name||!isValidTemplate(searchUrl)){setStatus('Enter an engine name and a valid template URL containing %s.');return;}const id=createEngineId(name);const duplicateIndex=settings.customEngines.findIndex((item)=>item.id===id);const payload={id,name,searchUrl};if(duplicateIndex>=0){settings.customEngines[duplicateIndex]=payload;await persistAndRender('Updated custom engine: '+name);}else{settings.customEngines.push(payload);await persistAndRender('Added custom engine: '+name);}engineNameEl.value='';engineTemplateEl.value='';});
resetEnginesBtn.addEventListener('click',async()=>{settings.customEngines=[];if(!DEFAULT_BUILTIN_ENGINES[settings.engine])settings.engine=STORAGE_DEFAULTS.engine;await persistAndRender('Removed all custom engines.');});
function handleReorderAction(type,index,direction){if(type==='link'){settings.quickLinks=moveItem(settings.quickLinks,index,index+direction);return persistAndRender('Reordered quick links.');}if(type==='engine'){settings.customEngines=moveItem(settings.customEngines,index,index+direction);return persistAndRender('Reordered custom engines.');}}
function handleRemoveAction(type,index){if(type==='link'){const removed=settings.quickLinks.splice(index,1)[0];return persistAndRender('Removed quick link: '+removed.name);}if(type==='engine'){const removed=settings.customEngines.splice(index,1)[0];if(settings.engine===removed.id)settings.engine=STORAGE_DEFAULTS.engine;return persistAndRender('Removed custom engine: '+removed.name);}}
function parseAction(value){const [type,rawIndex]=value.split(':');return {type,index:Number(rawIndex)};}
document.addEventListener('click',async(event)=>{const up=event.target.closest('[data-move-up]');if(up){const {type,index}=parseAction(up.dataset.moveUp);await handleReorderAction(type,index,-1);return;}const down=event.target.closest('[data-move-down]');if(down){const {type,index}=parseAction(down.dataset.moveDown);await handleReorderAction(type,index,1);return;}const remove=event.target.closest('[data-remove]');if(remove){const {type,index}=parseAction(remove.dataset.remove);await handleRemoveAction(type,index);}});
exportBtn.addEventListener('click',async()=>{const exportPayload={schemaVersion:1,exportedAt:new Date().toISOString(),engine:settings.engine,quickLinks:settings.quickLinks,customEngines:settings.customEngines};downloadJson('local-search-newtab-plus-settings.json',exportPayload);setStatus('Exported settings to JSON.');});
importBtn.addEventListener('click',()=>importFileEl.click());
importFileEl.addEventListener('change',async()=>{const file=importFileEl.files?.[0];if(!file)return;try{const text=await file.text();const parsed=JSON.parse(text);settings=sanitizeImportedSettings(parsed);await persistAndRender('Imported settings from '+file.name);}catch(error){console.error('Import failed',error);setStatus('Could not import JSON settings file.');}finally{importFileEl.value='';}});
async function init(){settings=await readSettings();const allEngines=getAllEngines(settings.customEngines);if(!allEngines[settings.engine]){settings.engine=STORAGE_DEFAULTS.engine;await storageSet({engine:settings.engine});}renderDefaultEngineDropdown(allEngines,settings.engine);renderLinks();renderEngines();setStatus('Settings loaded.');}
init().catch((error)=>{console.error('Options init failed',error);setStatus('Could not load settings.');});
