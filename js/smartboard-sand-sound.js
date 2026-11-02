(function(root) {
  'use strict';
  function parameters(speed, tool) {
    speed=Number(speed);speed=Number.isFinite(speed)?Math.max(0,Math.min(2400,speed)):0;
    return {gain:speed<12?0:Math.min(.28,.025+Math.sqrt(speed/1000)*.17)*(tool==='smooth'?.6:tool==='rake'?1.15:1),
      rate:.75+Math.min(.8,speed/1500),cutoff:1100+Math.min(3400,speed*2)};
  }
  function create() {
    var context=null,buffer=null,loading=null,source=null,gain=null,filter=null,enabled=false,active=false,last=null,velocity=0,release=null;
    function disconnect() {
      clearTimeout(release);release=null;
      if(source){try{source.stop();}catch(error){}source.disconnect();source=null;}
      if(gain){gain.disconnect();gain=null;}if(filter){filter.disconnect();filter=null;}
    }
    function prepare() {
      if(!enabled)return;
      try {
        var Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;
        context=context||new Audio();context.resume().catch(function(){});
        if(!buffer&&!loading)loading=root.fetch('/assets/audio/sand-friction.wav').then(function(r){if(!r.ok)throw new Error('audio');return r.arrayBuffer();})
          .then(function(bytes){return context?context.decodeAudioData(bytes):null;}).then(function(value){buffer=value;loading=null;})
          .catch(function(){loading=null;});
      }catch(error){disconnect();}
    }
    function begin(point,time) {
      active=true;last={x:point.x,y:point.y,time:time};velocity=0;disconnect();prepare();
    }
    function move(point,time,tool) {
      if(!active||!last)return;
      var distance=Math.hypot(point.x-last.x,point.y-last.y),delta=Math.max(4,Math.min(120,time-last.time||16));
      last={x:point.x,y:point.y,time:time};
      if(!enabled||!context||!buffer||context.state!=='running')return;
      velocity=velocity*.35+distance/delta*1000*.65;
      var p=parameters(distance<.2?0:velocity,tool);
      if(!source&&p.gain>0) {
        source=context.createBufferSource();gain=context.createGain();filter=context.createBiquadFilter();
        source.buffer=buffer;source.loop=true;gain.gain.value=0;filter.type='lowpass';
        source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();
      }
      if(!source)return;
      var now=context.currentTime;
      gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(p.gain,now,.012);
      // No timer loop: the audio clock silences a held, motionless finger.
      gain.gain.setTargetAtTime(0,now+.055,.018);
      source.playbackRate.setTargetAtTime(p.rate,now,.035);filter.frequency.setTargetAtTime(p.cutoff,now,.035);
    }
    function end() {
      active=false;last=null;velocity=0;
      if(gain&&context){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setTargetAtTime(0,context.currentTime,.012);clearTimeout(release);release=setTimeout(disconnect,100);}
      else disconnect();
    }
    function dispose(){active=false;last=null;disconnect();var old=context;context=null;buffer=null;loading=null;if(old)old.close().catch(function(){});}
    document.addEventListener('visibilitychange',function(){if(document.hidden)end();});
    root.addEventListener('pagehide',dispose);
    return {begin:begin,move:move,end:end,setEnabled:function(value){enabled=!!value;if(enabled)prepare();else end();}};
  }
  root.SmartSandSound={create:create,parameters:parameters};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.SmartSandSound;
})(typeof window!=='undefined'?window:globalThis);
