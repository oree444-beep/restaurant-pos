
import React, { useEffect, useMemo, useState } from 'react';
import './style.css';

const defaultMenus = [
  { id: 1, name: '생태탕', price: 12000, category: '식사류', emoji: '🍲', image: '', soldOut: false },
  { id: 2, name: '애호박찌개', price: 10000, category: '식사류', emoji: '🥘', image: '', soldOut: false },
  { id: 3, name: '소주', price: 5000, category: '주류', emoji: '🍶', image: '', soldOut: false },
  { id: 4, name: '맥주', price: 5000, category: '주류', emoji: '🍺', image: '', soldOut: false },
  { id: 5, name: '콜라', price: 2000, category: '음료', emoji: '🥤', image: '', soldOut: false },
];

const defaultCategories = [
  { name: '식사류', order: 1 },
  { name: '주류', order: 2 },
  { name: '음료', order: 3 },
];

const paymentList = ['현금', '카드', '카드+현금', '상품권', '기타', '외상'];
const emojis = ['🍲','🥘','🍚','🍜','🍱','🍖','🍗','🍺','🍶','🥤','☕','🍽️','🐟','🦀','🍤','🍛'];

function load(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function money(n) { return Number(n || 0).toLocaleString() + '원'; }
function todayText() { return new Date().toLocaleDateString(); }

function resizeImage(file, maxSize = 360, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const ratio = Math.min(maxSize / width, maxSize / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [menus, setMenus] = useState(() => load('menus', defaultMenus));
  const [orders, setOrders] = useState(() => load('orders', {}));
  const [salesHistory, setSalesHistory] = useState(() => load('salesHistory', []));
  const [tableCount, setTableCount] = useState(() => load('tableCount', 12));
  const [takeoutFee, setTakeoutFee] = useState(() => load('takeoutFee', 0));
  const [selectedTable, setSelectedTable] = useState(1);
  const [paymentType, setPaymentType] = useState(() => load('paymentType', {}));
  const [eatType, setEatType] = useState(() => load('eatType', {}));
  const [creditGroup, setCreditGroup] = useState(() => load('creditGroup', {}));
  const [creditProfiles, setCreditProfiles] = useState(() => load('creditProfiles', {}));
  const [warning, setWarning] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => load('adminPassword', '1234'));
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [popularPeriod, setPopularPeriod] = useState('7');
  const [popularLimit, setPopularLimit] = useState(() => load('popularLimit', 5));
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState({});
  const [expandedCredit, setExpandedCredit] = useState({});
  const [showCreditPanel, setShowCreditPanel] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [categories, setCategories] = useState(() => load('categories', defaultCategories));
  const [serviceConfig, setServiceConfig] = useState(() => load('serviceConfig', { dineIn: { label: '', amount: 0 }, takeout: { label: '', amount: 0 } }));
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [toast, setToast] = useState('');
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: '식사류', emoji: '🍽️', image: '', soldOut: false });

  useEffect(() => save('menus', menus), [menus]);
  useEffect(() => save('orders', orders), [orders]);
  useEffect(() => save('salesHistory', salesHistory), [salesHistory]);
  useEffect(() => save('tableCount', tableCount), [tableCount]);
  useEffect(() => save('takeoutFee', takeoutFee), [takeoutFee]);
  useEffect(() => save('paymentType', paymentType), [paymentType]);
  useEffect(() => save('eatType', eatType), [eatType]);
  useEffect(() => save('creditGroup', creditGroup), [creditGroup]);
  useEffect(() => save('creditProfiles', creditProfiles), [creditProfiles]);
  useEffect(() => save('adminPassword', adminPassword), [adminPassword]);
  useEffect(() => save('popularLimit', popularLimit), [popularLimit]);
  useEffect(() => save('categories', categories), [categories]);
  useEffect(() => save('serviceConfig', serviceConfig), [serviceConfig]);

  const currentOrders = orders[selectedTable] || [];
  const currentEat = eatType[selectedTable] || '식당식사';
  const currentPayment = paymentType[selectedTable] || '현금';

  const serviceItem = useMemo(() => {
    const cfg = currentEat === '포장' ? serviceConfig.takeout : serviceConfig.dineIn;
    if (!cfg?.label && !Number(cfg?.amount || 0)) return null;
    return { id: `service-${currentEat}`, name: cfg.label || currentEat, price: Number(cfg.amount || 0), qty: 1, category: '자동추가', isService: true };
  }, [currentEat, serviceConfig]);

  const displayOrders = serviceItem ? [...currentOrders, serviceItem] : currentOrders;
  const total = useMemo(() => displayOrders.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0), [displayOrders]);

  const orderedCategories = useMemo(() => {
    const names = new Set([...categories.map(c => c.name), ...menus.map(m => m.category)]);
    return Array.from(names).map(name => categories.find(c => c.name === name) || { name, order: 999 }).sort((a,b) => Number(a.order||999) - Number(b.order||999));
  }, [categories, menus]);

  const groupedMenus = useMemo(() => {
    const map = {};
    menus.forEach(menu => { if (!map[menu.category]) map[menu.category] = []; map[menu.category].push(menu); });
    return map;
  }, [menus]);

  const filteredSales = useMemo(() => salesHistory.filter(s => {
    if (!dateRange.start && !dateRange.end) return true;
    const t = new Date(s.timestamp || Date.now());
    if (dateRange.start && t < new Date(dateRange.start)) return false;
    if (dateRange.end) { const en = new Date(dateRange.end); en.setHours(23,59,59,999); if (t > en) return false; }
    return true;
  }), [salesHistory, dateRange]);

  const stats = useMemo(() => {
    const byPayment = {}, byEat = {}, byMenu = {}, byHour = {};
    let totalSales = 0, todaySales = 0; const today = todayText();
    filteredSales.forEach(s => {
      totalSales += Number(s.total || 0);
      if (s.date === today) todaySales += Number(s.total || 0);
      byPayment[s.payment] = (byPayment[s.payment] || 0) + Number(s.total || 0);
      byEat[s.eatType] = (byEat[s.eatType] || 0) + Number(s.total || 0);
      const h = new Date(s.timestamp || Date.now()).getHours();
      byHour[h] = (byHour[h] || 0) + Number(s.total || 0);
      (s.items || []).filter(i => !i.isService).forEach(i => {
        if (!byMenu[i.name]) byMenu[i.name] = { qty: 0, amount: 0 };
        byMenu[i.name].qty += Number(i.qty || 0);
        byMenu[i.name].amount += Number(i.qty || 0) * Number(i.price || 0);
      });
    });
    return { totalSales, todaySales, byPayment, byEat, byMenu, byHour };
  }, [filteredSales]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod), now = Date.now(), count = {};
    salesHistory.filter(x => now - Number(x.timestamp || 0) < days * 86400000).forEach(sale => {
      (sale.items || []).filter(i => !i.isService).forEach(item => {
        if (!count[item.name]) count[item.name] = { qty: 0, menu: menus.find(m => m.name === item.name) };
        count[item.name].qty += Number(item.qty || 0);
      });
    });
    return Object.entries(count).sort((a,b)=>b[1].qty-a[1].qty).slice(0, Number(popularLimit || 5));
  }, [salesHistory, popularPeriod, menus, popularLimit]);

  const unpaidCredits = salesHistory.filter(x => x.payment === '외상');
  const groupedCredits = useMemo(() => {
    const sorted = [...unpaidCredits].sort((a,b) => (!!a.paid !== !!b.paid) ? (a.paid ? 1 : -1) : Number(b.timestamp || 0) - Number(a.timestamp || 0));
    return sorted.reduce((acc, item) => { const key = item.credit || '미지정'; if (!acc[key]) acc[key] = []; acc[key].push(item); return acc; }, {});
  }, [unpaidCredits]);
  const creditNames = useMemo(() => Array.from(new Set([...Object.keys(creditProfiles), ...salesHistory.map(x => x.credit).filter(Boolean)])), [creditProfiles, salesHistory]);

  function addMenu(menu) {
    if (menu.soldOut) { setToast(`${menu.name} 메뉴는 품절입니다`); setTimeout(() => setToast(''), 1800); return; }
    setOrders(prev => {
      const tableOrders = [...(prev[selectedTable] || [])];
      const find = tableOrders.find(x => x.id === menu.id);
      if (find) find.qty += 1; else tableOrders.push({ ...menu, qty: 1 });
      return { ...prev, [selectedTable]: tableOrders };
    });
  }
  function changeQty(id, diff) {
    setOrders(prev => ({ ...prev, [selectedTable]: (prev[selectedTable] || []).map(item => item.id === id ? { ...item, qty: item.qty + diff } : item).filter(item => item.qty > 0) }));
  }
  function completePayment({ print = false } = {}) {
    if (currentOrders.length === 0) { setWarning('메뉴를 선택해주세요'); return; }
    if (currentPayment === '외상' && !(creditGroup[selectedTable] || '').trim()) { setWarning('⚠️ 외상 단체명을 입력 또는 선택해주세요 ⚠️'); return; }
    const credit = creditGroup[selectedTable] || ''; const profile = creditProfiles[credit] || {};
    const sale = { id: Date.now(), table: selectedTable, eatType: currentEat, payment: currentPayment, credit, creditPhone: profile.phone || '', creditMemo: profile.memo || '', total, remainingAmount: currentPayment === '외상' ? total : 0, items: displayOrders, paid: currentPayment !== '외상', partialPayments: [], timestamp: Date.now(), date: todayText(), time: new Date().toLocaleTimeString() };
    setSalesHistory(prev => [sale, ...prev]);
    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setWarning(''); setToast(`${selectedTable}번 테이블 결제되었습니다`); setTimeout(() => setToast(''), 2200);
    if (print) setTimeout(() => printReceipt(sale), 100);
  }
  function printReceipt(sale) {
    const rows = (sale.items || []).map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${money(Number(i.price||0)*Number(i.qty||1))}</td></tr>`).join('');
    const html = `<html><head><title>영수증</title><style>body{font-family:Arial,sans-serif;width:280px;padding:12px}h2{text-align:center;margin:0 0 12px}table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dashed #ccc;font-size:13px}.total{font-size:20px;font-weight:800;text-align:right;margin-top:12px}.center{text-align:center}</style></head><body><h2>식당 POS</h2><div>일시: ${sale.date} ${sale.time}</div><div>테이블: ${sale.table}번 / ${sale.eatType}</div><div>결제: ${sale.payment}</div><hr/><table>${rows}</table><div class="total">합계 ${money(sale.total)}</div><p class="center">감사합니다</p><script>window.print(); setTimeout(()=>window.close(), 500);</script></body></html>`;
    const w = window.open('', 'receipt', 'width=360,height=600'); if (w) { w.document.write(html); w.document.close(); }
  }
  async function handleImage(file) { if (!file) return; const resized = await resizeImage(file); setNewMenu(prev => ({ ...prev, image: resized })); }
  function addNewMenu() {
    if (!newMenu.name || !newMenu.price) { alert('메뉴명과 가격을 입력해주세요'); return; }
    const category = newMenu.category || '식사류';
    if (!categories.find(c => c.name === category)) setCategories(prev => [...prev, { name: category, order: prev.length + 1 }]);
    setMenus(prev => [...prev, { ...newMenu, id: Date.now(), price: Number(newMenu.price), category }]);
    setNewMenu({ name: '', price: '', category: '식사류', emoji: '🍽️', image: '', soldOut: false });
  }
  function updateMenu(id, patch) { setMenus(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m)); }
  function exportCSV() {
    const rows = filteredSales.map(x => [x.date, x.time, x.table, x.eatType, x.payment, x.credit || '', x.total].join(','));
    downloadText('매출통계.csv', ['날짜,시간,테이블,이용방식,결제,외상단체,금액', ...rows].join('\n'));
  }
  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  }
  function backupAll({ share = false } = {}) {
    const data = { menus, orders, salesHistory, tableCount, takeoutFee, paymentType, eatType, creditGroup, creditProfiles, adminPassword, popularLimit, categories, serviceConfig, createdAt: new Date().toISOString() };
    const text = JSON.stringify(data, null, 2); const file = new File([text], 'pos-backup.json', { type: 'application/json' });
    if (share && navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ title: 'POS 백업파일', text: 'POS 전체 백업파일입니다.', files: [file] });
    else downloadText('pos-backup.json', text);
  }
  function restoreBackup(file) {
    if (!file) return; const reader = new FileReader(); reader.onload = () => {
      try { const data = JSON.parse(reader.result); if (!confirm('백업파일로 복구할까요? 현재 데이터가 바뀝니다.')) return;
        setMenus(data.menus || defaultMenus); setOrders(data.orders || {}); setSalesHistory(data.salesHistory || []); setTableCount(data.tableCount || 12); setTakeoutFee(data.takeoutFee || 0); setPaymentType(data.paymentType || {}); setEatType(data.eatType || {}); setCreditGroup(data.creditGroup || {}); setCreditProfiles(data.creditProfiles || {}); setAdminPassword(data.adminPassword || '1234'); setPopularLimit(data.popularLimit || 5); setCategories(data.categories || defaultCategories); setServiceConfig(data.serviceConfig || { dineIn:{label:'',amount:0}, takeout:{label:'',amount:0} }); alert('복구 완료');
      } catch { alert('백업파일을 읽을 수 없습니다'); }
    }; reader.readAsText(file);
  }
  function resetData(kind) {
    const text = prompt(`${kind} 초기화를 진행하려면 "초기화"를 입력하세요`); if (text !== '초기화') return;
    if (kind === '주문') setOrders({});
    if (kind === '판매/외상') setSalesHistory([]);
    if (kind === '전체') { setOrders({}); setSalesHistory([]); setMenus(defaultMenus); setCategories(defaultCategories); setCreditProfiles({}); }
  }
  function paySelectedCredits(groupName) {
    const selectedIds = Object.entries(checkedCredit).filter(([,v]) => v).map(([k]) => Number(k));
    if (!selectedIds.length) return alert('선택된 외상내역이 없습니다');
    const selectedItems = salesHistory.filter(s => selectedIds.includes(s.id)); const hasPaid = selectedItems.some(s => s.paid);
    if (hasPaid) { setSalesHistory(prev => prev.map(s => selectedIds.includes(s.id) && s.paid ? { ...s, paid: false, remainingAmount: s.total } : s)); setCheckedCredit({}); return; }
    const amount = Number(partialAmount[groupName] || 0);
    if (!amount) { setSalesHistory(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, paid: true, remainingAmount: 0 } : s)); setCheckedCredit({}); return; }
    let rest = amount;
    setSalesHistory(prev => prev.map(s => {
      if (!selectedIds.includes(s.id) || rest <= 0 || s.paid) return s;
      const before = Number(s.remainingAmount ?? s.total), pay = Math.min(before, rest); rest -= pay; const remain = before - pay;
      return { ...s, remainingAmount: remain, paid: remain <= 0, partialPayments: [...(s.partialPayments || []), { amount: pay, date: new Date().toLocaleString() }] };
    }));
    setPartialAmount(prev => ({ ...prev, [groupName]: '' })); setCheckedCredit({});
  }
  const tableRows = useMemo(() => { const count = Number(tableCount || 1), top = Math.ceil(count / 2), arr = Array.from({ length: count }, (_, i) => i + 1); return [arr.slice(0, top), arr.slice(top)]; }, [tableCount]);

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}
      <header className="top"><div><h1>식당 POS</h1><p>주문 · 외상장부 · 판매통계 · 관리자</p></div><div className="top-actions"><button className="dark" onClick={() => { setAdminMode(true); setAdminUnlocked(false); }}>관리자모드</button><button className="green" onClick={exportCSV}>CSV 다운로드</button></div></header>
      <section className="tables">{tableRows.map((row, idx) => <div className="table-row" key={idx}>{row.map(n => { const hasOrder = (orders[n] || []).length > 0; return <button key={n} onClick={() => setSelectedTable(n)} className={`table-btn ${selectedTable === n ? 'selected' : hasOrder ? 'has-order' : ''}`}>{n}번</button>; })}</div>)}</section>
      <section className="popular"><div className="section-title">🔥 인기메뉴</div><div className="periods">{[['1','오늘'], ['7','최근7일'], ['30','최근30일']].map(([v,label]) => <button key={v} onClick={() => setPopularPeriod(v)} className={popularPeriod === v ? 'active' : ''}>{label}</button>)}</div><div className="popular-list">{popularMenus.length === 0 && <span className="muted">결제 후 인기메뉴가 표시됩니다</span>}{popularMenus.map(([name, info]) => { const item = info.menu || menus.find(m => m.name === name); if (!item) return null; return <button className="popular-card" key={name} onClick={() => addMenu(item)}>{item.image ? <img src={item.image} /> : <span className="emoji">{item.emoji}</span>}<b>{name}</b><small>{info.qty}개 판매</small></button>; })}</div></section>
      <div className="main-grid"><main className="menu-area"><div className="eat-buttons"><button className={currentEat === '식당식사' ? 'active' : ''} onClick={() => setEatType(p=>({...p,[selectedTable]:'식당식사'}))}>식당식사</button><button className={currentEat === '포장' ? 'active gray' : 'gray'} onClick={() => setEatType(p=>({...p,[selectedTable]:'포장'}))}>포장</button></div>{orderedCategories.map(cat => <section className="menu-section" key={cat.name}><h2>{cat.name}</h2><div className="menu-grid">{(groupedMenus[cat.name] || []).map(item => <button className={`menu-card ${item.soldOut ? 'soldout' : ''}`} key={item.id} onClick={() => addMenu(item)}><div className="image-wrap">{item.image ? <img src={item.image} alt="" /> : <span className="emoji big">{item.emoji}</span>}</div>{item.soldOut && <div className="soldout-badge">품절</div>}<b>{item.name}</b><span>{money(item.price)}</span></button>)}</div></section>)}</main>
        <aside className="order-panel"><h2>주문내역 ({selectedTable}번)</h2><div className="order-list">{displayOrders.length === 0 && <div className="empty">메뉴를 선택해주세요</div>}{displayOrders.map(item => <div className={`order-item ${item.isService ? 'service' : ''}`} key={item.id}><div><b>{item.name}</b><span>{money(item.price)} x {item.qty}</span></div>{!item.isService && <div className="qty"><button onClick={() => changeQty(item.id, -1)}>-</button><button onClick={() => changeQty(item.id, 1)}>+</button></div>}</div>)}</div>{warning && <div className="warning">{warning}</div>}{currentPayment === '외상' && <div className="credit-input"><input list="creditNames" value={creditGroup[selectedTable] || ''} onChange={e => setCreditGroup(p=>({...p,[selectedTable]:e.target.value}))} placeholder="외상 단체명 입력 또는 선택" /><datalist id="creditNames">{creditNames.map(n => <option value={n} key={n} />)}</datalist><input value={creditProfiles[creditGroup[selectedTable] || '']?.phone || ''} onChange={e => { const name=creditGroup[selectedTable]||''; if(!name)return; setCreditProfiles(p=>({...p,[name]:{...(p[name]||{}),phone:e.target.value}})); }} placeholder="연락처 선택입력" /><input value={creditProfiles[creditGroup[selectedTable] || '']?.memo || ''} onChange={e => { const name=creditGroup[selectedTable]||''; if(!name)return; setCreditProfiles(p=>({...p,[name]:{...(p[name]||{}),memo:e.target.value}})); }} placeholder="기본메모 선택입력" /></div>}<div className="payments">{paymentList.map(type => <button key={type} className={currentPayment === type ? 'pay-active' : ''} onClick={() => setPaymentType(p=>({...p,[selectedTable]:type}))}>{type}</button>)}</div><div className="total"><b>총 금액</b><strong>{money(total)}</strong></div><button className="pay" onClick={() => completePayment()}>결제완료</button><button className="pay print" onClick={() => completePayment({ print: true })}>결제완료 + 영수증 출력</button></aside>
      </div>
      <div className="bottom-panels"><button className="panel-tab orange" onClick={() => setShowCreditPanel(v => !v)}>외상장부 {showCreditPanel ? '▲' : '▼'}</button><button className="panel-tab blue" onClick={() => setShowStatsPanel(v => !v)}>판매통계 {showStatsPanel ? '▲' : '▼'}</button></div>
      {showCreditPanel && <section className="panel credit-panel"><h2>외상장부</h2>{Object.keys(groupedCredits).length === 0 && <p className="muted">외상내역이 없습니다</p>}{Object.entries(groupedCredits).map(([group, list]) => { const totalRemain = list.reduce((s,x)=>s+Number(x.remainingAmount || 0),0); const selectedIds = Object.entries(checkedCredit).filter(([,v])=>v).map(([k])=>Number(k)); const selectedPaid = list.some(x => selectedIds.includes(x.id) && x.paid); return <div className="credit-group" key={group}><div className="credit-head" onClick={() => setExpandedCredit(p=>({...p,[group]:!p[group]}))}><div><b>{group}</b><span>{creditProfiles[group]?.phone} {creditProfiles[group]?.memo && ` / ${creditProfiles[group]?.memo}`}</span></div><strong>잔액 {money(totalRemain)}</strong></div>{expandedCredit[group] !== false && <><>{list.map(item => <div className={`credit-row ${item.paid ? 'paid' : ''} ${checkedCredit[item.id] ? 'checked' : ''}`} key={item.id}><input type="checkbox" checked={!!checkedCredit[item.id]} onChange={e => setCheckedCredit(p=>({...p,[item.id]:e.target.checked}))} /><div className="credit-info"><b>{item.date} / {item.table}번 테이블 {item.paid && ' · 결제완료'}</b><span>{(item.items || []).map(x => `${x.name} ${x.qty}개`).join(', ')}</span>{(item.partialPayments || []).map((p,i)=><small key={i}>부분결제 {money(p.amount)} / {p.date}</small>)}</div><strong>{money(item.remainingAmount ?? item.total)}</strong></div>)}</><div className="credit-actions"><input type="number" value={partialAmount[group] || ''} onChange={e => setPartialAmount(p=>({...p,[group]:e.target.value}))} placeholder="부분결제 금액, 비우면 완납" /><button className={selectedPaid ? 'red' : 'green'} onClick={() => paySelectedCredits(group)}>{selectedPaid ? '선택완납처리해제' : '선택완납처리'}</button></div></>}</div>; })}</section>}
      {showStatsPanel && <section className="panel stats-panel"><h2>판매통계</h2><div className="date-row"><input type="date" value={dateRange.start} onChange={e => setDateRange(p=>({...p,start:e.target.value}))} /><input type="date" value={dateRange.end} onChange={e => setDateRange(p=>({...p,end:e.target.value}))} /><button className="green" onClick={exportCSV}>기간통계 CSV</button></div><div className="stat-grid"><div className="stat"><span>오늘 매출</span><b>{money(stats.todaySales)}</b></div><div className="stat"><span>기간 매출</span><b>{money(stats.totalSales)}</b></div>{Object.entries(stats.byPayment).map(([k,v]) => <div className="stat" key={k}><span>{k}</span><b>{money(v)}</b></div>)}{Object.entries(stats.byEat).map(([k,v]) => <div className="stat" key={k}><span>{k}</span><b>{money(v)}</b></div>)}</div><div className="stat-columns"><div><h3>메뉴별 판매량</h3>{Object.entries(stats.byMenu).map(([name, v]) => <p key={name}><b>{name}</b> {v.qty}개 / {money(v.amount)}</p>)}</div><div><h3>시간대별 매출</h3>{Object.entries(stats.byHour).sort((a,b)=>a[0]-b[0]).map(([h,v]) => <p key={h}><b>{h}시</b> {money(v)}</p>)}</div></div></section>}
      {adminMode && <div className="modal"><div className="admin"><button className="close" onClick={() => setAdminMode(false)}>×</button>{!adminUnlocked ? <div className="login"><h2>관리자 비밀번호</h2><input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="비밀번호" /><button className="dark" onClick={() => { if (passwordInput === adminPassword) setAdminUnlocked(true); else alert('비밀번호가 틀렸습니다'); }}>확인</button><p className="muted">기본 비밀번호는 1234입니다.</p></div> : <><h2>관리자모드</h2><div className="admin-card add-menu"><h3>메뉴 추가</h3><div className="admin-grid"><input value={newMenu.name} onChange={e => setNewMenu(p=>({...p,name:e.target.value}))} placeholder="메뉴명" /><input type="number" value={newMenu.price} onChange={e => setNewMenu(p=>({...p,price:e.target.value}))} placeholder="가격" /><select value={newMenu.category} onChange={e => setNewMenu(p=>({...p,category:e.target.value}))}>{orderedCategories.map(c => <option key={c.name}>{c.name}</option>)}</select><input value={newMenu.category} onChange={e => setNewMenu(p=>({...p,category:e.target.value}))} placeholder="새 메뉴구분 입력 가능" /></div><div className="emoji-list">{emojis.map(e => <button className={newMenu.emoji === e ? 'picked' : ''} key={e} onClick={() => setNewMenu(p=>({...p,emoji:e}))}>{e}</button>)}</div><input type="file" accept="image/*" onChange={e => handleImage(e.target.files?.[0])} />{newMenu.image && <img className="preview" src={newMenu.image} />}<button className="green" onClick={addNewMenu}>메뉴추가</button></div><div className="admin-card"><h3>현재 메뉴 / 품절 / 수정</h3>{menus.map(m => <div className="admin-menu-row" key={m.id}><label><input type="checkbox" checked={!!m.soldOut} onChange={() => updateMenu(m.id,{soldOut:!m.soldOut})} /> 품절</label><input value={m.name} onChange={e => updateMenu(m.id,{name:e.target.value})} /><input type="number" value={m.price} onChange={e => updateMenu(m.id,{price:Number(e.target.value)})} /><input value={m.category} onChange={e => updateMenu(m.id,{category:e.target.value})} /><button className="red" onClick={() => setMenus(prev => prev.filter(x => x.id !== m.id))}>삭제</button></div>)}</div><div className="admin-card"><h3>메뉴구분 순서</h3>{categories.map((c, i) => <div className="category-row" key={i}><input value={c.name} onChange={e => setCategories(prev => prev.map((x,idx)=>idx===i?{...x,name:e.target.value}:x))} /><input type="number" value={c.order} onChange={e => setCategories(prev => prev.map((x,idx)=>idx===i?{...x,order:Number(e.target.value)}:x))} /></div>)}<button onClick={() => setCategories(prev => [...prev, { name: '새구분', order: prev.length + 1 }])}>구분추가</button></div><div className="admin-card"><h3>식당이용 / 포장 자동추가</h3><div className="admin-grid"><input value={serviceConfig.dineIn.label} onChange={e => setServiceConfig(p=>({...p,dineIn:{...p.dineIn,label:e.target.value}}))} placeholder="식당이용 내용" /><input type="number" value={serviceConfig.dineIn.amount} onChange={e => setServiceConfig(p=>({...p,dineIn:{...p.dineIn,amount:Number(e.target.value)}}))} placeholder="식당이용 금액" /><input value={serviceConfig.takeout.label} onChange={e => setServiceConfig(p=>({...p,takeout:{...p.takeout,label:e.target.value}}))} placeholder="포장 내용" /><input type="number" value={serviceConfig.takeout.amount} onChange={e => setServiceConfig(p=>({...p,takeout:{...p.takeout,amount:Number(e.target.value)}}))} placeholder="포장 금액" /></div></div><div className="admin-card"><h3>시스템 설정</h3><div className="admin-grid"><input type="number" value={tableCount} onChange={e => setTableCount(Number(e.target.value || 1))} placeholder="테이블수" /><input type="number" value={popularLimit} onChange={e => setPopularLimit(Number(e.target.value || 1))} placeholder="인기메뉴 표시 개수" /><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="새 비밀번호" /><button onClick={() => { if(newPassword){ setAdminPassword(newPassword); setNewPassword(''); alert('비밀번호 변경 완료'); }}}>비밀번호 변경</button></div></div><div className="admin-card"><h3>데이터 관리</h3><div className="data-actions"><button onClick={() => backupAll()}>전체백업 다운로드<br/><small>메뉴/판매통계/외상장부를 저장합니다</small></button><button onClick={() => backupAll({share:true})}>전체백업 공유하기<br/><small>카톡/문자/메일로 백업파일을 공유합니다</small></button><label className="file-label">백업파일 불러오기<br/><small>저장한 백업파일로 복구합니다</small><input type="file" accept=".json" onChange={e => restoreBackup(e.target.files?.[0])} /></label><button onClick={() => resetData('주문')}>테스트 주문 초기화<br/><small>현재 주문내역만 삭제합니다</small></button><button className="danger" onClick={() => resetData('판매/외상')}>판매/외상 데이터 초기화<br/><small>판매통계와 외상장부를 삭제합니다</small></button><button className="danger" onClick={() => resetData('전체')}>전체 초기화<br/><small>메뉴/판매/외상/설정을 모두 삭제합니다</small></button></div></div></>}</div></div>}
    </div>
  );
}
