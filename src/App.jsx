
import React, { useEffect, useMemo, useState } from 'react';

const defaultMenus = [
  { id: 1, name: '생태탕', price: 12000, category: '식사류', emoji: '🍲', image: '', soldOut: false },
  { id: 2, name: '애호박찌개', price: 10000, category: '식사류', emoji: '🥘', image: '', soldOut: false },
  { id: 3, name: '소주', price: 5000, category: '주류', emoji: '🍶', image: '', soldOut: false },
  { id: 4, name: '콜라', price: 2000, category: '음료', emoji: '🥤', image: '', soldOut: false },
];

const defaultCategories = [
  { id: 'cat-1', name: '식사류', order: 1 },
  { id: 'cat-2', name: '주류', order: 2 },
  { id: 'cat-3', name: '음료', order: 3 },
];

const paymentList = ['현금', '카드', '카드+현금', '상품권', '기타', '외상'];
const emojiList = ['🍲','🥘','🍜','🍚','🍱','🍖','🍗','🍶','🍺','🥤','☕','🍽️','🧃','🍳','🍛','🍤'];

function load(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function todayString() { return new Date().toLocaleDateString(); }

function makeCSV(rows) {
  return rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
}

async function resizeImage(file, maxSize = 500, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h && w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
        if (h >= w && h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
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
  const [menus, setMenus] = useState(() => {
    const m = load('menus', defaultMenus);
    return m.map(x => ({...x, soldOut: !!x.soldOut, category: x.category || x.group || '식사류'}));
  });
  const [categories, setCategories] = useState(() => load('categories', defaultCategories));
  const [orders, setOrders] = useState(() => load('orders', {}));
  const [salesHistory, setSalesHistory] = useState(() => load('salesHistory', []));
  const [selectedTable, setSelectedTable] = useState(1);
  const [tableCount, setTableCount] = useState(() => load('tableCount', 12));
  const [paymentType, setPaymentType] = useState({});
  const [creditGroup, setCreditGroup] = useState({});
  const [creditContact, setCreditContact] = useState({});
  const [creditMemo, setCreditMemo] = useState({});
  const [creditProfiles, setCreditProfiles] = useState(() => load('creditProfiles', {}));
  const [warning, setWarning] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => load('adminPassword', '1234'));
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [eatType, setEatType] = useState({});
  const [popularPeriod, setPopularPeriod] = useState('7');
  const [popularLimit, setPopularLimit] = useState(() => load('popularLimit', 5));
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState({});
  const [showCreditPanel, setShowCreditPanel] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serviceOptions, setServiceOptions] = useState(() => load('serviceOptions', {
    '식당식사': { label: '', price: 0 },
    '포장': { label: '포장용기', price: 0 },
  }));
  const [newCategory, setNewCategory] = useState({ name: '', order: '' });
  const [resetText, setResetText] = useState('');
  const [newMenu, setNewMenu] = useState({
    name: '', price: '', category: '식사류', emoji: '🍽️', image: '', soldOut: false
  });

  useEffect(() => localStorage.setItem('menus', JSON.stringify(menus)), [menus]);
  useEffect(() => localStorage.setItem('categories', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('salesHistory', JSON.stringify(salesHistory)), [salesHistory]);
  useEffect(() => localStorage.setItem('tableCount', JSON.stringify(tableCount)), [tableCount]);
  useEffect(() => localStorage.setItem('popularLimit', JSON.stringify(popularLimit)), [popularLimit]);
  useEffect(() => localStorage.setItem('serviceOptions', JSON.stringify(serviceOptions)), [serviceOptions]);
  useEffect(() => localStorage.setItem('adminPassword', JSON.stringify(adminPassword)), [adminPassword]);
  useEffect(() => localStorage.setItem('creditProfiles', JSON.stringify(creditProfiles)), [creditProfiles]);

  const currentOrders = orders[selectedTable] || [];
  const currentEat = eatType[selectedTable] || '식당식사';
  const selectedService = serviceOptions[currentEat] || { label: '', price: 0 };
  const serviceAmount = selectedService.label ? Number(selectedService.price || 0) : 0;

  const total = useMemo(() => {
    const base = currentOrders.reduce((sum, item) => sum + item.price * item.qty, 0);
    return base + serviceAmount;
  }, [currentOrders, serviceAmount]);

  const sortedCategories = useMemo(() => [...categories].sort((a,b)=>Number(a.order)-Number(b.order)), [categories]);
  const groupedMenus = useMemo(() => {
    const acc = {};
    sortedCategories.forEach(c => acc[c.name] = []);
    menus.forEach(menu => {
      const c = menu.category || '식사류';
      if (!acc[c]) acc[c] = [];
      acc[c].push(menu);
    });
    return acc;
  }, [menus, sortedCategories]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod);
    const now = Date.now();
    const filtered = salesHistory.filter(x => now - (x.timestamp || 0) < days * 24 * 60 * 60 * 1000);
    const count = {};
    filtered.forEach(sale => (sale.items || []).forEach(item => {
      count[item.name] = (count[item.name] || 0) + item.qty;
    }));
    return Object.entries(count).sort((a,b)=>b[1]-a[1]).slice(0, Number(popularLimit || 5));
  }, [salesHistory, popularPeriod, popularLimit]);

  const unpaidCredits = salesHistory.filter(x => x.payment === '외상');
  const groupedCredits = useMemo(() => {
    const sorted = [...unpaidCredits].sort((a,b) => {
      if (!!a.paid !== !!b.paid) return a.paid ? 1 : -1; // 완납 맨 아래
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
    return sorted.reduce((acc, item) => {
      const key = item.credit || '미지정';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [salesHistory]);

  const filteredSales = useMemo(() => salesHistory.filter(s => {
    if (!startDate && !endDate) return true;
    const d = new Date(s.timestamp || Date.now());
    if (startDate) {
      const st = new Date(startDate); st.setHours(0,0,0,0);
      if (d < st) return false;
    }
    if (endDate) {
      const en = new Date(endDate); en.setHours(23,59,59,999);
      if (d > en) return false;
    }
    return true;
  }), [salesHistory, startDate, endDate]);

  const stats = useMemo(() => {
    const payment = {}, eat = {}, menu = {}, hour = {};
    filteredSales.forEach(s => {
      payment[s.payment] = (payment[s.payment] || 0) + s.total;
      eat[s.eatType] = (eat[s.eatType] || 0) + s.total;
      const h = new Date(s.timestamp).getHours();
      hour[h] = (hour[h] || 0) + s.total;
      (s.items || []).forEach(i => {
        if (!menu[i.name]) menu[i.name] = { qty: 0, total: 0 };
        menu[i.name].qty += i.qty;
        menu[i.name].total += i.price * i.qty;
      });
      if (s.serviceLabel && s.serviceAmount) {
        if (!menu[s.serviceLabel]) menu[s.serviceLabel] = { qty: 0, total: 0 };
        menu[s.serviceLabel].qty += 1;
        menu[s.serviceLabel].total += s.serviceAmount;
      }
    });
    return { payment, eat, menu, hour };
  }, [filteredSales]);

  const todaySales = salesHistory.filter(x => x.date === todayString()).reduce((sum, x) => sum + Number(x.total || 0), 0);
  const totalSales = salesHistory.reduce((sum, x) => sum + Number(x.total || 0), 0);

  function addMenu(menu) {
    if (menu.soldOut) { alert('품절 메뉴입니다'); return; }
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
      [selectedTable]: (prev[selectedTable] || []).map(item =>
        item.id === id ? { ...item, qty: item.qty + diff } : item
      ).filter(item => item.qty > 0)
    }));
  }

  function changeEat(type) {
    setEatType(prev => ({ ...prev, [selectedTable]: type }));
  }

  function applyCreditProfile(name) {
    const profile = creditProfiles[name] || {};
    setCreditGroup(prev => ({...prev, [selectedTable]: name}));
    setCreditContact(prev => ({...prev, [selectedTable]: profile.contact || ''}));
    setCreditMemo(prev => ({...prev, [selectedTable]: profile.memo || ''}));
  }

  function completePayment(printReceipt = false) {
    const payment = paymentType[selectedTable] || '현금';
    const credit = (creditGroup[selectedTable] || '').trim();

    if (currentOrders.length === 0) {
      alert('주문내역이 없습니다');
      return;
    }
    if (payment === '외상' && !credit) {
      setWarning('⚠️ 단체명을 입력 또는 선택해주세요 ⚠️');
      return;
    }

    const contact = creditContact[selectedTable] || '';
    const memo = creditMemo[selectedTable] || '';
    if (payment === '외상' && credit) {
      setCreditProfiles(prev => ({
        ...prev,
        [credit]: { contact, memo }
      }));
    }

    const sale = {
      id: Date.now(),
      table: selectedTable,
      eatType: currentEat,
      payment,
      credit,
      creditContact: contact,
      creditMemo: memo,
      total,
      remainingAmount: payment === '외상' ? total : 0,
      items: currentOrders,
      paid: payment !== '외상',
      partialPayments: [],
      serviceLabel: selectedService.label || '',
      serviceAmount,
      timestamp: Date.now(),
      date: todayString(),
      time: new Date().toLocaleTimeString()
    };

    setSalesHistory(prev => [sale, ...prev]);
    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setWarning('');

    if (printReceipt) setTimeout(() => printSaleReceipt(sale), 50);
  }

  function printSaleReceipt(sale) {
    const rows = (sale.items || []).map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${(i.price*i.qty).toLocaleString()}원</td></tr>`).join('');
    const service = sale.serviceLabel ? `<tr><td>${sale.serviceLabel}</td><td>1</td><td>${Number(sale.serviceAmount||0).toLocaleString()}원</td></tr>` : '';
    const html = `
      <html><head><title>영수증</title><style>
      body{font-family:monospace;width:80mm;padding:10px;font-size:14px} h2{text-align:center} table{width:100%;border-collapse:collapse} td{padding:4px 0;border-bottom:1px dashed #ccc} .total{font-size:20px;font-weight:bold;text-align:right;margin-top:10px}
      </style></head><body>
      <h2>식당 POS</h2>
      <div>${sale.date} ${sale.time}</div><div>${sale.table}번 / ${sale.eatType} / ${sale.payment}</div>
      <table>${rows}${service}</table>
      <div class="total">합계 ${sale.total.toLocaleString()}원</div>
      <script>window.print(); setTimeout(()=>window.close(), 500);</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=420,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 500, 0.72);
      setNewMenu(prev => ({ ...prev, image: resized }));
    } catch {
      alert('이미지 처리에 실패했습니다');
    }
  }

  function addNewMenu() {
    if (!newMenu.name || !newMenu.price) {
      alert('메뉴명과 가격을 입력해주세요');
      return;
    }
    setMenus(prev => [...prev, {
      id: Date.now(),
      name: newMenu.name,
      price: Number(newMenu.price),
      category: newMenu.category,
      emoji: newMenu.emoji,
      image: newMenu.image,
      soldOut: false
    }]);
    setNewMenu({ name: '', price: '', category: sortedCategories[0]?.name || '식사류', emoji: '🍽️', image: '', soldOut: false });
  }

  function updateMenu(id, patch) {
    setMenus(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }

  function addCategory() {
    if (!newCategory.name) return;
    if (categories.some(c=>c.name===newCategory.name)) return alert('이미 있는 메뉴구분입니다');
    setCategories(prev => [...prev, { id: Date.now().toString(), name: newCategory.name, order: Number(newCategory.order || prev.length + 1) }]);
    setNewCategory({ name: '', order: '' });
  }

  function exportCSV() {
    const rows = [
      ['날짜','시간','테이블','식사방식','결제','단체명','연락처','메모','금액'],
      ...salesHistory.map(x => [x.date,x.time,x.table,x.eatType,x.payment,x.credit,x.creditContact,x.creditMemo,x.total])
    ];
    const blob = new Blob([makeCSV(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = '매출통계.csv'; link.click(); URL.revokeObjectURL(url);
  }

  function backupData(share=false) {
    const data = { menus, orders, salesHistory, tableCount, serviceOptions, categories, popularLimit, creditProfiles, backupAt: new Date().toISOString() };
    const text = JSON.stringify(data, null, 2);
    const file = new File([text], 'pos-backup.json', { type: 'application/json' });
    if (share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'POS 백업파일' });
    } else {
      saveFile('pos-backup.json', text);
    }
  }

  function restoreData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.menus) setMenus(data.menus);
        if (data.orders) setOrders(data.orders);
        if (data.salesHistory) setSalesHistory(data.salesHistory);
        if (data.tableCount) setTableCount(data.tableCount);
        if (data.serviceOptions) setServiceOptions(data.serviceOptions);
        if (data.categories) setCategories(data.categories);
        if (data.popularLimit) setPopularLimit(data.popularLimit);
        if (data.creditProfiles) setCreditProfiles(data.creditProfiles);
        alert('복구 완료');
      } catch {
        alert('복구 파일이 올바르지 않습니다');
      }
    };
    reader.readAsText(file);
  }

  function resetSalesAndCredits() {
    if (resetText !== '초기화') {
      alert('"초기화"를 정확히 입력해야 합니다');
      return;
    }
    setSalesHistory([]);
    setResetText('');
    alert('판매/외상 데이터가 초기화되었습니다');
  }

  function calcTableColumns() {
    return Math.ceil(Number(tableCount || 12) / 2);
  }

  function paySelectedCredit(groupName, undo=false) {
    const selectedIds = Object.entries(checkedCredit).filter(([,v])=>v).map(([id])=>Number(id));
    if (selectedIds.length === 0) return alert('선택된 외상내역이 없습니다');
    setSalesHistory(prev => prev.map(x => {
      if (!selectedIds.includes(x.id)) return x;
      if (undo) {
        return { ...x, paid: false, remainingAmount: x.total };
      }
      return { ...x, paid: true, remainingAmount: 0, partialPayments: [...(x.partialPayments||[]), { amount: x.remainingAmount || x.total, date: todayString(), memo: '완납처리' }] };
    }));
    setCheckedCredit({});
  }

  function partialPay(item) {
    const pay = Number(partialAmount[item.id] || 0);
    if (pay <= 0) return;
    setSalesHistory(prev => prev.map(x => {
      if (x.id !== item.id) return x;
      const remain = Math.max(0, Number(x.remainingAmount || x.total) - pay);
      return {
        ...x,
        remainingAmount: remain,
        paid: remain <= 0,
        partialPayments: [...(x.partialPayments || []), { amount: pay, date: todayString(), memo: '일부결제' }]
      };
    }));
    setPartialAmount(prev => ({...prev, [item.id]: ''}));
  }

  const selectedChecked = Object.entries(checkedCredit).filter(([,v])=>v).map(([id])=>Number(id));
  const selectedCheckedItems = salesHistory.filter(x => selectedChecked.includes(x.id));
  const selectedAllPaid = selectedCheckedItems.length > 0 && selectedCheckedItems.every(x => x.paid);

  return (
    <div className="app">
      <div className="topbar">
        <h1>식당 POS</h1>
        <div className="top-actions">
          <button onClick={() => {
            if (adminUnlocked) { setAdminUnlocked(false); setAdminMode(false); return; }
            setAdminMode(true);
          }} className="black">{adminUnlocked ? '관리자모드 해제' : '관리자모드'}</button>
          <button onClick={exportCSV} className="green">CSV 다운로드</button>
        </div>
      </div>

      {adminMode && !adminUnlocked && (
        <div className="admin-login">
          <b>관리자 비밀번호</b>
          <input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} placeholder="비밀번호 입력" />
          <button onClick={() => {
            if (passwordInput === adminPassword) { setAdminUnlocked(true); setPasswordInput(''); }
            else alert('비밀번호가 틀렸습니다');
          }}>확인</button>
          <div className="hint">초기 비밀번호는 1234입니다.</div>
        </div>
      )}

      <div className="main-layout">
        <section className="table-panel">
          <h2>테이블</h2>
          <div className="table-grid" style={{gridTemplateColumns:`repeat(${calcTableColumns()}, 1fr)`}}>
            {Array.from({ length: Number(tableCount || 12) }, (_, i) => i + 1).map(n => {
              const hasOrder = (orders[n] || []).length > 0;
              return (
                <button key={n} onClick={() => setSelectedTable(n)}
                  className={`table-btn ${selectedTable === n ? 'selected' : ''} ${hasOrder ? 'has-order' : ''}`}>
                  {n}번
                </button>
              );
            })}
          </div>
          <div className="legend"><span>□ 빈 테이블</span><span className="busy">■ 주문 있음</span><span className="sel">■ 선택됨</span></div>
        </section>

        <section className="menu-panel">
          <div className="popular">
            <div className="section-title">🔥 인기메뉴</div>
            <div className="periods">
              {['1','7','30'].map(v => (
                <button key={v} onClick={()=>setPopularPeriod(v)} className={popularPeriod === v ? 'active' : ''}>
                  {v === '1' ? '오늘' : v === '7' ? '최근7일' : '최근30일'}
                </button>
              ))}
            </div>
            <div className="popular-list">
              {popularMenus.length === 0 && <span className="muted">결제 후 인기메뉴가 표시됩니다</span>}
              {popularMenus.map(([name, qty]) => {
                const item = menus.find(x=>x.name===name);
                if (!item) return null;
                return <button key={name} onClick={()=>addMenu(item)} className="popular-item">{item.image ? <img src={item.image}/> : <span>{item.emoji}</span>}<b>{name}</b><small>{qty}개</small></button>
              })}
            </div>
          </div>

          <div className="eat-buttons">
            {['식당식사','포장'].map(type => (
              <button key={type} onClick={()=>changeEat(type)} className={currentEat === type ? 'active' : ''}>
                {type}
                {serviceOptions[type]?.label ? <small>{serviceOptions[type].label} {Number(serviceOptions[type].price||0).toLocaleString()}원</small> : null}
              </button>
            ))}
          </div>

          {Object.entries(groupedMenus).map(([category, list]) => (
            <div key={category} className="menu-category">
              <h2>{category}</h2>
              <div className="menu-grid">
                {list.map(item => (
                  <button key={item.id} onClick={()=>addMenu(item)} disabled={item.soldOut}
                    className={`menu-card ${item.soldOut ? 'soldout' : ''}`}>
                    <div className="thumb">{item.image ? <img src={item.image} /> : <span>{item.emoji}</span>}</div>
                    <b>{item.name}</b>
                    <div>{item.price.toLocaleString()}원</div>
                    {item.soldOut && <div className="soldout-badge">품절</div>}
                    {adminUnlocked && <span className="admin-mini">관리자에서 수정 가능</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="order-panel">
          <h2>주문내역 ({selectedTable}번)</h2>
          <div className="order-list">
            {currentOrders.length === 0 && <div className="empty">메뉴를 선택해주세요</div>}
            {currentOrders.map(item => (
              <div key={item.id} className="order-item">
                <div><b>{item.name}</b><span>{item.price.toLocaleString()}원 x {item.qty}</span></div>
                <div className="qty"><button onClick={()=>changeQty(item.id,-1)}>-</button><button onClick={()=>changeQty(item.id,1)}>+</button></div>
              </div>
            ))}
            {selectedService.label && (
              <div className="service-line">{selectedService.label} <b>{Number(serviceAmount).toLocaleString()}원</b></div>
            )}
          </div>

          <div className="payments">
            {paymentList.map(type => (
              <button key={type} onClick={()=>setPaymentType(prev=>({...prev,[selectedTable]:type}))}
                className={(paymentType[selectedTable] || '현금') === type ? 'active' : ''}>{type}</button>
            ))}
          </div>

          {(paymentType[selectedTable] || '') === '외상' && (
            <div className={`credit-box ${warning ? 'warn' : ''}`}>
              <b>외상 단체명 입력 또는 선택</b>
              <input list="credit-list" value={creditGroup[selectedTable] || ''} onChange={e=>{
                const name = e.target.value;
                if (creditProfiles[name]) applyCreditProfile(name);
                else setCreditGroup(prev=>({...prev,[selectedTable]:name}));
              }} placeholder="단체명" />
              <datalist id="credit-list">{Object.keys(creditProfiles).map(name=><option key={name} value={name}/>)}</datalist>
              <input value={creditContact[selectedTable] || ''} onChange={e=>setCreditContact(prev=>({...prev,[selectedTable]:e.target.value}))} placeholder="연락처 선택 입력" />
              <input value={creditMemo[selectedTable] || ''} onChange={e=>setCreditMemo(prev=>({...prev,[selectedTable]:e.target.value}))} placeholder="기본메모 선택 입력" />
              {warning && <div className="warning">{warning}</div>}
            </div>
          )}

          <div className="total"><span>총 금액</span><b>{total.toLocaleString()}원</b></div>
          <button className="pay" onClick={()=>completePayment(false)}>결제완료</button>
          <button className="pay print" onClick={()=>completePayment(true)}>결제완료 + 영수증 출력</button>
        </section>
      </div>

      <div className="bottom-panels">
        <button onClick={()=>setShowCreditPanel(!showCreditPanel)}>외상장부 {showCreditPanel ? '▲' : '▼'}</button>
        <button onClick={()=>setShowStatsPanel(!showStatsPanel)}>판매통계 {showStatsPanel ? '▲' : '▼'}</button>
      </div>

      {showCreditPanel && (
        <section className="panel credit-ledger">
          <h2>외상장부</h2>
          <div className="credit-actions">
            <button className={selectedAllPaid ? 'orange' : 'green'} onClick={()=>paySelectedCredit('', selectedAllPaid)}>
              {selectedAllPaid ? '선택완납처리해제' : '선택완납처리'}
            </button>
            <span className="hint">완납 내역도 체크해서 해제할 수 있습니다.</span>
          </div>
          {Object.entries(groupedCredits).length === 0 && <div className="empty">외상내역이 없습니다</div>}
          {Object.entries(groupedCredits).map(([group, list]) => {
            const profile = creditProfiles[group] || {};
            const groupTotal = list.reduce((sum,x)=>sum+Number(x.remainingAmount||0),0);
            return (
              <div key={group} className="credit-group">
                <div className="credit-head">
                  <div>
                    <h3>{group} <small>{profile.contact}</small></h3>
                    <div className="memo">{profile.memo}</div>
                    <b>잔액 {groupTotal.toLocaleString()}원</b>
                  </div>
                  <button onClick={()=>setCollapsedGroups(prev=>({...prev,[group]:!prev[group]}))}>{collapsedGroups[group] ? '펼치기' : '숨기기'}</button>
                </div>
                {!collapsedGroups[group] && list.map(item => (
                  <div key={item.id} className={`credit-item ${item.paid ? 'paid' : ''} ${checkedCredit[item.id] ? 'checked' : ''}`}>
                    <input type="checkbox" checked={!!checkedCredit[item.id]} onChange={e=>setCheckedCredit(prev=>({...prev,[item.id]:e.target.checked}))} />
                    <div className="credit-main">
                      <b>{item.date} {item.time} / {item.table}번 테이블</b>
                      <div>{(item.items||[]).map(x=>`${x.name} ${x.qty}개`).join(', ')}</div>
                      <div>남은금액: {(item.remainingAmount || 0).toLocaleString()}원 {item.paid && <b className="done">결제완료</b>}</div>
                      {(item.partialPayments||[]).map((p,idx)=><div key={idx} className="partial">부분결제 {p.amount.toLocaleString()}원 / {p.date}</div>)}
                    </div>
                    {!item.paid && (
                      <div className="partial-pay">
                        <input type="number" value={partialAmount[item.id] || ''} onChange={e=>setPartialAmount(prev=>({...prev,[item.id]:e.target.value}))} placeholder="일부결제" />
                        <button onClick={()=>partialPay(item)}>일부결제</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {showStatsPanel && (
        <section className="panel stats">
          <h2>판매통계</h2>
          <div className="date-row">
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
            <button onClick={exportCSV}>기간통계 CSV</button>
          </div>
          <div className="stat-cards">
            <div><span>오늘 매출</span><b>{todaySales.toLocaleString()}원</b></div>
            <div><span>누적 매출</span><b>{totalSales.toLocaleString()}원</b></div>
          </div>
          <div className="stat-grid">
            <div><h3>결제방식별</h3>{Object.entries(stats.payment).map(([k,v])=><p key={k}>{k}: <b>{Number(v).toLocaleString()}원</b></p>)}</div>
            <div><h3>식사/포장별</h3>{Object.entries(stats.eat).map(([k,v])=><p key={k}>{k}: <b>{Number(v).toLocaleString()}원</b></p>)}</div>
            <div><h3>메뉴별 판매량</h3>{Object.entries(stats.menu).map(([k,v])=><p key={k}>{k}: <b>{v.qty}개 / {v.total.toLocaleString()}원</b></p>)}</div>
            <div><h3>시간대별 매출</h3>{Object.entries(stats.hour).map(([k,v])=><p key={k}>{k}시: <b>{Number(v).toLocaleString()}원</b></p>)}</div>
          </div>
        </section>
      )}

      {adminUnlocked && (
        <section className="admin">
          <h2>관리자모드</h2>
          <div className="admin-card top-add">
            <h3>메뉴추가</h3>
            <div className="form-grid">
              <input value={newMenu.name} onChange={e=>setNewMenu(prev=>({...prev,name:e.target.value}))} placeholder="메뉴명" />
              <input type="number" value={newMenu.price} onChange={e=>setNewMenu(prev=>({...prev,price:e.target.value}))} placeholder="가격" />
              <select value={newMenu.category} onChange={e=>setNewMenu(prev=>({...prev,category:e.target.value}))}>
                {sortedCategories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={newMenu.emoji} onChange={e=>setNewMenu(prev=>({...prev,emoji:e.target.value}))}>
                {emojiList.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
              <input type="file" accept="image/*" onChange={handleImage} />
              <button onClick={addNewMenu}>메뉴추가</button>
            </div>
            <div className="emoji-row">{emojiList.map(e=><button key={e} onClick={()=>setNewMenu(prev=>({...prev,emoji:e}))}>{e}</button>)}</div>
            <div className="hint">이미지는 자동으로 축소되어 저장됩니다.</div>
          </div>

          <div className="admin-card">
            <h3>현재 메뉴 / 품절 / 수정</h3>
            <div className="admin-menu-list">
              {menus.map(m=>(
                <div key={m.id} className="admin-menu-row">
                  <input type="checkbox" checked={!!m.soldOut} onChange={e=>updateMenu(m.id,{soldOut:e.target.checked})}/>
                  <span>{m.image ? <img src={m.image}/> : m.emoji}</span>
                  <input value={m.name} onChange={e=>updateMenu(m.id,{name:e.target.value})}/>
                  <input type="number" value={m.price} onChange={e=>updateMenu(m.id,{price:Number(e.target.value)})}/>
                  <select value={m.category} onChange={e=>updateMenu(m.id,{category:e.target.value})}>{sortedCategories.map(c=><option key={c.id}>{c.name}</option>)}</select>
                  <button className="red" onClick={()=>setMenus(prev=>prev.filter(x=>x.id!==m.id))}>삭제</button>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card">
            <h3>메뉴구분 순서관리</h3>
            <div className="form-grid">
              <input value={newCategory.name} onChange={e=>setNewCategory(prev=>({...prev,name:e.target.value}))} placeholder="메뉴구분명" />
              <input type="number" value={newCategory.order} onChange={e=>setNewCategory(prev=>({...prev,order:e.target.value}))} placeholder="순서번호" />
              <button onClick={addCategory}>구분추가</button>
            </div>
            {sortedCategories.map(c=>(
              <div key={c.id} className="cat-row">
                <input value={c.name} onChange={e=>setCategories(prev=>prev.map(x=>x.id===c.id?{...x,name:e.target.value}:x))}/>
                <input type="number" value={c.order} onChange={e=>setCategories(prev=>prev.map(x=>x.id===c.id?{...x,order:Number(e.target.value)}:x))}/>
                <button onClick={()=>setCategories(prev=>prev.filter(x=>x.id!==c.id))}>삭제</button>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <h3>시스템 설정</h3>
            <div className="form-grid">
              <label>테이블수<input type="number" value={tableCount} onChange={e=>setTableCount(Number(e.target.value||1))}/></label>
              <label>인기메뉴 표시개수<input type="number" value={popularLimit} onChange={e=>setPopularLimit(Number(e.target.value||1))}/></label>
              <label>식당이용 내용<input value={serviceOptions['식당식사']?.label || ''} onChange={e=>setServiceOptions(prev=>({...prev,'식당식사':{...prev['식당식사'],label:e.target.value}}))}/></label>
              <label>식당이용 금액<input type="number" value={serviceOptions['식당식사']?.price || 0} onChange={e=>setServiceOptions(prev=>({...prev,'식당식사':{...prev['식당식사'],price:Number(e.target.value||0)}}))}/></label>
              <label>포장 내용<input value={serviceOptions['포장']?.label || ''} onChange={e=>setServiceOptions(prev=>({...prev,'포장':{...prev['포장'],label:e.target.value}}))}/></label>
              <label>포장 금액<input type="number" value={serviceOptions['포장']?.price || 0} onChange={e=>setServiceOptions(prev=>({...prev,'포장':{...prev['포장'],price:Number(e.target.value||0)}}))}/></label>
            </div>
          </div>

          <div className="admin-card">
            <h3>비밀번호 변경</h3>
            <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="새 비밀번호" />
            <button onClick={()=>{ if(!newPassword) return; setAdminPassword(newPassword); setNewPassword(''); alert('비밀번호 변경 완료');}}>변경</button>
          </div>

          <div className="admin-card data-manage">
            <h3>데이터 관리</h3>
            <div className="data-buttons">
              <button onClick={()=>backupData(false)}>전체백업 다운로드<span>메뉴/판매통계/외상장부를 파일로 저장합니다.</span></button>
              <button onClick={()=>backupData(true)}>전체백업 공유하기<span>카톡/문자/메일 공유창이 열립니다. 안되면 다운로드됩니다.</span></button>
              <label className="file-label">백업파일 불러오기<span>저장한 백업파일로 복구합니다.</span><input type="file" accept="application/json" onChange={restoreData}/></label>
              <button onClick={()=>setOrders({})}>테스트 주문 초기화<span>현재 테이블 주문내역만 삭제합니다.</span></button>
            </div>
            <div className="danger-zone">
              <b>판매/외상 데이터 초기화</b>
              <p>판매통계와 외상장부가 삭제됩니다. 계속하려면 아래에 “초기화”를 입력하세요.</p>
              <input value={resetText} onChange={e=>setResetText(e.target.value)} placeholder="초기화" />
              <button onClick={resetSalesAndCredits}>판매/외상 데이터초기화</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
