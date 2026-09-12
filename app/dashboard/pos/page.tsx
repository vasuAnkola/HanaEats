"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, UtensilsCrossed, CheckCircle, CreditCard, Pencil, ArrowLeft, WifiOff, CloudUpload } from "lucide-react";
import { queueOrder, syncQueuedOrders, getQueuedOrders, newClientOrderId } from "@/lib/offline-queue";
import { useTourUser, usePageTour } from "@/lib/tour";
import { SpotlightTour } from "@/components/onboarding/spotlight-tour";
import { POS_STEPS } from "@/lib/page-tour-steps";

interface Outlet { id: number; name: string; }
interface Category { id: number; name: string; }
interface MenuItem {
  id: number; name: string; description: string | null; price: number;
  category_name: string; is_available: boolean; is_halal: boolean;
  variant_count: number; addon_group_count: number;
}
interface TableRow { id: number; table_number: string; status: string; }
interface CartItem {
  key: string; item_id: number; item_name: string; quantity: number;
  unit_price: number; note: string;
  variants: { variant_name: string; option_name: string; price_modifier: number }[];
  addons: { addon_name: string; price: number; quantity: number }[];
}
interface OrderItem {
  id: number; item_name: string; quantity: number; unit_price: number; total_price: number;
  variants: { variant_name: string; option_name: string; price_modifier: number }[] | null;
  addons: { addon_name: string; price: number; quantity: number }[] | null;
}
interface VariantGroup {
  id: number; name: string; is_required: boolean;
  options: { id: number; name: string; price_modifier: number }[];
}
interface AddOnGroup {
  id: number; name: string; is_required: boolean; max_select: number | null;
  add_ons: { id: number; name: string; price: number }[];
}
interface ItemDetail {
  id: number; name: string; price: number;
  variants: VariantGroup[]; addons: AddOnGroup[];
}

const ORDER_TYPES = [
  { value: "dine_in", label: "Dine In" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
  { value: "drive_thru", label: "Drive Thru" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "grabpay", label: "GrabPay" },
  { value: "gcash", label: "GCash" },
  { value: "ovo", label: "OVO" },
  { value: "gopay", label: "GoPay" },
  { value: "promptpay", label: "PromptPay" },
  { value: "zalopay", label: "ZaloPay" },
  { value: "qr_generic", label: "QR" },
];

export default function POSPage() {
  const router = useRouter();
  const { userId } = useTourUser();
  const pageTour = usePageTour("pos", userId);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [search, setSearch] = useState("");

  // New order cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("dine_in");
  const [tableId, setTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<{ id: number; name: string; phone: string | null; loyalty_points: number }[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [note, setNote] = useState("");
  const [taxRate] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [popularIds, setPopularIds] = useState<Set<number>>(new Set());
  const [upsell, setUpsell] = useState<{ id: number; name: string; price: number; times_together: number }[]>([]);

  // Success state
  const [success, setSuccess] = useState(false);
  const [orderNum, setOrderNum] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderTaxAmt, setOrderTaxAmt] = useState(0);

  // Edit mode — editing an existing order
  const [editMode, setEditMode] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([]);
  const [editOrderSubtotal, setEditOrderSubtotal] = useState(0);
  const [editOrderTotal, setEditOrderTotal] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

  // Item customisation dialog
  const [customDialog, setCustomDialog] = useState(false);
  const [customItem, setCustomItem] = useState<ItemDetail | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<number, { option_name: string; price_modifier: number }>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<number, { name: string; price: number; quantity: number }[]>>({});
  const [customQty, setCustomQty] = useState(1);

  // Payment dialog
  const [payDialog, setPayDialog] = useState(false);
  const [splitLines, setSplitLines] = useState<{ key: string; method: string; amount: string; reference: string }[]>([]);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState<{ change: number; payNum: string } | null>(null);
  const [currentShiftId, setCurrentShiftId] = useState<number | null>(null);

  // Discounts — an active promotion is offered automatically; a voucher code overrides it
  const [activePromotions, setActivePromotions] = useState<{ id: number; name: string; discount_type: string; discount_value: number; applies_to: string }[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: number; name: string; discount_type: string; discount_value: number } | null>(null);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length) setOutletId(String(list[0].id));
    });
  }, []);

  // ── Offline queue: sync any orders taken while the connection was down ───────
  useEffect(() => {
    setIsOnline(navigator.onLine);
    getQueuedOrders().then(q => setPendingSync(q.length)).catch(() => {});

    async function trySync() {
      const n = await syncQueuedOrders().catch(() => 0);
      if (n > 0) getQueuedOrders().then(q => setPendingSync(q.length)).catch(() => {});
    }
    function handleOnline() { setIsOnline(true); trySync(); }
    function handleOffline() { setIsOnline(false); }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    trySync();
    const interval = setInterval(trySync, 30000);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!outletId) return;
    fetch(`/api/menu/categories?outlet_id=${outletId}`).then(r => r.json()).then(d => {
      const cats = Array.isArray(d) ? d : [];
      setCategories(cats);
      if (cats.length) setSelectedCat(cats[0].id);
    });
    fetch(`/api/tables?outlet_id=${outletId}`).then(r => r.json()).then(d => {
      setTables(Array.isArray(d) ? d.filter((t: TableRow) => t.status === "available") : []);
    });
    fetch(`/api/shifts?outlet_id=${outletId}&status=open&mine=true`).then(r => r.json()).then(d => {
      setCurrentShiftId(Array.isArray(d) && d.length ? d[0].id : null);
    }).catch(() => setCurrentShiftId(null));
    fetch(`/api/promotions/active?outlet_id=${outletId}`).then(r => r.ok ? r.json() : []).then(d => {
      setActivePromotions(Array.isArray(d) ? d.filter((p: { applies_to: string }) => p.applies_to === "all") : []);
    }).catch(() => setActivePromotions([]));
  }, [outletId]);

  useEffect(() => {
    if (!selectedCat) return;
    fetch(`/api/menu/items?category_id=${selectedCat}`).then(r => r.json()).then(d => {
      setItems(Array.isArray(d) ? d.filter((i: MenuItem) => i.is_available) : []);
    });
  }, [selectedCat]);

  // Look up matching customer profiles as the name/phone field is typed, so a
  // purchase can actually be attached to someone for loyalty accrual.
  useEffect(() => {
    if (customerId || customerName.trim().length < 2) { setCustomerSuggestions([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(customerName.trim())}`).then(r => r.ok ? r.json() : []).then(d => {
        setCustomerSuggestions(Array.isArray(d) ? d.slice(0, 5) : []);
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [customerName, customerId]);

  // "Popular right now" badges — informs upselling without interrupting the flow
  useEffect(() => {
    if (!outletId) return;
    fetch(`/api/insights/popular?outlet_id=${outletId}`).then(r => r.ok ? r.json() : []).then(d => {
      setPopularIds(new Set(Array.isArray(d) ? d.map((p: { id: number }) => p.id) : []));
    }).catch(() => {});
  }, [outletId]);

  // Suggest what's frequently bought with whatever was just added to the cart
  useEffect(() => {
    if (!outletId || cart.length === 0) { setUpsell([]); return; }
    const lastItemId = cart[cart.length - 1].item_id;
    fetch(`/api/insights/upsell?outlet_id=${outletId}&item_id=${lastItemId}`).then(r => r.ok ? r.json() : []).then(d => {
      const inCart = new Set(cart.map(c => c.item_id));
      setUpsell(Array.isArray(d) ? d.filter((s: { id: number }) => !inCart.has(s.id)) : []);
    }).catch(() => {});
  }, [outletId, cart]);

  const filteredItems = search.trim()
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  // ── New order helpers ────────────────────────────────────────────────────────
  async function openCustom(item: MenuItem) {
    if (item.variant_count === 0 && item.addon_group_count === 0) {
      if (editMode) { await addToEditOrder(item, 1, [], []); return; }
      addToCart(item, 1, [], []);
      return;
    }
    const res = await fetch(`/api/menu/items/${item.id}`);
    const data = await res.json();
    setCustomItem(data);
    setSelectedVariants({});
    setSelectedAddons({});
    setCustomQty(1);
    setCustomDialog(true);
  }

  function addToCart(item: MenuItem, qty: number, variants: CartItem["variants"], addons: CartItem["addons"]) {
    // If no variants/addons, increment existing cart item instead of adding duplicate
    if (variants.length === 0 && addons.length === 0) {
      const existing = cart.find(c => c.item_id === item.id && c.variants.length === 0 && c.addons.length === 0);
      if (existing) {
        setCart(c => c.map(i => i.key === existing.key ? { ...i, quantity: i.quantity + qty } : i));
        return;
      }
    }
    const key = `${item.id}-${Date.now()}`;
    setCart(c => [...c, { key, item_id: item.id, item_name: item.name, quantity: qty, unit_price: parseFloat(String(item.price)) || 0, note: "", variants, addons }]);
  }

  function adjustAddonQty(group: AddOnGroup, addon: { id: number; name: string; price: number }, delta: number) {
    setSelectedAddons(s => {
      const cur = s[group.id] ?? [];
      const existing = cur.find(a => a.name === addon.name);
      const currentQty = existing?.quantity ?? 0;
      const newQty = currentQty + delta;
      if (newQty < 0) return s;
      const groupTotal = cur.reduce((sum, a) => sum + a.quantity, 0);
      if (delta > 0 && group.max_select && groupTotal >= group.max_select) return s;
      if (newQty === 0) return { ...s, [group.id]: cur.filter(a => a.name !== addon.name) };
      if (existing) return { ...s, [group.id]: cur.map(a => a.name === addon.name ? { ...a, quantity: newQty } : a) };
      return { ...s, [group.id]: [...cur, { name: addon.name, price: parseFloat(String(addon.price)) || 0, quantity: newQty }] };
    });
  }

  function confirmCustom() {
    if (!customItem) return;
    const variants = Object.entries(selectedVariants).map(([gid, opt]) => {
      const g = customItem.variants.find(v => v.id === parseInt(gid));
      return { variant_name: g?.name ?? "", option_name: opt.option_name, price_modifier: parseFloat(String(opt.price_modifier)) || 0 };
    });
    const addons = Object.values(selectedAddons).flat().map(a => ({ addon_name: a.name, price: parseFloat(String(a.price)) || 0, quantity: a.quantity }));
    if (editMode) {
      const fakeItem = { ...customItem, is_available: true, is_halal: false, variant_count: 0, addon_group_count: 0, description: null, category_name: "" };
      addToEditOrder(fakeItem, customQty, variants, addons);
    } else {
      const fakeItem = { ...customItem, category_name: "", is_available: true, is_halal: false, variant_count: 0, addon_group_count: 0, description: null };
      addToCart(fakeItem, customQty, variants, addons);
    }
    setCustomDialog(false);
  }

  function updateQty(key: string, delta: number) {
    setCart(c => c.map(i => i.key === key ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  }
  function removeItem(key: string) { setCart(c => c.filter(i => i.key !== key)); }

  async function editCartItem(cartItem: CartItem) {
    // Re-fetch item detail and open customization dialog with existing selections pre-filled
    const res = await fetch("/api/menu/items/" + cartItem.item_id);
    if (!res.ok) return;
    const detail: ItemDetail = await res.json();
    setCustomItem(detail);
    setCustomQty(cartItem.quantity);
    // Pre-fill selected variants from cart item
    const preVariants: Record<number, { option_name: string; price_modifier: number }> = {};
    detail.variants.forEach(g => {
      const existing = cartItem.variants.find(v => v.variant_name === g.name);
      if (existing) {
        preVariants[g.id] = { option_name: existing.option_name, price_modifier: existing.price_modifier };
      }
    });
    setSelectedVariants(preVariants);
    // Pre-fill addons
    const preAddons: Record<number, { name: string; price: number; quantity: number }[]> = {};
    detail.addons.forEach(g => {
      const matches = cartItem.addons.filter(a => g.add_ons.some(ao => ao.name === a.addon_name));
      if (matches.length) preAddons[g.id] = matches.map(a => ({ name: a.addon_name, price: a.price, quantity: a.quantity || 1 }));
    });
    setSelectedAddons(preAddons);
    // Remove old cart item, confirmCustom will re-add
    setCart(c => c.filter(i => i.key !== cartItem.key));
    setCustomDialog(true);
  }

  const subtotal = cart.reduce((s, i) => {
    const base = parseFloat(String(i.unit_price)) || 0;
    // If a variant has a non-zero price_modifier it represents the item price for that variant;
    // pick the highest (primary) variant price, otherwise fall back to base price.
    const varPrices = i.variants.map(v => parseFloat(String(v.price_modifier)) || 0).filter(p => p > 0);
    const effectiveBase = varPrices.length > 0 ? varPrices[0] : base;
    const addonTotal = i.addons.reduce((a, ad) => a + (parseFloat(String(ad.price)) || 0) * (ad.quantity || 1), 0);
    return s + (effectiveBase + addonTotal) * i.quantity;
  }, 0);
  const taxAmt = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmt;

  async function placeOrder() {
    if (!cart.length || !outletId) return;
    setPlacing(true);
    const clientOrderId = newClientOrderId();
    const payload = {
      outlet_id: parseInt(outletId),
      table_id: tableId ? parseInt(tableId) : null,
      order_type: orderType,
      customer_name: customerName || undefined,
      customer_id: customerId ?? undefined,
      customer_note: note || undefined,
      tax_rate: taxRate,
      client_order_id: clientOrderId,
      items: cart.map(i => ({
        item_id: i.item_id,
        item_name: i.item_name,
        quantity: i.quantity,
        unit_price: parseFloat(String(i.unit_price)) || 0,
        note: i.note || undefined,
        variants: i.variants.map(v => ({ ...v, price_modifier: parseFloat(String(v.price_modifier)) || 0 })),
        addons: i.addons.map(a => ({ ...a, price: parseFloat(String(a.price)) || 0 })),
      })),
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueOrderOffline(payload, clientOrderId);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setPlacing(false); alert(data.error ?? "Failed"); return; }
      setOrderNum(data.order_number);
      setOrderId(data.id);
      setOrderTotal(parseFloat(data.total));
      setOrderTaxAmt(parseFloat(data.tax_amount));
      setCart([]);
      setCustomerName(""); setCustomerId(null);
      setSuccess(true);
      setPlacing(false);
    } catch {
      // fetch throws on a dropped connection — fall back to the offline queue
      await queueOrderOffline(payload, clientOrderId);
    }
  }

  async function queueOrderOffline(payload: Record<string, unknown>, clientOrderId: string) {
    await queueOrder({ client_order_id: clientOrderId, payload, queued_at: new Date().toISOString() });
    setPendingSync(p => p + 1);
    setIsOnline(false);
    setQueuedOffline(true);
    setCart([]);
    setCustomerName(""); setCustomerId(null);
    setPlacing(false);
    setTimeout(() => setQueuedOffline(false), 4000);
  }

  // ── Edit mode helpers ────────────────────────────────────────────────────────
  async function enterEditMode() {
    if (!orderId) return;
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    setEditOrderItems(data.items ?? []);
    setEditOrderSubtotal(parseFloat(data.subtotal) || 0);
    setEditOrderTotal(parseFloat(data.total) || 0);
    setSuccess(false);
    setEditMode(true);
  }

  async function refreshEditOrder() {
    if (!orderId) return;
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    setEditOrderItems(data.items ?? []);
    setEditOrderSubtotal(parseFloat(data.subtotal) || 0);
    setEditOrderTotal(parseFloat(data.total) || 0);
  }

  async function addToEditOrder(
    item: { id: number; name: string; price: number },
    qty: number,
    variants: { variant_name: string; option_name: string; price_modifier: number }[],
    addons: { addon_name: string; price: number; quantity: number }[]
  ) {
    if (!orderId) return;
    setEditSaving(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_items",
        items: [{ item_id: item.id, item_name: item.name, quantity: qty, unit_price: parseFloat(String(item.price)) || 0, variants, addons }],
      }),
    });
    await refreshEditOrder();
    setEditSaving(false);
  }

  async function removeEditItem(orderItemId: number) {
    if (!orderId) return;
    setEditSaving(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_item", order_item_id: orderItemId }),
    });
    await refreshEditOrder();
    setEditSaving(false);
  }

  async function updateEditQty(orderItemId: number, qty: number) {
    if (!orderId || qty < 1) return;
    setEditSaving(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_qty", order_item_id: orderItemId, quantity: qty }),
    });
    await refreshEditOrder();
    setEditSaving(false);
  }

  function doneEditing() {
    setEditMode(false);
    setSuccess(true);
    setOrderTotal(editOrderTotal);
  }

  // ── Payment ──────────────────────────────────────────────────────────────────
  function computeDiscountPreview(discountType: string, discountValue: number, subtotal: number) {
    const raw = discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue;
    return parseFloat(Math.min(Math.max(raw, 0), subtotal).toFixed(2));
  }

  const discountAmount = appliedVoucher
    ? computeDiscountPreview(appliedVoucher.discount_type, appliedVoucher.discount_value, orderTotal)
    : selectedPromotionId
    ? (() => {
        const p = activePromotions.find(x => x.id === selectedPromotionId);
        return p ? computeDiscountPreview(p.discount_type, p.discount_value, orderTotal) : 0;
      })()
    : 0;
  const netTotal = parseFloat((orderTotal - discountAmount).toFixed(2));
  const splitTotal = splitLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const remaining = parseFloat((netTotal - splitTotal).toFixed(2));

  function openPayDialog() {
    setPayDialog(true);
    setSplitLines([{ key: `${Date.now()}`, method: "cash", amount: orderTotal.toFixed(2), reference: "" }]);
    setPayError(""); setPaySuccess(null);
    setSelectedPromotionId(activePromotions[0]?.id ?? null);
    setVoucherCode(""); setAppliedVoucher(null); setVoucherError("");
  }

  function addSplitLine() {
    setSplitLines(ls => [...ls, { key: `${Date.now()}`, method: "cash", amount: Math.max(0, remaining).toFixed(2), reference: "" }]);
  }
  function removeSplitLine(key: string) {
    setSplitLines(ls => ls.length > 1 ? ls.filter(l => l.key !== key) : ls);
  }
  function updateSplitLine(key: string, field: "method" | "amount" | "reference", value: string) {
    setSplitLines(ls => ls.map(l => l.key === key ? { ...l, [field]: value } : l));
  }

  async function applyVoucher() {
    if (!voucherCode.trim()) return;
    setVoucherChecking(true); setVoucherError("");
    const res = await fetch("/api/vouchers/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: voucherCode.trim(), order_amount: orderTotal }),
    });
    const data = await res.json();
    setVoucherChecking(false);
    if (!data.valid) { setVoucherError(data.reason ?? "Invalid voucher"); return; }
    setAppliedVoucher({ id: data.voucher.id, name: data.voucher.name, discount_type: data.voucher.discount_type, discount_value: parseFloat(data.voucher.discount_value) });
    setSelectedPromotionId(null);
  }
  function clearVoucher() {
    setAppliedVoucher(null); setVoucherCode(""); setVoucherError("");
  }

  async function processPayment() {
    if (!orderId || !outletId) return;
    setPaying(true); setPayError("");
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        outlet_id: parseInt(outletId),
        shift_id: currentShiftId,
        voucher_id: appliedVoucher?.id,
        promotion_id: !appliedVoucher ? selectedPromotionId : undefined,
        splits: splitLines
          .filter(l => (parseFloat(l.amount) || 0) > 0)
          .map(l => ({ method: l.method, amount: parseFloat(l.amount) || 0, reference: l.reference || undefined })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setPayError(data.error ?? "Payment failed"); setPaying(false); return; }
    setPaySuccess({ change: parseFloat(data.change_given), payNum: data.payment_number });
    setPaying(false);
  }

  // ── Edit mode screen ─────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50">
        {/* Left — Menu */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <Button onClick={doneEditing} variant="ghost" className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary hover:bg-brand-section font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
            <span className="text-gray-200">|</span>
            <p className="text-sm font-semibold text-gray-800">Editing <span className="font-mono text-brand-primary">{orderNum}</span></p>
            {editSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />}
          </div>
          <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
            <div className="flex gap-1 py-2">
              {categories.map(c => (
                <Button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  variant={selectedCat === c.id ? "default" : "outline"}
                  className="rounded-full text-xs font-medium whitespace-nowrap"
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input placeholder="Search items to add..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No items found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredItems.map(item => (
                  <Button
                    key={item.id}
                    onClick={() => openCustom(item)}
                    disabled={editSaving}
                    variant="outline"
                    className="h-auto flex flex-col items-start justify-start p-3 rounded-xl"
                  >
                    <div className="w-full h-16 bg-brand-primary rounded-lg flex items-center justify-center mb-2">
                      <UtensilsCrossed className="w-7 h-7 text-white opacity-80" />
                    </div>
                    <p className="font-medium text-gray-900 text-xs leading-tight text-left">{item.name}</p>
                    <p className="text-brand-primary font-bold text-xs mt-0.5">{parseFloat(String(item.price)).toFixed(2)}</p>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Order items */}
        <div className="w-full md:w-80 flex-shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col min-h-[45vh] md:min-h-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-sm text-gray-800">Current Items</p>
            <p className="text-xs text-gray-400">Tap items on left to add · Use controls to remove or change qty</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
            {editOrderItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No items on this order</div>
            ) : editOrderItems.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 leading-tight flex-1">{item.item_name}</p>
                  <Button
                    onClick={() => removeEditItem(item.id)}
                    disabled={editSaving}
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 hover:text-red-500 h-auto w-auto p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {item.variants?.map((v, i) => (
                  <p key={i} className="text-[10px] text-gray-400">{v.variant_name}: {v.option_name}</p>
                ))}
                {item.addons?.map((a, i) => (
                  <p key={i} className="text-[10px] text-gray-400">+ {a.quantity > 1 ? `${a.quantity}× ` : ""}{a.addon_name}</p>
                ))}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => updateEditQty(item.id, item.quantity - 1)}
                      disabled={editSaving || item.quantity <= 1}
                      variant="outline"
                      size="icon"
                      className="w-5 h-5 rounded-full"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </Button>
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <Button
                      onClick={() => updateEditQty(item.id, item.quantity + 1)}
                      disabled={editSaving}
                      variant="outline"
                      size="icon"
                      className="w-5 h-5 rounded-full"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">{parseFloat(String(item.total_price)).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span><span>{editOrderSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span><span className="text-brand-primary">{editOrderTotal.toFixed(2)}</span>
            </div>
            <Button className="w-full h-10 font-semibold" onClick={doneEditing}>
              Done Editing
            </Button>
          </div>
        </div>

        {/* Customisation Dialog */}
        <Dialog open={customDialog} onOpenChange={setCustomDialog}>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{customItem?.name}</DialogTitle></DialogHeader>
            {customItem && (
              <div className="space-y-4 py-2">
                {customItem.variants?.map(group => (
                  <div key={group.id}>
                    <p className="text-xs font-semibold text-gray-700 mb-2">{group.name} {group.is_required && <span className="text-red-500">*</span>}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map(opt => {
                        const sel = selectedVariants[group.id]?.option_name === opt.name;
                        return (
                          <Button
                            key={opt.id}
                            onClick={() => setSelectedVariants(s => ({ ...s, [group.id]: { option_name: opt.name, price_modifier: parseFloat(String(opt.price_modifier)) || 0 } }))}
                            variant={sel ? "default" : "outline"}
                            className="rounded-full text-xs"
                          >
                            {opt.name}{parseFloat(String(opt.price_modifier)) !== 0 ? ` +${parseFloat(String(opt.price_modifier)).toFixed(2)}` : ""}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {customItem.addons?.map(group => (
                  <div key={group.id}>
                    <p className="text-xs font-semibold text-gray-700 mb-2">{group.name}{group.max_select ? ` (max ${group.max_select})` : ""} {group.is_required && <span className="text-red-500">*</span>}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.add_ons?.map(addon => {
                        const groupSel = selectedAddons[group.id] ?? [];
                        const qty = groupSel.find(a => a.name === addon.name)?.quantity ?? 0;
                        if (qty === 0) {
                          return (
                            <Button
                              key={addon.id}
                              type="button"
                              onClick={() => adjustAddonQty(group, addon, 1)}
                              variant="outline"
                              className="rounded-full text-xs"
                            >
                              {addon.name}{parseFloat(String(addon.price)) > 0 ? ` +${parseFloat(String(addon.price)).toFixed(2)}` : ""}
                            </Button>
                          );
                        }
                        return (
                          <div key={addon.id} className="flex items-center gap-2 rounded-full border border-brand-primary bg-brand-primary text-white pl-3 pr-1.5 py-1">
                            <span className="text-xs font-semibold whitespace-nowrap">{addon.name}</span>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => adjustAddonQty(group, addon, -1)} className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="w-4 text-center text-xs font-bold tabular-nums">{qty}</span>
                              <button type="button" onClick={() => adjustAddonQty(group, addon, 1)} className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <p className="text-xs font-medium text-gray-600">Quantity</p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCustomQty(q => Math.max(1, q - 1))}
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 rounded-full"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{customQty}</span>
                    <Button
                      onClick={() => setCustomQty(q => q + 1)}
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 rounded-full"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomDialog(false)}>Cancel</Button>
              <Button onClick={confirmCustom}>Add to Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (success && !payDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h2>
          <p className="text-gray-500 mb-1">Order <span className="font-mono font-semibold">{orderNum}</span> sent to kitchen</p>
          <p className="text-lg font-bold text-brand-primary mt-2">Total: {orderTotal.toFixed(2)}</p>
          <div className="flex flex-col gap-2 mt-6">
            <Button className="gap-2" onClick={openPayDialog}>
              <CreditCard className="w-4 h-4" /> Collect Payment
            </Button>
            <Button variant="outline" className="gap-2 border-brand-gold text-brand-primary hover:bg-brand-section" onClick={enterEditMode}>
              <Pencil className="w-4 h-4" /> Edit Order
            </Button>
            <Button variant="outline" onClick={() => { setSuccess(false); setOrderId(null); }}>New Order</Button>
            <Button variant="ghost" className="text-gray-400 text-sm" onClick={() => router.push("/dashboard/orders")}>View All Orders</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main POS screen ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50">
      <SpotlightTour steps={POS_STEPS} run={pageTour.run} onFinish={pageTour.finish} />
      {/* Left — Menu */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {(!isOnline || pendingSync > 0 || queuedOffline) && (
          <div className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 ${!isOnline ? "bg-amber-50 text-amber-700" : "bg-brand-section text-brand-primary"}`}>
            {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <CloudUpload className="w-3.5 h-3.5" />}
            {!isOnline
              ? `You're offline — orders are being saved on this device${pendingSync > 0 ? ` (${pendingSync} queued)` : ""} and will sync automatically once you're back online.`
              : pendingSync > 0
              ? `Syncing ${pendingSync} queued order${pendingSync > 1 ? "s" : ""}...`
              : "Queued order synced."}
          </div>
        )}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
          <div data-tour="pos-outlet" className="contents">
            <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Outlet" /></SelectTrigger>
              <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>

        <div data-tour="pos-categories" className="bg-white border-b border-gray-100 px-4 overflow-x-auto">
          <div className="flex gap-1 py-2">
            {categories.map(c => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCat === c.id ? "bg-brand-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-brand-section hover:text-brand-primary"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No items found</div>
          ) : (
            <div data-tour="pos-menu-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map(item => (
                <button key={item.id} onClick={() => openCustom(item)}
                  className="relative bg-white border border-gray-100 rounded-xl p-3 text-left hover:border-brand-gold hover:shadow-md transition-all active:scale-95">
                  {popularIds.has(item.id) && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full ring-1 ring-orange-200 flex items-center gap-0.5">🔥 Popular</span>
                  )}
                  <div className="w-full h-20 bg-brand-light rounded-lg flex items-center justify-center mb-2.5">
                    <UtensilsCrossed className="w-8 h-8 text-white opacity-90" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
                  <p className="text-brand-primary font-bold text-sm mt-1">{parseFloat(String(item.price)).toFixed(2)}</p>
                  {item.is_halal && <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full mt-1 ring-1 ring-emerald-200">Halal</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <div data-tour="pos-cart" className="w-full md:w-80 flex-shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col min-h-[45vh] md:min-h-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-brand-primary" />
            <p className="font-bold text-gray-900 text-sm">Current Order</p>
            <span className="ml-auto text-xs font-semibold text-brand-primary bg-brand-section px-2 py-0.5 rounded-full">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div data-tour="pos-order-type" className="contents">
              <Select value={orderType} onValueChange={(v) => v && setOrderType(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {orderType === "dine_in" && (
              <Select value={tableId} onValueChange={(v) => v && setTableId(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Table" /></SelectTrigger>
                <SelectContent>
                  {tables.map(t => <SelectItem key={t.id} value={String(t.id)} className="text-xs">Table {t.table_number}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="relative mt-2">
            <Input
              placeholder="Customer name or phone (optional)"
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); setCustomerId(null); setShowCustomerSuggestions(true); }}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
              className="h-8 text-xs"
            />
            {customerId && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                linked
              </span>
            )}
            {showCustomerSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {customerSuggestions.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => { setCustomerName(c.name); setCustomerId(c.id); setCustomerSuggestions([]); setShowCustomerSuggestions(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-brand-section flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="text-gray-400">{c.phone ?? ""} · {c.loyalty_points}pts</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-12 h-12 rounded-xl bg-brand-section flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-6 h-6 text-brand-gold" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Select items to start an order</p>
            </div>
          ) : cart.map(item => {
            const _base = parseFloat(String(item.unit_price)) || 0;
            const _varPrices = item.variants.map(v => parseFloat(String(v.price_modifier)) || 0).filter(p => p > 0);
            const _effectiveBase = _varPrices.length > 0 ? _varPrices[0] : _base;
            const addonTotal = item.addons.reduce((a, ad) => a + (parseFloat(String(ad.price)) || 0) * (ad.quantity || 1), 0);
            const linePrice = (_effectiveBase + addonTotal) * item.quantity;
            return (
              <div key={item.key} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 leading-tight flex-1">{item.item_name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => editCartItem(item)} className="text-gray-300 hover:text-brand-orange transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeItem(item.key)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {item.variants.map((v, i) => (
                  <p key={i} className="text-[10px] text-gray-400">{v.variant_name}: {v.option_name}{parseFloat(String(v.price_modifier)) ? ` +${parseFloat(String(v.price_modifier)).toFixed(2)}` : ""}</p>
                ))}
                {item.addons.map((a, i) => (
                  <p key={i} className="text-[10px] text-gray-400">+ {a.quantity > 1 ? `${a.quantity}× ` : ""}{a.addon_name}{parseFloat(String(a.price)) ? ` +${(parseFloat(String(a.price)) * a.quantity).toFixed(2)}` : ""}</p>
                ))}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.key, -1)} className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-brand-gold hover:bg-brand-section">
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.key, 1)} className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-brand-gold hover:bg-brand-section">
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">{linePrice.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {upsell.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-amber-50/50">
            <p className="text-[11px] font-semibold text-amber-700 mb-1.5">Customers often add</p>
            <div className="flex flex-wrap gap-1.5">
              {upsell.slice(0, 3).map(s => (
                <button key={s.id}
                  onClick={() => addToCart({ id: s.id, name: s.name, price: s.price, description: null, category_name: "", is_available: true, is_halal: false, variant_count: 0, addon_group_count: 0 }, 1, [], [])}
                  className="text-xs font-medium bg-white border border-amber-200 text-amber-800 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors">
                  + {s.name} · {parseFloat(String(s.price)).toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span><span>{subtotal.toFixed(2)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tax ({taxRate}%)</span><span>{taxAmt.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base">
            <span>Total</span><span className="text-brand-primary">{total.toFixed(2)}</span>
          </div>
          <Input placeholder="Order note..." value={note} onChange={e => setNote(e.target.value)} className="h-8 text-xs mt-1" />
          {orderType === "dine_in" && !tableId && (
            <p className="text-[11px] text-amber-600">Select a table before placing a dine-in order.</p>
          )}
          <Button
            data-tour="pos-place-order"
            className="w-full h-11 font-bold text-base shadow-sm"
            disabled={cart.length === 0 || placing || (orderType === "dine_in" && !tableId)}
            onClick={placeOrder}
          >
            {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
            Place Order · {total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Customisation Dialog */}
      <Dialog open={customDialog} onOpenChange={setCustomDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{customItem?.name}</DialogTitle></DialogHeader>
          {customItem && (
            <div className="space-y-4 py-2">
              {customItem.variants?.map(group => (
                <div key={group.id}>
                  <p className="text-xs font-semibold text-gray-700 mb-2">{group.name} {group.is_required && <span className="text-red-500">*</span>}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map(opt => {
                      const sel = selectedVariants[group.id]?.option_name === opt.name;
                      return (
                        <button key={opt.id} onClick={() => setSelectedVariants(s => ({ ...s, [group.id]: { option_name: opt.name, price_modifier: parseFloat(String(opt.price_modifier)) || 0 } }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${sel ? "bg-brand-primary text-white border-brand-primary shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-brand-gold"}`}>
                          {opt.name}{parseFloat(String(opt.price_modifier)) !== 0 ? ` +${parseFloat(String(opt.price_modifier)).toFixed(2)}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {customItem.addons?.map(group => (
                <div key={group.id}>
                  <p className="text-xs font-semibold text-gray-700 mb-2">{group.name}{group.max_select ? ` (max ${group.max_select})` : ""} {group.is_required && <span className="text-red-500">*</span>}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.add_ons?.map(addon => {
                      const groupSel = selectedAddons[group.id] ?? [];
                      const qty = groupSel.find(a => a.name === addon.name)?.quantity ?? 0;
                      if (qty === 0) {
                        return (
                          <button key={addon.id} type="button" onClick={() => adjustAddonQty(group, addon, 1)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-brand-gold transition-all">
                            {addon.name}{parseFloat(String(addon.price)) > 0 ? ` +${parseFloat(String(addon.price)).toFixed(2)}` : ""}
                          </button>
                        );
                      }
                      return (
                        <div key={addon.id} className="flex items-center gap-2 rounded-full border border-brand-primary bg-brand-primary text-white pl-3 pr-1.5 py-1">
                          <span className="text-xs font-semibold whitespace-nowrap">{addon.name}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => adjustAddonQty(group, addon, -1)} className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-4 text-center text-xs font-bold tabular-nums">{qty}</span>
                            <button type="button" onClick={() => adjustAddonQty(group, addon, 1)} className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <p className="text-xs font-medium text-gray-600">Quantity</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCustomQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-brand-gold hover:bg-brand-section"><Minus className="w-3 h-3" /></button>
                  <span className="w-8 text-center text-sm font-semibold">{customQty}</span>
                  <button onClick={() => setCustomQty(q => q + 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-brand-gold hover:bg-brand-section"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialog(false)}>Cancel</Button>
            <Button onClick={confirmCustom}>Add to Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={(open) => { if (!open && !paySuccess) setPayDialog(false); }}>
        <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
          {paySuccess ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-semibold text-gray-900">Payment Received!</p>
              <p className="text-xs text-gray-500">{paySuccess.payNum}</p>
              {paySuccess.change > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-700 font-medium">Change to return</p>
                  <p className="text-2xl font-bold text-amber-800">{paySuccess.change.toFixed(2)}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => { setPayDialog(false); setSuccess(false); setOrderId(null); }}>New Order</Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/orders")}>View Orders</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {payError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>}
                {!currentShiftId && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">No shift open — this payment won&apos;t be counted in a shift reconciliation. Open one from Shifts first.</p>
                )}

                <div className="bg-brand-section border border-brand-section rounded-xl px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-primary">Order Total</span>
                    <span className="font-semibold text-brand-primary">{orderTotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-700">Discount {appliedVoucher ? `(${appliedVoucher.name})` : ""}</span>
                      <span className="font-semibold text-emerald-700">−{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-brand-gold">
                    <span className="text-sm font-semibold text-brand-primary">Amount Due</span>
                    <span className="text-xl font-bold text-brand-primary">{netTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Promotions & voucher */}
                <div className="space-y-2">
                  {activePromotions.length > 0 && !appliedVoucher && (
                    <label className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <input type="checkbox" checked={!!selectedPromotionId} onChange={e => setSelectedPromotionId(e.target.checked ? activePromotions[0].id : null)} />
                      <span className="text-amber-800">🎉 {activePromotions[0].name} active — apply {activePromotions[0].discount_type === "percentage" ? `${activePromotions[0].discount_value}% off` : `${activePromotions[0].discount_value} off`}</span>
                    </label>
                  )}
                  {appliedVoucher ? (
                    <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <span className="text-emerald-800 font-medium">Voucher &quot;{appliedVoucher.name}&quot; applied</span>
                      <button onClick={clearVoucher} className="text-emerald-600 hover:text-emerald-800 underline">Remove</button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-1.5">
                        <Input placeholder="Voucher code" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} className="h-8 text-xs" />
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={applyVoucher} disabled={voucherChecking || !voucherCode.trim()}>
                          {voucherChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                      {voucherError && <p className="text-[11px] text-red-600 mt-1">{voucherError}</p>}
                    </div>
                  )}
                </div>

                {/* Split payment lines */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600">Payment{splitLines.length > 1 ? "s" : ""}</label>
                    <button onClick={addSplitLine} className="text-xs text-brand-primary hover:text-brand-primary font-medium">+ Split payment</button>
                  </div>
                  {splitLines.map(line => (
                    <div key={line.key} className="border border-gray-200 rounded-lg p-2 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <select value={line.method} onChange={e => updateSplitLine(line.key, "method", e.target.value)}
                          className="flex-1 h-8 text-xs border border-gray-200 rounded-md px-2">
                          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <Input type="number" min="0" step="0.01" value={line.amount} onChange={e => updateSplitLine(line.key, "amount", e.target.value)} className="h-8 text-xs w-24 font-semibold" />
                        {splitLines.length > 1 && (
                          <button onClick={() => removeSplitLine(line.key)} className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                      {line.method !== "cash" && (
                        <Input placeholder="Reference / Transaction ID (optional)" value={line.reference} onChange={e => updateSplitLine(line.key, "reference", e.target.value)} className="h-7 text-xs" />
                      )}
                    </div>
                  ))}
                  <div className={`flex items-center justify-between text-xs font-medium px-1 ${remaining === 0 ? "text-emerald-600" : remaining > 0 ? "text-amber-600" : "text-brand-primary"}`}>
                    <span>{remaining > 0 ? "Remaining" : remaining < 0 ? "Change" : "Fully covered"}</span>
                    <span>{Math.abs(remaining).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayDialog(false)}>Back</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={processPayment} disabled={paying || remaining > 0 || splitTotal <= 0}>
                  {paying && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Payment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
