const $=id=>document.getElementById(id), editor=window.BusEditor;
const config=window.BUS_FIREBASE_CONFIG||{};
const trips=window.BUS_TRIPS||[{id:'trip-2026',name:'2026 수학여행'}];
const classes=window.BUS_CLASSES||['1','2','3','4','5','6'];
const status=text=>{$('cloudStatus').textContent=text;};
for(const t of trips){const o=new Option(t.name,t.id);$('tripSelect').add(o);}
for(const c of classes)$('classSelect').add(new Option(`${c}반`,c));
const params=new URLSearchParams(location.search);
if(classes.includes(params.get('class')))$('classSelect').value=params.get('class');
if(trips.some(t=>t.id===params.get('trip')))$('tripSelect').value=params.get('trip');
let canEdit=false, ready=false, busy=false, dirty=false, baseRevision=0, latest=null, generation=0;
let unsubscribe,historyCursor=null,db,auth,F,A,trip=$('tripSelect').value,klass=$('classSelect').value;
const draftKey=()=>`bus-draft:${config.projectId}:${trip}:${klass}`;
const busRef=()=>F.doc(db,'trips',trip,'classes',klass);
const logCollection=()=>F.collection(busRef(),'history');
function permissions(){
 editor.lock(!canEdit||!ready||busy);
 $('publishClass').disabled=!canEdit||!ready||busy;
 $('loadLatest').disabled=!ready||busy;
 $('showHistory').disabled=!canEdit||!ready||busy;
 $('tripSelect').disabled=busy||!auth?.currentUser;$('classSelect').disabled=busy||!auth?.currentUser;$('logoutButton').disabled=busy;
 $('teacherTools').hidden=!canEdit;
 $('teacherWorkspace').hidden=!canEdit;
 $('retryAccess').hidden=!auth?.currentUser||auth.currentUser.isAnonymous;
}
window.BusCloud={applyPermissions:permissions};
function localDraft(){try{localStorage.setItem(draftKey(),JSON.stringify({data:editor.get(),baseRevision,dirty}));}catch{status('기기 임시 저장 실패 · 파일로 백업하거나 반에 저장하세요.');}}
function getDraft(){try{return JSON.parse(localStorage.getItem(draftKey())||'null');}catch{return null;}}
function apply(data,revision){editor.load(data,`bus-cache:${config.projectId}:${trip}:${klass}`);baseRevision=revision;dirty=false;}
function explain(error){console.error(error);if(error.code==='auth/configuration-not-found')return 'Firebase Authentication이 아직 설정되지 않았습니다. 콘솔에서 시작하기를 누르고 익명 및 이메일/비밀번호 로그인을 활성화하세요.';if(error.code==='auth/operation-not-allowed'||error.code==='auth/admin-restricted-operation')return 'Firebase 콘솔의 Authentication에서 익명 및 이메일/비밀번호 로그인을 활성화하세요.';if(error.code==='permission-denied')return '접근 권한이 없습니다. Firestore 규칙과 교사 UID 등록을 확인하세요.';if(error.code==='auth/invalid-credential'||error.code==='auth/wrong-password'||error.code==='auth/user-not-found')return '이메일 또는 비밀번호가 올바르지 않습니다.';if(error.code==='auth/too-many-requests')return '로그인 시도가 많아 잠시 제한됐습니다. 잠시 후 다시 시도하세요.';if(error.code==='auth/network-request-failed')return '인증 서버에 연결할 수 없습니다. 네트워크 연결을 확인하세요.';if(error.code?.startsWith('auth/'))return '로그인하지 못했습니다. 이메일·비밀번호와 Authentication 설정을 확인하세요.';return error.message||'연결하지 못했습니다. 인터넷 연결을 확인하세요.';}
window.addEventListener('bus-edit',()=>{if(!config.projectId||!canEdit||!ready)return;dirty=true;localDraft();status(`${klass}반 · 아직 공유하지 않은 변경이 있습니다. ‘반에 저장’을 누르세요.`);});
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
async function subscribe(){
 const token=++generation;unsubscribe?.();ready=false;dirty=false;latest=null;historyCursor=null;$('historyList').replaceChildren();$('moreHistory').hidden=true;permissions();
 editor.load(BusCore.fresh(),`bus-cache:${config.projectId}:${trip}:${klass}`);status(`${klass}반 좌석표를 불러오는 중…`);
 let first=true;
 const waitTimer=setTimeout(()=>{if(token===generation&&first){status('로그인은 완료됐지만 Firestore 응답이 지연되고 있습니다. 데이터베이스 생성 여부, 보안 규칙, 네트워크 연결을 확인한 뒤 다시 확인을 누르세요.');}},12000);
 unsubscribe=F.onSnapshot(busRef(),snapshot=>{
  if(token!==generation)return;clearTimeout(waitTimer);
  try{
   const value=snapshot.exists()?snapshot.data():null;
   const data=value?BusCore.validate(value.state):BusCore.fresh();
   latest={data,revision:value?.revision||0};ready=true;
   if(first){first=false;const draft=canEdit?getDraft():null;
    if(draft?.dirty){apply(BusCore.validate(draft.data),draft.baseRevision);dirty=true;status(`${klass}반 · 공유하지 않은 임시 편집을 복원했습니다.${baseRevision!==latest.revision?' 서버에 새 기록이 있어 최신 배치 확인이 필요합니다.':''}`);}
    else{apply(data,latest.revision);status(`${klass}반 · ${value?`저장 기록 #${latest.revision}`:'아직 공유된 배치가 없습니다.'}`);}
   }else if(!dirty&&!busy){apply(data,latest.revision);status(`${klass}반 · 최신 기록 #${latest.revision}`);}
   else if(latest.revision!==baseRevision&&!busy)status('다른 교사가 새 기록을 저장했습니다. 현재 편집을 파일로 백업하고 최신 배치를 불러오세요.');
  }catch(e){ready=false;status(explain(e));}permissions();
 },e=>{clearTimeout(waitTimer);if(token===generation){ready=false;status(explain(e));permissions();}});
}
async function switchClass(){
 if(busy||!canEdit)return;
 trip=$('tripSelect').value;klass=$('classSelect').value;
 const url=new URL(location.href);url.searchParams.set('trip',trip);url.searchParams.set('class',klass);window.history.replaceState(null,'',url);
 await subscribe();
}
async function compactPhoto(state){
 if(!state.photo||state.photo.length<=600000)return state;
 const image=new Image();image.src=state.photo;await image.decode();
 const canvas=document.createElement('canvas');let max=1000;
 for(let attempt=0;attempt<5;attempt++){
  const scale=Math.min(1,max/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);state.photo=canvas.toDataURL('image/jpeg',.7);if(state.photo.length<=600000)return state;max*=.7;
 }throw Error('사진 용량이 큽니다. 더 작은 사진을 선택하세요.');
}
async function publish(){
 if(!canEdit||!ready||busy)return;
 busy=true;permissions();const reference=busRef(),log=F.doc(logCollection()),expected=baseRevision;
 const note=$('revisionNote').value.trim()||'좌석 배치 저장';
 status('반별 좌석표와 기록을 저장하는 중…');
 try{
  const data=await compactPhoto(BusCore.validate(editor.get()));
  await F.runTransaction(db,async tx=>{
   const current=await tx.get(reference);const revision=current.exists()?current.data().revision:0;
   if(revision!==expected)throw Error('다른 교사가 먼저 저장했습니다. 현재 편집을 파일로 백업한 후 최신 배치를 불러오세요.');
   const entry={state:data,revision:revision+1,updatedAt:F.serverTimestamp(),updatedBy:auth.currentUser.uid,note,historyId:log.id};
   tx.set(reference,entry);tx.set(log,entry);
  });
  baseRevision=expected+1;dirty=false;editor.load(data,`bus-cache:${config.projectId}:${trip}:${klass}`);localDraft();$('revisionNote').value='';status(`${klass}반 · 기록 #${baseRevision} 저장 완료. 교사 화면에 반영됩니다.`);
 }catch(e){status(explain(e));}finally{busy=false;permissions();}
}
async function historyPage(reset=false){
 if(!canEdit||busy)return;
 const token=generation,reference=logCollection();$('showHistory').disabled=true;$('moreHistory').disabled=true;
 try{
  if(reset){historyCursor=null;$('historyList').replaceChildren();}
  const constraints=[F.orderBy('revision','desc'),F.limit(15)];if(historyCursor)constraints.push(F.startAfter(historyCursor));
  const page=await F.getDocs(F.query(reference,...constraints));if(token!==generation)return;
  for(const item of page.docs){const log=item.data();const li=document.createElement('li');const time=log.updatedAt?.toDate().toLocaleString('ko-KR')||'';li.append(document.createTextNode(`#${log.revision} · ${time} · ${log.note} · 저장자 ${log.updatedBy.slice(0,8)}`));
   const restore=document.createElement('button');restore.className='button';restore.textContent='이 배치 불러오기';restore.onclick=()=>{if(busy)return;if(dirty&&!confirm('현재 임시 편집을 이 기록으로 교체할까요?'))return;try{editor.load(BusCore.validate(log.state),`bus-cache:${config.projectId}:${trip}:${klass}`);baseRevision=latest.revision;dirty=true;localDraft();$('revisionNote').value=`기록 #${log.revision} 복원`;status('이전 배치를 편집 화면에 불러왔습니다. 반에 저장하면 새 기록으로 남습니다.');}catch(e){status(explain(e));}};li.append(restore);$('historyList').append(li);
  }
  historyCursor=page.docs.at(-1)||historyCursor;$('moreHistory').hidden=page.size<15;
  if(reset&&!page.size)$('historyList').textContent='아직 저장 기록이 없습니다.';
 }catch(e){status(explain(e));}finally{$('moreHistory').disabled=false;permissions();}
}
$('tripSelect').onchange=switchClass;$('classSelect').onchange=switchClass;
$('publishClass').onclick=publish;
$('loadLatest').onclick=()=>{if(!latest||busy)return;if(dirty&&!confirm('현재 임시 편집을 버리고 최신 공유 배치를 불러올까요?'))return;apply(latest.data,latest.revision);localDraft();status(`${klass}반 · 최신 기록 #${baseRevision}을 불러왔습니다.`);};
$('showHistory').onclick=()=>historyPage(true);$('moreHistory').onclick=()=>historyPage();
function withDeadline(promise){
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Firestore 권한 확인 시간이 초과됐습니다. 데이터베이스를 생성했는지, 보안 규칙이 게시됐는지 확인하세요.')),12000);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}
async function checkAccess(user){
 const token=++generation;unsubscribe?.();canEdit=false;ready=false;permissions();
 $('loginForm').hidden=!!user&&!user.isAnonymous;
 $('logoutButton').hidden=!user||user.isAnonymous;
 $('teacherUid').hidden=!user||user.isAnonymous;
 if(!user||user.isAnonymous){
  $('authStatus').textContent='조회 모드 · 교사 로그인 필요';
  $('teacherUid').textContent='';
  status('교사 계정으로 로그인하면 권한 확인 후 좌석 배치도가 표시됩니다.');
  editor.load(BusCore.fresh(),`bus-cache:${config.projectId}:${trip}:${klass}`);
  return;
 }
 $('authStatus').textContent=`로그인 성공 · ${user.email||'교사 계정'} · 권한 확인 중…`;
 $('teacherUid').textContent=`현재 계정 UID: ${user.uid}`;
 status('Firebase 로그인은 완료됐습니다. Firestore 교사 권한을 확인하는 중…');
 try{
  const role=await withDeadline(F.getDocFromServer(F.doc(db,'busEditors',user.uid)));
  if(token!==generation)return;
  canEdit=role.exists()&&role.data().enabled===true;
  if(!canEdit){
   $('authStatus').textContent=`로그인 성공 · ${user.email||'교사 계정'} · 교사 권한 없음`;
   status(`Firestore 데이터에서 busEditors / ${user.uid} 문서를 만들고 enabled를 boolean true로 등록하세요.`);
   permissions();return;
  }
  $('authStatus').textContent=`교사 로그인 완료 · ${user.email||'교사 계정'} · 수정 권한 확인됨`;
  await subscribe();
 }catch(error){if(token!==generation)return;$('authStatus').textContent=`로그인 성공 · ${user.email||'교사 계정'} · 권한 확인 실패`;status(explain(error));permissions();}
}
$('retryAccess').onclick=()=>checkAccess(auth?.currentUser);
$('loginForm').onsubmit=async e=>{
 e.preventDefault();if(!auth){status('Firebase 초기화 중입니다. 잠시 후 다시 시도하세요.');return;}
 $('loginButton').disabled=true;$('loginButton').textContent='로그인 중…';
 try{await A.signInWithEmailAndPassword(auth,$('teacherEmail').value.trim(),$('teacherPassword').value);$('teacherPassword').value='';}
 catch(error){$('authStatus').textContent='교사 로그인 실패';status(explain(error));}
 finally{$('loginButton').disabled=false;$('loginButton').textContent='교사 로그인';}
};
$('logoutButton').onclick=async()=>{if(busy)return;try{await A.signOut(auth);}catch(e){status(explain(e));}};
if(!config.projectId||!config.apiKey||!config.appId){
 status('Firebase 미연결 · firebase-config.js에 웹 앱 설정을 입력하세요. 교사 로그인 설정 전에는 좌석 배치도를 표시하지 않습니다.');$('loginForm').hidden=true;$('tripSelect').disabled=true;$('classSelect').disabled=true;window.BusCloud=null;editor.lock(true);$('teacherWorkspace').hidden=true;
}else{
 editor.load(BusCore.fresh(),`bus-cache:${config.projectId}:${trip}:${klass}`);permissions();
 try{
  const app=await import('https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js');
  [F,A]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js'),import('https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js')]);
  const instance=app.initializeApp(config);db=F.getFirestore(instance);auth=A.getAuth(instance);
  A.onAuthStateChanged(auth,user=>checkAccess(user));
 }catch(e){status(`Firebase 연결 실패: ${explain(e)} 새로고침하여 다시 시도하세요.`);}
}
