import test from 'node:test';
import assert from 'node:assert/strict';

test('display preferences persist, follow system changes, normalize stale storage and tolerate denied storage', async () => {
  const original = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage };
  let stored = JSON.stringify({theme:'dark',textSize:'large',reducedMotion:true}), denied = false;
  const events = {}, media = {matches:false,addEventListener:(_,fn)=>{events.media=fn;}};
  globalThis.window = {matchMedia:()=>media,addEventListener:(name,fn)=>{events[name]=fn;}};
  globalThis.document = {documentElement:{dataset:{}}};
  globalThis.localStorage = {getItem:()=>stored,setItem:(_,value)=>{if(denied) throw Error('denied');stored=value;}};
  try {
    const {setDisplayPreference,normalizePreferences} = await import('../src/display-preferences.js');
    const data=document.documentElement.dataset;
    assert.deepEqual(data,{theme:'dark',textSize:'large',reducedMotion:'true'});
    setDisplayPreference({theme:'system'});assert.equal(data.theme,'light');
    media.matches=true;events.media();assert.equal(data.theme,'dark');
    assert.equal(JSON.parse(stored).theme,'system');
    setDisplayPreference({theme:'light'});events.media();assert.equal(data.theme,'light');
    denied=true;assert.doesNotThrow(()=>setDisplayPreference({textSize:'standard'}));assert.equal(data.textSize,'standard');
    events.storage({key:'puyadao.display-preferences.v1',newValue:JSON.stringify({theme:'dark'})});assert.equal(data.theme,'dark');assert.equal(data.reducedMotion,'false');
    events.storage({key:null,newValue:null});assert.equal(data.theme,'light');
    assert.deepEqual(normalizePreferences({theme:'invalid',textSize:'giant',reducedMotion:'true'}),{theme:'light',textSize:'standard',reducedMotion:false});
  } finally { for (const [key,value] of Object.entries(original)) {if(value === undefined) delete globalThis[key]; else globalThis[key]=value;} }
});
