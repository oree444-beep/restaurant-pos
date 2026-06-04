const VERSION="V43";
const params=new URLSearchParams(location.search);
const REST_ID=params.get('restaurantId')||'rest_000001';
const TOKEN=params.get('token')||'';
const shortId=(REST_ID.match(/(\d{6})$/)||[,'000001'])[1];
const K=(name)=>`pos_${VERSION}_${REST_ID}_${name}`;
const get=(key,def)=>{try{const v=localStorage.getItem(K(key));return v?JSON.parse(v):def}catch{return def}};
const set=(key,val)=>localStorage.setItem(K(key),JSON.stringify(val));
const dt=(iso)=>{const d=new Date(iso);return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
let restaurantName=get('restaurantName','생태한마리');
let inboxPw=get('inboxPw','1234');
let inboxToken=get('inboxToken',TOKEN||`token_${shortId}_${VERSION}`);
let inboxAuth=sessionStorage.getItem(K('inboxAuth'))==='1';
let reports=get('reports',seedReports());
let active='전체';
function seedReports(){return[
 {id:'demo1',type:'판매통계',title:'최근 30일 판매통계 리포트',createdAt:new Date().toISOString(),read:false,body:'[기본형]\n최근 30일 매출: 518,000원\n주문건수: 42건\n인기메뉴: 생태탕, 애호박찌개\n\n[세부재료분석형]\n오늘 준비 추천: 생태 15마리, 애호박 5개, 소주 1박스\n\n[요일별 통계]\n금요일·토요일에 매출이 높습니다.'},
 {id:'demo2',type:'외상장부',title:'외상장부 요약',createdAt:new Date(Date.now()-86400000).toISOString(),read:false,body:'미수금 합계: 72,000원\n주요 외상 고객: 생태한마리 외상 3건\n입금 요청이 필요한 내역을 확인하세요.'},
 {id:'demo3',type:'요금/포인트',title:'월 이용료 안내',createdAt:new Date(Date.now()-2*86400000).toISOString(),read:true,body:'현재 이용기간: 2026.07.01 ~ 2026.07.31\n다음 납부 예정일: 2026.08.01\n납부상태: 정상'}
]}
function render(){const app=document.getElementById('ownerInboxApp'); app.innerHTML=''; if(!inboxAuth)return renderLogin(app); const wrap=document.createElement('div'); app.appendChild(wrap); wrap.innerHTML=`<div class="ownerHero"><div class="ownerWrap"><h1>${restaurantName} 우리매장 쪽지함 ${shortId}</h1><p>판매통계 · 외상장부 · 요금/포인트 · 관리자 공지를 핸드폰에서 확인합니다.</p></div></div>`; const body=document.createElement('div'); body.className='ownerWrap'; wrap.appendChild(body);
 const unread=reports.filter(r=>!r.read).length; body.innerHTML=`<div class="help">미확인 ${unread}건 · 카톡/문자 비용 없이 웹으로 확인하는 우리매장 전용 쪽지함입니다.</div>`;
 const nav=document.createElement('div'); nav.className='ownerNav'; ['전체','판매통계','외상장부','요금/포인트','관리자 공지'].forEach(x=>{const b=document.createElement('button'); b.textContent=x; if(active===x)b.className='active'; b.onclick=()=>{active=x;render()}; nav.appendChild(b)}); body.appendChild(nav);
 const list=document.createElement('div'); body.appendChild(list); const filtered=active==='전체'?reports:reports.filter(r=>r.type===active);
 if(!filtered.length) list.innerHTML='<div class="card">표시할 쪽지가 없습니다.</div>';
 filtered.forEach(r=>{const item=document.createElement('div'); item.className='inboxItem'; item.innerHTML=`<div><span class="badge ${r.read?'green':'orange'}">${r.read?'확인':'미확인'}</span> <span class="badge blue">${r.type}</span></div><h3>${r.title}</h3><p class="muted small">${dt(r.createdAt)}</p><div class="reportCard">${r.body}</div><button data-id="${r.id}">${r.read?'다시 미확인':'확인 처리'}</button>`; item.querySelector('button').onclick=()=>{r.read=!r.read; set('reports',reports); render()}; list.appendChild(item)});
 const bottom=document.createElement('div'); bottom.className='bottomBar'; bottom.innerHTML='<button onclick="location.reload()">새로고침</button><button onclick="alert(\'홈화면에 바로가기를 추가하면 다음부터 빠르게 열 수 있습니다.\')">홈화면 추가 안내</button>'; body.appendChild(bottom);
}
function renderLogin(app){const box=document.createElement('div'); box.className='login'; box.innerHTML=`<div class="loginBox"><h1>우리매장 쪽지함</h1><p class="muted">${restaurantName} ${shortId}</p><input id="pw" type="password" placeholder="쪽지함 비밀번호"><button class="primary" id="login">확인</button><p class="muted small">비밀번호는 POS/종합관리에서 발급한 우리매장 쪽지함 전용 비밀번호입니다.</p></div>`; app.appendChild(box); document.getElementById('login').onclick=()=>{if(document.getElementById('pw').value===inboxPw){sessionStorage.setItem(K('inboxAuth'),'1'); inboxAuth=true; render()}else alert('비밀번호가 맞지 않습니다')}; document.getElementById('pw').onkeydown=e=>{if(e.key==='Enter')document.getElementById('login').click()};}
render();
