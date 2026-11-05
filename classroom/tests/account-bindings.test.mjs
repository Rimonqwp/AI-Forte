import test from 'node:test';
import assert from 'node:assert/strict';
import { createBindingService, normalizePhone, normalizeEmail, bindingError, maskPhone } from '../src/account-bindings-service.js';
function fixture() {
  let user = {uid:'alice',email:'old@example.com',isAnonymous:false,getIdToken:async force => calls.push(['token',force])};
  const calls=[];
  const sdk = {
    linkWithPhoneNumber: async (user,phone,verifier) => { calls.push(['sms',user.uid,phone,verifier]); return {confirm:async code => { calls.push(['confirm',code]); user.phoneNumber=phone; }}; },
    sendEmailVerification:async (user,options) => calls.push(['verify',user.uid,options]),
    verifyBeforeUpdateEmail:async (user,email,options) => calls.push(['change',user.uid,email,options]),
    reload: async () => calls.push(['reload']),
    reauthenticateWithPopup: async user => calls.push(['reauth',user.uid]),
    GoogleAuthProvider:class {},
  };
  const service = createBindingService({currentUser:()=>user,sdk,changed:()=>calls.push(['changed']),syncProfile:async () => calls.push(['sync'])});
  return {service,sdk,calls,getUser:()=>user,setUser:value=>{user=value;}};
}
test('normalizes international phone/email without guessing a country; masks phone', () => {
  assert.equal(normalizePhone(' +852 (9123)-4567 '), '+85291234567');
  assert.equal(normalizeEmail(' Test@example.com '), 'Test@example.com');
  assert.throws(()=>normalizePhone('91234567')); assert.throws(()=>normalizeEmail('not-an-email'));
  assert.doesNotMatch(maskPhone('+85291234567'), /9123/);
});
test('invalid inputs and wrong UIDs never call provider', async () => {
  const {service,calls}=fixture();
  await assert.rejects(service.sendPhone('alice','123',{}));
  await assert.rejects(service.sendPhone('bob','+85291234567',{}));
  await assert.rejects(service.sendEmail('bob','new@example.com','https://example.com'));
  await assert.rejects(service.sendEmail('alice','invalid','https://example.com'));
  assert.deepEqual(calls,[]);
});
test('phone remains unbound until confirmation; confirms same UID, refreshes token and profile',async()=>{
  const {service,calls,getUser}=fixture();
  const pending=await service.sendPhone('alice','+852 9123 4567','verifier');
  assert.equal(getUser().phoneNumber,undefined);
  await assert.rejects(pending.confirm('123'));
  await pending.confirm('123456');
  assert.equal(getUser().uid,'alice'); assert.equal(getUser().phoneNumber,'+85291234567');
  assert.deepEqual(calls,[['sms','alice','+85291234567','verifier'],['confirm','123456'],['reload'],['token',true],['changed'],['sync']]);
});
test('switching user invalidates pending SMS and prevents confirmation',async()=>{
  const {service,calls,setUser}=fixture();
  const pending=await service.sendPhone('alice','+85291234567',{});
  setUser({uid:'bob'});
  await assert.rejects(pending.confirm('123456'),error=>error.code==='binding/session-changed');
  assert.equal(calls.filter(call=>call[0]==='confirm').length,0);
});
test('provider rejected code never marks bound or refreshes profile',async()=>{
  const {service,sdk,calls}=fixture();
  sdk.linkWithPhoneNumber=async()=>({confirm:async()=>{throw {code:'auth/invalid-verification-code'};}});
  const pending=await service.sendPhone('alice','+85291234567',{});
  await assert.rejects(pending.confirm('111111')); assert.deepEqual(calls,[]);
});
test('an existing phone cannot be replaced silently',async()=>{
  const {service,getUser,calls}=fixture();getUser().phoneNumber='+85291112222';
  await assert.rejects(service.sendPhone('alice','+85291234567',{}),error=>error.code==='auth/provider-already-linked');
  assert.deepEqual(calls,[]);
});
test('new email uses verify-before-update; sends only to selected recipient and retains current email',async()=>{
  const {service,getUser,calls}=fixture();
  await service.sendEmail('alice',' new@example.com ','https://example.com/?accountSettings=profile#scores');
  assert.equal(getUser().email,'old@example.com');
  assert.deepEqual(calls,[['change','alice','new@example.com',{url:'https://example.com/?accountSettings=profile#scores',handleCodeInApp:false}]]);
});
test('existing email verification uses the current user method',async()=>{
  const {service,calls}=fixture(); await service.sendEmail('alice','old@example.com','https://example.com');
  assert.equal(calls[0][0],'verify'); assert.equal(calls[0][1],'alice');
});
test('reauthentication retains UID; refresh rejects a switched account before notifying',async()=>{
  const {service,sdk,setUser,calls}=fixture();
  await service.reauthenticate('alice'); assert.equal(calls[0][0],'reauth');
  calls.length=0; sdk.reload=async()=>setUser({uid:'bob'});
  await assert.rejects(service.refresh('alice')); assert.deepEqual(calls,[]);
});
test('errors are actionable without leaking SDK/internal details',()=>{
  assert.match(bindingError({code:'auth/requires-recent-login'}),/Google/);
  assert.match(bindingError({code:'auth/operation-not-allowed'}),/未开通/);
  assert.match(bindingError({code:'auth/code-expired'}),/过期/);
  assert.doesNotMatch(bindingError({message:'secret'}),/secret/);
});

test('a refresh failure after linking exposes current identity and can be retried',async()=>{
  const {service,sdk,calls,getUser}=fixture();
  const pending=await service.sendPhone('alice','+85291234567',{});
  sdk.reload=async()=>{throw Error('offline');};
  await assert.rejects(pending.confirm('123456'), error=>error.code==='binding/refresh-failed');
  assert.equal(getUser().phoneNumber,'+85291234567'); assert.ok(calls.some(call=>call[0]==='changed'));
  sdk.reload=async()=>{}; await service.refresh('alice');
  assert.ok(calls.some(call=>call[0]==='sync'));
});
