/* Muränenring: a continuous side-scrolling runner with projectile counterattacks. */
(function () {
  'use strict';
  const V = window.VS7;
  const FLOOR = V.GROUND;
  const SCROLL = 355;
  const BOSS_X = 766;
  const RED_INTERVAL = 2.65;

  function obstacleAt(x, index) {
    const fragile = index % 3 === 1;
    return {worldX:x, x:0, y:0, w:fragile?53:45, h:fragile?54:48, fragile, dead:false};
  }
  function spawnObstacle(s) {
    const n = s.obstacleCount++;
    s.obstacleCursor += 515 + (n%3)*74;
    s.obstacles.push(obstacleAt(s.obstacleCursor, n));
  }
  function spawnPlatform(s) {
    const n = s.platformCount++;
    s.platformCursor += 510 + (n%3)*70;
    s.platforms.push({worldX:s.platformCursor,w:160+(n%2)*26,h:21,y:n%3===0?325:362});
  }
  V.newCombat = function () {
    const ch = V.characters[V.profile.character];
    const s = {
      elapsed:0,dist:0,speed:SCROLL,score:0,hp:5+ch.hp,kills:0,
      obstacleCursor:420,platformCursor:300,obstacleCount:0,platformCount:0,
      obstacles:[],platforms:[],projectiles:[],
      player:{x:214,y:FLOOR-43,w:44,h:43,vy:0,jumps:0,gravity:1780*ch.gravity,
        invuln:0,dashTime:0,dashCooldown:0,angle:0,grounded:true},
      boss:{x:BOSS_X,y:142,w:188,h:232,hp:7,maxHp:7,fireTimer:1.5,attackCount:0,phase:1,flash:0}
    };
    for(let i=0;i<3;i++)spawnObstacle(s);
    for(let i=0;i<3;i++)spawnPlatform(s);
    return s;
  };
  function damage(s) {
    const p=s.player;
    if(p.invuln>0)return;
    s.hp--;p.invuln=1.15;p.vy=-250;
    V.notify('AU!');
    if(s.hp<=0)V.finish(false);
  }
  function fire(s) {
    const b=s.boss,p=s.player;
    const n=b.attackCount++;
    const green=n%4===3;
    const y=green?(n%2?350:300):V.clamp(p.y+p.h*.5,190,FLOOR-35);
    s.projectiles.push({x:b.x-28,y,r:green?19:17,vx:-(green?310:390+b.phase*20),vy:0,
      type:green?'toxic':'plasma',reflected:false,dead:false});
    // The phase change affects projectile cadence, not the soundtrack.
    b.fireTimer=(green?1.85:RED_INTERVAL)-Math.min(.55,(b.phase-1)*.25);
  }
  V.updateCombat = function(s,dt,actions){
    const p=s.player,b=s.boss;
    p.invuln=Math.max(0,p.invuln-dt);
    p.dashCooldown=Math.max(0,p.dashCooldown-dt);
    p.dashTime=Math.max(0,p.dashTime-dt);
    b.flash=Math.max(0,b.flash-dt);
    if(actions.jump && p.jumps<2) {p.vy=p.jumps===0?-735:-665;p.jumps++;p.grounded=false;}
    if(actions.dash && p.dashCooldown<=0){p.dashTime=.31;p.dashCooldown=.85;V.notify('DASH!');}
    // Keep the auto-running player in the left half of the scrolling scene.
    const steer=(V.input?.right?1:0)-(V.input?.left?1:0);
    p.x=V.clamp(p.x+steer*205*dt+(steer?0:(214-p.x)*Math.min(1,dt*.6)),120,465);
    const previousBottom=p.y+p.h;
    p.vy+=p.gravity*dt;p.y+=p.vy*dt;
    p.angle=p.dashTime>0?(p.angle+dt*1060)%360:0;
    p.grounded=false;
    s.dist+=SCROLL*dt;s.elapsed+=dt;s.score+=s.speed*.1*dt;
    while(s.obstacleCursor<s.dist+1140)spawnObstacle(s);
    while(s.platformCursor<s.dist+1120)spawnPlatform(s);
    if(s.obstacles.length>45)s.obstacles=s.obstacles.filter(o=>o.worldX>s.dist-240);
    if(s.platforms.length>35)s.platforms=s.platforms.filter(q=>q.worldX+q.w>s.dist-240);
    // Floating platforms move with the course. Land only from above.
    if(p.vy>=0){
      for(const q of s.platforms){
        const x=214+q.worldX-s.dist;
        if(previousBottom<=q.y+8&&p.y+p.h>=q.y&&p.x+p.w>x+9&&p.x<x+q.w-9){
          p.y=q.y-p.h;p.vy=0;p.jumps=0;p.grounded=true;break;
        }
      }
    }
    if(p.y>=FLOOR-p.h){p.y=FLOOR-p.h;p.vy=0;p.jumps=0;p.grounded=true;}
    for(const o of s.obstacles){
      if(o.dead)continue;
      const x=214+o.worldX-s.dist;
      if(x<-110||x>BOSS_X-55)continue;
      if(V.overlap(p,{x,y:FLOOR-o.h,w:o.w,h:o.h})){
        if(o.fragile&&p.dashTime>0){o.dead=true;s.kills++;s.score+=55;}
        else damage(s);
      }
    }
    if(s.hp<=0)return;
    b.phase=b.hp<=2?3:b.hp<=4?2:1;
    b.fireTimer-=dt;
    if(b.fireTimer<=0)fire(s);
    for(const q of s.projectiles){
      if(q.dead)continue;
      q.x+=q.vx*dt;q.y+=q.vy*dt;
      if(q.reflected){
        if(q.x+q.r>=b.x+8){
          q.dead=true;b.hp=Math.max(0,b.hp-1);b.flash=.25;s.score+=240;
          V.notify('TREFFER!');
          if(b.hp<=0){V.finish(true);return;}
        }
      }else if(V.overlap(p,{x:q.x-q.r*.75,y:q.y-q.r*.75,w:q.r*1.5,h:q.r*1.5})){
        if(q.type==='plasma'&&p.dashTime>0){
          q.reflected=true;q.vx=780;q.vy=0;q.y=p.y+p.h*.5;
          p.vy=-260;p.jumps=Math.max(p.jumps,1);
          s.score+=80;V.notify('KONTER!');
        }else {q.dead=true;damage(s);}
      }
    }
    s.projectiles=s.projectiles.filter(q=>!q.dead&&q.x>-60&&q.x<V.W+100);
  };
})();
