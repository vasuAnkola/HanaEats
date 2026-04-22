"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ShoppingCart, Plus, Minus, X, CheckCircle } from "lucide-react";

interface QrSessionInfo {
  valid: boolean;
  table_number?: string;
  outlet_name?: string;
  tenant_id?: number;
  outlet_id?: number;
  table_id?: number;
}

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface MenuCategory {
  id: number;
  name: string;
  items: MenuItem[];
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface OrderStatus {
  order_number: string;
  status: string;
  items_count: number;
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending:   "Order Received",
  preparing: "Being Prepared",
  ready:     "Ready to Serve",
  served:    "Served",
  closed:    "Completed",
  cancelled: "Cancelled",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending:   "text-amber-600",
  preparing: "text-blue-600",
  ready:     "text-emerald-600",
  served:    "text-purple-600",
  closed:    "text-gray-500",
  cancelled: "text-red-500",
};

export default function QrMenuPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<QrSessionInfo | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [nameDialog, setNameDialog] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<{ order_number: string; status: string } | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/qr/${token}`)
      .then(r => r.json())
      .then((data: QrSessionInfo) => {
        setSessionInfo(data);
        if (data.valid) {
          fetch(`/api/qr/${token}/menu`)
            .then(r => r.json())
            .then((cats: MenuCategory[]) => {
              setMenu(Array.isArray(cats) ? cats : []);
              if (cats.length > 0) setActiveCategory(cats[0].id);
            })
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
  }, [token]);

  // Poll order status every 10s after order placed
  useEffect(() => {
    if (!orderResult || !token) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/qr/${token}/order/status`);
      const data = await res.json();
      if (data.order_number) setOrderStatus(data as OrderStatus);
    }, 10000);
    return () => clearInterval(interval);
  }, [orderResult, token]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: number, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, quantity: c.quantity + delta } : c);
      return updated.filter(c => c.quantity > 0);
    });
  }, []);

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  async function placeOrder() {
    if (!customerName.trim()) return;
    setPlacing(true);
    const res = await fetch(`/api/qr/${token}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customerName,
        items: cart.map(c => ({
          item_id: c.id,
          item_name: c.name,
          quantity: c.quantity,
          unit_price: c.price,
        })),
      }),
    });
    const data = await res.json();
    setPlacing(false);
    if (res.ok) {
      setOrderResult({ order_number: data.order_number, status: data.status });
      setCart([]);
      setCartOpen(false);
      setNameDialog(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!sessionInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">QR Code Invalid</h1>
          <p className="text-gray-500 text-sm">This QR code has expired or is no longer valid. Please ask staff for a new QR code.</p>
        </div>
      </div>
    );
  }

  const activeItems = menu.find(c => c.id === activeCategory)?.items ?? [];

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 pt-8 pb-6">
        <p className="text-indigo-200 text-sm">{sessionInfo.outlet_name}</p>
        <h1 className="text-2xl font-bold mt-1">Table {sessionInfo.table_number}</h1>
        <p className="text-indigo-200 text-sm mt-1">Scan & Order</p>
      </div>

      {/* Order result banner */}
      {orderResult && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">Order Placed!</span>
          </div>
          <p className="text-xs text-emerald-600">Order #{orderResult.order_number}</p>
          {orderStatus && (
            <p className={`text-xs font-medium mt-0.5 ${ORDER_STATUS_COLOR[orderStatus.status] ?? "text-gray-500"}`}>
              Status: {ORDER_STATUS_LABEL[orderStatus.status] ?? orderStatus.status}
            </p>
          )}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-gray-100 bg-white sticky top-0 z-10">
        {menu.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        {activeItems.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No items in this category</p>
        )}
        {activeItems.map(item => {
          const cartItem = cart.find(c => c.id === item.id);
          return (
            <div key={item.id} className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              {item.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-indigo-600 text-sm">
                    {item.price.toFixed(2)}
                  </span>
                  {cartItem ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-600 text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-indigo-600 text-white rounded-2xl py-4 flex items-center justify-between px-5 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{cartCount} item{cartCount > 1 ? "s" : ""}</span>
            </div>
            <span className="font-bold">{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart panel */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[80vh] flex flex-col max-w-md w-full mx-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-lg">Your Order</h2>
              <button onClick={() => setCartOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-right w-16">
                    {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 px-4 py-4">
              <div className="flex justify-between text-base font-bold mb-4">
                <span>Total</span>
                <span className="text-indigo-600">{cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setNameDialog(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name input dialog */}
      {nameDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNameDialog(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-2">Your Name</h3>
            <p className="text-sm text-gray-500 mb-4">So we can call out your order</p>
            <input
              type="text"
              placeholder="Enter your name"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setNameDialog(false)}
                className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={placeOrder}
                disabled={placing || !customerName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {placing && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
