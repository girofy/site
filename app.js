/* Girofy Cine · HTML / CSS / JavaScript · sem build; mídia e galeria carregadas sob demanda. */
(() => {
'use strict';
document.documentElement.classList.add('js');
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const config = window.GIROFY_CONFIG || {};
let scrollQueued = false;

function initNavigation() {
 const menu = $('.menu-button'), nav = $('#navigation');
 const close = () => { nav.hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Abrir menu'); };
 menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; nav.hidden = !open; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); if (open) $('a', nav).focus(); });
 $$('a', nav).forEach(a => a.addEventListener('click', close));
 document.addEventListener('click', e => { if (!nav.contains(e.target) && !menu.contains(e.target)) close(); });
 document.addEventListener('keydown', e => { if (e.key === 'Escape' && !nav.hidden) { close(); menu.focus(); } });
 const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); } }), { threshold: 0.08 });
 $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 60}ms`; io.observe(el); });
 $('#year').textContent = new Date().getFullYear();
}

const agreement = $('#acordo'), video = $('#agreement-video');
let videoTimeTarget = 0, videoReady = false, unlockAttempted = false;
function setAgreementHeight() {
 const screens = reduced.matches ? 0 : matchMedia('(max-width: 800px)').matches
  ? (config.video?.mobileScrollScreens ?? 0.8)
  : (config.video?.scrollScreens ?? 2.2);
 agreement.style.height = `${(1 + screens) * 100}svh`;
}
function seekVideo() {
 if (!videoReady || video.readyState < 2 || video.seeking) return;
 const t = clamp(videoTimeTarget, 0, Math.max(0, video.duration - 0.045));
 if (Math.abs(video.currentTime - t) > 0.04) {
  try { video.currentTime = t; } catch (_) { $('.video-enable').hidden = false; }
 }
}
function initVideo() {
 setAgreementHeight();
 window.addEventListener('resize', setAgreementHeight, { passive: true });
 const source = $('source', video);
 let videoRequested = false;
 function requestVideo() {
  if (videoRequested || !source?.dataset.src) return;
  videoRequested = true;
  source.src = source.dataset.src;
  source.removeAttribute('data-src');
  video.preload = 'auto';
  video.load();
 }
 const onMetadata = () => { if (Number.isFinite(video.duration) && reduced.matches) videoTimeTarget = video.duration - 0.05; requestScrollUpdate(); };
 const onFrameReady = () => { videoReady = Number.isFinite(video.duration) && video.readyState >= 2; seekVideo(); };
 video.addEventListener('loadedmetadata', onMetadata);
 video.addEventListener('loadeddata', onFrameReady);
 video.addEventListener('canplay', onFrameReady);
 if (video.readyState >= 1) onMetadata();
 if (video.readyState >= 2) onFrameReady();
 video.addEventListener('seeked', seekVideo);
 video.addEventListener('error', () => { video.classList.add('video-unavailable'); });
 if ('IntersectionObserver' in window) {
  const mediaObserver = new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) { mediaObserver.disconnect(); requestVideo(); }
  }, { rootMargin: '1100px 0px' });
  mediaObserver.observe(agreement);
 } else requestVideo();
 const unlock = async () => {
  if (unlockAttempted) return;
  unlockAttempted = true;
  requestVideo();
  try { await video.play(); video.pause(); seekVideo(); $('.video-enable').hidden = true; } catch (_) { unlockAttempted = false; }
 };
 agreement.addEventListener('touchstart', unlock, { once: true, passive: true });
 $('.video-enable').addEventListener('click', unlock);
 reduced.addEventListener('change', () => { setAgreementHeight(); requestScrollUpdate(); });
 if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { setAgreementHeight(); requestScrollUpdate(); }, { passive: true });
}
function updateScroll() {
 scrollQueued = false;
 const y = window.scrollY, vh = window.innerHeight;
 const total = Math.max(1, document.documentElement.scrollHeight - vh);
 $('.reading-progress').style.transform = `scaleX(${clamp(y / total)})`;
 const rect = agreement.getBoundingClientRect();
 let p = reduced.matches ? 1 : clamp(-rect.top / Math.max(1, agreement.offsetHeight - vh));
 if (rect.top < vh && rect.bottom > 0) {
  videoTimeTarget = clamp((p - 0.08) / 0.79) * (video.duration || 3.96); seekVideo();
  const f1 = reduced.matches ? 0 : clamp(1 - (p - .34) / .17);
  const f2 = reduced.matches ? 1 : clamp((p - .5) / .15);
  const a = $('[data-message=first]'), b = $('[data-message=second]');
  a.style.opacity = f1; a.style.transform = `translateY(${(1-f1)*-12}px)`;
  b.style.opacity = f2; b.style.transform = `translateY(${(1-f2)*14}px)`;
  a.setAttribute('aria-hidden', f1 < .3 ? 'true' : 'false'); b.setAttribute('aria-hidden', f2 < .3 ? 'true' : 'false');
  $('.agreement-top').style.transform = reduced.matches ? '' : `translateY(${-12 * p}px)`;
 }
 const hero = $('.hero');
 if (!reduced.matches && y < hero.offsetHeight) $('.hero-character').style.transform = `translateY(${clamp(y / hero.offsetHeight) * 30}px)`;
}
function requestScrollUpdate() { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }
window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate, { passive: true });

function initSolutions() {
 const tabs = $$('.solution-tabs button'), panel = $('#solution-panel');
 const content = {
  sites: { icon:'<svg viewBox="0 0 32 32"><rect x="3.5" y="5" width="25" height="21" rx="3"/><path d="M4 11h24M8 8h.01M12 8h.01M16 8h.01M8 16h10M8 20h7M22 16v7m-3.5-3.5h7"/></svg>', title:'Se o comprador pesquisa e encontra só recortes, ele decide sem contexto.', description:'Um site põe oferta, diferenciais, provas e próximo passo num endereço próprio. O comprador entende o que sua empresa resolve antes de chamar.', items:['Deixa claro por que escolher sua empresa','Põe provas perto das promessas','Organiza páginas por serviço e região para a busca'] },
  products: { icon:'<svg viewBox="0 0 32 32"><rect x="7" y="3.5" width="18" height="25" rx="3"/><path d="M11 9h10M11 13h7M11 18h10M11 22h6M14 25h4"/></svg>', title:'Se o cliente precisa ligar para concluir, a tarefa ainda não está resolvida.', description:'Um aplicativo leva a pessoa pela tarefa no celular e entrega à operação os dados necessários, sem recomeçar a conversa a cada etapa.', items:['Solicitações e arquivos num só caminho','Status que o cliente consegue consultar','Uma experiência que funciona no celular'] },
  systems: { icon:'<svg viewBox="0 0 32 32"><rect x="4" y="5" width="24" height="22" rx="3"/><path d="M4 11h24M9 16h5v6H9zM18 16h6M18 20h6M18 24h4"/></svg>', title:'Se ninguém sabe quem assumiu o pedido, a operação depende da memória.', description:'Reúna solicitações, responsáveis, aprovações e prazos num fluxo que a equipe e a gestão conseguem acompanhar.', items:['Solicitações organizadas por etapa','Responsável e próximo passo visíveis','Regras alinhadas à operação real'] },
  automation: { icon:'<svg viewBox="0 0 32 32"><circle cx="7" cy="16" r="3"/><circle cx="25" cy="8" r="3"/><circle cx="25" cy="24" r="3"/><path d="M10 16h5c4 0 3-8 7-8m-7 8c4 0 3 8 7 8"/></svg>', title:'Tire a cópia manual do caminho entre os sistemas.', description:'Conecte etapas repetíveis, mantenha registro do que aconteceu e encaminhe exceções para uma pessoa decidir.', items:['Menos repetição entre ferramentas','Próxima etapa acionada por uma regra clara','Exceções encaminhadas a alguém da equipe'] }
 };
 function select(tab) {
  const c = content[tab.dataset.solution];
  tabs.forEach(t => { const active=t===tab; t.setAttribute('aria-selected', active); t.tabIndex=active?0:-1; });
  panel.setAttribute('aria-labelledby', tab.id);
  panel.innerHTML = `<span class="solution-icon" aria-hidden="true">${c.icon}</span><h3>${c.title}</h3><p>${c.description}</p><ul>${c.items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  if (!reduced.matches && panel.animate) panel.animate([{ opacity:.35,transform:'translateY(8px)' },{ opacity:1,transform:'translateY(0)' }], { duration:350,easing:'cubic-bezier(.2,.7,.2,1)' });
 }
 tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', e => { let n; if (e.key==='ArrowRight') n=(i+1)%tabs.length; if (e.key==='ArrowLeft') n=(i+tabs.length-1)%tabs.length; if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1; if(n!==undefined){e.preventDefault();tabs[n].focus();select(tabs[n]);} });
 });
 if(tabs[0])select(tabs[0]);
}

function initDecisionStory() {
 const section=$('#comparacao'), pin=$('.decision-pin',section), viewport=$('#decision-viewport',section), track=$('#decision-track',section);
 if(!section||!pin||!viewport||!track)return;
 const panels=$$('.decision-panel',track), status=$('#decision-status'), progress=$('.decision-progress',section), progressFill=$('.decision-progress span',section);
 const names=panels.map(panel=>$('.decision-kicker',panel)?.textContent.replace(/^\s*\d+\s*[·/]\s*/, '').trim()||'Etapa');
 let maxX=0, travel=0, current=-1, frame=0, pathLength=0;
 function activate(index){
  index=clamp(index,0,panels.length-1);
  if(index===current)return;
  current=index;
  panels.forEach((panel,i)=>{if(i===index)panel.setAttribute('aria-current','step');else panel.removeAttribute('aria-current');});
  status.textContent=`${String(index+1).padStart(2,'0')} / ${String(panels.length).padStart(2,'0')} · ${names[index]}`;
  progress.setAttribute('aria-valuenow',String(index+1));
  progressFill.style.transform=`scaleX(${(index+1)/panels.length})`;
 }
 function measure(){
  if(reduced.matches){
   section.style.height='';track.style.removeProperty('--decision-x');track.style.removeProperty('--decision-width');
   panels.forEach(panel=>panel.style.removeProperty('width'));
   maxX=0;travel=0;return;
  }
  const width=Math.round(viewport.getBoundingClientRect().width);
  if(!width)return;
  panels.forEach(panel=>panel.style.width=`${width}px`);
  track.style.setProperty('--decision-width',`${width}px`);
  const route=$('.decision-route',track);if(route)route.style.width=`${width*panels.length}px`;
  maxX=Math.max(0,width*(panels.length-1));
  // Keep the full horizontal journey while reducing the vertical pin length.
  travel=maxX*.8;
  section.style.height=`${Math.max(pin.getBoundingClientRect().height,window.innerHeight)+travel}px`;
 }
 function render(){
  frame=0;
  if(reduced.matches){
   const target=window.innerHeight*.58;
   let index=0,nearest=Infinity;
   panels.forEach((panel,i)=>{const rect=panel.getBoundingClientRect(),distance=Math.abs((rect.top+rect.bottom)/2-target);if(distance<nearest){nearest=distance;index=i;}});
   activate(index);return;
  }
  const rect=section.getBoundingClientRect();
  const p=travel?clamp(-rect.top/travel):0;
  track.style.setProperty('--decision-x',`${-maxX*p}px`);
  const live=$('.decision-route-live',track);
  if(live){if(!pathLength){pathLength=live.getTotalLength();live.style.strokeDasharray=String(pathLength);}live.style.strokeDashoffset=String(pathLength*(1-p));}
  activate(Math.min(panels.length-1,Math.round(p*(panels.length-1))));
 }
 function request(){if(!frame)frame=requestAnimationFrame(render);}
 window.addEventListener('scroll',request,{passive:true});
 window.addEventListener('resize',()=>{measure();request();},{passive:true});
 if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{measure();request();},{passive:true});
 reduced.addEventListener('change',()=>{measure();request();});
 if('ResizeObserver'in window){const observer=new ResizeObserver(()=>{measure();request();});observer.observe(viewport);observer.observe(pin);}
 measure();activate(0);request();
 if(document.fonts?.ready)document.fonts.ready.then(()=>{measure();request();});
 window.addEventListener('load',()=>{measure();request();},{once:true});
}

const projects = [
 ['Óticas do Vale','ÓTICAS / INSTITUCIONAL','Estudo de página institucional para apresentar serviços, localização e diferenciais com clareza.'],
 ['Norma','CONTABILIDADE / INSTITUCIONAL','Conceito de site para explicar serviços contábeis e transformar dúvidas em próximo passo.'],
 ['Brisa Alta','HOSPITALIDADE / RESERVAS','Conceito de experiência de hospedagem que apresenta quartos, entorno e caminho para reserva.'],
 ['Nórdica','CONSTRUÇÃO / INSTITUCIONAL','Estudo institucional para organizar serviços, projetos e contato comercial.'],
 ['Atlas','EDUCAÇÃO / INSTITUCIONAL','Conceito de site educacional para comunicar cursos, datas e caminho de inscrição.'],
 ['Eixo','SAÚDE / FISIOTERAPIA','Estudo para apresentar especialidades e tornar o caminho de agendamento mais claro.'],
 ['Nobre Reis','SAÚDE / ODONTOLOGIA','Conceito de página para explicar tratamentos e facilitar o primeiro contato.'],
 ['Lume','SAÚDE / DERMATOLOGIA','Estudo visual para apresentar especialidades, atendimento e informações da clínica.'],
 ['Aura Vet','SAÚDE / VETERINÁRIA','Conceito para organizar serviços veterinários, equipe e canais de atendimento.'],
 ['Vértice','SAÚDE / ODONTOLOGIA','Estudo de clínica para explicar tratamentos e orientar o agendamento.'],
 ['Auster','SERVIÇOS / DIREITO','Conceito institucional para organizar áreas de atuação e abrir uma conversa com contexto.'],
 ['Lumina Casa','DESIGN / INTERIORES','Estudo de catálogo digital para apresentar ambientes e projetos com clareza.'],
 ['Órbita Visão','SAÚDE / OFTALMOLOGIA','Conceito para mostrar especialidades de visão e orientar o próximo passo do paciente.'],
 ['Casa Norte','IMÓVEIS / INSTITUCIONAL','Estudo imobiliário para organizar empreendimentos e facilitar a consulta de informações.']
].map(([name,sector,description],i)=>({name,sector,description,image:`assets/projects/project-${String(i).padStart(2,'0')}.webp`}));
let selected=0, orbitAngle=0, orbitVelocity=0, orbitFrame=0, orbitVisible=false, orbitIntroDone=false, orbitProgram=null, lastOrbitDrag=0;
const orbitStep=Math.PI*2/projects.length;
const orbitPointer={down:false,x:0,moved:false,target:-1};
const orbitStage=$('#gallery-stage'), orbitCards=$('#orbit-cards');
function wrapAngle(value){while(value>Math.PI)value-=Math.PI*2;while(value< -Math.PI)value+=Math.PI*2;return value;}
function updateProject(index){
 index=(index+projects.length)%projects.length;
 if(index===selected)return;
 selected=index;
 const item=projects[index];
 $('#project-name').textContent=item.name;$('#project-sector').textContent=item.sector;$('#project-description').textContent=item.description;
 $('#project-counter').textContent=`${String(index+1).padStart(2,'0')} / ${projects.length}`;
 $('#orbit-progress-fill').style.transform=`scaleX(${(index+1)/projects.length})`;
 orbitCards.querySelectorAll('.orbit-card').forEach((card,i)=>{card.setAttribute('aria-pressed',String(i===index));card.tabIndex=-1;});
}
function paintOrbit(){
 if(!orbitStage||!orbitCards)return;
 const width=orbitStage.clientWidth,height=orbitStage.clientHeight;
 if(!width||!height)return;
 const mobile=width<760,cx=-width*.18,cy=height*.5,rx=width*.74,ry=height*(mobile?.46:.47);
 let closest=0,closestDistance=Infinity;
 const cards=orbitCards.children;
 projects.forEach((project,index)=>{
  const theta=orbitAngle+index*orbitStep,cos=Math.cos(theta),sin=Math.sin(theta),proximity=(cos+1)/2;
  const x=cx+rx*cos,y=cy+ry*sin;
  const node=cards[index],image=node.querySelector('img');
  const opacity=clamp((cos+.16)/.76)*(.36+proximity*.64);
  const scale=mobile?.72+proximity*.28:.66+proximity*.34;
  const rotateY=(1-proximity)*(sin>0?-27:27),rotateZ=sin*(mobile?3.2:5);
  node.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${scale}) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
  node.style.opacity=String(opacity);node.style.zIndex=String(Math.round((cos+1)*1000));
  node.style.filter=`saturate(${.78+proximity*.22}) brightness(${.76+proximity*.24})`;
  node.classList.toggle('is-active',proximity>.985);
  node.setAttribute('aria-pressed',String(proximity>.985));
  if(opacity>.04&&!image.dataset.loaded){image.dataset.loaded='true';image.src=project.image;}
  const distance=Math.abs(wrapAngle(theta));if(distance<closestDistance){closestDistance=distance;closest=index;}
 });
 updateProject(closest);
}
function requestOrbitFrame(){if(!orbitFrame&&orbitVisible)orbitFrame=requestAnimationFrame(tickOrbit);}
function animateOrbitTo(to,duration=520){
 const destination=orbitAngle+wrapAngle(to-orbitAngle);
 orbitProgram={from:orbitAngle,to:destination,start:performance.now(),duration};orbitVelocity=0;orbitIntroDone=true;
 if(reduced.matches){orbitAngle=destination;orbitProgram=null;paintOrbit();return;}
 requestOrbitFrame();
}
function tickOrbit(now){
 orbitFrame=0;
 const dt=Math.min(32,now-(tickOrbit.last||now))/16.666;tickOrbit.last=now;
 if(orbitProgram){const p=clamp((now-orbitProgram.start)/orbitProgram.duration),eased=1-Math.pow(1-p,4);orbitAngle=orbitProgram.from+(orbitProgram.to-orbitProgram.from)*eased;if(p>=1)orbitProgram=null;}
 else if(!orbitPointer.down&&Math.abs(orbitVelocity)>.00005){orbitAngle+=orbitVelocity*dt;orbitVelocity*=Math.pow(.9,dt);if(Math.abs(orbitVelocity)<.00005)orbitVelocity=0;}
 paintOrbit();
 if(orbitProgram||Math.abs(orbitVelocity)>.00005)requestOrbitFrame();
}
function initGallery(){
 if(!orbitStage||!orbitCards)return;
 orbitStage.tabIndex=0;
 projects.forEach((project,index)=>{
  const card=document.createElement('button');card.type='button';card.className='orbit-card';card.dataset.index=String(index);card.tabIndex=-1;card.setAttribute('aria-pressed','false');card.setAttribute('aria-label',`Destacar estudo conceitual ${project.name}, ${project.sector}`);
  const image=document.createElement('img');image.alt='';image.loading='lazy';image.decoding='async';image.draggable=false;
  const number=document.createElement('span');number.className='orbit-card-number';number.textContent=String(index+1).padStart(2,'0');
  card.append(image,number);orbitCards.append(card);
  card.addEventListener('click',()=>{if(Date.now()-lastOrbitDrag<350)return;animateOrbitTo(-index*orbitStep);});
 });
 orbitStage.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'){event.preventDefault();animateOrbitTo(-(selected+1)*orbitStep);}
  if(event.key==='ArrowLeft'){event.preventDefault();animateOrbitTo(-(selected-1)*orbitStep);}
  if(event.key==='Home'){event.preventDefault();animateOrbitTo(0);}
  if(event.key==='End'){event.preventDefault();animateOrbitTo(-(projects.length-1)*orbitStep);}
 });
 orbitStage.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  orbitPointer.down=true;orbitPointer.x=event.clientX;orbitPointer.moved=false;orbitPointer.target=Number(event.target.closest('.orbit-card')?.dataset.index??-1);
  orbitVelocity=0;orbitProgram=null;orbitIntroDone=true;orbitStage.classList.add('is-dragging');
  try{orbitStage.setPointerCapture(event.pointerId);}catch{}
 });
 orbitStage.addEventListener('pointermove',event=>{
  if(!orbitPointer.down)return;
  const dx=event.clientX-orbitPointer.x;if(Math.abs(dx)>1)orbitPointer.moved=true;
  orbitAngle+=dx*.0065;orbitVelocity=dx*.00115;orbitPointer.x=event.clientX;requestOrbitFrame();
 });
 const release=event=>{
  if(!orbitPointer.down)return;
  const moved=orbitPointer.moved,target=orbitPointer.target;
  orbitPointer.down=false;orbitStage.classList.remove('is-dragging');
  if(moved)lastOrbitDrag=Date.now();else if(target>=0)animateOrbitTo(-target*orbitStep);
  try{orbitStage.releasePointerCapture(event.pointerId);}catch{}
  requestOrbitFrame();
 };
 orbitStage.addEventListener('pointerup',release);orbitStage.addEventListener('pointercancel',event=>{orbitPointer.down=false;orbitStage.classList.remove('is-dragging');try{orbitStage.releasePointerCapture(event.pointerId);}catch{}});
 paintOrbit();
 if('ResizeObserver'in window){const resize=new ResizeObserver(()=>paintOrbit());resize.observe(orbitStage);}else window.addEventListener('resize',paintOrbit,{passive:true});
 if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>{
   orbitVisible=entries[0].isIntersecting;
   if(!orbitVisible){if(orbitFrame)cancelAnimationFrame(orbitFrame);orbitFrame=0;return;}
   paintOrbit();
   if(entries[0].intersectionRatio>.45&&!orbitIntroDone&&!reduced.matches){orbitIntroDone=true;orbitProgram={from:orbitAngle,to:orbitAngle-orbitStep*2,start:performance.now(),duration:2200};requestOrbitFrame();}
  },{threshold:[0,.45,.7]});observer.observe(orbitStage);
 }else orbitVisible=true;
}

function initContact() {
 const c = config.contact || {};
 const digits = (c.whatsapp || '').replace(/\D/g, '');
 const genericText = 'Olá, quero conversar sobre um desafio da minha empresa com a Girofy.';
 const waHref = message => digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : '';
 if (digits) {
  const href = waHref(genericText);
  ['#header-whatsapp', '#direct-whatsapp'].forEach(selector => { const link = $(selector); if (link) link.href = href; });
  const widgetWhatsapp = $('#widget-whatsapp'); if (widgetWhatsapp) widgetWhatsapp.href = href;
  const widgetCall = $('#widget-call');
  if (widgetCall) widgetCall.href = waHref('Olá, quero agendar uma chamada rápida com a Girofy. Qual horário funciona para você?');
  const national = digits.startsWith('55') ? digits.slice(2) : digits;
  const label = national.length === 11 ? `+55 (${national.slice(0,2)}) ${national.slice(2,7)}-${national.slice(7)}` : `+${digits}`;
  const number = $('#contact-phone'); if (number) number.textContent = label;
 }
 const callLink = $('#widget-call'), callNote = $('#widget-call-note');
 if (callLink && c.calendarUrl && /^https:\/\//i.test(c.calendarUrl)) {
  callLink.href = c.calendarUrl;
  if (callNote) callNote.textContent = 'Escolha um horário no calendário';
 } else if (!digits && callLink) {
  callLink.href = c.email ? `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Agendar uma chamada — Girofy')}` : '#contato';
  callLink.removeAttribute('target');
  if (callNote) callNote.textContent = c.email ? 'Combine um horário por e-mail' : 'Veja os contatos no final da página';
 }
 if (c.email) { const link = $('#direct-email'); if (link) { link.href = `mailto:${encodeURIComponent(c.email)}`; link.textContent = c.email; } }
 const widget = $('#contact-widget'), toggle = $('#contact-widget-toggle'), panel = $('#contact-widget-panel');
 if (widget && toggle && panel) {
  const close = restore => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Abrir opções de contato'); if (restore) toggle.focus(); };
  toggle.addEventListener('click', () => {
   const opening = toggle.getAttribute('aria-expanded') !== 'true';
   toggle.setAttribute('aria-expanded', String(opening));
   toggle.setAttribute('aria-label', opening ? 'Fechar opções de contato' : 'Abrir opções de contato');
   panel.hidden = !opening;
   if (opening) $('#widget-whatsapp').focus();
  });
  panel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close(false)));
  document.addEventListener('click', e => { if (toggle.getAttribute('aria-expanded') === 'true' && !widget.contains(e.target)) close(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true); });
 }
}
$$('dialog').forEach(dialog=>{$('.close-dialog',dialog).addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
initNavigation();initVideo();initSolutions();initDecisionStory();initGallery();initContact();requestScrollUpdate();
})();
