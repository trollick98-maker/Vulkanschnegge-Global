(function(){
  'use strict';
  const V=window.VS7;
  const GRAVITY=1820,MAX_RUN=365,ARENA_WIDTH=1740;
  V.newCombat=function(){
    return {worldWidth:ARENA_WIDTH,elapsed:0,camera:0,hp:5,player:{x:76,y:V.GROUND-44,w:45,h:44,vx:0,vy:0,jumps:0,facing:1,invuln:0,dashTime:0,dashCooldown:0,airDash:true,dashDirection:1,dashPower:1,hitIds:new Set()},enemies:[
      {id:1,x:425,origin:425,y:V.GROUND-35,w:35,h:35,alive:true,phase:0},
      {id:2,x:675,origin:675,y:V.GROUND-39,w:39,h:39,alive:true,phase:1.4},
      {id:3,x:923,origin:923,y:V.GROUND-39,w:39,h:39,alive:true,phase:2.5}
    ],boss:{x:1450,y:V.GROUND-116,w:112,h:116,hp:8,maxHp:8,phase:'idle',timer:0,hitWindow:false,slamDamageDone:false},kills:0};
  };
  function hurt(s,direction){
    const p=s.player;
    if(p.invuln>0)return;
    s.hp--;p.invuln=1.25;p.dashTime=0;p.vx=direction*320;p.vy=-280;
    V.notify('TREFFER! BLEIB IN BEWEGUNG');
    if(s.hp<=0)V.finish(false);
  }
  function rebound(s,direction){
    const p=s.player;
    p.dashTime=0;p.dashCooldown=.1;p.airDash=true;
    p.vx=-direction*315;p.vy=-485;p.jumps=1;p.invuln=Math.max(p.invuln,.2);
    V.notify('REBOUND!');
  }
  function updateBoss(s,dt){
    const b=s.boss,p=s.player;
    if(b.phase==='idle'){
      if(p.x>b.x-545){b.phase='windup';b.timer=1.3;V.notify('MURÄNE: WEICH DER STOSSWELLE AUS!');}
      return;
    }
    b.timer-=dt;
    if(b.phase==='windup'&&b.timer<=0){b.phase='slam';b.timer=.35;b.slamDamageDone=false;}
    else if(b.phase==='slam'){
      if(!b.slamDamageDone){
        const inZone=p.x+p.w>b.x-415&&p.x<b.x+100;
        const grounded=p.y+p.h>V.GROUND-65;
        if(inZone&&grounded){hurt(s,-1);b.slamDamageDone=true;}
      }
      if(b.timer<=0){b.phase='open';b.timer=1.65;b.hitWindow=false;V.notify('JETZT! PANZER-DASH AUF DEN BOSS!');}
    }
    else if(b.phase==='open'&&b.timer<=0){b.phase='recover';b.timer=.35;}
    else if(b.phase==='recover'&&b.timer<=0){b.phase='windup';b.timer=1.15;}
  }
  function startDash(p){
    const momentum=Math.abs(p.vx);
    p.dashPower=momentum>=195?2:1;
    p.dashDirection=p.vx<-45?-1:p.vx>45?1:p.facing;
    p.facing=p.dashDirection;p.vx=p.dashDirection*(510+Math.min(momentum,350)*.75);
    p.vy*=.34;p.dashTime=.20;p.dashCooldown=.4;p.airDash=false;p.hitIds.clear();
  }
  V.updateCombat=function(s,dt,actions){
    const p=s.player,I=V.input;
    s.elapsed+=dt;
    p.invuln=Math.max(0,p.invuln-dt);
    p.dashCooldown=Math.max(0,p.dashCooldown-dt);
    p.dashTime=Math.max(0,p.dashTime-dt);
    const movement=(I.right?1:0)-(I.left?1:0);
    if(movement)p.facing=movement;
    if(p.dashTime<=0){
      if(movement) p.vx=V.clamp(p.vx+movement*1870*dt,-MAX_RUN,MAX_RUN);
      else {const drag=1900*dt;p.vx=Math.abs(p.vx)<=drag?0:p.vx-Math.sign(p.vx)*drag;}
    }
    if(actions.jump&&p.jumps<2){p.vy=p.jumps===0?-725:-660;p.jumps++;}
    if(actions.dash&&p.airDash&&p.dashCooldown<=0)startDash(p);
    const previousBottom=p.y+p.h;
    p.vy+=GRAVITY*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.x=V.clamp(p.x,0,s.worldWidth-p.w);
    // Solid platforms; land only while falling from above.
    const platforms=[{x:277,y:350,w:164,h:15},{x:868,y:335,w:178,h:15}];
    let landed=false;
    if(p.vy>=0){for(const platform of platforms){
      if(previousBottom<=platform.y+7 && p.y+p.h>=platform.y&&p.x+p.w>platform.x+5&&p.x<platform.x+platform.w-5){
        p.y=platform.y-p.h;p.vy=0;p.jumps=0;p.airDash=true;landed=true;break;
      }
    }}
    if(p.y>=V.GROUND-p.h){p.y=V.GROUND-p.h;p.vy=0;p.jumps=0;p.airDash=true;landed=true;}
    // A grounded player can dash again after the small safety cooldown.
    if(landed&&p.dashTime<=0)p.airDash=true;
    for(const e of s.enemies){
      if(!e.alive)continue;
      e.phase+=dt;e.x=e.origin+Math.sin(e.phase*1.7)*25;
      if(!V.overlap(p,e))continue;
      if(p.dashTime>0 && !p.hitIds.has(e.id)){
        e.alive=false;s.kills++;p.hitIds.add(e.id);rebound(s,p.dashDirection);
        V.notify('GEGNER WEGGEFEGT!  '+s.kills+'/3');
        break;
      }else if(p.dashTime<=0)hurt(s,p.x<e.x?-1:1);
    }
    if(s.hp<=0)return;
    const b=s.boss;
    updateBoss(s,dt);
    if(s.hp<=0)return;
    if(V.overlap(p,b)){
      if(p.dashTime>0&&!p.hitIds.has('boss')){
        p.hitIds.add('boss');
        if(b.phase==='open'&&!b.hitWindow){
          b.hp-=p.dashPower;b.hitWindow=true;
          rebound(s,p.dashDirection);
          V.notify('VOLLtreffer!  -'+p.dashPower+' HP');
          if(b.hp<=0){b.hp=0;V.finish(true);return;}
        }else{
          rebound(s,p.dashDirection);V.notify('GEBLOCKT! WARTE AUF DIE LÜCKE!');
        }
      }else if(p.dashTime<=0)hurt(s,p.x<b.x?-1:1);
    }
    s.camera=V.lerp(s.camera,V.clamp(p.x-290,0,s.worldWidth-V.W),Math.min(1,dt*6));
  };
})();
