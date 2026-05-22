
import React, { useEffect, useMemo, useRef, useState } from 'react';

const defaultMenus = [
  { id: 1, name: '생태탕', price: 12000, category: '식사류', emoji: '🍲', image: '', soldOut: false },
  { id: 2, name: '애호박찌개', price: 10000, category: '식사류', emoji: '🥘', image: '', soldOut: false },
  { id: 3, name: '소주', price: 5000, category: '주류', emoji: '🍶', image: '', soldOut: false }
];

const paymentList = ['현금', '카드', '카드+현금', '상품권', '기타', '외상'];
const emojiList = ['🍲','🥘','🍽️','🍚','🍜','🐟','🥩','🍗','🍶','🍺','🥤','🧃','☕','🍱'];

function load(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function resizeImageFile(file, maxSize = 600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatWon(n) {
  return Number(n || 0).toLocaleString() + '원';
}

export default function App() {
  const [menus, setMenus] = useState(() => {
    const loaded = load('menus', defaultMenus);
    return loaded.map(m => ({ soldOut: false, image: '', emoji: '🍽️', ...m, category: m.category || m.group || '식사류' }));
  });
  const [orders, setOrders] = useState(() => load('orders', {}));
  const [salesHistory, setSalesHistory] = useState(() => load('salesHistory', []));
  const [selectedTable, setSelectedTable] = useState(1);
  const [tableCount, setTableCount] = useState(() => load('tableCount', 12));
  const [paymentType, setPaymentType] = useState(() => load('paymentType', {}));
  const [creditGroup, setCreditGroup] = useState(() => load('creditGroup', {}));
  const [warning, setWarning] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => load('adminPassword', '1234'));
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [eatType, setEatType] = useState(() => load('eatType', {}));
  const [popularPeriod, setPopularPeriod] = useState('7');
  const [popularLimit, setPopularLimit] = useState(() => load('popularLimit', 5));
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState({});
  const [expandedCreditGroups, setExpandedCreditGroups] = useState({});
  const [showCreditDrawer, setShowCreditDrawer] = useState(false);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);
  const [statsStart, setStatsStart] = useState('');
  const [statsEnd, setStatsEnd] = useState('');
  const [receiptPrintEnabled, setReceiptPrintEnabled] = useState(() => load('receiptPrintEnabled', true));
  const [serviceOptions, setServiceOptions] = useState(() => load('serviceOptions', {
    dine: { label: '', amount: 0 },
    takeout: { label: '포장용기', amount: 0 }
  }));
  const [newMenu, setNewMenu] = useState({
    id: null, name: '', price: '', category: '식사류', emoji: '🍽️', image: '', soldOut: false
  });
  const restoreRef = useRef(null);

  useEffect(() => save('menus', menus), [menus]);
  useEffect(() => save('orders', orders), [orders]);
  useEffect(() => save('salesHistory', salesHistory), [salesHistory]);
  useEffect(() => save('tableCount', tableCount), [tableCount]);
  useEffect(() => save('paymentType', paymentType), [paymentType]);
  useEffect(() => save('creditGroup', creditGroup), [creditGroup]);
  useEffect(() => save('eatType', eatType), [eatType]);
  useEffect(() => save('popularLimit', popularLimit), [popularLimit]);
  useEffect(() => save('serviceOptions', serviceOptions), [serviceOptions]);
  useEffect(() => save('adminPassword', adminPassword), [adminPassword]);
  useEffect(() => save('receiptPrintEnabled', receiptPrintEnabled), [receiptPrintEnabled]);

  const currentOrders = orders[selectedTable] || [];
  const currentEat = eatType[selectedTable] || '식당식사';
  const autoOption = currentEat === '포장' ? serviceOptions.takeout : serviceOptions.dine;
  const autoCharge = Number(autoOption?.amount || 0);
  const autoLabel = autoOption?.label?.trim() || '';

  const subtotal = useMemo(() => currentOrders.reduce((sum, item) => sum + item.price * item.qty, 0), [currentOrders]);
  const total = subtotal + (autoLabel || autoCharge ? autoCharge : 0);

  const tableColumns = Math.ceil(Number(tableCount || 1) / 2);

  const groupedMenus = useMemo(() => menus.reduce((acc, menu) => {
    const cat = menu.category || '기타';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(menu);
    return acc;
  }, {}), [menus]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod);
    const now = Date.now();
    const count = {};
    salesHistory
      .filter(x => now - Number(x.timestamp || 0) < days * 24 * 60 * 60 * 1000)
      .forEach(sale => sale.items.forEach(item => {
        count[item.name] = (count[item.name] || 0) + item.qty;
      }));
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, Number(popularLimit || 5));
  }, [salesHistory, popularPeriod, popularLimit]);

  const unpaidCredits = salesHistory.filter(x => x.payment === '외상');
  const groupedCredits = useMemo(() => {
    const acc = {};
    unpaidCredits.forEach(item => {
      const key = item.credit || '미지정';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
    });
    Object.values(acc).forEach(list => list.sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return Number(b.timestamp || 0) - Number(a.timestamp || 0);
    }));
    return acc;
  }, [unpaidCredits]);

  const filteredSales = useMemo(() => {
    return salesHistory.filter(s => {
      if (!statsStart && !statsEnd) return true;
      const t = Number(s.timestamp || 0);
      const start = statsStart ? new Date(statsStart).setHours(0, 0, 0, 0) : 0;
      const end = statsEnd ? new Date(statsEnd).setHours(23, 59, 59, 999) : Date.now();
      return t >= start && t <= end;
    });
  }, [salesHistory, statsStart, statsEnd]);

  const stats = useMemo(() => {
    const payment = {}, eat = {}, menu = {}, hour = {};
    filteredSales.forEach(s => {
      payment[s.payment] = (payment[s.payment] || 0) + s.total;
      eat[s.eatType || '식당식사'] = (eat[s.eatType || '식당식사'] || 0) + s.total;
      const h = new Date(s.timestamp).getHours();
      hour[h] = (hour[h] || 0) + s.total;
      s.items.forEach(i => {
        if (!menu[i.name]) menu[i.name] = { qty: 0, amount: 0 };
        menu[i.name].qty += i.qty;
        menu[i.name].amount += i.price * i.qty;
      });
      if (s.serviceCharge?.label) {
        if (!menu[s.serviceCharge.label]) menu[s.serviceCharge.label] = { qty: 1, amount: 0 };
        menu[s.serviceCharge.label].amount += Number(s.serviceCharge.amount || 0);
      }
    });
    return { payment, eat, menu, hour };
  }, [filteredSales]);

  function addMenu(menu) {
    if (!menu || menu.soldOut) {
      alert('품절 메뉴입니다');
      return;
    }
    setOrders(prev => {
      const tableOrders = [...(prev[selectedTable] || [])];
      const find = tableOrders.find(x => x.id === menu.id);
      if (find) find.qty += 1;
      else tableOrders.push({ ...menu, qty: 1 });
      return { ...prev, [selectedTable]: tableOrders };
    });
  }

  function changeQty(id, diff) {
    setOrders(prev => ({
      ...prev,
      [selectedTable]: (prev[selectedTable] || [])
        .map(item => item.id === id ? { ...item, qty: item.qty + diff } : item)
        .filter(item => item.qty > 0)
    }));
  }

  function createSale() {
    const payment = paymentType[selectedTable] || '현금';
    if (payment === '외상' && !(creditGroup[selectedTable] || '').trim()) {
      setWarning('⚠️ 단체명을 입력 또는 선택해주세요 ⚠️');
      return null;
    }
    if (currentOrders.length === 0 && !autoCharge) {
      alert('주문내역이 없습니다');
      return null;
    }
    const now = new Date();
    return {
      id: Date.now(),
      table: selectedTable,
      eatType: currentEat,
      payment,
      credit: creditGroup[selectedTable] || '',
      total,
      remainingAmount: payment === '외상' ? total : 0,
      items: currentOrders,
      serviceCharge: autoLabel || autoCharge ? { label: autoLabel || currentEat + ' 추가금', amount: autoCharge } : null,
      paid: payment !== '외상',
      partialPayments: [],
      timestamp: now.getTime(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString()
    };
  }

  function completePayment(printReceipt = false) {
    const sale = createSale();
    if (!sale) return;
    setSalesHistory(prev => [sale, ...prev]);
    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setWarning('');
    setCreditGroup(prev => ({ ...prev, [selectedTable]: '' }));
    if (printReceipt || receiptPrintEnabled) setTimeout(() => printReceiptWindow(sale), 100);
    alert('결제완료');
  }

  function printReceiptWindow(sale) {
    const lines = [
      '식당 POS 영수증',
      '------------------------------',
      `날짜: ${sale.date} ${sale.time}`,
      `테이블: ${sale.table}번`,
      `구분: ${sale.eatType}`,
      `결제: ${sale.payment}`,
      '------------------------------',
      ...sale.items.map(i => `${i.name} x${i.qty}  ${formatWon(i.price * i.qty)}`),
      ...(sale.serviceCharge ? [`${sale.serviceCharge.label}  ${formatWon(sale.serviceCharge.amount)}`] : []),
      '------------------------------',
      `합계: ${formatWon(sale.total)}`,
      '감사합니다'
    ].join('\n');
    const win = window.open('', '_blank', 'width=360,height=600');
    if (!win) return alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
    win.document.write(`<html><head><title>영수증</title><style>body{font-family:monospace;font-size:14px;padding:12px;white-space:pre-wrap}</style></head><body>${lines}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  async function handleMenuImage(file) {
    if (!file) return;
    try {
      const image = await resizeImageFile(file, 600, 0.75);
      setNewMenu(prev => ({ ...prev, image }));
    } catch {
      alert('이미지 처리 중 오류가 발생했습니다');
    }
  }

  function addNewMenu() {
    if (!newMenu.name || !newMenu.price) return alert('메뉴명과 가격을 입력해주세요');
    if (newMenu.id) {
      setMenus(prev => prev.map(m => m.id === newMenu.id ? { ...newMenu, price: Number(newMenu.price), id: newMenu.id } : m));
    } else {
      setMenus(prev => [...prev, { ...newMenu, id: Date.now(), price: Number(newMenu.price) }]);
    }
    setNewMenu({ id: null, name: '', price: '', category: '식사류', emoji: '🍽️', image: '', soldOut: false });
  }

  function payCreditItem(item, amount) {
    const pay = Number(amount || 0);
    if (pay <= 0) return alert('결제금액을 입력해주세요');
    setSalesHistory(prev => prev.map(x => {
      if (x.id !== item.id) return x;
      const remain = Number(x.remainingAmount || x.total || 0) - pay;
      return {
        ...x,
        remainingAmount: remain > 0 ? remain : 0,
        paid: remain <= 0,
        partialPayments: [...(x.partialPayments || []), { amount: pay, date: new Date().toLocaleString() }]
      };
    }));
    setPartialAmount(prev => ({ ...prev, [item.id]: '' }));
  }

  function paySelectedCredits() {
    const ids = Object.keys(checkedCredit).filter(id => checkedCredit[id]);
    if (ids.length === 0) return alert('선택된 외상내역이 없습니다');
    setSalesHistory(prev => prev.map(x => ids.includes(String(x.id)) ? {
      ...x,
      remainingAmount: 0,
      paid: true,
      partialPayments: [...(x.partialPayments || []), { amount: Number(x.remainingAmount || x.total || 0), date: new Date().toLocaleString(), memo: '완납' }]
    } : x));
    setCheckedCredit({});
  }

  function exportCSV() {
    const rows = [['날짜','시간','테이블','구분','결제','메뉴','수량','금액','총액']];
    filteredSales.forEach(s => {
      s.items.forEach(i => rows.push([s.date, s.time, s.table, s.eatType, s.payment, i.name, i.qty, i.price * i.qty, s.total]));
      if (s.serviceCharge) rows.push([s.date, s.time, s.table, s.eatType, s.payment, s.serviceCharge.label, 1, s.serviceCharge.amount, s.total]);
    });
    downloadText(rows.map(r => r.join(',')).join('\n'), '매출통계.csv', 'text/csv;charset=utf-8;');
  }

  function backupData() {
    const data = { menus, orders, salesHistory, tableCount, paymentType, creditGroup, eatType, serviceOptions, popularLimit, adminPassword, receiptPrintEnabled, exportedAt: new Date().toISOString() };
    return JSON.stringify(data, null, 2);
  }

  function downloadBackup() {
    downloadText(backupData(), 'pos-backup.json', 'application/json');
  }

  async function shareBackup() {
    const file = new File([backupData()], 'pos-backup.json', { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'POS 백업파일' });
    } else {
      downloadBackup();
      alert('이 기기는 공유창을 지원하지 않아 백업파일을 다운로드했습니다');
    }
  }

  function downloadText(text, filename, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }

  function restoreBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm('백업파일을 불러오면 현재 데이터가 바뀝니다. 진행할까요?')) return;
        setMenus(data.menus || defaultMenus);
        setOrders(data.orders || {});
        setSalesHistory(data.salesHistory || []);
        setTableCount(data.tableCount || 12);
        setPaymentType(data.paymentType || {});
        setCreditGroup(data.creditGroup || {});
        setEatType(data.eatType || {});
        setServiceOptions(data.serviceOptions || { dine: {label:'', amount:0}, takeout:{label:'포장용기', amount:0} });
        setPopularLimit(data.popularLimit || 5);
        alert('복구완료');
      } catch {
        alert('백업파일을 읽을 수 없습니다');
      }
    };
    reader.readAsText(file);
  }

  function resetWithKeyword(type) {
    const input = prompt('정말 초기화하시겠습니까?\n계속하려면 "초기화"를 입력하세요.');
    if (input !== '초기화') return;
    if (type === 'orders') setOrders({});
    if (type === 'sales') setSalesHistory([]);
    if (type === 'all') {
      setMenus(defaultMenus); setOrders({}); setSalesHistory([]); setTableCount(12);
    }
  }

  const totalSales = filteredSales.reduce((sum, x) => sum + Number(x.total || 0), 0);
  const todaySales = salesHistory.filter(x => x.date === new Date().toLocaleDateString()).reduce((sum, x) => sum + Number(x.total || 0), 0);

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="title">식당 POS</div>
          <div className="sub">주문 · 외상장부 · 판매통계 · 관리자</div>
        </div>
        <div className="row">
          <button className="btn black" onClick={() => {
            if (adminUnlocked) { setAdminUnlocked(false); return; }
            const pw = prompt('관리자 비밀번호를 입력하세요');
            if (pw === adminPassword) setAdminUnlocked(true);
            else if (pw !== null) alert('비밀번호가 틀렸습니다');
          }}>{adminUnlocked ? '관리자모드 해제' : '관리자모드'}</button>
          <button className="btn green" onClick={exportCSV}>CSV 다운로드</button>
        </div>
      </div>

      <div className="table-grid" style={{ gridTemplateColumns: `repeat(${tableColumns}, minmax(0, 1fr))` }}>
        {Array.from({ length: tableCount }, (_, i) => i + 1).map(n => {
          const hasOrder = (orders[n] || []).length > 0;
          return (
            <button key={n} onClick={() => setSelectedTable(n)}
              className={`table-btn ${selectedTable === n ? 'selected' : hasOrder ? 'has-order' : ''}`}>
              {n}번
            </button>
          );
        })}
      </div>

      {adminUnlocked && (
        <div className="panel">
          <h2 className="section-title">관리자모드</h2>
          <div className="admin-grid">
            <div className="card">
              <h3>메뉴추가 / 수정</h3>
              <input className="input" placeholder="메뉴명" value={newMenu.name} onChange={e => setNewMenu(p => ({...p, name:e.target.value}))} />
              <input className="input" placeholder="가격" type="number" value={newMenu.price} onChange={e => setNewMenu(p => ({...p, price:e.target.value}))} />
              <input className="input" placeholder="카테고리" value={newMenu.category} onChange={e => setNewMenu(p => ({...p, category:e.target.value}))} />
              <div className="label">이모지 선택</div>
              <div className="row">{emojiList.map(em => <button key={em} className={`btn white ${newMenu.emoji===em?'blue':''}`} onClick={() => setNewMenu(p => ({...p, emoji:em, image:p.image}))}>{em}</button>)}</div>
              <div className="label">이미지 선택 <span className="small-note">(자동축소)</span></div>
              <input type="file" accept="image/*" onChange={e => handleMenuImage(e.target.files?.[0])} />
              {newMenu.image && <img src={newMenu.image} alt="미리보기" className="menu-img" />}
              <label className="row" style={{marginTop:10}}><input type="checkbox" checked={newMenu.soldOut} onChange={e => setNewMenu(p => ({...p, soldOut:e.target.checked}))}/> 품절 표시</label>
              <button className="btn blue" onClick={addNewMenu}>{newMenu.id ? '메뉴수정 저장' : '메뉴추가'}</button>
            </div>

            <div className="card">
              <h3>현재 메뉴 관리</h3>
              {menus.map(m => (
                <div key={m.id} className="order-item">
                  <div><b>{m.image ? '🖼️' : m.emoji} {m.name}</b><div className="muted">{m.category} / {formatWon(m.price)} {m.soldOut?' / 품절':''}</div></div>
                  <div className="row">
                    <label><input type="checkbox" checked={!!m.soldOut} onChange={e => setMenus(prev => prev.map(x => x.id===m.id ? {...x, soldOut:e.target.checked} : x))}/> 품절</label>
                    <button className="btn gray" onClick={() => setNewMenu(m)}>수정</button>
                    <button className="btn red" onClick={() => setMenus(prev => prev.filter(x => x.id !== m.id))}>삭제</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3>운영 설정</h3>
              <label className="label">테이블 수</label>
              <input className="input" type="number" value={tableCount} onChange={e => setTableCount(Number(e.target.value || 1))} />
              <label className="label">인기메뉴 표시 개수</label>
              <input className="input" type="number" value={popularLimit} onChange={e => setPopularLimit(Number(e.target.value || 1))} />
              <label className="label">식당이용 자동추가 내용</label>
              <input className="input" value={serviceOptions.dine.label} onChange={e => setServiceOptions(p => ({...p, dine:{...p.dine, label:e.target.value}}))} placeholder="예: 상차림비" />
              <label className="label">식당이용 자동추가 금액</label>
              <input className="input" type="number" value={serviceOptions.dine.amount} onChange={e => setServiceOptions(p => ({...p, dine:{...p.dine, amount:Number(e.target.value || 0)}}))} />
              <label className="label">포장 자동추가 내용</label>
              <input className="input" value={serviceOptions.takeout.label} onChange={e => setServiceOptions(p => ({...p, takeout:{...p.takeout, label:e.target.value}}))} placeholder="예: 포장용기" />
              <label className="label">포장 자동추가 금액</label>
              <input className="input" type="number" value={serviceOptions.takeout.amount} onChange={e => setServiceOptions(p => ({...p, takeout:{...p.takeout, amount:Number(e.target.value || 0)}}))} />
              <label className="row"><input type="checkbox" checked={receiptPrintEnabled} onChange={e => setReceiptPrintEnabled(e.target.checked)} /> 결제완료 후 영수증 인쇄창 자동 열기</label>
            </div>

            <div className="card">
              <h3>보안 / 데이터 관리</h3>
              <input className="input" type="password" placeholder="새 관리자 비밀번호" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button className="btn black" onClick={() => { if(!newPassword) return; setAdminPassword(newPassword); setNewPassword(''); alert('비밀번호 변경완료'); }}>비밀번호 변경</button>
              <hr />
              <button className="btn green" onClick={downloadBackup}>전체백업 다운로드</button>
              <div className="small-note">메뉴/판매통계/외상장부/설정을 파일로 저장합니다.</div>
              <button className="btn blue" onClick={shareBackup}>전체백업 공유하기</button>
              <div className="small-note">지원 기기에서는 카톡/문자/이메일 공유창이 열립니다.</div>
              <button className="btn gray" onClick={() => restoreRef.current?.click()}>백업파일 불러오기</button>
              <div className="small-note">저장한 백업파일로 복구합니다.</div>
              <input ref={restoreRef} type="file" accept="application/json" style={{display:'none'}} onChange={e => restoreBackup(e.target.files?.[0])} />
              <button className="btn orange" onClick={() => resetWithKeyword('orders')}>테스트 주문 초기화</button>
              <div className="small-note">현재 주문내역만 삭제합니다.</div>
              <button className="btn red" onClick={() => resetWithKeyword('sales')}>판매/외상 데이터 초기화</button>
              <div className="small-note">판매통계와 외상장부를 삭제합니다. 클릭 시 "초기화" 입력 필요.</div>
              <button className="btn red" onClick={() => resetWithKeyword('all')}>전체 초기화</button>
              <div className="small-note">메뉴/판매/외상/설정을 모두 삭제합니다.</div>
            </div>
          </div>
        </div>
      )}

      <div className="popular">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 className="section-title">🔥 인기메뉴</h2>
          <div className="row">{['1','7','30'].map(v => <button key={v} onClick={() => setPopularPeriod(v)} className={`btn ${popularPeriod===v?'blue':'gray'}`}>{v==='1'?'오늘':v==='7'?'최근7일':'최근30일'}</button>)}</div>
        </div>
        <div className="menu-grid">
          {popularMenus.map(([name, qty]) => {
            const item = menus.find(x => x.name === name);
            if (!item) return null;
            return <button key={name} onClick={() => addMenu(item)} className={`menu-card ${item.soldOut?'sold':''}`}>
              {item.soldOut && <span className="sold-badge">품절</span>}
              {item.image ? <img src={item.image} alt="" className="menu-img" /> : <div className="emoji">{item.emoji}</div>}
              <div className="menu-name">{item.name}</div><div className="price">{qty}개 판매</div>
            </button>
          })}
        </div>
      </div>

      <div className="grid-main">
        <div>
          <div className="row" style={{marginBottom:12}}>
            {['식당식사','포장'].map(t => <button key={t} onClick={() => setEatType(prev => ({...prev, [selectedTable]: t}))} className={`btn ${(currentEat===t)?'blue':'gray'}`}>{t}</button>)}
            {(autoLabel || autoCharge) && <div className="btn white">{autoLabel || currentEat + ' 추가금'} {formatWon(autoCharge)}</div>}
          </div>

          {Object.entries(groupedMenus).map(([category, list]) => (
            <div key={category} className="panel">
              <h2 className="section-title">{category}</h2>
              <div className="menu-grid">
                {list.map(item => <button key={item.id} disabled={item.soldOut} onClick={() => addMenu(item)} className={`menu-card ${item.soldOut?'sold':''}`}>
                  {item.soldOut && <span className="sold-badge">품절</span>}
                  {item.image ? <img src={item.image} alt="menu" className="menu-img" /> : <div className="emoji">{item.emoji}</div>}
                  <div className="menu-name">{item.name}</div>
                  <div className="price">{formatWon(item.price)}</div>
                </button>)}
              </div>
            </div>
          ))}
        </div>

        <div className="order-panel">
          <div className="panel">
            <h2 className="section-title">주문내역 ({selectedTable}번)</h2>
            {currentOrders.length === 0 && <div className="muted" style={{textAlign:'center', padding:24}}>메뉴를 선택해주세요</div>}
            {currentOrders.map(item => <div key={item.id} className="order-item">
              <div><b>{item.name}</b><div className="muted">{formatWon(item.price)} x {item.qty}</div></div>
              <div className="row"><button className="qty-btn" onClick={() => changeQty(item.id, -1)}>-</button><button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button></div>
            </div>)}
            {(autoLabel || autoCharge) && <div className="order-item"><div><b>{autoLabel || currentEat + ' 추가금'}</b><div className="muted">자동추가</div></div><b>{formatWon(autoCharge)}</b></div>}

            <div className="pay-grid">{paymentList.map(type => <button key={type} onClick={() => { setPaymentType(prev => ({...prev, [selectedTable]: type})); setWarning(''); }} className={`pay-btn ${(paymentType[selectedTable] || '현금') === type ? 'active' : ''}`}>{type}</button>)}</div>

            {(paymentType[selectedTable] || '') === '외상' && <div className={warning ? 'warning' : 'card'} style={{marginTop:12}}>
              <div className="label">외상 단체명 입력 또는 선택</div>
              <input list="credit-list" value={creditGroup[selectedTable] || ''} onChange={e => setCreditGroup(prev => ({...prev, [selectedTable]: e.target.value}))} placeholder="단체명 입력 또는 선택" className="input" />
              <datalist id="credit-list">{[...new Set(unpaidCredits.map(x => x.credit).filter(Boolean))].map(name => <option key={name} value={name} />)}</datalist>
              {warning && <div style={{marginTop:8}}>{warning}</div>}
            </div>}

            <div className="total-box"><div className="section-title" style={{margin:0}}>총 금액</div><div className="big">{formatWon(total)}</div></div>
            <button className="btn blue" style={{width:'100%', fontSize:22, padding:18}} onClick={() => completePayment(false)}>결제완료</button>
            <button className="btn green" style={{width:'100%', fontSize:18, padding:14, marginTop:8}} onClick={() => completePayment(true)}>결제완료 + 영수증 출력</button>
          </div>
        </div>
      </div>

      {showCreditDrawer && <div className="drawer">
        <h2 className="section-title">📒 외상장부</h2>
        <button className="btn green" onClick={paySelectedCredits}>선택 완납처리</button>
        {Object.keys(groupedCredits).length === 0 && <div className="muted">외상내역이 없습니다</div>}
        {Object.entries(groupedCredits).map(([groupName, list]) => {
          const groupTotal = list.filter(x => !x.paid).reduce((sum, x) => sum + Number(x.remainingAmount || 0), 0);
          return <div key={groupName} className="credit-group">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div><h3>{groupName}</h3><b>외상잔액: {formatWon(groupTotal)}</b></div>
              <button className="btn gray" onClick={() => setExpandedCreditGroups(p => ({...p, [groupName]: !p[groupName]}))}>{expandedCreditGroups[groupName] ? '펼치기' : '숨기기'}</button>
            </div>
            {!expandedCreditGroups[groupName] && list.map(item => <div key={item.id} className={`credit-item ${item.paid ? 'paid' : ''}`}>
              <div className="row" style={{alignItems:'flex-start'}}>
                <input className="check" type="checkbox" disabled={item.paid} checked={checkedCredit[item.id] === true} onChange={e => setCheckedCredit(p => ({...p, [item.id]: e.target.checked}))} />
                <div style={{flex:1}}>
                  <b>{item.date} {item.time} / {item.table}번 테이블</b>
                  <div>{item.items.map(x => `${x.name} ${x.qty}개`).join(', ')}</div>
                  <div><b>남은금액: {formatWon(item.remainingAmount)}</b> {item.paid && '✅ 결제완료'}</div>
                  {(item.partialPayments || []).map((p, idx) => <div key={idx} className="muted">부분결제 {formatWon(p.amount)} / {p.date}</div>)}
                  {!item.paid && <div className="row" style={{marginTop:8}}>
                    <input className="input" style={{maxWidth:180}} type="number" value={partialAmount[item.id] || ''} onChange={e => setPartialAmount(p => ({...p, [item.id]: e.target.value}))} placeholder="부분결제금액" />
                    <button className="btn orange" onClick={() => payCreditItem(item, partialAmount[item.id])}>일부결제</button>
                  </div>}
                </div>
              </div>
            </div>)}
          </div>
        })}
      </div>}

      {showStatsDrawer && <div className="drawer">
        <h2 className="section-title">📊 판매통계</h2>
        <div className="row">
          <input className="input" style={{maxWidth:180}} type="date" value={statsStart} onChange={e => setStatsStart(e.target.value)} />
          <input className="input" style={{maxWidth:180}} type="date" value={statsEnd} onChange={e => setStatsEnd(e.target.value)} />
          <button className="btn green" onClick={exportCSV}>엑셀/CSV 저장</button>
        </div>
        <div className="stat-grid" style={{marginTop:12}}>
          <div className="stat-card"><div className="muted">기간 총매출</div><div className="big">{formatWon(totalSales)}</div></div>
          <div className="stat-card"><div className="muted">오늘 매출</div><div className="big">{formatWon(todaySales)}</div></div>
          {Object.entries(stats.payment).map(([k,v]) => <div key={k} className="stat-card"><div className="muted">{k} 매출</div><div className="big">{formatWon(v)}</div></div>)}
          {Object.entries(stats.eat).map(([k,v]) => <div key={k} className="stat-card"><div className="muted">{k} 매출</div><div className="big">{formatWon(v)}</div></div>)}
        </div>
        <div className="panel" style={{marginTop:12}}><h3>시간대별 매출</h3>{Object.entries(stats.hour).sort((a,b)=>Number(a[0])-Number(b[0])).map(([h,v]) => <div className="order-item" key={h}><b>{h}시</b><b>{formatWon(v)}</b></div>)}</div>
        <div className="panel"><h3>메뉴별 판매수량/금액</h3>{Object.entries(stats.menu).sort((a,b)=>b[1].qty-a[1].qty).map(([name,v]) => <div className="order-item" key={name}><b>{name}</b><div>{v.qty}개 / {formatWon(v.amount)}</div></div>)}</div>
      </div>}

      <div className="bottom-toggle"><div className="bottom-inner">
        <button className="btn orange" onClick={() => {setShowCreditDrawer(v=>!v); setShowStatsDrawer(false)}}>외상장부 {showCreditDrawer?'▲':'▼'}</button>
        <button className="btn blue" onClick={() => {setShowStatsDrawer(v=>!v); setShowCreditDrawer(false)}}>판매통계 {showStatsDrawer?'▲':'▼'}</button>
      </div></div>
    </div>
  );
}
