import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const VERSION = "V15";

const D_M = [
  { id: "m1", name: "생태탕", price: 12000, category: "식사류", emoji: "🍲", image: "", soldOut: false },
  { id: "m2", name: "애호박찌개", price: 10000, category: "식사류", emoji: "🥘", image: "", soldOut: false },
  { id: "m3", name: "소주", price: 5000, category: "주류", emoji: "🍶", image: "", soldOut: false },
  { id: "m4", name: "맥주", price: 5000, category: "주류", emoji: "🍺", image: "", soldOut: false },
  { id: "m5", name: "콜라", price: 2000, category: "음료", emoji: "🥤", image: "", soldOut: false }
];

const D_C = [
  { name: "식사류", order: 1 },
  { name: "주류", order: 2 },
  { name: "음료", order: 3 }
];

const LS = {
  menus: "menus",
  orders: "orders",
  salesHistory: "salesHistory",
  creditLedger: "creditLedger",
  tableCount: "tableCount",
  tableRows: "tableRows",
  adminPassword: "adminPassword",
  restaurantName: "restaurantName",
  popularCount: "popularCount",
  showPopular: "showPopular",
  categories: "categories",
  diningSetting: "diningSetting",
  takeoutSetting: "takeoutSetting",
  pinTables: "pinTables",
  pinOrder: "pinOrder",
  scrollTopAfterPay: "scrollTopAfterPay"
};

const getLS = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const setLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = value => `${(Number(value) || 0).toLocaleString()}원`;
const todayValue = () => new Date().toISOString().slice(0, 10);
const timeName = () => {
  const d = new Date();
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
};

function resizeImage(file, size = 300, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const cropSize = Math.min(img.width, img.height);
        const sx = Math.round((img.width - cropSize) / 2);
        const sy = Math.round((img.height - cropSize) / 2);
        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function App() {
  const [restaurantName, setRestaurantName] = useState(() => getLS(LS.restaurantName, "식당"));
  const [menus, setMenus] = useState(() => getLS(LS.menus, D_M));
  const [categories, setCategories] = useState(() => getLS(LS.categories, D_C));
  const [tableCount, setTableCount] = useState(() => getLS(LS.tableCount, 12));
  const [tableRows, setTableRows] = useState(() => getLS(LS.tableRows, 2));
  const [selectedTable, setSelectedTable] = useState(1);
  const [orders, setOrders] = useState(() => getLS(LS.orders, {}));
  const [sales, setSales] = useState(() => getLS(LS.salesHistory, []));
  const [credits, setCredits] = useState(() => getLS(LS.creditLedger, []));
  const [payment, setPayment] = useState("카드");
  const [serviceType, setServiceType] = useState("식당식사");
  const [popularType, setPopularType] = useState("최근7일");
  const [popularCount, setPopularCount] = useState(() => getLS(LS.popularCount, 4));
  const [showPopular, setShowPopular] = useState(() => getLS(LS.showPopular, true));
  const [adminPw, setAdminPw] = useState(() => getLS(LS.adminPassword, "1234"));
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [toast, setToast] = useState("");
  const [creditWarn, setCreditWarn] = useState("");
  const [openCredit, setOpenCredit] = useState(false);
  const [openStats, setOpenStats] = useState(false);
  const [creditName, setCreditName] = useState("");
  const [creditPhone, setCreditPhone] = useState("");
  const [creditMemo, setCreditMemo] = useState("");
  const [creditInfoConflict, setCreditInfoConflict] = useState(null);
  const [newMenu, setNewMenu] = useState({ name: "", price: "", category: "식사류", emoji: "🍲", image: "" });
  const [diningSetting, setDiningSetting] = useState(() => getLS(LS.diningSetting, { label: "", price: 0 }));
  const [takeoutSetting, setTakeoutSetting] = useState(() => getLS(LS.takeoutSetting, { label: "", price: 0 }));
  const [selectedCreditIds, setSelectedCreditIds] = useState([]);
  const [hiddenCreditGroups, setHiddenCreditGroups] = useState({});
  const [msgModal, setMsgModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(false);
  const [pinTables, setPinTables] = useState(() => getLS(LS.pinTables, true));
  const [pinOrder, setPinOrder] = useState(() => getLS(LS.pinOrder, true));
  const [scrollTopAfterPay, setScrollTopAfterPay] = useState(() => getLS(LS.scrollTopAfterPay, true));

  useEffect(() => setLS(LS.restaurantName, restaurantName), [restaurantName]);
  useEffect(() => setLS(LS.menus, menus), [menus]);
  useEffect(() => setLS(LS.categories, categories), [categories]);
  useEffect(() => setLS(LS.tableCount, tableCount), [tableCount]);
  useEffect(() => setLS(LS.tableRows, tableRows), [tableRows]);
  useEffect(() => setLS(LS.orders, orders), [orders]);
  useEffect(() => setLS(LS.salesHistory, sales), [sales]);
  useEffect(() => setLS(LS.creditLedger, credits), [credits]);
  useEffect(() => setLS(LS.popularCount, popularCount), [popularCount]);
  useEffect(() => setLS(LS.showPopular, showPopular), [showPopular]);
  useEffect(() => setLS(LS.adminPassword, adminPw), [adminPw]);
  useEffect(() => setLS(LS.diningSetting, diningSetting), [diningSetting]);
  useEffect(() => setLS(LS.takeoutSetting, takeoutSetting), [takeoutSetting]);
  useEffect(() => setLS(LS.pinTables, pinTables), [pinTables]);
  useEffect(() => setLS(LS.pinOrder, pinOrder), [pinOrder]);
  useEffect(() => setLS(LS.scrollTopAfterPay, scrollTopAfterPay), [scrollTopAfterPay]);

  const currentOrder = orders[selectedTable] || [];
  const total = currentOrder.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tables = Array.from({ length: Number(tableCount) || 1 }, (_, index) => index + 1);
  const rows = Math.max(1, Math.min(Number(tableRows) || 2, tables.length));
  const cols = Math.ceil(tables.length / rows);
  const fixedEnabled = !openCredit && !openStats;

  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => Number(a.order) - Number(b.order)),
    [categories]
  );

  const sortedMenus = useMemo(
    () => menus
      .map((menu, index) => ({ ...menu, _orderIndex: index }))
      .sort((a, b) => {
        const ao = categories.find(c => c.name === a.category)?.order || 99;
        const bo = categories.find(c => c.name === b.category)?.order || 99;
        return ao - bo || a._orderIndex - b._orderIndex;
      }),
    [menus, categories]
  );

  const creditGroups = useMemo(() => {
    const map = new Map();
    credits.forEach(item => {
      if (!item.group) return;
      if (!map.has(item.group)) map.set(item.group, { group: item.group, phone: item.phone || "", memo: item.memo || "" });
      const old = map.get(item.group);
      if (!old.phone && item.phone) old.phone = item.phone;
      if (!old.memo && item.memo) old.memo = item.memo;
    });
    return Array.from(map.values()).sort((a, b) => a.group.localeCompare(b.group, "ko"));
  }, [credits]);

  const clearToast = () => {
    if (toast) setToast("");
  };

  const showToast = message => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const applyServiceAdd = (type, orderList) => {
    const setting = type === "포장" ? takeoutSetting : diningSetting;
    const clean = orderList.filter(item => !String(item.id).startsWith("service-"));
    if (!setting.label || !Number(setting.price)) return clean;
    return [
      ...clean,
      { id: `service-${type}`, name: setting.label, price: Number(setting.price), qty: 1, service: true }
    ];
  };

  const setType = type => {
    setServiceType(type);
    setOrders(prev => ({ ...prev, [selectedTable]: applyServiceAdd(type, prev[selectedTable] || []) }));
  };

  const addMenu = menu => {
    clearToast();
    if (menu.soldOut) return;
    setOrders(prev => {
      const list = prev[selectedTable] || [];
      const clean = list.filter(item => !String(item.id).startsWith("service-"));
      const exists = clean.find(item => item.id === menu.id);
      const next = exists
        ? clean.map(item => (item.id === menu.id ? { ...item, qty: item.qty + 1 } : item))
        : [...clean, { ...menu, qty: 1 }];
      return { ...prev, [selectedTable]: applyServiceAdd(serviceType, next) };
    });
  };

  const changeQty = (id, diff) => {
    clearToast();
    setOrders(prev => ({
      ...prev,
      [selectedTable]: (prev[selectedTable] || [])
        .map(item => (item.id === id ? { ...item, qty: item.qty + diff } : item))
        .filter(item => item.qty > 0)
    }));
  };

  const onCreditNameChange = value => {
    setCreditName(value);
    setCreditWarn("");
    const found = creditGroups.find(item => item.group === value);
    if (found) {
      setCreditPhone(found.phone || "");
      setCreditMemo(found.memo || "");
    }
  };

  const printReceipt = sale => {
    const win = window.open("", "receipt", "width=360,height=600");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>영수증</title><style>body{font-family:sans-serif;width:280px;margin:12px}h2{text-align:center;margin:0 0 8px}td{padding:4px;border-bottom:1px dashed #ccc}.total{text-align:right;font-weight:bold;font-size:20px;margin-top:12px}</style></head><body><h2>${restaurantName}</h2><div>${new Date(sale.createdAt).toLocaleString()}</div><div>${sale.table}번 / ${sale.payment} / ${sale.serviceType}</div><hr/><table style="width:100%">${sale.items.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${money(item.price * item.qty)}</td></tr>`).join("")}</table><div class="total">합계 ${money(sale.total)}</div><p style="text-align:center">감사합니다</p><script>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}</script></body></html>`);
    win.document.close();
  };

  const complete = withPrint => {
    if (!currentOrder.length) return showToast("주문내역이 없습니다");
    if (payment === "외상" && !creditName.trim()) {
      setCreditWarn("⚠️ 외상 단체명을 입력 또는 선택해주세요 ⚠️");
      return;
    }

    const oldGroup = creditGroups.find(item => item.group === creditName.trim());
    if (payment === "외상" && oldGroup) {
      const changedPhone = oldGroup.phone && creditPhone && oldGroup.phone !== creditPhone;
      const changedMemo = oldGroup.memo && creditMemo && oldGroup.memo !== creditMemo;
      if ((changedPhone || changedMemo) && !creditInfoConflict) {
        setCreditInfoConflict({ oldGroup, nextPhone: creditPhone, nextMemo: creditMemo });
        return;
      }
    }

    const sale = {
      id: Date.now(),
      table: selectedTable,
      payment,
      serviceType,
      total,
      createdAt: new Date().toISOString(),
      items: currentOrder
    };

    setSales(prev => [sale, ...prev]);
    if (payment === "외상") {
      setCredits(prev => [
        {
          id: sale.id,
          group: creditName.trim(),
          phone: creditPhone,
          memo: creditMemo,
          table: selectedTable,
          total,
          remain: total,
          paid: false,
          createdAt: sale.createdAt,
          items: currentOrder,
          partialPayments: []
        },
        ...prev
      ]);
      setCreditName("");
      setCreditPhone("");
      setCreditMemo("");
      setCreditInfoConflict(null);
    }

    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setCreditWarn("");
    showToast(`${selectedTable}번테이블 ${payment}결제 완료했습니다`);
    if (withPrint) printReceipt(sale);
    if (scrollTopAfterPay) window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 120);
  };

  const exportStats = () => {
    const head = ["날짜", "테이블", "결제", "식사구분", "메뉴", "수량", "금액", "총액"];
    const rows = sales.flatMap(sale =>
      sale.items.map(item => [
        new Date(sale.createdAt).toLocaleString(),
        sale.table,
        sale.payment,
        sale.serviceType,
        item.name,
        item.qty,
        item.price * item.qty,
        sale.total
      ])
    );
    const csv = [head, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${restaurantName || "식당"}_매출통계_${timeName()}.csv`;
    link.click();
  };

  const openAdmin = () => {
    setPwInput("");
    setShowPw(true);
  };

  const loginAdmin = () => {
    if (pwInput === adminPw) {
      setShowPw(false);
      setShowAdmin(true);
      setPwInput("");
    } else {
      alert("비밀번호가 틀렸습니다");
    }
  };

  const updateRows = value => {
    const next = Number(value) || 1;
    if (next > Number(tableCount)) return alert("테이블 수보다 줄 수가 많습니다.");
    setTableRows(next);
  };

  const popular = useMemo(() => {
    const days = popularType === "오늘" ? 1 : popularType === "최근7일" ? 7 : 30;
    const cut = Date.now() - days * 86400000;
    const map = {};
    sales
      .filter(sale => new Date(sale.createdAt).getTime() >= cut)
      .forEach(sale => {
        sale.items.forEach(item => {
          if (item.service) return;
          map[item.id] = map[item.id] || { ...item, qty: 0 };
          map[item.id].qty += item.qty;
        });
      });
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, Number(popularCount) || 4)
      .map(item => ({ ...item, ...menus.find(menu => menu.id === item.id) }));
  }, [sales, popularType, popularCount, menus]);

  const creditLabel = () => {
    const selected = credits.filter(item => selectedCreditIds.includes(item.id));
    return selected.length && selected.every(item => item.paid) ? "선택완납처리 해제" : "선택완납처리";
  };

  const togglePaid = () => {
    const selected = credits.filter(item => selectedCreditIds.includes(item.id));
    if (!selected.length) return;
    const unlock = selected.every(item => item.paid);
    setCredits(prev => prev.map(item => {
      if (!selectedCreditIds.includes(item.id)) return item;
      return unlock
        ? { ...item, paid: false, remain: item.total, partialPayments: [] }
        : { ...item, paid: true, remain: 0 };
    }));
    setSelectedCreditIds([]);
  };

  const partialPay = (id, amount) => {
    const payAmount = Number(amount) || 0;
    if (payAmount <= 0) return;
    setCredits(prev => prev.map(item => {
      if (item.id !== id) return item;
      const remain = Math.max(0, Number(item.remain || 0) - payAmount);
      return {
        ...item,
        remain,
        paid: remain === 0,
        partialPayments: [...(item.partialPayments || []), { amount: payAmount, at: new Date().toISOString() }]
      };
    }));
  };

  const selectedCredits = credits.filter(item => selectedCreditIds.includes(item.id));
  const selectedCreditTotal = selectedCredits.reduce((sum, item) => sum + (!item.paid ? Number(item.remain || 0) : 0), 0);
  const isUnlockMode = selectedCredits.length > 0 && selectedCredits.every(item => item.paid);
  const payToggleClass = isUnlockMode ? "orangeAction" : "green";
  const selectAllUnpaid = () => setSelectedCreditIds(credits.filter(item => !item.paid).map(item => item.id));
  const clearCreditSelection = () => setSelectedCreditIds([]);
  const openMessageModal = () => {
    if (!selectedCredits.length) return showToast("문자전송할 외상 내역을 선택해주세요");
    setMsgModal({ selected: selectedCredits, total: selectedCreditTotal });
  };

  const groupedCredits = useMemo(() => {
    const map = new Map();
    [...credits]
      .sort((a, b) => Number(a.paid) - Number(b.paid) || new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(item => {
        const key = item.group || "미지정";
        if (!map.has(key)) map.set(key, { group: key, items: [], unpaidTotal: 0 });
        const group = map.get(key);
        group.items.push(item);
        if (!item.paid) group.unpaidTotal += Number(item.remain || 0);
      });
    return Array.from(map.values()).sort((a, b) => b.unpaidTotal - a.unpaidTotal || a.group.localeCompare(b.group, "ko"));
  }, [credits]);

  return (
    <div className="app" onClick={clearToast}>
      <header className="top card">
        <div>
          <h1>{restaurantName} POS <span>{VERSION}</span></h1>
          <p>주문 · 외상장부 · 판매통계 · 관리자</p>
        </div>
        <div className="topBtns">
          <button onClick={e => { e.stopPropagation(); openAdmin(); }} className="dark">관리자모드</button>
          <button onClick={e => { e.stopPropagation(); exportStats(); }} className="green">CSV 다운로드</button>
        </div>
      </header>

      <div className="layout">
        <div className="leftCol">
          <section
            className={`tables ${pinTables && fixedEnabled ? "pinTables" : ""}`}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(110px, 1fr))` }}
          >
            {tables.map(table => (
              <button
                key={table}
                onClick={() => { clearToast(); setSelectedTable(table); }}
                className={`tableBtn ${selectedTable === table ? "sel" : (orders[table] || []).length ? "has" : ""}`}
              >
                {table}번
              </button>
            ))}
          </section>

          {showPopular && (
            <section className="popular card yellow">
              <div className="sectionHead">
                <h2>🔥 인기메뉴</h2>
                <div className="periodBtns">
                  {["오늘", "최근7일", "최근30일"].map(type => (
                    <button key={type} onClick={() => setPopularType(type)} className={popularType === type ? "active" : ""}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="popularScroller">
                {popular.length ? popular.map(menu => <MenuCard key={menu.id} m={menu} addMenu={addMenu} popular />) : <p className="muted">결제 후 인기메뉴가 표시됩니다</p>}
              </div>
            </section>
          )}

          <div className="serviceBtns">
            {["식당식사", "포장"].map(type => (
              <button key={type} onClick={() => setType(type)} className={serviceType === type ? "active" : ""}>{type}</button>
            ))}
          </div>

          <section className="menuArea card">
            {sortedCats.map(category => (
              <div key={category.name}>
                <h2>{category.name}</h2>
                <div className="menuGrid">
                  {sortedMenus.filter(menu => menu.category === category.name).map(menu => <MenuCard key={menu.id} m={menu} addMenu={addMenu} />)}
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className={`order card ${pinOrder && fixedEnabled ? "pinOrder" : ""}`} onClick={e => e.stopPropagation()}>
          <h2>주문내역 ({selectedTable}번)</h2>
          {toast && <div className="toast">{toast}</div>}
          {!currentOrder.length && <p className="empty">메뉴를 선택해주세요</p>}
          {currentOrder.map(item => (
            <div className="orderItem" key={item.id}>
              <div>
                <b>{item.name}</b>
                <p>{money(item.price)} x {item.qty}</p>
              </div>
              {!item.service && (
                <div className="qtyCtl">
                  <button className="minus" onClick={() => changeQty(item.id, -1)}>-</button>
                  <span>{item.qty}</span>
                  <button className="plus" onClick={() => changeQty(item.id, 1)}>+</button>
                </div>
              )}
            </div>
          ))}

          {payment === "외상" && (
            <div className={`creditInput ${creditWarn ? "danger" : ""}`}>
              <input list="creditGroups" placeholder="단체명 필수" value={creditName} onChange={e => onCreditNameChange(e.target.value)} />
              <datalist id="creditGroups">
                {creditGroups.map(group => <option key={group.group} value={group.group} />)}
              </datalist>
              <input placeholder="연락처 선택" value={creditPhone} onChange={e => setCreditPhone(e.target.value)} />
              <input placeholder="기본메모 선택" value={creditMemo} onChange={e => setCreditMemo(e.target.value)} />
              {creditWarn && <div className="warnText">{creditWarn}</div>}
              {creditInfoConflict && (
                <div className="conflictBox">
                  기존 정보와 다릅니다. 새롭게 갱신할까요?
                  <div>
                    <button onClick={() => setCreditInfoConflict(null)}>예, 이번 정보로 저장</button>
                    <button onClick={() => {
                      setCreditPhone(creditInfoConflict.oldGroup.phone || "");
                      setCreditMemo(creditInfoConflict.oldGroup.memo || "");
                      setCreditInfoConflict(null);
                    }}>아니오, 기존 정보 유지</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="payGrid">
            {["현금", "카드", "카드+현금", "상품권", "기타", "외상"].map(type => (
              <button key={type} onClick={() => { setPayment(type); setCreditWarn(""); }} className={payment === type ? "active" : ""}>{type}</button>
            ))}
          </div>
          <div className="total"><b>총 금액</b><b>{money(total)}</b></div>
          <button className="pay" onClick={() => complete(false)}>결제완료</button>
          <button className="pay print" onClick={() => complete(true)}>결제완료 + 영수증 출력</button>
          <button className="ghost" onClick={() => setReceiptModal(true)}>최근 결제내역 / 영수증재출력</button>
        </aside>
      </div>

      <div className="bottomBars">
        <button className="orange" onClick={() => setOpenCredit(!openCredit)}>외상장부 ▼</button>
        <button className="blue" onClick={() => setOpenStats(!openStats)}>판매통계 ▼</button>
      </div>

      {openCredit && (
        <section className="card panel">
          <div className="sectionHead creditHead">
            <div>
              <h2>외상장부</h2>
              <p className="muted">선택 {selectedCreditIds.length}건 / 선택 미납합계 <b>{money(selectedCreditTotal)}</b></p>
            </div>
            <div className="creditActions">
              <button onClick={selectAllUnpaid}>미결제 전체선택</button>
              <button onClick={clearCreditSelection}>선택해제</button>
              <button className={payToggleClass} onClick={togglePaid}>{creditLabel()}</button>
              <button onClick={openMessageModal}>문자전송</button>
            </div>
          </div>
          {groupedCredits.length ? groupedCredits.map(group => (
            <div className="creditGroup" key={group.group}>
              <div className="creditGroupHead">
                <div><b>{group.group}</b> <span>미납총액 {money(group.unpaidTotal)}</span></div>
                <button onClick={() => setHiddenCreditGroups(prev => ({ ...prev, [group.group]: !prev[group.group] }))}>{hiddenCreditGroups[group.group] ? "펼치기" : "숨기기"}</button>
              </div>
              {!hiddenCreditGroups[group.group] && group.items.map(credit => (
                <CreditRow
                  key={credit.id}
                  c={credit}
                  selected={selectedCreditIds.includes(credit.id)}
                  setSelectedCreditIds={setSelectedCreditIds}
                  partialPay={partialPay}
                />
              ))}
            </div>
          )) : <p className="muted">외상 내역이 없습니다</p>}
          <div className="right"><button className={payToggleClass} onClick={togglePaid}>{creditLabel()}</button></div>
        </section>
      )}

      {openStats && <section className="card panel"><Stats sales={sales} menus={menus} /></section>}

      {showPw && (
        <div className="modal">
          <div className="modalBox">
            <button className="xBtn" onClick={() => { setShowPw(false); setPwInput(""); }}>×</button>
            <h2>관리자 비밀번호</h2>
            <input className="pw" type="password" autoFocus value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") loginAdmin(); }} />
            <button className="dark" onClick={loginAdmin}>확인</button>
            <p className="muted">기본 비밀번호는 1234입니다.</p>
          </div>
        </div>
      )}

      {showAdmin && (
        <AdminModal
          {...{
            setShowAdmin,
            restaurantName,
            setRestaurantName,
            menus,
            setMenus,
            newMenu,
            setNewMenu,
            categories,
            setCategories,
            tableCount,
            setTableCount,
            tableRows,
            updateRows,
            popularCount,
            setPopularCount,
            showPopular,
            setShowPopular,
            diningSetting,
            setDiningSetting,
            takeoutSetting,
            setTakeoutSetting,
            adminPw,
            setAdminPw,
            pinTables,
            setPinTables,
            pinOrder,
            setPinOrder,
            scrollTopAfterPay,
            setScrollTopAfterPay
          }}
        />
      )}

      {msgModal && (
        <div className="modal">
          <div className="modalBox wide">
            <button className="xBtn" onClick={() => setMsgModal(null)}>×</button>
            <h2>문자전송</h2>
            <div className="summaryBox">선택한 외상 {msgModal.selected?.length || 0}건 / 미납총액 <b>{money(msgModal.total || 0)}</b></div>
            <p>문자전송 기능 준비중입니다 😊</p>
            <p className="muted">현재는 체크한 내역 기준으로 미납총액만 계산합니다. 추후 외상 독려문자, 자동 금액 입력, 문자포인트, 발송내역 기능을 연결할 예정입니다.</p>
            {(msgModal.selected || []).map(item => <p key={item.id}>{item.group} / {new Date(item.createdAt).toLocaleDateString()} / 잔액 {money(item.remain)}</p>)}
          </div>
        </div>
      )}

      {receiptModal && (
        <div className="modal">
          <div className="modalBox wide">
            <button className="xBtn" onClick={() => setReceiptModal(false)}>×</button>
            <h2>최근 결제내역 / 영수증재출력</h2>
            {sales.slice(0, 30).map(sale => (
              <div className="saleLine" key={sale.id}>
                <span>{new Date(sale.createdAt).toLocaleString()} / {sale.table}번 / {sale.payment} / {money(sale.total)}</span>
                <button onClick={() => printReceipt(sale)}>영수증재출력</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuCard({ m, addMenu, popular }) {
  return (
    <button className={`menuCard ${m.soldOut ? "sold" : ""}`} onClick={() => addMenu(m)} disabled={m.soldOut}>
      <div className="pic">
        {m.image ? <img src={m.image} alt={m.name} /> : <span>{m.emoji}</span>}
        {m.soldOut && <em>품절</em>}
      </div>
      <b>{m.name}</b>
      <p>{popular ? `${m.qty || 0}개 판매` : money(m.price)}</p>
    </button>
  );
}

function CreditRow({ c, selected, setSelectedCreditIds, partialPay }) {
  const [amount, setAmount] = useState("");
  return (
    <div className={`creditRow ${c.paid ? "done" : ""} ${selected ? "checked" : ""}`}>
      <input type="checkbox" checked={selected} onChange={e => setSelectedCreditIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
      <div className="creditMain">
        <b>{c.group}</b> <span>{c.phone}</span>
        <p>{c.memo}</p>
        <p>{new Date(c.createdAt).toLocaleString()} / {c.table}번 / 잔액 {money(c.remain)} / 총액 {money(c.total)}</p>
        {(c.items || []).map(item => <small key={item.id}>{item.name} {item.qty}개 </small>)}
        <br />
        {(c.partialPayments || []).map((pay, index) => <small key={index}>부분결제 {money(pay.amount)} </small>)}
      </div>
      <div className="creditSide">
        <input type="number" placeholder="부분결제" value={amount} onChange={e => setAmount(e.target.value)} />
        <button onClick={() => { partialPay(c.id, amount); setAmount(""); }}>일부결제</button>
      </div>
    </div>
  );
}

function Stats({ sales, menus }) {
  const [startDate, setStartDate] = useState(todayValue());
  const [endDate, setEndDate] = useState(todayValue());
  const filteredSales = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate}T23:59:59`).getTime();
    return sales.filter(sale => {
      const time = new Date(sale.createdAt).getTime();
      return time >= start && time <= end;
    });
  }, [sales, startDate, endDate]);

  const byPay = {}, byService = {}, byHour = {}, byMenu = {};
  filteredSales.forEach(sale => {
    byPay[sale.payment] = (byPay[sale.payment] || 0) + sale.total;
    byService[sale.serviceType] = (byService[sale.serviceType] || 0) + sale.total;
    const hour = `${new Date(sale.createdAt).getHours()}시`;
    byHour[hour] = (byHour[hour] || 0) + sale.total;
    sale.items.forEach(item => {
      if (item.service) return;
      byMenu[item.name] = byMenu[item.name] || { qty: 0, total: 0 };
      byMenu[item.name].qty += item.qty;
      byMenu[item.name].total += item.qty * item.price;
    });
  });
  const menuEntries = Object.entries(byMenu).sort((a, b) => b[1].total - a[1].total);
  const lowEntries = [...menuEntries].sort((a, b) => a[1].qty - b[1].qty).slice(0, 5);
  const zeroMenus = menus.filter(menu => !byMenu[menu.name]);
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <>
      <div className="sectionHead">
        <h2>판매통계</h2>
        <div className="dateRange">
          <label>시작 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label>종료 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
        </div>
      </div>
      <div className="summaryBox">선택기간 매출: <b>{money(totalSales)}</b></div>
      <div className="statsGrid">
        <Box title="결제방식별" data={byPay} />
        <Box title="식당/포장별" data={byService} />
        <Box title="시간대별" data={byHour} />
        <div className="statBox">
          <h3>메뉴별 판매</h3>
          {menuEntries.map(([name, value]) => <p key={name}>{name}: {value.qty}개 / {money(value.total)}</p>)}
        </div>
        <div className="statBox">
          <h3>인기 메뉴 TOP</h3>
          {menuEntries.slice(0, 5).map(([name, value], index) => <p key={name}>{index + 1}. {name}: {value.qty}개</p>)}
          <h3>판매 적은 메뉴</h3>
          {lowEntries.map(([name, value]) => <p key={name}>{name}: {value.qty}개</p>)}
        </div>
        <div className="statBox">
          <h3>소외 메뉴</h3>
          {zeroMenus.length ? zeroMenus.map(menu => <p key={menu.id}>{menu.name}</p>) : <p>선택기간 내 모든 메뉴 판매 기록 있음</p>}
        </div>
      </div>
    </>
  );
}

function Box({ title, data }) {
  return (
    <div className="statBox">
      <h3>{title}</h3>
      {Object.keys(data).length ? Object.entries(data).map(([key, value]) => <p key={key}>{key}: {money(value)}</p>) : <p className="muted">기록 없음</p>}
    </div>
  );
}

const emojiOptions = [
  { value: "🍲", label: "🍲 탕류" },
  { value: "🥘", label: "🥘 찌개류" },
  { value: "🍚", label: "🍚 식사류" },
  { value: "🍜", label: "🍜 면류" },
  { value: "🥩", label: "🥩 고기류" },
  { value: "🐟", label: "🐟 생선류" },
  { value: "🦑", label: "🦑 해산물" },
  { value: "🥗", label: "🥗 반찬/사이드" },
  { value: "🍶", label: "🍶 소주" },
  { value: "🍺", label: "🍺 맥주" },
  { value: "🥤", label: "🥤 음료" },
  { value: "☕", label: "☕ 커피" },
  { value: "🍽️", label: "🍽️ 기타" }
];

function AdminModal(props) {
  const [pass, setPass] = useState("");
  const addMenu = () => {
    if (!props.newMenu.name || !props.newMenu.price) return alert("메뉴명과 가격을 입력해주세요");
    props.setMenus(prev => [
      ...prev,
      { ...props.newMenu, id: Date.now().toString(), price: Number(props.newMenu.price), soldOut: false }
    ]);
    props.setNewMenu({ name: "", price: "", category: props.categories[0]?.name || "식사류", emoji: "🍲", image: "" });
  };

  const onImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = await resizeImage(file);
    props.setNewMenu(prev => ({ ...prev, image }));
  };

  const addCategory = () => {
    const name = window.prompt("새 메뉴구분 이름을 입력해주세요", "새구분");
    if (!name) return;
    props.setCategories(prev => [...prev, { name, order: prev.length + 1 }]);
  };

  const deleteCategory = category => {
    if (props.menus.some(menu => menu.category === category.name)) {
      alert("이 구분에 포함된 메뉴가 있습니다. 먼저 메뉴의 구분을 바꾸거나 메뉴를 삭제해주세요.");
      return;
    }
    props.setCategories(prev => prev.filter(item => item.name !== category.name));
  };

  const moveMenu = (id, direction) => {
    props.setMenus(prev => {
      const index = prev.findIndex(item => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  };

  const changeTableCount = value => {
    const next = Number(value) || 1;
    props.setTableCount(next);
    if (Number(props.tableRows) > next) props.updateRows(next);
  };

  return (
    <div className="modal">
      <div className="modalBox admin">
        <button className="xBtn" onClick={() => props.setShowAdmin(false)}>×</button>
        <h2>관리자모드</h2>

        <div className="adminCard">
          <h3>상호 / 메뉴추가</h3>
          <label>상호명</label>
          <input value={props.restaurantName} onChange={e => props.setRestaurantName(e.target.value)} placeholder="상호명" />
          <p className="muted">사진은 자동으로 가운데 기준 정사각형 300x300px로 잘려 저장됩니다.</p>
          <div className="grid2">
            <input placeholder="메뉴명" value={props.newMenu.name} onChange={e => props.setNewMenu(prev => ({ ...prev, name: e.target.value }))} />
            <input type="number" placeholder="가격" value={props.newMenu.price} onChange={e => props.setNewMenu(prev => ({ ...prev, price: e.target.value }))} />
            <select value={props.newMenu.category} onChange={e => props.setNewMenu(prev => ({ ...prev, category: e.target.value }))}>
              {props.categories.map(category => <option key={category.name}>{category.name}</option>)}
            </select>
            <select value={props.newMenu.emoji} onChange={e => props.setNewMenu(prev => ({ ...prev, emoji: e.target.value }))}>
              {emojiOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input type="file" accept="image/*" onChange={onImage} />
            <button onClick={addMenu}>메뉴추가</button>
          </div>
        </div>

        <div className="adminCard">
          <h3>현재 메뉴</h3>
          <div className="adminMenu adminMenuHead"><b>품절</b><b>메뉴</b><b>가격</b><b>구분</b><b>순서</b><b>삭제</b></div>
          {props.menus.map(menu => (
            <div className="adminMenu" key={menu.id}>
              <input type="checkbox" checked={menu.soldOut || false} onChange={e => props.setMenus(prev => prev.map(item => item.id === menu.id ? { ...item, soldOut: e.target.checked } : item))} />
              <div className="adminMenuName">
                {menu.image ? <img src={menu.image} alt="" /> : <span>{menu.emoji}</span>}
                <input value={menu.name} onChange={e => props.setMenus(prev => prev.map(item => item.id === menu.id ? { ...item, name: e.target.value } : item))} />
              </div>
              <input type="number" value={menu.price} onChange={e => props.setMenus(prev => prev.map(item => item.id === menu.id ? { ...item, price: Number(e.target.value) } : item))} />
              <select value={menu.category} onChange={e => props.setMenus(prev => prev.map(item => item.id === menu.id ? { ...item, category: e.target.value } : item))}>
                {props.categories.map(category => <option key={category.name}>{category.name}</option>)}
              </select>
              <div className="moveBtns"><button onClick={() => moveMenu(menu.id, -1)}>▲</button><button onClick={() => moveMenu(menu.id, 1)}>▼</button></div>
              <button onClick={() => props.setMenus(prev => prev.filter(item => item.id !== menu.id))}>삭제</button>
            </div>
          ))}
        </div>

        <div className="adminCard">
          <h3>메뉴구분 순서</h3>
          {props.categories.map((category, index) => (
            <div className="categoryRow" key={`${category.name}-${index}`}>
              <input value={category.name} onChange={e => props.setCategories(prev => prev.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
              <input type="number" value={category.order} onChange={e => props.setCategories(prev => prev.map((item, i) => i === index ? { ...item, order: Number(e.target.value) } : item))} />
              <button onClick={() => deleteCategory(category)}>구분삭제</button>
            </div>
          ))}
          <button onClick={addCategory}>구분추가</button>
        </div>

        <div className="adminCard">
          <h3>식당이용 / 포장 자동추가</h3>
          <div className="grid2">
            <input placeholder="식당이용 내용" value={props.diningSetting.label} onChange={e => props.setDiningSetting(prev => ({ ...prev, label: e.target.value }))} />
            <input type="number" placeholder="식당이용 금액" value={props.diningSetting.price} onChange={e => props.setDiningSetting(prev => ({ ...prev, price: Number(e.target.value) }))} />
            <input placeholder="포장 내용" value={props.takeoutSetting.label} onChange={e => props.setTakeoutSetting(prev => ({ ...prev, label: e.target.value }))} />
            <input type="number" placeholder="포장 금액" value={props.takeoutSetting.price} onChange={e => props.setTakeoutSetting(prev => ({ ...prev, price: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="adminCard">
          <h3>시스템 설정</h3>
          <div className="settingsGrid">
            <label>전체 테이블 수<input type="number" value={props.tableCount} onChange={e => changeTableCount(e.target.value)} /></label>
            <label>테이블 표시 줄 수<input type="number" value={props.tableRows} onChange={e => props.updateRows(e.target.value)} /></label>
            <label>인기메뉴 표시 개수<input type="number" value={props.popularCount} onChange={e => props.setPopularCount(Number(e.target.value) || 1)} /></label>
            <label className="checkLabel"><input type="checkbox" checked={props.showPopular} onChange={e => props.setShowPopular(e.target.checked)} /> 인기메뉴 표시하기</label>
            <label className="checkLabel"><input type="checkbox" checked={props.pinTables} onChange={e => props.setPinTables(e.target.checked)} /> 테이블번호 영역 고정</label>
            <label className="checkLabel"><input type="checkbox" checked={props.pinOrder} onChange={e => props.setPinOrder(e.target.checked)} /> 주문내역 영역 고정</label>
            <label className="checkLabel"><input type="checkbox" checked={props.scrollTopAfterPay} onChange={e => props.setScrollTopAfterPay(e.target.checked)} /> 결제완료 후 화면 맨 위로 이동</label>
          </div>
          <div className="passwordRow">
            <label>새 비밀번호</label>
            <input type="password" placeholder="새 비밀번호" value={pass} onChange={e => setPass(e.target.value)} />
            <button onClick={() => { if (pass) { props.setAdminPw(pass); setPass(""); alert("비밀번호가 변경되었습니다"); } }}>비밀번호 변경</button>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
