"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Eye, RefreshCw, CreditCard, CheckCircle, Plus, Minus, Trash2, Pencil, UtensilsCrossed, Search } from "lucide-react";

interface Outlet { id: number; name: string; }
interface Order {
  id: number; order_number: string; order_type: string; status: string;
  table_number: string | null; customer_name: string | null;
  subtotal: number; tax_amount: number; total: number;
  served_by_name: string | null; created_at: string;
}
interface OrderItem {
  id: number; item_name: string; quantity: number; unit_price: number;
  total_price: number; note: string | null;
  variants: { variant_name: string; option_name: string; price_modifier: number }[] | null;
  addons: { addon_name: string; price: number }[] | null;
}
interface OrderDetail extends Order { items: OrderItem[]; }
interface MenuItem {
  id: number; name: string; price: number; is_available: boolean;
  variant_count: number; addon_group_count: number; is_halal: boolean;
}
interface Category { id: number; name: string; }
interface VariantGroup {
  id: number; name: string; is_required: boolean;
  options: { id: number; name: string; price_modifier: number }[];
}
interface AddOnGroup {
  id: number; name: string; is_required: boolean; max_select: number | null;
  add_ons: { id: number; name: string; price: number }[];
}
interface ItemDetail { id: number; name: string; price: number; variants: VariantGroup[]; addons: AddOnGroup[]; }

const STATUS_COLOR: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  pending:   "bg-amber-100 text-amber-700",
  preparing: "bg-blue-100 text-blue-700",
  ready:     "bg-[#5C432B]/10 text-[#5C432B]",
  served:    "bg-purple-100 text-purple-700",
  closed:    "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const TYPE_LABEL: Record<string, string> = {
  dine_in: "Dine In", takeaway: "Takeaway", delivery: "Delivery", drive_thru: "Drive Thru",
};

const STATUS_FLOW: Record<string, string> = {
  pending: "preparing", preparing: "ready", ready: "served",
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" }, { value: "card", label: "Card" },
  { value: "grabpay", label: "GrabPay" }, { value: "gcash", label: "GCash" },
  { value: "ovo", label: "OVO" }, { value: "gopay", label: "GoPay" },
  { value: "promptpay", label: "PromptPay" }, { value: "zalopay", label: "ZaloPay" },
  { value: "qr_generic", label: "QR" },
];

const EDITABLE_STATUSES = ["pending", "preparing"];

export default function OrdersPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);

  // Edit order state
  const [editOrder, setEditOrder] = useState<OrderDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  // Menu picker inside edit
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  // Customisation within edit
  const [customItem, setCustomItem] = useState<ItemDetail | null>(null);
  const [customDialog, setCustomDialog] = useState(false);
  const [selVariants, setSelVariants] = useState<Record<number, { option_name: string; price_modifier: number }>>({});
  const [selAddons, setSelAddons] = useState<Record<number, { name: string; price: number }[]>>({});
  const [customQty, setCustomQty] = useState(1);

  // Payment
  const [payOrder, setPayOrder] = useState<Order | null>(null);
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

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    const url = `/api/orders?outlet_id=${outletId}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [outletId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function viewDetail(id: number) {
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    setDetail(data);
    setDetailOpen(true);
  }

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    await load();
    if (detail?.id === id) {
      const res = await fetch(`/api/orders/${id}`);
      setDetail(await res.json());
    }
  }

  // ── Edit order ──────────────────────────────────────────────────────────────
  async function openEdit(order: Order) {
    const res = await fetch(`/api/orders/${order.id}`);
    const data = await res.json();
    setEditOrder(data);
    setMenuSearch("");

    // Load categories for this outlet
    const catRes = await fetch(`/api/menu/categories?outlet_id=${outletId}`);
    const cats = await catRes.json();
    const catList = Array.isArray(cats) ? cats : [];
    setCategories(catList);
    if (catList.length) setSelectedCat(catList[0].id);

    setEditOpen(true);
  }

  useEffect(() => {
    if (!selectedCat) return;
    fetch(`/api/menu/items?category_id=${selectedCat}`).then(r => r.json()).then(d => {
      setMenuItems(Array.isArray(d) ? d.filter((i: MenuItem) => i.is_available) : []);
    });
  }, [selectedCat]);

  async function openCustomForEdit(item: MenuItem) {
    if (item.variant_count === 0 && item.addon_group_count === 0) {
      await addItemToOrder(item, 1, [], []);
      return;
    }
    const res = await fetch(`/api/menu/items/${item.id}`);
    const data = await res.json();
    setCustomItem(data);
    setSelVariants({});
    setSelAddons({});
    setCustomQty(1);
    setCustomDialog(true);
  }

  async function confirmCustomForEdit() {
    if (!customItem) return;
    const variants = Object.entries(selVariants).map(([gid, opt]) => {
      const g = customItem.variants.find(v => v.id === parseInt(gid));
      return { variant_name: g?.name ?? "", option_name: opt.option_name, price_modifier: parseFloat(String(opt.price_modifier)) || 0 };
    });
    const addons = Object.values(selAddons).flat().map(a => ({ addon_name: a.name, price: parseFloat(String(a.price)) || 0 }));
    const fakeItem = { ...customItem, is_available: true, is_halal: false, variant_count: 0, addon_group_count: 0 };
    setCustomDialog(false);
    await addItemToOrder(fakeItem, customQty, variants, addons);
  }

  async function addItemToOrder(
    item: { id: number; name: string; price: number },
    qty: number,
    variants: { variant_name: string; option_name: string; price_modifier: number }[],
    addons: { addon_name: string; price: number }[]
  ) {
    if (!editOrder) return;
    setEditSaving(true);
    const res = await fetch(`/api/orders/${editOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_items",
        items: [{
          item_id: item.id,
          item_name: item.name,
          quantity: qty,
          unit_price: parseFloat(String(item.price)) || 0,
          variants,
          addons,
        }],
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Failed to add item"); setEditSaving(false); return; }
    // Refresh edit order
    const refreshed = await fetch(`/api/orders/${editOrder.id}`);
    setEditOrder(await refreshed.json());
    setEditSaving(false);
    await load();
  }

  async function removeOrderItem(orderItemId: number) {
    if (!editOrder) return;
    setEditSaving(true);
    await fetch(`/api/orders/${editOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_item", order_item_id: orderItemId }),
    });
    const refreshed = await fetch(`/api/orders/${editOrder.id}`);
    setEditOrder(await refreshed.json());
    setEditSaving(false);
    await load();
  }

  async function updateItemQty(orderItemId: number, qty: number) {
    if (!editOrder || qty < 1) return;
    setEditSaving(true);
    await fetch(`/api/orders/${editOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_qty", order_item_id: orderItemId, quantity: qty }),
    });
    const refreshed = await fetch(`/api/orders/${editOrder.id}`);
    setEditOrder(await refreshed.json());
    setEditSaving(false);
    await load();
  }

  const filteredMenuItems = menuSearch.trim()
    ? menuItems.filter(i => i.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : menuItems;

  // ── Payment ──────────────────────────────────────────────────────────────────
  function openPayment(order: Order) {
    setPayOrder(order);
    setPayMethod("cash");
    setAmountPaid(parseFloat(String(order.total)).toFixed(2));
    setPayRef(""); setPayError(""); setPaySuccess(null);
    setPayDialog(true);
  }

  async function processPayment() {
    if (!payOrder || !outletId) return;
    setPaying(true); setPayError("");
    const paid = parseFloat(amountPaid) || parseFloat(String(payOrder.total));
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: payOrder.id, outlet_id: parseInt(outletId), amount_paid: paid,
        splits: [{ method: payMethod, amount: paid, reference: payRef || undefined }],
      }),
    });
    const data = await res.json();
    if (!res.ok) { setPayError(data.error ?? "Payment failed"); setPaying(false); return; }
    setPaySuccess({ change: parseFloat(data.change_given), payNum: data.payment_number });
    setPaying(false);
    await load();
  }

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: Column<Order>[] = [
    {
      key: "order_number", label: "Order", sortable: true,
      render: o => (
        <div>
          <p className="font-mono font-semibold text-gray-900 text-sm">{o.order_number}</p>
          <p className="text-xs text-gray-400">{TYPE_LABEL[o.order_type] ?? o.order_type}{o.table_number ? ` · Table ${o.table_number}` : ""}</p>
        </div>
      ),
    },
    {
      key: "status", label: "Status", sortable: true,
      render: o => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`}>
          {o.status}
        </span>
      ),
    },
    {
      key: "customer_name", label: "Customer",
      render: o => <span className="text-sm text-gray-700">{o.customer_name ?? <span className="text-gray-300">—</span>}</span>,
    },
    {
      key: "total", label: "Total",
      render: o => <span className="text-sm font-semibold text-gray-900">{parseFloat(String(o.total)).toFixed(2)}</span>,
    },
    {
      key: "created_at", label: "Time", sortable: true,
      render: o => (
        <span className="text-xs text-gray-500">
          {new Date(o.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: o => (
        <div className="flex items-center gap-1 justify-end">
          {STATUS_FLOW[o.status] && (
            <Button size="sm" className="h-7 text-xs px-2" onClick={() => updateStatus(o.id, STATUS_FLOW[o.status])} disabled={updating === o.id}>
              {updating === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : `→ ${STATUS_FLOW[o.status]}`}
            </Button>
          )}
          {EDITABLE_STATUSES.includes(o.status) && (
            <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1 border-[#5C432B]/20 text-[#5C432B] hover:bg-[#5C432B]/10" onClick={() => openEdit(o)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          )}
          {o.status === "served" && (
            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 gap-1" onClick={() => openPayment(o)}>
              <CreditCard className="w-3 h-3" /> Pay
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-[#5C432B]" onClick={() => viewDetail(o.id)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Header title="Orders" subtitle="All orders across the outlet" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <Select value={outletId} onValueChange={(v) => v && setOutletId(v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Select outlet" /></SelectTrigger>
            <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["pending","preparing","ready","served","closed","cancelled"].map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <DataTable data={orders} columns={columns} searchKeys={["order_number","customer_name","status"]} searchPlaceholder="Search orders..." pageSize={20} emptyMessage="No orders found." />
        )}
      </div>

      {/* ── Order Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order {detail?.order_number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLOR[detail.status]}`}>{detail.status}</span>
                <span className="text-xs text-gray-500">{TYPE_LABEL[detail.order_type]}</span>
                {detail.table_number && <span className="text-xs text-gray-500">Table {detail.table_number}</span>}
                {detail.customer_name && <span className="text-xs text-gray-500">{detail.customer_name}</span>}
              </div>
              <div className="divide-y divide-gray-100">
                {detail.items?.map(item => (
                  <div key={item.id} className="py-2.5">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-900">{item.item_name} × {item.quantity}</p>
                      <p className="text-sm font-semibold">{parseFloat(String(item.total_price)).toFixed(2)}</p>
                    </div>
                    {item.variants?.map((v, i) => <p key={i} className="text-xs text-gray-400">{v.variant_name}: {v.option_name}</p>)}
                    {item.addons?.map((a, i) => <p key={i} className="text-xs text-gray-400">+ {a.addon_name}</p>)}
                    {item.note && <p className="text-xs text-amber-600 italic">Note: {item.note}</p>}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{parseFloat(String(detail.subtotal)).toFixed(2)}</span></div>
                {detail.tax_amount > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Tax</span><span>{parseFloat(String(detail.tax_amount)).toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold text-gray-900"><span>Total</span><span>{parseFloat(String(detail.total)).toFixed(2)}</span></div>
              </div>
              {EDITABLE_STATUSES.includes(detail.status) && (
                <Button variant="outline" className="w-full gap-2 border-[#5C432B]/20 text-[#5C432B] hover:bg-[#5C432B]/10" onClick={() => { setDetailOpen(false); openEdit(detail); }}>
                  <Pencil className="w-4 h-4" /> Edit Order
                </Button>
              )}
              {STATUS_FLOW[detail.status] && (
                <Button className="w-full" onClick={() => updateStatus(detail.id, STATUS_FLOW[detail.status])}>
                  Move to {STATUS_FLOW[detail.status]}
                </Button>
              )}
              {detail.status === "served" && (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => { setDetailOpen(false); openPayment(detail); }}>
                  <CreditCard className="w-4 h-4" /> Collect Payment
                </Button>
              )}
              {["pending","preparing","ready"].includes(detail.status) && (
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => { updateStatus(detail.id, "cancelled"); setDetailOpen(false); }}>
                  Cancel Order
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Order Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex h-[85vh]">
            {/* Left: menu picker */}
            <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#5C432B]" />
                <p className="font-semibold text-sm text-gray-800">Add Items</p>
                {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 ml-auto" />}
              </div>
              {/* Category tabs */}
              <div className="border-b border-gray-100 px-3 overflow-x-auto">
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
              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Search items..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
              </div>
              {/* Items grid */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2">
                  {filteredMenuItems.map(item => (
                    <Button
                      key={item.id}
                      onClick={() => openCustomForEdit(item)}
                      disabled={editSaving}
                      variant="outline"
                      className="h-auto flex flex-col items-start justify-start p-3 rounded-xl"
                    >
                      <div className="w-full h-14 bg-[#5C432B]/10 rounded-lg flex items-center justify-center mb-2">
                        <UtensilsCrossed className="w-6 h-6 text-[#5C432B]/40" />
                      </div>
                      <p className="font-medium text-gray-900 text-xs leading-tight text-left">{item.name}</p>
                      <p className="text-[#5C432B] font-semibold text-xs mt-0.5">{parseFloat(String(item.price)).toFixed(2)}</p>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: current order items */}
            <div className="w-72 flex-shrink-0 flex flex-col bg-gray-50">
              <div className="px-4 py-3 border-b border-gray-200 bg-white">
                <p className="font-semibold text-sm text-gray-800">Order {editOrder?.order_number}</p>
                <p className="text-xs text-gray-400 capitalize">{editOrder?.status} · {TYPE_LABEL[editOrder?.order_type ?? ""] ?? editOrder?.order_type}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(editOrder?.items ?? []).length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">No items yet</p>
                ) : editOrder?.items.map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-3 border border-gray-100">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold text-gray-900 leading-tight flex-1">{item.item_name}</p>
                      <Button
                        onClick={() => removeOrderItem(item.id)}
                        disabled={editSaving}
                        variant="ghost"
                        size="icon"
                        className="text-gray-300 hover:text-red-500 h-auto w-auto p-0 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {item.variants?.map((v, i) => (
                      <p key={i} className="text-[10px] text-gray-400">{v.variant_name}: {v.option_name}</p>
                    ))}
                    {item.addons?.map((a, i) => (
                      <p key={i} className="text-[10px] text-gray-400">+ {a.addon_name}</p>
                    ))}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => updateItemQty(item.id, item.quantity - 1)}
                          disabled={editSaving || item.quantity <= 1}
                          variant="outline"
                          size="icon"
                          className="w-5 h-5 rounded-full"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </Button>
                        <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                        <Button
                          onClick={() => updateItemQty(item.id, item.quantity + 1)}
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
              {/* Totals */}
              <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{parseFloat(String(editOrder?.subtotal ?? 0)).toFixed(2)}</span></div>
                {parseFloat(String(editOrder?.tax_amount ?? 0)) > 0 && (
                  <div className="flex justify-between text-xs text-gray-500"><span>Tax</span><span>{parseFloat(String(editOrder?.tax_amount ?? 0)).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 text-sm"><span>Total</span><span className="text-[#5C432B]">{parseFloat(String(editOrder?.total ?? 0)).toFixed(2)}</span></div>
                <Button className="w-full mt-2 h-9" onClick={() => setEditOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Customisation Dialog (inside edit) ── */}
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
                      const sel = selVariants[group.id]?.option_name === opt.name;
                      return (
                        <Button
                          key={opt.id}
                          onClick={() => setSelVariants(s => ({ ...s, [group.id]: { option_name: opt.name, price_modifier: parseFloat(String(opt.price_modifier)) || 0 } }))}
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
                      const cur = selAddons[group.id] ?? [];
                      const sel = cur.some(a => a.name === addon.name);
                      return (
                        <Button
                          key={addon.id}
                          onClick={() => {
                            setSelAddons(s => {
                              const c = s[group.id] ?? [];
                              if (sel) return { ...s, [group.id]: c.filter(a => a.name !== addon.name) };
                              if (group.max_select && c.length >= group.max_select) return s;
                              return { ...s, [group.id]: [...c, { name: addon.name, price: parseFloat(String(addon.price)) || 0 }] };
                            });
                          }}
                          variant={sel ? "default" : "outline"}
                          className="rounded-full text-xs"
                        >
                          {addon.name}{parseFloat(String(addon.price)) > 0 ? ` +${parseFloat(String(addon.price)).toFixed(2)}` : ""}
                        </Button>
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
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCustomDialog(false)}>Cancel</Button>
            <Button className="flex-1" onClick={confirmCustomForEdit}>Add to Order</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ── */}
      <Dialog open={payDialog} onOpenChange={(open) => { if (!open) { setPayDialog(false); setPaySuccess(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Collect Payment — {payOrder?.order_number}</DialogTitle></DialogHeader>
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
              <Button className="w-full mt-2" onClick={() => { setPayDialog(false); setPaySuccess(null); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {payError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>}
              <div className="bg-[#5C432B]/10 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[#5C432B] font-medium">Order Total</span>
                <span className="text-lg font-bold text-[#5C432B]">{parseFloat(String(payOrder?.total ?? 0)).toFixed(2)}</span>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <Button
                      key={m.value}
                      onClick={() => setPayMethod(m.value)}
                      variant={payMethod === m.value ? "default" : "outline"}
                      className="rounded-lg text-xs font-medium"
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">{payMethod === "cash" ? "Cash Received" : "Amount"}</label>
                <Input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="text-lg font-semibold" />
                {payMethod === "cash" && parseFloat(amountPaid) > parseFloat(String(payOrder?.total ?? 0)) && (
                  <p className="text-xs text-emerald-600 mt-1">Change: {(parseFloat(amountPaid) - parseFloat(String(payOrder?.total ?? 0))).toFixed(2)}</p>
                )}
              </div>
              {payMethod !== "cash" && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Reference / Transaction ID</label>
                  <Input placeholder="Optional" value={payRef} onChange={e => setPayRef(e.target.value)} />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setPayDialog(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={processPayment} disabled={paying || !amountPaid}>
                  {paying && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
