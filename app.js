'use strict';
const $=id=>document.getElementById(id); let KEY='kish-bus-seats-v1';
let state=BusCore.fresh(),mode='random',history=[],toastTimer,editorEpoch=0;
try{const saved=localStorage.getItem(KEY);if(saved)state=BusCore.validate(JSON.parse(saved));}catch{$('saveStatus').textContent='저장 자료를 읽지 못했습니다. 파일을 불러올 수 있습니다.';}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function save(){window.dispatchEvent(new Event('bus-edit'));try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='● 이 브라우저에 임시 저장됨';}catch{$('saveStatus').textContent='자동 저장 실패 · 파일 저장으로 보관하세요';toast('저장 공간이 부족하거나 브라우저 저장이 제한되어 있습니다. 파일로 저장하세요.');}}
function remember(){history.push(JSON.stringify(state));if(history.length>15)history.shift();$('undo').disabled=false;}
function updateInfo(){$('busName').value=state.busName;$('plate').value=state.plate;$('start').value=state.start;$('end').value=state.end;$('mapTitle').textContent=state.busName||'우리 버스 좌석표';$('busPhoto').hidden=!state.photo;if(state.photo)$('busPhoto').src=state.photo;else $('busPhoto').removeAttribute('src');$('photoEmpty').hidden=!!state.photo;$('removePhoto').hidden=!state.photo;}
function findSeat(){const number=String(Number($('find').value));let index=-1;document.querySelectorAll('.seat').forEach((el,i)=>{const match=!!$('find').value&&state.seats[i].number===number;el.classList.toggle('found',match);if(match)index=i;});$('findResult').textContent=!$('find').value?'':index<0?'아직 배치되지 않은 번호입니다.':`${number}번 학생: ${index+1}번 좌석${index>=40?' · 맨 뒷줄':` · 앞에서 ${Math.floor(index/4)+1}번째 줄`}`;}
function render(){
 $('seatGrid').replaceChildren();
 state.seats.forEach((s,i)=>{const seat=document.createElement('div');seat.className='seat'+(s.blocked?' blocked':'')+(s.number?' occupied':'');if(i<40)seat.style.gridColumn=String([1,2,4,5][i%4]);
 const small=document.createElement('small');small.textContent=String(i+1).padStart(2,'0');seat.append(small);
 if(mode==='block'||s.blocked){const button=document.createElement('button');button.type='button';button.textContent=s.blocked?'×':s.number||'−';button.setAttribute('aria-label',`${i+1}번 좌석 ${s.blocked?'제외 해제':'제외하기'}`);button.disabled=mode!=='block';button.onclick=()=>{remember();state.seats[i]={number:'',blocked:!s.blocked};save();render();};seat.append(button);}
 else{const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.maxLength=5;input.value=s.number;input.placeholder='·';input.readOnly=mode!=='manual';input.setAttribute('aria-label',`${i+1}번 좌석 학생 번호`);input.onchange=()=>{const v=input.value.trim();const normalized=v?String(Number(v)):'';if(v&&(!/^\d{1,5}$/.test(v)||Number(v)<1)){toast('학생 번호는 1~99999 사이의 숫자로 입력하세요.');input.value=s.number;return;}if(normalized&&state.seats.some((other,j)=>j!==i&&other.number===normalized)){toast(`${normalized}번은 이미 다른 좌석에 있습니다.`);input.value=s.number;return;}if(normalized===state.seats[i].number)return;remember();state.seats[i].number=normalized;input.value=normalized;seat.classList.toggle('occupied',!!normalized);save();counts();findSeat();};input.onblur=input.onchange;seat.append(input);} $('seatGrid').append(seat);
 });counts();findSeat();$('undo').disabled=!history.length;window.BusCloud?.applyPermissions();
}
function counts(){$('occupied').textContent=state.seats.filter(s=>s.number).length;$('blocked').textContent=state.seats.filter(s=>s.blocked).length;$('available').textContent=state.seats.filter(s=>!s.blocked).length;}
for(const el of document.querySelectorAll('[data-mode]'))el.onclick=()=>{mode=el.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));$('randomPanel').hidden=mode!=='random';$('modeHelp').hidden=mode==='random';$('modeHelp').textContent=mode==='manual'?'좌석 안에 학생 번호를 직접 입력하세요. 같은 번호를 두 좌석에 입력할 수 없습니다.':'비워둘 좌석을 누르면 빨간 X로 표시됩니다. 다시 누르면 해제됩니다. 제외하면 해당 좌석의 번호가 지워집니다.';$('mapHint').textContent={random:'빈 좌석에 번호를 랜덤으로 배치해요',manual:'좌석을 누르고 학생 번호를 입력하세요',block:'좌석을 눌러 제외하거나 해제하세요'}[mode];render();};
$('randomize').onclick=()=>{try{const start=Number($('start').value),end=Number($('end').value);const seats=BusCore.assign(state.seats,start,end);remember();state.seats=seats;state.start=start;state.end=end;save();render();toast(`${end-start+1}명의 자리를 배치했습니다.`);}catch(e){toast(e.message);}};
$('clear').onclick=()=>{remember();state.seats=state.seats.map(s=>({...s,number:''}));save();render();toast('배치 번호를 지웠습니다. 제외 좌석은 유지됩니다.');};
$('undo').onclick=()=>{if(history.length){state=JSON.parse(history.pop());updateInfo();save();render();toast('이전 상태로 되돌렸습니다.');}};
for(const key of ['busName','plate'])$(key).oninput=()=>{state[key]=$(key).value;$('mapTitle').textContent=state.busName||'우리 버스 좌석표';save();};
for(const key of ['start','end'])$(key).onchange=()=>{state[key]=Number($(key).value);save();};
$('find').oninput=findSeat;
async function photo(file){const epoch=editorEpoch;if(!file)return;if(!file.type.startsWith('image/')){toast('사진 파일을 선택하세요.');return;}if(file.size>20*1024*1024){toast('20MB 이하의 사진을 선택하세요.');return;}const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();if(epoch!==editorEpoch)return;const scale=Math.min(1,1400/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.8);if(data.length>2500000)throw Error('사진 용량이 큽니다. 더 작은 사진을 선택하세요.');remember();state.photo=data;save();updateInfo();toast('우리 버스 사진을 등록했습니다.');}catch(e){toast(e.message.includes('용량')?e.message:'사진을 읽을 수 없습니다. JPG 또는 PNG 사진을 선택하세요.');}finally{URL.revokeObjectURL(url);}}
for(const id of ['photoFile','cameraFile'])$(id).onchange=async()=>{await photo($(id).files[0]);$(id).value='';};
$('removePhoto').onclick=()=>{remember();state.photo='';save();updateInfo();};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='우리버스-좌석표.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('저장 파일에 좌석표와 버스 사진이 포함됩니다.');};
$('importFile').onchange=async()=>{const epoch=editorEpoch;const file=$('importFile').files[0];if(!file)return;try{if(file.size>3000000)throw Error('3MB 이하의 좌석 파일을 선택하세요.');const next=BusCore.validate(JSON.parse(await file.text()));if(epoch!==editorEpoch)return;remember();state=next;save();updateInfo();render();toast('버스 정보와 좌석표를 불러왔습니다.');}catch(e){toast(e instanceof SyntaxError?'올바른 JSON 파일이 아닙니다.':e.message);}finally{$('importFile').value='';}};
$('print').onclick=()=>window.print();updateInfo();render();

document.querySelectorAll('label.button').forEach(label=>label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$(label.htmlFor).click();}});

window.BusEditor={
 get:()=>JSON.parse(JSON.stringify(state)),
 load(data,key){const next=BusCore.validate(data);editorEpoch++;KEY=key;state=next;history=[];updateInfo();render();},
 toast,
 lock(locked){document.querySelectorAll('aside input,aside button,aside label.button,.seat input,.seat button').forEach(el=>{if(el.tagName==='LABEL'){el.style.pointerEvents=locked?'none':'';el.tabIndex=locked?-1:0;el.setAttribute('aria-disabled',String(locked));}else el.disabled=locked&&!['export','print','savePng','saveJpg'].includes(el.id);});if(!locked){$('undo').disabled=!history.length;document.querySelectorAll('.seat.blocked button').forEach(b=>b.disabled=mode!=='block');}}
};
if(window.BUS_FIREBASE_CONFIG?.projectId)window.BusEditor.lock(true);
