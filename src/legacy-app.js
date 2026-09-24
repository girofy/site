(function(React,ReactDOM){
'use strict';
var h=React.createElement;

var PORTFOLIO=[
  {name:'Óticas do Vale',src:'./portfolio/01-oticas-do-vale.webp'},
  {name:'Norma',src:'./portfolio/02-norma.webp'},
  {name:'Brisa Alta',src:'./portfolio/03-brisa-alta.webp'},
  {name:'Nórdica',src:'./portfolio/04-nordica.webp'},
  {name:'Atlas',src:'./portfolio/05-atlas.webp'},
  {name:'Eixo Fisio',src:'./portfolio/06-eixo-fisio.webp'},
  {name:'Nayane Rodrigues',src:'./portfolio/07-nayane-rodrigues.webp'},
  {name:'Lume Derm',src:'./portfolio/08-lume-derm.webp'},
  {name:'Aura Vet',src:'./portfolio/09-aura-vet.webp'},
  {name:'Vértice',src:'./portfolio/10-vertice.webp'},
  {name:'Auster',src:'./portfolio/11-auster.webp'},
  {name:'Lúmina Casa',src:'./portfolio/12-lumina-casa.webp'},
  {name:'Órbita Visão',src:'./portfolio/13-orbita-visao.webp'},
  {name:'Casa Norte',src:'./portfolio/14-casa-norte.webp'}
]
var WHATSAPP='https://wa.me/55SEUNUMERO?text='+encodeURIComponent('Vi a experiência da Girofy e quero ver o que vocês fariam com a minha marca.');
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function range(p,a,b){return clamp((p-a)/(b-a),0,1)}
function smooth(t){return t*t*(3-2*t)}
function sceneAlpha(p,a,b,fade){var x=range(p,a,a+fade),y=1-range(p,b-fade,b);return smooth(Math.min(x,y))}
function setStyle(el,obj){if(!el)return;for(var k in obj){el.style[k]=obj[k]}}

function Logo(){return h('a',{className:'brand',href:'#top','aria-label':'Girofy'},
  h('svg',{viewBox:'0 0 64 64','aria-hidden':'true'},
    h('path',{d:'M46 13H24C14 13 8 20 8 31v9c0 8 6 13 14 13h16l17-17H33v9H23c-4 0-6-2-6-6v-8c0-6 3-9 9-9h20V13Z',fill:'none',stroke:'currentColor',strokeWidth:'4'}),
    h('path',{d:'M38 27h18v18',fill:'none',stroke:'currentColor',strokeWidth:'4'})
  ),h('span',{className:'brand__word'},'GIROFY'))}

function Loader(props){return h('div',{className:'loader'+(props.done?' is-done':'')},h('div',{className:'loader__core'},
  h('div',{className:'loader__glyph'},h('i'),h('i'),h('i')),
  h('div',{className:'loader__brand'},h('b',null,'GIROFY'),h('span',null,String(props.value).padStart(2,'0')+'%')),
  h('div',{className:'loader__rail'},h('i',{style:{transform:'scaleX('+(props.value/100)+')'}})),
  h('div',{className:'loader__copy'},h('span',null,'CONSTRUINDO PROFUNDIDADE'),h('span',null,'REACT + WEBGL'))
))}

function WebGLWorld(props){
  return h('canvas',{className:'webgl',ref:props.canvasRef,'aria-hidden':'true'});
}

function PortfolioCard(props){var item=props.item,i=props.index;return h('article',{className:'portfolioCard',ref:props.refFn},
  h('div',{className:'portfolioCard__frame'},h('img',{src:item.src,alt:'Hero conceitual '+item.name,loading:i<3?'eager':'lazy',decoding:'async'})),
  h('div',{className:'portfolioCard__meta'},h('span',null,String(i+1).padStart(2,'0')),h('b',null,item.name))
)}

function Scene(props){return h('section',{className:'scene '+props.className,ref:props.refFn},props.children)}

function App(){React.Component.apply(this,arguments);this.state={loaded:0,done:false,menu:false,name:''};this.canvas=null;this.journey=null;this.scenes=[];this.portfolioTrack=null;this.portfolioViewport=null;this.portfolioCards=[];this.raf=0;this.gl=null;this.program=null;this.start=performance.now();this.onScroll=this.onScroll.bind(this);this.ask=this.ask.bind(this);}
App.prototype=Object.create(React.Component.prototype);App.prototype.constructor=App;
App.prototype.componentDidMount=function(){
  var self=this;
  var assets=['./portfolio/01-oticas-do-vale.webp','./portfolio/03-brisa-alta.webp','./portfolio/07-nayane-rodrigues.webp','./portfolio/14-casa-norte.webp','./assets/cesar.webp'];
  var n=0;function hit(){n++;self.setState({loaded:Math.round(n/assets.length*100)});if(n===assets.length)setTimeout(function(){self.setState({done:true})},260)}
  assets.forEach(function(src){var im=new Image();im.onload=hit;im.onerror=hit;im.src=src});
  this.initGL();window.addEventListener('scroll',this.onScroll,{passive:true});window.addEventListener('resize',this.onResize.bind(this));this.onScroll();this.tick();
};
App.prototype.componentWillUnmount=function(){cancelAnimationFrame(this.raf);window.removeEventListener('scroll',this.onScroll)};
App.prototype.ask=function(){window.open(WHATSAPP,'_blank','noopener,noreferrer')};
App.prototype.onResize=function(){if(this.gl&&this.canvas){var d=Math.min(window.devicePixelRatio||1,1.6),c=this.canvas,w=Math.max(1,Math.floor(c.clientWidth*d)),hh=Math.max(1,Math.floor(c.clientHeight*d));if(c.width!==w||c.height!==hh){c.width=w;c.height=hh;this.gl.viewport(0,0,w,hh)}}};
App.prototype.initGL=function(){
  var c=this.canvas;if(!c)return;var gl=c.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});if(!gl)return;this.gl=gl;
  var vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs='precision highp float;uniform vec2 r;uniform float t;uniform float s;'+
  'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}'+
  'float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}'+
  'mat2 rot(float a){float c=cos(a),d=sin(a);return mat2(c,-d,d,c);}'+
  'float map(vec3 p){float k=smoothstep(.0,1.,s);p.z+=3.2+k*7.;p.xy*=rot(.12*sin(p.z*.7+t*.16));float tunnel=abs(length(p.xy)-1.7)-.045;vec3 q=p;q.xy=abs(q.xy)-vec2(1.18);float bars=sdBox(q,vec3(.025,.025,.8));float plane=sdBox(vec3(p.x,p.y,p.z-2.5),vec3(2.5,.015,2.5));float m=mix(min(tunnel,bars),min(tunnel,bars),k);if(s>.13&&s<.39)m=min(m,plane+.08);return m;}'+
  'void main(){vec2 uv=(gl_FragCoord.xy-.5*r.xy)/r.y;vec3 ro=vec3(0.,0.,-3.);vec3 rd=normalize(vec3(uv,1.25));float ss=s;float yaw=(ss-.5)*.22;rd.xz*=rot(yaw);float d=0.,glow=0.;vec3 p;for(int i=0;i<72;i++){p=ro+rd*d;float z=map(p);glow+=exp(-18.*abs(z))*.018;d+=max(.025,abs(z)*.72);if(d>16.)break;}vec3 bg=vec3(.012,.013,.016);float grid=pow(max(0.,1.-abs(sin((uv.x+uv.y*.32)*11.+t*.08))),28.)*.045;vec3 col=bg+vec3(.20,.33,.52)*glow+vec3(.15,.18,.22)*grid;float v=1.-smoothstep(.35,1.15,length(uv));col*=.55+.55*v;col+=vec3(.14,.19,.27)*max(0.,sin(t*.18+s*10.))*glow*.28;gl_FragColor=vec4(pow(col,vec3(.82)),1.);}';
  function sh(type,src){var x=gl.createShader(type);gl.shaderSource(x,src);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(x));return null}return x}
  var V=sh(gl.VERTEX_SHADER,vs),F=sh(gl.FRAGMENT_SHADER,fs);if(!V||!F)return;var pr=gl.createProgram();gl.attachShader(pr,V);gl.attachShader(pr,F);gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.warn(gl.getProgramInfoLog(pr));return}this.program=pr;gl.useProgram(pr);var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);var loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);this.uR=gl.getUniformLocation(pr,'r');this.uT=gl.getUniformLocation(pr,'t');this.uS=gl.getUniformLocation(pr,'s');this.onResize();
};
App.prototype.onScroll=function(){
  var j=this.journey;if(!j)return;var rect=j.getBoundingClientRect(),max=j.offsetHeight-window.innerHeight,p=clamp(-rect.top/Math.max(max,1),0,1);this.progress=p;document.documentElement.style.setProperty('--p',p.toFixed(4));this.updateScenes(p);
};
App.prototype.updateScenes=function(p){
  var ranges=[[0,.18],[.13,.34],[.29,.48],[.43,.67],[.63,.79],[.75,.9],[.86,1]],fade=.045;
  for(var i=0;i<this.scenes.length;i++){var el=this.scenes[i];if(!el)continue;var a=sceneAlpha(p,ranges[i][0],ranges[i][1],fade),mid=(ranges[i][0]+ranges[i][1])/2,local=(p-ranges[i][0])/(ranges[i][1]-ranges[i][0]),z=(local-.5)*120;setStyle(el,{opacity:a.toFixed(3),transform:'translate3d(0,'+((.5-local)*28)+'px,'+z+'px) scale('+(0.965+a*.035)+')'});el.classList.toggle('is-hit',a>.65)}
  var hero=this.scenes[0];if(hero){var hw=hero.querySelectorAll('.heroShift');for(var k=0;k<hw.length;k++){hw[k].style.transform='translate3d('+((k%2?1:-1)*range(p,.02,.16)*26)+'px,0,'+(range(p,.02,.16)*36)+'px)'}}
  var tiles=this.scenes[1]&&this.scenes[1].querySelectorAll('.siteTile');if(tiles){var lm=range(p,.16,.32),baseT=['rotateY(14deg) translateZ(-120px)','rotateY(-9deg) translateZ(-40px)','rotateY(-15deg) translateZ(-160px)','rotateY(10deg) translateZ(-70px)'];for(var q=0;q<tiles.length;q++){var x=(q-1.5)*lm*14,zz=q===1?lm*210:-lm*55;tiles[q].style.transform=baseT[q]+' translate3d('+x+'px,'+(-lm*q*4)+'px,'+zz+'px)'}}
  var pp=range(p,.43,.67),track=this.portfolioTrack,view=this.portfolioViewport;if(track&&view){var max=Math.max(0,track.scrollWidth-view.clientWidth),e=smooth(pp);track.style.transform='translate3d('+(-max*e).toFixed(2)+'px,0,0)';for(var ci=0;ci<this.portfolioCards.length;ci++){var ce=this.portfolioCards[ci];if(!ce)continue;var center=ci/Math.max(1,this.portfolioCards.length-1),d=center-e,ad=Math.min(1,Math.abs(d)*3.2),tilt=clamp(d*24,-10,10),z=38-ad*70,sc=1-ad*.035;ce.style.opacity=(.72+(1-ad)*.28).toFixed(3);ce.style.transform='translateZ('+z.toFixed(1)+'px) rotateY('+tilt.toFixed(2)+'deg) scale('+sc.toFixed(3)+')'}}
  var layers=this.scenes[4]&&this.scenes[4].querySelectorAll('.machineLayer');if(layers){var mp=range(p,.64,.79);for(var m=0;m<layers.length;m++){var phase=clamp(mp*5-m*.23,0,1);layers[m].style.opacity=(.18+.82*phase);layers[m].style.transform='translate3d('+((m%2?1:-1)*(1-phase)*90)+'px,0,'+((1-phase)*-180)+'px) rotateY('+((m%2?1:-1)*(1-phase)*16)+'deg)'}}
};
App.prototype.tick=function(){
  var self=this;var now=performance.now();if(this.gl&&this.program){var gl=this.gl,c=this.canvas;this.onResize();gl.useProgram(this.program);gl.uniform2f(this.uR,c.width,c.height);gl.uniform1f(this.uT,(now-this.start)/1000);gl.uniform1f(this.uS,this.progress||0);gl.drawArrays(gl.TRIANGLES,0,6)}this.raf=requestAnimationFrame(function(){self.tick()});
};
App.prototype.submitName=function(){var name=(this.state.name||'').trim();var msg=name?('Minha empresa é '+name+'. Vi a experiência da Girofy e quero ver o que vocês fariam com a marca.'):('Vi a experiência da Girofy e quero ver o que vocês fariam com a minha marca.');window.open('https://wa.me/55SEUNUMERO?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer')};
App.prototype.render=function(){var self=this;function refScene(i){return function(el){self.scenes[i]=el}}function refPortfolioCard(i){return function(el){self.portfolioCards[i]=el}}
  return h('div',{className:'app',id:'top'},
    h(Loader,{value:this.state.loaded,done:this.state.done}),
    h('header',{className:'nav'},h(Logo),h('nav',{className:'nav__center'},h('a',{href:'#experiencia'},'Experiência'),h('a',{href:'#projetos'},'Projetos'),h('a',{href:'#fundador'},'Fundador')),h('button',{className:'nav__cta',onClick:this.ask},'Quero sair da comparação ↗'),h('button',{className:'menu','aria-label':'Abrir menu',onClick:function(){self.setState({menu:!self.state.menu})}},h('i'))),
    h('div',{className:'mobileMenu'+(this.state.menu?' open':'')},h('a',{href:'#experiencia'},'Experiência',h('span',null,'01')),h('a',{href:'#projetos'},'Projetos',h('span',null,'02')),h('a',{href:'#fundador'},'Fundador',h('span',null,'03')),h('button',{onClick:this.ask},'Quero ver minha marca assim ↗')),
    h('main',{className:'journey',ref:function(el){self.journey=el},id:'experiencia'},h('div',{className:'stage'},
      h(WebGLWorld,{canvasRef:function(el){self.canvas=el}}),h('div',{className:'filmgrain'}),h('div',{className:'vignette'}),
      h(Scene,{className:'hero',refFn:refScene(0)},h('div',{className:'hero__wrap'},h('div',{className:'kicker'},'GIROFY · CREATIVE TECHNOLOGY'),h('h1',{className:'headline'},h('span',{className:'heroShift'},'Seu preço começa '),h('span',{className:'heroShift stroke'},'antes da proposta.'),h('br'),h('em',{className:'heroShift'},'Começa na percepção.')),h('p',{className:'bodycopy'},'Experiências digitais em 3D, motion e direção criativa para marcas que não querem disputar atenção como commodity.'),h('div',{className:'ctaLine'},h('button',{className:'button',onClick:this.ask},'Quero ver minha marca fora da comparação ↗'),h('span',{className:'micro'},'SCROLL-DRIVEN · RESPONSIVO · WEBGL')),h('div',{className:'hero__proof'},h('span',null,h('b',null,'3D'),'com função'),h('span',null,h('b',null,'Motion'),'com narrativa'),h('span',null,h('b',null,'Código'),'com performance'))),h('div',{className:'scrollHint'},'CONDUZA A EXPERIÊNCIA',h('i'))),
      h(Scene,{className:'market',refFn:refScene(1)},h('div',{className:'market__wrap'},h('div',{className:'market__copy'},h('div',{className:'kicker'},'01 · O MERCADO PLANO'),h('h2',{className:'headline'},'Quando todos parecem ',h('em',null,'bons'),', todos parecem ',h('em',null,'comparáveis'),'.'),h('p',{className:'bodycopy'},'E quando a comparação é fácil, o preço vira a conversa.')),h('div',{className:'market__plane','aria-hidden':'true'},h('i',{className:'siteTile'}),h('i',{className:'siteTile breaker'}),h('i',{className:'siteTile'}),h('i',{className:'siteTile'})))),
      h(Scene,{className:'breakout',refFn:refScene(2)},h('div',{className:'breakout__wrap'},h('div',{className:'kicker'},'02 · GANHAR PROFUNDIDADE'),h('h2',{className:'headline'},'Não fazemos a sua marca ',h('em',null,'parecer melhor.'),h('br'),'Fazemos ela ',h('em',null,'sair da categoria.')),h('div',{className:'equation'},h('span',null,'COMPARÁVEL'),h('b',null,'→'),h('span',null,'NEGOCIÁVEL'),h('b',null,'/'),h('span',null,'MEMORÁVEL'),h('b',null,'→'),h('span',null,'DESEJÁVEL'))),h('div',{className:'depthWord'},'DEPTH')),
      h(Scene,{className:'portfolio',refFn:refScene(3)},h('div',{className:'portfolio__head',id:'projetos'},h('div',null,h('div',{className:'kicker'},'03 · 14 DIREÇÕES'),h('h2',{className:'headline'},'O nível permanece.',h('br'),h('em',null,'A linguagem muda.'))),h('p',null,'Ótica, saúde, construção, direito, hotelaria e casa. Nenhum projeto precisa herdar a estética do anterior.')),h('div',{className:'portfolioViewport',ref:function(el){self.portfolioViewport=el}},h('div',{className:'portfolioTrack',ref:function(el){self.portfolioTrack=el}},PORTFOLIO.map(function(item,i){return h(PortfolioCard,{key:item.name,item:item,index:i,refFn:refPortfolioCard(i)})})))),
      h(Scene,{className:'process',refFn:refScene(4)},h('div',{className:'process__wrap'},h('div',{className:'process__copy'},h('div',{className:'kicker'},'04 · A MÁQUINA POR TRÁS'),h('h2',{className:'headline'},'Isso não sai de ',h('em',null,'um template.')),h('p',{className:'bodycopy'},'Estratégia, direção, interface e movimento entram como camadas da mesma cena. O resultado precisa vender antes de ser explicado.')),h('div',{className:'machine','aria-hidden':'true'},h('div',{className:'machineLayer'},h('span',null,'01'),h('b',null,'Diagnóstico')),h('div',{className:'machineLayer'},h('span',null,'02'),h('b',null,'Direção criativa')),h('div',{className:'machineLayer'},h('span',null,'03'),h('b',null,'Motion + 3D')),h('div',{className:'machineLayer'},h('span',null,'04'),h('b',null,'Conversão + entrega'))))),
      h(Scene,{className:'founder',refFn:refScene(5)},h('div',{className:'founder__image'},h('img',{src:'./assets/cesar.webp',alt:'Cesar, fundador da Girofy'})),h('div',{className:'founder__copy',id:'fundador'},h('div',{className:'kicker'},'05 · QUEM DIRIGE'),h('h2',{className:'headline'},'Não terceirizo a ',h('em',null,'visão.')),h('p',{className:'bodycopy'},'Da primeira tese visual à experiência final, a direção continua no mesmo lugar. Menos ruído. Mais intenção.'),h('div',{className:'signature'},'Cesar — Founder & Creative Direction'))),
      h(Scene,{className:'final',refFn:refScene(6)},h('div',{className:'final__wrap'},h('div',{className:'final__rule'}),h('div',{className:'kicker'},'06 · INVERSÃO DE RISCO'),h('h2',{className:'headline'},'Veja antes.',h('br'),h('em',null,'Decida depois.')),h('p',{className:'bodycopy',style:{margin:'0 auto'}},'Você não precisa contratar uma promessa. Primeiro veja a direção que a Girofy daria à sua marca.'),h('div',{className:'risk'},h('span',null,'SEM PROMESSA CEGA'),h('span',null,'DIREÇÃO VISUAL REAL'),h('span',null,'PRÓXIMO PASSO CLARO')),h('div',{className:'ctaLine',style:{justifyContent:'center'}},h('button',{className:'button',onClick:this.ask},'Quero ver o que fariam com minha marca ↗'))))
    )),
    h('section',{className:'timelineHost','aria-label':'Processo Girofy'},h('div',{id:'timeline-root'})),
    h('section',{className:'after'},h('div',{className:'after__wrap'},h('div',null,h('div',{className:'kicker'},'UM ÚLTIMO TESTE'),h('h2',null,'Coloque sua marca ',h('em',null,'dentro da história.')),h('p',null,'Digite o nome. O próximo passo sai do abstrato e vira uma conversa sobre a sua empresa.')),h('div',{className:'after__form'},h('label',null,'Nome da empresa'),h('input',{value:this.state.name,placeholder:'Ex.: Atlas Engenharia',onChange:function(e){self.setState({name:e.target.value})},onKeyDown:function(e){if(e.key==='Enter')self.submitName()}}),h('button',{onClick:function(){self.submitName()}},'Construir essa conversa ↗')))),
    h('footer',{className:'footer'},h('b',null,'GIROFY'),h('span',null,'Experiências digitais para marcas que não querem parecer genéricas.'),h('span',null,'React · WebGL · direção criativa'))
  )
};
ReactDOM.render(h(App),document.getElementById('root'));
})(globalThis.React,globalThis.ReactDOM);

export {};
