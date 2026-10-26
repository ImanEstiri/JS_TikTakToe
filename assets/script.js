const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const $=s=>document.querySelector(s), boardEl=$('#board'), lineSvg=$('#wl');
let b,turn,over,busy=false,mode='hard',sound=true,score={X:0,O:0,D:0};
try{Object.assign(score,JSON.parse(localStorage.getItem('ttt-score')||'{}'))}catch(e){}
const fa=n=>Number(n).toLocaleString('fa-IR');

const cells=[...Array(9)].map((_,i)=>{
  const c=document.createElement('button');
  c.className='cell';c.setAttribute('aria-label','خانه '+(i+1));
  c.onclick=()=>click(i);boardEl.append(c);return c;
});
const mark=p=>p==='X'
  ?'<svg class="m x" viewBox="0 0 100 100"><path pathLength="1" d="M24 24L76 76"/><path pathLength="1" d="M76 24L24 76"/></svg>'
  :'<svg class="m o" viewBox="0 0 100 100"><circle pathLength="1" cx="50" cy="50" r="27"/></svg>';

/* ---- sound ---- */
let ac;
function tone(f,d=.12,t='sine',at=0){
  if(!sound)return;
  try{
    ac=ac||new(window.AudioContext||window.webkitAudioContext)();
    const o=ac.createOscillator(),g=ac.createGain(),s=ac.currentTime+at;
    o.type=t;o.frequency.value=f;
    g.gain.setValueAtTime(.001,s);g.gain.exponentialRampToValueAtTime(.15,s+.01);g.gain.exponentialRampToValueAtTime(.001,s+d);
    o.connect(g).connect(ac.destination);o.start(s);o.stop(s+d);
  }catch(e){}
}

/* ---- confetti ---- */
const cv=$('#fx'),cx=cv.getContext('2d');let P=[],raf;
function burst(){
  const W=cv.width=innerWidth,H=cv.height=innerHeight,cols=['#00e5ff','#ff3d9a','#ffe066','#7cff6b'];
  P=Array.from({length:130},()=>({x:W/2,y:H/2,vx:(Math.random()-.5)*15,vy:-Math.random()*14-2,s:5+Math.random()*5,c:cols[Math.random()*4|0],r:Math.random()*6}));
  cancelAnimationFrame(raf);
  (function f(){
    cx.clearRect(0,0,W,H);
    P.forEach(p=>{p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.r+=.2;cx.fillStyle=p.c;cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);cx.restore()});
    P=P.filter(p=>p.y<H+20);
    if(P.length)raf=requestAnimationFrame(f);else cx.clearRect(0,0,W,H);
  })();
}

/* ---- game logic ---- */
function win(bd){
  for(const l of L){const[a,c,d]=l;if(bd[a]&&bd[a]===bd[c]&&bd[a]===bd[d])return{p:bd[a],line:l}}
  return null;
}
function mm(bd,p,d){ // minimax: O is maximiser
  const w=win(bd);
  if(w)return w.p==='O'?10-d:d-10;
  if(bd.every(Boolean))return 0;
  let best=p==='O'?-99:99;
  for(let i=0;i<9;i++)if(!bd[i]){
    bd[i]=p;const s=mm(bd,p==='O'?'X':'O',d+1);bd[i]=null;
    best=p==='O'?Math.max(best,s):Math.min(best,s);
  }
  return best;
}
function cpuMove(){
  const e=[...b.keys()].filter(i=>!b[i]);
  const rnd=()=>e[Math.random()*e.length|0];
  if(mode==='easy'||(mode==='mid'&&Math.random()<.5))return rnd();
  let best=-99,pick=[];
  for(const i of e){
    b[i]='O';const s=mm(b,'X',1);b[i]=null;
    if(s>best){best=s;pick=[i]}else if(s===best)pick.push(i);
  }
  return pick[Math.random()*pick.length|0];
}

function render(){
  const cpu=mode!=='pvp';
  $('#lx').textContent=cpu?'شما (X)':'بازیکن X';
  $('#lo').textContent=cpu?'کامپیوتر (O)':'بازیکن O';
  $('#sx').textContent=fa(score.X);$('#so').textContent=fa(score.O);$('#sd').textContent=fa(score.D);
  boardEl.dataset.t=turn;boardEl.classList.toggle('busy',busy);
}
function say(h){$('#status').innerHTML=h}
function turnMsg(){
  const cpu=mode!=='pvp';
  if(cpu)say(turn==='X'?'نوبت <b class="x">شماست</b>':'<b class="o">کامپیوتر</b> در حال فکر کردن…');
  else say('نوبت بازیکن <b class="'+turn.toLowerCase()+'">'+turn+'</b>');
}
function reset(){
  b=Array(9).fill(null);turn='X';over=false;busy=false;
  cells.forEach(c=>{c.innerHTML='';c.className='cell'});
  lineSvg.innerHTML='';boardEl.classList.remove('done');
  render();turnMsg();
}
function click(i){
  if(over||busy||b[i])return;
  if(mode!=='pvp'&&turn!=='X')return;
  place(i);
}
function place(i){
  b[i]=turn;cells[i].innerHTML=mark(turn);
  tone(turn==='X'?520:390,.1,'triangle');
  const w=win(b);
  if(w)return end(w);
  if(b.every(Boolean))return end(null);
  turn=turn==='X'?'O':'X';
  busy=mode!=='pvp'&&turn==='O';
  render();turnMsg();
  if(busy)setTimeout(()=>{if(over)return;busy=false;place(cpuMove())},500);
}
function end(w){
  over=true;busy=false;
  if(w){
    score[w.p]++;
    boardEl.classList.add('done');
    w.line.forEach(i=>cells[i].classList.add('w'));
    const[a,,c]=w.line,p=n=>[n%3+.5,(n/3|0)+.5];
    const[x1,y1]=p(a),[x2,y2]=p(c);
    lineSvg.innerHTML=`<line pathLength="1" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const cpu=mode!=='pvp';
    if(cpu&&w.p==='O'){say('<b class="o">کامپیوتر</b> برد 🤖');tone(200,.5,'sawtooth')}
    else{
      say(cpu?'<b class="x">شما بردید!</b> 🎉':'بازیکن <b class="'+w.p.toLowerCase()+'">'+w.p+'</b> برنده شد! 🎉');
      [523,659,784,1047].forEach((f,k)=>tone(f,.25,'triangle',k*.12));burst();
    }
  }else{score.D++;say('مساوی شد 🤝');tone(300,.3)}
  try{localStorage.setItem('ttt-score',JSON.stringify(score))}catch(e){}
  render();
}

/* ---- UI ---- */
$('#modes').onclick=e=>{
  const m=e.target.dataset.m;if(!m)return;
  mode=m;score={X:0,O:0,D:0};
  document.querySelectorAll('#modes button').forEach(x=>x.classList.toggle('on',x===e.target));
  reset();
};
$('#again').onclick=reset;
$('#rs').onclick=()=>{score={X:0,O:0,D:0};try{localStorage.removeItem('ttt-score')}catch(e){}reset()};
$('#snd').onclick=e=>{sound=!sound;e.target.textContent=sound?'🔊 صدا':'🔇 بی‌صدا'};
reset();
