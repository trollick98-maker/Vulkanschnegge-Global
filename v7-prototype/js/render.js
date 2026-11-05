(function(){
  'use strict';
  const V=window.VS7;
  const c=document.getElementById('game'),g=c.getContext('2d');
  const W=V.W,H=V.H,G=V.GROUND;
  function rounded(x,y,w,h,r,color){g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
  function grad(y0,y1,c0,c1){const x=g.createLinearGradient(0,y0,0,y1);x.addColorStop(0,c0);x.addColorStop(1,c1);return x;}
  function background(t,offset=0,mode='world'){
    g.fillStyle=grad(0,H,mode==='combat'?'#09243b':'#0b3750',mode==='combat'?'#102e4a':'#126879');g.fillRect(0,0,W,H);
    g.save();g.globalAlpha=.12;
    for(let i=0;i<7;i++){
      const x=((i*191+87-offset*.08)%(W+300)+W+300)%(W+300)-100;
      g.fillStyle='#b8fbea';g.beginPath();g.moveTo(x-42,0);g.lineTo(x+40,0);g.lineTo(x+145,H);g.lineTo(x+38,H);g.closePath();g.fill();
    }g.restore();
    // Distant underwater structures, gently parallaxing.
    for(let layer=0;layer<3;layer++){
      const shift=offset*(.12+layer*.12);const y=325+layer*32;
      g.fillStyle=['#0b3d57','#10506a','#125d70'][layer];
      for(let i=-2;i<11;i++){
        const x=i*168-(shift%168);
        g.beginPath();g.moveTo(x-30,G);g.lineTo(x-8,y+15);g.quadraticCurveTo(x+42,y-35,x+82,y+8);g.lineTo(x+130,G);g.closePath();g.fill();
      }
    }
    // Bubbles: fixed procedural positions, animated upwards.
    g.strokeStyle='#a6f8ed4c';g.lineWidth=2;
    for(let i=0;i<36;i++){
      const x=(i*251+37+Math.sin(t*.9+i)*19)%W;
      const y=((i*83-(t*14*(.5+i%4*.2)))%(H+30)+(H+30))%(H+30);
      g.beginPath();g.arc(x,y,2+i%4,0,Math.PI*2);g.stroke();
    }
  }
  function seabed(offset=0){
    g.fillStyle=grad(G,H,'#87765c','#554e51');g.fillRect(0,G,W,H-G);
    g.fillStyle='#e6ba7b7f';g.fillRect(0,G,W,4);
    const p=offset%125;
    for(let i=-1;i<11;i++){
      const x=i*125-p;
      g.fillStyle=i%2===0?'#a09171':'#6f655c';g.beginPath();g.ellipse(x+65,G+48,42,9,0,0,Math.PI*2);g.fill();
      for(let j=0;j<4;j++){
        let x1=x+j*31+10;
        g.strokeStyle=j%2?'#3cae91':'#60b5a1';g.lineWidth=4;g.lineCap='round';
        g.beginPath();g.moveTo(x1,G);g.quadraticCurveTo(x1-15,G-17,x1+Math.sin(i+j)*11,G-36-j%2*15);g.stroke();
      }
    }
  }
  function snail(x,y,w=46,h=44,facing=1,flash=false,dashing=false,t=0){
    g.save();g.translate(x+w/2,y+h/2);g.scale(facing,1);
    if(flash&&Math.floor(t*14)%2===0)g.globalAlpha=.35;
    if(dashing){g.shadowColor='#99fff1';g.shadowBlur=24;g.fillStyle='#9dffe04a';g.beginPath();g.ellipse(-18,5,w*.95,h*.37,0,0,Math.PI*2);g.fill();}
    if(V.readyImage(V.profile.character)){
      const img=V.assets[V.profile.character];
      if(dashing){g.shadowColor='#99fff1';g.shadowBlur=20;}
      if(flash&&Math.floor(t*14)%2===0)g.globalAlpha=.38;
      g.rotate(V.state?.level?.player?.angle*Math.PI/180||0);
      g.drawImage(img,-w/2,-h/2,w,h);
      g.restore();return;
    }
    const s=Math.min(w/46,h/44);g.scale(s,s);
    // Fallback drawing when the source is unavailable.
    // Foot and eye stalks.
    g.fillStyle='#8de9b1';g.beginPath();g.ellipse(0,13,27,12,0,0,Math.PI*2);g.fill();
    g.lineWidth=5;g.strokeStyle='#90e6ac';g.lineCap='round';
    g.beginPath();g.moveTo(10,5);g.lineTo(14,-24);g.moveTo(19,8);g.lineTo(25,-19);g.stroke();
    g.fillStyle='#f7ffff';g.beginPath();g.arc(14,-24,6,0,Math.PI*2);g.arc(25,-19,5.5,0,Math.PI*2);g.fill();
    g.fillStyle='#112a3c';g.beginPath();g.arc(15,-24,2.6,0,Math.PI*2);g.arc(26,-19,2.5,0,Math.PI*2);g.fill();
    const shell=g.createRadialGradient(-5,-5,2,-5,-5,24);shell.addColorStop(0,'#ffce86');shell.addColorStop(.7,'#e68c63');shell.addColorStop(1,'#904f60');
    g.fillStyle=shell;g.beginPath();g.arc(-7,0,22,0,Math.PI*2);g.fill();
    g.strokeStyle='#753e54';g.lineWidth=3.3;g.beginPath();
    for(let i=0;i<=60;i++){const a=i/60*Math.PI*3.7,r=1+i*.27,px=-7+Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)g.moveTo(px,py);else g.lineTo(px,py);}g.stroke();
    g.restore();
  }
  function coral(x,y,height,color){g.strokeStyle=color;g.lineWidth=12;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x-4,y-height*.57);g.lineTo(x+8,y-height);g.moveTo(x-4,y-height*.57);g.lineTo(x-25,y-height*.8);g.moveTo(x+2,y-height*.33);g.lineTo(x+26,y-height*.6);g.stroke();}
  function drawMap(t){
    background(t,t*14);
    // Land masses and winding routes behind accessible HTML nodes.
    g.fillStyle='#2d7992a6';
    for(const [x,y,rx,ry] of [[270,265,175,105],[685,254,178,110],[480,445,154,76]]){
      g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();
      g.strokeStyle='#79c9c5b2';g.lineWidth=2;g.stroke();
    }
    g.strokeStyle='#fbd69cab';g.lineWidth=5;g.setLineDash([4,15]);g.lineCap='round';
    for(const target of [[270,266],[690,258]]){g.beginPath();g.moveTo(480,437);g.quadraticCurveTo(target[0],385,target[0],target[1]);g.stroke();}
    g.setLineDash([]);
    for(let i=0;i<15;i++){
      const x=45+i*73,y=435+Math.sin(i*2.2)*34;
      if(i%3===0)coral(x,y,29+i%4*8,'#58bcad6f');
    }
    g.font='14px system-ui';g.fillStyle='#b8ebda9c';
    g.fillText('✧',65,112);g.fillText('✦',845,165);g.fillText('✧',155,415);
  }
  function sprite(name,x,y,w,h){
    if(!V.readyImage(name))return false;
    g.drawImage(V.assets[name],x,y,w,h);return true;
  }
  function drawRock(x,y,w,h,fragile){
    if(sprite(fragile?'crate':'mine',x-3,y-3,w+6,h+6))return;
    if(!fragile&&V.readyImage('obstacle')){
      g.drawImage(V.assets.obstacle,x,y,w,h);return;
    }
    g.save();g.translate(x,y);
    g.fillStyle=fragile?'#aa8cb8':'#ed806e';g.strokeStyle=fragile?'#dbc8ed':'#ffd6ac';g.lineWidth=3;
    g.beginPath();g.moveTo(0,h);g.lineTo(4,h*.45);g.lineTo(w*.32,5);g.lineTo(w*.64,h*.2);g.lineTo(w-3,0);g.lineTo(w,h);g.closePath();g.fill();g.stroke();
    g.strokeStyle='#3b334a8c';g.lineWidth=2;g.beginPath();g.moveTo(w*.35,h*.41);g.lineTo(w*.56,h*.67);g.lineTo(w*.40,h*.85);g.stroke();
    if(fragile){g.fillStyle='#fff6';g.fillRect(w*.56,15,6,6);}g.restore();
  }
  function drawRunner(s,t){
    background(t,s.dist);
    for(let i=0;i<8;i++){
      const x=i*210-(s.dist*.65%210);
      coral(x+40,G+8,36+i%3*18,'#45c4b37c');
    }
    seabed(s.dist);
    // Finish beacon and route guide.
    const finish=215+s.course-s.dist;
    if(finish<W+80){
      g.fillStyle='#82ffdf40';g.fillRect(finish-10,0,22,G);
      g.strokeStyle='#fff7a2';g.lineWidth=4;g.beginPath();g.moveTo(finish,85);g.lineTo(finish,G);g.stroke();
      g.fillStyle='#fff6ca';g.font='bold 17px system-ui';g.fillText('ZIEL',finish-22,78);
    }
    for(const o of s.obstacles){if(!o.dead){const x=215+o.worldX-s.dist;if(x>-100&&x<W+80)drawRock(x,G-o.h,o.w,o.h,o.fragile);}}
    for(const coin of s.coins){if(coin.taken)continue;const x=215+coin.worldX-s.dist;if(x<-20||x>W+30)continue;
      g.shadowColor='#ffeaa0';g.shadowBlur=12;g.fillStyle='#ffdd7f';g.beginPath();g.arc(x,coin.y,coin.r+Math.sin(t*6)*1.4,0,Math.PI*2);g.fill();g.shadowBlur=0;
      g.strokeStyle='#9b642c';g.lineWidth=3;g.beginPath();g.arc(x,coin.y,coin.r-4,0,Math.PI*2);g.stroke();}
    const p=s.player;
    snail(p.x,p.y,p.w,p.h,1,p.invuln>0,p.dashTime>0,t);
    if(p.dashTime>0){g.strokeStyle='#a0fff5b0';g.lineWidth=5;g.beginPath();g.moveTo(p.x-10,p.y+20);g.lineTo(p.x-85,p.y+22);g.stroke();}
    rounded(26,112,192,31,8,'#09263cae');g.fillStyle='#ffdf91';g.font='bold 15px system-ui';g.fillText('✦  '+s.coinsTaken+' COINS  ·  x'+s.multiplier,41,133);
  }
  function drawCombat(s,t){
    background(t,s.dist,'combat');
    // A continuously scrolling course, with the boss anchored to the right.
    seabed(s.dist);
    g.fillStyle='#0b2c4180';
    for(let i=0;i<7;i++){
      const x=(i*190-(s.dist*.52%190));
      g.fillRect(x+25,208,25,242);
      g.fillRect(x+5,207,65,12);
    }
    // Platforms provide alternate heights from which to dodge incoming shots.
    for(const q of s.platforms){
      const x=214+q.worldX-s.dist;
      if(x<-210||x>V.W)continue;
      if(!sprite('platform',x,q.y-18,q.w,62)){
        rounded(x,q.y,q.w,q.h,6,'#3b718a');
        g.fillStyle='#91e8db';g.fillRect(x,q.y,q.w,4);
      }
    }
    for(const o of s.obstacles){
      const x=214+o.worldX-s.dist;
      if(o.dead||x<-90||x>s.boss.x-55)continue;
      drawRock(x,G-o.h,o.w,o.h,o.fragile);
    }
    // Dramatic but unobtrusive backlight around the boss.
    const b=s.boss;
    g.save();g.globalAlpha=.20;
    const glow=g.createRadialGradient(b.x+84,265,15,b.x+84,265,205);
    glow.addColorStop(0,b.flash>0?'#fff5a7':'#d84989');glow.addColorStop(1,'#d8498900');
    g.fillStyle=glow;g.fillRect(b.x-120,55,340,410);g.restore();
    g.save();g.translate(b.x+b.w,0);g.scale(-1,1);
    if(!sprite('bossEel',0,b.y,b.w,b.h)){
      rounded(35,b.y+38,b.w-60,b.h-50,38,'#b26476');
      g.font='80px sans-serif';g.fillText('🐉',30,b.y+148);
    }
    g.restore();
    if(b.flash>0){g.save();g.globalAlpha=Math.min(.45,b.flash*1.6);g.fillStyle='#fff2b6';g.fillRect(b.x,b.y,b.w,b.h);g.restore();}
    for(const q of s.projectiles){
      const name=q.type==='toxic'?'toxic':'plasma';
      const size=q.type==='toxic'?47:52;
      g.save();
      if(q.reflected){g.shadowColor='#ffd581';g.shadowBlur=16;}
      if(!sprite(name,q.x-size/2,q.y-size/2,size,size)){
        g.fillStyle=q.type==='toxic'?'#71f1c7':'#ff788b';
        g.beginPath();g.arc(q.x,q.y,q.r,0,Math.PI*2);g.fill();
      }
      if(q.reflected){g.strokeStyle='#ffe4a8';g.lineWidth=3;g.beginPath();g.arc(q.x,q.y,q.r+4,0,Math.PI*2);g.stroke();}
      g.restore();
    }
    const player=s.player;
    snail(player.x,player.y,player.w,player.h,1,player.invuln>0,player.dashTime>0,t);
    if(player.dashTime>0){
      g.strokeStyle='#9dfcf3ad';g.lineWidth=6;g.beginPath();
      g.moveTo(player.x-50,player.y+20);g.lineTo(player.x-7,player.y+20);g.stroke();
    }
    // The HTML HUD already shows the boss health.
  }
  V.render=function(){
    const s=V.state;if(!s)return;
    g.clearRect(0,0,W,H);
    if(s.mode==='map')drawMap(s.time);
    else if(s.mode==='runner'||s.mode==='arcade')drawRunner(s.level,s.time);
    else if(s.mode==='combat')drawCombat(s.level,s.time);
  };
})();
