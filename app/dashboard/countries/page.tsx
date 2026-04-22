"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Check, X, ToggleLeft, ToggleRight, Plus } from "lucide-react";

interface Country {
  id: number;
  name: string;
  code: string;
  currency_code: string;
  currency_symbol: string;
  tax_name: string | null;
  tax_rate: string;
  is_active: boolean;
}

const FLAG: Record<string, string> = {
  SG: "🇸🇬", MY: "🇲🇾", TH: "🇹🇭", ID: "🇮🇩",
  PH: "🇵🇭", VN: "🇻🇳", MM: "🇲🇲", KH: "🇰🇭",
  LA: "🇱🇦", BN: "🇧🇳",
};

const EMPTY_FORM = { name: "", code: "", currency_code: "", currency_symbol: "", tax_name: "", tax_rate: "0" };

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ tax_name: "", tax_rate: "" });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch("/api/countries?all=1");
    const data = await res.json();
    setCountries(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Country) {
    setEditId(c.id);
    setEditForm({ tax_name: c.tax_name ?? "", tax_rate: c.tax_rate });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    await fetch(`/api/countries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tax_name: editForm.tax_name || null,
        tax_rate: parseFloat(editForm.tax_rate) || 0,
      }),
    });
    setEditId(null);
    setSaving(false);
    await load();
  }

  async function toggleActive(c: Country) {
    setTogglingId(c.id);
    await fetch(`/api/countries/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    setTogglingId(null);
    await load();
  }

  async function addCountry() {
    setAdding(true);
    setAddError("");
    const res = await fetch("/api/countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addForm.name,
        code: addForm.code.toUpperCase(),
        currency_code: addForm.currency_code.toUpperCase(),
        currency_symbol: addForm.currency_symbol,
        tax_name: addForm.tax_name || undefined,
        tax_rate: parseFloat(addForm.tax_rate) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error ?? "Failed to add country");
      setAdding(false);
      return;
    }
    setShowAdd(false);
    setAddForm(EMPTY_FORM);
    setAdding(false);
    await load();
  }

  const columns: Column<Country>[] = [
    {
      key: "name",
      label: "Country",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="text-xl">{FLAG[c.code] ?? "🌏"}</span>
          <div>
            <p className="font-medium text-gray-900">{c.name}</p>
            <p className="text-xs text-gray-400 font-mono">{c.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "currency_code",
      label: "Currency",
      sortable: true,
      render: (c) => (
        <div>
          <p className="text-sm font-medium text-gray-800">{c.currency_code}</p>
          <p className="text-xs text-gray-400">{c.currency_symbol}</p>
        </div>
      ),
    },
    {
      key: "tax_name",
      label: "Tax",
      render: (c) => c.tax_name ? (
        <span className="text-sm text-gray-700">{c.tax_name} <span className="text-gray-400">{c.tax_rate}%</span></span>
      ) : <span className="text-gray-300 text-sm">—</span>,
    },
    {
      key: "is_active",
      label: "Status",
      render: (c) => (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
          {c.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-40",
      render: (c) => (
        <div className="flex items-center gap-1 justify-end">
          {editId === c.id ? (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
              <Input
                value={editForm.tax_name}
                onChange={(e) => setEditForm((f) => ({ ...f, tax_name: e.target.value }))}
                placeholder="Tax name"
                className="h-6 text-xs w-20 px-2"
              />
              <Input
                type="number"
                value={editForm.tax_rate}
                onChange={(e) => setEditForm((f) => ({ ...f, tax_rate: e.target.value }))}
                placeholder="%"
                className="h-6 text-xs w-14 px-2"
                min="0" max="100" step="0.01"
              />
              <Button size="sm" className="h-6 w-6 p-0" onClick={() => saveEdit(c.id)} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </Button>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setEditId(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost" size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-[#5C432B] hover:bg-[#5C432B]/10"
                title="Edit tax"
                onClick={() => startEdit(c)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                title={c.is_active ? "Deactivate" : "Activate"}
                onClick={() => toggleActive(c)}
                disabled={togglingId === c.id}
              >
                {togglingId === c.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : c.is_active
                    ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                    : <ToggleLeft className="w-4 h-4" />
                }
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const toolbar = (
    <Button
      className="gap-2 h-9"
      onClick={() => { setAddError(""); setAddForm(EMPTY_FORM); setShowAdd(true); }}
    >
      <Plus className="w-4 h-4" /> Add Country
    </Button>
  );

  return (
    <div>
      <Header />
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <DataTable
            data={countries}
            columns={columns}
            searchKeys={["name", "code", "currency_code"]}
            searchPlaceholder="Search countries..."
            pageSize={15}
            emptyMessage="No countries found."
            toolbar={toolbar}
          />
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Country</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Country Name</label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Singapore"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Country Code (2 letters)</label>
                <Input
                  className="mt-1 uppercase"
                  placeholder="SG"
                  maxLength={2}
                  value={addForm.code}
                  onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Currency Code (3 letters)</label>
                <Input
                  className="mt-1 uppercase"
                  placeholder="SGD"
                  maxLength={3}
                  value={addForm.currency_code}
                  onChange={(e) => setAddForm((f) => ({ ...f, currency_code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Currency Symbol</label>
                <Input
                  className="mt-1"
                  placeholder="$"
                  maxLength={5}
                  value={addForm.currency_symbol}
                  onChange={(e) => setAddForm((f) => ({ ...f, currency_symbol: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tax Name</label>
                <Input
                  className="mt-1"
                  placeholder="GST"
                  value={addForm.tax_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, tax_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tax Rate (%)</label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0" max="100" step="0.01"
                  placeholder="9"
                  value={addForm.tax_rate}
                  onChange={(e) => setAddForm((f) => ({ ...f, tax_rate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={addCountry}
              disabled={adding || !addForm.name || !addForm.code || !addForm.currency_code || !addForm.currency_symbol}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Country
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
