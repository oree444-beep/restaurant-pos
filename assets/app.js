const VERSION = "V43";
const REST_ID = new URLSearchParams(location.search).get("restaurantId") || "rest_000001";
const shortId = (REST_ID.match(/(\d{6})$/)||[,'000001'])[1];
const K = (name)=>`pos_${VERSION}_${REST_ID}_${name}`;
const DEFAULT_MENUS = [
  {id:"m1",name:"생태탕",price:12000,category:"식사류",emoji:"🍲",material:{"생태":1,"채소세트":1,"육수":1}},
  {id:"m2",name:"애호박찌개",price:10000,category:"식사류",emoji:"🥘",material:{"애호박":0.5,"두부":0.3,"육수":1}},
  {id:"m3",name:"소주",price:5000,category:"주류",emoji:"🍶",material:{"소주":1}},
  {id:"m4",name:"맥주",price:5000,category:"주류",emoji:"🍺",material:{"맥주":1}},
  {id:"m5",name:"콜라",price:2000,category:"음료",emoji:"🥤",material:{"콜라":1}}
];
const CATS = ["식사류","주류","음료"];
const $ = (s)=>document.querySelector(s);
const el = (tag, cls, html)=>{const x=document.createElement(tag); if(cls)x.className=cls; if(html!==undefined)x.innerHTML=html; return x};
const get = (key, def)=>{try{const v=localStorage.getItem(K(key));return v?JSON.parse(v):def}catch{return def}};
const set = (key, val)=>localStorage.setItem(K(key), JSON.stringify(val));
const money = (n)=>`${(Number(n)||0).toLocaleString()}원`;
const ymd = (d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const hm = (d=new Date())=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const dtText = (iso)=>{const d=new Date(iso); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
let state = {
  restaurantName:get('restaurantName','생태한마리'),
  ownerPhone:get('ownerPhone','0106954900'),
  adminPw:get('adminPw','1234'),
  inboxPw:get('inboxPw','1234'),
  inboxToken:get('inboxToken',`token_${shortId}_${VERSION}`),
  authed:get('authed',false),
  tab:'주문', selectedTable:1, serviceType:'식당식사', pay:'카드',
  menus:get('menus',DEFAULT_MENUS), cats:get('cats',CATS), tableCount:get('tableCount',12),
  orders:get('orders',{}), sales:get('sales',seedSales()), credits:get('credits',[]), reports:get('reports',[]),
  manualEditId:null, showModal:null
};
function normalizeState(){
  try{
    if(!Array.isArray(state.menus) || !state.menus.length) state.menus = DEFAULT_MENUS;
    if(!Array.isArray(state.cats) || !state.cats.length) state.cats = CATS;
    if(!state.orders || typeof state.orders !== 'object' || Array.isArray(state.orders)) state.orders = {};
    if(!Array.isArray(state.sales)) state.sales = seedSales();
    state.sales = state.sales.map(s=>({
      id:s.id||('s_'+Math.random().toString(36).slice(2)),
      createdAt:s.createdAt||new Date().toISOString(),
      paidAt:s.paidAt||s.createdAt||new Date().toISOString(),
      table:s.table||1,
      serviceType:s.serviceType||'식당식사',
      payment:s.payment||'카드',
      items:Array.isArray(s.items)?s.items:[],
      total:Number(s.total)||0,
      manual:!!s.manual,
      memo:s.memo||'',
      inputUser:s.inputUser||''
    })).filter(s=>s.items.length);
    if(!Array.isArray(state.credits)) state.credits = [];
    if(!Array.isArray(state.reports)) state.reports = [];
    state.tableCount = Number(state.tableCount)||12;
    state.selectedTable = Number(state.selectedTable)||1;
    if(!['주문','외상장부','판매통계','수기입력','관리자'].includes(state.tab)) state.tab='주문';
    state.restaurantName = state.restaurantName || '생태한마리';
    state.ownerPhone = state.ownerPhone || '';
    state.adminPw = state.adminPw || '1234';
    state.inboxPw = state.inboxPw || '1234';
    state.inboxToken = state.inboxToken || `token_${shortId}_${VERSION}`;
  }catch(e){
    console.error('normalizeState failed', e);
  }
}
function showFatalError(err){
  const app=document.querySelector('#app');
  if(app){
    app.innerHTML=`<div class="wrap"><div class="card"><h2>POS 화면을 불러오지 못했습니다</h2><p class="muted">이전 버전의 저장값이 꼬였을 가능성이 있습니다.</p><pre style="white-space:pre-wrap;background:#fee2e2;padding:12px;border-radius:12px;color:#991b1b;">${String(err&&err.message||err)}</pre><button class="primary" id="resetLocal">저장값 초기화 후 다시 열기</button></div></div>`;
    const btn=document.querySelector('#resetLocal');
    if(btn) btn.onclick=()=>{Object.keys(localStorage).filter(k=>k.startsWith(`pos_${VERSION}_${REST_ID}_`)).forEach(k=>localStorage.removeItem(k)); location.reload();};
  }
}
window.addEventListener('error', e=>showFatalError(e.error||e.message));
function safeStart(){try{normalizeState(); render();}catch(e){console.error(e); showFatalError(e)}}
function seedSales(){
 const now=new Date(); const sample=[]; const names=["생태탕","애호박찌개","소주","맥주","콜라"];
 for(let i=1;i<=28;i+=3){const d=new Date(now); d.setDate(d.getDate()-i); const items=[{id:'m1',name:'생태탕',price:12000,qty:2+(i%4),category:'식사류'},{id:'m3',name:'소주',price:5000,qty:1+(i%3),category:'주류'}]; if(i%2)items.push({id:'m2',name:'애호박찌개',price:10000,qty:1,category:'식사류'}); sample.push({id:`seed_${i}`,createdAt:d.toISOString(),paidAt:d.toISOString(),table:(i%6)+1,serviceType:i%2?'식당식사':'포장',payment:i%3?'카드':'현금',items,total:items.reduce((s,x)=>s+x.price*x.qty,0),manual:false,memo:'샘플 판매'});}
 return sample;
}
function saveAll(){['restaurantName','ownerPhone','adminPw','inboxPw','inboxToken','authed','menus','cats','tableCount','orders','sales','credits','reports'].forEach(k=>set(k,state[k]));}
function toast(msg){const t=el('div','toast',msg);document.body.appendChild(t);setTimeout(()=>t.remove(),2300)}
function requireLogin(){
 if(state.authed) return false;
 const app=$('#app'); app.innerHTML=''; const box=el('div','login');
 box.innerHTML=`<div class="loginBox"><h1>식당 POS 접속 비밀번호</h1><p class="muted">인증된 기기는 다음부터 바로 접속됩니다.</p><input id="pw" type="password" placeholder="비밀번호 입력" autofocus><button class="primary" id="loginBtn">접속하기</button><p class="muted small">비밀번호는 관리자 화면에서 변경할 수 있습니다.</p></div>`;
 app.appendChild(box); $('#loginBtn').onclick=()=>{if($('#pw').value===state.adminPw){state.authed=true;saveAll();render()}else toast('비밀번호가 맞지 않습니다')};
 $('#pw').onkeydown=e=>{if(e.key==='Enter')$('#loginBtn').click()}; return true;
}
function render(){ if(requireLogin())return; const app=$('#app'); app.innerHTML='';
 const wrap=el('div','wrap'); app.appendChild(wrap);
 wrap.appendChild(header()); wrap.appendChild(tabs());
 if(state.tab==='주문') wrap.appendChild(orderView());
 if(state.tab==='외상장부') wrap.appendChild(creditView());
 if(state.tab==='판매통계') wrap.appendChild(statsView());
 if(state.tab==='수기입력') wrap.appendChild(manualView());
 if(state.tab==='관리자') wrap.appendChild(adminView());
 if(state.showModal) modal(state.showModal);
 saveAll();
}
function header(){const h=el('header','top'); const inboxName=`${state.restaurantName} 우리매장 쪽지함 ${shortId}`; h.innerHTML=`<div><h1>${state.restaurantName} POS <span>${VERSION}</span></h1><p>주문 · 외상장부 · 판매통계 · 수기입력 · 우리매장 쪽지함</p></div>`;
 const btns=el('div','topBtns');
 btns.innerHTML=`<button class="dark" id="adminBtn">관리자모드</button><button class="green" id="refreshBtn">새로고침</button><button class="wide" id="inboxBtn">${inboxName}</button><button class="status">식당ID ${REST_ID} · 문자 API 보류 · 쪽지함 우선</button>`;
 h.appendChild(btns); btns.querySelector('#adminBtn').onclick=()=>{state.tab='관리자';render()}; btns.querySelector('#refreshBtn').onclick=()=>location.reload(); btns.querySelector('#inboxBtn').onclick=()=>openInboxModal(); return h;}
function tabs(){const t=el('div','tabs'); ['주문','외상장부','판매통계','수기입력','관리자'].forEach(x=>{const b=el('button',state.tab===x?'active':'',x); b.onclick=()=>{state.tab=x;render()}; t.appendChild(b)});return t}
function orderView(){const main=el('div','mainGrid'); const left=el('div','card'); left.innerHTML=`<h2>테이블 선택</h2>`; const tables=el('div','tables'); for(let i=1;i<=state.tableCount;i++){const has=(state.orders[i]||[]).length; const b=el('button',`tableBtn ${state.selectedTable===i?'sel':has?'has':''}`,`${i}번${has?'<br><span class="small">주문중</span>':''}`); b.onclick=()=>{state.selectedTable=i;render()}; tables.appendChild(b)} left.appendChild(tables);
 const service=el('div','tabs'); ['식당식사','포장'].forEach(x=>{const b=el('button',state.serviceType===x?'active':'',x); b.onclick=()=>{state.serviceType=x;render()}; service.appendChild(b)}); left.appendChild(service);
 state.cats.forEach(c=>{const title=el('div','menuGroupTitle',`<span>${c}</span>`); left.appendChild(title); const grid=el('div','menuGrid'); state.menus.filter(m=>m.category===c).forEach(m=>{const b=el('button','menuCard',`<div class="menuEmoji">${m.emoji||'🍽️'}</div><div class="menuName">${m.name}</div><div class="price">${money(m.price)}</div>`); b.onclick=()=>addOrder(m); grid.appendChild(b)}); left.appendChild(grid)});
 const right=orderPanel(); main.appendChild(left); main.appendChild(right); return main;}
function addOrder(m){const key=state.selectedTable; const arr=state.orders[key]||[]; const found=arr.find(x=>x.id===m.id); if(found) found.qty++; else arr.push({...m,qty:1,serviceType:state.serviceType}); state.orders[key]=arr; saveAll(); render();}
function changeQty(id,delta){const arr=(state.orders[state.selectedTable]||[]).map(x=>x.id===id?{...x,qty:x.qty+delta}:x).filter(x=>x.qty>0); state.orders[state.selectedTable]=arr; render();}
function orderPanel(){const p=el('aside','card'); const arr=state.orders[state.selectedTable]||[]; const total=arr.reduce((s,x)=>s+x.price*x.qty,0); p.innerHTML=`<h2>주문내역 (${state.selectedTable}번)</h2>`; if(!arr.length)p.innerHTML+=`<p class="muted">메뉴를 선택해주세요.</p>`; arr.forEach(i=>{const row=el('div','orderItem',`<div><b>${i.name}</b><p class="muted">${money(i.price)} × ${i.qty}</p></div><div class="qtyCtl"><button>-</button><span>${i.qty}</span><button>+</button></div>`); const bs=row.querySelectorAll('button'); bs[0].onclick=()=>changeQty(i.id,-1); bs[1].onclick=()=>changeQty(i.id,1); p.appendChild(row)}); p.innerHTML+=`<div class="total">${money(total)}</div>`; const pays=el('div','payBtns'); ['카드','현금','카드+현금','상품권','기타','외상'].forEach(x=>{const b=el('button',state.pay===x?'active':'',x); b.onclick=()=>{state.pay=x;render()}; pays.appendChild(b)}); p.appendChild(pays); const credit=el('div','field'); credit.innerHTML=`<label>외상 고객/단체명</label><input id="creditName" placeholder="외상일 때 필수">`; p.appendChild(credit); const memo=el('div','field'); memo.innerHTML=`<label>결제 메모</label><input id="payMemo" placeholder="선택 입력">`; p.appendChild(memo); const done=el('button','primary','결제완료'); done.style.width='100%'; done.onclick=()=>completePayment(total); p.appendChild(done); return p;}
function completePayment(total){const arr=state.orders[state.selectedTable]||[]; if(!arr.length)return toast('주문내역이 없습니다'); const cname=$('#creditName')?.value.trim()||''; if(state.pay==='외상'&&!cname)return toast('외상 고객/단체명을 입력해주세요'); const now=new Date().toISOString(); const sale={id:'s_'+Date.now(),createdAt:now,paidAt:now,table:state.selectedTable,serviceType:state.serviceType,payment:state.pay,items:arr,total,manual:false,memo:$('#payMemo')?.value||''}; state.sales.unshift(sale); if(state.pay==='외상'){state.credits.unshift({id:'c_'+Date.now(),saleId:sale.id,createdAt:now,name:cname,phone:'',total,remain:total,paid:false,items:arr,memo:sale.memo,logs:[]})} state.orders[state.selectedTable]=[]; saveAll(); toast('결제완료'); render();}
function creditView(){const c=el('div','card'); c.innerHTML=`<h2>외상장부</h2><p class="muted">외상 고객에게 입금 요청을 보내는 문자는 발신번호 등록 전까지 보류하고, 우선 우리매장 쪽지함에 안내를 저장합니다.</p>`; if(!state.credits.length)c.innerHTML+=`<div class="help">외상 내역이 없습니다.</div>`; const table=el('table','table'); table.innerHTML=`<thead><tr><th>상태</th><th>고객/단체</th><th>금액</th><th>잔액</th><th>일시</th><th>처리</th></tr></thead><tbody></tbody>`; state.credits.forEach(cr=>{const tr=el('tr'); tr.innerHTML=`<td>${cr.paid?'<span class="badge green">완납</span>':'<span class="badge orange">미수</span>'}</td><td><b>${cr.name}</b><br><span class="muted small">${cr.phone||'연락처 미입력'}</span></td><td>${money(cr.total)}</td><td>${money(cr.remain)}</td><td>${dtText(cr.createdAt)}</td><td><button data-act="pay">일부/완납</button> <button data-act="send">쪽지함 저장</button></td>`; tr.querySelector('[data-act="pay"]').onclick=()=>payCredit(cr.id); tr.querySelector('[data-act="send"]').onclick=()=>sendCreditReport(cr); table.querySelector('tbody').appendChild(tr)}); c.appendChild(table); return c;}
function payCredit(id){const cr=state.credits.find(x=>x.id===id); const v=prompt('입금액을 입력하세요. 전체 완납은 잔액 그대로 입력', cr.remain); const amt=Number(v)||0; if(!amt)return; cr.remain=Math.max(0,cr.remain-amt); cr.paid=cr.remain===0; cr.logs.push({at:new Date().toISOString(),amount:amt}); saveAll(); render();}
function sendCreditReport(cr){const text=`[${state.restaurantName} 외상 안내]\n${cr.name} 외상 잔액: ${money(cr.remain)}\n문의는 매장으로 연락 부탁드립니다.`; state.reports.unshift({id:'r_'+Date.now(),type:'외상장부',title:`${cr.name} 외상 안내`,body:text,createdAt:new Date().toISOString(),read:false}); saveAll(); toast('우리매장 쪽지함에 외상 안내를 저장했습니다');}
function statsView(){const v=el('div','grid'); const total=state.sales.reduce((s,x)=>s+x.total,0), count=state.sales.length; const byMenu={}; const byPay={}; const byDay={}; state.sales.forEach(s=>{byPay[s.payment]=(byPay[s.payment]||0)+s.total; byDay[new Date(s.paidAt||s.createdAt).getDay()]=(byDay[new Date(s.paidAt||s.createdAt).getDay()]||0)+s.total; s.items.forEach(i=>{byMenu[i.name]=byMenu[i.name]||{qty:0,total:0,material:i.material||{}}; byMenu[i.name].qty+=i.qty; byMenu[i.name].total+=i.qty*i.price})}); const topMenus=Object.entries(byMenu).sort((a,b)=>b[1].qty-a[1].qty); v.appendChild(el('div','card',`<h2>판매통계</h2><p class="muted">기본형/종합형/세부재료분석형/요일별 통계 예시를 함께 보여줍니다. 문자 API는 보류하고 우선 우리매장 쪽지함에 리포트를 저장합니다.</p><div class="statCards"><div class="statCard">총매출<br><b>${money(total)}</b></div><div class="statCard">주문건수<br><b>${count}건</b></div><div class="statCard">평균 객단가<br><b>${money(count?Math.round(total/count):0)}</b></div><div class="statCard">리포트 발송<br><b>쪽지함</b></div></div>`));
 const basic=`[기본형]\n최근 매출: ${money(total)}\n주문건수: ${count}건\n인기메뉴: ${topMenus[0]?.[0]||'기록 없음'}\n안 팔린 메뉴: ${state.menus.filter(m=>!byMenu[m.name]).map(m=>m.name).join(', ')||'없음'}`;
 const comp=`[종합형]\n결제방식별: ${Object.entries(byPay).map(([k,v])=>`${k} ${money(v)}`).join(' / ')||'기록 없음'}\n식당/포장 흐름, 시간대별 매출, 인기메뉴 TOP을 함께 확인합니다.`;
 const materialLines=topMenus.slice(0,4).map(([name,v])=>{const menu=state.menus.find(m=>m.name===name); const mat=menu?.material||{}; return `${name} ${v.qty}개 기준 → ${Object.entries(mat).map(([mk,mv])=>`${mk} ${Math.ceil(mv*v.qty)}`).join(', ')||'재료 미설정'}`});
 const material=`[세부재료분석형]\n메뉴별 판매량 기준 오늘/내일 준비 재료를 추천합니다.\n${materialLines.join('\n')||'메뉴별 필요 재료를 관리자모드에서 입력해야 계산됩니다.'}`;
 const days=['일','월','화','수','목','금','토']; const dayText=Object.entries(byDay).map(([k,v])=>`${days[k]}요일 ${money(v)}`).join(' / ');
 const weekday=`[요일별 통계]\n요일별 매출 비교: ${dayText||'기록 없음'}\n요일별 인기메뉴와 재료 준비량 비교가 가능합니다.`;
 const cards=el('div','grid2'); [[basic,'blue'],[comp,'green'],[material,'orange'],[weekday,'blue']].forEach(([txt,cls])=>cards.appendChild(el('div',`reportCard ${cls}`,txt))); v.appendChild(cards);
 const actions=el('div','card'); actions.innerHTML=`<h3>리포트 보내기</h3><p class="muted">사장님 핸드폰에서는 우리매장 쪽지함 QR/링크로 확인합니다.</p><button class="primary" id="sendStats">판매통계 리포트 쪽지함 저장</button> <button id="openInbox">우리매장 쪽지함 열기</button>`; v.appendChild(actions); setTimeout(()=>{$('#sendStats').onclick=()=>{state.reports.unshift({id:'r_'+Date.now(),type:'판매통계',title:'판매통계 리포트',body:[basic,comp,material,weekday].join('\n\n'),createdAt:new Date().toISOString(),read:false});saveAll();toast('우리매장 쪽지함에 판매통계 리포트를 저장했습니다')}; $('#openInbox').onclick=()=>openInboxModal();},0); return v;}
function manualView(){const box=el('div','card'); box.innerHTML=`<h2>수기 내역 입력/수정</h2><p class="muted">POS 사용법을 모르는 직원이 종이에 적어둔 내역을 저녁이나 다음날 관리자가 입력할 수 있습니다. 실제 주문일/결제일/결제시간은 따로 지정됩니다.</p>`; const form=el('div','grid3'); form.innerHTML=`<div class="field"><label>주문일</label><input id="m_orderDate" type="date" value="${ymd()}"></div><div class="field"><label>결제일</label><input id="m_paidDate" type="date" value="${ymd()}"></div><div class="field"><label>결제시간</label><input id="m_paidTime" type="time" value="${hm()}"></div><div class="field"><label>구분</label><select id="m_service"><option>식당식사</option><option>포장</option></select></div><div class="field"><label>테이블</label><input id="m_table" type="number" value="1"></div><div class="field"><label>결제수단</label><select id="m_pay"><option>카드</option><option>현금</option><option>카드+현금</option><option>상품권</option><option>기타</option><option>외상</option></select></div><div class="field"><label>메뉴명</label><input id="m_name" placeholder="예: 생태탕"></div><div class="field"><label>수량</label><input id="m_qty" type="number" value="1"></div><div class="field"><label>단가</label><input id="m_price" type="number" value="12000"></div><div class="field"><label>외상 고객/단체명</label><input id="m_credit" placeholder="외상일 때 입력"></div><div class="field"><label>입력자/수정자</label><input id="m_user" value="관리자"></div><div class="field"><label>수정 사유/메모</label><input id="m_memo" placeholder="수기 입력 사유"></div>`; box.appendChild(form); const btn=el('button','primary','수기 내역 저장'); btn.style.marginTop='12px'; btn.onclick=saveManual; box.appendChild(btn);
 const list=el('div','card'); list.style.marginTop='16px'; list.innerHTML='<h3>수기 입력 내역</h3>'; const table=el('table','table'); table.innerHTML='<thead><tr><th>배지</th><th>결제일시</th><th>메뉴</th><th>금액</th><th>결제</th><th>메모</th><th>관리</th></tr></thead><tbody></tbody>'; state.sales.filter(s=>s.manual).forEach(s=>{const item=s.items[0]; const tr=el('tr',null,`<td><span class="manualMarker">수기입력</span></td><td>${dtText(s.paidAt)}</td><td>${item.name} ${item.qty}개</td><td>${money(s.total)}</td><td>${s.payment}</td><td>${s.memo||''}</td><td><button data-id="${s.id}">수정</button></td>`); tr.querySelector('button').onclick=()=>loadManual(s.id); table.querySelector('tbody').appendChild(tr)}); list.appendChild(table); box.appendChild(list); return box;}
function saveManual(){const paidAt=`${$('#m_paidDate').value}T${$('#m_paidTime').value}:00`; const item={id:'manual_'+Date.now(),name:$('#m_name').value||'수기메뉴',qty:Number($('#m_qty').value)||1,price:Number($('#m_price').value)||0,category:'수기입력'}; const sale={id:state.manualEditId||'manual_sale_'+Date.now(),createdAt:`${$('#m_orderDate').value}T${$('#m_paidTime').value}:00`,paidAt,table:Number($('#m_table').value)||1,serviceType:$('#m_service').value,payment:$('#m_pay').value,items:[item],total:item.qty*item.price,manual:true,memo:$('#m_memo').value,inputUser:$('#m_user').value,updatedAt:new Date().toISOString()}; if(state.manualEditId){state.sales=state.sales.map(s=>s.id===state.manualEditId?{...sale,editLog:[...(s.editLog||[]),{at:new Date().toISOString(),memo:sale.memo,user:sale.inputUser}]}:s); state.manualEditId=null}else state.sales.unshift(sale); if(sale.payment==='외상') state.credits.unshift({id:'c_'+Date.now(),saleId:sale.id,createdAt:sale.paidAt,name:$('#m_credit').value||'수기외상',phone:'',total:sale.total,remain:sale.total,paid:false,items:[item],memo:sale.memo,logs:[]}); saveAll(); toast('수기 내역이 저장되었습니다'); render();}
function loadManual(id){const s=state.sales.find(x=>x.id===id); if(!s)return; state.manualEditId=id; render(); setTimeout(()=>{const d=new Date(s.paidAt); $('#m_paidDate').value=ymd(d); $('#m_paidTime').value=hm(d); $('#m_service').value=s.serviceType; $('#m_table').value=s.table; $('#m_pay').value=s.payment; $('#m_name').value=s.items[0].name; $('#m_qty').value=s.items[0].qty; $('#m_price').value=s.items[0].price; $('#m_user').value=s.inputUser||'관리자'; $('#m_memo').value=s.memo||''},0)}
function adminView(){const a=el('div','grid2'); const left=el('div','card'); left.innerHTML=`<h2>관리자 설정</h2><div class="field"><label>식당명</label><input id="a_name" value="${state.restaurantName}"></div><div class="field"><label>사장님 연락처</label><input id="a_phone" value="${state.ownerPhone}"></div><div class="field"><label>POS 접속 비밀번호</label><input id="a_pw" value="${state.adminPw}"></div><div class="field"><label>테이블 수</label><input id="a_table" type="number" value="${state.tableCount}"></div><button class="primary" id="saveAdmin">관리자 설정 저장</button><button class="red" id="resetDevice">등록 기기 초기화</button><p class="muted small">비밀번호 변경만 하면 기존 인증 기기는 유지됩니다. 등록 기기 초기화 시 다음 접속 때 다시 비밀번호를 입력해야 합니다.</p>`; a.appendChild(left);
 const right=el('div','card'); const inboxName=`${state.restaurantName} 우리매장 쪽지함 ${shortId}`; right.innerHTML=`<h2>${inboxName}</h2><p class="muted">사장님 핸드폰에서 판매통계·외상장부·공지·요금안내를 확인하는 웹 쪽지함입니다.</p><div class="field"><label>쪽지함 비밀번호</label><input id="a_inboxPw" value="${state.inboxPw}"></div><div class="field"><label>쪽지함 토큰</label><input id="a_token" value="${state.inboxToken}"></div><div class="summaryBox"><b>쪽지함 주소</b><br><span class="small">${inboxUrl()}</span></div><div class="tabs"><button id="copyInbox">주소 복사</button><button id="openInbox2">새 창 열기</button><button id="regenToken">토큰 재발급</button></div><div class="help">QR 연결은 다음 단계에서 실제 QR 이미지로 보강합니다. 현재는 주소 복사/새 창 열기 방식으로 먼저 확인합니다.</div>`; a.appendChild(right);
 setTimeout(()=>{$('#saveAdmin').onclick=()=>{state.restaurantName=$('#a_name').value;state.ownerPhone=$('#a_phone').value;state.adminPw=$('#a_pw').value;state.tableCount=Number($('#a_table').value)||12;state.inboxPw=$('#a_inboxPw')?.value||state.inboxPw;state.inboxToken=$('#a_token')?.value||state.inboxToken;saveAll();toast('저장되었습니다');render()}; $('#resetDevice').onclick=()=>{state.authed=false;saveAll();location.reload()}; $('#copyInbox').onclick=()=>navigator.clipboard?.writeText(inboxUrl()).then(()=>toast('쪽지함 주소를 복사했습니다')); $('#openInbox2').onclick=()=>window.open(inboxUrl(),'_blank'); $('#regenToken').onclick=()=>{state.inboxToken=`token_${shortId}_${Date.now().toString(36)}`;saveAll();render()};},0);
 return a;}
function inboxUrl(){return `${location.origin}${location.pathname.replace(/index\.html$/,'')}owner-inbox.html?restaurantId=${REST_ID}&token=${encodeURIComponent(state.inboxToken)}`}
function openInboxModal(){state.showModal='inbox';render()}
function modal(type){const bg=el('div','modalBg'); const m=el('div','modal'); if(type==='inbox'){const inboxName=`${state.restaurantName} 우리매장 쪽지함 ${shortId}`; m.innerHTML=`<div class="modalHead"><h2>${inboxName}</h2><button class="close">닫기</button></div><p class="muted">사장님 핸드폰으로 이 주소를 열거나 QR로 연결해 판매통계/외상장부/공지/요금안내를 확인합니다.</p><div class="field"><label>쪽지함 주소</label><input readonly value="${inboxUrl()}"></div><div class="grid3" style="margin-top:12px"><button id="copyM">주소 복사</button><button id="openM" class="primary">새 창 열기</button><button id="closeM">닫기</button></div><div class="help">보안: 식당ID + 토큰 + 쪽지함 전용 비밀번호를 사용합니다. 6자리 번호는 표시용이며, 토큰 재발급 시 기존 링크는 무효화됩니다.</div>`;}
 bg.appendChild(m); document.body.appendChild(bg); const close=()=>{state.showModal=null; bg.remove()}; m.querySelector('.close')?.addEventListener('click',close); m.querySelector('#closeM')?.addEventListener('click',close); m.querySelector('#copyM')?.addEventListener('click',()=>navigator.clipboard?.writeText(inboxUrl()).then(()=>toast('주소를 복사했습니다'))); m.querySelector('#openM')?.addEventListener('click',()=>window.open(inboxUrl(),'_blank'));}
safeStart();
