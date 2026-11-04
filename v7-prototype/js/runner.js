(function(){
  'use strict';
  const V=window.VS7;
  const COURSE=8200;
  V.newRunner=function(endless=false){
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
    const ch=V.characters[V.profile.character];
    return {dist:0,elapsed:0,endless,course:endless?Infinity:COURSE,speed:345+ch.speed,bonusSpeed:0,speedFactor:1,
      player:{x:215,y:V.GROUND-43,w:44,h:43,vy:0,jumps:0,gravity:1790*ch.gravity,doubleJumpBoost:1,spinBoost:1,invuln:0,dashTime:0,dashCooldown:0,angle:0},
      obstacles,coins,spawnCursor:{obstacle:obstacles.at(-1).worldX,coin:coins.at(-1).worldX},coinsTaken:0,hp:3+ch.hp,score:0,multiplier:1,goldMultiplier:1,coinValue:1,scoreRate:.10,
      magnetRange:ch.magnet,extraJumps:0,upgrades:V.createUpgradeState(),boost:0};
  };
  V.updateRunner=function(s,dt,actions){
    const p=s.player;
    p.invuln=Math.max(0,p.invuln-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);
    if(actions.jump && p.jumps<2+s.extraJumps){p.vy=p.jumps===0?-725:-660*p.doubleJumpBoost;p.jumps++;}
    if(actions.dash && p.dashCooldown<=0){p.dashTime=.24;p.dashCooldown=1.8;V.notify('PANZER-BOOST!');}
    p.vy+=p.gravity*dt;p.y+=p.vy*dt;
    if(p.jumps>=2)p.angle=(p.angle+dt*900*p.spinBoost)%360;else p.angle=0;
    if(p.y>=V.GROUND-p.h){p.y=V.GROUND-p.h;p.vy=0;p.jumps=0;}
    s.elapsed+=dt;
    // A finite story route and the original endless mode use the same mechanics.
    if(s.endless){
      // Spawn cursors must not depend on list order: perks can append bonus coins,
      // and pruning can remove old objects entirely.
      while(s.spawnCursor.obstacle<s.dist+1800){
        const worldX=s.spawnCursor.obstacle+520+(s.obstacles.length%3)*75;
        s.spawnCursor.obstacle=worldX;
        s.obstacles.push({worldX,w:50,h:55+(s.obstacles.length%4)*11,fragile:s.obstacles.length%3===1,dead:false});
      }
      while(s.spawnCursor.coin<s.dist+1550){
        const worldX=s.spawnCursor.coin+340;
        s.spawnCursor.coin=worldX;
        s.coins.push({worldX,y:305+Math.sin(worldX*.004)*45,r:10,taken:false});
      }
      if(s.obstacles.length>60)s.obstacles=s.obstacles.filter(o=>o.worldX>s.dist-700);
      if(s.coins.length>100)s.coins=s.coins.filter(c=>c.worldX>s.dist-500);
    }
    s.speed=Math.max(130,(345+V.characters[V.profile.character].speed+Math.min(s.endless?350:95,s.endless?s.elapsed*7:s.dist/COURSE*95)+s.bonusSpeed)*s.speedFactor);
    s.score+=s.speed*s.scoreRate*dt;
    s.dist+=s.speed*dt+(p.dashTime>0?195*dt:0);
    for(const o of s.obstacles){
      if(o.dead)continue;
      const rect={x:p.x+o.worldX-s.dist,y:V.GROUND-o.h,w:o.w,h:o.h};
      const screenX=215+o.worldX-s.dist;
      if(!o.cleared && screenX+o.w<p.x){
        o.cleared=true;s.upgrades.cleared++;
      }
      if(V.overlap(p,rect)){
        if(p.dashTime>0 && o.fragile){o.dead=true;V.notify('TRÜMMER ZERLEGT!');}
        else if(p.invuln<=0){s.hp--;p.invuln=1.25;p.vy=-290;V.notify('AU! SPRING ODER DASHE!'); if(s.hp<=0){V.finish(false);return;}}
      }
    }
    for(const c of s.coins){
      if(c.taken)continue;
      const x=p.x+c.worldX-s.dist;
      const range=c.r*s.magnetRange;
      if(V.overlap(p,{x:x-range,y:c.y-range,w:range*2,h:range*2})){
        c.taken=true;s.coinsTaken++;
        s.score+=10*s.multiplier*s.goldMultiplier*s.coinValue;
        s.multiplier++;
      }else if(x+c.r<p.x && !c.missed){c.missed=true;s.multiplier=1;}

    }
    if(!s.endless&&s.dist>=s.course){V.finish(true);return;}
    if(s.upgrades.cleared>=s.upgrades.nextCost){
      s.upgrades.cleared=0;s.upgrades.nextCost++;
      V.offerUpgrades(s);return;
    }
  };
})();
