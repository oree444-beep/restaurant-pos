import React, { useEffect, useMemo, useState } from 'react';

const defaultMenus = [
  { id: 1, name: '생태탕', price: 12000, category: '식사류', emoji: '🍲', image: '' },
  { id: 2, name: '애호박찌개', price: 10000, category: '식사류', emoji: '🥘', image: '' },
  { id: 3, name: '소주', price: 5000, category: '주류', emoji: '🍶', image: '' },
  { id: 4, name: '맥주', price: 5000, category: '주류', emoji: '🍺', image: '' },
  { id: 5, name: '콜라', price: 2000, category: '음료', emoji: '🥤', image: '' },
];

const paymentList = ['현금', '카드', '카드+현금', '상품권', '기타', '외상'];
const emojiList = ['🍲', '🥘', '🍽️', '🍶', '🍺', '🥤', '🍜', '🐟', '🍚'];

function load(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveCSV(filename, rows) {
  const csv = rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function resizeImage(file, onDone) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    alert('이미지가 너무 큽니다. 8MB 이하 사진을 선택해주세요.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 300;
      let { width, height } = img;
      if (width > height && width > max) {
        height = Math.round((height * max) / width);
        width = max;
      } else if (height > max) {
        width = Math.round((width * max) / height);
        height = max;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      onDone(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

export default function App() {
  const [menus, setMenus] = useState(() => load('menus', defaultMenus));
  const [orders, setOrders] = useState(() => load('orders', {}));
  const [salesHistory, setSalesHistory] = useState(() => load('salesHistory', []));
  const [selectedTable, setSelectedTable] = useState(1);
  const [tableCount, setTableCount] = useState(() => load('tableCount', 12));
  const [paymentType, setPaymentType] = useState({});
  const [creditGroup, setCreditGroup] = useState({});
  const [warning, setWarning] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [takeoutFee, setTakeoutFee] = useState(() => load('takeoutFee', 0));
  const [eatType, setEatType] = useState({});
  const [popularPeriod, setPopularPeriod] = useState('7');
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState({});
  const [openCreditGroups, setOpenCreditGroups] = useState({});
  const [statStart, setStatStart] = useState('');
  const [statEnd, setStatEnd] = useState('');
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: '식사류', emoji: '🍽️', image: '' });

  useEffect(() => localStorage.setItem('menus', JSON.stringify(menus)), [menus]);
  useEffect(() => localStorage.setItem('orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('salesHistory', JSON.stringify(salesHistory)), [salesHistory]);
  useEffect(() => localStorage.setItem('tableCount', JSON.stringify(tableCount)), [tableCount]);
  useEffect(() => localStorage.setItem('takeoutFee', JSON.stringify(takeoutFee)), [takeoutFee]);

  const currentOrders = orders[selectedTable] || [];
  const currentPayment = paymentType[selectedTable] || '현금';
  const total = useMemo(() => {
    const base = currentOrders.reduce((sum, item) => sum + item.price * item.qty, 0);
    const isTakeout = (eatType[selectedTable] || '식당식사') === '포장';
    return base + (isTakeout ? Number(takeoutFee || 0) : 0);
  }, [currentOrders, eatType, selectedTable, takeoutFee]);

  const groupedMenus = useMemo(() => menus.reduce((acc, menu) => {
    if (!acc[menu.category]) acc[menu.category] = [];
    acc[menu.category].push(menu);
    return acc;
  }, {}), [menus]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod);
    const now = Date.now();
    const filtered = salesHistory.filter(x => now - Number(x.timestamp || 0) < days * 24 * 60 * 60 * 1000);
    const count = {};
    filtered.forEach(sale => sale.items.forEach(item => {
      count[item.name] = (count[item.name] || 0) + item.qty;
    }));
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [salesHistory, popularPeriod]);

  function addMenu(menu) {
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
      [selectedTable]: (prev[selectedTable] || []).map(item => item.id === id ? { ...item, qty: item.qty + diff } : item).filter(item => item.qty > 0)
    }));
  }

  function completePayment() {
    const payment = paymentType[selectedTable] || '현금';
    if (currentOrders.length === 0) {
      alert('주문내역이 없습니다');
      return;
    }
    if (payment === '외상' && !(creditGroup[selectedTable] || '').trim()) {
      setWarning('⚠️ 단체명을 입력 또는 선택해주세요 ⚠️');
      return;
    }
    const now = new Date();
    const sale = {
      id: Date.now(),
      table: selectedTable,
      eatType: eatType[selectedTable] || '식당식사',
      payment,
      credit: creditGroup[selectedTable] || '',
      total,
      remainingAmount: total,
      items: currentOrders,
      paid: payment !== '외상',
      partialPayments: [],
      timestamp: now.getTime(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString()
    };
    setSalesHistory(prev => [sale, ...prev]);
    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setWarning('');
    alert('결제완료');
  }

  function addNewMenu() {
    if (!newMenu.name || !newMenu.price) {
      alert('메뉴명과 가격을 입력해주세요');
      return;
    }
    setMenus(prev => [...prev, { id: Date.now(), name: newMenu.name, price: Number(newMenu.price), category: newMenu.category || '식사류', emoji: newMenu.image ? '' : newMenu.emoji, image: newMenu.image }]);
    setNewMenu({ name: '', price: '', category: '식사류', emoji: '🍽️', image: '' });
  }

  const unpaidCredits = salesHistory.filter(x => x.payment === '외상' && !x.paid);
  const groupedCredits = unpaidCredits.reduce((acc, item) => {
    const key = item.credit || '미지정';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const creditNames = [...new Set(unpaidCredits.map(x => x.credit).filter(Boolean))];

  function paySelectedCredits() {
    setSalesHistory(prev => prev.map(x => checkedCredit[x.id] ? { ...x, remainingAmount: 0, paid: true, partialPayments: [...(x.partialPayments || []), { amount: x.remainingAmount || x.total, date: new Date().toLocaleDateString() }] } : x));
    setCheckedCredit({});
  }

  function payPartialCredit(item) {
    const pay = Number(partialAmount[item.id] || 0);
    if (pay <= 0) return;
    setSalesHistory(prev => prev.map(x => {
      if (x.id !== item.id) return x;
      const remain = Number(x.remainingAmount ?? x.total) - pay;
      return { ...x, remainingAmount: remain > 0 ? remain : 0, paid: remain <= 0, partialPayments: [...(x.partialPayments || []), { amount: pay, date: new Date().toLocaleDateString() }] };
    }));
    setPartialAmount(prev => ({ ...prev, [item.id]: '' }));
  }

  const totalSales = salesHistory.reduce((sum, x) => sum + Number(x.total || 0), 0);
  const todaySales = salesHistory.filter(x => x.date === new Date().toLocaleDateString()).reduce((sum, x) => sum + Number(x.total || 0), 0);

  const filteredStats = useMemo(() => {
    return salesHistory.filter(x => {
      if (!statStart && !statEnd) return true;
      const d = new Date(Number(x.timestamp || 0));
      if (statStart && d < new Date(statStart)) return false;
      if (statEnd) {
        const end = new Date(statEnd);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [salesHistory, statStart, statEnd]);

  const menuStats = filteredStats.reduce((acc, sale) => {
    sale.items.forEach(item => { acc[item.name] = (acc[item.name] || 0) + item.qty; });
    return acc;
  }, {});
  const hourStats = filteredStats.reduce((acc, sale) => {
    const h = new Date(Number(sale.timestamp || 0)).getHours();
    acc[h] = (acc[h] || 0) + sale.total;
    return acc;
  }, {});

  function exportCSV() {
    const rows = [['날짜', '시간', '테이블', '결제', '단체명', '금액', '메뉴내역']];
    filteredStats.forEach(x => rows.push([x.date, x.time, `${x.table}번`, x.payment, x.credit, x.total, x.items.map(i => `${i.name} ${i.qty}개`).join(' / ')]));
    rows.push([]);
    rows.push(['메뉴별 판매량']);
    rows.push(['메뉴', '수량']);
    Object.entries(menuStats).forEach(([name, qty]) => rows.push([name, qty]));
    rows.push([]);
    rows.push(['시간대별 매출']);
    rows.push(['시간', '매출']);
    Object.entries(hourStats).forEach(([hour, amount]) => rows.push([`${hour}시`, amount]));
    saveCSV('매출통계.csv', rows);
  }

  return (
    <div className='p-4 max-w-7xl mx-auto'>
      <div className='flex justify-between items-center mb-4'>
        <h1 className='text-3xl font-bold'>식당 POS</h1>
        <div className='flex gap-2'>
          <button onClick={() => setAdminMode(!adminMode)} className='bg-black text-white px-4 py-2 rounded-xl'>
            {adminMode ? '관리자모드 해제' : '관리자모드'}
          </button>
          <button onClick={exportCSV} className='bg-green-600 text-white px-4 py-2 rounded-xl'>CSV 다운로드</button>
        </div>
      </div>

      <div className='grid grid-cols-3 md:grid-cols-6 gap-2 mb-5'>
        {Array.from({ length: tableCount }, (_, i) => i + 1).map(n => {
          const hasOrder = (orders[n] || []).length > 0;
          return <button key={n} onClick={() => setSelectedTable(n)} className={`p-4 rounded-2xl border-4 font-bold text-lg ${selectedTable === n ? 'bg-blue-600 text-white border-blue-900' : hasOrder ? 'bg-yellow-100 border-yellow-500' : 'bg-gray-100 border-transparent'}`}>{n}번</button>;
        })}
      </div>

      <div className='bg-yellow-50 border rounded-2xl p-4 mb-5'>
        <div className='font-bold text-xl mb-3'>🔥 인기메뉴</div>
        <div className='flex gap-2 mb-4'>
          {['1', '7', '30'].map(v => <button key={v} onClick={() => setPopularPeriod(v)} className={`px-3 py-2 rounded-xl ${popularPeriod === v ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{v === '1' ? '오늘' : v === '7' ? '최근7일' : '최근30일'}</button>)}
        </div>
        <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
          {popularMenus.length === 0 && <div className='text-gray-500'>결제 후 인기메뉴가 표시됩니다</div>}
          {popularMenus.map(([name]) => {
            const item = menus.find(x => x.name === name);
            if (!item) return null;
            return <button key={name} onClick={() => addMenu(item)} className='bg-white rounded-2xl p-3 border shadow'>
              {item.image ? <img src={item.image} alt='menu' className='w-16 h-16 object-cover rounded-xl mx-auto mb-2' /> : <div className='text-4xl'>{item.emoji}</div>}
              <div className='font-bold'>{item.name}</div>
            </button>;
          })}
        </div>
      </div>

      <div className='mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6'>
        <div className='text-2xl font-bold mb-4 text-blue-800'>판매통계</div>
        <div className='flex flex-wrap gap-2 mb-4'>
          <input type='date' value={statStart} onChange={e => setStatStart(e.target.value)} className='border p-2 rounded-xl' />
          <input type='date' value={statEnd} onChange={e => setStatEnd(e.target.value)} className='border p-2 rounded-xl' />
          <button onClick={exportCSV} className='bg-green-600 text-white px-4 py-2 rounded-xl'>기간통계 CSV</button>
        </div>
        <div className='grid md:grid-cols-2 gap-4 mb-6'>
          <div className='bg-white rounded-2xl p-4 border'><div className='text-gray-500 mb-2'>오늘 매출</div><div className='text-3xl font-bold text-blue-700'>{todaySales.toLocaleString()}원</div></div>
          <div className='bg-white rounded-2xl p-4 border'><div className='text-gray-500 mb-2'>누적 매출</div><div className='text-3xl font-bold text-green-700'>{totalSales.toLocaleString()}원</div></div>
        </div>
        <div className='grid md:grid-cols-2 gap-4'>
          <div className='bg-white rounded-2xl p-4 border'><div className='font-bold text-xl mb-4'>메뉴별 판매량</div>{Object.entries(menuStats).map(([name, qty]) => <div key={name} className='flex justify-between border-b py-2'><span>{name}</span><b>{qty}개</b></div>)}</div>
          <div className='bg-white rounded-2xl p-4 border'><div className='font-bold text-xl mb-4'>시간대별 매출</div>{Object.entries(hourStats).map(([hour, amount]) => <div key={hour} className='flex justify-between border-b py-2'><span>{hour}시</span><b>{Number(amount).toLocaleString()}원</b></div>)}</div>
        </div>
      </div>

      <div className='flex gap-3 mb-5'>
        <button onClick={() => setEatType(prev => ({ ...prev, [selectedTable]: '식당식사' }))} className={`px-5 py-3 rounded-2xl font-bold ${(eatType[selectedTable] || '식당식사') === '식당식사' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>식당식사</button>
        <button onClick={() => setEatType(prev => ({ ...prev, [selectedTable]: '포장' }))} className={`px-5 py-3 rounded-2xl font-bold ${(eatType[selectedTable] || '') === '포장' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>포장</button>
      </div>

      {Object.entries(groupedMenus).map(([category, list]) => <div key={category} className='mb-6'>
        <div className='text-2xl font-bold mb-3'>{category}</div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {list.map(item => <button key={item.id} onClick={() => addMenu(item)} className='bg-white rounded-2xl p-4 border shadow text-left'>
            {item.image ? <img src={item.image} alt='menu' className='w-20 h-20 object-cover rounded-xl mb-2' /> : <div className='text-5xl mb-2'>{item.emoji}</div>}
            <div className='font-bold text-xl'>{item.name}</div><div>{item.price.toLocaleString()}원</div>
            {adminMode && <button onClick={e => { e.stopPropagation(); setMenus(prev => prev.filter(x => x.id !== item.id)); }} className='mt-2 bg-red-500 text-white px-3 py-1 rounded-xl'>삭제</button>}
          </button>)}
        </div>
      </div>)}

      <div className='bg-gray-50 rounded-2xl p-4 border'>
        <div className='text-2xl font-bold mb-4'>주문내역</div>
        {currentOrders.map(item => <div key={item.id} className='flex justify-between items-center border-b py-3'><div className='font-bold text-xl'>{item.name} {item.qty}개</div><div className='flex gap-2'><button onClick={() => changeQty(item.id, -1)} className='w-14 h-14 bg-red-500 text-white rounded-2xl text-2xl'>-</button><button onClick={() => changeQty(item.id, 1)} className='w-14 h-14 bg-blue-600 text-white rounded-2xl text-2xl'>+</button></div></div>)}
        <div className='flex gap-2 flex-wrap mt-5 mb-4'>{paymentList.map(type => <button key={type} onClick={() => { setPaymentType(prev => ({ ...prev, [selectedTable]: type })); setWarning(''); }} className={`px-4 py-3 rounded-xl font-bold ${(currentPayment) === type ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>{type}</button>)}</div>
        {currentPayment === '외상' && <div className={`rounded-2xl p-4 mb-4 ${warning ? 'bg-red-50 border-4 border-red-500' : 'bg-gray-100 border'}`}><div className={`font-bold text-xl mb-3 ${warning ? 'text-red-600' : 'text-gray-700'}`}>외상 단체명 입력 또는 선택</div><input list='credit-list' value={creditGroup[selectedTable] || ''} onChange={e => setCreditGroup(prev => ({ ...prev, [selectedTable]: e.target.value }))} placeholder='단체명 입력 또는 선택' className='border p-4 rounded-2xl w-full text-xl font-bold' /><datalist id='credit-list'>{creditNames.map(name => <option key={name} value={name} />)}</datalist>{warning && <div className='text-red-600 text-xl font-bold mt-3'>{warning}</div>}</div>}
        <div className='text-3xl font-bold mb-4'>총 금액: {total.toLocaleString()}원</div>
        <button onClick={completePayment} className='w-full bg-blue-700 text-white py-5 rounded-2xl text-2xl font-bold'>결제완료</button>
      </div>

      <div className='mt-8 bg-white border rounded-2xl p-4'>
        <div className='text-2xl font-bold mb-4'>외상장부</div>
        <button onClick={paySelectedCredits} className='mb-4 bg-green-600 text-white px-4 py-2 rounded-xl font-bold'>선택 완납처리</button>
        <div className='space-y-6'>
          {Object.entries(groupedCredits).map(([groupName, list]) => {
            const groupTotal = list.reduce((sum, x) => sum + Number(x.remainingAmount || x.total || 0), 0);
            const isOpen = openCreditGroups[groupName] !== false;
            return <div key={groupName} className='border-2 border-red-200 rounded-2xl p-4 bg-red-50'>
              <div className='flex justify-between items-center mb-4'><div><div className='text-2xl font-bold text-red-700'>{groupName}</div><div className='text-red-600 font-bold'>외상잔액: {groupTotal.toLocaleString()}원</div></div><button onClick={() => setOpenCreditGroups(prev => ({ ...prev, [groupName]: !isOpen }))} className='bg-white border px-4 py-2 rounded-xl'>{isOpen ? '숨기기' : '펼치기'}</button></div>
              {isOpen && <div className='space-y-4'>{list.map(item => <div key={item.id} className={`border rounded-2xl p-4 bg-white ${item.paid ? 'opacity-50' : ''}`}><div className='flex items-start gap-4'><input type='checkbox' checked={checkedCredit[item.id] === true} onChange={e => setCheckedCredit(prev => ({ ...prev, [item.id]: e.target.checked }))} className='w-6 h-6 mt-1' /><div className='flex-1'><div className='font-bold text-xl'>{item.credit} {item.paid ? '(결제완료)' : ''}</div><div>{item.date} {item.time} / {item.table}번 테이블</div><div>{item.items.map(x => `${x.name} ${x.qty}개`).join(', ')}</div><div className='font-bold text-lg mt-2'>남은금액: {(item.remainingAmount || item.total).toLocaleString()}원</div>{(item.partialPayments || []).map((p, idx) => <div key={idx} className='text-blue-600'>부분결제 {p.amount.toLocaleString()}원 / {p.date}</div>)}<div className='flex gap-2 mt-3'><input type='number' value={partialAmount[item.id] || ''} onChange={e => setPartialAmount(prev => ({ ...prev, [item.id]: e.target.value }))} placeholder='부분결제금액' className='border p-2 rounded-xl' /><button onClick={() => payPartialCredit(item)} className='bg-orange-500 text-white px-4 rounded-xl'>일부결제</button></div></div></div></div>)}</div>}
            </div>;
          })}
        </div>
      </div>

      {adminMode && <div className='mt-8 bg-gray-100 rounded-2xl p-4'><div className='text-2xl font-bold mb-4'>관리자모드</div><div className='grid md:grid-cols-2 gap-3'><input value={newMenu.name} onChange={e => setNewMenu(prev => ({ ...prev, name: e.target.value }))} placeholder='메뉴명' className='border p-3 rounded-xl' /><input type='number' value={newMenu.price} onChange={e => setNewMenu(prev => ({ ...prev, price: e.target.value }))} placeholder='가격' className='border p-3 rounded-xl' /><input value={newMenu.category} onChange={e => setNewMenu(prev => ({ ...prev, category: e.target.value }))} placeholder='카테고리' className='border p-3 rounded-xl' /><select value={newMenu.emoji} onChange={e => setNewMenu(prev => ({ ...prev, emoji: e.target.value }))} className='border p-3 rounded-xl'>{emojiList.map(e => <option key={e} value={e}>{e}</option>)}</select><input type='file' accept='image/*' className='border p-3 rounded-xl' onChange={e => resizeImage(e.target.files?.[0], img => setNewMenu(prev => ({ ...prev, image: img })))} /><button onClick={addNewMenu} className='bg-blue-600 text-white rounded-xl p-3 font-bold'>메뉴추가</button></div><div className='text-sm text-gray-500 mt-2'>이미지는 300px 기준으로 자동축소됩니다.</div><div className='grid md:grid-cols-2 gap-3 mt-5'><input type='number' value={tableCount} onChange={e => setTableCount(Number(e.target.value || 1))} placeholder='테이블수' className='border p-3 rounded-xl' /><input type='number' value={takeoutFee} onChange={e => setTakeoutFee(Number(e.target.value || 0))} placeholder='포장추가금' className='border p-3 rounded-xl' /></div></div>}
    </div>
  );
}
