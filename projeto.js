(() => {
 'use strict';
 const config=window.GIROFY_CONFIG||{};
 const form=document.querySelector('#project-form');
 const feedback=document.querySelector('#project-feedback');
 const headerLink=document.querySelector('#project-header-whatsapp');
 const digits=(config.contact?.whatsapp||'').replace(/\D/g,'');
 if(digits&&headerLink)headerLink.href=`https://wa.me/${digits}?text=${encodeURIComponent('Olá, quero conversar sobre um desafio da minha empresa com a Girofy.')}`;
 const fronts={
  'software-sob-medida':{label:'Software sob medida',challenge:'Ainda estou entendendo onde está o problema'},
  'sistemas-internos':{label:'Sistema interno',challenge:'A equipe acompanha etapas em planilhas ou conversas'},
  'aplicativos-empresariais':{label:'Aplicativo empresarial',challenge:'O cliente não consegue solicitar ou acompanhar online'},
  'plataformas-digitais':{label:'Plataforma digital',challenge:'O cliente não consegue solicitar ou acompanhar online'},
  'automacao-integracoes':{label:'Automação e integrações',challenge:'Tarefas repetidas passam de mão em mão'},
  'sites-para-empresas':{label:'Site para empresa',challenge:'Quem pesquisa não encontra ou não entende a empresa'},
  'guia-escolher-software':{label:'Avaliação de projeto digital',challenge:'Ainda estou entendendo onde está o problema'}
 };
 const front=new URLSearchParams(location.search).get('frente');
 const context=fronts[front];
 if(context){
  const hidden=document.createElement('input');hidden.type='hidden';hidden.name='front';hidden.value=context.label;form.append(hidden);
  const choice=[...form.querySelectorAll('input[name="challengeType"]')].find(input=>input.value===context.challenge);
  if(choice)choice.checked=true;
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));
  const text=[
   'Olá, César. Quero conversar sobre um desafio da minha empresa.',
   '',
   `Nome: ${data.name}`,
   `Empresa: ${data.company}`,
   `Contato para retorno: ${data.replyTo}`,
   `Situação: ${data.challengeType}`,
   ...(data.front?[`Frente que quero avaliar: ${data.front}`]:[]),
   '',
   'O que acontece hoje:',
   data.situation
  ].join('\n');
  if(digits){
   feedback.textContent='Seu WhatsApp vai abrir com o rascunho. Revise e envie quando estiver pronto.';
   window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
  }else if(config.contact?.email){
   feedback.textContent='Seu aplicativo de e-mail vai abrir com o rascunho. Revise e envie quando estiver pronto.';
   window.location.href=`mailto:${encodeURIComponent(config.contact.email)}?subject=${encodeURIComponent('Desafio da empresa — Girofy')}&body=${encodeURIComponent(text)}`;
  }else{
   feedback.textContent='O contato ainda não está configurado. Escreva para girofy.com@gmail.com.';
  }
 });
})();
