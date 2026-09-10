const test=require('node:test');
const assert=require('node:assert/strict');
const {create,retrySource}=require('../sinav_sitesi/js/question-image-loader.js');

function harness(){
  let clock=0,id=0;
  const timers=new Map(),images=[],states=[],ready=[];
  const loader=create({
    now:()=>clock,
    timeoutMs:100,
    retryDelays:[10,20],
    setTimeout(fn,delay){const key=++id;timers.set(key,{fn,at:clock+delay});return key;},
    clearTimeout:key=>timers.delete(key),
    makeImage(){
      const image={naturalWidth:0,removeAttribute(name){delete this[name];}};
      images.push(image);return image;
    },
    onState:state=>states.push(state),
    onReady:(image,src)=>ready.push({image,src})
  });
  function tick(ms){
    const end=clock+ms;
    while(true){
      const entry=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!entry) break;
      timers.delete(entry[0]);clock=entry[1].at;entry[1].fn();
    }
    clock=end;
  }
  return {loader,images,states,ready,timers,tick,
    succeed(image=images.at(-1)){image.naturalWidth=640;image.onload?.();},
    fail(image=images.at(-1)){image.onerror?.();}
  };
}

test('temporary image failure retries and displays the recovered image',()=>{
  const h=harness();h.loader.show('https://example.com/q.png');h.fail();
  assert.equal(h.ready.length,0);h.tick(10);
  assert.equal(h.images.length,2);assert.equal(h.loader.getState().attempt,2);
  h.succeed();assert.equal(h.loader.getState().status,'ready');
  assert.equal(h.ready[0].image,h.images[1]);assert.equal(h.timers.size,0);
});

test('hanging requests stop after three attempts and allow manual recovery',()=>{
  const h=harness();h.loader.show('https://example.com/q.png');h.tick(330);
  assert.equal(h.images.length,3);assert.equal(h.loader.getState().status,'error');
  assert.equal(h.timers.size,0);
  h.loader.retry();assert.equal(h.loader.getState().status,'loading');h.succeed();
  assert.equal(h.ready.length,1);assert.equal(h.loader.getState().status,'ready');
});

test('late success or retry from a previous question cannot replace the current question',()=>{
  const h=harness();h.loader.show('old.png');
  const old=h.images[0],lateLoad=old.onload;
  h.loader.show('new.png');old.naturalWidth=640;lateLoad();h.succeed();h.tick(500);
  assert.deepEqual(h.ready.map(item=>item.src),['new.png']);
  h.loader.show('failed.png');h.fail();h.loader.show('third.png');h.succeed();h.tick(500);
  assert.equal(h.ready.at(-1).src,'third.png');assert.equal(h.images.length,4);
});

test('preloading waits for the displayed question and loads at most one image at a time',()=>{
  const h=harness();h.loader.show('current.png');h.loader.preload(['next.png','after.png','extra.png']);
  assert.equal(h.images.length,1);h.succeed();assert.equal(h.images.length,2);
  assert.equal(h.images.at(-1).src,'next.png');h.succeed();
  assert.equal(h.images.at(-1).src,'after.png');h.succeed();assert.equal(h.images.length,3);
  h.loader.show('next.png');assert.equal(h.images.length,3);
  assert.equal(h.ready.at(-1).image,h.images[1]);
});

test('failed preloads are not cached and foreground requests take priority',()=>{
  const h=harness();h.loader.show('a.png');h.succeed();h.loader.preload(['b.png','c.png']);
  h.fail();const background=h.images.at(-1),late=background.onload;
  h.loader.show('b.png');assert.equal(background.src,undefined);
  background.naturalWidth=640;late();h.succeed();
  assert.equal(h.ready.at(-1).src,'b.png');assert.equal(h.images.length,4);
});

test('cache remains bounded and only contains successfully loaded images',()=>{
  const h=harness();for(let i=0;i<8;i++){h.loader.show(`q${i}.png`);h.succeed();}
  h.loader.show('q7.png');assert.equal(h.images.length,8);
  h.loader.show('q0.png');assert.equal(h.images.length,9);
  h.loader.destroy();h.tick(500);assert.equal(h.loader.getState().status,'idle');
  assert.equal(h.timers.size,0);
});

test('retry refreshes only public Supabase URLs and preserves signed/external/data sources',()=>{
  const base='https://project.supabase.co/storage/v1/object/public/sinav-sorulari/q.png';
  assert.equal(retrySource(base,0,12),base);
  assert.equal(retrySource(base,1,12),base+'?exam_retry=12');
  for(const src of ['data:image/png;base64,abc','https://example.com/q.png?signature=abc','https://project.supabase.co/storage/v1/object/sign/bucket/q.png?token=abc']){
    assert.equal(retrySource(src,1,12),src);
  }
});

test('missing or undecodable images show an error instead of claiming success',()=>{
  const h=harness();h.loader.show('');assert.equal(h.images.length,0);assert.equal(h.loader.getState().status,'error');
  h.loader.show('invalid.png');h.images[0].onload();h.tick(10);h.fail();h.tick(20);h.fail();
  assert.equal(h.ready.length,0);assert.equal(h.loader.getState().status,'error');
});
