
import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_MENUS = [
  { id: 1, name: '생태탕', price: 12000, category: '식사류', emoji: '🐟', image: '' },
  { id: 2, name: '김치찌개', price: 9000, category: '식사류', emoji: '🍲', image: '' },
  { id: 3, name: '애호박찌개', price: 10000, category: '식사류', emoji: '🥘', image: '' },
  { id: 4, name: '공기밥', price: 1000, category: '식사류', emoji: '🍚', image: '' },
  { id: 5, name: '소주', price: 5000, category: '주류', emoji: '🍶', image: '' },
  { id: 6, name: '맥주', price: 5000, category: '주류', emoji: '🍺', image: '' },
  { id: 7, name: '콜라', price: 2000, category: '음료', emoji: '🥤', image: '' },
  { id: 8, name: '사이다', price: 2000, category: '음료', emoji: '🧃', image: '' },
];

const DEFAULT_CATEGORIES = ['식사류', '주류', '음료'];
const PAYMENT_TYPES = ['현금', '카드', '카드+현금', '상품권', '기타', '외상'];
const EMOJIS = ['🐟','🍲','🥘','🍚','🍜','🍽️','🍶','🍺','🥤','🧃','🍱','🍗','🍖','☕'];

function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function formatWon(value) {
  return Number(value || 0).toLocaleString() + '원';
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getDateInputDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function compressImage(file, maxSize = 300, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지 형식이 올바르지 않습니다.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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

export default function App() {
  const [menus, setMenus] = useState(() => safeLoad('pos_menus', DEFAULT_MENUS));
  const [categories, setCategories] = useState(() => safeLoad('pos_categories', DEFAULT_CATEGORIES));
  const [orders, setOrders] = useState(() => safeLoad('pos_orders', {}));
  const [salesHistory, setSalesHistory] = useState(() => safeLoad('pos_sales', []));
  const [tableCount, setTableCount] = useState(() => safeLoad('pos_table_count', 12));
  const [selectedTable, setSelectedTable] = useState(1);
  const [activeTab, setActiveTab] = useState('주문');
  const [adminMode, setAdminMode] = useState(false);

  const [eatType, setEatType] = useState(() => safeLoad('pos_eat_type', {}));
  const [paymentType, setPaymentType] = useState(() => safeLoad('pos_payment_type', {}));
  const [creditGroup, setCreditGroup] = useState(() => safeLoad('pos_credit_group', {}));
  const [warning, setWarning] = useState('');

  const [popularPeriod, setPopularPeriod] = useState('7');
  const [expandedCreditGroups, setExpandedCreditGroups] = useState({});
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState({});
  const [statsStart, setStatsStart] = useState(getDateInputDaysAgo(7));
  const [statsEnd, setStatsEnd] = useState(todayInputValue());

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [newMenu, setNewMenu] = useState({
    name: '',
    price: '',
    category: DEFAULT_CATEGORIES[0],
    emoji: '🍽️',
    image: '',
  });

  useEffect(() => localStorage.setItem('pos_menus', JSON.stringify(menus)), [menus]);
  useEffect(() => localStorage.setItem('pos_categories', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('pos_orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('pos_sales', JSON.stringify(salesHistory)), [salesHistory]);
  useEffect(() => localStorage.setItem('pos_table_count', JSON.stringify(tableCount)), [tableCount]);
  useEffect(() => localStorage.setItem('pos_eat_type', JSON.stringify(eatType)), [eatType]);
  useEffect(() => localStorage.setItem('pos_payment_type', JSON.stringify(paymentType)), [paymentType]);
  useEffect(() => localStorage.setItem('pos_credit_group', JSON.stringify(creditGroup)), [creditGroup]);

  const currentOrders = orders[selectedTable] || [];
  const currentPayment = paymentType[selectedTable] || '현금';
  const currentCredit = creditGroup[selectedTable] || '';

  const total = useMemo(() => {
    return currentOrders.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  }, [currentOrders]);

  const groupedMenus = useMemo(() => {
    const grouped = {};
    categories.forEach(category => grouped[category] = []);
    menus.forEach(menu => {
      const key = menu.category || '기타';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(menu);
    });
    return grouped;
  }, [menus, categories]);

  const unpaidCredits = useMemo(() => {
    return salesHistory.filter(sale => sale.payment === '외상' && !sale.paid);
  }, [salesHistory]);

  const creditNameOptions = useMemo(() => {
    return [...new Set(unpaidCredits.map(item => item.credit).filter(Boolean))];
  }, [unpaidCredits]);

  const groupedCredits = useMemo(() => {
    return unpaidCredits.reduce((acc, item) => {
      const key = item.credit || '미지정';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [unpaidCredits]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod);
    const now = Date.now();
    const count = {};
    salesHistory
      .filter(sale => now - Number(sale.timestamp || 0) <= days * 24 * 60 * 60 * 1000)
      .forEach(sale => {
        (sale.items || []).forEach(item => {
          count[item.name] = (count[item.name] || 0) + Number(item.qty || 0);
        });
      });

    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => {
        const menu = menus.find(m => m.name === name);
        return menu ? { ...menu, soldQty: qty } : null;
      })
      .filter(Boolean);
  }, [salesHistory, popularPeriod, menus]);

  const statsFilteredSales = useMemo(() => {
    const start = statsStart ? new Date(statsStart + 'T00:00:00').getTime() : 0;
    const end = statsEnd ? new Date(statsEnd + 'T23:59:59').getTime() : Infinity;
    return salesHistory.filter(sale => {
      const t = Number(sale.timestamp || 0);
      return t >= start && t <= end;
    });
  }, [salesHistory, statsStart, statsEnd]);

  const stats = useMemo(() => {
    const menuCount = {};
    const hourSales = {};
    const paymentSales = {};
    let totalSales = 0;

    statsFilteredSales.forEach(sale => {
      totalSales += Number(sale.total || 0);
      paymentSales[sale.payment] = (paymentSales[sale.payment] || 0) + Number(sale.total || 0);

      const hour = new Date(sale.timestamp).getHours();
      hourSales[hour] = (hourSales[hour] || 0) + Number(sale.total || 0);

      (sale.items || []).forEach(item => {
        menuCount[item.name] = (menuCount[item.name] || 0) + Number(item.qty || 0);
      });
    });

    const topMenus = Object.entries(menuCount).sort((a, b) => b[1] - a[1]);
    const topHours = Object.entries(hourSales).sort((a, b) => b[1] - a[1]);

    return { totalSales, topMenus, topHours, hourSales, paymentSales };
  }, [statsFilteredSales]);

  const todaySales = useMemo(() => {
    const today = new Date().toLocaleDateString();
    return salesHistory
      .filter(sale => sale.date === today)
      .reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  }, [salesHistory]);

  const totalSales = useMemo(() => {
    return salesHistory.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  }, [salesHistory]);

  function addMenuToOrder(menu) {
    if (!menu) return;
    setOrders(prev => {
      const tableOrders = [...(prev[selectedTable] || [])];
      const found = tableOrders.find(item => item.id === menu.id);

      if (found) {
        return {
          ...prev,
          [selectedTable]: tableOrders.map(item =>
            item.id === menu.id ? { ...item, qty: item.qty + 1 } : item
          ),
        };
      }

      return {
        ...prev,
        [selectedTable]: [...tableOrders, { ...menu, qty: 1 }],
      };
    });
  }

  function changeQty(id, diff) {
    setOrders(prev => ({
      ...prev,
      [selectedTable]: (prev[selectedTable] || [])
        .map(item => item.id === id ? { ...item, qty: item.qty + diff } : item)
        .filter(item => item.qty > 0),
    }));
  }

  function completePayment() {
    if (currentOrders.length === 0) {
      alert('주문내역이 없습니다.');
      return;
    }

    if (currentPayment === '외상' && !currentCredit.trim()) {
      setWarning('⚠️ 외상 단체명을 입력 또는 선택해주세요 ⚠️');
      return;
    }

    const now = new Date();
    const sale = {
      id: Date.now(),
      table: selectedTable,
      eatType: eatType[selectedTable] || '식당식사',
      payment: currentPayment,
      credit: currentPayment === '외상' ? currentCredit.trim() : '',
      total,
      remainingAmount: currentPayment === '외상' ? total : 0,
      paid: currentPayment !== '외상',
      partialPayments: [],
      items: currentOrders.map(item => ({...item})),
      timestamp: now.getTime(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    };

    setSalesHistory(prev => [sale, ...prev]);
    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setWarning('');
    setCreditGroup(prev => ({ ...prev, [selectedTable]: '' }));
    alert(`${selectedTable}번 테이블 결제완료`);
  }

  function resetNewMenu() {
    setNewMenu({
      name: '',
      price: '',
      category: categories[0] || '식사류',
      emoji: '🍽️',
      image: '',
    });
    setEditingMenuId(null);
  }

  function addOrUpdateMenu() {
    if (!newMenu.name.trim() || !String(newMenu.price).trim()) {
      alert('메뉴명과 가격을 입력해주세요.');
      return;
    }

    const payload = {
      name: newMenu.name.trim(),
      price: Number(newMenu.price),
      category: newMenu.category || categories[0] || '식사류',
      emoji: newMenu.image ? '' : (newMenu.emoji || '🍽️'),
      image: newMenu.image || '',
    };

    if (editingMenuId) {
      setMenus(prev => prev.map(menu => menu.id === editingMenuId ? { ...menu, ...payload } : menu));
    } else {
      setMenus(prev => [...prev, { id: Date.now(), ...payload }]);
    }

    if (!categories.includes(payload.category)) {
      setCategories(prev => [...prev, payload.category]);
    }

    resetNewMenu();
  }

  function editMenu(menu) {
    setEditingMenuId(menu.id);
    setNewMenu({
      name: menu.name,
      price: menu.price,
      category: menu.category,
      emoji: menu.emoji || '🍽️',
      image: menu.image || '',
    });
    setAdminMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지는 5MB 이하만 가능합니다.');
      return;
    }

    try {
      const image = await compressImage(file, 300, 0.72);
      setNewMenu(prev => ({ ...prev, image, emoji: '' }));
    } catch {
      alert('이미지 처리 중 오류가 발생했습니다.');
    }
  }

  function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.includes(name)) {
      alert('이미 있는 분류입니다.');
      return;
    }
    setCategories(prev => [...prev, name]);
    setNewCategoryName('');
    setNewMenu(prev => ({ ...prev, category: name }));
  }

  function deleteMenu(id) {
    if (!confirm('이 메뉴를 삭제할까요?')) return;
    setMenus(prev => prev.filter(menu => menu.id !== id));
  }

  function applyPartialPayment(saleId) {
    const pay = Number(partialAmount[saleId] || 0);
    if (pay <= 0) {
      alert('일부결제 금액을 입력해주세요.');
      return;
    }

    setSalesHistory(prev => prev.map(sale => {
      if (sale.id !== saleId) return sale;
      const remain = Math.max(0, Number(sale.remainingAmount || 0) - pay);
      return {
        ...sale,
        remainingAmount: remain,
        paid: remain <= 0,
        partialPayments: [
          ...(sale.partialPayments || []),
          { amount: pay, date: new Date().toLocaleString() },
        ],
      };
    }));

    setPartialAmount(prev => ({ ...prev, [saleId]: '' }));
    setCheckedCredit(prev => ({ ...prev, [saleId]: false }));
  }

  function completeSelectedCredits() {
    const ids = Object.entries(checkedCredit).filter(([, checked]) => checked).map(([id]) => Number(id));
    if (ids.length === 0) {
      alert('선택된 외상내역이 없습니다.');
      return;
    }

    setSalesHistory(prev => prev.map(sale => {
      if (!ids.includes(sale.id)) return sale;
      return {
        ...sale,
        remainingAmount: 0,
        paid: true,
        partialPayments: [
          ...(sale.partialPayments || []),
          { amount: sale.remainingAmount || sale.total, date: new Date().toLocaleString(), memo: '완납' },
        ],
      };
    }));
    setCheckedCredit({});
  }

  function exportCSV(rows, filename) {
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function exportSalesCSV() {
    const rows = [
      ['날짜', '시간', '테이블', '식사/포장', '결제방식', '외상단체', '금액', '메뉴'],
      ...statsFilteredSales.map(sale => [
        sale.date,
        sale.time,
        sale.table,
        sale.eatType,
        sale.payment,
        sale.credit,
        sale.total,
        (sale.items || []).map(item => `${item.name} ${item.qty}개`).join(' / '),
      ]),
      [],
      ['메뉴별 판매량'],
      ['메뉴', '판매수량'],
      ...stats.topMenus.map(([name, qty]) => [name, qty]),
      [],
      ['시간대별 매출'],
      ['시간', '매출'],
      ...Object.entries(stats.hourSales).sort((a, b) => Number(a[0]) - Number(b[0])).map(([hour, amount]) => [`${hour}시`, amount]),
    ];

    exportCSV(rows, `판매통계_${statsStart}_${statsEnd}.csv`);
  }

  const selectedTableHasOrder = (orders[selectedTable] || []).length > 0;

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>식당 POS</h1>
          <p>실사용 안정화 버전</p>
        </div>

        <div className="header-actions">
          <button className="black-btn" onClick={() => setAdminMode(v => !v)}>
            {adminMode ? '관리자모드 해제' : '관리자모드'}
          </button>
          <button className="green-btn" onClick={exportSalesCSV}>CSV 다운로드</button>
        </div>
      </header>

      {adminMode && (
        <section className="admin-panel">
          <h2>관리자모드</h2>

          <div className="admin-grid">
            <div className="admin-card">
              <h3>{editingMenuId ? '메뉴 수정' : '메뉴 추가'}</h3>

              <input value={newMenu.name} onChange={e => setNewMenu(prev => ({...prev, name: e.target.value}))} placeholder="메뉴명" />
              <input type="number" value={newMenu.price} onChange={e => setNewMenu(prev => ({...prev, price: e.target.value}))} placeholder="가격" />
              <select value={newMenu.category} onChange={e => setNewMenu(prev => ({...prev, category: e.target.value}))}>
                {categories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>

              <div className="emoji-list">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={newMenu.emoji === emoji && !newMenu.image ? 'emoji active' : 'emoji'}
                    onClick={() => setNewMenu(prev => ({...prev, emoji, image: ''}))}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <label className="file-label">
                이미지 선택
                <input type="file" accept="image/*" onChange={handleImageUpload} />
              </label>
              <div className="hint">권장 이미지 크기: 300 x 300, 선택하면 자동축소됩니다.</div>

              {newMenu.image && (
                <img src={newMenu.image} className="preview-img" alt="선택한 이미지" />
              )}

              <div className="row">
                <button className="primary-btn" onClick={addOrUpdateMenu}>
                  {editingMenuId ? '수정완료' : '메뉴추가'}
                </button>
                {editingMenuId && <button className="gray-btn" onClick={resetNewMenu}>취소</button>}
              </div>
            </div>

            <div className="admin-card">
              <h3>분류 / 테이블 관리</h3>
              <div className="row">
                <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="새 분류명" />
                <button className="primary-btn" onClick={addCategory}>분류추가</button>
              </div>

              <label className="label">테이블 수</label>
              <input type="number" value={tableCount} min="1" onChange={e => setTableCount(Number(e.target.value || 1))} />

              <h3 className="mt">메뉴 목록</h3>
              <div className="menu-admin-list">
                {menus.map(menu => (
                  <div className="admin-menu-row" key={menu.id}>
                    <div className="small-menu-icon">
                      {menu.image ? <img src={menu.image} alt="" /> : <span>{menu.emoji}</span>}
                    </div>
                    <div>
                      <b>{menu.name}</b>
                      <div className="muted">{menu.category} · {formatWon(menu.price)}</div>
                    </div>
                    <button className="gray-btn" onClick={() => editMenu(menu)}>수정</button>
                    <button className="danger-btn" onClick={() => deleteMenu(menu.id)}>삭제</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <nav className="tabs">
        {['주문', '외상장부', '판매통계'].map(tab => (
          <button key={tab} className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === '주문' && (
        <>
          <section className="table-grid">
            {Array.from({ length: tableCount }, (_, i) => i + 1).map(table => {
              const hasOrder = (orders[table] || []).length > 0;
              return (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={selectedTable === table ? 'table selected' : hasOrder ? 'table ordered' : 'table'}
                >
                  {table}번
                </button>
              );
            })}
          </section>

          <section className="popular-box">
            <div className="section-title">🔥 인기메뉴</div>
            <div className="period-buttons">
              {[
                ['1', '오늘'],
                ['7', '최근7일'],
                ['30', '최근30일'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPopularPeriod(value)}
                  className={popularPeriod === value ? 'period active' : 'period'}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="popular-grid">
              {popularMenus.length === 0 && <div className="muted">결제 후 인기메뉴가 표시됩니다.</div>}
              {popularMenus.map(menu => (
                <button key={menu.id} className="popular-item" onClick={() => addMenuToOrder(menu)}>
                  {menu.image ? <img src={menu.image} alt="" /> : <span>{menu.emoji}</span>}
                  <b>{menu.name}</b>
                  <small>{menu.soldQty}개</small>
                </button>
              ))}
            </div>
          </section>

          <div className="main-grid">
            <section className="menu-area">
              <div className="eat-buttons">
                {['식당식사', '포장'].map(type => (
                  <button
                    key={type}
                    onClick={() => setEatType(prev => ({...prev, [selectedTable]: type}))}
                    className={(eatType[selectedTable] || '식당식사') === type ? 'pill active' : 'pill'}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {Object.entries(groupedMenus).map(([category, list]) => (
                <div key={category} className="menu-section">
                  <h2>{category}</h2>
                  <div className="menu-grid">
                    {list.map(menu => (
                      <button className="menu-card" key={menu.id} onClick={() => addMenuToOrder(menu)}>
                        <div className="menu-icon">
                          {menu.image ? <img src={menu.image} alt="" /> : <span>{menu.emoji}</span>}
                        </div>
                        <div>
                          <h3>{menu.name}</h3>
                          <p>{formatWon(menu.price)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <aside className="order-panel">
              <h2>주문내역</h2>
              <div className="selected-table">{selectedTable}번 테이블</div>

              <div className="order-list">
                {currentOrders.length === 0 && <div className="empty">메뉴를 선택해주세요.</div>}
                {currentOrders.map(item => (
                  <div className="order-row" key={item.id}>
                    <div>
                      <b>{item.name}</b>
                      <p>{formatWon(item.price)} × {item.qty}</p>
                    </div>
                    <div className="qty-buttons">
                      <button onClick={() => changeQty(item.id, -1)}>-</button>
                      <span>{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="payment-buttons">
                {PAYMENT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setPaymentType(prev => ({...prev, [selectedTable]: type}));
                      setWarning('');
                    }}
                    className={currentPayment === type ? 'payment active' : 'payment'}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {currentPayment === '외상' && (
                <div className={warning ? 'credit-box warning' : 'credit-box'}>
                  <b>외상 단체명 입력 또는 선택</b>
                  <input
                    list="credit-group-list"
                    value={currentCredit}
                    onChange={e => {
                      setCreditGroup(prev => ({...prev, [selectedTable]: e.target.value}));
                      setWarning('');
                    }}
                    placeholder="단체명 입력 또는 선택"
                  />
                  <datalist id="credit-group-list">
                    {creditNameOptions.map(name => <option key={name} value={name} />)}
                  </datalist>
                  {creditNameOptions.length > 0 && (
                    <div className="quick-groups">
                      {creditNameOptions.map(name => (
                        <button key={name} onClick={() => setCreditGroup(prev => ({...prev, [selectedTable]: name}))}>
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                  {warning && <div className="warning-text">{warning}</div>}
                </div>
              )}

              <div className="total-box">
                <span>총 금액</span>
                <strong>{formatWon(total)}</strong>
              </div>

              <button className="checkout" onClick={completePayment}>
                결제완료
              </button>

              {selectedTableHasOrder && <div className="hint center">주문 중인 테이블은 노란색으로 표시됩니다.</div>}
            </aside>
          </div>
        </>
      )}

      {activeTab === '외상장부' && (
        <section className="ledger-panel">
          <div className="ledger-head">
            <h2>📒 외상장부</h2>
            <button className="primary-btn" onClick={completeSelectedCredits}>선택 완납처리</button>
          </div>

          {Object.keys(groupedCredits).length === 0 && <div className="empty-card">외상내역이 없습니다.</div>}

          {Object.entries(groupedCredits).map(([groupName, list]) => {
            const groupTotal = list.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);
            const collapsed = expandedCreditGroups[groupName] === false;

            return (
              <div className="credit-group" key={groupName}>
                <button
                  className="credit-title"
                  onClick={() => setExpandedCreditGroups(prev => ({...prev, [groupName]: !collapsed ? false : true}))}
                >
                  <div>
                    <h3>{collapsed ? '▶' : '▼'} {groupName}</h3>
                    <p>외상잔액: {formatWon(groupTotal)} · {list.length}건</p>
                  </div>
                </button>

                {!collapsed && (
                  <div className="credit-list">
                    {list.map(item => (
                      <div className={item.paid ? 'credit-item paid' : 'credit-item'} key={item.id}>
                        <div className="credit-check">
                          <input
                            type="checkbox"
                            checked={checkedCredit[item.id] === true}
                            onChange={e => setCheckedCredit(prev => ({...prev, [item.id]: e.target.checked}))}
                          />
                        </div>

                        <div className="credit-content">
                          <b>{item.date} {item.time} / {item.table}번 테이블</b>
                          <p>{(item.items || []).map(x => `${x.name} ${x.qty}개`).join(', ')}</p>
                          <strong>남은금액: {formatWon(item.remainingAmount)}</strong>
                          {item.paid && <span className="paid-label">결제완료</span>}
                          {(item.partialPayments || []).map((p, idx) => (
                            <div className="partial-log" key={idx}>
                              부분결제 {formatWon(p.amount)} / {p.date}
                            </div>
                          ))}

                          <div className="partial-row">
                            <input
                              type="number"
                              value={partialAmount[item.id] || ''}
                              onChange={e => setPartialAmount(prev => ({...prev, [item.id]: e.target.value}))}
                              placeholder="일부결제 금액"
                            />
                            <button onClick={() => applyPartialPayment(item.id)}>일부결제</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {activeTab === '판매통계' && (
        <section className="stats-panel">
          <div className="stats-head">
            <h2>📊 판매통계</h2>
            <button className="green-btn" onClick={exportSalesCSV}>기간통계 CSV</button>
          </div>

          <div className="date-row">
            <input type="date" value={statsStart} onChange={e => setStatsStart(e.target.value)} />
            <span>~</span>
            <input type="date" value={statsEnd} onChange={e => setStatsEnd(e.target.value)} />
          </div>

          <div className="stat-cards">
            <div className="stat-card">
              <span>오늘 매출</span>
              <strong>{formatWon(todaySales)}</strong>
            </div>
            <div className="stat-card">
              <span>누적 매출</span>
              <strong className="green-text">{formatWon(totalSales)}</strong>
            </div>
            <div className="stat-card">
              <span>기간 매출</span>
              <strong>{formatWon(stats.totalSales)}</strong>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stats-box">
              <h3>메뉴별 판매량</h3>
              {stats.topMenus.length === 0 && <div className="muted">기간 내 판매내역이 없습니다.</div>}
              {stats.topMenus.map(([name, qty]) => (
                <div className="stat-line" key={name}>
                  <b>{name}</b>
                  <span>{qty}개</span>
                </div>
              ))}
            </div>

            <div className="stats-box">
              <h3>시간대별 매출</h3>
              {Object.entries(stats.hourSales).length === 0 && <div className="muted">기간 내 판매내역이 없습니다.</div>}
              {Object.entries(stats.hourSales)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([hour, amount]) => (
                  <div className="stat-line" key={hour}>
                    <b>{hour}시</b>
                    <span>{formatWon(amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
