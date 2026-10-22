(() => {
 'use strict';
 document.documentElement.classList.add('js');
 const menu=document.querySelector('.menu-button');
 const nav=document.querySelector('#navigation');
 if(menu&&nav){
  const close=restore=>{nav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');if(restore)menu.focus();};
  menu.addEventListener('click',()=>{
   const open=menu.getAttribute('aria-expanded')!=='true';
   nav.hidden=!open;menu.setAttribute('aria-expanded',String(open));
   menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
   if(open)nav.querySelector('a')?.focus();
  });
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>close(false)));
  document.addEventListener('click',event=>{if(!nav.contains(event.target)&&!menu.contains(event.target))close(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!nav.hidden)close(true);});
 }
 const whatsapp=(window.GIROFY_CONFIG?.contact?.whatsapp||'').replace(/\D/g,'');
 if(whatsapp){
  const link=document.querySelector('.service-cta-contact a[href^="https://wa.me/"]');
 if(link)link.href=`https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá, quero conversar com a Girofy sobre um desafio da minha empresa.')}`;
 }

 const $=(selector,root=document)=>root.querySelector(selector);
 const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
 const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');

 function initServiceAgreement(){
  const section=$('.service-agreement');
  if(!section)return;
  const video=$('.service-agreement-video',section);
  if(!video)return;
  const source=$('source',video),first=$('[data-message="first"]',section),second=$('[data-message="second"]',section),heading=$('.agreement-top',section);
  let ready=video.readyState>=2,requested=false,target=0,frame=0,unlocked=false;
  const isMobile=()=>window.matchMedia('(max-width:800px)').matches;
  function setHeight(){section.style.height=`${(1+(reduced.matches?0:(isMobile()?0.8:1.5)))*100}svh`;}
  function requestVideo(){
   if(requested||!source?.dataset.src)return;
   requested=true;source.src=source.dataset.src;source.removeAttribute('data-src');video.preload='auto';video.load();
  }
  function seek(){
   if(!ready||video.readyState<2||video.seeking||!Number.isFinite(video.duration))return;
   const next=clamp(target,0,Math.max(0,video.duration-.045));
   if(Math.abs(video.currentTime-next)>.04){try{video.currentTime=next;}catch(_){}}
  }
  function render(){
   frame=0;
   const rect=section.getBoundingClientRect(),vh=window.innerHeight;
   if(rect.top<vh&&rect.bottom>0){
    const p=reduced.matches?1:clamp(-rect.top/Math.max(1,section.offsetHeight-vh));
    target=clamp((p-.08)/.79)*(Number.isFinite(video.duration)?video.duration:4);
    seek();
    const a=reduced.matches?0:clamp(1-(p-.34)/.17),b=reduced.matches?1:clamp((p-.5)/.15);
    first.style.opacity=String(a);first.style.transform=`translateY(${(1-a)*-12}px)`;
    second.style.opacity=String(b);second.style.transform=`translateY(${(1-b)*14}px)`;
    first.setAttribute('aria-hidden',a<.3?'true':'false');second.setAttribute('aria-hidden',b<.3?'true':'false');
    heading.style.transform=reduced.matches?'':`translateY(${-12*p}px)`;
   }
  }
  function requestRender(){if(!frame)frame=requestAnimationFrame(render);}
  function unlock(){
   if(unlocked)return;unlocked=true;requestVideo();
   video.play().then(()=>{video.pause();seek();}).catch(()=>{unlocked=false;});
  }
  video.addEventListener('loadedmetadata',()=>{if(reduced.matches)target=Math.max(0,video.duration-.05);requestRender();});
  video.addEventListener('loadeddata',()=>{ready=video.readyState>=2;seek();});
  video.addEventListener('canplay',()=>{ready=video.readyState>=2;seek();});
  video.addEventListener('seeked',seek);
  if(video.readyState>=1&&reduced.matches)target=Math.max(0,(video.duration||0)-.05);
  if('IntersectionObserver'in window){
   const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();requestVideo();}},{rootMargin:'1000px 0px'});
   observer.observe(section);
  }else requestVideo();
  section.addEventListener('touchstart',unlock,{once:true,passive:true});
  setHeight();requestRender();
  window.addEventListener('scroll',requestRender,{passive:true});
  window.addEventListener('resize',()=>{setHeight();requestRender();},{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{setHeight();requestRender();},{passive:true});
  reduced.addEventListener('change',()=>{setHeight();requestRender();});
  window.addEventListener('load',requestRender,{once:true});
 }

 function initServiceDecision(){
  const section=$('.service-page .decision-story');
  if(!section)return;
  const pin=$('.decision-pin',section),viewport=$('.decision-viewport',section),track=$('.decision-track',section);
  if(!pin||!viewport||!track)return;
  const panels=$$('.decision-panel',track),status=$('.decision-controls>span:first-child',section),progress=$('.decision-progress',section),fill=$('.decision-progress span',section);
  if(!panels.length||!status||!progress||!fill)return;
  const names=panels.map(panel=>$('.decision-kicker',panel)?.textContent.replace(/^\s*\d+\s*[·/]\s*/,'').trim()||'Etapa');
  let maxX=0,travel=0,current=-1,frame=0,pathLength=0;
  function activate(index){
   index=clamp(index,0,panels.length-1);
   if(index===current)return;current=index;
   panels.forEach((panel,i)=>i===index?panel.setAttribute('aria-current','step'):panel.removeAttribute('aria-current'));
   status.textContent=`${String(index+1).padStart(2,'0')} / ${String(panels.length).padStart(2,'0')} · ${names[index]}`;
   progress.setAttribute('aria-valuenow',String(index+1));fill.style.transform=`scaleX(${(index+1)/panels.length})`;
  }
  function measure(){
   if(reduced.matches){
    section.style.height='';track.style.removeProperty('--decision-x');track.style.removeProperty('--decision-width');
    panels.forEach(panel=>panel.style.removeProperty('width'));maxX=0;travel=0;return;
   }
   const width=Math.round(viewport.getBoundingClientRect().width);if(!width)return;
   panels.forEach(panel=>panel.style.width=`${width}px`);
   track.style.setProperty('--decision-width',`${width}px`);
   const route=$('.decision-route',track);if(route)route.style.width=`${width*panels.length}px`;
   maxX=Math.max(0,width*(panels.length-1));travel=maxX*.8;
   section.style.height=`${Math.max(pin.getBoundingClientRect().height,window.innerHeight)+travel}px`;
  }
  function render(){
   frame=0;
   if(reduced.matches){
    const target=window.innerHeight*.58;let nearest=Infinity,index=0;
    panels.forEach((panel,i)=>{const rect=panel.getBoundingClientRect(),distance=Math.abs((rect.top+rect.bottom)/2-target);if(distance<nearest){nearest=distance;index=i;}});
    activate(index);return;
   }
   const rect=section.getBoundingClientRect(),p=travel?clamp(-rect.top/travel):0;
   track.style.setProperty('--decision-x',`${-maxX*p}px`);
   const live=$('.decision-route-live',track);
   if(live){if(!pathLength){pathLength=live.getTotalLength();live.style.strokeDasharray=String(pathLength);}live.style.strokeDashoffset=String(pathLength*(1-p));}
   activate(Math.min(panels.length-1,Math.round(p*(panels.length-1))));
  }
  function requestRender(){if(!frame)frame=requestAnimationFrame(render);}
  window.addEventListener('scroll',requestRender,{passive:true});
  window.addEventListener('resize',()=>{measure();requestRender();},{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{measure();requestRender();},{passive:true});
  reduced.addEventListener('change',()=>{measure();requestRender();});
  if('ResizeObserver'in window){const observer=new ResizeObserver(()=>{measure();requestRender();});observer.observe(viewport);observer.observe(pin);}
  measure();activate(0);requestRender();
  if(document.fonts?.ready)document.fonts.ready.then(()=>{measure();requestRender();});
  window.addEventListener('load',()=>{measure();requestRender();},{once:true});
 }

 initServiceAgreement();
 initServiceDecision();
})();
