import test from 'node:test';
import assert from 'node:assert/strict';
import { createBindingService, validatePasswordDraft, passwordError } from '../src/account-bindings-service.js';
import { authenticatePassword } from '../src/account-auth-flow.js';
const secret = 'Example test pass 2026!';
function fixture(hasPassword=false) {
  const calls=[];
  let user={uid:'alice',email:'alice@example.com',emailVerified:true,isAnonymous:false,providerData:[{providerId:'google.com'},...(hasPassword?[{providerId:'password'}]:[])],getIdToken:async()=>calls.push('token')};
  const sdk={
    GoogleAuthProvider:class {},EmailAuthProvider:{credential:(email,password)=>({email,password})},
    reauthenticateWithPopup:async()=>calls.push('google-reauth'),
    reauthenticateWithCredential:async(user,credential)=>{calls.push('password-reauth');assert.equal(credential.password,'current-test');},
    validatePassword:async()=>{calls.push('policy');return {isValid:true};},
    linkWithCredential:async(user,credential)=>{calls.push('link');assert.equal(credential.email,user.email);assert.equal(credential.password,secret);user.providerData.push({providerId:'password'});},
    updatePassword:async()=>calls.push('update'),reload:async()=>calls.push('reload'),sendPasswordResetEmail:async email=>calls.push(['reset',email]),
  };
  const service=createBindingService({currentUser:()=>user,sdk,changed:()=>calls.push('changed'),syncProfile:async()=>calls.push('sync')});
  return {sdk,service,calls,getUser:()=>user,setUser:value=>{user=value;}};
}
test('password confirmation and length validate without trimming a valid secret',()=>{
  assert.throws(()=>validatePasswordDraft('short','short'));
  assert.throws(()=>validatePasswordDraft(secret,'other'));
  assert.throws(()=>validatePasswordDraft(secret,secret,''));
  assert.throws(()=>validatePasswordDraft(' '.repeat(8),' '.repeat(8)));
  assert.doesNotThrow(()=>validatePasswordDraft('  valid password  ','  valid password  '));
});
test('Google member gains password on same UID only after Google reauth and policy check',async()=>{
  const {service,calls,getUser}=fixture(); await service.savePassword('alice',{password:secret,confirmation:secret});
  assert.equal(getUser().uid,'alice');assert.equal(getUser().providerData.length,2);
  assert.deepEqual(calls,['google-reauth','policy','link','reload','token','changed','sync']);
});
test('existing password is verified before update and never re-linked',async()=>{
  const {service,calls}=fixture(true);await service.savePassword('alice',{password:secret,confirmation:secret,currentPassword:'current-test'});
  assert.deepEqual(calls,['password-reauth','policy','update','reload','token','changed','sync']);
});
test('mismatch, missing current password and unverified email never call SDK',async()=>{
  const {service,calls,getUser}=fixture(true);
  await assert.rejects(service.savePassword('alice',{password:secret,confirmation:'other',currentPassword:'current-test'}));
  await assert.rejects(service.savePassword('alice',{password:secret,confirmation:secret}));
  getUser().emailVerified=false;
  await assert.rejects(service.savePassword('alice',{password:secret,confirmation:secret,currentPassword:'current-test'}));
  assert.deepEqual(calls,[]);
});
test('policy failure and wrong old password cannot change credentials',async()=>{
  const {service,calls,sdk}=fixture(true);sdk.validatePassword=async()=>({isValid:false});
  await assert.rejects(service.savePassword('alice',{password:secret,confirmation:secret,currentPassword:'current-test'}),error=>error.code==='password/policy');
  assert.deepEqual(calls,['password-reauth']);calls.length=0;
  sdk.reauthenticateWithCredential=async()=>{throw {code:'auth/wrong-password'};};
  await assert.rejects(service.savePassword('alice',{password:secret,confirmation:secret,currentPassword:'current-test'}));
  assert.deepEqual(calls,[]);
});
test('account change during owner verification prevents password writes',async()=>{
  const {service,sdk,calls,setUser}=fixture();sdk.reauthenticateWithPopup=async()=>setUser({uid:'bob'});
  await assert.rejects(service.savePassword('alice',{password:secret,confirmation:secret}),error=>error.code==='binding/session-changed');assert.deepEqual(calls,[]);
});
test('reset sends only to current verified member email and rejects another UID',async()=>{
  const {service,calls}=fixture(true);await assert.rejects(service.resetPassword('bob','https://example.com'));
  await service.resetPassword('alice','https://example.com');assert.deepEqual(calls,[['reset','alice@example.com']]);
  assert.doesNotMatch(passwordError({message:secret}),new RegExp(secret));
});
test('password login exports guest data before identity switch and merges into member UID',async()=>{
  const calls=[];const records=[{key:'favorites',value:['star']}];
  const result=await authenticatePassword({user:{uid:'guest',isAnonymous:true},email:'alice@example.com',password:secret,prepareGuest:async()=>{calls.push('backup');return records;},signIn:async()=>{calls.push('signin');return {user:{uid:'alice'}};},rememberMerge:(uid,value)=>{calls.push('remember');assert.equal(uid,'alice');assert.equal(value,records);},resumeData:async()=>calls.push('merge')});
  assert.deepEqual(calls,['backup','signin','remember','merge']);assert.equal(result.changedUid,true);
});
test('failed guest backup prevents sign-in and failed credentials never merge',async()=>{
  const calls=[];const options={user:{uid:'guest',isAnonymous:true},prepareGuest:async()=>{throw Error('offline');},signIn:async()=>calls.push('signin'),rememberMerge:()=>calls.push('remember'),resumeData:async()=>calls.push('resume')};
  await assert.rejects(authenticatePassword(options));assert.deepEqual(calls,[]);
  options.prepareGuest=async()=>[];options.signIn=async()=>{throw {code:'auth/invalid-credential'};};await assert.rejects(authenticatePassword(options));assert.deepEqual(calls,[]);
});
test('member password sign-in never exports another member’s records',async()=>{
  const calls=[];const result=await authenticatePassword({user:{uid:'alice'},prepareGuest:async()=>calls.push('backup'),signIn:async()=>({user:{uid:'alice'}}),rememberMerge:()=>calls.push('remember'),resumeData:async()=>calls.push('resume')});
  assert.equal(result.changedUid,false);assert.deepEqual(calls,['resume']);
});
