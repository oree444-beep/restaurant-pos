(function(){
'use strict';
const VERSION='V44';
const qs=new URLSearchParams(location.search);
const REST_ID=qs.get('restaurantId')||'rest_000001';
const token=qs.get('token')||'';
const shortId=(REST_ID.match(/(\d{6})$/)||['','000001'])[1];
const key=(name)=>`pos_${VERSION}_${REST_ID}_${name}`;
const read=(name,def)=>{try{const raw=localStorage.getItem(key(name));return raw?JSON.parse(raw):def;}catch(e){return def;}};
const write=(name,val)=>{try{localStorage.setItem(key(name),JSON.stringify(val));}catch(e){}};
const $=(s)=>document.querySelector(s);
const make=(tag,cls,html)=>{const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e;};
const money=(n)=>`${(Number(n)||0).toLocaleString()}원`;
const dt=(iso)=>{const d=new Date(iso); if(isNaN(d))return '-'; return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const state={restaurantName:read('restaurantName','생태한마리'), inboxPw:read('inboxPw','1234'), inboxToken:read('inboxToken',`token_${shortId}_${VERSION}`), phoneAuthed:read('phoneAuthed',false), reports:read('reports',[]), sales:read('sales',[]), credits:read('credits',[])};
function render(){const app=$('#ownerInbox'); app.innerHTML=''; if(token!==state.inboxToken){app.appendChild(make('div','wrap',`<div class="card"><h2>쪽지함 링크가 유효하지 않습니다</h2><p class="muted">관리자에게 새 우리매장 쪽지함 QR/링크를 요청해주세요.</p></div>`)); return;} if(!state.phoneAuthed){login(app);return;} const wrap=make('div','wrap'); app.appendChild(wrap); wrap.appendChild(make('header','top',`<div><h1>${state.restaurantName} 우리매장 쪽지함 <span>${shortId}</span></h1><p>판매통계 · 외상장부 · 요금안내 · 관리자 공지</p></div><div class="topBtns"><button class="green" id="refresh">새로고침</button><button class="dark" id="logout">인증 해제</button><button class="status">식당ID ${REST_ID}</button></div>`)); setTimeout(()=>{$('#refresh').onclick=()=>location.reload(); $('#logout').onclick=()=>{write('phoneAuthed',false);location.reload();};},0); wrap.appendChild(summary()); wrap.appendChild(reports()); wrap.appendChild(credits()); wrap.appendChild(help());}
function login(app){const box=make('div','login',`<div class="loginBox"><h1>우리매장 쪽지함</h1><p class="muted">최초 1회 전용 비밀번호를 입력하면 이 핸드폰에서 바로 확인할 수 있습니다.</p><input id="pw" type="password" placeholder="쪽지함 비밀번호 입력"><button class="primary wideBtn" id="go">확인</button></div>`); app.appendChild(box); $('#go').onclick=()=>{if($('#pw').value===state.inboxPw){write('phoneAuthed',true);location.reload();}else alert('비밀번호가 맞지 않습니다');}; $('#pw').addEventListener('keydown',e=>{if(e.key==='Enter')$('#go').click();});}
function summary(){const sales=state.sales||[]; const total=sales.reduce((s,x)=>s+(Number(x.total)||0),0); const unread=(state.reports||[]).filter(r=>!r.read).length; return make('div','card',`<h2>오늘의 쪽지함 요약</h2><div class="statCards"><div class="statCard">새 리포트<br><b>${unread}건</b></div><div class="statCard">저장 리포트<br><b>${(state.reports||[]).length}건</b></div><div class="statCard">누적 매출<br><b>${money(total)}</b></div><div class="statCard">외상건수<br><b>${(state.credits||[]).filter(c=>!c.paid).length}건</b></div></div>`);}
function reports(){const card=make('div','card'); card.innerHTML='<h2>판매통계 / 관리자 쪽지</h2>'; const list=state.reports||[]; if(!list.length){card.innerHTML+='<p class="muted">아직 저장된 리포트가 없습니다. POS 판매통계에서 리포트를 저장하면 이곳에 표시됩니다.</p>';return card;} list.forEach(r=>{const item=make('div','reportCard',`[${r.type||'쪽지'}] ${r.title||'리포트'}\n${dt(r.createdAt)}\n\n${r.body||''}`); card.appendChild(item);}); return card;}
function credits(){const card=make('div','card'); card.innerHTML='<h2>외상장부 요약</h2>'; const rows=(state.credits||[]).filter(c=>!c.paid); if(!rows.length){card.innerHTML+='<p class="muted">미수 외상 내역이 없습니다.</p>';return card;} const table=make('table','table'); table.innerHTML='<thead><tr><th>고객/단체</th><th>발생일</th><th>잔액</th><th>상태</th></tr></thead><tbody></tbody>'; const tb=table.querySelector('tbody'); rows.forEach(c=>tb.appendChild(make('tr',null,`<td>${c.name}</td><td>${dt(c.createdAt)}</td><td>${money(c.remain)}</td><td>미수</td>`))); card.appendChild(table); return card;}
function help(){return make('div','card',`<h2>안내</h2><p class="muted">우리매장 쪽지함은 문자 비용 없이 사장님 핸드폰에서 리포트를 확인하는 공간입니다. 문자 발송은 식당별 발신번호 인증 구조가 준비된 뒤 연결합니다.</p><div class="help">홈 화면에 바로가기를 추가하면 앱처럼 빠르게 확인할 수 있습니다.</div>`);}
render();
})();
