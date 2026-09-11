"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "th", label: "ไทย (Thai)" },
  { code: "ms", label: "Bahasa Malaysia" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "tl", label: "Tagalog" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Core dashboard vocabulary — nav labels, POS actions, common verbs/nouns used
// across the app. Not every screen is fully localized; this covers the words
// staff see most often on the floor (nav, POS, order types, payment methods).
const DICT: Record<LangCode, Record<string, string>> = {
  en: {
    dashboard: "Dashboard", overview: "Overview", tenants: "Tenants", countries: "Countries",
    outlets: "Outlets", team: "Team", menu: "Menu", pos: "POS", new_order: "New Order",
    orders: "Orders", tables: "Tables", reservations: "Reservations", qr_codes: "QR Codes",
    delivery: "Delivery", payments: "Payments", shifts: "Shifts", inventory: "Inventory",
    customers: "Customers", vouchers: "Vouchers", promotions: "Promotions", staff: "Staff",
    reports: "Reports", settings: "Settings", service: "Service", kitchen: "Kitchen", kds: "KDS",
    search: "Search", add: "Add", save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete",
    total: "Total", subtotal: "Subtotal", tax: "Tax", discount: "Discount", change: "Change",
    dine_in: "Dine In", takeaway: "Takeaway", drive_thru: "Drive Thru",
    cash: "Cash", card: "Card", table: "Table", customer: "Customer", place_order: "Place Order",
    collect_payment: "Collect Payment", order_placed: "Order Placed!", language: "Language",
  },
  th: {
    dashboard: "แดชบอร์ด", overview: "ภาพรวม", tenants: "ผู้เช่า", countries: "ประเทศ",
    outlets: "สาขา", team: "ทีม", menu: "เมนู", pos: "ขายหน้าร้าน", new_order: "ออเดอร์ใหม่",
    orders: "ออเดอร์", tables: "โต๊ะ", reservations: "การจอง", qr_codes: "คิวอาร์โค้ด",
    delivery: "เดลิเวอรี่", payments: "การชำระเงิน", shifts: "กะทำงาน", inventory: "คลังสินค้า",
    customers: "ลูกค้า", vouchers: "คูปอง", promotions: "โปรโมชั่น", staff: "พนักงาน",
    reports: "รายงาน", settings: "ตั้งค่า", service: "บริการ", kitchen: "ครัว", kds: "จอครัว",
    search: "ค้นหา", add: "เพิ่ม", save: "บันทึก", cancel: "ยกเลิก", edit: "แก้ไข", delete: "ลบ",
    total: "รวม", subtotal: "ยอดรวมย่อย", tax: "ภาษี", discount: "ส่วนลด", change: "เงินทอน",
    dine_in: "ทานที่ร้าน", takeaway: "กลับบ้าน", drive_thru: "ไดรฟ์ทรู",
    cash: "เงินสด", card: "บัตร", table: "โต๊ะ", customer: "ลูกค้า", place_order: "สั่งอาหาร",
    collect_payment: "รับชำระเงิน", order_placed: "สั่งอาหารสำเร็จ!", language: "ภาษา",
  },
  ms: {
    dashboard: "Papan Pemuka", overview: "Ikhtisar", tenants: "Penyewa", countries: "Negara",
    outlets: "Cawangan", team: "Pasukan", menu: "Menu", pos: "POS", new_order: "Pesanan Baharu",
    orders: "Pesanan", tables: "Meja", reservations: "Tempahan", qr_codes: "Kod QR",
    delivery: "Penghantaran", payments: "Bayaran", shifts: "Syif", inventory: "Inventori",
    customers: "Pelanggan", vouchers: "Baucar", promotions: "Promosi", staff: "Kakitangan",
    reports: "Laporan", settings: "Tetapan", service: "Perkhidmatan", kitchen: "Dapur", kds: "KDS",
    search: "Cari", add: "Tambah", save: "Simpan", cancel: "Batal", edit: "Sunting", delete: "Padam",
    total: "Jumlah", subtotal: "Jumlah Kecil", tax: "Cukai", discount: "Diskaun", change: "Baki",
    dine_in: "Makan Di Sini", takeaway: "Bungkus", drive_thru: "Drive-Thru",
    cash: "Tunai", card: "Kad", table: "Meja", customer: "Pelanggan", place_order: "Buat Pesanan",
    collect_payment: "Kutip Bayaran", order_placed: "Pesanan Berjaya!", language: "Bahasa",
  },
  id: {
    dashboard: "Dasbor", overview: "Ikhtisar", tenants: "Penyewa", countries: "Negara",
    outlets: "Gerai", team: "Tim", menu: "Menu", pos: "POS", new_order: "Pesanan Baru",
    orders: "Pesanan", tables: "Meja", reservations: "Reservasi", qr_codes: "Kode QR",
    delivery: "Pengiriman", payments: "Pembayaran", shifts: "Sif", inventory: "Inventaris",
    customers: "Pelanggan", vouchers: "Voucher", promotions: "Promosi", staff: "Staf",
    reports: "Laporan", settings: "Pengaturan", service: "Layanan", kitchen: "Dapur", kds: "KDS",
    search: "Cari", add: "Tambah", save: "Simpan", cancel: "Batal", edit: "Ubah", delete: "Hapus",
    total: "Total", subtotal: "Subtotal", tax: "Pajak", discount: "Diskon", change: "Kembalian",
    dine_in: "Makan di Tempat", takeaway: "Bawa Pulang", drive_thru: "Drive-Thru",
    cash: "Tunai", card: "Kartu", table: "Meja", customer: "Pelanggan", place_order: "Buat Pesanan",
    collect_payment: "Terima Pembayaran", order_placed: "Pesanan Berhasil Dibuat!", language: "Bahasa",
  },
  vi: {
    dashboard: "Bảng Điều Khiển", overview: "Tổng Quan", tenants: "Đối Tác", countries: "Quốc Gia",
    outlets: "Chi Nhánh", team: "Nhóm", menu: "Thực Đơn", pos: "Bán Hàng", new_order: "Đơn Mới",
    orders: "Đơn Hàng", tables: "Bàn", reservations: "Đặt Bàn", qr_codes: "Mã QR",
    delivery: "Giao Hàng", payments: "Thanh Toán", shifts: "Ca Làm Việc", inventory: "Kho Hàng",
    customers: "Khách Hàng", vouchers: "Phiếu Giảm Giá", promotions: "Khuyến Mãi", staff: "Nhân Viên",
    reports: "Báo Cáo", settings: "Cài Đặt", service: "Phục Vụ", kitchen: "Bếp", kds: "Màn Hình Bếp",
    search: "Tìm Kiếm", add: "Thêm", save: "Lưu", cancel: "Hủy", edit: "Sửa", delete: "Xóa",
    total: "Tổng Cộng", subtotal: "Tạm Tính", tax: "Thuế", discount: "Giảm Giá", change: "Tiền Thối",
    dine_in: "Tại Chỗ", takeaway: "Mang Đi", drive_thru: "Drive-Thru",
    cash: "Tiền Mặt", card: "Thẻ", table: "Bàn", customer: "Khách Hàng", place_order: "Đặt Đơn",
    collect_payment: "Thu Tiền", order_placed: "Đặt Đơn Thành Công!", language: "Ngôn Ngữ",
  },
  tl: {
    dashboard: "Dashboard", overview: "Pangkalahatang-ideya", tenants: "Mga Tenant", countries: "Mga Bansa",
    outlets: "Mga Sangay", team: "Koponan", menu: "Menu", pos: "POS", new_order: "Bagong Order",
    orders: "Mga Order", tables: "Mga Mesa", reservations: "Mga Reserbasyon", qr_codes: "QR Codes",
    delivery: "Delivery", payments: "Mga Bayad", shifts: "Mga Shift", inventory: "Imbentaryo",
    customers: "Mga Kustomer", vouchers: "Mga Voucher", promotions: "Mga Promo", staff: "Kawani",
    reports: "Mga Ulat", settings: "Mga Setting", service: "Serbisyo", kitchen: "Kusina", kds: "KDS",
    search: "Maghanap", add: "Magdagdag", save: "I-save", cancel: "Kanselahin", edit: "I-edit", delete: "Burahin",
    total: "Kabuuan", subtotal: "Subtotal", tax: "Buwis", discount: "Diskwento", change: "Sukli",
    dine_in: "Kain Dito", takeaway: "Bitbit", drive_thru: "Drive-Thru",
    cash: "Cash", card: "Card", table: "Mesa", customer: "Kustomer", place_order: "I-order",
    collect_payment: "Kolektahin ang Bayad", order_placed: "Naisumite ang Order!", language: "Wika",
  },
};

interface I18nContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
  /** Translate a human label (e.g. "QR Codes") by normalizing it to a dict key; falls back to the label itself if untranslated. */
  tn: (label: string) => string;
}

function normalize(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, "_");
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => DICT.en[key] ?? key,
  tn: (label: string) => label,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("hanaeats_lang") as LangCode | null) : null;
    if (stored && DICT[stored]) setLangState(stored);

    fetch("/api/account").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.language && DICT[d.language as LangCode]) {
        setLangState(d.language);
        localStorage.setItem("hanaeats_lang", d.language);
      }
    }).catch(() => {});
  }, []);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    localStorage.setItem("hanaeats_lang", next);
    fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    }).catch(() => {});
  }, []);

  const t = useCallback((key: string) => DICT[lang]?.[key] ?? DICT.en[key] ?? key, [lang]);
  const tn = useCallback((label: string) => DICT[lang]?.[normalize(label)] ?? label, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t, tn }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
