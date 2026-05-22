
import React, { useEffect, useMemo, useState } from 'react';
import './style.css';

const defaultMenus = [
  { id: 1, name: '생태탕', price: 12000, category: '식사류', emoji: '🍲', image: '' },
  { id: 2, name: '애호박찌개', price: 10000, category: '식사류', emoji: '🥘', image: '' },
  { id: 3, name: '소주', price: 5000, category: '주류', emoji: '🍶', image: '' },
  { id: 4, name: '맥주', price: 5000, category: '주류', emoji: '🍺', image: '' },
  { id: 5, name: '콜라', price: 2000, category: '음료', emoji: '🥤', image: '' },
];

const paymentList = ['현금', '카드', '카드+현금', '상품권', '기타', '외상'];
const emojiList = ['🍲','🥘','🍽️','🍚','🍜','🐟','🥩','🍖','🍗','🍶','🍺','🥤','🧃','☕','🍱','🧂'];

function load(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function resizeImage(file, maxSize = 300, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
      img.src = String(reader.result || '');
    };

    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [menus, setMenus] = useState(() => load('menus', defaultMenus));
  const [orders, setOrders] = useState(() => load('orders', {}));
  const [salesHistory, setSalesHistory] = useState(() => load('salesHistory', []));
  const [selectedTable, setSelectedTable] = useState(1);
  const [tableCount, setTableCount] = useState(() => load('tableCount', 12));
  const [paymentType, setPaymentType] = useState(() => load('paymentType', {}));
  const [creditGroup, setCreditGroup] = useState(() => load('creditGroup', {}));
  const [warning, setWarning] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => load('adminPassword', '1234'));
  const [adminInput, setAdminInput] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [takeoutFee, setTakeoutFee] = useState(() => load('takeoutFee', 0));
  const [takeoutFeeName, setTakeoutFeeName] = useState(() => load('takeoutFeeName', '포장용기'));
  const [dineInAutoFee, setDineInAutoFee] = useState(() => load('dineInAutoFee', 0));
  const [dineInFeeName, setDineInFeeName] = useState(() => load('dineInFeeName', '식당이용'));
  const [eatType, setEatType] = useState(() => load('eatType', {}));
  const [popularPeriod, setPopularPeriod] = useState('7');
  const [popularLimit, setPopularLimit] = useState(() => load('popularLimit', 5));
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState({});
  const [collapsedCreditGroups, setCollapsedCreditGroups] = useState(() => load('collapsedCreditGroups', {}));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [newMenu, setNewMenu] = useState({
    name: '',
    price: '',
    category: '식사류',
    emoji: '🍽️',
    image: ''
  });

  useEffect(() => localStorage.setItem('menus', JSON.stringify(menus)), [menus]);
  useEffect(() => localStorage.setItem('orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('salesHistory', JSON.stringify(salesHistory)), [salesHistory]);
  useEffect(() => localStorage.setItem('tableCount', JSON.stringify(tableCount)), [tableCount]);
  useEffect(() => localStorage.setItem('paymentType', JSON.stringify(paymentType)), [paymentType]);
  useEffect(() => localStorage.setItem('creditGroup', JSON.stringify(creditGroup)), [creditGroup]);
  useEffect(() => localStorage.setItem('adminPassword', JSON.stringify(adminPassword)), [adminPassword]);
  useEffect(() => localStorage.setItem('takeoutFee', JSON.stringify(takeoutFee)), [takeoutFee]);
  useEffect(() => localStorage.setItem('takeoutFeeName', JSON.stringify(takeoutFeeName)), [takeoutFeeName]);
  useEffect(() => localStorage.setItem('dineInAutoFee', JSON.stringify(dineInAutoFee)), [dineInAutoFee]);
  useEffect(() => localStorage.setItem('dineInFeeName', JSON.stringify(dineInFeeName)), [dineInFeeName]);
  useEffect(() => localStorage.setItem('eatType', JSON.stringify(eatType)), [eatType]);
  useEffect(() => localStorage.setItem('popularLimit', JSON.stringify(popularLimit)), [popularLimit]);
  useEffect(() => localStorage.setItem('collapsedCreditGroups', JSON.stringify(collapsedCreditGroups)), [collapsedCreditGroups]);

  const currentOrders = orders[selectedTable] || [];
  const currentEatType = eatType[selectedTable] || '식당식사';

  const autoFee = useMemo(() => {
    if (currentEatType === '포장') return Number(takeoutFee || 0);
    return Number(dineInAutoFee || 0);
  }, [currentEatType, takeoutFee, dineInAutoFee]);

  const autoFeeName = currentEatType === '포장' ? takeoutFeeName : dineInFeeName;

  const total = useMemo(() => {
    const base = currentOrders.reduce((sum, item) => sum + item.price * item.qty, 0);
    return base + autoFee;
  }, [currentOrders, autoFee]);

  const groupedMenus = useMemo(() => {
    return menus.reduce((acc, menu) => {
      if (!acc[menu.category]) acc[menu.category] = [];
      acc[menu.category].push(menu);
      return acc;
    }, {});
  }, [menus]);

  const selectedCreditNames = useMemo(() => {
    const names = salesHistory
      .filter(x => x.payment === '외상' && !x.paid)
      .map(x => x.credit)
      .filter(Boolean);
    return [...new Set(names)];
  }, [salesHistory]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod);
    const now = Date.now();
    const filtered = salesHistory.filter(x => now - Number(x.timestamp || 0) < days * 24 * 60 * 60 * 1000);
    const count = {};

    filtered.forEach(sale => {
      (sale.items || []).forEach(item => {
        count[item.name] = (count[item.name] || 0) + item.qty;
      });
    });

    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(popularLimit || 5));
  }, [salesHistory, popularPeriod, popularLimit]);

  const filteredSales = useMemo(() => {
    return salesHistory.filter(item => {
      if (!startDate && !endDate) return true;
      const t = Number(item.timestamp || 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
      return t >= start && t <= end;
    });
  }, [salesHistory, startDate, endDate]);

  const paymentStats = useMemo(() => {
    return filteredSales.reduce((acc, item) => {
      acc[item.payment] = (acc[item.payment] || 0) + Number(item.total || 0);
      return acc;
    }, {});
  }, [filteredSales]);

  const eatTypeStats = useMemo(() => {
    return filteredSales.reduce((acc, item) => {
      acc[item.eatType] = (acc[item.eatType] || 0) + Number(item.total || 0);
      return acc;
    }, {});
  }, [filteredSales]);

  const comboStats = useMemo(() => {
    return filteredSales.reduce((acc, item) => {
      const key = `${item.eatType || '식당식사'} / ${item.payment || '현금'}`;
      acc[key] = (acc[key] || 0) + Number(item.total || 0);
      return acc;
    }, {});
  }, [filteredSales]);

  const menuSalesStats = useMemo(() => {
    const result = {};
    filteredSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        if (!result[item.name]) result[item.name] = { qty: 0, amount: 0 };
        result[item.name].qty += Number(item.qty || 0);
        result[item.name].amount += Number(item.price || 0) * Number(item.qty || 0);
      });
      if (sale.autoFee && sale.autoFee > 0) {
        const name = sale.autoFeeName || '자동추가금';
        if (!result[name]) result[name] = { qty: 0, amount: 0 };
        result[name].qty += 1;
        result[name].amount += Number(sale.autoFee || 0);
      }
    });
    return Object.entries(result)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty);
  }, [filteredSales]);

  const hourStats = useMemo(() => {
    return filteredSales.reduce((acc, item) => {
      const hour = new Date(Number(item.timestamp || Date.now())).getHours();
      acc[hour] = (acc[hour] || 0) + Number(item.total || 0);
      return acc;
    }, {});
  }, [filteredSales]);

  const unpaidCredits = salesHistory.filter(x => x.payment === '외상');
  const groupedCredits = useMemo(() => {
    const groups = unpaidCredits.reduce((acc, item) => {
      const key = item.credit || '미지정';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.paid === b.paid) return Number(b.timestamp || 0) - Number(a.timestamp || 0);
        return a.paid ? 1 : -1;
      });
    });

    return groups;
  }, [unpaidCredits]);

  const totalSales = filteredSales.reduce((sum, x) => sum + Number(x.total || 0), 0);
  const todaySales = salesHistory
    .filter(x => x.date === new Date().toLocaleDateString())
    .reduce((sum, x) => sum + Number(x.total || 0), 0);

  function addMenu(menu) {
    setOrders(prev => {
      const tableOrders = [...(prev[selectedTable] || [])];
      const found = tableOrders.find(x => x.id === menu.id);
      if (found) found.qty += 1;
      else tableOrders.push({ ...menu, qty: 1 });
      return { ...prev, [selectedTable]: tableOrders };
    });
  }

  function changeQty(id, diff) {
    setOrders(prev => {
      const updated = (prev[selectedTable] || [])
        .map(item => item.id === id ? { ...item, qty: item.qty + diff } : item)
        .filter(item => item.qty > 0);
      return { ...prev, [selectedTable]: updated };
    });
  }

  function setCurrentEatType(type) {
    setEatType(prev => ({ ...prev, [selectedTable]: type }));
  }

  function completePayment(printReceipt = false) {
    const payment = paymentType[selectedTable] || '현금';

    if (payment === '외상' && !(creditGroup[selectedTable] || '').trim()) {
      setWarning('⚠️ 단체명을 입력 또는 선택해주세요 ⚠️');
      return;
    }

    if (currentOrders.length === 0 && autoFee <= 0) return;

    const sale = {
      id: Date.now(),
      table: selectedTable,
      eatType: currentEatType,
      payment,
      credit: creditGroup[selectedTable] || '',
      total,
      autoFee,
      autoFeeName: autoFee > 0 ? autoFeeName : '',
      remainingAmount: payment === '외상' ? total : 0,
      items: currentOrders,
      paid: payment !== '외상',
      partialPayments: [],
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };

    setSalesHistory(prev => [sale, ...prev]);
    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setWarning('');
    setCreditGroup(prev => ({ ...prev, [selectedTable]: '' }));

    if (printReceipt) {
      setTimeout(() => printSaleReceipt(sale), 100);
    }
  }

  function printSaleReceipt(sale) {
    const lines = [
      '<html><head><title>영수증</title>',
      '<style>body{font-family:monospace;width:280px;padding:10px} h2{text-align:center}.row{display:flex;justify-content:space-between}hr{border:none;border-top:1px dashed #000}</style>',
      '</head><body>',
      '<h2>영수증</h2>',
      `<div>날짜: ${sale.date} ${sale.time}</div>`,
      `<div>테이블: ${sale.table}번 / ${sale.eatType}</div>`,
      `<div>결제: ${sale.payment}</div>`,
      '<hr/>',
      ...(sale.items || []).map(item => `<div class="row"><span>${item.name} x${item.qty}</span><span>${(item.price * item.qty).toLocaleString()}원</span></div>`),
      sale.autoFee > 0 ? `<div class="row"><span>${sale.autoFeeName}</span><span>${sale.autoFee.toLocaleString()}원</span></div>` : '',
      '<hr/>',
      `<div class="row"><b>합계</b><b>${sale.total.toLocaleString()}원</b></div>`,
      '<p style="text-align:center">감사합니다</p>',
      '<script>window.onload=function(){window.print(); setTimeout(function(){window.close()}, 500);}</script>',
      '</body></html>'
    ].join('');

    const win = window.open('', '_blank', 'width=360,height=600');
    if (!win) {
      alert('팝업이 차단되었습니다. 브라우저에서 팝업 허용 후 다시 시도해주세요.');
      return;
    }
    win.document.write(lines);
    win.document.close();
  }

  function addNewMenu() {
    if (!newMenu.name || !newMenu.price) {
      alert('메뉴명과 가격을 입력해주세요');
      return;
    }

    setMenus(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newMenu.name,
        price: Number(newMenu.price),
        category: newMenu.category || '식사류',
        emoji: newMenu.image ? '' : (newMenu.emoji || '🍽️'),
        image: newMenu.image || ''
      }
    ]);

    setNewMenu({ name: '', price: '', category: '식사류', emoji: '🍽️', image: '' });
  }

  async function handleImage(file) {
    if (!file) return;
    try {
      const resized = await resizeImage(file, 300, 0.72);
      setNewMenu(prev => ({ ...prev, image: resized }));
    } catch {
      alert('이미지 처리 중 오류가 발생했습니다.');
    }
  }

  function exportCSV() {
    const rows = filteredSales.map(x => [
      x.date,
      x.time,
      x.table,
      x.eatType,
      x.payment,
      x.credit || '',
      x.total,
      (x.items || []).map(i => `${i.name} ${i.qty}개`).join(' / ')
    ].map(csvEscape).join(','));

    const csv = [
      '날짜,시간,테이블,식사방식,결제방식,외상단체,금액,메뉴내역',
      ...rows
    ].join('\n');

    saveFile('매출통계.csv', csv);
  }

  function backupAllData() {
    const backup = {
      menus,
      orders,
      salesHistory,
      tableCount,
      takeoutFee,
      takeoutFeeName,
      dineInAutoFee,
      dineInFeeName,
      popularLimit,
      createdAt: new Date().toISOString()
    };
    saveFile(`POS백업_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(backup, null, 2));
  }

  function restoreData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        if (data.menus) setMenus(data.menus);
        if (data.orders) setOrders(data.orders);
        if (data.salesHistory) setSalesHistory(data.salesHistory);
        if (data.tableCount) setTableCount(data.tableCount);
        if (data.takeoutFee !== undefined) setTakeoutFee(data.takeoutFee);
        if (data.takeoutFeeName) setTakeoutFeeName(data.takeoutFeeName);
        if (data.dineInAutoFee !== undefined) setDineInAutoFee(data.dineInAutoFee);
        if (data.dineInFeeName) setDineInFeeName(data.dineInFeeName);
        if (data.popularLimit) setPopularLimit(data.popularLimit);
        alert('백업파일을 불러왔습니다.');
      } catch {
        alert('백업파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
  }

  function resetSalesAndCredits() {
    if (resetConfirm !== '초기화') {
      alert('"초기화"라고 입력해야 실행됩니다.');
      return;
    }
    setSalesHistory([]);
    setCheckedCredit({});
    setPartialAmount({});
    setResetConfirm('');
    alert('판매통계와 외상장부를 초기화했습니다.');
  }

  function resetOrdersOnly() {
    setOrders({});
    alert('현재 주문내역을 초기화했습니다.');
  }

  function unlockAdmin() {
    if (adminUnlocked) {
      setAdminMode(false);
      setAdminUnlocked(false);
      setAdminInput('');
      return;
    }
    if (adminInput === adminPassword) {
      setAdminUnlocked(true);
      setAdminMode(true);
      setAdminInput('');
    } else {
      alert('관리자 비밀번호가 틀렸습니다.');
    }
  }

  function changePassword() {
    if (passwordForm.current !== adminPassword) {
      alert('현재 비밀번호가 틀렸습니다.');
      return;
    }
    if (!passwordForm.next || passwordForm.next !== passwordForm.confirm) {
      alert('새 비밀번호를 다시 확인해주세요.');
      return;
    }
    setAdminPassword(passwordForm.next);
    setPasswordForm({ current: '', next: '', confirm: '' });
    alert('관리자 비밀번호가 변경되었습니다.');
  }

  function payCreditItem(id, amount) {
    const pay = Number(amount || 0);
    if (pay <= 0) return;

    setSalesHistory(prev => prev.map(x => {
      if (x.id !== id) return x;
      const beforeRemain = Number(x.remainingAmount ?? x.total ?? 0);
      const remain = beforeRemain - pay;
      return {
        ...x,
        remainingAmount: remain > 0 ? remain : 0,
        paid: remain <= 0,
        partialPayments: [
          ...(x.partialPayments || []),
          { amount: pay, date: new Date().toLocaleString() }
        ]
      };
    }));

    setPartialAmount(prev => ({ ...prev, [id]: '' }));
  }

  const tableRows = useMemo(() => {
    const count = Number(tableCount || 1);
    const first = Math.ceil(count / 2);
    const nums = Array.from({ length: count }, (_, i) => i + 1);
    return [nums.slice(0, first), nums.slice(first)];
  }, [tableCount]);

  return (
    <div className='p-4 max-w-7xl mx-auto'>
      <div className='flex flex-wrap justify-between items-center gap-3 mb-4'>
        <h1 className='text-3xl font-bold'>식당 POS</h1>

        <div className='flex gap-2 flex-wrap items-center'>
          {!adminUnlocked && (
            <input
              type='password'
              value={adminInput}
              onChange={e => setAdminInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') unlockAdmin();
              }}
              placeholder='관리자 비밀번호'
              className='border p-2 rounded-xl w-40'
            />
          )}

          <button
            onClick={unlockAdmin}
            className='bg-black text-white px-4 py-2 rounded-xl'
          >
            {adminUnlocked ? '관리자모드 해제' : '관리자모드'}
          </button>

          <button onClick={exportCSV} className='bg-green-600 text-white px-4 py-2 rounded-xl'>
            CSV 다운로드
          </button>

          <button onClick={backupAllData} className='bg-indigo-600 text-white px-4 py-2 rounded-xl'>
            전체 백업
          </button>
        </div>
      </div>

      <div className='space-y-2 mb-5'>
        {tableRows.map((row, idx) => (
          <div key={idx} className='grid gap-2' style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
            {row.map(n => {
              const hasOrder = (orders[n] || []).length > 0;
              return (
                <button
                  key={n}
                  onClick={() => setSelectedTable(n)}
                  className={`p-4 rounded-2xl border-4 font-bold text-lg ${
                    selectedTable === n
                      ? 'bg-blue-600 text-white border-blue-900'
                      : hasOrder
                      ? 'bg-yellow-100 border-yellow-500'
                      : 'bg-gray-100 border-transparent'
                  }`}
                >
                  {n}번
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className='bg-yellow-50 border rounded-2xl p-4 mb-5'>
        <div className='font-bold text-xl mb-3'>🔥 인기메뉴</div>

        <div className='flex gap-2 mb-4'>
          {['1', '7', '30'].map(v => (
            <button
              key={v}
              onClick={() => setPopularPeriod(v)}
              className={`px-3 py-2 rounded-xl ${
                popularPeriod === v ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {v === '1' ? '오늘' : v === '7' ? '최근7일' : '최근30일'}
            </button>
          ))}
        </div>

        <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
          {popularMenus.length === 0 && (
            <div className='text-gray-500 col-span-full'>결제완료 후 인기메뉴가 표시됩니다.</div>
          )}

          {popularMenus.map(([name, qty]) => {
            const item = menus.find(x => x.name === name);
            if (!item) return null;
            return (
              <button key={name} onClick={() => addMenu(item)} className='bg-white rounded-2xl p-3 border shadow'>
                {item.image ? (
                  <img src={item.image} alt='menu' className='w-16 h-16 object-cover rounded-xl mx-auto mb-2' />
                ) : (
                  <div className='text-4xl'>{item.emoji}</div>
                )}
                <div className='font-bold'>{item.name}</div>
                <div className='text-sm text-gray-500'>{qty}개 판매</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className='mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-5'>
        <div className='flex flex-wrap justify-between gap-3 items-center mb-4'>
          <div className='text-2xl font-bold text-blue-800'>판매통계</div>

          <div className='flex gap-2 items-center flex-wrap'>
            <input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} className='border p-2 rounded-xl' />
            <span>~</span>
            <input type='date' value={endDate} onChange={e => setEndDate(e.target.value)} className='border p-2 rounded-xl' />
          </div>
        </div>

        <div className='grid md:grid-cols-3 gap-4 mb-6'>
          <div className='bg-white rounded-2xl p-4 border'>
            <div className='text-gray-500 mb-2'>오늘 매출</div>
            <div className='text-3xl font-bold text-blue-700'>{todaySales.toLocaleString()}원</div>
          </div>

          <div className='bg-white rounded-2xl p-4 border'>
            <div className='text-gray-500 mb-2'>선택기간 총매출</div>
            <div className='text-3xl font-bold text-green-700'>{totalSales.toLocaleString()}원</div>
          </div>

          <div className='bg-white rounded-2xl p-4 border'>
            <div className='text-gray-500 mb-2'>결제건수</div>
            <div className='text-3xl font-bold'>{filteredSales.length}건</div>
          </div>
        </div>

        <div className='grid md:grid-cols-2 gap-4 mb-4'>
          <div className='bg-white rounded-2xl p-4 border'>
            <div className='font-bold text-xl mb-3'>결제방식별 매출</div>
            {paymentList.map(type => (
              <div key={type} className='flex justify-between border-b py-2'>
                <span>{type}</span>
                <b>{Number(paymentStats[type] || 0).toLocaleString()}원</b>
              </div>
            ))}
          </div>

          <div className='bg-white rounded-2xl p-4 border'>
            <div className='font-bold text-xl mb-3'>식사방식별 매출</div>
            {['식당식사', '포장'].map(type => (
              <div key={type} className='flex justify-between border-b py-2'>
                <span>{type}</span>
                <b>{Number(eatTypeStats[type] || 0).toLocaleString()}원</b>
              </div>
            ))}

            <div className='font-bold text-xl mt-5 mb-3'>조합 통계</div>
            {Object.entries(comboStats).map(([key, amount]) => (
              <div key={key} className='flex justify-between border-b py-2'>
                <span>{key}</span>
                <b>{Number(amount).toLocaleString()}원</b>
              </div>
            ))}
          </div>
        </div>

        <div className='grid md:grid-cols-2 gap-4'>
          <div className='bg-white rounded-2xl p-4 border'>
            <div className='font-bold text-xl mb-4'>시간대별 매출</div>
            {Object.keys(hourStats).length === 0 && <div className='text-gray-400'>내역 없음</div>}
            {Object.entries(hourStats).sort((a,b)=>Number(a[0])-Number(b[0])).map(([hour, amount]) => (
              <div key={hour} className='flex justify-between items-center border-b pb-2 mb-2'>
                <div className='font-bold'>{hour}시</div>
                <div className='font-bold text-blue-700'>{Number(amount).toLocaleString()}원</div>
              </div>
            ))}
          </div>

          <div className='bg-white rounded-2xl p-4 border'>
            <div className='font-bold text-xl mb-4'>메뉴별 판매수량/금액</div>
            {menuSalesStats.length === 0 && <div className='text-gray-400'>내역 없음</div>}
            {menuSalesStats.map(item => (
              <div key={item.name} className='flex justify-between items-center border-b pb-2 mb-2'>
                <div className='font-bold'>{item.name}</div>
                <div className='text-right'>
                  <div>{item.qty}개</div>
                  <div className='font-bold text-blue-700'>{item.amount.toLocaleString()}원</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='flex gap-3 mb-5'>
        <button
          onClick={() => setCurrentEatType('식당식사')}
          className={`px-5 py-3 rounded-2xl font-bold ${
            currentEatType === '식당식사' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          식당식사
        </button>

        <button
          onClick={() => setCurrentEatType('포장')}
          className={`px-5 py-3 rounded-2xl font-bold ${
            currentEatType === '포장' ? 'bg-orange-500 text-white' : 'bg-gray-200'
          }`}
        >
          포장
        </button>

        {autoFee > 0 && (
          <div className='px-5 py-3 rounded-2xl bg-yellow-100 font-bold'>
            {autoFeeName}: {autoFee.toLocaleString()}원 자동추가
          </div>
        )}
      </div>

      {Object.entries(groupedMenus).map(([category, list]) => (
        <div key={category} className='mb-6'>
          <div className='text-2xl font-bold mb-3'>{category}</div>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {list.map(item => (
              <button key={item.id} onClick={() => addMenu(item)} className='bg-white rounded-2xl p-4 border shadow text-left'>
                {item.image ? (
                  <img src={item.image} alt='menu' className='w-20 h-20 object-cover rounded-xl mb-2' />
                ) : (
                  <div className='text-5xl mb-2'>{item.emoji}</div>
                )}

                <div className='font-bold text-xl'>{item.name}</div>
                <div>{item.price.toLocaleString()}원</div>

                {adminUnlocked && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setMenus(prev => prev.filter(x => x.id !== item.id));
                    }}
                    className='mt-2 bg-red-500 text-white px-3 py-1 rounded-xl'
                  >
                    삭제
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className='bg-gray-50 rounded-2xl p-4 border'>
        <div className='text-2xl font-bold mb-4'>주문내역</div>

        {currentOrders.length === 0 && autoFee <= 0 && (
          <div className='text-gray-400 mb-4'>메뉴를 선택해주세요.</div>
        )}

        {currentOrders.map(item => (
          <div key={item.id} className='flex justify-between items-center border-b py-3'>
            <div className='font-bold text-xl'>{item.name} {item.qty}개</div>

            <div className='flex gap-2'>
              <button onClick={() => changeQty(item.id, -1)} className='w-14 h-14 bg-red-500 text-white rounded-2xl text-2xl'>-</button>
              <button onClick={() => changeQty(item.id, 1)} className='w-14 h-14 bg-blue-600 text-white rounded-2xl text-2xl'>+</button>
            </div>
          </div>
        ))}

        {autoFee > 0 && (
          <div className='flex justify-between items-center border-b py-3 text-orange-700 font-bold'>
            <div>{autoFeeName}</div>
            <div>{autoFee.toLocaleString()}원</div>
          </div>
        )}

        <div className='flex gap-2 flex-wrap mt-5 mb-4'>
          {paymentList.map(type => (
            <button
              key={type}
              onClick={() => setPaymentType(prev => ({ ...prev, [selectedTable]: type }))}
              className={`px-4 py-3 rounded-xl font-bold ${
                (paymentType[selectedTable] || '현금') === type ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {(paymentType[selectedTable] || '') === '외상' && (
          <div className={`rounded-2xl p-4 mb-4 ${warning ? 'bg-red-50 border-4 border-red-500' : 'bg-gray-100 border'}`}>
            <div className={`font-bold text-xl mb-3 ${warning ? 'text-red-600' : 'text-gray-700'}`}>
              외상 단체명 입력 또는 선택
            </div>

            <input
              list='credit-list'
              value={creditGroup[selectedTable] || ''}
              onChange={e => setCreditGroup(prev => ({ ...prev, [selectedTable]: e.target.value }))}
              placeholder='단체명 입력 또는 선택'
              className='border p-4 rounded-2xl w-full text-xl font-bold'
            />

            <datalist id='credit-list'>
              {selectedCreditNames.map(name => <option key={name} value={name} />)}
            </datalist>

            {warning && <div className='text-red-600 text-xl font-bold mt-3'>{warning}</div>}
          </div>
        )}

        <div className='text-3xl font-bold mb-4'>총 금액: {total.toLocaleString()}원</div>

        <div className='grid md:grid-cols-2 gap-3'>
          <button onClick={() => completePayment(false)} className='w-full bg-blue-700 text-white py-5 rounded-2xl text-2xl font-bold'>
            결제완료
          </button>

          <button onClick={() => completePayment(true)} className='w-full bg-purple-700 text-white py-5 rounded-2xl text-2xl font-bold'>
            결제완료 + 영수증출력
          </button>
        </div>
      </div>

      <div className='mt-8 bg-white border rounded-2xl p-4'>
        <div className='text-2xl font-bold mb-4'>외상장부</div>

        <div className='space-y-6'>
          {Object.keys(groupedCredits).length === 0 && (
            <div className='text-gray-400'>외상 내역이 없습니다.</div>
          )}

          {Object.entries(groupedCredits).map(([groupName, list]) => {
            const groupTotal = list
              .filter(x => !x.paid)
              .reduce((sum, x) => sum + Number(x.remainingAmount || x.total || 0), 0);

            const collapsed = collapsedCreditGroups[groupName] === true;

            return (
              <div key={groupName} className='border-2 border-red-200 rounded-2xl p-4 bg-red-50'>
                <div className='flex justify-between items-center mb-4'>
                  <div>
                    <div className='text-2xl font-bold text-red-700'>{groupName}</div>
                    <div className='text-red-600 font-bold'>외상잔액: {groupTotal.toLocaleString()}원</div>
                  </div>

                  <button
                    onClick={() => setCollapsedCreditGroups(prev => ({ ...prev, [groupName]: !collapsed }))}
                    className='bg-white border px-4 py-2 rounded-xl font-bold'
                  >
                    {collapsed ? '펼치기' : '숨기기'}
                  </button>
                </div>

                {!collapsed && (
                  <div className='space-y-4'>
                    {list.map(item => {
                      const remain = Number(item.remainingAmount ?? item.total ?? 0);
                      return (
                        <div key={item.id} className={`border rounded-2xl p-4 ${item.paid ? 'bg-gray-100 text-gray-400' : 'bg-white'}`}>
                          <div className='flex items-start gap-4'>
                            <input
                              type='checkbox'
                              disabled={item.paid}
                              checked={checkedCredit[item.id] === true}
                              onChange={e => setCheckedCredit(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              className='w-6 h-6 mt-1'
                            />

                            <div className='flex-1'>
                              <div className='font-bold text-xl'>
                                {item.credit} {item.paid && <span className='text-gray-500 text-base'>(결제완료)</span>}
                              </div>

                              <div>{item.date} {item.time} / {item.table}번 테이블</div>
                              <div>{(item.items || []).map(x => `${x.name} ${x.qty}개`).join(', ')}</div>

                              {item.autoFee > 0 && <div>{item.autoFeeName}: {item.autoFee.toLocaleString()}원</div>}

                              <div className='font-bold text-lg mt-2'>남은금액: {remain.toLocaleString()}원</div>

                              {(item.partialPayments || []).map((p, idx) => (
                                <div key={idx} className='text-blue-600'>부분결제 {p.amount.toLocaleString()}원 / {p.date}</div>
                              ))}

                              {!item.paid && (
                                <div className='flex gap-2 mt-3'>
                                  <input
                                    type='number'
                                    value={partialAmount[item.id] || ''}
                                    onChange={e => setPartialAmount(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    placeholder='부분결제금액'
                                    className='border p-2 rounded-xl'
                                  />

                                  <button onClick={() => payCreditItem(item.id, partialAmount[item.id])} className='bg-orange-500 text-white px-4 rounded-xl'>
                                    일부결제
                                  </button>

                                  <button onClick={() => payCreditItem(item.id, remain)} className='bg-green-600 text-white px-4 rounded-xl'>
                                    완납처리
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {adminUnlocked && (
        <div className='mt-8 bg-gray-100 rounded-2xl p-4'>
          <div className='text-2xl font-bold mb-4'>관리자모드</div>

          <div className='grid md:grid-cols-2 gap-3'>
            <input value={newMenu.name} onChange={e => setNewMenu(prev => ({ ...prev, name: e.target.value }))} placeholder='메뉴명' className='border p-3 rounded-xl' />
            <input type='number' value={newMenu.price} onChange={e => setNewMenu(prev => ({ ...prev, price: e.target.value }))} placeholder='가격' className='border p-3 rounded-xl' />
            <input value={newMenu.category} onChange={e => setNewMenu(prev => ({ ...prev, category: e.target.value }))} placeholder='카테고리' className='border p-3 rounded-xl' />

            <select value={newMenu.emoji} onChange={e => setNewMenu(prev => ({ ...prev, emoji: e.target.value, image: '' }))} className='border p-3 rounded-xl'>
              {emojiList.map(e => <option key={e} value={e}>{e}</option>)}
            </select>

            <input type='file' accept='image/*' className='border p-3 rounded-xl' onChange={e => handleImage(e.target.files?.[0])} />

            <button onClick={addNewMenu} className='bg-blue-600 text-white rounded-xl p-3 font-bold'>메뉴추가</button>
          </div>

          <div className='text-sm text-gray-600 mt-2'>이미지는 자동으로 300px 기준으로 축소 저장됩니다.</div>

          <div className='grid md:grid-cols-3 gap-3 mt-5'>
            <input type='number' value={tableCount} onChange={e => setTableCount(Number(e.target.value || 1))} placeholder='테이블수' className='border p-3 rounded-xl' />
            <input type='number' value={popularLimit} onChange={e => setPopularLimit(Number(e.target.value || 5))} placeholder='인기메뉴 표시개수' className='border p-3 rounded-xl' />
            <input type='number' value={takeoutFee} onChange={e => setTakeoutFee(Number(e.target.value || 0))} placeholder='포장 자동추가금' className='border p-3 rounded-xl' />
            <input value={takeoutFeeName} onChange={e => setTakeoutFeeName(e.target.value)} placeholder='포장 자동추가명' className='border p-3 rounded-xl' />
            <input type='number' value={dineInAutoFee} onChange={e => setDineInAutoFee(Number(e.target.value || 0))} placeholder='식당식사 자동추가금' className='border p-3 rounded-xl' />
            <input value={dineInFeeName} onChange={e => setDineInFeeName(e.target.value)} placeholder='식당식사 자동추가명' className='border p-3 rounded-xl' />
          </div>

          <div className='mt-6 bg-white border rounded-2xl p-4'>
            <div className='font-bold text-xl mb-3'>관리자 비밀번호 변경</div>
            <div className='grid md:grid-cols-3 gap-3'>
              <input type='password' value={passwordForm.current} onChange={e => setPasswordForm(prev => ({ ...prev, current: e.target.value }))} placeholder='현재 비밀번호' className='border p-3 rounded-xl' />
              <input type='password' value={passwordForm.next} onChange={e => setPasswordForm(prev => ({ ...prev, next: e.target.value }))} placeholder='새 비밀번호' className='border p-3 rounded-xl' />
              <input type='password' value={passwordForm.confirm} onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))} placeholder='새 비밀번호 확인' className='border p-3 rounded-xl' />
            </div>
            <button onClick={changePassword} className='mt-3 bg-black text-white px-4 py-2 rounded-xl'>비밀번호 변경</button>
            <div className='text-sm text-gray-500 mt-2'>초기 비밀번호는 1234입니다.</div>
          </div>

          <div className='mt-6 bg-white border rounded-2xl p-4'>
            <div className='font-bold text-xl mb-3'>데이터 관리</div>
            <div className='flex flex-wrap gap-2 mb-3'>
              <button onClick={backupAllData} className='bg-indigo-600 text-white px-4 py-2 rounded-xl'>전체 백업 다운로드</button>
              <label className='bg-gray-700 text-white px-4 py-2 rounded-xl cursor-pointer'>
                백업 불러오기
                <input type='file' accept='.json' className='hidden' onChange={e => restoreData(e.target.files?.[0])} />
              </label>
              <button onClick={resetOrdersOnly} className='bg-yellow-500 text-white px-4 py-2 rounded-xl'>테스트 주문 초기화</button>
            </div>

            <div className='flex flex-wrap gap-2 items-center'>
              <input value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder='"초기화" 입력' className='border p-3 rounded-xl' />
              <button onClick={resetSalesAndCredits} className='bg-red-600 text-white px-4 py-2 rounded-xl'>
                판매/외상 데이터 초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
