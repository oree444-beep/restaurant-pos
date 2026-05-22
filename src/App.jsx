import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_MENUS = [
  { id: 1, name: '생태탕', price: 12000, category: '식사류', emoji: '🍲', image: '', soldOut: false },
  { id: 2, name: '애호박찌개', price: 10000, category: '식사류', emoji: '🥘', image: '', soldOut: false },
  { id: 3, name: '소주', price: 5000, category: '주류', emoji: '🍶', image: '', soldOut: false },
  { id: 4, name: '콜라', price: 2000, category: '음료', emoji: '🥤', image: '', soldOut: false },
];
const PAYMENT_LIST = ['현금', '카드', '카드+현금', '상품권', '기타', '외상'];
const EMOJIS = ['🍲', '🥘', '🍽️', '🍜', '🍚', '🐟', '🍖', '🍗', '🍱', '🍶', '🍺', '🥤', '🧃', '☕'];
const key = (name) => name;
function load(name, fallback) {
  try {
    const data = localStorage.getItem(key(name));
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}
function save(name, value) {
  localStorage.setItem(key(name), JSON.stringify(value));
}
function money(v) {
  return Number(v || 0).toLocaleString();
}
function todayInput() {
  return new Date().toISOString().slice(0, 10);
}
function getDateInput(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
function resizeImage(file, maxSize = 300, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
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
function downloadFile(filename, text, type = 'application/json;charset=utf-8;') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function App() {
  const [menus, setMenus] = useState(() => load('menus', DEFAULT_MENUS));
  const [orders, setOrders] = useState(() => load('orders', {}));
  const [salesHistory, setSalesHistory] = useState(() => load('salesHistory', []));
  const [tableCount, setTableCount] = useState(() => load('tableCount', 12));
  const [takeoutFee, setTakeoutFee] = useState(() => load('takeoutFee', 0));
  const [selectedTable, setSelectedTable] = useState(1);
  const [paymentType, setPaymentType] = useState({});
  const [eatType, setEatType] = useState({});
  const [creditGroup, setCreditGroup] = useState({});
  const [creditContacts, setCreditContacts] = useState(() => load('creditContacts', {}));
  const [creditMemos, setCreditMemos] = useState(() => load('creditMemos', {}));
  const [warning, setWarning] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => load('adminPassword', '1234'));
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [popularPeriod, setPopularPeriod] = useState('7');
  const [popularLimit, setPopularLimit] = useState(() => load('popularLimit', 5));
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState('');
  const [showCredit, setShowCredit] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [collapsedCredit, setCollapsedCredit] = useState({});
  const [statsStart, setStatsStart] = useState(getDateInput(30));
  const [statsEnd, setStatsEnd] = useState(todayInput());
  const [categoryOrder, setCategoryOrder] = useState(() => load('categoryOrder', ['식사류', '주류', '음료']));
  const [serviceOptions, setServiceOptions] = useState(() =>
    load('serviceOptions', {
      dineIn: { name: '', price: 0 },
      takeout: { name: '포장용기', price: 0 },
    })
  );
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: '식사류', emoji: '🍽️', image: '' });
  const [newCategory, setNewCategory] = useState('');
  const [resetWord, setResetWord] = useState('');

  useEffect(() => save('menus', menus), [menus]);
  useEffect(() => save('orders', orders), [orders]);
  useEffect(() => save('salesHistory', salesHistory), [salesHistory]);
  useEffect(() => save('tableCount', tableCount), [tableCount]);
  useEffect(() => save('takeoutFee', takeoutFee), [takeoutFee]);
  useEffect(() => save('popularLimit', popularLimit), [popularLimit]);
  useEffect(() => save('adminPassword', adminPassword), [adminPassword]);
  useEffect(() => save('categoryOrder', categoryOrder), [categoryOrder]);
  useEffect(() => save('creditContacts', creditContacts), [creditContacts]);
  useEffect(() => save('creditMemos', creditMemos), [creditMemos]);
  useEffect(() => save('serviceOptions', serviceOptions), [serviceOptions]);

  const currentOrders = orders[selectedTable] || [];
  const selectedEat = eatType[selectedTable] || '식당이용';
  const selectedPayment = paymentType[selectedTable] || '현금';
  const serviceExtra = selectedEat === '포장' ? serviceOptions.takeout : serviceOptions.dineIn;
  const serviceExtraPrice = Number(serviceExtra?.price || 0);
  const total = useMemo(() => {
    const base = currentOrders.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    return base + serviceExtraPrice;
  }, [currentOrders, serviceExtraPrice]);

  const allCategories = useMemo(() => {
    const set = new Set([...categoryOrder, ...menus.map((m) => m.category || '기타')]);
    return [...set].filter(Boolean);
  }, [categoryOrder, menus]);
  const groupedMenus = useMemo(() => {
    const grouped = {};
    allCategories.forEach((cat) => (grouped[cat] = []));
    menus.forEach((menu) => {
      const cat = menu.category || '기타';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(menu);
    });
    return grouped;
  }, [menus, allCategories]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod);
    const now = Date.now();
    const count = {};
    salesHistory
      .filter((x) => now - Number(x.timestamp || 0) < days * 24 * 60 * 60 * 1000)
      .forEach((sale) => {
        (sale.items || []).forEach((item) => {
          count[item.name] = (count[item.name] || 0) + Number(item.qty || 0);
        });
      });
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(popularLimit || 5));
  }, [salesHistory, popularPeriod, popularLimit]);

  const unpaidCredits = salesHistory.filter((x) => x.payment === '외상');
  const groupedCredits = useMemo(() => {
    const acc = {};
    unpaidCredits.forEach((item) => {
      const group = item.credit || '미지정';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
    });
    Object.keys(acc).forEach((group) => {
      acc[group].sort((a, b) => Number(a.paid) - Number(b.paid) || b.timestamp - a.timestamp);
    });
    return acc;
  }, [unpaidCredits]);
  const creditNameList = [...new Set(unpaidCredits.map((x) => x.credit).filter(Boolean))];

  const filteredStats = useMemo(() => {
    const start = new Date(statsStart);
    const end = new Date(statsEnd);
    end.setHours(23, 59, 59, 999);
    return salesHistory.filter((x) => {
      const t = new Date(Number(x.timestamp || Date.now()));
      return t >= start && t <= end;
    });
  }, [salesHistory, statsStart, statsEnd]);
  const paymentStats = useMemo(() => {
    const acc = {};
    PAYMENT_LIST.forEach((p) => (acc[p] = 0));
    filteredStats.forEach((x) => (acc[x.payment || '현금'] = (acc[x.payment || '현금'] || 0) + Number(x.total || 0)));
    return acc;
  }, [filteredStats]);
  const eatStats = useMemo(() => {
    const acc = { 식당이용: 0, 포장: 0 };
    filteredStats.forEach((x) => (acc[x.eatType || '식당이용'] = (acc[x.eatType || '식당이용'] || 0) + Number(x.total || 0)));
    return acc;
  }, [filteredStats]);
  const menuStats = useMemo(() => {
    const acc = {};
    filteredStats.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!acc[item.name]) acc[item.name] = { qty: 0, amount: 0 };
        acc[item.name].qty += Number(item.qty || 0);
        acc[item.name].amount += Number(item.qty || 0) * Number(item.price || 0);
      });
    });
    return Object.entries(acc).sort((a, b) => b[1].qty - a[1].qty);
  }, [filteredStats]);
  const hourStats = useMemo(() => {
    const acc = {};
    filteredStats.forEach((sale) => {
      const h = new Date(Number(sale.timestamp || Date.now())).getHours();
      acc[h] = (acc[h] || 0) + Number(sale.total || 0);
    });
    return acc;
  }, [filteredStats]);

  function addMenu(menu) {
    if (menu.soldOut) return alert('품절 메뉴입니다');
    setOrders((prev) => {
      const tableOrders = [...(prev[selectedTable] || [])];
      const find = tableOrders.find((x) => x.id === menu.id);
      if (find) find.qty += 1;
      else tableOrders.push({ ...menu, qty: 1 });
      return { ...prev, [selectedTable]: tableOrders };
    });
    setWarning('');
  }
  function changeQty(id, diff) {
    setOrders((prev) => ({
      ...prev,
      [selectedTable]: (prev[selectedTable] || [])
        .map((item) => (item.id === id ? { ...item, qty: item.qty + diff } : item))
        .filter((item) => item.qty > 0),
    }));
  }
  function updateCreditInfo(name, contact, memo) {
    if (!name) return;
    setCreditContacts((prev) => ({ ...prev, [name]: contact ?? prev[name] ?? '' }));
    setCreditMemos((prev) => ({ ...prev, [name]: memo ?? prev[name] ?? '' }));
  }
  function createSale(print = false) {
    if (currentOrders.length === 0) return alert('주문내역이 없습니다');
    if (selectedPayment === '외상' && !(creditGroup[selectedTable] || '').trim()) {
      setWarning('⚠️ 단체명을 입력 또는 선택해주세요 ⚠️');
      return;
    }
    const credit = creditGroup[selectedTable] || '';
    const saleItems = [...currentOrders];
    if (serviceExtra?.name && serviceExtraPrice > 0) {
      saleItems.push({ id: `service-${selectedEat}`, name: serviceExtra.name, price: serviceExtraPrice, qty: 1, category: '자동추가', emoji: '➕' });
    }
    const sale = {
      id: Date.now(),
      table: selectedTable,
      eatType: selectedEat,
      payment: selectedPayment,
      credit,
      contact: creditContacts[credit] || '',
      memo: creditMemos[credit] || '',
      total,
      remainingAmount: selectedPayment === '외상' ? total : 0,
      items: saleItems,
      paid: selectedPayment !== '외상',
      partialPayments: [],
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };
    setSalesHistory((prev) => [sale, ...prev]);
    setOrders((prev) => ({ ...prev, [selectedTable]: [] }));
    setWarning('');
    if (print) printReceipt(sale);
    alert(print ? '결제완료 후 영수증 출력 화면을 열었습니다' : '결제완료');
  }
  function printReceipt(sale) {
    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) return;
    const rows = (sale.items || [])
      .map((item) => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${money(item.price * item.qty)}원</td></tr>`)
      .join('');
    w.document.write(`<!doctype html><html><head><title>영수증</title><style>body{font-family:monospace;padding:12px;width:300px}h2{text-align:center}table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dashed #ccc}.total{font-size:20px;font-weight:bold;text-align:right;margin-top:12px}@media print{button{display:none}}</style></head><body><h2>영수증</h2><div>${sale.date} ${sale.time}</div><div>${sale.table}번 / ${sale.eatType}</div><div>결제: ${sale.payment}</div><table>${rows}</table><div class="total">합계 ${money(sale.total)}원</div><button onclick="window.print()">인쇄</button><script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  }
  async function handleImage(file) {
    if (!file) return;
    const data = await resizeImage(file, 300, 0.75);
    setNewMenu((prev) => ({ ...prev, image: data }));
  }
  function addNewMenu() {
    if (!newMenu.name || !newMenu.price) return alert('메뉴명과 가격을 입력해주세요');
    setMenus((prev) => [
      ...prev,
      { id: Date.now(), name: newMenu.name, price: Number(newMenu.price), category: newMenu.category, emoji: newMenu.emoji, image: newMenu.image, soldOut: false },
    ]);
    if (!categoryOrder.includes(newMenu.category)) setCategoryOrder((prev) => [...prev, newMenu.category]);
    setNewMenu({ name: '', price: '', category: newMenu.category, emoji: '🍽️', image: '' });
  }
  function toggleSoldOut(id) {
    setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, soldOut: !m.soldOut } : m)));
  }
  function completeSelectedCredits() {
    const ids = Object.keys(checkedCredit).filter((id) => checkedCredit[id]);
    if (ids.length === 0) return;
    setSalesHistory((prev) =>
      prev.map((x) => (ids.includes(String(x.id)) ? { ...x, remainingAmount: 0, paid: true } : x))
    );
    setCheckedCredit({});
  }
  function undoCompleteSelectedCredits() {
    const ids = Object.keys(checkedCredit).filter((id) => checkedCredit[id]);
    if (ids.length === 0) return;
    setSalesHistory((prev) =>
      prev.map((x) => (ids.includes(String(x.id)) ? { ...x, remainingAmount: x.total, paid: false } : x))
    );
    setCheckedCredit({});
  }
  function partialPay(item) {
    const pay = Number(partialAmount || 0);
    if (pay <= 0) return;
    setSalesHistory((prev) =>
      prev.map((x) => {
        if (x.id !== item.id) return x;
        const remain = Number(x.remainingAmount || x.total || 0) - pay;
        return {
          ...x,
          remainingAmount: remain > 0 ? remain : 0,
          paid: remain <= 0,
          partialPayments: [...(x.partialPayments || []), { amount: pay, date: new Date().toLocaleString() }],
        };
      })
    );
    setPartialAmount('');
  }
  function exportStatsCSV() {
    const rows = [['구분', '항목', '금액/수량'], ...Object.entries(paymentStats).map(([k, v]) => ['결제방식', k, v]), ...Object.entries(eatStats).map(([k, v]) => ['식사방식', k, v]), ...menuStats.map(([name, v]) => ['메뉴', `${name} ${v.qty}개`, v.amount])];
    downloadFile('매출통계.csv', rows.map((r) => r.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8;');
  }
  function backupAll(share = false) {
    const data = { menus, orders, salesHistory, tableCount, takeoutFee, popularLimit, adminPassword, categoryOrder, serviceOptions, creditContacts, creditMemos, version: 1, exportedAt: new Date().toISOString() };
    const text = JSON.stringify(data, null, 2);
    if (share && navigator.share) {
      const file = new File([text], 'pos-backup.json', { type: 'application/json' });
      navigator.share({ files: [file], title: 'POS 백업파일' }).catch(() => downloadFile('pos-backup.json', text));
    } else {
      downloadFile('pos-backup.json', text);
    }
  }
  function restoreBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.menus) setMenus(data.menus);
        if (data.orders) setOrders(data.orders);
        if (data.salesHistory) setSalesHistory(data.salesHistory);
        if (data.tableCount) setTableCount(data.tableCount);
        if (data.takeoutFee !== undefined) setTakeoutFee(data.takeoutFee);
        if (data.popularLimit) setPopularLimit(data.popularLimit);
        if (data.categoryOrder) setCategoryOrder(data.categoryOrder);
        if (data.serviceOptions) setServiceOptions(data.serviceOptions);
        if (data.creditContacts) setCreditContacts(data.creditContacts);
        if (data.creditMemos) setCreditMemos(data.creditMemos);
        alert('복구 완료');
      } catch {
        alert('백업파일을 확인해주세요');
      }
    };
    reader.readAsText(file);
  }
  function moveCategory(cat, dir) {
    setCategoryOrder((prev) => {
      const arr = [...prev];
      const i = arr.indexOf(cat);
      const ni = i + dir;
      if (i < 0 || ni < 0 || ni >= arr.length) return arr;
      [arr[i], arr[ni]] = [arr[ni], arr[i]];
      return arr;
    });
  }
  const tableTopCount = Math.ceil(tableCount / 2);
  const tableRows = [Array.from({ length: tableTopCount }, (_, i) => i + 1), Array.from({ length: tableCount - tableTopCount }, (_, i) => i + 1 + tableTopCount)];
  const selectedIds = Object.keys(checkedCredit).filter((id) => checkedCredit[id]);
  const selectedPaidOnly = selectedIds.length > 0 && selectedIds.every((id) => salesHistory.find((x) => String(x.id) === id)?.paid);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>식당 POS</h1>
          <p>주문 · 외상장부 · 판매통계</p>
        </div>
        <div className="header-actions">
          <button className="black" onClick={() => (adminUnlocked ? setAdminUnlocked(false) : null)}>{adminUnlocked ? '관리자모드 해제' : '관리자모드'}</button>
          {!adminUnlocked && (
            <span className="login-box"><input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="비밀번호" /><button onClick={() => { if (passwordInput === adminPassword) { setAdminUnlocked(true); setPasswordInput(''); } else alert('비밀번호가 틀렸습니다'); }}>확인</button></span>
          )}
        </div>
      </header>

      {adminUnlocked && (
        <section className="admin card">
          <h2>관리자모드</h2>
          <div className="admin-grid top-form">
            <input value={newMenu.name} onChange={(e) => setNewMenu((p) => ({ ...p, name: e.target.value }))} placeholder="메뉴명" />
            <input type="number" value={newMenu.price} onChange={(e) => setNewMenu((p) => ({ ...p, price: e.target.value }))} placeholder="가격" />
            <input value={newMenu.category} onChange={(e) => setNewMenu((p) => ({ ...p, category: e.target.value }))} placeholder="메뉴구분" />
            <select value={newMenu.emoji} onChange={(e) => setNewMenu((p) => ({ ...p, emoji: e.target.value }))}>{EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}</select>
            <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} />
            <button className="primary" onClick={addNewMenu}>메뉴추가</button>
          </div>
          <div className="help">사진은 자동으로 300px 정도로 축소 저장됩니다.</div>
          <div className="admin-grid">
            <label>테이블수<input type="number" value={tableCount} onChange={(e) => setTableCount(Number(e.target.value || 1))} /></label>
            <label>인기메뉴 표시 개수<input type="number" value={popularLimit} onChange={(e) => setPopularLimit(Number(e.target.value || 1))} /></label>
            <label>식당이용 내용<input value={serviceOptions.dineIn.name} onChange={(e) => setServiceOptions((p) => ({ ...p, dineIn: { ...p.dineIn, name: e.target.value } }))} /></label>
            <label>식당이용 금액<input type="number" value={serviceOptions.dineIn.price} onChange={(e) => setServiceOptions((p) => ({ ...p, dineIn: { ...p.dineIn, price: Number(e.target.value || 0) } }))} /></label>
            <label>포장 내용<input value={serviceOptions.takeout.name} onChange={(e) => setServiceOptions((p) => ({ ...p, takeout: { ...p.takeout, name: e.target.value } }))} /></label>
            <label>포장 금액<input type="number" value={serviceOptions.takeout.price} onChange={(e) => { const value = Number(e.target.value || 0); setServiceOptions((p) => ({ ...p, takeout: { ...p.takeout, price: value } })); setTakeoutFee(value); }} /></label>
          </div>
          <div className="sub-card">
            <h3>메뉴구분 순서관리</h3>
            <div className="inline"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="새 메뉴구분" /><button onClick={() => { if (newCategory && !categoryOrder.includes(newCategory)) setCategoryOrder((p) => [...p, newCategory]); setNewCategory(''); }}>추가</button></div>
            {categoryOrder.map((cat) => <div className="row" key={cat}><b>{cat}</b><span><button onClick={() => moveCategory(cat, -1)}>↑</button><button onClick={() => moveCategory(cat, 1)}>↓</button></span></div>)}
          </div>
          <div className="sub-card">
            <h3>현재 메뉴 / 품절관리</h3>
            {menus.map((m) => <div className="row" key={m.id}><span><input type="checkbox" checked={!!m.soldOut} onChange={() => toggleSoldOut(m.id)} /> {m.image ? '🖼️' : m.emoji} {m.name} {money(m.price)}원 {m.soldOut && <b className="danger">품절</b>}</span><button className="danger-btn" onClick={() => setMenus((p) => p.filter((x) => x.id !== m.id))}>삭제</button></div>)}
          </div>
          <div className="sub-card">
            <h3>비밀번호 변경</h3>
            <div className="inline"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호" /><button onClick={() => { if (newPassword.length < 4) return alert('4자리 이상 입력해주세요'); setAdminPassword(newPassword); setNewPassword(''); alert('변경 완료'); }}>변경</button></div>
          </div>
          <div className="sub-card data-manage">
            <h3>데이터 관리</h3>
            <button onClick={() => backupAll(false)}>전체백업 다운로드</button><p>메뉴/외상/판매통계/설정을 파일로 저장합니다.</p>
            <button onClick={() => backupAll(true)}>전체백업 공유하기</button><p>가능한 기기에서는 카톡/문자/메일 공유창을 열고, 안 되면 다운로드합니다.</p>
            <label className="file-label">백업파일 불러오기<input type="file" accept="application/json" onChange={(e) => restoreBackup(e.target.files?.[0])} /></label><p>저장한 백업파일로 복구합니다.</p>
            <button onClick={() => setOrders({})}>테스트 주문 초기화</button><p>현재 주문내역만 삭제합니다. 메뉴/통계/외상은 유지됩니다.</p>
            <div className="danger-zone"><input value={resetWord} onChange={(e) => setResetWord(e.target.value)} placeholder="초기화 입력" /><button onClick={() => { if (resetWord !== '초기화') return alert('초기화라고 입력해야 실행됩니다'); setSalesHistory([]); setResetWord(''); }}>판매/외상 데이터초기화</button><p>판매통계와 외상장부를 삭제합니다. 실행 전 반드시 백업하세요.</p></div>
          </div>
        </section>
      )}

      <main className="layout">
        <section className="left card">
          <h2>테이블</h2>
          <div className="table-zone">
            {tableRows.map((row, idx) => <div className="table-row" key={idx}>{row.map((n) => { const hasOrder = (orders[n] || []).length > 0; return <button key={n} onClick={() => setSelectedTable(n)} className={`table-btn ${selectedTable === n ? 'active' : ''} ${hasOrder ? 'has-order' : ''}`}>{n}번</button>; })}</div>)}
          </div>
          <div className="popular">
            <div className="section-title">🔥 인기메뉴</div>
            <div className="inline small">{['1', '7', '30'].map((v) => <button key={v} onClick={() => setPopularPeriod(v)} className={popularPeriod === v ? 'selected' : ''}>{v === '1' ? '오늘' : v === '7' ? '최근7일' : '최근30일'}</button>)}</div>
            <div className="popular-grid">{popularMenus.map(([name, qty]) => { const item = menus.find((x) => x.name === name); if (!item) return null; return <button key={name} onClick={() => addMenu(item)}><span>{item.image ? '🖼️' : item.emoji}</span><b>{name}</b><small>{qty}개</small></button>; })}</div>
          </div>
          <div className="eat-select"><button className={selectedEat === '식당이용' ? 'selected' : ''} onClick={() => setEatType((p) => ({ ...p, [selectedTable]: '식당이용' }))}>식당이용</button><button className={selectedEat === '포장' ? 'selected orange' : ''} onClick={() => setEatType((p) => ({ ...p, [selectedTable]: '포장' }))}>포장</button>{serviceExtra?.name && serviceExtraPrice > 0 && <span className="extra">{serviceExtra.name} +{money(serviceExtraPrice)}원</span>}</div>
          {allCategories.map((category) => <div key={category} className="menu-section"><h2>{category}</h2><div className="menu-grid">{(groupedMenus[category] || []).map((item) => <button key={item.id} disabled={item.soldOut} onClick={() => addMenu(item)} className={`menu-card ${item.soldOut ? 'soldout' : ''}`}>{item.image ? <img src={item.image} alt="menu" /> : <div className="emoji">{item.emoji}</div>}<b>{item.name}</b><span>{money(item.price)}원</span>{item.soldOut && <strong>품절</strong>}</button>)}</div></div>)}
        </section>

        <aside className="right card">
          <h2>주문내역 <span>{selectedTable}번</span></h2>
          <div className="order-list">{currentOrders.length === 0 && <div className="empty">메뉴를 선택해주세요</div>}{currentOrders.map((item) => <div className="order-item" key={item.id}><div><b>{item.name}</b><small>{money(item.price)}원</small></div><div className="qty"><button onClick={() => changeQty(item.id, -1)}>-</button><span>{item.qty}</span><button onClick={() => changeQty(item.id, 1)}>+</button></div></div>)}</div>
          <div className="payments">{PAYMENT_LIST.map((p) => <button key={p} onClick={() => setPaymentType((prev) => ({ ...prev, [selectedTable]: p }))} className={selectedPayment === p ? 'selected' : ''}>{p}</button>)}</div>
          {selectedPayment === '외상' && <div className={`credit-box ${warning ? 'warn' : ''}`}><b>외상 단체명 입력 또는 선택</b><input list="credit-list" value={creditGroup[selectedTable] || ''} onChange={(e) => { const name = e.target.value; setCreditGroup((p) => ({ ...p, [selectedTable]: name })); setWarning(''); }} placeholder="단체명" /><datalist id="credit-list">{creditNameList.map((name) => <option key={name} value={name} />)}</datalist><input value={creditContacts[creditGroup[selectedTable] || ''] || ''} onChange={(e) => updateCreditInfo(creditGroup[selectedTable], e.target.value, undefined)} placeholder="연락처 선택입력" /><input value={creditMemos[creditGroup[selectedTable] || ''] || ''} onChange={(e) => updateCreditInfo(creditGroup[selectedTable], undefined, e.target.value)} placeholder="기본메모 선택입력" />{warning && <div className="warning">{warning}</div>}</div>}
          <div className="total">총 금액 <b>{money(total)}원</b></div>
          <button className="pay" onClick={() => createSale(false)}>결제완료</button>
          <button className="print" onClick={() => createSale(true)}>결제완료 + 영수증 출력</button>
        </aside>
      </main>

      <div className="bottom-actions"><button onClick={() => setShowCredit((p) => !p)}>외상장부 {showCredit ? '▲' : '▼'}</button><button onClick={() => setShowStats((p) => !p)}>판매통계 {showStats ? '▲' : '▼'}</button></div>

      {showCredit && <section className="panel card"><h2>외상장부</h2>{Object.keys(groupedCredits).length === 0 && <div className="empty">외상내역이 없습니다</div>}{Object.entries(groupedCredits).map(([group, list]) => { const totalRemain = list.reduce((s, x) => s + Number(x.remainingAmount || 0), 0); return <div className="credit-group" key={group}><div className="credit-head"><div><b>{group}</b><span>{creditContacts[group] && ` ☎ ${creditContacts[group]}`} {creditMemos[group] && ` · ${creditMemos[group]}`}</span><small>잔액 {money(totalRemain)}원</small></div><button onClick={() => setCollapsedCredit((p) => ({ ...p, [group]: !p[group] }))}>{collapsedCredit[group] ? '펼치기' : '숨기기'}</button></div>{!collapsedCredit[group] && <div className="credit-list">{list.map((item) => { const checked = !!checkedCredit[item.id]; return <div key={item.id} className={`credit-item ${item.paid ? 'paid' : ''} ${checked ? 'checked' : ''}`}><input type="checkbox" checked={checked} onChange={(e) => setCheckedCredit((p) => ({ ...p, [item.id]: e.target.checked }))} /><div className="grow"><b>{item.date} {item.time} / {item.table}번</b><p>{(item.items || []).map((x) => `${x.name} ${x.qty}개`).join(', ')}</p>{(item.partialPayments || []).map((p, idx) => <small key={idx}>부분결제 {money(p.amount)}원 / {p.date}</small>)}</div><div className="amount">{item.paid ? '결제완료' : `${money(item.remainingAmount)}원`}</div>{!item.paid && <div className="inline"><input value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} type="number" placeholder="일부결제" /><button onClick={() => partialPay(item)}>처리</button></div>}</div>; })}</div>}</div>; })}<div className="inline"><button className={selectedPaidOnly ? 'orange-btn' : 'primary'} onClick={selectedPaidOnly ? undoCompleteSelectedCredits : completeSelectedCredits}>{selectedPaidOnly ? '선택완납처리해제' : '선택완납처리'}</button></div></section>}

      {showStats && <section className="panel card"><h2>판매통계</h2><div className="inline"><input type="date" value={statsStart} onChange={(e) => setStatsStart(e.target.value)} /><span>~</span><input type="date" value={statsEnd} onChange={(e) => setStatsEnd(e.target.value)} /><button onClick={exportStatsCSV}>통계 CSV 다운로드</button></div><div className="stats-grid"><div><h3>결제방식별</h3>{Object.entries(paymentStats).map(([k, v]) => <p key={k}>{k}: <b>{money(v)}원</b></p>)}</div><div><h3>식사/포장별</h3>{Object.entries(eatStats).map(([k, v]) => <p key={k}>{k}: <b>{money(v)}원</b></p>)}</div><div><h3>시간대별</h3>{Object.entries(hourStats).map(([k, v]) => <p key={k}>{k}시: <b>{money(v)}원</b></p>)}</div></div><div className="sub-card"><h3>메뉴별 판매량/금액</h3>{menuStats.map(([name, v]) => <div className="row" key={name}><span>{name} {v.qty}개</span><b>{money(v.amount)}원</b></div>)}</div></section>}
    </div>
  );
}
