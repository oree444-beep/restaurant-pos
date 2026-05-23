
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const defaultMenus = [
  { id: 1, name: "생태탕", price: 12000, category: "식사류", categoryOrder: 1, emoji: "🍲", image: "", soldOut: false },
  { id: 2, name: "애호박찌개", price: 10000, category: "식사류", categoryOrder: 1, emoji: "🥘", image: "", soldOut: false },
  { id: 3, name: "소주", price: 5000, category: "주류", categoryOrder: 2, emoji: "🍶", image: "", soldOut: false },
  { id: 4, name: "맥주", price: 5000, category: "주류", categoryOrder: 2, emoji: "🍺", image: "", soldOut: false },
  { id: 5, name: "콜라", price: 2000, category: "음료", categoryOrder: 3, emoji: "🥤", image: "", soldOut: false },
];

const paymentList = ["현금", "카드", "카드+현금", "상품권", "기타", "외상"];
const emojiList = ["🍲", "🥘", "🍜", "🍚", "🍖", "🍗", "🍱", "🍶", "🍺", "🥤", "☕", "🍰"];

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

function won(v) {
  return Number(v || 0).toLocaleString() + "원";
}

function csvEscape(v) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

function nowFileName(prefix) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${prefix}_${yy}${mm}${dd}_${hh}${mi}`;
}

function downloadText(filename, text, type = "text/plain;charset=utf-8;") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function resizeImage(file, maxSize = 360, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxSize / width, maxSize / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function App() {
  const [menus, setMenus] = useState(() => load("menus", defaultMenus));
  const [orders, setOrders] = useState(() => load("orders", {}));
  const [salesHistory, setSalesHistory] = useState(() => load("salesHistory", []));
  const [selectedTable, setSelectedTable] = useState(1);
  const [tableCount, setTableCount] = useState(() => load("tableCount", 12));
  const [paymentType, setPaymentType] = useState({});
  const [creditGroup, setCreditGroup] = useState({});
  const [creditContacts, setCreditContacts] = useState(() => load("creditContacts", {}));
  const [creditContactInput, setCreditContactInput] = useState({});
  const [creditMemoInput, setCreditMemoInput] = useState({});
  const [warning, setWarning] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => load("adminPassword", "1234"));
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [eatType, setEatType] = useState({});
  const [popularPeriod, setPopularPeriod] = useState("7");
  const [popularLimit, setPopularLimit] = useState(() => load("popularLimit", 5));
  const [checkedCredit, setCheckedCredit] = useState({});
  const [partialAmount, setPartialAmount] = useState({});
  const [openCredit, setOpenCredit] = useState(false);
  const [openStats, setOpenStats] = useState(false);
  const [toast, setToast] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [receiptSale, setReceiptSale] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState("");
  const [autoCharges, setAutoCharges] = useState(() => load("autoCharges", {
    dineIn: { label: "", price: 0 },
    takeout: { label: "포장용기", price: 0 }
  }));

  const [newMenu, setNewMenu] = useState({
    name: "",
    price: "",
    category: "식사류",
    categoryOrder: 1,
    emoji: "🍽️",
    image: "",
    soldOut: false
  });

  useEffect(() => save("menus", menus), [menus]);
  useEffect(() => save("orders", orders), [orders]);
  useEffect(() => save("salesHistory", salesHistory), [salesHistory]);
  useEffect(() => save("tableCount", tableCount), [tableCount]);
  useEffect(() => save("popularLimit", popularLimit), [popularLimit]);
  useEffect(() => save("adminPassword", adminPassword), [adminPassword]);
  useEffect(() => save("creditContacts", creditContacts), [creditContacts]);
  useEffect(() => save("autoCharges", autoCharges), [autoCharges]);

  const currentOrders = orders[selectedTable] || [];
  const selectedEatType = eatType[selectedTable] || "식당식사";
  const currentAutoCharge = selectedEatType === "포장" ? autoCharges.takeout : autoCharges.dineIn;
  const currentAutoChargeAmount = currentAutoCharge?.label && Number(currentAutoCharge?.price) > 0 ? Number(currentAutoCharge.price) : 0;

  const total = useMemo(() => {
    const base = currentOrders.reduce((sum, item) => sum + item.price * item.qty, 0);
    return base + currentAutoChargeAmount;
  }, [currentOrders, currentAutoChargeAmount]);

  const categories = useMemo(() => {
    const map = {};
    menus.forEach(m => {
      if (!map[m.category]) map[m.category] = Number(m.categoryOrder || 99);
      map[m.category] = Math.min(map[m.category], Number(m.categoryOrder || 99));
    });
    return Object.entries(map).sort((a,b)=>a[1]-b[1]).map(([name, order])=>({name, order}));
  }, [menus]);

  const groupedMenus = useMemo(() => {
    const acc = {};
    categories.forEach(c => acc[c.name] = []);
    menus.forEach(menu => {
      if (!acc[menu.category]) acc[menu.category] = [];
      acc[menu.category].push(menu);
    });
    return acc;
  }, [menus, categories]);

  const popularMenus = useMemo(() => {
    const days = Number(popularPeriod);
    const now = Date.now();
    const filtered = salesHistory.filter(x => now - Number(x.timestamp || 0) < days * 24 * 60 * 60 * 1000);
    const count = {};
    filtered.forEach(sale => (sale.items || []).forEach(item => {
      count[item.name] = (count[item.name] || 0) + Number(item.qty || 0);
    }));
    return Object.entries(count).sort((a,b)=>b[1]-a[1]).slice(0, Number(popularLimit || 5));
  }, [salesHistory, popularPeriod, popularLimit]);

  const filteredSales = useMemo(() => {
    return salesHistory.filter(s => {
      if (!dateStart && !dateEnd) return true;
      const t = Number(s.timestamp || 0);
      if (dateStart) {
        const start = new Date(dateStart).setHours(0,0,0,0);
        if (t < start) return false;
      }
      if (dateEnd) {
        const end = new Date(dateEnd).setHours(23,59,59,999);
        if (t > end) return false;
      }
      return true;
    });
  }, [salesHistory, dateStart, dateEnd]);

  const stats = useMemo(() => {
    const payment = {};
    const eat = {};
    const menu = {};
    const hour = {};
    let total = 0;
    filteredSales.forEach(s => {
      total += Number(s.total || 0);
      payment[s.payment] = (payment[s.payment] || 0) + Number(s.total || 0);
      eat[s.eatType] = (eat[s.eatType] || 0) + Number(s.total || 0);
      const h = new Date(s.timestamp).getHours();
      hour[h] = (hour[h] || 0) + Number(s.total || 0);
      (s.items || []).forEach(i => {
        if (!menu[i.name]) menu[i.name] = { qty: 0, amount: 0 };
        menu[i.name].qty += Number(i.qty || 0);
        menu[i.name].amount += Number(i.qty || 0) * Number(i.price || 0);
      });
    });
    return { total, payment, eat, menu, hour };
  }, [filteredSales]);

  const unpaidCredits = salesHistory.filter(x => x.payment === "외상");
  const groupedCredits = useMemo(() => {
    const acc = {};
    unpaidCredits.forEach(item => {
      const key = item.credit || "미지정";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
    });
    Object.keys(acc).forEach(key => {
      acc[key].sort((a,b) => Number(a.paid) - Number(b.paid) || Number(b.timestamp||0) - Number(a.timestamp||0));
    });
    return acc;
  }, [unpaidCredits]);

  const todaySales = salesHistory.filter(x => x.date === new Date().toLocaleDateString()).reduce((sum, x)=>sum+Number(x.total||0),0);
  const totalSales = salesHistory.reduce((sum, x)=>sum+Number(x.total||0),0);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(""), 3000);
  }

  function addMenu(menu) {
    setToast("");
    if (menu.soldOut) {
      showToast(`${menu.name}은(는) 품절입니다`);
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

  function makeSale() {
    const payment = paymentType[selectedTable] || "현금";
    if (payment === "외상" && !(creditGroup[selectedTable] || "").trim()) {
      setWarning("⚠️ 단체명을 입력 또는 선택해주세요 ⚠️");
      return null;
    }
    if (currentOrders.length === 0 && currentAutoChargeAmount <= 0) return null;
    const creditName = creditGroup[selectedTable] || "";
    const contactInfo = creditContacts[creditName] || {};
    const items = [...currentOrders];
    if (currentAutoCharge?.label && Number(currentAutoCharge?.price) > 0) {
      items.push({ id: "auto-"+selectedEatType, name: currentAutoCharge.label, price: Number(currentAutoCharge.price), qty: 1, category: "자동추가", emoji: "➕" });
    }
    return {
      id: Date.now(),
      table: selectedTable,
      eatType: selectedEatType,
      payment,
      credit: creditName,
      creditContact: creditContactInput[selectedTable] || contactInfo.phone || "",
      creditMemo: creditMemoInput[selectedTable] || contactInfo.memo || "",
      total,
      remainingAmount: total,
      items,
      paid: payment !== "외상",
      partialPayments: [],
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };
  }

  function completePayment({ print = false } = {}) {
    const sale = makeSale();
    if (!sale) return;
    if (sale.payment === "외상") {
      setCreditContacts(prev => ({ ...prev, [sale.credit]: { phone: sale.creditContact, memo: sale.creditMemo } }));
    }
    setSalesHistory(prev => [sale, ...prev]);
    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setWarning("");
    setCreditGroup(prev => ({ ...prev, [selectedTable]: "" }));
    showToast(`${selectedTable}번 테이블 ${sale.payment}결제 완료했습니다`);
    if (print) {
      setReceiptSale(sale);
      setReceiptOpen(true);
      setTimeout(() => window.print(), 100);
    }
  }

  function exportCSV() {
    const rows = filteredSales.map(x => [x.date, x.time, x.table, x.eatType, x.payment, x.total, (x.items||[]).map(i=>`${i.name} ${i.qty}개`).join(" / ")].map(csvEscape).join(","));
    const csv = ["날짜,시간,테이블,식사방식,결제방식,금액,메뉴", ...rows].join("\n");
    downloadText(`${nowFileName("매출통계")}.csv`, "\ufeff" + csv, "text/csv;charset=utf-8;");
  }

  function backupAll(share=false) {
    const data = { menus, orders, salesHistory, tableCount, popularLimit, adminPassword, creditContacts, autoCharges, exportedAt: new Date().toISOString() };
    const text = JSON.stringify(data, null, 2);
    const fileName = `${nowFileName("POS전체백업")}.json`;
    if (share && navigator.share) {
      const file = new File([text], fileName, { type: "application/json" });
      navigator.share({ files: [file], title: "POS 백업", text: "POS 전체 백업파일" }).catch(()=>downloadText(fileName, text, "application/json"));
    } else {
      downloadText(fileName, text, "application/json");
    }
  }

  function restoreBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (d.menus) setMenus(d.menus);
        if (d.orders) setOrders(d.orders);
        if (d.salesHistory) setSalesHistory(d.salesHistory);
        if (d.tableCount) setTableCount(d.tableCount);
        if (d.popularLimit) setPopularLimit(d.popularLimit);
        if (d.adminPassword) setAdminPassword(d.adminPassword);
        if (d.creditContacts) setCreditContacts(d.creditContacts);
        if (d.autoCharges) setAutoCharges(d.autoCharges);
        alert("백업 복구 완료");
      } catch {
        alert("백업파일을 확인해주세요");
      }
    };
    reader.readAsText(file);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const image = await resizeImage(file, 360, 0.72);
      setNewMenu(prev => ({ ...prev, image }));
    } catch {
      alert("이미지를 불러오지 못했습니다");
    }
  }

  function addNewMenu() {
    if (!newMenu.name || !newMenu.price) return alert("메뉴명과 가격을 입력해주세요");
    setMenus(prev => [...prev, { ...newMenu, id: Date.now(), price: Number(newMenu.price), categoryOrder: Number(newMenu.categoryOrder || 99), soldOut: false }]);
    setNewMenu({ name: "", price: "", category: "식사류", categoryOrder: 1, emoji: "🍽️", image: "", soldOut: false });
  }

  function updateMenu(id, patch) {
    setMenus(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }

  function togglePaidBack(ids) {
    setSalesHistory(prev => prev.map(x => ids.includes(x.id) ? { ...x, paid: false, remainingAmount: x.remainingAmount || x.total } : x));
    setCheckedCredit({});
  }

  function selectedCreditIds() {
    return Object.entries(checkedCredit).filter(([,v])=>v).map(([k])=>Number(k));
  }

  function selectedPaidOnly() {
    const ids = selectedCreditIds();
    if (ids.length === 0) return false;
    const selected = salesHistory.filter(x=>ids.includes(x.id));
    return selected.length > 0 && selected.every(x=>x.paid);
  }

  const tables = Array.from({ length: Number(tableCount || 1) }, (_, i) => i + 1);

  function runAdminLogin() {
    if (adminUnlocked) {
      setAdminMode(false);
      setAdminUnlocked(false);
      return;
    }
    setAdminMode(true);
  }

  return (
    <div className="app" onClick={() => toast && setToast("")}>
      {toast && <div className="toast">{toast}</div>}

      <header className="header">
        <div>
          <h1>식당 POS</h1>
          <p>주문 · 외상장부 · 판매통계 · 관리자</p>
        </div>
        <div className="header-actions">
          <button className="dark" onClick={(e)=>{e.stopPropagation(); runAdminLogin();}}>
            {adminUnlocked ? "관리자모드 해제" : "관리자모드"}
          </button>
          <button className="green" onClick={exportCSV}>CSV 다운로드</button>
        </div>
      </header>

      {adminMode && !adminUnlocked && (
        <section className="panel admin-login">
          <h2>관리자 비밀번호</h2>
          <input type="password" value={adminPasswordInput} onChange={e=>setAdminPasswordInput(e.target.value)} placeholder="비밀번호 입력" />
          <button className="primary" onClick={() => {
            if (adminPasswordInput === adminPassword) { setAdminUnlocked(true); setAdminPasswordInput(""); }
            else alert("비밀번호가 틀렸습니다");
          }}>확인</button>
          <p className="hint">초기 비밀번호는 1234 입니다.</p>
        </section>
      )}

      {adminUnlocked && (
        <section className="panel admin">
          <h2>관리자모드</h2>

          <div className="admin-grid top-form">
            <div className="admin-card">
              <h3>메뉴 추가</h3>
              <input value={newMenu.name} onChange={e=>setNewMenu({...newMenu, name:e.target.value})} placeholder="메뉴명" />
              <input type="number" value={newMenu.price} onChange={e=>setNewMenu({...newMenu, price:e.target.value})} placeholder="가격" />
              <input value={newMenu.category} onChange={e=>setNewMenu({...newMenu, category:e.target.value})} placeholder="메뉴구분" />
              <input type="number" value={newMenu.categoryOrder} onChange={e=>setNewMenu({...newMenu, categoryOrder:e.target.value})} placeholder="메뉴구분 순서" />
              <div className="emoji-row">{emojiList.map(em=><button key={em} className={newMenu.emoji===em?"pick":""} onClick={()=>setNewMenu({...newMenu, emoji:em})}>{em}</button>)}</div>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              <p className="hint">큰 사진도 자동축소되어 메뉴카드 안에 맞게 저장됩니다.</p>
              <button className="primary" onClick={addNewMenu}>메뉴추가</button>
            </div>

            <div className="admin-card">
              <h3>기본 설정</h3>
              <label>테이블수</label>
              <input type="number" value={tableCount} onChange={e=>setTableCount(Number(e.target.value||1))} />
              <label>인기메뉴 표시 개수</label>
              <input type="number" value={popularLimit} onChange={e=>setPopularLimit(Number(e.target.value||5))} />
              <label>식당이용 자동추가 내용</label>
              <input value={autoCharges.dineIn.label} onChange={e=>setAutoCharges({...autoCharges, dineIn:{...autoCharges.dineIn, label:e.target.value}})} placeholder="예: 상차림비" />
              <label>식당이용 자동추가 금액</label>
              <input type="number" value={autoCharges.dineIn.price} onChange={e=>setAutoCharges({...autoCharges, dineIn:{...autoCharges.dineIn, price:Number(e.target.value||0)}})} />
              <label>포장 자동추가 내용</label>
              <input value={autoCharges.takeout.label} onChange={e=>setAutoCharges({...autoCharges, takeout:{...autoCharges.takeout, label:e.target.value}})} placeholder="예: 포장용기" />
              <label>포장 자동추가 금액</label>
              <input type="number" value={autoCharges.takeout.price} onChange={e=>setAutoCharges({...autoCharges, takeout:{...autoCharges.takeout, price:Number(e.target.value||0)}})} />
            </div>

            <div className="admin-card data-card">
              <h3>데이터 관리</h3>
              <button onClick={()=>backupAll(false)}>전체백업 다운로드</button>
              <p>메뉴/외상/판매통계/설정을 파일로 저장합니다.</p>
              <button onClick={()=>backupAll(true)}>전체백업 공유하기</button>
              <p>가능한 기기에서는 카톡/문자/메일 공유창이 열립니다.</p>
              <label className="file-label">백업파일 불러오기<input type="file" accept=".json" onChange={restoreBackup} hidden /></label>
              <p>저장한 백업파일로 복구합니다.</p>
              <button onClick={()=>setOrders({})}>테스트 주문 초기화</button>
              <p>현재 주문내역만 삭제합니다. 메뉴/판매/외상은 유지됩니다.</p>
              <input value={confirmReset} onChange={e=>setConfirmReset(e.target.value)} placeholder='초기화하려면 "초기화" 입력' />
              <button className="danger" onClick={()=>{
                if(confirmReset !== "초기화") return alert('"초기화"를 입력해주세요');
                setSalesHistory([]);
                setConfirmReset("");
              }}>판매/외상 데이터 초기화</button>
              <p className="danger-text">판매통계와 외상장부를 삭제합니다. 메뉴는 유지됩니다.</p>
            </div>

            <div className="admin-card">
              <h3>비밀번호 변경</h3>
              <input type="password" value={newAdminPassword} onChange={e=>setNewAdminPassword(e.target.value)} placeholder="새 비밀번호" />
              <button onClick={()=>{
                if(!newAdminPassword) return;
                setAdminPassword(newAdminPassword);
                setNewAdminPassword("");
                alert("비밀번호 변경완료");
              }}>비밀번호 변경</button>
            </div>
          </div>

          <div className="admin-menu-list">
            <h3>현재 메뉴 관리</h3>
            {menus.map(menu => (
              <div className="admin-menu-row" key={menu.id}>
                <input type="checkbox" checked={!!menu.soldOut} onChange={e=>updateMenu(menu.id,{soldOut:e.target.checked})} />
                <span className="menu-preview">{menu.image ? <img src={menu.image} /> : menu.emoji}</span>
                <input value={menu.name} onChange={e=>updateMenu(menu.id,{name:e.target.value})} />
                <input type="number" value={menu.price} onChange={e=>updateMenu(menu.id,{price:Number(e.target.value||0)})} />
                <input value={menu.category} onChange={e=>updateMenu(menu.id,{category:e.target.value})} />
                <input type="number" value={menu.categoryOrder || 99} onChange={e=>updateMenu(menu.id,{categoryOrder:Number(e.target.value||99)})} />
                <button className="danger" onClick={()=>setMenus(prev=>prev.filter(x=>x.id!==menu.id))}>삭제</button>
              </div>
            ))}
            <p className="hint">체크하면 품절로 표시되고 주문창에서 선택할 수 없습니다. 메뉴구분 순서가 낮을수록 위에 표시됩니다.</p>
          </div>
        </section>
      )}

      <section className="table-grid">
        {tables.map(n => {
          const hasOrder = (orders[n] || []).length > 0;
          return <button key={n} onClick={()=>setSelectedTable(n)} className={`table-btn ${selectedTable===n?"selected":hasOrder?"busy":""}`}>{n}번</button>
        })}
      </section>

      <section className="popular panel yellow">
        <div className="section-title"><h2>🔥 인기메뉴</h2><div className="periods">{["1","7","30"].map(v=><button key={v} onClick={()=>setPopularPeriod(v)} className={popularPeriod===v?"active":""}>{v==="1"?"오늘":v==="7"?"최근7일":"최근30일"}</button>)}</div></div>
        <div className="popular-list">
          {popularMenus.length === 0 && <p className="hint">결제 후 인기메뉴가 표시됩니다</p>}
          {popularMenus.map(([name, qty]) => {
            const item = menus.find(x=>x.name===name);
            if(!item) return null;
            return <button className="popular-card" onClick={()=>addMenu(item)} key={name}>
              {item.image ? <img src={item.image} /> : <span>{item.emoji}</span>}
              <b>{name}</b><small>{qty}개 판매</small>
            </button>
          })}
        </div>
      </section>

      <main className="layout">
        <div className="left">
          <div className="eat-buttons">
            {["식당식사","포장"].map(type=><button key={type} onClick={()=>setEatType({...eatType,[selectedTable]:type})} className={selectedEatType===type?"active":""}>{type}</button>)}
            {currentAutoCharge?.label && Number(currentAutoCharge?.price)>0 && <span className="auto-info">{currentAutoCharge.label} +{won(currentAutoCharge.price)}</span>}
          </div>

          {Object.entries(groupedMenus).map(([category, list]) => (
            <section key={category} className="panel menu-section">
              <h2>{category}</h2>
              <div className="menu-grid">
                {list.map(item => (
                  <button key={item.id} onClick={()=>addMenu(item)} disabled={item.soldOut} className={`menu-card ${item.soldOut?"soldout":""}`}>
                    <div className="menu-img">{item.image ? <img src={item.image} /> : <span>{item.emoji}</span>}</div>
                    {item.soldOut && <div className="soldout-badge">품절</div>}
                    <b>{item.name}</b>
                    <p>{won(item.price)}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="order-panel">
          <h2>주문내역 ({selectedTable}번)</h2>
          <div className="order-list">
            {currentOrders.length === 0 && <p className="empty">메뉴를 선택해주세요</p>}
            {currentOrders.map(item => (
              <div className="order-item" key={item.id}>
                <div><b>{item.name}</b><p>{won(item.price)} x {item.qty}</p></div>
                <div className="qty">
                  <button className="minus" onClick={()=>changeQty(item.id,-1)}>-</button>
                  <b>{item.qty}</b>
                  <button className="plus" onClick={()=>changeQty(item.id,1)}>+</button>
                </div>
              </div>
            ))}
            {currentAutoCharge?.label && Number(currentAutoCharge?.price)>0 && <div className="order-item auto"><div><b>{currentAutoCharge.label}</b><p>{won(currentAutoCharge.price)} x 1</p></div></div>}
          </div>

          <div className="pay-buttons">
            {paymentList.map(type => <button key={type} onClick={()=>setPaymentType({...paymentType,[selectedTable]:type})} className={(paymentType[selectedTable]||"현금")===type?"active":""}>{type}</button>)}
          </div>

          {(paymentType[selectedTable] || "") === "외상" && (
            <div className={`credit-box ${warning ? "warn":""}`}>
              <b>외상 단체명 입력 또는 선택</b>
              <input list="credit-list" value={creditGroup[selectedTable] || ""} onChange={e=>{
                const name=e.target.value;
                const info=creditContacts[name]||{};
                setCreditGroup({...creditGroup,[selectedTable]:name});
                setCreditContactInput({...creditContactInput,[selectedTable]:info.phone||""});
                setCreditMemoInput({...creditMemoInput,[selectedTable]:info.memo||""});
              }} placeholder="단체명 입력 또는 선택" />
              <datalist id="credit-list">{Object.keys(creditContacts).concat(unpaidCredits.map(x=>x.credit)).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).map(name=><option key={name} value={name}/>)}</datalist>
              <input value={creditContactInput[selectedTable] || ""} onChange={e=>setCreditContactInput({...creditContactInput,[selectedTable]:e.target.value})} placeholder="연락처 선택입력" />
              <input value={creditMemoInput[selectedTable] || ""} onChange={e=>setCreditMemoInput({...creditMemoInput,[selectedTable]:e.target.value})} placeholder="기본메모 선택입력" />
              {warning && <p>{warning}</p>}
            </div>
          )}

          <div className="total"><span>총 금액</span><b>{won(total)}</b></div>
          <button className="pay-main" onClick={()=>completePayment({print:false})}>결제완료</button>
          <button className="pay-print" onClick={()=>completePayment({print:true})}>결제완료 + 영수증 출력</button>
          <button className="reprint" onClick={()=>setRecentOpen(true)}>영수증 재출력</button>
        </aside>
      </main>

      <div className="bottom-bars">
        <button className="credit-toggle" onClick={()=>setOpenCredit(!openCredit)}>외상장부 {openCredit?"▲":"▼"}</button>
        <button className="stats-toggle" onClick={()=>setOpenStats(!openStats)}>판매통계 {openStats?"▲":"▼"}</button>
      </div>

      {openCredit && (
        <section className="drawer panel">
          <h2>외상장부</h2>
          {Object.keys(groupedCredits).length===0 && <p className="hint">외상내역이 없습니다</p>}
          {Object.entries(groupedCredits).map(([groupName, list]) => {
            const contact = creditContacts[groupName] || {};
            const groupTotal = list.reduce((sum,x)=>sum+Number(x.remainingAmount||0),0);
            return <div className="credit-group" key={groupName}>
              <div className="credit-head"><h3>{groupName}</h3><p>{contact.phone && `연락처: ${contact.phone}`} {contact.memo && ` / 메모: ${contact.memo}`} / 잔액 {won(groupTotal)}</p></div>
              {list.map(item => <div key={item.id} className={`credit-row ${item.paid?"paid":""} ${checkedCredit[item.id]?"checked":""}`}>
                <input type="checkbox" checked={!!checkedCredit[item.id]} onChange={e=>setCheckedCredit({...checkedCredit,[item.id]:e.target.checked})} />
                <div className="credit-info">
                  <b>{item.date} / {item.table}번 테이블</b>
                  <p>{(item.items||[]).map(x=>`${x.name} ${x.qty}개`).join(", ")}</p>
                  <small>{item.paid ? "결제완료" : `남은금액 ${won(item.remainingAmount || item.total)}`}</small>
                </div>
                <input type="number" value={partialAmount[item.id]||""} onChange={e=>setPartialAmount({...partialAmount,[item.id]:e.target.value})} placeholder="일부결제금액" disabled={item.paid}/>
                <button disabled={item.paid} onClick={()=>{
                  const pay=Number(partialAmount[item.id]||0);
                  if(pay<=0) return;
                  setSalesHistory(prev=>prev.map(x=>{
                    if(x.id!==item.id) return x;
                    const remain=(x.remainingAmount||x.total)-pay;
                    return {...x, remainingAmount: remain>0?remain:0, paid: remain<=0, partialPayments:[...(x.partialPayments||[]),{amount:pay,date:new Date().toLocaleDateString()}]};
                  }));
                }}>일부결제</button>
              </div>)}
            </div>
          })}
          <div className="credit-actions">
            <button className={selectedPaidOnly()?"restore":"primary"} onClick={()=>{
              const ids=selectedCreditIds();
              if(ids.length===0) return;
              if(selectedPaidOnly()) return togglePaidBack(ids);
              setSalesHistory(prev=>prev.map(x=>ids.includes(x.id)?{...x, remainingAmount:0, paid:true}:x));
              setCheckedCredit({});
            }}>{selectedPaidOnly() ? "선택완납처리해제" : "선택완납처리"}</button>
          </div>
        </section>
      )}

      {openStats && (
        <section className="drawer panel stats">
          <h2>판매통계</h2>
          <div className="date-row"><input type="date" value={dateStart} onChange={e=>setDateStart(e.target.value)} /><input type="date" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} /><button onClick={exportCSV}>기간통계 CSV</button></div>
          <div className="stat-cards"><div><span>오늘 매출</span><b>{won(todaySales)}</b></div><div><span>누적 매출</span><b>{won(totalSales)}</b></div><div><span>조회기간 매출</span><b>{won(stats.total)}</b></div></div>
          <div className="stat-grid">
            <div><h3>결제방식별</h3>{paymentList.map(p=><p key={p}>{p}: {won(stats.payment[p]||0)}</p>)}</div>
            <div><h3>식사방식별</h3>{["식당식사","포장"].map(p=><p key={p}>{p}: {won(stats.eat[p]||0)}</p>)}</div>
            <div><h3>시간대별</h3>{Object.entries(stats.hour).sort((a,b)=>a[0]-b[0]).map(([h,a])=><p key={h}>{h}시: {won(a)}</p>)}</div>
            <div><h3>메뉴별 판매량</h3>{Object.entries(stats.menu).sort((a,b)=>b[1].qty-a[1].qty).map(([name,v])=><p key={name}>{name}: {v.qty}개 / {won(v.amount)}</p>)}</div>
          </div>
        </section>
      )}

      {recentOpen && (
        <div className="modal">
          <div className="modal-box">
            <h2>최근 결제내역 / 영수증 재출력</h2>
            <button className="close" onClick={()=>setRecentOpen(false)}>닫기</button>
            {salesHistory.slice(0,30).map(s=><div key={s.id} className="recent-row">
              <div><b>{s.date} {s.time}</b><p>{s.table}번 / {s.payment} / {won(s.total)}</p></div>
              <button onClick={()=>{setReceiptSale(s);setReceiptOpen(true);setTimeout(()=>window.print(),100)}}>재출력</button>
            </div>)}
          </div>
        </div>
      )}

      {receiptOpen && receiptSale && (
        <div className="receipt-wrap">
          <div className="receipt">
            <h2>영수증</h2>
            <p>{receiptSale.date} {receiptSale.time}</p>
            <p>{receiptSale.table}번 / {receiptSale.eatType} / {receiptSale.payment}</p>
            <hr/>
            {(receiptSale.items||[]).map((i,idx)=><div className="receipt-line" key={idx}><span>{i.name} x {i.qty}</span><b>{won(Number(i.price)*Number(i.qty))}</b></div>)}
            <hr/>
            <div className="receipt-line total-line"><span>합계</span><b>{won(receiptSale.total)}</b></div>
            <button className="no-print" onClick={()=>window.print()}>인쇄</button>
            <button className="no-print" onClick={()=>setReceiptOpen(false)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
