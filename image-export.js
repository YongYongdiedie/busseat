/* Standalone canvas export: no external libraries or network requests. */
(() => {
  const byId = id => document.getElementById(id);
  const font = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  let exporting = false;
  const selectedText = id => byId(id)?.selectedOptions?.[0]?.textContent || '';

  async function createImage(snapshot, meta, type) {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = snapshot.photo ? 2110 : 1790;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('이 브라우저에서는 이미지 저장을 지원하지 않습니다.');
    const box = (x, y, w, h, color, radius = 16, stroke) => {
      ctx.beginPath();ctx.roundRect(x, y, w, h, radius);ctx.fillStyle=color;ctx.fill();
      if (stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
    };
    const text = (value, x, y, size=24, color='#eaf0fa', weight=400, align='left') => {
      ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(value), x, y);
    };
    const fittedText = (value,x,y,width,size,color,weight=600) => {
      ctx.font=`${weight} ${size}px ${font}`;
      while(ctx.measureText(value).width>width&&size>17){size--;ctx.font=`${weight} ${size}px ${font}`;}
      text(value,x,y,size,color,weight);
    };
    ctx.fillStyle='#0b1322';ctx.fillRect(0,0,canvas.width,canvas.height);
    text('KISH  /  SCHOOL TRIP',60,60,22,'#b9d2fa',700);
    fittedText(snapshot.busName||'우리 버스 좌석표',60,125,880,46,'#f7f9ff',800);
    fittedText([meta.trip,meta.klass].filter(Boolean).join(' · '),60,178,880,25,'#b9c9df');
    box(60,218,880,92,'#1c2a40');
    text('차량 번호',86,264,21,'#a7b8d0');
    fittedText(snapshot.plate||'등록된 번호판 없음',225,264,685,32,'#f7f9ff');
    let top=342;
    if(snapshot.photo){
      const photo=new Image();photo.src=snapshot.photo;await photo.decode();
      box(60,top,880,290,'#162238');
      const scale=Math.min(848/photo.width,266/photo.height);
      const w=photo.width*scale,h=photo.height*scale;
      ctx.drawImage(photo,60+(880-w)/2,top+(290-h)/2,w,h);
      top+=320;
    }
    const filled=snapshot.seats.filter(s=>s.number).length;
    const blocked=snapshot.seats.filter(s=>s.blocked).length;
    text(`배치 ${filled}명    사용 가능 ${45-blocked}석    제외 ${blocked}석`,500,top+12,25,'#d4e1f5',600,'center');
    const busY=top+52;
    box(180,busY,640,1190,'#1d2b40',65,'#64768e');
    box(206,busY+24,588,80,'#3b506b',38);
    text('FRONT · 버스 앞쪽',500,busY+65,21,'#e0ecff',600,'center');
    text('운전석',248,busY+146,24,'#a9bdd6',600);
    text('출입문 ↗',752,busY+146,24,'#a9bdd6',600,'right');
    const cellW=98,cellH=72,gapX=18,gapY=16,startX=218,startY=busY+192;
    snapshot.seats.forEach((seat,i)=>{
      const row=i<40?Math.floor(i/4):10;
      const col=i<40?[0,1,3,4][i%4]:i-40;
      const x=startX+col*(cellW+gapX),y=startY+row*(cellH+gapY);
      const color=seat.blocked?'#542b37':seat.number?'#d4e3fb':'#283b56';
      box(x,y,cellW,cellH,color,12,seat.blocked?'#c96e83':'#7386a0');
      text(String(i+1).padStart(2,'0'),x+10,y+14,14,seat.number?'#516682':'#b5c5db',500);
      if(seat.blocked){
        ctx.strokeStyle='#ffb3c0';ctx.lineWidth=5;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x+34,y+28);ctx.lineTo(x+64,y+58);ctx.moveTo(x+64,y+28);ctx.lineTo(x+34,y+58);ctx.stroke();
      }else{
        const size=seat.number.length>3?25:34;
        text(seat.number||'·',x+cellW/2,y+43,size,seat.number?'#15263f':'#92a7c5',700,'center');
      }
    });
    text('REAR · 맨 뒤 5인석',500,busY+1160,19,'#a4b7d1',500,'center');
    text('작은 숫자: 좌석 번호  /  큰 숫자: 학생 번호  /  X: 제외 좌석',500,busY+1230,21,'#c1cde0',400,'center');
    text('현재 화면의 좌석표 · '+meta.time,500,busY+1272,19,'#91a5c0',400,'center');
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,type==='image/jpeg'?.94:undefined));
    if(!blob)throw Error('이미지를 만들지 못했습니다. 다시 시도하세요.');
    return blob;
  }

  async function download(type) {
    if(exporting)return;
    exporting=true;
    const buttons=[byId('savePng'),byId('saveJpg')];buttons.forEach(b=>b.disabled=true);
    try{
      // Commit a manually typed seat number before taking the snapshot.
      document.activeElement?.blur();
      const snapshot=window.BusEditor.get();
      const meta={trip:selectedText('tripSelect'),klass:selectedText('classSelect'),time:new Date().toLocaleString('ko-KR')};
      if(document.fonts?.ready)await document.fonts.ready;
      const blob=await createImage(snapshot,meta,type);
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;
      const name=[meta.klass,snapshot.busName||'우리버스','좌석표'].filter(Boolean).join('-').replace(/[\\/:*?"<>|]/g,'_');
      link.download=name+(type==='image/png'?'.png':'.jpg');document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      window.BusEditor.toast(`${type==='image/png'?'PNG':'JPG'} 좌석표 이미지를 저장했습니다.`);
    }catch(e){window.BusEditor.toast(e.message||'이미지 저장 중 오류가 발생했습니다.');}
    finally{exporting=false;buttons.forEach(b=>b.disabled=false);}
  }
  byId('savePng').onclick=()=>download('image/png');
  byId('saveJpg').onclick=()=>download('image/jpeg');
})();
