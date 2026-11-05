import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoginHistory, sessionFromToken, captureSuccessfulLogin, describeLoginDevice} from '../src/login-history-store.js';
const session = {at:Date.parse('2026-11-06T05:00:00Z'),provider:'google.com'};
function fixture() {
  const data = new Map();
  const storage = {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  return {data,storage,history:createLoginHistory(()=>storage)};
}
test('reads authentication time rather than token refresh time and excludes raw credentials',()=>{
  assert.deepEqual(sessionFromToken({authTime:'2026-11-06T05:00:00Z',issuedAtTime:'2026-11-06T06:00:00Z',signInProvider:'google.com',token:'never-save'}),session);
  assert.equal(sessionFromToken({authTime:'bad',signInProvider:'google.com'}),null);
  assert.equal(sessionFromToken({authTime:'2026-11-06T05:00:00Z',signInProvider:'anonymous'}),null);
});
test('history is UID isolated, bounded, sorted, deduplicated and survives reload',()=>{
  const {history,storage,data}=fixture();
  for(let i=0;i<60;i++) history.forUser('alice').record({...session,at:session.at+i,device:'macOS',token:'never-save'});
  history.forUser('alice').record({...session,at:session.at+59,device:'macOS'});
  assert.equal(history.forUser('alice').getSnapshot().length,50);
  assert.equal(history.forUser('alice').getSnapshot()[0].at,session.at+59);
  assert.deepEqual(history.forUser('bob').getSnapshot(),[]);
  assert.equal(JSON.stringify([...data.values()]).includes('never-save'),false);
  assert.equal(createLoginHistory(()=>storage).forUser('alice').getSnapshot().length,50);
});
test('cross-tab records merge; corrupt storage and denied storage do not break the session',()=>{
  const {history,storage,data}=fixture(), second=createLoginHistory(()=>storage);
  history.forUser('alice').record({...session,device:'macOS'});
  second.forUser('alice').record({...session,at:session.at+1,device:'Windows'});
  history.refresh('puyadao.login-history.alice');
  assert.equal(history.forUser('alice').getSnapshot().length,2);
  data.set('puyadao.login-history.bob','{"wrong":true}');
  assert.deepEqual(history.forUser('bob').getSnapshot(),[]);
  const denied=createLoginHistory(()=>{throw Error('denied');});
  denied.forUser('alice').record({...session,device:''});
  denied.refresh(null);
  assert.equal(denied.forUser('alice').getSnapshot().length,1);
});
test('only successful member credentials record; account switches during token read cannot contaminate another account',async()=>{
  const {history}=fixture(), result={user:{uid:'alice',isAnonymous:false}};
  let current=result.user;
  const options={history,currentUser:()=>current,readSession:async()=>session,agent:'Mozilla Macintosh Safari/605.1'};
  assert.equal(await captureSuccessfulLogin(result,options),result);
  assert.equal(history.forUser('alice').getSnapshot().length,1);
  assert.match(history.forUser('alice').getSnapshot()[0].device,/macOS/);
  await captureSuccessfulLogin({user:{uid:'guest',isAnonymous:true}},options);
  await captureSuccessfulLogin({user:{uid:'bob'}},options);
  await captureSuccessfulLogin(result,{...options,readSession:async()=>{current={uid:'bob'};return {...session,at:session.at+1};}});
  assert.equal(history.forUser('alice').getSnapshot().length,1);
  assert.deepEqual(history.forUser('bob').getSnapshot(),[]);
});
test('token read failures cannot turn a successful authentication into a failed login',async()=>{
  const result={user:{uid:'alice'}};
  assert.equal(await captureSuccessfulLogin(result,{currentUser:()=>result.user,readSession:async()=>{throw Error('offline');}}),result);
});
test('device detection handles browsers with overlapping agent tokens without inventing location',()=>{
  assert.equal(describeLoginDevice('Windows Chrome/120 Safari/537 Edg/120'),'Windows · Edge');
  assert.equal(describeLoginDevice('iPhone CriOS/120 Safari/604'),'iOS / iPadOS · Chrome');
  assert.equal(describeLoginDevice('unknown'),'');
});
