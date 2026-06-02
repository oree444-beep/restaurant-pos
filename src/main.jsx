import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const VERSION = "V39";
const buildAppTitle = restaurantName => `${String(restaurantName || "식당").trim() || "식당"} POS ${VERSION}`;
const DESIGN_WIDTH = 1200;
const DESIGN_HEIGHT = 800;

const firebaseConfig = {
  apiKey: "AIzaSyAC3W2CNOW7-GzgSHeecILfMHv3KsIis7Y",
  authDomain: "hr-restaurant-pos.firebaseapp.com",
  projectId: "hr-restaurant-pos",
  storageBucket: "hr-restaurant-pos.firebasestorage.app",
  messagingSenderId: "783348005326",
  appId: "1:783348005326:web:7181e6dd9ec4514f7a139f",
  measurementId: "G-HW3ESNTVR4"
};

const POS_DATA_SCHEMA_VERSION = 2;
const LEGACY_RESTAURANT_ID = "mom-restaurant";
const resolveRestaurantId = () => {
  if (typeof window === "undefined") return LEGACY_RESTAURANT_ID;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("restaurantId") || params.get("restaurant") || params.get("rid");
    const saved = localStorage.getItem("restaurantId");
    const resolved = String(fromUrl || saved || LEGACY_RESTAURANT_ID).trim() || LEGACY_RESTAURANT_ID;
    localStorage.setItem("restaurantId", resolved);
    return resolved;
  } catch {
    return LEGACY_RESTAURANT_ID;
  }
};
const RESTAURANT_ID = resolveRestaurantId();
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const firestoreUrl = path => `${FIRESTORE_BASE}/${path}?key=${firebaseConfig.apiKey}`;

const D_M = [
  { id: "m1", name: "생태탕", price: 12000, category: "식사류", emoji: "🍲", image: "", soldOut: false, kitchenSend: true },
  { id: "m2", name: "애호박찌개", price: 10000, category: "식사류", emoji: "🥘", image: "", soldOut: false, kitchenSend: true },
  { id: "m3", name: "소주", price: 5000, category: "주류", emoji: "🍶", image: "", soldOut: false, kitchenSend: false },
  { id: "m4", name: "맥주", price: 5000, category: "주류", emoji: "🍺", image: "", soldOut: false, kitchenSend: false },
  { id: "m5", name: "콜라", price: 2000, category: "음료", emoji: "🥤", image: "", soldOut: false, kitchenSend: false }
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
  tableServiceMeta: "tableServiceMeta",
  pinTables: "pinTables",
  pinOrder: "pinOrder",
  scrollTopAfterPay: "scrollTopAfterPay",
  subscription: "subscription",
  showReceiptPrint: "showReceiptPrint",
  kitchenSettings: "kitchenSettings",
  screenMode: "screenMode",
  displayMode: "displayMode",
  contactSettings: "contactSettings",
  tableLayout: "tableLayout",
  tableAutoReturnSeconds: "tableAutoReturnSeconds",
  messagePoints: "messagePoints",
  menuIngredients: "menuIngredients"
};

const scopedLSKey = key => `${RESTAURANT_ID}:${key}`;
const getLS = (key, fallback) => {
  try {
    const scopedValue = localStorage.getItem(scopedLSKey(key));
    if (scopedValue) return JSON.parse(scopedValue);
    const legacyValue = localStorage.getItem(key);
    if (legacyValue) {
      localStorage.setItem(scopedLSKey(key), legacyValue);
      return JSON.parse(legacyValue);
    }
    return fallback;
  } catch {
    return fallback;
  }
};

const setLS = (key, value) => localStorage.setItem(scopedLSKey(key), JSON.stringify(value));
const setRestaurantId = value => {
  try { localStorage.setItem("restaurantId", String(value || LEGACY_RESTAURANT_ID)); } catch {}
};
const cleanData = value => JSON.parse(JSON.stringify(value ?? null));
const firebaseId = value => String(value ?? Date.now()).replace(/[^a-zA-Z0-9_-]/g, "_");
const toFirestoreValue = value => {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, toFirestoreValue(v)])) } };
  }
  return { stringValue: String(value) };
};
const fromFirestoreValue = value => {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  if ("timestampValue" in value) return value.timestampValue;
  return null;
};
const fromFirestoreFields = fields => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, fromFirestoreValue(v)]));
const firestoreSetDoc = async (path, data) => {
  const body = { fields: Object.fromEntries(Object.entries(cleanData(data) || {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, toFirestoreValue(v)])) };
  const response = await fetch(firestoreUrl(path), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
};
const firestoreGetDoc = async path => {
  const response = await fetch(firestoreUrl(path));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return fromFirestoreFields(data.fields || {});
};
const firestoreGetCollection = async path => {
  const response = await fetch(firestoreUrl(path));
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return (data.documents || []).map(item => fromFirestoreFields(item.fields || {}));
};

const firestoreDeleteDoc = async path => {
  const response = await fetch(firestoreUrl(path), { method: "DELETE" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await response.text());
  return null;
};
const firestoreDeleteMany = async (collectionName, ids) => {
  for (const id of ids || []) {
    await firestoreDeleteDoc(`restaurants/${RESTAURANT_ID}/${collectionName}/${firebaseId(id)}`);
  }
};
const withDataMeta = data => ({
  ...cleanData(data),
  initialized: true,
  restaurantId: RESTAURANT_ID,
  schemaVersion: POS_DATA_SCHEMA_VERSION,
  posVersion: VERSION,
  updatedAt: new Date().toISOString()
});
const migrateSettingsData = data => {
  if (!data) return null;
  const migrated = { ...data };
  migrated.restaurantId = migrated.restaurantId || RESTAURANT_ID;
  migrated.schemaVersion = Number(migrated.schemaVersion || 1);
  migrated.posVersion = migrated.posVersion || "legacy";
  migrated.migratedToSchemaVersion = POS_DATA_SCHEMA_VERSION;
  migrated.lastMigrationAt = migrated.schemaVersion < POS_DATA_SCHEMA_VERSION ? new Date().toISOString() : migrated.lastMigrationAt;
  return migrated;
};
const saveSettingsToFirebase = async data => firestoreSetDoc(`restaurants/${RESTAURANT_ID}/config/settings`, withDataMeta(data));
const saveSaleToFirebase = async sale => firestoreSetDoc(`restaurants/${RESTAURANT_ID}/sales/${firebaseId(sale.id)}`, { ...cleanData(sale), restaurantId: RESTAURANT_ID, schemaVersion: POS_DATA_SCHEMA_VERSION, posVersion: VERSION, updatedAt: new Date().toISOString() });
const saveCreditToFirebase = async credit => firestoreSetDoc(`restaurants/${RESTAURANT_ID}/credits/${firebaseId(credit.id)}`, { ...cleanData(credit), restaurantId: RESTAURANT_ID, schemaVersion: POS_DATA_SCHEMA_VERSION, posVersion: VERSION, updatedAt: new Date().toISOString() });
const saveKitchenOrderToFirebase = async order => firestoreSetDoc(`restaurants/${RESTAURANT_ID}/kitchenOrders/${firebaseId(order.id)}`, { ...cleanData(order), restaurantId: RESTAURANT_ID, schemaVersion: POS_DATA_SCHEMA_VERSION, posVersion: VERSION, updatedAt: new Date().toISOString() });
const saveMessagePointRequestToFirebase = async request => firestoreSetDoc(`restaurants/${RESTAURANT_ID}/messagePointRequests/${firebaseId(request.id)}`, { ...cleanData(request), restaurantId: RESTAURANT_ID, schemaVersion: POS_DATA_SCHEMA_VERSION, posVersion: VERSION, updatedAt: new Date().toISOString() });
const batchUploadCollection = async (collectionName, items) => {
  for (const item of (items || []).filter(Boolean)) {
    const path = `restaurants/${RESTAURANT_ID}/${collectionName}/${firebaseId(item.id)}`;
    await firestoreSetDoc(path, { ...cleanData(item), restaurantId: RESTAURANT_ID, schemaVersion: POS_DATA_SCHEMA_VERSION, posVersion: VERSION, updatedAt: new Date().toISOString() });
  }
};
const money = value => `${(Number(value) || 0).toLocaleString()}원`;
const todayValue = () => new Date().toISOString().slice(0, 10);
const addDaysValue = (dateValue, days) => {
  const base = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
};

const addMonthsValue = (dateValue, months) => {
  const base = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  base.setMonth(base.getMonth() + Number(months || 0));
  return base.toISOString().slice(0, 10);
};
const addYearsValue = (dateValue, years) => {
  const base = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  base.setFullYear(base.getFullYear() + Number(years || 0));
  return base.toISOString().slice(0, 10);
};
const yesterdayValue = () => addDaysValue(todayValue(), -1);
const defaultStatsRange = () => ({ startDate: addMonthsValue(yesterdayValue(), -1), endDate: yesterdayValue() });
const defaultWeekdayStatsRange = () => ({ startDate: addMonthsValue(yesterdayValue(), -2), endDate: yesterdayValue() });

const statsPricingPolicy = {
  freeDays: 60,
  trialDays: 120,
  normalStartDay: 121,
  prices: {
    basic: 0,
    summary: 20,
    ingredients: 50,
    excel: 30,
    weekdayBasic: 0,
    weekdaySummary: 20,
    weekdayIngredients: 50
  }
};
const statsPointCost = (reportType, weekdayMode = false) => {
  if (reportType === "basic") return weekdayMode ? statsPricingPolicy.prices.weekdayBasic : statsPricingPolicy.prices.basic;
  if (reportType === "summary") return weekdayMode ? statsPricingPolicy.prices.weekdaySummary : statsPricingPolicy.prices.summary;
  return weekdayMode ? statsPricingPolicy.prices.weekdayIngredients : statsPricingPolicy.prices.ingredients;
};
const statsPeriodInfo = subscription => {
  const start = safeDateObj(subscription?.startDate) || new Date();
  const today = safeDateObj(todayValue()) || new Date();
  const dayNo = Math.max(1, Math.floor((today - start) / 86400000) + 1);
  if (dayNo <= statsPricingPolicy.freeDays) {
    return { type: "free", title: "무료기간 적용 중", badge: "무료기간", dayNo, multiplier: 0, description: "현재 통계 기능은 무료로 이용할 수 있습니다. 가입 후 2개월(60일)까지 무료로 제공됩니다." };
  }
  if (dayNo <= statsPricingPolicy.trialDays) {
    return { type: "trial", title: "체험가 적용 중", badge: "체험가", dayNo, multiplier: 1, description: "3~4개월차 초기 체험가가 적용됩니다." };
  }
  return { type: "normal", title: "정상가 적용 중", badge: "정상가", dayNo, multiplier: 1, description: "5개월차부터 정상가가 적용됩니다. 정상가 포인트는 추후 종합관리프로그램에서 조정할 수 있습니다." };
};
const effectiveStatsPointCost = (reportType, weekdayMode = false, subscription) => {
  const period = statsPeriodInfo(subscription);
  if (period.type === "free") return 0;
  return statsPointCost(reportType, weekdayMode);
};
const statsPointText = (cost, period) => cost === 0 ? "무료" : `${period.badge} ${cost}P`;

const defaultSubscription = () => ({
  startDate: todayValue(),
  expireDate: addDaysValue(todayValue(), 30),
  graceDays: 7,
  monthlyFee: 5000,
  bankName: "농협",
  accountNumber: "123-456-7890",
  referralActiveCount: 0,
  referredRestaurants: [],
  referralDiscountRate: 10,
  referralGraceDays: 90,
  newEventDiscountName: "신규 이벤트 할인",
  newEventDiscountDays: 60,
  newEventDiscountRate: 50,
  baseMonthlyFee: 10000,
  optionMonthlyFee: 0,
  kitchenOptionEnabled: false,
  kitchenOptionFee: 5000,
  status: "active"
});
const defaultKitchenSettings = () => ({
  enabled: false,
  buttonLabel: "주문",
  excludedCategories: ["주류", "음료", "기타", "포장용기"]
});
const defaultContactSettings = () => ({
  kakaoChannelUrl: "",
  adminPhone: "",
  bankMessage: "입금계좌는 관리자모드 > 이용정보/납부정보에서 확인할 수 있습니다.",
  cardMessage: "카드결제 링크가 필요하시면 관리자에게 문의를 남겨주세요.",
  kitchenMessage: "주문서관리/주방 주문현황판은 유료 추가옵션입니다. 사용을 원하시면 문의를 남겨주세요.",
  referralMessage: "소개한 식당이 이용 중일 때 현재 월 이용료에서 10%씩 반복 할인됩니다."
});
const defaultMessagePoints = () => ({
  balance: 0,
  recentHistory: [],
  pendingRequests: []
});
const normalizeIngredientRows = rows => (Array.isArray(rows) ? rows : []).map(row => ({ name: row?.name || "", amount: row?.amount || "", unit: row?.unit || "" })).filter(row => row.name || row.amount || row.unit);
const messagePointPlans = [
  { amount: 10000, points: 10000 },
  { amount: 20000, points: 21000 },
  { amount: 30000, points: 32000 },
  { amount: 50000, points: 54000 }
];
const defaultKitchenSendForCategory = category => !["주류", "음료", "기타", "포장용기"].includes(String(category || "").trim());

const floorMarkers = [
  { id: "entrance", label: "식당입구", icon: "🚪" },
  { id: "door", label: "식당문", icon: "↔️" },
  { id: "kitchen", label: "주방", icon: "👨‍🍳" },
  { id: "restroom", label: "화장실", icon: "🚻" },
  { id: "counter", label: "카운터", icon: "💳" },
  { id: "window", label: "창가", icon: "🪟" }
];
const makeDefaultTableLayout = count => {
  const total = Number(count) || 12;
  const tablePositions = {};
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  for (let i = 1; i <= total; i += 1) {
    const col = (i - 1) % cols;
    const row = Math.floor((i - 1) / cols);
    tablePositions[i] = {
      x: Math.round(12 + (col * (76 / Math.max(1, cols - 1 || 1)))),
      y: Math.round(18 + (row * (62 / Math.max(1, rows - 1 || 1))))
    };
  }
  return {
    editUnlocked: false,
    tableSize: 100,
    selectedMarkerId: "entrance",
    tablePositions,
    markers: {
      entrance: { visible: true, edge: "bottom", pos: 18, x: 18, y: 94 },
      kitchen: { visible: true, edge: "top", pos: 78, x: 78, y: 6 },
      door: { visible: false, edge: "left", pos: 18, x: 5, y: 18 },
      restroom: { visible: false, edge: "right", pos: 82, x: 95, y: 82 },
      counter: { visible: false, edge: "bottom", pos: 70, x: 70, y: 94 },
      window: { visible: false, edge: "top", pos: 44, x: 44, y: 6 }
    }
  };
};
const clampPercent = value => Math.max(3, Math.min(92, Number(value) || 0));
const round100 = value => Math.round((Number(value) || 0) / 100) * 100;
const normalizeTableLayout = (layout, count) => {
  const base = makeDefaultTableLayout(count);
  const mergedMarkers = { ...base.markers, ...(layout?.markers || {}) };
  Object.keys(mergedMarkers).forEach(id => {
    const m = mergedMarkers[id] || {};
    if (!m.edge) {
      const x = Number(m.x ?? base.markers[id]?.x ?? 50);
      const y = Number(m.y ?? base.markers[id]?.y ?? 50);
      const distances = { top: y, bottom: 100 - y, left: x, right: 100 - x };
      const edge = Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
      mergedMarkers[id] = { ...m, edge, pos: edge === "top" || edge === "bottom" ? clampPercent(x) : clampPercent(y) };
    }
  });
  return {
    ...base,
    ...(layout || {}),
    tableSize: Number(layout?.tableSize || 100),
    selectedMarkerId: layout?.selectedMarkerId || "entrance",
    tablePositions: { ...base.tablePositions, ...(layout?.tablePositions || {}) },
    markers: mergedMarkers
  };
};
const markerStyleFromInfo = info => {
  const edge = info?.edge || "top";
  const pos = clampPercent(info?.pos ?? (edge === "top" || edge === "bottom" ? info?.x : info?.y) ?? 50);
  if (edge === "top") return { left: `${pos}%`, top: "4%" };
  if (edge === "bottom") return { left: `${pos}%`, top: "96%" };
  if (edge === "left") return { left: "4%", top: `${pos}%` };
  return { left: "96%", top: `${pos}%` };
};
const markerOrientClass = info => ["left", "right"].includes(info?.edge) ? "vertical" : "horizontal";

const formatKoreanDate = value => {
  const date = safeDateObj(value);
  if (!date) return "미설정";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};
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


const pad2 = value => String(value).padStart(2, "0");
const safeDateObj = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const dateText = value => {
  const date = safeDateObj(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};
const timeText = value => {
  const date = safeDateObj(value);
  if (!date) return "";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};
const saleTimeValue = sale => sale.createdAt || sale.timestamp || sale.date || "";
const saleService = sale => sale.serviceType || sale.eatType || "식당식사";
const saleTotal = sale => Number(sale.total) || (sale.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
const filterSalesByRange = (sales, startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59`).getTime();
  return sales.filter(sale => {
    const date = safeDateObj(saleTimeValue(sale));
    if (!date) return false;
    const time = date.getTime();
    return time >= start && time <= end;
  });
};
const xmlEscape = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const colName = index => {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
};
const worksheetXml = rows => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((cell, c) => {
  const value = cell ?? "";
  const ref = `${colName(c)}${r + 1}`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}).join("")}</row>`).join("")}</sheetData></worksheet>`;
const crcTable = (() => {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const textBytes = text => new TextEncoder().encode(text);
const u16 = value => [value & 255, (value >>> 8) & 255];
const u32 = value => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
const makeZipBlob = files => {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  files.forEach(file => {
    const name = textBytes(file.name);
    const data = textBytes(file.content);
    const crc = crc32(data);
    const localHeader = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)
    ]);
    localParts.push(localHeader, name, data);
    const centralHeader = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)
    ]);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  });
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  return new Blob([...localParts, ...centralParts, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};
const downloadXlsx = (fileName, sheets) => {
  const safeSheets = sheets.map((sheet, index) => ({ name: String(sheet.name || `Sheet${index + 1}`).slice(0, 31), rows: sheet.rows || [] }));
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${safeSheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${safeSheets.map((sheet, i) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${safeSheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>` },
    ...safeSheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: worksheetXml(sheet.rows) }))
  ];
  const link = document.createElement("a");
  link.href = URL.createObjectURL(makeZipBlob(files));
  link.download = fileName;
  link.click();
};
const buildSalesWorkbook = ({ restaurantName, sales, menus, credits = [], startDate, endDate }) => {
  const filteredSales = filterSalesByRange(sales, startDate, endDate);
  const byPay = {}, byService = {}, byHour = {}, byMenu = {};
  filteredSales.forEach(sale => {
    const total = saleTotal(sale);
    byPay[sale.payment || "미지정"] = (byPay[sale.payment || "미지정"] || 0) + total;
    byService[saleService(sale)] = (byService[saleService(sale)] || 0) + total;
    const d = safeDateObj(saleTimeValue(sale));
    const hour = d ? `${d.getHours()}시` : "시간없음";
    byHour[hour] = (byHour[hour] || 0) + total;
    (sale.items || []).forEach(item => {
      if (item.service) return;
      const key = item.id || item.name;
      if (!byMenu[key]) byMenu[key] = { category: item.category || "미지정", name: item.name || "", qty: 0, total: 0 };
      byMenu[key].qty += Number(item.qty || 0);
      byMenu[key].total += Number(item.price || 0) * Number(item.qty || 0);
    });
  });
  menus.forEach(menu => {
    const key = menu.id || menu.name;
    if (!byMenu[key]) byMenu[key] = { category: menu.category || "미지정", name: menu.name || "", qty: 0, total: 0 };
  });
  const totalSales = filteredSales.reduce((sum, sale) => sum + saleTotal(sale), 0);
  const menuRows = Object.values(byMenu).sort((a, b) => String(a.category).localeCompare(String(b.category), "ko") || String(a.name).localeCompare(String(b.name), "ko"));
  const summary = [
    [`${restaurantName || "식당"} 판매통계 요약`],
    ["조회기간", startDate, "~", endDate],
    ["총매출", totalSales],
    ["총 주문건수", filteredSales.length],
    [],
    ["결제방식별 매출"],
    ["결제방식", "매출"],
    ...Object.entries(byPay),
    [],
    ["식당/포장별 매출"],
    ["식사구분", "매출"],
    ...Object.entries(byService),
    [],
    ["시간대별 매출"],
    ["시간", "매출"],
    ...Object.entries(byHour).sort((a, b) => parseInt(a[0]) - parseInt(b[0])),
    [], [], [],
    ["메뉴별 판매 요약"],
    ["구분", "메뉴명", "판매수량", "총판매액"],
    ...menuRows.map(row => [row.category, row.name, row.qty, row.total])
  ];
  const details = [["날짜", "시간", "테이블", "결제", "식사구분", "메뉴", "수량", "금액", "주문총액", "외상단체명"]];
  filteredSales.forEach(sale => {
    (sale.items || []).forEach(item => {
      details.push([
        dateText(saleTimeValue(sale)),
        timeText(saleTimeValue(sale)),
        sale.table || "",
        sale.payment || "",
        saleService(sale),
        item.name || "",
        Number(item.qty || 0),
        Number(item.price || 0) * Number(item.qty || 0),
        saleTotal(sale),
        sale.payment === "외상" ? (sale.creditGroup || sale.credit || credits.find(credit => String(credit.id) === String(sale.id))?.group || "") : ""
      ]);
    });
  });
  return [
    { name: "판매통계 요약", rows: summary },
    { name: "판매 상세내역", rows: details }
  ];
};
const buildCreditWorkbook = ({ restaurantName, credits }) => {
  const groupMap = new Map();
  credits.forEach(item => {
    const group = item.group || "미지정";
    if (!groupMap.has(group)) groupMap.set(group, { total: 0, paid: 0, remain: 0, unpaidCount: 0, paidCount: 0 });
    const row = groupMap.get(group);
    const total = Number(item.total || 0);
    const remain = item.paid ? 0 : Number(item.remain || 0);
    row.total += total;
    row.remain += remain;
    row.paid += Math.max(0, total - remain);
    if (item.paid) row.paidCount += 1; else row.unpaidCount += 1;
  });
  const summary = [
    [`${restaurantName || "식당"} 외상장부 요약`],
    ["다운로드일", dateText(new Date()), timeText(new Date())],
    [],
    ["단체명", "주문총액", "결제완료금액", "현 미납액", "미결제건수", "완납건수"],
    ...Array.from(groupMap.entries()).sort((a, b) => a[0].localeCompare(b[0], "ko")).map(([group, value]) => [group, value.total, value.paid, value.remain, value.unpaidCount, value.paidCount])
  ];
  const details = [["단체명", "날짜", "시간", "테이블", "메뉴내역", "주문총액", "결제완료금액", "현 미납액", "상태", "연락처", "메모"]];
  credits.forEach(item => {
    const total = Number(item.total || 0);
    const remain = item.paid ? 0 : Number(item.remain || 0);
    details.push([
      item.group || "미지정",
      dateText(item.createdAt),
      timeText(item.createdAt),
      item.table || "",
      (item.items || []).map(menu => `${menu.name} ${menu.qty}개`).join(", "),
      total,
      Math.max(0, total - remain),
      remain,
      item.paid ? "완납" : "미결제",
      item.phone || "",
      item.memo || ""
    ]);
  });
  return [
    { name: "단체별 외상 요약", rows: summary },
    { name: "외상 상세내역", rows: details }
  ];
};

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
  const [tableServiceMeta, setTableServiceMeta] = useState(() => getLS(LS.tableServiceMeta, {}));
  const [selectedCreditIds, setSelectedCreditIds] = useState([]);
  const [hiddenCreditGroups, setHiddenCreditGroups] = useState({});
  const [msgModal, setMsgModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(false);
  const [pinTables, setPinTables] = useState(() => getLS(LS.pinTables, true));
  const [pinOrder, setPinOrder] = useState(() => getLS(LS.pinOrder, true));
  const [scrollTopAfterPay, setScrollTopAfterPay] = useState(() => getLS(LS.scrollTopAfterPay, true));
  const [showReceiptPrint, setShowReceiptPrint] = useState(() => getLS(LS.showReceiptPrint, true));
  const [kitchenSettings, setKitchenSettings] = useState(() => getLS(LS.kitchenSettings, defaultKitchenSettings()));
  const [screenMode, setScreenMode] = useState(() => getLS(LS.screenMode, "basic"));
  const [displayMode, setDisplayMode] = useState(() => getLS(LS.displayMode, "auto"));
  const [contactSettings, setContactSettings] = useState(() => getLS(LS.contactSettings, defaultContactSettings()));
  const [messagePoints, setMessagePoints] = useState(() => getLS(LS.messagePoints, defaultMessagePoints()));
  const [menuIngredients, setMenuIngredients] = useState(() => getLS(LS.menuIngredients, {}));
  const [messagePointModal, setMessagePointModal] = useState(false);
  const [messagePointSending, setMessagePointSending] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [tableModeOrdering, setTableModeOrdering] = useState(false);
  const [tableAutoReturnSeconds, setTableAutoReturnSeconds] = useState(() => getLS(LS.tableAutoReturnSeconds, 10));
  const [tableActivityTick, setTableActivityTick] = useState(0);
  const [tableLayout, setTableLayout] = useState(() => normalizeTableLayout(getLS(LS.tableLayout, makeDefaultTableLayout(getLS(LS.tableCount, 12))), getLS(LS.tableCount, 12)));
  const [subscription, setSubscription] = useState(() => getLS(LS.subscription, defaultSubscription()));
  const [shortcutModal, setShortcutModal] = useState(false);
  const [referralModal, setReferralModal] = useState(false);
  const [billingModal, setBillingModal] = useState(false);
  const [kitchenPairModal, setKitchenPairModal] = useState(false);
  const [tableEditOpen, setTableEditOpen] = useState(false);
  const [tableHomeHeaderOpen, setTableHomeHeaderOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [screenWidth, setScreenWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1400));
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Firebase 연결 준비중");
  const [receiptPrintSale, setReceiptPrintSale] = useState(null);

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    const onInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);



  useEffect(() => {
    let cancelled = false;
    const loadFirebaseData = async () => {
      try {
        setSyncStatus("Firebase 데이터 불러오는 중");
        const rawData = await firestoreGetDoc(`restaurants/${RESTAURANT_ID}/config/settings`);
        const data = migrateSettingsData(rawData);
        if (data?.initialized) {
          if (cancelled) return;
          setRestaurantName(data.restaurantName ?? restaurantName);
          setMenus(data.menus ?? menus);
          setCategories(data.categories ?? categories);
          setTableCount(data.tableCount ?? tableCount);
          setTableRows(data.tableRows ?? tableRows);
          setOrders(data.orders ?? orders);
          setPopularCount(data.popularCount ?? popularCount);
          setShowPopular(data.showPopular ?? showPopular);
          setAdminPw(data.adminPw ?? adminPw);
          setDiningSetting(data.diningSetting ?? diningSetting);
          setTakeoutSetting(data.takeoutSetting ?? takeoutSetting);
          setTableServiceMeta(data.tableServiceMeta ?? tableServiceMeta);
          setPinTables(data.pinTables ?? pinTables);
          setPinOrder(data.pinOrder ?? pinOrder);
          setScrollTopAfterPay(data.scrollTopAfterPay ?? scrollTopAfterPay);
          setShowReceiptPrint(data.showReceiptPrint ?? showReceiptPrint);
          setKitchenSettings(data.kitchenSettings ?? kitchenSettings);
          setScreenMode(data.screenMode ?? screenMode);
          setDisplayMode(data.displayMode ?? displayMode);
          setContactSettings(data.contactSettings ?? contactSettings);
          setMessagePoints(data.messagePoints ?? messagePoints);
          setMenuIngredients(data.menuIngredients ?? menuIngredients);
          setTableAutoReturnSeconds(data.tableAutoReturnSeconds ?? tableAutoReturnSeconds);
          setTableLayout(normalizeTableLayout(data.tableLayout ?? tableLayout, data.tableCount ?? tableCount));
          setSubscription(data.subscription ?? subscription);
          if ((data.schemaVersion || 1) < POS_DATA_SCHEMA_VERSION) {
            await saveSettingsToFirebase({
              ...data,
              restaurantName: data.restaurantName ?? restaurantName,
              menus: data.menus ?? menus,
              categories: data.categories ?? categories,
              tableCount: data.tableCount ?? tableCount,
              tableRows: data.tableRows ?? tableRows,
              orders: data.orders ?? orders,
              popularCount: data.popularCount ?? popularCount,
              showPopular: data.showPopular ?? showPopular,
              adminPw: data.adminPw ?? adminPw,
              diningSetting: data.diningSetting ?? diningSetting,
              takeoutSetting: data.takeoutSetting ?? takeoutSetting,
              tableServiceMeta: data.tableServiceMeta ?? tableServiceMeta,
              pinTables: data.pinTables ?? pinTables,
              pinOrder: data.pinOrder ?? pinOrder,
              scrollTopAfterPay: data.scrollTopAfterPay ?? scrollTopAfterPay,
              showReceiptPrint: data.showReceiptPrint ?? showReceiptPrint,
              kitchenSettings: data.kitchenSettings ?? kitchenSettings,
              screenMode: data.screenMode ?? screenMode,
              displayMode: data.displayMode ?? displayMode,
              contactSettings: data.contactSettings ?? contactSettings,
              messagePoints: data.messagePoints ?? messagePoints,
              menuIngredients: data.menuIngredients ?? menuIngredients,
              tableAutoReturnSeconds: data.tableAutoReturnSeconds ?? tableAutoReturnSeconds,
              tableLayout: data.tableLayout ?? tableLayout,
              subscription: data.subscription ?? subscription
            });
          }
        } else {
          await saveSettingsToFirebase({
            restaurantName, menus, categories, tableCount, tableRows, orders,
            popularCount, showPopular, adminPw, diningSetting, takeoutSetting, tableServiceMeta,
            pinTables, pinOrder, scrollTopAfterPay, showReceiptPrint, kitchenSettings, screenMode, displayMode, contactSettings, messagePoints, menuIngredients, tableAutoReturnSeconds, tableLayout, subscription
          });
        }

        const remoteSales = (await firestoreGetCollection(`restaurants/${RESTAURANT_ID}/sales`)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        if (remoteSales.length) {
          if (!cancelled) setSales(remoteSales);
        } else if ((sales || []).length) {
          await batchUploadCollection("sales", sales);
        }

        const remoteCredits = (await firestoreGetCollection(`restaurants/${RESTAURANT_ID}/credits`)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        if (remoteCredits.length) {
          if (!cancelled) setCredits(remoteCredits);
        } else if ((credits || []).length) {
          await batchUploadCollection("credits", credits);
        }

        if (!cancelled) {
          setFirebaseReady(true);
          setSyncStatus(`Firebase 연결됨 · ${RESTAURANT_ID}`);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSyncStatus("Firebase 연결 확인 필요 · 임시로 기기저장 사용중");
        }
      } finally {
        if (!cancelled) setFirebaseLoading(false);
      }
    };
    loadFirebaseData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const title = buildAppTitle(restaurantName);
    document.title = title;

    const manifest = {
      name: title,
      short_name: `${String(restaurantName || "식당").trim() || "식당"} POS`,
      start_url: "/",
      display: "standalone",
      background_color: "#f3f4f6",
      theme_color: "#2563eb",
      description: `${String(restaurantName || "식당").trim() || "식당"} 주문, 외상장부, 판매통계 관리 POS`
    };

    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }

    const previousUrl = manifestLink.dataset.dynamicUrl;
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const manifestUrl = URL.createObjectURL(blob);
    manifestLink.href = manifestUrl;
    manifestLink.dataset.dynamicUrl = manifestUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);

    return () => URL.revokeObjectURL(manifestUrl);
  }, [restaurantName]);

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
  useEffect(() => setLS(LS.tableServiceMeta, tableServiceMeta), [tableServiceMeta]);
  useEffect(() => setLS(LS.pinTables, pinTables), [pinTables]);
  useEffect(() => setLS(LS.pinOrder, pinOrder), [pinOrder]);
  useEffect(() => setLS(LS.scrollTopAfterPay, scrollTopAfterPay), [scrollTopAfterPay]);
  useEffect(() => setLS(LS.showReceiptPrint, showReceiptPrint), [showReceiptPrint]);
  useEffect(() => setLS(LS.kitchenSettings, kitchenSettings), [kitchenSettings]);
  useEffect(() => setLS(LS.screenMode, screenMode), [screenMode]);
  useEffect(() => setLS(LS.displayMode, displayMode), [displayMode]);
  useEffect(() => setLS(LS.contactSettings, contactSettings), [contactSettings]);
  useEffect(() => setLS(LS.messagePoints, messagePoints), [messagePoints]);
  useEffect(() => setLS(LS.menuIngredients, menuIngredients), [menuIngredients]);
  useEffect(() => setLS(LS.tableAutoReturnSeconds, tableAutoReturnSeconds), [tableAutoReturnSeconds]);
  useEffect(() => setLS(LS.tableLayout, tableLayout), [tableLayout]);
  useEffect(() => setLS(LS.subscription, subscription), [subscription]);
  useEffect(() => {
    if (!firebaseReady) return;
    const timer = window.setTimeout(() => {
      saveSettingsToFirebase({
        restaurantName, menus, categories, tableCount, tableRows, orders,
        popularCount, showPopular, adminPw, diningSetting, takeoutSetting, tableServiceMeta,
        pinTables, pinOrder, scrollTopAfterPay, showReceiptPrint, kitchenSettings, screenMode, displayMode, contactSettings, messagePoints, menuIngredients, tableAutoReturnSeconds, tableLayout, subscription
      })
        .then(() => setSyncStatus("Firebase 자동저장 완료"))
        .catch(error => {
          console.error(error);
          setSyncStatus("Firebase 설정 저장 실패 · 기기저장 유지중");
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [firebaseReady, restaurantName, menus, categories, tableCount, tableRows, orders, popularCount, showPopular, adminPw, diningSetting, takeoutSetting, tableServiceMeta, pinTables, pinOrder, scrollTopAfterPay, showReceiptPrint, kitchenSettings, screenMode, displayMode, contactSettings, messagePoints, menuIngredients, tableAutoReturnSeconds, tableLayout, subscription]);

  const currentOrder = orders[selectedTable] || [];
  const activeOrder = currentOrder.filter(item => Number(item.qty || 0) > 0);
  const total = activeOrder.reduce((sum, item) => sum + item.price * item.qty, 0);
  const kitchenOptionActive = subscription?.kitchenOptionEnabled === true;
  const kitchenEnabled = kitchenOptionActive && kitchenSettings?.enabled === true;
  const isKitchenTarget = item => !item?.service && (item.kitchenSend ?? defaultKitchenSendForCategory(item.category));
  const kitchenTargets = currentOrder.filter(isKitchenTarget);
  const kitchenPendingItems = kitchenTargets.filter(item => Number(item.qty || 0) !== Number(item.kitchenSentQty || 0));
  const kitchenStatusText = !kitchenEnabled
    ? "주문서관리 꺼짐"
    : !kitchenTargets.length
      ? "주방전송 대상 메뉴 없음"
      : kitchenPendingItems.length
        ? "주방전송 전"
        : "주방전송 완료";
  const tables = Array.from({ length: Number(tableCount) || 1 }, (_, index) => index + 1);
  const rows = Math.max(1, Math.min(Number(tableRows) || 2, tables.length));
  const cols = Math.ceil(tables.length / rows);
  const tableColumns = screenWidth <= 1200 ? Math.min(3, tables.length) : cols;
  const fixedEnabled = !openCredit && !openStats;
  const subscriptionInfo = useMemo(() => {
    const expire = safeDateObj(subscription?.expireDate);
    const graceDays = Number(subscription?.graceDays ?? 7);
    if (!expire) return { className: "ok", text: "이용기간: 미설정", notice: "" };
    const end = new Date(expire);
    end.setHours(23, 59, 59, 999);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    if (daysLeft >= 0) {
      return {
        className: daysLeft <= 3 ? "warn" : "ok",
        text: `이용기간: ${formatKoreanDate(subscription.expireDate)}까지`,
        notice: daysLeft <= 7 ? `연장 안내 · ${Math.max(0, daysLeft)}일 남음` : ""
      };
    }
    const graceEnd = new Date(end);
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    const graceLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / 86400000);
    if (graceLeft >= 0) {
      return {
        className: "warn",
        text: `유예기간 이용중 · ${Math.max(0, graceLeft)}일 남음`,
        notice: `입금 확인 후 이용기간이 연장됩니다`
      };
    }
    return { className: "danger", text: "이용기간 확인 필요", notice: "관리자에게 문의해주세요" };
  }, [subscription]);

  const isSubscriptionLocked = subscriptionInfo?.className === "danger";
  const displayScale = displayMode === "scale" ? Math.max(0.35, Math.min(1, screenWidth / DESIGN_WIDTH)) : 1;

  useEffect(() => {
    if (screenMode !== "table" || !tableModeOrdering) return undefined;
    const seconds = Math.max(1, Number(tableAutoReturnSeconds) || 10);
    const timer = window.setTimeout(() => setTableModeOrdering(false), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [screenMode, tableModeOrdering, tableAutoReturnSeconds, tableActivityTick, selectedTable]);

  const noteTableActivity = () => {
    if (screenMode === "table" && tableModeOrdering) setTableActivityTick(tick => tick + 1);
  };

  const compactSyncStatus = firebaseReady ? "자동저장 완료" : firebaseLoading ? "자동저장 확인중" : "기기저장 유지중";
  const copyAccountNumber = async event => {
    event?.stopPropagation?.();
    const digits = String(subscription?.accountNumber || "").replace(/\D/g, "");
    if (!digits) return showToast("복사할 계좌번호가 없습니다");
    try {
      await navigator.clipboard.writeText(digits);
      showToast("계좌번호 숫자만 복사되었습니다");
    } catch {
      window.prompt("아래 계좌번호를 복사해주세요", digits);
    }
  };

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

  const selectTable = table => {
    clearToast();
    setSelectedTable(table);
    const meta = tableServiceMeta?.[table];
    setServiceType(meta?.serviceType === "포장" ? "포장" : "식당식사");
  };

  const setType = type => {
    setServiceType(type);
    setOrders(prev => ({ ...prev, [selectedTable]: applyServiceAdd(type, prev[selectedTable] || []) }));
    setTableServiceMeta(prev => {
      const next = { ...(prev || {}) };
      if (type === "포장") next[selectedTable] = { ...(next[selectedTable] || {}), serviceType: "포장", memo: next[selectedTable]?.memo || "" };
      else delete next[selectedTable];
      return next;
    });
  };

  const updateTakeoutMemo = value => {
    setTableServiceMeta(prev => ({ ...(prev || {}), [selectedTable]: { ...(prev?.[selectedTable] || {}), serviceType: "포장", memo: value } }));
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
    setOrders(prev => {
      const next = (prev[selectedTable] || [])
        .map(item => {
          if (item.id !== id) return item;
          const nextQty = Number(item.qty || 0) + diff;
          if (nextQty <= 0 && Number(item.kitchenSentQty || 0) > 0 && isKitchenTarget(item)) {
            return { ...item, qty: 0, pendingKitchenCancel: true };
          }
          return { ...item, qty: nextQty };
        })
        .filter(item => Number(item.qty || 0) > 0 || (Number(item.kitchenSentQty || 0) > 0 && item.pendingKitchenCancel));
      return { ...prev, [selectedTable]: next };
    });
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

  const sendKitchenOrder = () => {
    if (!kitchenOptionActive) return showToast("주문서관리 유료 옵션이 활성화되어야 사용할 수 있습니다");
    if (!kitchenEnabled) return showToast("관리자모드에서 주방전송 버튼 사용을 켜주세요");
    if (!currentOrder.length) return showToast("주문내역이 없습니다");

    const changes = currentOrder
      .filter(isKitchenTarget)
      .map(item => {
        const beforeQty = Number(item.kitchenSentQty || 0);
        const currentQty = Number(item.qty || 0);
        const diff = currentQty - beforeQty;
        if (diff === 0) return null;
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          beforeQty,
          currentQty,
          diff,
          qty: Math.abs(diff),
          changeType: diff > 0 ? (beforeQty > 0 ? "추가주문" : "주문") : "취소"
        };
      })
      .filter(Boolean);

    if (!changes.length) return showToast("이미 주방전송 완료된 주문입니다");

    const kitchenOrder = {
      id: Date.now(),
      table: selectedTable,
      type: changes.every(item => item.changeType === "취소") ? "취소" : changes.some(item => item.changeType === "추가주문" || item.changeType === "취소") ? "수정" : "주문",
      status: "sent",
      createdAt: new Date().toISOString(),
      items: changes
    };

    saveKitchenOrderToFirebase(kitchenOrder)
      .then(() => setSyncStatus("주방주문 Firebase 전송 완료"))
      .catch(error => { console.error(error); setSyncStatus("주방주문 Firebase 전송 실패 · 기기저장 유지중"); });

    setOrders(prev => ({
      ...prev,
      [selectedTable]: (prev[selectedTable] || [])
        .map(item => isKitchenTarget(item) ? { ...item, kitchenSentQty: Number(item.qty || 0), pendingKitchenCancel: false } : item)
        .filter(item => Number(item.qty || 0) > 0)
    }));
    showToast("주방전송 완료");
  };

  const printReceipt = sale => {
    const receiptHtml = `<!doctype html><html><head><title>영수증</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:sans-serif;width:280px;margin:12px;color:#111}h2{text-align:center;margin:0 0 8px}td{padding:4px;border-bottom:1px dashed #ccc}.total{text-align:right;font-weight:bold;font-size:20px;margin-top:12px}.actions{margin-top:22px;display:flex;gap:8px}.actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:bold}.back{background:#111827;color:white}.print{background:#16a34a;color:white}@media print{.actions{display:none}} </style></head><body><h2>${restaurantName}</h2><div>${new Date(sale.createdAt).toLocaleString()}</div><div>${sale.table}번 / ${sale.payment} / ${sale.serviceType}</div><hr/><table style="width:100%">${sale.items.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${money(item.price * item.qty)}</td></tr>`).join("")}</table><div class="total">합계 ${money(sale.total)}</div><p style="text-align:center">감사합니다</p><div class="actions"><button class="back" onclick="window.close();history.back();">POS 화면으로 돌아가기</button><button class="print" onclick="window.print();">영수증 다시 출력</button></div></body></html>`;

    try {
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.style.opacity = "0";
      document.body.appendChild(frame);

      const doc = frame.contentWindow?.document;
      if (!doc) throw new Error("iframe print unavailable");
      doc.open();
      doc.write(receiptHtml);
      doc.close();

      frame.onload = () => {
        window.setTimeout(() => {
          try {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
          } finally {
            window.setTimeout(() => frame.remove(), 1200);
          }
        }, 120);
      };
    } catch {
      const win = window.open("", "receipt", "width=360,height=600");
      if (!win) return;
      win.document.write(receiptHtml.replace("</body>", "<script>window.onload=function(){window.print();setTimeout(function(){try{window.close()}catch(e){}},500)}<\/script></body>"));
      win.document.close();
    }
  };

  const complete = withPrint => {
    if (!activeOrder.length) return showToast("주문내역이 없습니다");
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
      creditGroup: payment === "외상" ? creditName.trim() : "",
      serviceType,
      takeoutMemo: tableServiceMeta?.[selectedTable]?.memo || "",
      total,
      createdAt: new Date().toISOString(),
      items: activeOrder
    };

    setSales(prev => [sale, ...prev]);
    saveSaleToFirebase(sale)
      .then(() => setSyncStatus("판매내역 Firebase 저장 완료"))
      .catch(error => { console.error(error); setSyncStatus("판매내역 Firebase 저장 실패 · 기기저장 유지중"); });

    if (payment === "외상") {
      const credit = {
        id: sale.id,
        group: creditName.trim(),
        phone: creditPhone,
        memo: creditMemo,
        table: selectedTable,
        total,
        remain: total,
        paid: false,
        createdAt: sale.createdAt,
        items: activeOrder,
        partialPayments: []
      };
      setCredits(prev => [credit, ...prev]);
      saveCreditToFirebase(credit)
        .then(() => setSyncStatus("외상장부 Firebase 저장 완료"))
        .catch(error => { console.error(error); setSyncStatus("외상장부 Firebase 저장 실패 · 기기저장 유지중"); });
      setCreditName("");
      setCreditPhone("");
      setCreditMemo("");
      setCreditInfoConflict(null);
    }

    setOrders(prev => ({ ...prev, [selectedTable]: [] }));
    setTableServiceMeta(prev => { const next = { ...(prev || {}) }; delete next[selectedTable]; return next; });
    setServiceType("식당식사");
    setCreditWarn("");
    showToast(`${selectedTable}번테이블 ${payment}결제 완료했습니다`);
    if (withPrint) {
      showToast("영수증 인쇄창을 여는 중입니다. 출력이 안 되면 최근 결제내역에서 재출력해주세요");
      window.setTimeout(() => printReceipt(sale), 250);
    }
    if (scrollTopAfterPay) window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 120);
  };


  const [resetDialog, setResetDialog] = useState(null);

  const resetDialogMap = {
    sales: {
      mode: "password",
      title: "판매내역/판매통계 초기화",
      message: "판매내역, 판매통계, 인기메뉴 기록을 초기화합니다. 메뉴와 설정은 유지됩니다."
    },
    orders: {
      mode: "password",
      title: "현재 주문내역 초기화",
      message: "현재 테이블별 주문내역만 초기화합니다. 판매내역과 외상장부는 유지됩니다."
    },
    credits: {
      mode: "danger",
      title: "외상장부 초기화",
      message: "외상장부는 금액 손실과 직접 관련된 중요한 자료입니다. 이 작업은 되돌리기 어렵습니다."
    },
    operating: {
      mode: "danger",
      title: "운영 데이터 전체 초기화",
      message: "판매내역, 판매통계, 외상장부, 현재 주문내역을 모두 초기화합니다. 메뉴와 설정은 유지됩니다. 이 작업은 되돌리기 어렵습니다."
    }
  };

  const openResetDialog = action => {
    const config = resetDialogMap[action];
    if (!config) return;
    setResetDialog({ ...config, action, password: "", confirmText: "", error: "" });
  };

  const executeReset = async action => {
    if (action === "sales") {
      const ids = sales.map(item => item.id);
      setSales([]);
      setLS(LS.salesHistory, []);
      await firestoreDeleteMany("sales", ids);
      setSyncStatus("판매내역 Firebase 초기화 완료");
      showToast("판매내역/판매통계가 초기화되었습니다");
      return;
    }
    if (action === "credits") {
      const ids = credits.map(item => item.id);
      setCredits([]);
      setSelectedCreditIds([]);
      setLS(LS.creditLedger, []);
      await firestoreDeleteMany("credits", ids);
      setSyncStatus("외상장부 Firebase 초기화 완료");
      showToast("외상장부가 초기화되었습니다");
      return;
    }
    if (action === "orders") {
      setOrders({});
      setLS(LS.orders, {});
      await saveSettingsToFirebase({
        restaurantName, menus, categories, tableCount, tableRows, orders: {},
        popularCount, showPopular, adminPw, diningSetting, takeoutSetting, tableServiceMeta,
        pinTables, pinOrder, scrollTopAfterPay, showReceiptPrint, kitchenSettings, screenMode, displayMode, contactSettings, messagePoints, menuIngredients, tableAutoReturnSeconds, tableLayout, subscription
      });
      setSyncStatus("현재 주문내역 초기화 완료");
      showToast("현재 주문내역이 초기화되었습니다");
      return;
    }
    if (action === "operating") {
      const saleIds = sales.map(item => item.id);
      const creditIds = credits.map(item => item.id);
      setSales([]);
      setCredits([]);
      setOrders({});
      setSelectedCreditIds([]);
      setLS(LS.salesHistory, []);
      setLS(LS.creditLedger, []);
      setLS(LS.orders, {});
      await firestoreDeleteMany("sales", saleIds);
      await firestoreDeleteMany("credits", creditIds);
      await saveSettingsToFirebase({
        restaurantName, menus, categories, tableCount, tableRows, orders: {},
        popularCount, showPopular, adminPw, diningSetting, takeoutSetting, tableServiceMeta,
        pinTables, pinOrder, scrollTopAfterPay, showReceiptPrint, kitchenSettings, screenMode, displayMode, contactSettings, messagePoints, menuIngredients, tableAutoReturnSeconds, tableLayout, subscription
      });
      setSyncStatus("운영 데이터 전체 초기화 완료");
      showToast("운영 데이터가 초기화되었습니다");
    }
  };

  const confirmResetDialog = async () => {
    if (!resetDialog) return;
    if (resetDialog.mode === "password" && resetDialog.password !== adminPw) {
      setResetDialog(prev => ({ ...prev, error: "관리자 비밀번호가 맞지 않습니다." }));
      return;
    }
    if (resetDialog.mode === "danger" && resetDialog.confirmText !== "초기화") {
      setResetDialog(prev => ({ ...prev, error: "정확히 초기화 라고 입력해주세요." }));
      return;
    }
    try {
      const action = resetDialog.action;
      setResetDialog(null);
      await executeReset(action);
    } catch (error) {
      console.error(error);
      setSyncStatus("Firebase 초기화 실패");
      alert("Firebase 초기화 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
    }
  };

  const resetSalesData = () => openResetDialog("sales");
  const resetCreditData = () => openResetDialog("credits");
  const resetOrderData = () => openResetDialog("orders");
  const resetOperatingData = () => openResetDialog("operating");

  const openShortcutGuide = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        setInstallPrompt(null);
        return;
      } catch {}
    }
    setShortcutModal(true);
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
      const updated = unlock
        ? { ...item, paid: false, remain: item.total, partialPayments: [] }
        : { ...item, paid: true, remain: 0 };
      saveCreditToFirebase(updated).catch(error => { console.error(error); setSyncStatus("외상장부 Firebase 저장 실패 · 기기저장 유지중"); });
      return updated;
    }));
    setSelectedCreditIds([]);
  };

  const partialPay = (id, amount) => {
    const payAmount = Number(amount) || 0;
    if (payAmount <= 0) return;
    setCredits(prev => prev.map(item => {
      if (item.id !== id) return item;
      const remain = Math.max(0, Number(item.remain || 0) - payAmount);
      const updated = {
        ...item,
        remain,
        paid: remain === 0,
        partialPayments: [...(item.partialPayments || []), { amount: payAmount, at: new Date().toISOString() }]
      };
      saveCreditToFirebase(updated).catch(error => { console.error(error); setSyncStatus("외상장부 Firebase 저장 실패 · 기기저장 유지중"); });
      return updated;
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
    setMsgModal({ title: "선택 내역 문자전송", selected: selectedCredits, total: selectedCreditTotal });
  };

  const getGroupItems = groupName => credits.filter(item => (item.group || "미지정") === groupName);
  const getGroupSelected = groupName => getGroupItems(groupName).filter(item => selectedCreditIds.includes(item.id));
  const getGroupSelectedTotal = groupName => getGroupSelected(groupName).reduce((sum, item) => sum + (!item.paid ? Number(item.remain || 0) : 0), 0);
  const getGroupPayInfo = groupName => {
    const selected = getGroupSelected(groupName);
    const unlock = selected.length > 0 && selected.every(item => item.paid);
    return {
      selected,
      unlock,
      label: unlock ? "단체 완납해제" : "단체 완납처리",
      className: unlock ? "orangeAction" : "green"
    };
  };
  const selectGroupUnpaid = groupName => {
    const ids = getGroupItems(groupName).filter(item => !item.paid).map(item => item.id);
    setSelectedCreditIds(prev => Array.from(new Set([...prev, ...ids])));
  };
  const clearGroupSelection = groupName => {
    const ids = new Set(getGroupItems(groupName).map(item => item.id));
    setSelectedCreditIds(prev => prev.filter(id => !ids.has(id)));
  };
  const toggleGroupPaid = groupName => {
    const selected = getGroupSelected(groupName);
    if (!selected.length) return showToast("완납처리할 단체 내역을 선택해주세요");
    const ids = new Set(selected.map(item => item.id));
    const unlock = selected.every(item => item.paid);
    setCredits(prev => prev.map(item => {
      if (!ids.has(item.id)) return item;
      const updated = unlock
        ? { ...item, paid: false, remain: item.total, partialPayments: [] }
        : { ...item, paid: true, remain: 0 };
      saveCreditToFirebase(updated).catch(error => { console.error(error); setSyncStatus("외상장부 Firebase 저장 실패 · 기기저장 유지중"); });
      return updated;
    }));
    setSelectedCreditIds(prev => prev.filter(id => !ids.has(id)));
  };
  const openGroupMessageModal = groupName => {
    const selected = getGroupSelected(groupName);
    if (!selected.length) return showToast("해당 단체에서 문자전송할 외상 내역을 선택해주세요");
    const total = selected.reduce((sum, item) => sum + (!item.paid ? Number(item.remain || 0) : 0), 0);
    setMsgModal({ title: `${groupName} 문자전송`, selected, total });
  };

  const exportCreditExcel = () => {
    const sheets = buildCreditWorkbook({ restaurantName, credits });
    downloadXlsx(`${restaurantName || "식당"}_외상장부_${timeName()}.xlsx`, sheets);
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

  const isTableModeHome = screenMode === "table" && !tableModeOrdering;
  const billingDetails = useMemo(() => {
    const base = Math.max(0, Number(subscription?.baseMonthlyFee ?? 10000));
    const option = Math.max(0, Number(subscription?.optionMonthlyFee || 0)) + (subscription?.kitchenOptionEnabled ? Math.max(0, Number(subscription?.kitchenOptionFee || 0)) : 0);
    const count = Math.max(0, Number(subscription?.referralActiveCount || 0));
    const rawRate = Number(subscription?.referralDiscountRate ?? 10);
    const rate = Math.max(0, Math.min(100, Number.isFinite(rawRate) ? rawRate : 10));
    const rawEventRate = Number(subscription?.newEventDiscountRate ?? 50);
    const eventRate = Math.max(0, Math.min(100, Number.isFinite(rawEventRate) ? rawEventRate : 50));
    const eventDays = Math.max(0, Number(subscription?.newEventDiscountDays ?? 60));
    const start = safeDateObj(subscription?.startDate) || new Date();
    const today = safeDateObj(todayValue()) || new Date();
    const dayNo = Math.max(1, Math.floor((today - start) / 86400000) + 1);
    const eventActive = eventDays > 0 && dayNo <= eventDays;
    const eventDiscountName = subscription?.newEventDiscountName || "신규 이벤트 할인";
    const eventDiscount = eventActive ? Math.min(base, round100(base * eventRate / 100)) : 0;
    const before = base + option;
    const afterEvent = Math.max(0, base - eventDiscount) + option;
    const referralDiscountFactor = count > 0 ? Math.pow(1 - rate / 100, count) : 1;
    const calculated = round100(afterEvent * referralDiscountFactor);
    const finalFee = Math.max(0, calculated);
    const referralDiscount = Math.max(0, afterEvent - finalFee);
    const totalDiscountRate = before ? Math.max(0, Math.min(100, Math.round((1 - finalFee / before) * 1000) / 10)) : 0;
    return { base, option, count, rate, before, afterEvent, eventActive, eventRate, eventDays, eventDiscountName, eventDiscount, referralDiscount, calculated, finalFee, totalDiscountRate };
  }, [subscription]);

  const handleTableOrMarkerDown = (type, id, event) => {
    if (!tableLayout?.editUnlocked) return;
    event.preventDefault();
    event.stopPropagation();
    const board = event.currentTarget.closest(".floorBoard");
    const updateFromPointer = pointerEvent => {
      const rect = board.getBoundingClientRect();
      const x = clampPercent(((pointerEvent.clientX - rect.left) / rect.width) * 100);
      const y = clampPercent(((pointerEvent.clientY - rect.top) / rect.height) * 100);
      setTableLayout(prev => {
        const base = normalizeTableLayout(prev, tableCount);
        if (type === "table") {
          return { ...base, tablePositions: { ...(base.tablePositions || {}), [id]: { x, y } } };
        }
        const current = base.markers?.[id] || {};
        const edge = current.edge || "top";
        const pos = edge === "top" || edge === "bottom" ? x : y;
        return { ...base, markers: { ...(base.markers || {}), [id]: { ...current, visible: true, edge, pos } } };
      });
    };
    const move = pointerEvent => updateFromPointer(pointerEvent);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    updateFromPointer(event);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const assignMarkerEdge = edge => {
    setTableLayout(prev => {
      const base = normalizeTableLayout(prev, tableCount);
      const selected = base.selectedMarkerId || floorMarkers[0].id;
      const current = base.markers?.[selected] || {};
      const oldPos = current.pos ?? (edge === "top" || edge === "bottom" ? current.x : current.y) ?? 50;
      return {
        ...base,
        markers: {
          ...(base.markers || {}),
          [selected]: { ...current, visible: true, edge, pos: clampPercent(oldPos) }
        }
      };
    });
  };

  const changeTableSize = diff => {
    setTableLayout(prev => {
      const base = normalizeTableLayout(prev, tableCount);
      const next = diff === 0 ? 100 : Math.max(70, Math.min(160, Number(base.tableSize || 100) + diff));
      return { ...base, tableSize: next };
    });
  };

  const resetTablePositions = () => {
    if (!window.confirm("테이블 위치를 기본 배치로 되돌릴까요?\n현재 수정한 테이블 위치만 초기화되고, 테이블 크기와 표시 아이콘 설정은 유지됩니다.")) return;
    setTableLayout(prev => {
      const base = normalizeTableLayout(prev, tableCount);
      const defaults = makeDefaultTableLayout(tableCount);
      return { ...base, tablePositions: defaults.tablePositions };
    });
    showToast("테이블 위치를 기본 배치로 초기화했습니다");
  };

  const openKakaoChannel = () => {
    const url = String(contactSettings?.kakaoChannelUrl || "").trim();
    if (!url) return showToast("관리자모드에서 카카오톡 채널 URL을 먼저 입력해주세요");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const requestMessagePointCharge = async plan => {
    if (!plan || messagePointSending) return;
    const ok = window.confirm(`${plan.amount.toLocaleString()}원 충전요청을 보낼까요?\n지급예정 이용포인트: ${plan.points.toLocaleString()}P\n\n종합관리프로그램 연결 후 관리자가 입금 확인/승인하면 충전됩니다.`);
    if (!ok) return;
    const request = {
      id: `mp_${Date.now()}`,
      restaurantId: RESTAURANT_ID,
      restaurantName,
      amount: plan.amount,
      points: plan.points,
      status: "입금확인 대기",
      createdAt: new Date().toISOString()
    };
    setMessagePointSending(true);
    try {
      await saveMessagePointRequestToFirebase(request);
      setMessagePoints(prev => {
        const base = prev || defaultMessagePoints();
        return { ...base, pendingRequests: [request, ...(base.pendingRequests || [])].slice(0, 5) };
      });
      showToast("이용포인트 충전요청을 보냈습니다");
    } catch (error) {
      console.error(error);
      setMessagePoints(prev => {
        const base = prev || defaultMessagePoints();
        return { ...base, pendingRequests: [{ ...request, status: "기기저장 · 전송대기" }, ...(base.pendingRequests || [])].slice(0, 5) };
      });
      showToast("Firebase 연결이 불안정해 기기에 요청을 임시 저장했습니다");
    } finally {
      setMessagePointSending(false);
    }
  };

  const renderFloorPlan = (editable = false) => {
    const layout = normalizeTableLayout(tableLayout, tableCount);
    return (
      <section className={`tableModeFloor card ${editable ? "editing" : "homeFloor"}`}>
        {editable && (
          <div className="floorHead">
            <div>
              <h2>테이블 배치도</h2>
              <p className="muted">실제 식당 위치처럼 테이블을 눌러 주문을 시작합니다.</p>
            </div>
            <button
              className={layout.editUnlocked ? "orangeAction" : "dark"}
              onClick={() => setTableLayout(prev => ({ ...(prev || makeDefaultTableLayout(tableCount)), editUnlocked: !(prev?.editUnlocked) }))}
            >
              {layout.editUnlocked ? "🔓 수정중" : "🔒 잠금"}
            </button>
          </div>
        )}
        <div className="floorBoard">
          {floorMarkers.map(marker => {
            const info = layout.markers?.[marker.id] || { visible: false, edge: "top", pos: 50 };
            if (!info.visible) return null;
            return (
              <div key={marker.id} className={`floorMarker ${markerOrientClass(info)} ${layout.selectedMarkerId === marker.id ? "selected" : ""}`} style={markerStyleFromInfo(info)} onPointerDown={e => handleTableOrMarkerDown("marker", marker.id, e)}>
                <span>{marker.icon}</span>{marker.label}
              </div>
            );
          })}
          {tables.map(table => {
            const pos = layout.tablePositions?.[table] || makeDefaultTableLayout(tableCount).tablePositions?.[table] || { x: 10, y: 10 };
            const hasOrder = (orders[table] || []).some(item => Number(item.qty || 0) > 0);
            return (
              <button
                key={table}
                className={`floorTable ${selectedTable === table ? "sel" : ""} ${hasOrder ? "has" : ""} ${tableServiceMeta?.[table]?.serviceType === "포장" ? "takeoutTable" : ""}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, "--tableScale": Number(layout.tableSize || 100) / 100 }}
                onPointerDown={editable ? e => handleTableOrMarkerDown("table", table, e) : undefined}
                onClick={e => {
                  e.stopPropagation();
                  if (editable && layout.editUnlocked) return;
                  selectTable(table);
                  setTableModeOrdering(true);
                }}
              >
                <span>{table}번</span>{tableServiceMeta?.[table]?.serviceType === "포장" && <em>포장</em>}
              </button>
            );
          })}
        </div>
        {editable && <p className="muted">수정중 상태에서 테이블은 자유롭게, 표시 아이콘은 지정된 외곽선 안에서 드래그해 위치를 조정하세요. 잠금 상태에서는 클릭 시 주문화면으로 이동합니다.</p>}
      </section>
    );
  };

  return (
    <div className={`app ${displayMode === "scale" ? "scaleMode" : ""}`} style={{ "--posScale": displayScale }} onClick={clearToast} onPointerDown={noteTableActivity} onKeyDown={noteTableActivity}>
      {isTableModeHome && !tableHomeHeaderOpen && (
        <button className="tableHomePull" onClick={e => { e.stopPropagation(); setTableHomeHeaderOpen(true); }}>
          ☰ 관리자/상단 펼치기
        </button>
      )}

      {(!isTableModeHome || tableHomeHeaderOpen) && (
        <header className={`top card compactTop ${isTableModeHome ? "tableHomeTopOpen" : ""}`}>
          <div className="topLeft">
            <h1>{restaurantName} POS <span>{VERSION} · {compactSyncStatus}</span></h1>
            <p>주문 · 외상장부 · 판매통계 · 관리자</p>
            {subscriptionInfo.notice && <p className={`subscriptionNotice ${subscriptionInfo.className}`}>{subscriptionInfo.notice}</p>}
          </div>
          <div className="topRightInfo topRightCompact" onClick={e => e.stopPropagation()}>
            <div className={`subscriptionBadge ${subscriptionInfo.className}`}>{subscriptionInfo.text}</div>
            {isTableModeHome && <button onClick={() => setTableHomeHeaderOpen(false)} className="ghost adminBtn">상단 접기</button>}
            <button onClick={e => { e.stopPropagation(); openAdmin(); }} className="dark adminBtn">관리자모드</button>
          </div>
        </header>
      )}

      {isTableModeHome && <div className={isSubscriptionLocked ? "lockedContent" : ""}>{renderFloorPlan(false)}</div>}

      {!isTableModeHome && <div className={`layout ${isSubscriptionLocked ? "lockedContent" : ""}`}>
        <div className="leftCol">
          {screenMode !== "table" ? (
            <section
              className={`tables ${pinTables && fixedEnabled ? "pinTables" : ""}`}
              style={{ gridTemplateColumns: `repeat(${tableColumns}, minmax(0, 1fr))` }}
            >
              {tables.map(table => (
                <button
                  key={table}
                  onClick={() => selectTable(table)}
                  className={`tableBtn ${selectedTable === table ? "sel" : (orders[table] || []).length ? "has" : ""} ${tableServiceMeta?.[table]?.serviceType === "포장" ? "takeoutTable" : ""}`}
                >
                  <span>{table}번</span>{tableServiceMeta?.[table]?.serviceType === "포장" && <em>포장</em>}
                </button>
              ))}
            </section>
          ) : (
            <div className="tableModeBack card">
              <button className="dark" onClick={() => setTableModeOrdering(false)}>← 테이블 배치로 돌아가기</button>
              <b>{selectedTable}번 테이블 주문중</b>
            </div>
          )}

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
          {serviceType === "포장" && (
            <div className="takeoutMemoBox card">
              <b>포장/전화주문 메모</b>
              <input
                inputMode="numeric"
                placeholder="전화번호 또는 메모 입력 (선택)"
                value={tableServiceMeta?.[selectedTable]?.memo || ""}
                onChange={e => updateTakeoutMemo(e.target.value)}
              />
              <span>메모 없이 포장만 선택해도 됩니다.</span>
            </div>
          )}

          <section className="menuArea card">
            {sortedCats.map(category => (
              <div key={category.name}>
                <h2 className="menuCategoryTitle"><span>{category.name}</span></h2>
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
          {activeOrder.map(item => (
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
          {kitchenOptionActive && kitchenEnabled && (
            <div className={`kitchenSendBox ${kitchenPendingItems.length ? "pending" : "done"}`}>
              <div><b>{kitchenStatusText}</b><span>주방에 필요한 메뉴만 전송됩니다</span></div>
              <button onClick={sendKitchenOrder}>{kitchenSettings?.buttonLabel || "주문"}</button>
            </div>
          )}
          <div className="total"><b>총 금액</b><b>{money(total)}</b></div>
          <button className="pay" onClick={() => complete(false)}>결제완료</button>
          {showReceiptPrint && <button className="pay print" onClick={() => complete(true)}>결제완료 + 영수증 출력</button>}
          <button className="ghost" onClick={() => setReceiptModal(true)}>최근 결제내역 / 영수증재출력</button>
        </aside>
      </div>}

      <div className="bottomBars">
        <button className="orange" onClick={() => setOpenCredit(!openCredit)}>외상장부 {openCredit ? "▲" : "▼"}</button>
        <button className="blue" onClick={() => setOpenStats(!openStats)}>판매통계 {openStats ? "▲" : "▼"}</button>
      </div>

      {openCredit && (
        <section className="card panel">
          <div className="sectionHead creditHead">
            <div>
              <div className="creditTitleLine">
                <h2>외상장부</h2>
                <div className="creditPointBadge">이용포인트 <b>{Number(messagePoints?.balance || 0).toLocaleString()}P</b></div>
              </div>
              <p className="muted">선택 {selectedCreditIds.length}건 / 선택 미납합계 <b>{money(selectedCreditTotal)}</b></p>
            </div>
            <div className="creditActions">
              <button onClick={selectAllUnpaid}>미결제 전체선택</button>
              <button onClick={clearCreditSelection}>선택해제</button>
              <button className={payToggleClass} onClick={togglePaid}>{creditLabel()}</button>
              <button onClick={openMessageModal}>문자전송</button>
              <button onClick={exportCreditExcel}>외상 엑셀다운</button>
            </div>
          </div>
          {groupedCredits.length ? groupedCredits.map(group => {
            const groupSelected = getGroupSelected(group.group);
            const groupPayInfo = getGroupPayInfo(group.group);
            const groupSelectedTotal = getGroupSelectedTotal(group.group);
            return (
            <div className="creditGroup" key={group.group}>
              <div className="creditGroupHead">
                <div className="creditGroupTitle">
                  <b>{group.group}</b> <span>미납총액 {money(group.unpaidTotal)}</span>
                  <p className="muted">단체 선택 {groupSelected.length}건 / 선택 미납합계 <b>{money(groupSelectedTotal)}</b></p>
                </div>
                <div className="groupActions">
                  <button onClick={() => selectGroupUnpaid(group.group)}>단체 미결제 전체선택</button>
                  <button onClick={() => clearGroupSelection(group.group)}>단체 선택해제</button>
                  <button className={groupPayInfo.className} onClick={() => toggleGroupPaid(group.group)}>{groupPayInfo.label}</button>
                  <button onClick={() => openGroupMessageModal(group.group)}>현단체 문자전송</button>
                  <button onClick={() => setHiddenCreditGroups(prev => ({ ...prev, [group.group]: !prev[group.group] }))}>{hiddenCreditGroups[group.group] ? "펼치기" : "숨기기"}</button>
                </div>
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
            );
          }) : <p className="muted">외상 내역이 없습니다</p>}
          <div className="right"><button className={payToggleClass} onClick={togglePaid}>{creditLabel()}</button></div>
        </section>
      )}

      {openStats && <section className="card panel"><Stats sales={sales} credits={credits} menus={menus} restaurantName={restaurantName} menuIngredients={menuIngredients} messagePoints={messagePoints} subscription={subscription} /></section>}

      {isSubscriptionLocked && (
        <div className="lockOverlay" onClick={e => e.stopPropagation()}>
          <div className="lockBox">
            <b>이용기간이 종료되었습니다</b>
            <p>현재 이용기간과 유예기간이 모두 지나 사용이 제한되었습니다.<br />계속 이용하시려면 이용 연장 등록이 필요합니다.</p>
            <div className="lockActions">
              <button className="dark" onClick={() => setContactModal(true)}>문의하기</button>
              <button onClick={openAdmin}>관리자모드</button>
            </div>
          </div>
        </div>
      )}

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
            setScrollTopAfterPay,
            showReceiptPrint,
            setShowReceiptPrint,
            kitchenSettings,
            setKitchenSettings,
            screenMode,
            setScreenMode,
            displayMode,
            setDisplayMode,
            contactSettings,
            setContactSettings,
            messagePoints,
            menuIngredients,
            setMenuIngredients,
            openMessagePointModal: () => setMessagePointModal(true),
            tableAutoReturnSeconds,
            setTableAutoReturnSeconds,
            tableLayout,
            setTableLayout,
            tableEditOpen,
            setTableEditOpen,
            assignMarkerEdge,
            changeTableSize,
            resetTablePositions,
            renderFloorPlan,
            resetSalesData,
            resetCreditData,
            resetOrderData,
            resetOperatingData,
            openShortcutGuide,
            subscription,
            setSubscription,
            copyAccountNumber,
            openReferralInfo: () => setReferralModal(true),
            openBillingDetail: () => setBillingModal(true),
            openKitchenPair: () => setKitchenPairModal(true),
            openContactModal: () => setContactModal(true),
            billingDetails,
            restaurantId: RESTAURANT_ID,
            schemaVersion: POS_DATA_SCHEMA_VERSION,
            syncStatus
          }}
        />
      )}


      {messagePointModal && (
        <div className="modal">
          <div className="modalBox wide messagePointModal">
            <button className="xBtn" onClick={() => setMessagePointModal(false)}>×</button>
            <h2>이용포인트 충전요청</h2>
            <div className="summaryBox">현재 이용포인트 잔액 <b>{Number(messagePoints?.balance || 0).toLocaleString()}P</b></div>
            <div className="servicePreparingBox">
              <b>서비스 준비중입니다</b>
              <p>종합관리프로그램 연결 후 사용 가능합니다.</p>
            </div>
            <p className="muted">충전요청, 관리자 카톡 알림, 승인 후 포인트 반영 기능은 추후 종합관리프로그램 완성 시 연결할 예정입니다.</p>
            <div className="pointPlanGrid disabledArea" aria-disabled="true">
              {messagePointPlans.map(plan => (
                <button key={plan.amount} disabled type="button">
                  <b>{plan.amount.toLocaleString()}원</b>
                  <span>{plan.points.toLocaleString()}P 충전요청</span>
                  {plan.points > plan.amount && <small>보너스 {(plan.points - plan.amount).toLocaleString()}P</small>}
                </button>
              ))}
            </div>
            <div className="pointNotice disabledNotice">
              <b>추후 연결 예정</b>
              <p>충전요청 접수 → 관리자 입금 확인 → 종합관리프로그램 승인 → 이용포인트 반영 순서로 처리할 예정입니다.</p>
            </div>
          </div>
        </div>
      )}

      {msgModal && (
        <div className="modal">
          <div className="modalBox wide">
            <button className="xBtn" onClick={() => setMsgModal(null)}>×</button>
            <h2>{msgModal.title || "문자전송"}</h2>
            <div className="summaryBox">선택한 외상 {msgModal.selected?.length || 0}건 / 미납총액 <b>{money(msgModal.total || 0)}</b></div>
            <p>문자전송 기능 준비중입니다 😊</p>
            <p className="muted">현재는 체크한 내역 기준으로 미납총액만 계산합니다. 추후 외상 독려문자, 자동 금액 입력, 이용포인트, 발송내역 기능을 연결할 예정입니다.</p>
            {(msgModal.selected || []).map(item => <p key={item.id}>{item.group} / {new Date(item.createdAt).toLocaleDateString()} / 잔액 {money(item.remain)}</p>)}
          </div>
        </div>
      )}

      {/* 영수증 추가 안내창은 V21에서 제거했습니다. 재출력은 최근 결제내역에서 가능합니다. */}

      {resetDialog && (
        <div className="modal">
          <div className={`modalBox resetConfirmBox ${resetDialog.mode === "danger" ? "dangerReset" : ""}`} onClick={e => e.stopPropagation()}>
            <button className="xBtn" onClick={() => setResetDialog(null)}>×</button>
            <h2>{resetDialog.title}</h2>
            {resetDialog.mode === "danger" ? (
              <div className="dangerMessage">
                <p>⚠ {resetDialog.message}</p>
                <p>정말 초기화하려면 아래 칸에 <b>초기화</b> 라고 입력해주세요.</p>
                <input autoFocus value={resetDialog.confirmText} onChange={e => setResetDialog(prev => ({ ...prev, confirmText: e.target.value, error: "" }))} placeholder="초기화 입력" />
              </div>
            ) : (
              <div className="normalMessage">
                <p>{resetDialog.message}</p>
                <p>관리자 비밀번호를 입력해주세요.</p>
                <input autoFocus type="password" value={resetDialog.password} onChange={e => setResetDialog(prev => ({ ...prev, password: e.target.value, error: "" }))} placeholder="관리자 비밀번호" onKeyDown={e => { if (e.key === "Enter") confirmResetDialog(); }} />
              </div>
            )}
            {resetDialog.error && <p className="warnText">{resetDialog.error}</p>}
            <div className="resetActions">
              <button className={resetDialog.mode === "danger" ? "dangerBtn" : "green"} onClick={confirmResetDialog}>초기화 실행</button>
              <button onClick={() => setResetDialog(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {referralModal && (
        <div className="modal">
          <div className="modalBox wide" onClick={e => e.stopPropagation()}>
            <button className="xBtn" onClick={() => setReferralModal(false)}>×</button>
            <h2>소개 할인 안내</h2>
            <div className="summaryBox referralGuideBox">
              <p><b>주변 식당을 소개해주시면 현재 월 이용료에서 10% 추가 할인됩니다.</b></p>
              <p>소개한 식당이 이용 중일 때 할인 혜택이 적용됩니다. 미납/사용중단 시에는 설정된 유예기간 이후 할인 적용에서 제외될 수 있습니다.</p>
            </div>
            <h3>소개한 업체</h3>
            <div className="referralList">
              {(subscription?.referredRestaurants || []).length ? (
                subscription.referredRestaurants.map((item, idx) => (
                  <div key={idx} className="referralItem">
                    <b>{item.name || item.restaurantName || "이름 미설정"}</b>
                    <span>{item.status || "상태 미설정"}</span>
                  </div>
                ))
              ) : (
                <div className="emptyBox">현재 POS에 등록된 소개 업체가 없습니다.<br />추후 종합관리프로그램에서 등록하면 이곳에 자동 표시됩니다.</div>
              )}
            </div>
            <button className="dark full" onClick={() => setReferralModal(false)}>확인</button>
          </div>
        </div>
      )}

      {billingModal && (
        <div className="modal">
          <div className="modalBox wide" onClick={e => e.stopPropagation()}>
            <button className="xBtn" onClick={() => setBillingModal(false)}>×</button>
            <h2>월 이용료 상세</h2>
            <div className="billingDetailBox">
              <div><span>기본요금</span><b>{money(billingDetails.base)}</b></div>
              <div><span>추가옵션</span><b>{money(billingDetails.option)}</b></div>
              <div><span>할인 전 금액</span><b>{money(billingDetails.before)}</b></div>
              <div><span>{billingDetails.eventDiscountName}</span><b>{billingDetails.eventActive ? `${billingDetails.eventRate}% / -${money(billingDetails.eventDiscount)}` : "미적용"}</b></div>
              <div><span>소개할인</span><b>{billingDetails.count}곳 적용 / 1곳마다 {billingDetails.rate}%{billingDetails.referralDiscount > 0 ? ` / -${money(billingDetails.referralDiscount)}` : ""}</b></div>
              <div><span>적용 할인율</span><b>{billingDetails.totalDiscountRate}%</b></div>
              <div className="finalFee"><span>최종 월 이용료</span><b>{money(billingDetails.finalFee)}</b></div>
            </div>
            <p className="muted">신규 이벤트 기간에는 기본요금 10,000원 기준 50% 할인이 적용되어 월 5,000원으로 표시됩니다. 소개할인은 할인 적용 후 이용료 기준으로 10%씩 반복 적용됩니다. 실제 기간과 금액은 추후 종합관리프로그램 설정값을 기준으로 자동 반영됩니다.</p>
            <button className="dark full" onClick={() => setBillingModal(false)}>확인</button>
          </div>
        </div>
      )}


      {contactModal && (
        <div className="modal">
          <div className="modalBox wide" onClick={e => e.stopPropagation()}>
            <button className="xBtn" onClick={() => setContactModal(false)}>×</button>
            <h2>문의하기</h2>
            <p className="muted">자주 묻는 내용을 먼저 확인하고, 해결이 안 되면 카카오톡으로 문의를 남겨주세요.</p>
            <div className="faqGrid">
              <button onClick={() => alert("이용 연장은 월 이용료 입금 또는 카드결제 확인 후 처리됩니다. 결제 후 관리자에게 문의를 남겨주세요.")}>이용 연장 문의</button>
              <button onClick={() => alert(contactSettings?.bankMessage || "입금계좌는 이용정보/납부정보에서 확인할 수 있습니다.")}>입금 계좌 확인</button>
              <button onClick={() => alert(contactSettings?.cardMessage || "카드결제 링크가 필요하시면 관리자에게 문의를 남겨주세요.")}>카드결제 링크 요청</button>
              <button onClick={() => alert(contactSettings?.kitchenMessage || "주문서관리 옵션은 관리자에게 문의해주세요.")}>주문서 옵션 문의</button>
              <button onClick={() => alert(contactSettings?.referralMessage || "소개한 식당이 이용 중일 때 할인됩니다.")}>소개할인 문의</button>
              <button className="dark" onClick={openKakaoChannel}>관리자에게 카톡 남기기</button>
            </div>
          </div>
        </div>
      )}

      {kitchenPairModal && (
        <div className="modal">
          <div className="modalBox wide" onClick={e => e.stopPropagation()}>
            <button className="xBtn" onClick={() => setKitchenPairModal(false)}>×</button>
            <h2>주방기기 연결</h2>
            <div className="qrBox">
              <div className="fakeQr">QR</div>
              <div>
                <b>처음 1회만 주방 태블릿에서 QR을 스캔하세요.</b>
                <p>연결 후에는 주방 태블릿에 식당 정보가 저장되어 다음 실행부터 자동으로 주방 주문현황판이 열리도록 만들 예정입니다.</p>
                <p className="muted">주방화면 주소: {window.location.origin}{window.location.pathname}?kitchen=1&restaurant={RESTAURANT_ID}</p>
              </div>
            </div>
            <button className="green full" onClick={() => window.open(`${window.location.origin}${window.location.pathname}?kitchen=1&restaurant=${RESTAURANT_ID}`, "kitchen")}>주방화면 열기</button>
          </div>
        </div>
      )}

      {shortcutModal && (
        <div className="modal">
          <div className="modalBox wide">
            <button className="xBtn" onClick={() => setShortcutModal(false)}>×</button>
            <h2>바탕화면 바로가기 만들기</h2>
            <div className="guideBox">
              <h3>안드로이드 / 크롬</h3>
              <p>오른쪽 위 ⋮ 버튼 → 홈 화면에 추가 또는 앱 설치 → 추가</p>
              <p>홈화면 아이콘으로 다시 열면 주소창이 줄거나 앱처럼 열립니다. 그래도 주소창이 보이면 다음 단계에서 주소창 없는 전용 앱으로 포장하세요.</p>
              <h3>아이패드 / 아이폰 사파리</h3>
              <p>공유 버튼 → 홈 화면에 추가 → 추가</p>
              <h3>PC 크롬</h3>
              <p>주소창 오른쪽 설치 아이콘 또는 ⋮ → 저장 및 공유 → 바로가기 만들기</p>
            </div>
            <p className="muted">브라우저 보안 때문에 프로그램이 자동으로 아이콘을 만들 수는 없고, 마지막 추가 버튼은 사용자가 직접 눌러야 합니다.</p>
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

function Stats({ sales, credits, menus, restaurantName, menuIngredients = {}, messagePoints, subscription }) {
  const basicRange = defaultStatsRange();
  const [startDate, setStartDate] = useState(basicRange.startDate);
  const [endDate, setEndDate] = useState(basicRange.endDate);
  const [reportType, setReportType] = useState("basic");
  const [weekdayMode, setWeekdayMode] = useState(false);
  const [weekday, setWeekday] = useState("");
  const [quickRange, setQuickRange] = useState("1m");
  const statsPeriod = statsPeriodInfo(subscription);
  const hasAnyIngredients = Object.values(menuIngredients || {}).some(rows => normalizeIngredientRows(rows).length > 0);
  const labelForReport = type => statsPointText(effectiveStatsPointCost(type, weekdayMode, subscription), statsPeriod);
  const excelPointCost = statsPeriod.type === "free" ? 0 : statsPricingPolicy.prices.excel;
  const excelPointLabel = statsPointText(excelPointCost, statsPeriod);
  const selectReportType = type => {
    if (type === "ingredients" && !hasAnyIngredients) {
      window.alert("관리자모드에서 메뉴별 재료를 입력하시면 사용 가능합니다.\n포인트는 차감되지 않았습니다.");
      return;
    }
    setReportType(type);
  };

  const applyQuickRange = type => {
    const end = yesterdayValue();
    const start = type === "1y" ? addYearsValue(end, -1) : addMonthsValue(end, type === "2m" ? -2 : -1);
    setStartDate(start);
    setEndDate(end);
    setQuickRange(type);
  };
  const setManualStart = value => { setStartDate(value); setQuickRange(""); };
  const setManualEnd = value => { setEndDate(value); setQuickRange(""); };
  const toggleWeekdayMode = checked => {
    setWeekdayMode(checked);
    if (checked) {
      const range = defaultWeekdayStatsRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setQuickRange("2m");
      setWeekday("");
    } else {
      const range = defaultStatsRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setQuickRange("1m");
      setWeekday("");
    }
  };

  const filteredSales = useMemo(() => {
    const base = filterSalesByRange(sales, startDate, endDate);
    if (!weekdayMode || weekday === "") return base;
    return base.filter(sale => String(safeDateObj(saleTimeValue(sale))?.getDay()) === String(weekday));
  }, [sales, startDate, endDate, weekdayMode, weekday]);
  const exportSalesExcel = () => {
    const ok = window.confirm(`엑셀 다운로드에는 ${statsPricingPolicy.prices.excel}P가 사용될 예정입니다.\n현재 버전은 실제 포인트 차감 없이 다운로드만 진행합니다.`);
    if (!ok) return;
    const sheets = buildSalesWorkbook({ restaurantName, sales: filteredSales, credits, menus, startDate, endDate });
    downloadXlsx(`${restaurantName || "식당"}_판매통계_${startDate}_${endDate}_${timeName()}.xlsx`, sheets);
  };

  const byPay = {}, byService = {}, byHour = {}, byMenu = {}, menuDaily = {};
  const businessDays = new Set();
  filteredSales.forEach(sale => {
    const saleDate = dateText(saleTimeValue(sale));
    if (saleDate) businessDays.add(saleDate);
    const total = saleTotal(sale);
    byPay[sale.payment || "미지정"] = (byPay[sale.payment || "미지정"] || 0) + total;
    byService[saleService(sale)] = (byService[saleService(sale)] || 0) + total;
    const date = safeDateObj(saleTimeValue(sale));
    const hour = date ? `${date.getHours()}시` : "시간없음";
    byHour[hour] = (byHour[hour] || 0) + total;
    (sale.items || []).forEach(item => {
      if (item.service) return;
      const key = item.id || item.name;
      const menuName = item.name || menus.find(m => String(m.id) === String(key))?.name || "메뉴";
      byMenu[key] = byMenu[key] || { id: key, name: menuName, qty: 0, total: 0 };
      byMenu[key].qty += Number(item.qty || 0);
      byMenu[key].total += Number(item.qty || 0) * Number(item.price || 0);
      if (saleDate) {
        menuDaily[key] = menuDaily[key] || {};
        menuDaily[key][saleDate] = (menuDaily[key][saleDate] || 0) + Number(item.qty || 0);
      }
    });
  });
  menus.forEach(menu => {
    const key = menu.id || menu.name;
    if (!byMenu[key]) byMenu[key] = { id: key, name: menu.name, qty: 0, total: 0 };
  });
  const businessDayCount = businessDays.size;
  const menuEntries = Object.values(byMenu).sort((a, b) => b.total - a.total);
  const soldMenuEntries = menuEntries.filter(item => item.qty > 0);
  const lowEntries = [...soldMenuEntries].sort((a, b) => a.qty - b.qty).slice(0, 5);
  const zeroMenus = menus.filter(menu => !byMenu[menu.id || menu.name]?.qty);
  const totalSales = filteredSales.reduce((sum, sale) => sum + saleTotal(sale), 0);
  const totalOrders = filteredSales.length;
  const topMenu = soldMenuEntries[0];
  const pointCost = effectiveStatsPointCost(reportType, weekdayMode, subscription);
  const pointLabel = statsPointText(pointCost, statsPeriod);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekdayWaiting = weekdayMode && weekday === "";
  const noWeekdayRecords = weekdayMode && weekday !== "" && filteredSales.length === 0;
  const prepRows = soldMenuEntries.map(menu => {
    const dailyValues = Object.values(menuDaily[menu.id] || {});
    const avg = businessDayCount ? menu.qty / businessDayCount : 0;
    const max = dailyValues.length ? Math.max(...dailyValues) : 0;
    return { ...menu, avg, min: Math.ceil(avg), max: Math.max(Math.ceil(avg), max) };
  }).filter(row => row.qty > 0);

  const ingredientRows = prepRows.flatMap(menu => {
    const ingredients = normalizeIngredientRows(menuIngredients?.[menu.id] || []);
    return ingredients.map(ing => {
      const amount = Number(ing.amount || 0);
      return {
        menuName: menu.name,
        name: ing.name,
        min: Math.ceil((menu.min || 0) * amount * 10) / 10,
        max: Math.ceil((menu.max || 0) * amount * 10) / 10,
        unit: ing.unit || ""
      };
    });
  }).filter(row => row.name && (row.min || row.max));

  return (
    <>
      <div className="sectionHead statsTitleRow">
        <div>
          <h2>판매통계</h2>
          <p className="statsCatch">오늘 재료를 얼마나 준비할까요? 지난 판매기록을 기준으로 메뉴별 준비량을 알려드려요.</p>
        </div>
        <div className="pointMiniBadge">이용포인트 <b>{Number(messagePoints?.balance || 0).toLocaleString()}P</b></div>
      </div>
      <div className={`statsPolicyBox ${statsPeriod.type}`}>
        <b>통계 이용요금 · {statsPeriod.title}</b>
        <span>{statsPeriod.type === "free" ? "기본형 무료 · 종합형 무료 · 세부재료 무료 · 엑셀다운 무료" : `기본형 무료 · 종합형 ${statsPricingPolicy.prices.summary}P · 세부재료 ${statsPricingPolicy.prices.ingredients}P · 엑셀다운 ${statsPricingPolicy.prices.excel}P`}</span>
        <small>{statsPeriod.description} 요금 정책은 추후 종합관리프로그램에서 1개 문서로 관리하고, POS는 필요할 때만 읽어 캐시하는 구조로 연결할 예정입니다.</small>
      </div>
      <div className="statsControls">
        <div className="reportTypeBtns">
          <button className={reportType === "basic" ? "selected" : ""} onClick={() => selectReportType("basic")}>기본형 <small>{labelForReport("basic")}</small></button>
          <button className={reportType === "summary" ? "selected" : ""} onClick={() => selectReportType("summary")}>종합형 <small>{labelForReport("summary")}</small></button>
          <button className={reportType === "ingredients" ? "selected" : ""} disabled={!hasAnyIngredients} onClick={() => selectReportType("ingredients")} title={!hasAnyIngredients ? "관리자모드에서 메뉴별 재료를 입력하시면 사용 가능합니다." : ""}>세부재료분석형 <small>{hasAnyIngredients ? labelForReport("ingredients") : "재료 입력 후"}</small></button>
        </div>
        <div className="dateRange statsDateRange">
          <button className={quickRange === "1m" ? "activeRange" : ""} onClick={() => applyQuickRange("1m")}>최근 1달</button>
          <button className={quickRange === "2m" ? "activeRange" : ""} onClick={() => applyQuickRange("2m")}>최근 2달</button>
          <button className={quickRange === "1y" ? "activeRange" : ""} onClick={() => applyQuickRange("1y")}>최근 1년</button>
          <label>시작 <input type="date" value={startDate} onChange={e => setManualStart(e.target.value)} /></label>
          <label>종료 <input type="date" value={endDate} onChange={e => setManualEnd(e.target.value)} /></label>
          <button className="green" onClick={exportSalesExcel}>엑셀 다운로드 <small>{excelPointLabel}</small></button>
        </div>
        <div className="weekdayStatsLine">
          <label className="checkLabel"><input type="checkbox" checked={weekdayMode} onChange={e => toggleWeekdayMode(e.target.checked)} /> 요일별 통계 보기</label>
          {weekdayMode && <select value={weekday} onChange={e => setWeekday(e.target.value)}><option value="">요일 선택</option>{weekdays.map((day, index) => <option value={String(index)} key={day}>{day}요일</option>)}</select>}
          <span>일반 통계 기본은 최근 1달~어제, 요일별 통계 기본은 최근 2달~어제입니다.</span>
        </div>
      </div>
      {weekdayWaiting ? (
        <div className="statNoticeBox">요일별 통계를 보려면 요일을 선택해주세요. 선택 전에는 요일별 분석 내용이 표시되지 않습니다.</div>
      ) : noWeekdayRecords ? (
        <div className="statNoticeBox danger">선택한 기간에 해당 요일의 판매기록이 없습니다.<br />포인트는 차감되지 않았습니다.</div>
      ) : (
        <>
          <div className="summaryBox statsSummaryBox">
            <div><b>선택기간 매출</b><span>{money(totalSales)}</span></div>
            <div><b>주문건수</b><span>{totalOrders}건</span></div>
            <div><b>영업기준일</b><span>{businessDayCount}일</span></div>
            <div><b>통계 이용포인트</b><span>{pointLabel}</span></div>
          </div>
          <p className="muted">통계는 주문이 1건이라도 있었던 날만 영업기준일로 포함합니다. 주문이 없는 날은 휴무일 가능성이 있어 평균 계산에서 제외합니다.</p>

          {reportType === "basic" && (
            <div className="statsGrid">
              <div className="statBox"><h3>짧은 요약</h3><p>가장 많이 팔린 메뉴: <b>{topMenu ? `${topMenu.name} ${topMenu.qty}개` : "기록 없음"}</b></p><p>하루 평균 주문: <b>{businessDayCount ? (totalOrders / businessDayCount).toFixed(1) : 0}건</b></p><p>판매 없는 메뉴: <b>{zeroMenus.length ? zeroMenus.slice(0, 5).map(m => m.name).join(", ") : "없음"}</b></p></div>
              <Box title="결제방식별" data={byPay} />
              <Box title="식당/포장별" data={byService} />
              <div className="statBox"><h3>인기 메뉴 TOP</h3>{soldMenuEntries.slice(0, 5).map((menu, index) => <p key={menu.id}>{index + 1}. {menu.name}: {menu.qty}개</p>)}</div>
              <div className="statBox"><h3>팔리지 않는 메뉴</h3>{zeroMenus.length ? zeroMenus.map(menu => <p key={menu.id}>{menu.name}</p>) : <p>선택기간 내 모든 메뉴 판매 기록 있음</p>}</div>
            </div>
          )}

          {reportType === "summary" && (
            <div className="statsGrid wideStatsGrid">
              <div className="statBox fullStatBox"><h3>메뉴별 하루 준비 추천</h3>{prepRows.length ? prepRows.map(row => <p key={row.id}><b>{row.name}</b> · 총 {row.qty}개 / 하루 평균 {row.avg.toFixed(1)}개 / 하루 최대 {row.max}개 → <b>하루 {row.min}~{row.max}개 준비 추천</b></p>) : <p className="muted">선택 기간 판매 기록이 없습니다.</p>}</div>
              <div className="statBox"><h3>메뉴별 판매</h3>{soldMenuEntries.map(menu => <p key={menu.id}>{menu.name}: {menu.qty}개 / {money(menu.total)}</p>)}</div>
              <div className="statBox"><h3>판매 적은 메뉴</h3>{lowEntries.map(menu => <p key={menu.id}>{menu.name}: {menu.qty}개</p>)}</div>
              <Box title="시간대별" data={byHour} />
            </div>
          )}

          {reportType === "ingredients" && (
            hasAnyIngredients ? (
              <div className="statsGrid wideStatsGrid">
                <div className="statBox fullStatBox"><h3>세부 재료 준비 추천</h3>{ingredientRows.length ? ingredientRows.map((row, index) => <p key={`${row.menuName}-${row.name}-${index}`}><b>{row.menuName}</b> 기준 · {row.name}: <b>{row.min}~{row.max}{row.unit}</b></p>) : <p className="muted">입력된 재료가 있는 메뉴의 판매 기록이 있을 때 재료별 준비량이 표시됩니다.</p>}</div>
                <div className="statBox fullStatBox"><h3>메뉴별 기준 준비량</h3>{prepRows.map(row => <p key={row.id}>{row.name}: 하루 {row.min}~{row.max}개</p>)}</div>
              </div>
            ) : (
              <div className="statNoticeBox">관리자모드에서 메뉴별 재료를 입력하시면 사용 가능합니다.<br />포인트는 차감되지 않았습니다.</div>
            )
          )}
        </>
      )}
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
  const [ingredientOpen, setIngredientOpen] = useState(false);
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

        <div className="adminCard dataGuardCard">
          <h3>업데이트 데이터 보존 상태</h3>
          <div className="dataGuardGrid">
            <div><span>식당 ID</span><b>{props.restaurantId}</b></div>
            <div><span>데이터 구조</span><b>Schema V{props.schemaVersion}</b></div>
            <div><span>현재 POS</span><b>{VERSION}</b></div>
            <div><span>저장상태</span><b>{props.syncStatus || "확인중"}</b></div>
          </div>
          <p className="muted">메뉴, 외상장부, 판매기록, 재료설정, 이용포인트는 식당 ID 기준으로 Firebase에 저장됩니다. 앞으로 POS 버전이 올라가도 같은 식당 ID를 사용하면 기존 데이터가 이어지도록 설계합니다.</p>
          <p className="muted">V40에서 바로 V50으로 업데이트하는 경우도 대비할 수 있도록, 데이터 구조 버전(schemaVersion)을 저장하고 새 버전에서 이전 구조를 읽어오는 방향으로 관리합니다.</p>
        </div>

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
          <div className="adminMenu adminMenuHead"><b>품절</b><b>주방</b><b>메뉴</b><b>가격</b><b>구분</b><b>순서</b><b>삭제</b></div>
          {props.menus.map(menu => (
            <div className="adminMenu" key={menu.id}>
              <div className="soldOutCell"><input type="checkbox" checked={menu.soldOut || false} onChange={e => props.setMenus(prev => prev.map(item => item.id === menu.id ? { ...item, soldOut: e.target.checked } : item))} /></div>
              <div className="soldOutCell kitchenCell"><input type="checkbox" checked={menu.kitchenSend ?? defaultKitchenSendForCategory(menu.category)} onChange={e => props.setMenus(prev => prev.map(item => item.id === menu.id ? { ...item, kitchenSend: e.target.checked } : item))} /></div>
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



        <div className="adminCard ingredientSettingsBox">
          <div className="ingredientSettingsHead">
            <div>
              <h3>메뉴별 재료 설정</h3>
              <p className="muted">세부재료 통계를 보고 싶은 메뉴만 입력하세요. 재료는 한 줄에 한 가지씩 적으면 됩니다.</p>
            </div>
            <button type="button" onClick={() => setIngredientOpen(open => !open)}>{ingredientOpen ? "숨기기" : "펼치기"}</button>
          </div>
          {ingredientOpen && (
            <>
              <div className="ingredientExampleBox">
                <b>입력 예시</b>
                <p className="muted">아래 실제 입력칸과 같은 순서로 적으면 됩니다.</p>
                <div className="exampleInputRows">
                  <div className="ingredientRow exampleIngredientRow"><input value="재료명 예: 생태" readOnly /><input value="수량 예: 1" readOnly /><input value="단위 예: 마리" readOnly /><button type="button" disabled>삭제</button></div>
                  <div className="ingredientRow exampleIngredientRow"><input value="재료명 예: 다대기" readOnly /><input value="수량 예: 30" readOnly /><input value="단위 예: g" readOnly /><button type="button" disabled>삭제</button></div>
                  <div className="ingredientRow exampleIngredientRow"><input value="재료명 예: 무" readOnly /><input value="수량 예: 100" readOnly /><input value="단위 예: g" readOnly /><button type="button" disabled>삭제</button></div>
                </div>
              </div>
              <div className="ingredientList">
                {props.menus.map(menu => {
                  const rows = Array.isArray(props.menuIngredients?.[menu.id]) ? props.menuIngredients[menu.id] : [];
                  const visibleRows = rows.length ? rows : [{ name: "", amount: "", unit: "" }];
                  const saveRows = rows => props.setMenuIngredients(prev => ({ ...(prev || {}), [menu.id]: rows }));
                  const updateIngredientRow = (index, field, value) => {
                    const copy = [...visibleRows];
                    copy[index] = { ...(copy[index] || { name: "", amount: "", unit: "" }), [field]: value };
                    saveRows(copy);
                  };
                  const addIngredientRow = () => saveRows([...visibleRows, { name: "", amount: "", unit: "" }]);
                  const removeIngredientRow = index => {
                    const copy = visibleRows.filter((_, i) => i !== index);
                    saveRows(copy.length ? copy : []);
                  };
                  return (
                    <div className="ingredientMenuCard" key={menu.id}>
                      <div className="ingredientMenuHead"><b>{menu.emoji} {menu.name}</b><button type="button" onClick={addIngredientRow}>재료추가</button></div>
                      {visibleRows.map((row, index) => (
                        <div className="ingredientRow" key={`${menu.id}-${index}`}>
                          <input placeholder="재료명 예: 생태" value={row.name || ""} onChange={e => updateIngredientRow(index, "name", e.target.value)} />
                          <input type="number" step="0.1" placeholder="수량 예: 1" value={row.amount || ""} onChange={e => updateIngredientRow(index, "amount", e.target.value)} />
                          <input placeholder="단위 예: 마리" value={row.unit || ""} onChange={e => updateIngredientRow(index, "unit", e.target.value)} />
                          <button type="button" onClick={() => removeIngredientRow(index)}>삭제</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
            <label>화면 모드
              <select value={props.screenMode || "basic"} onChange={e => props.setScreenMode(e.target.value)}>
                <option value="basic">기본모드</option>
                <option value="table">테이블모드</option>
              </select>
            </label>
            <label>화면 표시 방식
              <select value={props.displayMode || "auto"} onChange={e => props.setDisplayMode(e.target.value)}>
                <option value="auto">자동배치 모드</option>
                <option value="scale">원본비율 유지 모드</option>
              </select>
            </label>
            <div className="screenModeHelp">
              <b>화면 표시 방식 안내</b>
              <p><b>자동배치 모드</b>는 기기 화면 크기에 맞춰 주문내역이 아래로 내려가는 등 위치가 자동 조정됩니다.</p>
              <p><b>원본비율 유지 모드</b>는 11~12인치 태블릿 기준 화면을 유지하면서, 현재 기기 가로폭에 맞춰 전체 화면을 비율대로 축소합니다.</p>
              <p>예시) 기준 화면 크기: 1200px × 800px(약 11~12인치 태블릿 기준)<br />현재 기기 가로폭이 1000px이면 전체 화면을 1000 / 1200 비율로 축소합니다.</p>
            </div>
            <label>테이블모드 자동복귀(초)<input type="number" min="1" value={props.tableAutoReturnSeconds} onChange={e => props.setTableAutoReturnSeconds(Number(e.target.value) || 10)} /></label>
            <label className="checkLabel"><input type="checkbox" checked={props.showReceiptPrint} onChange={e => props.setShowReceiptPrint(e.target.checked)} /> 결제완료 + 영수증 출력 버튼 표시</label>
            <label className={`checkLabel ${props.subscription?.kitchenOptionEnabled ? "" : "disabledCheck"}`}><input type="checkbox" disabled={!props.subscription?.kitchenOptionEnabled} checked={props.subscription?.kitchenOptionEnabled && props.kitchenSettings?.enabled === true} onChange={e => props.setKitchenSettings(prev => ({ ...(prev || defaultKitchenSettings()), enabled: e.target.checked }))} /> 주문서관리 / 주방전송 버튼 사용</label>
          </div>
          <div className={`kitchenAdminNote ${props.subscription?.kitchenOptionEnabled ? "active" : "locked"}`}>
            <b>주문서관리 옵션 {props.subscription?.kitchenOptionEnabled ? "사용중" : "미사용 🔒"}</b>
            <p>메뉴관리의 <b>주방</b> 체크가 켜진 메뉴만 [주문] 버튼으로 주방전송됩니다. 주류·음료·기타·포장용기는 기본 제외를 권장합니다.</p>
            {!props.subscription?.kitchenOptionEnabled && <p><b>유료 추가옵션입니다.</b> 사용을 원하시면 관리자에게 문의해주세요.</p>}
            <div className="kitchenAdminActions">
              <button disabled={!props.subscription?.kitchenOptionEnabled} onClick={props.openKitchenPair}>주방기기 연결 QR</button>
              <button disabled={!props.subscription?.kitchenOptionEnabled} onClick={props.openKitchenPair}>주방화면 열기</button>
            </div>
          </div>
          <div className="tableModeAdmin">
            <div className="tableModeAdminHead">
              <b>테이블 사각틀</b>
              <button onClick={() => props.setTableEditOpen(!props.tableEditOpen)}>{props.tableEditOpen ? "수정모드 닫기" : "테이블 사각틀 수정모드"}</button>
            </div>
            {props.tableEditOpen && (
              <div>
                <div className="floorEditTools">
                  <div className="tableSizeCtl"><b>테이블 크기</b><button onClick={() => props.changeTableSize(-10)}>-</button><button className="sizeReset" onClick={() => props.changeTableSize(0)}>{props.tableLayout?.tableSize || 100}</button><button onClick={() => props.changeTableSize(10)}>+</button></div>
                  <div className="markerDirectionPad compact"><b>표시 위치</b><button title="위쪽 배치" onClick={() => props.assignMarkerEdge("top")}>🔼 위</button><button title="왼쪽 배치" onClick={() => props.assignMarkerEdge("left")}>◀️ 왼쪽</button><button title="오른쪽 배치" onClick={() => props.assignMarkerEdge("right")}>오른쪽 ▶️</button><button title="아래쪽 배치" onClick={() => props.assignMarkerEdge("bottom")}>🔽 아래</button><button className="resetLayoutBtn" title="테이블 위치만 기본 배치로 되돌리기" onClick={props.resetTablePositions}>배치 초기화</button></div>
                </div>
                <div className="markerChecks">
                  {floorMarkers.map(marker => (
                    <label key={marker.id} className={props.tableLayout?.selectedMarkerId === marker.id ? "selectedMarker" : ""} onClick={() => props.setTableLayout(prev => ({ ...normalizeTableLayout(prev, props.tableCount), selectedMarkerId: marker.id }))}><input type="checkbox" checked={props.tableLayout?.markers?.[marker.id]?.visible === true} onChange={e => props.setTableLayout(prev => { const base = normalizeTableLayout(prev, props.tableCount); return { ...base, selectedMarkerId: marker.id, markers: { ...(base.markers || {}), [marker.id]: { ...(base.markers?.[marker.id] || { edge: "top", pos: 50 }), visible: e.target.checked } } }; })} /> {marker.icon} {marker.label}</label>
                  ))}
                </div>
                <p className="muted">표시 항목을 선택한 뒤 공통 화살표로 상/하/좌/우 외곽을 정하고, 사각틀 안에서는 손가락이나 마우스로 위치를 조정하세요.</p>
                {props.renderFloorPlan(true)}
              </div>
            )}
          </div>
          <div className="subscriptionSettings readOnlyBilling">
            <h4>이용정보 / 납부정보</h4>
            <div className="billingInfoGrid">
              <div><b>이용기간</b><span>{props.subscription?.expireDate ? `${formatKoreanDate(props.subscription.expireDate)}까지` : "미설정"}</span></div>
              <button className="billingClickBox" onClick={props.openBillingDetail}><b>월 이용료</b><span>{money(props.billingDetails?.finalFee || props.subscription?.monthlyFee || 0)}</span><small>클릭하면 기본요금/옵션/할인 상세를 볼 수 있습니다</small></button>
              <div className="accountInfoBox">
                <b>입금계좌</b>
                <span>{props.subscription?.bankName || "미설정"} {props.subscription?.accountNumber || ""}</span>
                <button className="copyBtn accountCopyBtn" onClick={props.copyAccountNumber}>계좌번호 복사</button>
              </div>
              <button className="billingClickBox" onClick={props.openReferralInfo}>
                <b>소개 할인</b>
                <span>{Number(props.subscription?.referralActiveCount || 0)}곳 적용중</span>
                <small>클릭하면 소개업체와 할인 안내를 볼 수 있습니다</small>
              </button>
              <button className="billingClickBox contactClickBox" onClick={props.openContactModal}>
                <b>문의하기</b>
                <span>관리자에게 연락 남기기</span>
                <small>FAQ 확인 후 카카오톡 문의로 연결됩니다</small>
              </button>
            </div>
            <div className="referralAdminNote">
              주변 식당을 소개해주시면 현재 월 이용료에서 <b>10% 추가 할인</b>됩니다.
            </div>
            <p className="muted">이용기간, 월 이용료, 입금계좌, 이벤트 할인, 소개할인은 식당 POS에서 수정하지 않고 추후 종합관리프로그램에서 자동 반영되도록 사용할 예정입니다.</p>
          </div>
          <div className="adminCard messagePointBox">
            <h3>이용포인트</h3>
            <div className="messagePointSummary">
              <div><b>현재 잔액</b><span>{Number(props.messagePoints?.balance || 0).toLocaleString()}P</span></div>
              <div><b>최근 사용내역</b><span>{props.messagePoints?.recentHistory?.[0]?.label || "사용내역 없음"}</span></div>
            </div>
            <button className="green disabledFeature" type="button" onClick={props.openMessagePointModal}>이용포인트 충전 요청</button>
            <p className="serviceReadyText">서비스 준비중 · 종합관리프로그램 연결 후 사용 가능합니다.</p>
            <p className="muted">추후 요청을 보내면 종합관리프로그램에 충전요청이 표시되고, 관리자 카톡 알림까지 연결할 예정입니다.</p>
            {!!props.messagePoints?.pendingRequests?.length && (
              <div className="pendingPointRequests">
                <b>최근 충전요청</b>
                {props.messagePoints.pendingRequests.slice(0, 3).map(req => <p key={req.id}>{new Date(req.createdAt).toLocaleDateString()} · {Number(req.amount || 0).toLocaleString()}원 → {Number(req.points || 0).toLocaleString()}P · {req.status}</p>)}
              </div>
            )}
          </div>
          <div className="adminCard contactSettingsBox">
            <h3>문의 연결 설정</h3>
            <div className="grid2">
              <label>카카오톡 채널 URL<input placeholder="https://pf.kakao.com/..." value={props.contactSettings?.kakaoChannelUrl || ""} onChange={e => props.setContactSettings(prev => ({ ...(prev || defaultContactSettings()), kakaoChannelUrl: e.target.value }))} /></label>
              <label>관리자 연락처<input placeholder="예: 010-0000-0000" value={props.contactSettings?.adminPhone || ""} onChange={e => props.setContactSettings(prev => ({ ...(prev || defaultContactSettings()), adminPhone: e.target.value }))} /></label>
            </div>
            <p className="muted">문의하기 버튼을 누르면 FAQ 안내 후 카카오톡 채널 또는 관리자 연락처로 연결됩니다. 카드결제/계좌/FAQ 상세 문구는 추후 종합관리프로그램에서 중앙 관리하는 방향으로 사용합니다.</p>
          </div>
          <div className="passwordRow">
            <label>새 비밀번호</label>
            <input type="password" placeholder="새 비밀번호" value={pass} onChange={e => setPass(e.target.value)} />
            <button onClick={() => { if (pass) { props.setAdminPw(pass); setPass(""); alert("비밀번호가 변경되었습니다"); } }}>비밀번호 변경</button>
          </div>
        </div>

        <div className="adminCard">
          <h3>바탕화면 바로가기</h3>
          <p className="muted">태블릿이나 핸드폰에서 링크를 매번 입력하지 않고 앱처럼 실행할 수 있게 안내합니다.</p>
          <button className="green" onClick={props.openShortcutGuide}>바탕화면 바로가기 만들기</button>
        </div>

        <div className="adminCard dangerCard">
          <h3>데이터 초기화</h3>
          <p className="muted">설치 후 테스트 주문을 지우고 실제 운영을 시작할 때 사용하세요. 메뉴와 설정은 유지할 수 있습니다.</p>
          <div className="resetGrid">
            <button onClick={props.resetSalesData}>판매내역/판매통계 초기화</button>
            <button onClick={props.resetCreditData}>외상장부 초기화</button>
            <button onClick={props.resetOrderData}>현재 주문내역 초기화</button>
            <button className="dangerBtn" onClick={props.resetOperatingData}>운영 데이터 전체 초기화</button>
          </div>
          <p className="muted">일반 초기화는 관리자 비밀번호 확인 후 실행됩니다. 외상장부와 운영 데이터 전체 초기화는 빨간 경고 확인 후 굵게 표시된 '초기화' 문구를 입력해야 합니다.</p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
