(function(root){
'use strict';
const fresh=()=>({version:1,busName:'',plate:'',photo:'',start:1,end:40,seats:Array.from({length:45},()=>({number:'',blocked:false}))});
function validate(data){
 if(!data||data.version!==1||!Array.isArray(data.seats)||data.seats.length!==45)throw Error('올바른 버스 좌석 파일이 아닙니다.');
 for(const key of ['busName','plate','photo'])if(typeof data[key]!=='string')throw Error('버스 정보 형식이 올바르지 않습니다.');
 if(data.busName.length>40||data.plate.length>30||data.photo.length>2500000|| (data.photo&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data.photo)))throw Error('버스 정보 또는 사진 형식이 올바르지 않습니다.');
 const numbers=new Set();
 const seats=data.seats.map(s=>{if(!s||typeof s.blocked!=='boolean'||typeof s.number!=='string'||(s.number&&!/^[1-9]\d{0,4}$/.test(s.number))||(s.blocked&&s.number))throw Error('좌석 데이터가 올바르지 않습니다.');if(s.number&&numbers.has(s.number))throw Error('중복된 학생 번호가 있습니다.');if(s.number)numbers.add(s.number);return {number:s.number,blocked:s.blocked};});
 return {version:1,busName:data.busName,plate:data.plate,photo:data.photo,start:Number.isInteger(data.start)?data.start:1,end:Number.isInteger(data.end)?data.end:40,seats};
}
function assign(seats,start,end,random=Math.random){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>99999||end<start)throw Error('1~99999 사이의 시작·끝 번호를 순서대로 입력하세요.');
 const available=seats.filter(s=>!s.blocked).length,count=end-start+1;
 if(count>available)throw Error(`학생 ${count}명에 비해 사용 가능한 좌석이 ${available}석입니다.`);
 const values=Array.from({length:count},(_,i)=>String(start+i));
 while(values.length<available)values.push('');
 for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
 let cursor=0;return seats.map(s=>({blocked:s.blocked,number:s.blocked?'':values[cursor++]}));
}
const api={fresh,validate,assign};if(typeof module!=='undefined')module.exports=api;else root.BusCore=api;
})(typeof window!=='undefined'?window:globalThis);
