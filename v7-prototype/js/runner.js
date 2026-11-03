(function(){
  'use strict';
  const V=window.VS7;
  const COURSE=8200;
  V.newRunner=function(){
    const obstacles=[];
    const positions=[790,1450,2050,2720,3310,3960,4600,5220,5890,6500,7160,7820];
    positions.forEach((worldX,i)=>{
      const fragile=i%3===1;
      obstacles.push({worldX,w:fragile?42:54,h:fragile?49:(54+(i%3)*13),fragile,dead:false});
    });
    const coins=[];
    for(let n=0;n<15;n++){
      const worldX=440+n*505;
      for(let j=0;j<3;j++)coins.push({worldX:worldX+j*50,y:320+Math.sin(n*.9+j)*35,r:10,taken:false});
    }
    return {dist:0,elapsed:0,course:COURSE,speed:345,player:{x:215,y:V.GROUND-43,w:44,h:43,vy:0,jumps:0,invuln:0,dashTime:0,dashCooldown:0},obstacles,coins,coinsTaken:0,hp:3,boost:0};
  };
  V.updateRunner=function(s,dt,actions){
    const p=s.player;
    p.invuln=Math.max(0,p.invuln-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);
    if(actions.jump && p.jumps<2){p.vy=p.jumps===0?-725:-660;p.jumps++;}
    if(actions.dash && p.dashCooldown<=0){p.dashTime=.24;p.dashCooldown=1.8;V.notify('PANZER-BOOST!');}
    p.vy+=1790*dt;p.y+=p.vy*dt;
    if(p.y>=V.GROUND-p.h){p.y=V.GROUND-p.h;p.vy=0;p.jumps=0;}
    s.elapsed+=dt;
    s.speed=345+Math.min(95,s.dist/COURSE*95);
    s.dist+=s.speed*dt+(p.dashTime>0?195*dt:0);
    for(const o of s.obstacles){
      if(o.dead)continue;
      const rect={x:p.x+o.worldX-s.dist,y:V.GROUND-o.h,w:o.w,h:o.h};
      if(V.overlap(p,rect)){
        if(p.dashTime>0 && o.fragile){o.dead=true;V.notify('TRÜMMER ZERLEGT!');}
        else if(p.invuln<=0){s.hp--;p.invuln=1.25;p.vy=-290;V.notify('AU! SPRING ODER DASHE!'); if(s.hp<=0){V.finish(false);return;}}
      }
    }
    for(const c of s.coins){
      if(c.taken)continue;
      const x=p.x+c.worldX-s.dist;
      if(V.overlap(p,{x:x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2})){c.taken=true;s.coinsTaken++;}
    }
    if(s.dist>=s.course){V.finish(true);}
  };
})();
