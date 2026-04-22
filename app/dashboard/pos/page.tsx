"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, UtensilsCrossed, CheckCircle, CreditCard, Pencil, ArrowLeft } from "lucide-react";

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
  addons: { addon_name: string; price: number }[];
}
interface OrderItem {
  id: number; item_name: string; quantity: number; unit_price: number; total_price: number;
  variants: { variant_name: string; option_name: string; price_modifier: number }[] | null;
  addons: { addon_name: string; price: number }[] | null;
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
  const [note, setNote] = useState("");
  const [taxRate] = useState(0);
  const [placing, setPlacing] = useState(false);

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
  const [selectedAddons, setSelectedAddons] = useState<Record<number, { name: string; price: number }[]>>({});
  const [customQty, setCustomQty] = useState(1);

  // Payment dialog
  const [payDialog, setPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [payRef, setPayRef] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState<{ change: number; payNum: string } | null>(null);

  useEffect(() => {
    fetch("/api/outlets").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setOutlets(list);
      if (list.length) setOutletId(String(list[0].id));
    });
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
  }, [outletId]);

  useEffect(() => {
    if (!selectedCat) return;
    fetch(`/api/menu/items?category_id=${selectedCat}`).then(r => r.json()).then(d => {
      setItems(Array.isArray(d) ? d.filter((i: MenuItem) => i.is_available) : []);
    });
  }, [selectedCat]);

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
    const key = `${item.id}-${Date.now()}`;
    setCart(c => [...c, { key, item_id: item.id, item_name: item.name, quantity: qty, unit_price: parseFloat(String(item.price)) || 0, note: "", variants, addons }]);
  }

  function confirmCustom() {
    if (!customItem) return;
    const variants = Object.entries(selectedVariants).map(([gid, opt]) => {
      const g = customItem.variants.find(v => v.id === parseInt(gid));
      return { variant_name: g?.name ?? "", option_name: opt.option_name, price_modifier: parseFloat(String(opt.price_modifier)) || 0 };
    });
    const addons = Object.values(selectedAddons).flat().map(a => ({ addon_name: a.name, price: parseFloat(String(a.price)) || 0 }));
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

  const subtotal = cart.reduce((s, i) => {
    const varTotal = i.variants.reduce((a, v) => a + (parseFloat(String(v.price_modifier)) || 0), 0);
    const addonTotal = i.addons.reduce((a, ad) => a + (parseFloat(String(ad.price)) || 0), 0);
    return s + ((parseFloat(String(i.unit_price)) || 0) + varTotal + addonTotal) * i.quantity;
  }, 0);
  const taxAmt = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmt;

  async function placeOrder() {
    if (!cart.length || !outletId) return;
    setPlacing(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outlet_id: parseInt(outletId),
        table_id: tableId ? parseInt(tableId) : null,
        order_type: orderType,
        customer_name: customerName || undefined,
        customer_note: note || undefined,
        tax_rate: taxRate,
        items: cart.map(i => ({
          item_id: i.item_id,
          item_name: i.item_name,
          quantity: i.quantity,
          unit_price: parseFloat(String(i.unit_price)) || 0,
          note: i.note || undefined,
          variants: i.variants.map(v => ({ ...v, price_modifier: parseFloat(String(v.price_modifier)) || 0 })),
          addons: i.addons.map(a => ({ ...a, price: parseFloat(String(a.price)) || 0 })),
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setPlacing(false); alert(data.error ?? "Failed"); return; }
    setOrderNum(data.order_number);
    setOrderId(data.id);
    setOrderTotal(parseFloat(data.total));
    setOrderTaxAmt(parseFloat(data.tax_amount));
    setCart([]);
    setSuccess(true);
    setPlacing(false);
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
    addons: { addon_name: string; price: number }[]
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
  async function processPayment() {
    if (!orderId || !outletId) return;
    setPaying(true); setPayError("");
    const paid = parseFloat(amountPaid) || orderTotal;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        outlet_id: parseInt(outletId),
        amount_paid: paid,
        splits: [{ method: payMethod, amount: paid, reference: payRef || undefined }],
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
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Left — Menu */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <button onClick={doneEditing} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-gray-300">|</span>
            <p className="text-sm font-semibold text-gray-800">Editing <span className="font-mono text-indigo-600">{orderNum}</span></p>
            {editSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />}
          </div>
          <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
            <div className="flex gap-1 py-2">
              {categories.map(c => (
                <button key={c.id} onClick={() => setSelectedCat(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCat === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {c.name}
                </button>
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
                  <button key={item.id} onClick={() => openCustom(item)} disabled={editSaving}
                    className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-indigo-300 hover:shadow-sm transition-all active:scale-95 disabled:opacity-50">
                    <div className="w-full h-16 bg-indigo-50 rounded-lg flex items-center justify-center mb-2">
                      <UtensilsCrossed className="w-7 h-7 text-indigo-300" />
                    </div>
                    <p className="font-medium text-gray-900 text-xs leading-tight">{item.name}</p>
                    <p className="text-indigo-600 font-semibold text-xs mt-0.5">{parseFloat(String(item.price)).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Order items */}
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
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
                  <button onClick={() => removeEditItem(item.id)} disabled={editSaving} className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {item.variants?.map((v, i) => (
                  <p key={i} className="text-[10px] text-gray-400">{v.variant_name}: {v.option_name}</p>
                ))}
                {item.addons?.map((a, i) => (
                  <p key={i} className="text-[10px] text-gray-400">+ {a.addon_name}</p>
                ))}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateEditQty(item.id, item.quantity - 1)} disabled={editSaving || item.quantity <= 1}
                      className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-indigo-300 disabled:opacity-40">
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <button onClick={() => updateEditQty(item.id, item.quantity + 1)} disabled={editSaving}
                      className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-indigo-300 disabled:opacity-40">
                      <Plus className="w-2.5 h-2.5" />
                    </button>
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
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span><span className="text-indigo-700">{editOrderTotal.toFixed(2)}</span>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 font-semibold" onClick={doneEditing}>
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
                          <button key={opt.id} onClick={() => setSelectedVariants(s => ({ ...s, [group.id]: { option_name: opt.name, price_modifier: parseFloat(String(opt.price_modifier)) || 0 } }))}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${sel ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
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
                        const sel = groupSel.some(a => a.name === addon.name);
                        return (
                          <button key={addon.id} onClick={() => {
                            setSelectedAddons(s => {
                              const cur = s[group.id] ?? [];
                              if (sel) return { ...s, [group.id]: cur.filter(a => a.name !== addon.name) };
                              if (group.max_select && cur.length >= group.max_select) return s;
                              return { ...s, [group.id]: [...cur, { name: addon.name, price: parseFloat(String(addon.price)) || 0 }] };
                            });
                          }}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${sel ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                            {addon.name}{parseFloat(String(addon.price)) > 0 ? ` +${parseFloat(String(addon.price)).toFixed(2)}` : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <p className="text-xs font-medium text-gray-600">Quantity</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCustomQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-indigo-300"><Minus className="w-3 h-3" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{customQty}</span>
                    <button onClick={() => setCustomQty(q => q + 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-indigo-300"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomDialog(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={confirmCustom}>Add to Order</Button>
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
          <p className="text-lg font-bold text-indigo-700 mt-2">Total: {orderTotal.toFixed(2)}</p>
          <div className="flex flex-col gap-2 mt-6">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => { setPayDialog(true); setAmountPaid(orderTotal.toFixed(2)); setPayRef(""); setPayError(""); setPaySuccess(null); }}>
              <CreditCard className="w-4 h-4" /> Collect Payment
            </Button>
            <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={enterEditMode}>
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left — Menu */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap">
          <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Outlet" /></SelectTrigger>
            <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>

        <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
          <div className="flex gap-1 py-2">
            {categories.map(c => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCat === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No items found</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map(item => (
                <button key={item.id} onClick={() => openCustom(item)}
                  className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-indigo-300 hover:shadow-sm transition-all active:scale-95">
                  <div className="w-full h-20 bg-indigo-50 rounded-lg flex items-center justify-center mb-2">
                    <UtensilsCrossed className="w-8 h-8 text-indigo-300" />
                  </div>
                  <p className="font-medium text-gray-900 text-sm leading-tight">{item.name}</p>
                  <p className="text-indigo-600 font-semibold text-sm mt-1">{parseFloat(String(item.price)).toFixed(2)}</p>
                  {item.is_halal && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Halal</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            <p className="font-semibold text-gray-900 text-sm">Order</p>
            <span className="ml-auto text-xs text-gray-400">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={orderType} onValueChange={(v) => v && setOrderType(v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}</SelectContent>
            </Select>
            {orderType === "dine_in" && (
              <Select value={tableId} onValueChange={(v) => v && setTableId(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Table" /></SelectTrigger>
                <SelectContent>
                  {tables.map(t => <SelectItem key={t.id} value={String(t.id)} className="text-xs">Table {t.table_number}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          {(orderType === "takeaway" || orderType === "delivery") && (
            <Input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-2 h-8 text-xs" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : cart.map(item => {
            const varTotal = item.variants.reduce((a, v) => a + (parseFloat(String(v.price_modifier)) || 0), 0);
            const addonTotal = item.addons.reduce((a, ad) => a + (parseFloat(String(ad.price)) || 0), 0);
            const linePrice = ((parseFloat(String(item.unit_price)) || 0) + varTotal + addonTotal) * item.quantity;
            return (
              <div key={item.key} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 leading-tight flex-1">{item.item_name}</p>
                  <button onClick={() => removeItem(item.key)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {item.variants.map((v, i) => (
                  <p key={i} className="text-[10px] text-gray-400">{v.variant_name}: {v.option_name}{parseFloat(String(v.price_modifier)) ? ` +${parseFloat(String(v.price_modifier)).toFixed(2)}` : ""}</p>
                ))}
                {item.addons.map((a, i) => (
                  <p key={i} className="text-[10px] text-gray-400">+ {a.addon_name}{parseFloat(String(a.price)) ? ` +${parseFloat(String(a.price)).toFixed(2)}` : ""}</p>
                ))}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.key, -1)} className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-indigo-300">
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.key, 1)} className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-indigo-300">
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">{linePrice.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span><span>{subtotal.toFixed(2)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tax ({taxRate}%)</span><span>{taxAmt.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total</span><span className="text-indigo-700">{total.toFixed(2)}</span>
          </div>
          <Input placeholder="Order note..." value={note} onChange={e => setNote(e.target.value)} className="h-8 text-xs mt-1" />
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 font-semibold" disabled={cart.length === 0 || placing} onClick={placeOrder}>
            {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${sel ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
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
                      const sel = groupSel.some(a => a.name === addon.name);
                      return (
                        <button key={addon.id} onClick={() => {
                          setSelectedAddons(s => {
                            const cur = s[group.id] ?? [];
                            if (sel) return { ...s, [group.id]: cur.filter(a => a.name !== addon.name) };
                            if (group.max_select && cur.length >= group.max_select) return s;
                            return { ...s, [group.id]: [...cur, { name: addon.name, price: parseFloat(String(addon.price)) || 0 }] };
                          });
                        }}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${sel ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                          {addon.name}{parseFloat(String(addon.price)) > 0 ? ` +${parseFloat(String(addon.price)).toFixed(2)}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <p className="text-xs font-medium text-gray-600">Quantity</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCustomQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-indigo-300"><Minus className="w-3 h-3" /></button>
                  <span className="w-8 text-center text-sm font-semibold">{customQty}</span>
                  <button onClick={() => setCustomQty(q => q + 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-indigo-300"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialog(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={confirmCustom}>Add to Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={(open) => { if (!open && !paySuccess) setPayDialog(false); }}>
        <DialogContent className="sm:max-w-sm">
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
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setPayDialog(false); setSuccess(false); setOrderId(null); }}>New Order</Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/orders")}>View Orders</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {payError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>}
                <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-indigo-700 font-medium">Order Total</span>
                  <span className="text-lg font-bold text-indigo-800">{orderTotal.toFixed(2)}</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.value} onClick={() => setPayMethod(m.value)}
                        className={`py-2 px-1 rounded-lg text-xs font-medium border transition-colors ${payMethod === m.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{payMethod === "cash" ? "Cash Received" : "Amount"}</label>
                  <Input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="text-lg font-semibold" />
                  {payMethod === "cash" && parseFloat(amountPaid) > orderTotal && (
                    <p className="text-xs text-emerald-600 mt-1">Change: {(parseFloat(amountPaid) - orderTotal).toFixed(2)}</p>
                  )}
                </div>
                {payMethod !== "cash" && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Reference / Transaction ID</label>
                    <Input placeholder="Optional" value={payRef} onChange={e => setPayRef(e.target.value)} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayDialog(false)}>Back</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={processPayment} disabled={paying || !amountPaid}>
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
