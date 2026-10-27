(function(root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.OnlukBasketRules = rules;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const ones = ['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
  const tens = ['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
  function read(n) {
    if (!Number.isInteger(n) || n < 0 || n > 99) throw new RangeError('Sayı 0–99 olmalı.');
    return n < 10 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function shuffle(items, random = Math.random) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i],out[j]] = [out[j],out[i]]; }
    return out;
  }
  function options(n, max, random = Math.random) {
    if (!Number.isInteger(n) || n < 10 || n > max || ![30,60,99].includes(max)) throw new RangeError('Geçersiz sayı aralığı.');
    const t = Math.floor(n / 10), u = n % 10;
    const candidates = shuffle([u*10+t, n-1, n+1, n-10, n+10, t*10+t, u*10+u], random);
    const out = [n];
    for (const v of candidates) if (v >= 10 && v <= max && !out.includes(v) && out.length < 4) out.push(v);
    for (let v = 10; out.length < 4 && v <= max; v++) if (!out.includes(v)) out.push(v);
    return shuffle(out, random);
  }
  function deck(max = 99, mode = 'place', random = Math.random) {
    if (![30,60,99].includes(max) || !['place','blocks','reading','mixed'].includes(mode)) throw new RangeError('Geçersiz ayar.');
    return shuffle(Array.from({length:max-9}, (_,i)=>i+10), random).map((number,i) => ({
      number, tens:Math.floor(number/10), units:number%10,
      mode:mode === 'mixed' ? ['place','blocks','reading'][i%3] : mode
    }));
  }
  function answer(state, value) {
    if (state.done || state.busy || !state.choices.includes(value)) return {...state};
    const correct = value === state.question.number;
    return {...state, busy:true, correct, attempts:state.attempts+1,
      mistakes:state.mistakes+(correct?0:1), score:state.score+(correct?10:0),
      solved:state.solved+(correct?1:0), streak:correct?state.streak+1:0};
  }
  function winners(players) {
    const best = Math.max(...players.map(p=>p.score));
    return players.filter(p=>p.score === best).map(p=>p.name);
  }
  return Object.freeze({read,shuffle,options,deck,answer,winners});
});
