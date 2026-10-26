const $=s=>document.querySelector(s),boardEl=$('#board'),lineSvg=$('#wl'),R=a=>a[Math.random()*a.length|0];
const DEF={mode:'hard',n:3,fade:false,pw:false,timer:false,secs:10,fx:true,snd:true};
let S={...DEF},score={X:0,O:0,D:0};
try{Object.assign(S,JSON.parse(localStorage.getItem('ttt-set')||'{}'));Object.assign(score,JSON.parse(localStorage.getItem('ttt-score')||'{}'))}catch(e){}
const fa=n=>Number(n).toLocaleString('fa-IR'),cpu=()=>S.mode!=='pvp',wl=n=>(n||S.n)===3?3:(n||S.n)-1;
let b,h,lk,pw,turn,over,busy,sel,extra,bonus,moves,W,CW,cells=[],tId,tEnd;

/* ---- sound & particles ---- */
let ac;
function tone(f,d=.12,t='sine',at=0){
  if(!S.snd)return;
  try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();
    const o=ac.createOscillator(),g=ac.createGain(),s=ac.currentTime+at;
    o.type=t;o.frequency.value=f;g.gain.setValueAtTime(.001,s);g.gain.exponentialRampToValueAtTime(.15,s+.01);g.gain.exponentialRampToValueAtTime(.001,s+d);
    o.connect(g).connect(ac.destination);o.start(s);o.stop(s+d)}catch(e){}
}
const cv=$('#fx'),cx=cv.getContext('2d');let P=[],run=false;
function burst(x,y,n,v){
  if(!S.fx)return;
  cv.width=innerWidth;cv.height=innerHeight;
  const cols=['#00e5ff','#ff3d9a','#ffe066','#7cff6b'];
  for(let k=0;k<n;k++)P.push({x,y,vx:(Math.random()-.5)*v*2,vy:-Math.random()*v-v/4,s:3+Math.random()*4,c:R(cols),r:Math.random()*6,l:n<30?28:999});
  if(run)return;run=true;
  (function f(){
    cx.clearRect(0,0,cv.width,cv.height);
    P.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;p.l--;cx.globalAlpha=Math.min(1,p.l/12);cx.fillStyle=p.c;cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);cx.restore()});
    P=P.filter(p=>p.y<cv.height+20&&p.l>0);
    if(P.length)requestAnimationFrame(f);else{run=false;cx.clearRect(0,0,cv.width,cv.height)}
  })();
}
function fxAt(i){
  if(!S.fx)return;
  boardEl.classList.remove('shake');void boardEl.offsetWidth;boardEl.classList.add('shake');
  const r=cells[i].getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,16,7);
}

/* ---- board & rules ---- */
const mark=p=>p==='X'
  ?'<svg class="m x" viewBox="0 0 100 100"><path pathLength="1" d="M24 24L76 76"/><path pathLength="1" d="M76 24L24 76"/></svg>'
  :'<svg class="m o" viewBox="0 0 100 100"><circle pathLength="1" cx="50" cy="50" r="27"/></svg>';
function build(){
  const n=S.n,k=wl();
  cells.forEach(c=>c.remove());
  boardEl.style.gridTemplateColumns=`repeat(${n},1fr)`;lineSvg.setAttribute('viewBox',`0 0 ${n} ${n}`);
  cells=Array.from({length:n*n},(_,i)=>{const c=document.createElement('button');c.className='cell';c.setAttribute('aria-label','خانه '+(i+1));c.onclick=()=>click(i);boardEl.append(c);return c});
  W=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)for(const[dr,dc]of[[0,1],[1,0],[1,1],[1,-1]]){
    const er=r+dr*(k-1),ec=c+dc*(k-1);
    if(er<0||er>=n||ec<0||ec>=n)continue;
    W.push(Array.from({length:k},(_,j)=>(r+dr*j)*n+c+dc*j));
  }
  CW=cells.map(()=>[]);W.forEach(w=>w.forEach(i=>CW[i].push(w)));
  reset();
}
function win(){for(const w of W){const p=b[w[0]];if(p&&w.every(i=>b[i]===p))return{p,line:w}}return null}
function put(i,p){b[i]=p;h[p].push(i);if(S.fade&&h[p].length>wl())b[h[p].shift()]=null}
const empties=()=>[...b.keys()].filter(i=>!b[i]&&!lk[i]);

/* ---- AI ---- */
function mm(p,d){
  const w=win();if(w)return w.p==='O'?10-d:d-10;
  if(b.every(Boolean))return 0;
  let r=p==='O'?-99:99;
  for(let i=0;i<9;i++)if(!b[i]){b[i]=p;const s=mm(p==='O'?'X':'O',d+1);b[i]=null;r=p==='O'?Math.max(r,s):Math.min(r,s)}
  return r;
}
function heur(p){
  const o=p==='X'?'O':'X',c=(S.n-1)/2;let m=-1e9,bi=0;
  for(const i of empties()){
    let s=Math.random()*.5-(Math.abs(i%S.n-c)+Math.abs((i/S.n|0)-c))*.1;
    for(const w of CW[i]){let a=0,q=0;for(const j of w){if(b[j]===p)a++;else if(b[j]===o)q++}
      if(!q)s+=8**a;else if(!a)s+=.8*8**q}
    if(s>m){m=s;bi=i}
  }
  return bi;
}
function cpuMove(){
  const e=empties();
  if(S.mode==='easy'||(S.mode==='mid'&&Math.random()<.4))return R(e);
  if(S.n===3&&!S.fade&&!S.pw&&S.mode==='hard'){
    let best=-99,pick=[];
    for(const i of e){b[i]='O';const s=mm('X',1);b[i]=null;if(s>best){best=s;pick=[i]}else if(s===best)pick.push(i)}
    return R(pick);
  }
  return heur('O');
}
function cpuTurn(){
  if(S.pw&&Math.random()<(S.mode==='easy'?.1:.3)){
    const k=R(Object.keys(pw.O).filter(k=>pw.O[k]));
    if(k==='db')use('db');
    else if(k==='rm'&&h.X.length){use('rm',R(h.X));return}
    else if(k==='lk'&&b.filter(v=>!v).length>1){use('lk',heur('X'));return}
  }
  place(cpuMove());
}

/* ---- turns ---- */
function click(i){
  if(over||busy)return;
  if(sel){
    if(sel==='rm'&&b[i]&&b[i]!==turn)use('rm',i);
    else if(sel==='lk'&&!b[i]&&!lk[i]&&b.filter(v=>!v).length>1)use('lk',i);
    return;
  }
  if(b[i]||lk[i])return;
  place(i);
}
function place(i){
  const p=turn;put(i,p);moves++;fxAt(i);tone(p==='X'?520:390,.1,'triangle');
  const w=win();
  if(w)return end(w);
  if(b.every(Boolean))return end(null);
  endTurn();
}
function use(k,i){
  const p=turn,o=p==='X'?'O':'X';
  pw[p][k]=0;sel=null;tone(700,.15,'square');
  if(k==='db'){extra=1;draw();turnMsg();return}
  if(k==='rm'){h[o].splice(h[o].indexOf(i),1);b[i]=null;fxAt(i)}else lk[i]=2;
  endTurn();
}
function endTurn(){
  lk=lk.map(v=>v>0?v-1:0);sel=null;
  bonus=extra>0;
  if(bonus)extra--;else turn=turn==='X'?'O':'X';
  busy=cpu()&&turn==='O';
  draw();turnMsg();tStart();
  if(busy)setTimeout(()=>{if(!over)cpuTurn()},550);
}
function timeout(){
  sel=null;tone(180,.3,'sawtooth');
  place(R(empties()));
}
function tStart(){
  clearInterval(tId);
  const tm=$('#tm'),bar=tm.firstChild;
  tm.classList.toggle('hid',!S.timer);tm.classList.remove('low');bar.style.width='100%';
  if(!S.timer||over||moves<1||busy)return; // no timer before the first move
  tEnd=Date.now()+S.secs*1000;
  tId=setInterval(()=>{
    const l=tEnd-Date.now();
    bar.style.width=Math.max(0,l/S.secs/10)+'%';
    tm.classList.toggle('low',l<=3000);
    if(l<=0){clearInterval(tId);timeout()}
  },100);
}

/* ---- render ---- */
const NAMES={rm:['💥','حذف'],lk:['🔒','قفل'],db:['⚡','دوبل']};
function draw(){
  const old=new Set(S.fade?['X','O'].flatMap(p=>h[p].length===wl()?[h[p][0]]:[]):[]);
  cells.forEach((c,i)=>{
    const p=b[i]||'';
    if(c.dataset.p!==p){c.dataset.p=p;c.innerHTML=p?mark(p):''}
    c.classList.toggle('old',old.has(i));c.classList.toggle('lk',lk[i]>0);
    c.classList.toggle('tg',!!sel&&(sel==='rm'?!!b[i]&&b[i]!==turn:!b[i]&&!lk[i]));
  });
  boardEl.dataset.t=turn;boardEl.classList.toggle('busy',busy);
  $('#pws').classList.toggle('hid',!S.pw);
  ['X','O'].forEach(p=>{
    $('#pw'+p).innerHTML=`<b>${p}</b>`+Object.keys(NAMES).map(k=>`<button data-p="${p}" data-k="${k}" class="${sel===k&&turn===p?'on':''}" ${pw[p][k]&&p===turn&&!over&&!busy?'':'disabled'}>${NAMES[k][0]} ${NAMES[k][1]}</button>`).join('');
  });
  $('#lx').textContent=cpu()?'شما (X)':'بازیکن X';$('#lo').textContent=cpu()?'کامپیوتر (O)':'بازیکن O';
  $('#sx').textContent=fa(score.X);$('#so').textContent=fa(score.O);$('#sd').textContent=fa(score.D);
}
const say=h=>$('#status').innerHTML=h;
function turnMsg(){
  let m=cpu()?(turn==='X'?'نوبت <b class="x">شماست</b>':'<b class="o">کامپیوتر</b> در حال فکر کردن…'):'نوبت بازیکن <b class="'+turn.toLowerCase()+'">'+turn+'</b>';
  if(sel)m=sel==='rm'?'یک علامت حریف را برای حذف انتخاب کن':'یک خانهٔ خالی برای قفل انتخاب کن';
  if(extra||bonus)m+=' ⚡';
  say(m);
}
function reset(){
  b=Array(S.n*S.n).fill(null);h={X:[],O:[]};lk=b.map(()=>0);
  pw={X:{rm:1,lk:1,db:1},O:{rm:1,lk:1,db:1}};
  turn='X';over=false;busy=false;sel=null;extra=0;bonus=false;moves=0;
  cells.forEach(c=>{c.className='cell';c.dataset.p='';c.innerHTML=''});
  lineSvg.innerHTML='';boardEl.classList.remove('done');
  draw();turnMsg();tStart();
}
function end(w){
  over=true;busy=false;sel=null;clearInterval(tId);$('#tm').classList.remove('low');
  if(w){
    score[w.p]++;boardEl.classList.add('done');
    w.line.forEach(i=>cells[i].classList.add('w'));
    const n=S.n,pt=i=>[i%n+.5,(i/n|0)+.5],[x1,y1]=pt(w.line[0]),[x2,y2]=pt(w.line.at(-1));
    lineSvg.innerHTML=`<line pathLength="1" style="stroke-width:${.6/(n+3.5)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    if(cpu()&&w.p==='O'){say('<b class="o">کامپیوتر</b> برد 🤖');tone(200,.5,'sawtooth')}
    else{
      say(cpu()?'<b class="x">شما بردید!</b> 🎉':'بازیکن <b class="'+w.p.toLowerCase()+'">'+w.p+'</b> برنده شد! 🎉');
      [523,659,784,1047].forEach((f,k)=>tone(f,.25,'triangle',k*.12));burst(innerWidth/2,innerHeight/2,130,15);
    }
  }else{score.D++;say('مساوی شد 🤝');tone(300,.3)}
  try{localStorage.setItem('ttt-score',JSON.stringify(score))}catch(e){}
  draw();
}

/* ---- UI & settings ---- */
$('#pws').onclick=e=>{
  const bt=e.target.closest('button');
  if(!bt||over||busy||bt.dataset.p!==turn||!pw[turn][bt.dataset.k])return;
  const k=bt.dataset.k;
  if(k==='db')use('db');else{sel=sel===k?null:k;draw();turnMsg()}
};
$('#again').onclick=reset;
$('#rs').onclick=()=>{score={X:0,O:0,D:0};try{localStorage.removeItem('ttt-score')}catch(e){}reset()};
const dlg=$('#dlg');let dm=S.mode;
const nvUpd=()=>$('#nv').textContent=`${fa($('#n').value)}×${fa($('#n').value)} — شرط برد: ${fa(wl(+$('#n').value))}`;
const secUpd=()=>$('#secs').parentElement.style.opacity=$('#timer').checked?1:.5;
function fill(){
  dm=S.mode;document.querySelectorAll('#modes button').forEach(x=>x.classList.toggle('on',x.dataset.m===dm));
  $('#n').value=S.n;$('#fade').checked=S.fade;$('#pwr').checked=S.pw;$('#timer').checked=S.timer;
  $('#secs').value=S.secs;$('#fxc').checked=S.fx;$('#snd').checked=S.snd;nvUpd();secUpd();
}
$('#set').onclick=()=>{fill();dlg.showModal()};
$('#cancel').onclick=()=>dlg.close();
$('#n').oninput=nvUpd;$('#timer').onchange=secUpd;
$('#modes').onclick=e=>{
  if(!e.target.dataset.m)return;dm=e.target.dataset.m;
  document.querySelectorAll('#modes button').forEach(x=>x.classList.toggle('on',x===e.target));
};
$('#ok').onclick=()=>{
  const N={mode:dm,n:+$('#n').value,fade:$('#fade').checked,pw:$('#pwr').checked,timer:$('#timer').checked,secs:+$('#secs').value,fx:$('#fxc').checked,snd:$('#snd').checked};
  const keys=['mode','n','fade','pw','timer','secs'];
  if(keys.some(k=>N[k]!==S[k])){score={X:0,O:0,D:0};try{localStorage.removeItem('ttt-score')}catch(e){}}
  S=N;try{localStorage.setItem('ttt-set',JSON.stringify(S))}catch(e){}
  dlg.close();build();
};
build();
