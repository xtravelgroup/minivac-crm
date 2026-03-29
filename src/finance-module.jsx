import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ================================================================
// FINANCE MODULE — P&L hasta GOP
// Tabs: 1. P&L Mensual  2. Categorías
// ================================================================

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
var SB = createClient(SB_URL, ANON_KEY);

// ─── Colors / Styles ─────────────────────────────────────────
var C = {
  bg: "#f4f5f7", surface: "#fff", border: "#e3e6ea", borderL: "#edf0f3",
  t1: "#1a1f2e", t2: "#3d4554", t3: "#6b7280", t4: "#9ca3af",
  brand: "#1a385a", brandLt: "#eaf0f7",
  green: "#1a7f3c", greenBg: "#edf7ee",
  red: "#b91c1c", redBg: "#fef2f2",
  amber: "#925c0a", amberBg: "#fef9e7",
  blue: "#1565c0", blueBg: "#e8f0fe",
  font: "'DM Sans','Segoe UI',-apple-system,sans-serif",
  r: "8px", shadow: "0 1px 3px rgba(0,0,0,0.06)",
};

var SECTION_META = {
  revenue:       { label: "INGRESOS (Revenue)",           color: C.green, bg: C.greenBg },
  cost_of_sales: { label: "COSTO DE VENTAS (Cost of Sales)", color: C.amber, bg: C.amberBg },
  opex:          { label: "GASTOS OPERATIVOS (OpEx)",      color: C.red,   bg: C.redBg },
};

var SECTION_ORDER = ["revenue", "cost_of_sales", "opex"];

var USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function currentPeriod() {
  var d = new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
}

function periodLabel(p) {
  var parts = p.split("-");
  var months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return months[parseInt(parts[1], 10) - 1] + " " + parts[0];
}

function prevPeriod(p) {
  var parts = p.split("-");
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  if (m < 1) { m = 12; y--; }
  return y + "-" + ("0" + m).slice(-2);
}

function nextPeriod(p) {
  var parts = p.split("-");
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) + 1;
  if (m > 12) { m = 1; y++; }
  return y + "-" + ("0" + m).slice(-2);
}

function ytdPeriods(p) {
  var parts = p.split("-");
  var y = parts[0];
  var m = parseInt(parts[1], 10);
  var periods = [];
  for (var i = 1; i <= m; i++) periods.push(y + "-" + ("0" + i).slice(-2));
  return periods;
}

// ─── P&L Tab ─────────────────────────────────────────────────
function PnlTab({ categories, entries, ytdEntries, period, setPeriod, onSave, onSyncVentas, syncing, currentUser }) {
  var [editingId, setEditingId] = useState(null);
  var [editVal, setEditVal] = useState("");
  var [editNotes, setEditNotes] = useState("");

  var byCat = {};
  entries.forEach(function(e) { byCat[e.category_id] = e; });
  var ytdByCat = {};
  ytdEntries.forEach(function(e) {
    ytdByCat[e.category_id] = (ytdByCat[e.category_id] || 0) + Number(e.amount || 0);
  });

  function getAmt(catId) { return Number((byCat[catId] || {}).amount || 0); }
  function getYtd(catId) { return ytdByCat[catId] || 0; }

  var revCats = categories.filter(function(c) { return c.section === "revenue" && c.is_active; });
  var cosCats = categories.filter(function(c) { return c.section === "cost_of_sales" && c.is_active; });
  var opexCats = categories.filter(function(c) { return c.section === "opex" && c.is_active; });

  var totalRev = revCats.reduce(function(s, c) { return s + getAmt(c.id); }, 0);
  var totalCos = cosCats.reduce(function(s, c) { return s + getAmt(c.id); }, 0);
  var totalOpex = opexCats.reduce(function(s, c) { return s + getAmt(c.id); }, 0);
  var grossProfit = totalRev - totalCos;
  var gop = grossProfit - totalOpex;

  var ytdRev = revCats.reduce(function(s, c) { return s + getYtd(c.id); }, 0);
  var ytdCos = cosCats.reduce(function(s, c) { return s + getYtd(c.id); }, 0);
  var ytdOpex = opexCats.reduce(function(s, c) { return s + getYtd(c.id); }, 0);
  var ytdGross = ytdRev - ytdCos;
  var ytdGop = ytdGross - ytdOpex;

  function pct(val) {
    if (!totalRev) return "--";
    return (val / totalRev * 100).toFixed(1) + "%";
  }
  function ytdPct(val) {
    if (!ytdRev) return "--";
    return (val / ytdRev * 100).toFixed(1) + "%";
  }

  function startEdit(cat) {
    var entry = byCat[cat.id];
    setEditingId(cat.id);
    setEditVal(entry ? String(entry.amount) : "0");
    setEditNotes(entry ? (entry.notes || "") : "");
  }

  function saveEdit(cat) {
    var amt = parseFloat(editVal) || 0;
    var entry = byCat[cat.id];
    onSave(cat.id, amt, editNotes, entry ? entry.id : null);
    setEditingId(null);
  }

  function handleKeyDown(e, cat) {
    if (e.key === "Enter") saveEdit(cat);
    if (e.key === "Escape") setEditingId(null);
  }

  function exportCSV() {
    var rows = [["Seccion", "Categoria", "Monto Mensual", "% Revenue", "YTD", "Notas"]];
    function addRows(cats, sectionLabel) {
      cats.forEach(function(c) {
        var entry = byCat[c.id];
        rows.push([sectionLabel, c.name, getAmt(c.id).toFixed(2), pct(getAmt(c.id)), getYtd(c.id).toFixed(2), (entry && entry.notes) || ""]);
      });
    }
    addRows(revCats, "Revenue");
    rows.push(["", "TOTAL REVENUE", totalRev.toFixed(2), "100%", ytdRev.toFixed(2), ""]);
    addRows(cosCats, "Cost of Sales");
    rows.push(["", "TOTAL COST OF SALES", totalCos.toFixed(2), pct(totalCos), ytdCos.toFixed(2), ""]);
    rows.push(["", "GROSS PROFIT", grossProfit.toFixed(2), pct(grossProfit), ytdGross.toFixed(2), ""]);
    addRows(opexCats, "OpEx");
    rows.push(["", "TOTAL OPEX", totalOpex.toFixed(2), pct(totalOpex), ytdOpex.toFixed(2), ""]);
    rows.push(["", "GOP", gop.toFixed(2), pct(gop), ytdGop.toFixed(2), ""]);
    var csv = rows.map(function(r) { return r.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var blob = new Blob([csv], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "PnL_" + period + ".csv";
    a.click();
  }

  var thStyle = { padding: "8px 12px", fontSize: "11px", fontWeight: "600", color: C.t3, textAlign: "right", borderBottom: "2px solid " + C.border, whiteSpace: "nowrap" };
  var tdStyle = { padding: "7px 12px", fontSize: "13px", color: C.t1, textAlign: "right", borderBottom: "1px solid " + C.borderL };
  var tdNameStyle = { ...tdStyle, textAlign: "left", fontWeight: "400" };

  function renderSection(cats, sectionKey) {
    var meta = SECTION_META[sectionKey];
    return (
      <>
        <tr>
          <td colSpan={6} style={{ padding: "10px 12px", fontSize: "12px", fontWeight: "700", color: meta.color, background: meta.bg, borderBottom: "1px solid " + C.border, letterSpacing: "0.04em" }}>
            {meta.label}
          </td>
        </tr>
        {cats.map(function(cat) {
          var amt = getAmt(cat.id);
          var ytd = getYtd(cat.id);
          var entry = byCat[cat.id];
          var isEditing = editingId === cat.id;
          return (
            <tr key={cat.id} style={{ background: isEditing ? C.blueBg : "transparent" }}
              onMouseEnter={function(e) { if (!isEditing) e.currentTarget.style.background = "#fafbfc"; }}
              onMouseLeave={function(e) { if (!isEditing) e.currentTarget.style.background = "transparent"; }}>
              <td style={tdNameStyle}>
                <span style={{ paddingLeft: "16px" }}>{cat.name}</span>
              </td>
              <td style={tdStyle}>
                {isEditing ? (
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    value={editVal}
                    onChange={function(e) { setEditVal(e.target.value); }}
                    onKeyDown={function(e) { handleKeyDown(e, cat); }}
                    onBlur={function() { saveEdit(cat); }}
                    style={{ width: "120px", padding: "4px 8px", fontSize: "13px", textAlign: "right", border: "1px solid " + C.blue, borderRadius: C.r, outline: "none" }}
                  />
                ) : (
                  <span onClick={function() { startEdit(cat); }} style={{ cursor: "pointer", padding: "2px 6px", borderRadius: "4px" }}
                    onMouseEnter={function(e) { e.currentTarget.style.background = C.blueBg; }}
                    onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>
                    {USD.format(amt)}
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, fontSize: "12px", color: C.t3 }}>{pct(amt)}</td>
              <td style={{ ...tdStyle, color: C.t2 }}>{USD.format(ytd)}</td>
              <td style={{ ...tdStyle, fontSize: "12px", color: C.t3 }}>{ytdPct(ytd)}</td>
              <td style={{ ...tdStyle, textAlign: "left", fontSize: "12px", color: C.t4, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={editNotes}
                    onChange={function(e) { setEditNotes(e.target.value); }}
                    onKeyDown={function(e) { handleKeyDown(e, cat); }}
                    placeholder="Notas..."
                    style={{ width: "140px", padding: "4px 8px", fontSize: "12px", border: "1px solid " + C.border, borderRadius: C.r, outline: "none" }}
                  />
                ) : (
                  (entry && entry.notes) || ""
                )}
              </td>
            </tr>
          );
        })}
      </>
    );
  }

  function renderTotalRow(label, amt, ytdAmt, style) {
    var base = { padding: "8px 12px", fontSize: "13px", fontWeight: "700", borderBottom: "2px solid " + C.border, ...style };
    return (
      <tr>
        <td style={{ ...base, textAlign: "left" }}>{label}</td>
        <td style={{ ...base, textAlign: "right" }}>{USD.format(amt)}</td>
        <td style={{ ...base, textAlign: "right", fontSize: "12px", fontWeight: "600" }}>{pct(amt)}</td>
        <td style={{ ...base, textAlign: "right" }}>{USD.format(ytdAmt)}</td>
        <td style={{ ...base, textAlign: "right", fontSize: "12px", fontWeight: "600" }}>{ytdPct(ytdAmt)}</td>
        <td style={base}></td>
      </tr>
    );
  }

  var gopColor = gop >= 0 ? C.green : C.red;
  var gopBg = gop >= 0 ? C.greenBg : C.redBg;

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={function() { setPeriod(prevPeriod(period)); }}
            style={{ width: "32px", height: "32px", borderRadius: C.r, border: "1px solid " + C.border, background: C.surface, cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ‹
          </button>
          <span style={{ fontSize: "16px", fontWeight: "700", color: C.t1, minWidth: "120px", textAlign: "center" }}>
            {periodLabel(period)}
          </span>
          <button onClick={function() { setPeriod(nextPeriod(period)); }}
            style={{ width: "32px", height: "32px", borderRadius: C.r, border: "1px solid " + C.border, background: C.surface, cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ›
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onSyncVentas} disabled={syncing}
            style={{ padding: "7px 14px", fontSize: "12px", fontWeight: "600", borderRadius: C.r, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.6 : 1 }}>
            {syncing ? "Sincronizando..." : "Sync Ventas"}
          </button>
          <button onClick={exportCSV}
            style={{ padding: "7px 14px", fontSize: "12px", fontWeight: "600", borderRadius: C.r, border: "1px solid " + C.border, background: C.surface, color: C.t2, cursor: "pointer" }}>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        {[
          { label: "Revenue", value: totalRev, color: C.green },
          { label: "Gross Profit", value: grossProfit, color: grossProfit >= 0 ? C.green : C.red },
          { label: "Gross Margin", value: null, pctVal: totalRev ? (grossProfit / totalRev * 100).toFixed(1) + "%" : "--", color: C.t1 },
          { label: "Total OpEx", value: totalOpex, color: C.amber },
          { label: "GOP", value: gop, color: gopColor },
          { label: "GOP Margin", value: null, pctVal: totalRev ? (gop / totalRev * 100).toFixed(1) + "%" : "--", color: gopColor },
        ].map(function(kpi, i) {
          return (
            <div key={i} style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, padding: "14px 16px", boxShadow: C.shadow }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: C.t4, letterSpacing: "0.04em", marginBottom: "6px" }}>{kpi.label.toUpperCase()}</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: kpi.color }}>
                {kpi.value !== null ? USD.format(kpi.value) : kpi.pctVal}
              </div>
            </div>
          );
        })}
      </div>

      {/* P&L Table */}
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "auto", boxShadow: C.shadow }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.font }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left", minWidth: "200px" }}>Categoría</th>
              <th style={{ ...thStyle, minWidth: "130px" }}>{periodLabel(period)}</th>
              <th style={{ ...thStyle, minWidth: "80px" }}>% Rev</th>
              <th style={{ ...thStyle, minWidth: "130px" }}>YTD</th>
              <th style={{ ...thStyle, minWidth: "80px" }}>% YTD</th>
              <th style={{ ...thStyle, textAlign: "left", minWidth: "140px" }}>Notas</th>
            </tr>
          </thead>
          <tbody>
            {renderSection(revCats, "revenue")}
            {renderTotalRow("TOTAL REVENUE", totalRev, ytdRev, { color: C.green, background: C.greenBg })}

            {renderSection(cosCats, "cost_of_sales")}
            {renderTotalRow("TOTAL COST OF SALES", totalCos, ytdCos, { color: C.amber, background: C.amberBg })}

            {renderTotalRow("GROSS PROFIT", grossProfit, ytdGross, { color: grossProfit >= 0 ? C.green : C.red, fontSize: "14px", borderBottom: "3px double " + C.border })}

            {renderSection(opexCats, "opex")}
            {renderTotalRow("TOTAL OPEX", totalOpex, ytdOpex, { color: C.red, background: C.redBg })}

            {/* GOP row */}
            <tr>
              <td style={{ padding: "12px", fontSize: "15px", fontWeight: "800", color: gopColor, background: gopBg, borderTop: "3px double " + C.border }}>
                GOP (Gross Operating Profit)
              </td>
              <td style={{ padding: "12px", fontSize: "15px", fontWeight: "800", color: gopColor, background: gopBg, textAlign: "right", borderTop: "3px double " + C.border }}>
                {USD.format(gop)}
              </td>
              <td style={{ padding: "12px", fontSize: "13px", fontWeight: "700", color: gopColor, background: gopBg, textAlign: "right", borderTop: "3px double " + C.border }}>
                {pct(gop)}
              </td>
              <td style={{ padding: "12px", fontSize: "15px", fontWeight: "800", color: gopColor, background: gopBg, textAlign: "right", borderTop: "3px double " + C.border }}>
                {USD.format(ytdGop)}
              </td>
              <td style={{ padding: "12px", fontSize: "13px", fontWeight: "700", color: gopColor, background: gopBg, textAlign: "right", borderTop: "3px double " + C.border }}>
                {ytdPct(ytdGop)}
              </td>
              <td style={{ padding: "12px", background: gopBg, borderTop: "3px double " + C.border }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Categories Tab ──────────────────────────────────────────
function CategoriasTab({ categories, onRefresh }) {
  var [cats, setCats] = useState([]);
  var [newCat, setNewCat] = useState({ code: "", name: "", section: "revenue", sort_order: 99 });
  var [saving, setSaving] = useState(false);

  useEffect(function() { setCats(categories.map(function(c) { return { ...c }; })); }, [categories]);

  async function toggleActive(cat) {
    await SB.from("pnl_categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    onRefresh();
  }

  async function deleteCat(cat) {
    if (!confirm("Eliminar categoría '" + cat.name + "'? Se borrarán todos los datos asociados.")) return;
    await SB.from("pnl_categories").delete().eq("id", cat.id);
    onRefresh();
  }

  async function addCat() {
    if (!newCat.code.trim() || !newCat.name.trim()) return;
    setSaving(true);
    await SB.from("pnl_categories").insert({
      code: newCat.code.trim(),
      name: newCat.name.trim(),
      section: newCat.section,
      sort_order: parseInt(newCat.sort_order) || 99,
      is_active: true,
    });
    setNewCat({ code: "", name: "", section: "revenue", sort_order: 99 });
    setSaving(false);
    onRefresh();
  }

  var thS = { padding: "8px 10px", fontSize: "11px", fontWeight: "600", color: C.t3, textAlign: "left", borderBottom: "2px solid " + C.border };
  var tdS = { padding: "6px 10px", fontSize: "13px", color: C.t1, borderBottom: "1px solid " + C.borderL };
  var inpS = { padding: "5px 8px", fontSize: "12px", border: "1px solid " + C.border, borderRadius: C.r, outline: "none" };
  var sectionLabels = { revenue: "Revenue", cost_of_sales: "Cost of Sales", opex: "OpEx" };

  return (
    <div>
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "auto", boxShadow: C.shadow }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.font }}>
          <thead>
            <tr>
              <th style={thS}>Código</th>
              <th style={thS}>Nombre</th>
              <th style={thS}>Sección</th>
              <th style={thS}>Orden</th>
              <th style={thS}>Activa</th>
              <th style={thS}></th>
            </tr>
          </thead>
          <tbody>
            {cats.sort(function(a, b) { return a.sort_order - b.sort_order; }).map(function(cat) {
              var secMeta = SECTION_META[cat.section];
              return (
                <tr key={cat.id} style={{ opacity: cat.is_active ? 1 : 0.5 }}>
                  <td style={tdS}><code style={{ fontSize: "11px", background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px" }}>{cat.code}</code></td>
                  <td style={tdS}>{cat.name}</td>
                  <td style={tdS}>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: secMeta ? secMeta.color : C.t3, background: secMeta ? secMeta.bg : C.bg, padding: "2px 8px", borderRadius: "4px" }}>
                      {sectionLabels[cat.section] || cat.section}
                    </span>
                  </td>
                  <td style={tdS}>{cat.sort_order}</td>
                  <td style={tdS}>
                    <button onClick={function() { toggleActive(cat); }}
                      style={{ padding: "3px 10px", fontSize: "11px", fontWeight: "600", borderRadius: "4px", border: "none", cursor: "pointer",
                        background: cat.is_active ? C.greenBg : C.redBg,
                        color: cat.is_active ? C.green : C.red }}>
                      {cat.is_active ? "Sí" : "No"}
                    </button>
                  </td>
                  <td style={tdS}>
                    <button onClick={function() { deleteCat(cat); }}
                      style={{ padding: "3px 8px", fontSize: "11px", color: C.red, background: "transparent", border: "1px solid " + C.red, borderRadius: "4px", cursor: "pointer" }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
            {/* Add new row */}
            <tr style={{ background: C.bg }}>
              <td style={tdS}><input style={{ ...inpS, width: "100px" }} value={newCat.code} onChange={function(e) { setNewCat({ ...newCat, code: e.target.value }); }} placeholder="opex_xxx" /></td>
              <td style={tdS}><input style={{ ...inpS, width: "160px" }} value={newCat.name} onChange={function(e) { setNewCat({ ...newCat, name: e.target.value }); }} placeholder="Nombre" /></td>
              <td style={tdS}>
                <select style={inpS} value={newCat.section} onChange={function(e) { setNewCat({ ...newCat, section: e.target.value }); }}>
                  <option value="revenue">Revenue</option>
                  <option value="cost_of_sales">Cost of Sales</option>
                  <option value="opex">OpEx</option>
                </select>
              </td>
              <td style={tdS}><input style={{ ...inpS, width: "50px" }} type="number" value={newCat.sort_order} onChange={function(e) { setNewCat({ ...newCat, sort_order: e.target.value }); }} /></td>
              <td colSpan={2} style={tdS}>
                <button onClick={addCat} disabled={saving}
                  style={{ padding: "5px 16px", fontSize: "12px", fontWeight: "600", borderRadius: C.r, border: "none", background: C.brand, color: "#fff", cursor: "pointer" }}>
                  Agregar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Module ─────────────────────────────────────────────
export default function FinanceModule({ currentUser }) {
  var [tab, setTab] = useState("pnl");
  var [period, setPeriod] = useState(currentPeriod());
  var [categories, setCategories] = useState([]);
  var [entries, setEntries] = useState([]);
  var [ytdEntries, setYtdEntries] = useState([]);
  var [loading, setLoading] = useState(true);
  var [syncing, setSyncing] = useState(false);

  var isAdmin = currentUser && ["admin", "director"].includes(currentUser.rol);

  var loadCategories = useCallback(async function() {
    var res = await SB.from("pnl_categories").select("*").order("sort_order");
    if (res.data) setCategories(res.data);
  }, []);

  var loadEntries = useCallback(async function() {
    var res = await SB.from("pnl_entries").select("*").eq("period", period);
    if (res.data) setEntries(res.data);
  }, [period]);

  var loadYtd = useCallback(async function() {
    var periods = ytdPeriods(period);
    var res = await SB.from("pnl_entries").select("*").in("period", periods);
    if (res.data) setYtdEntries(res.data);
  }, [period]);

  useEffect(function() {
    setLoading(true);
    Promise.all([loadCategories(), loadEntries(), loadYtd()]).then(function() { setLoading(false); });
  }, [loadCategories, loadEntries, loadYtd]);

  async function handleSave(categoryId, amount, notes, existingId) {
    if (existingId) {
      await SB.from("pnl_entries").update({ amount: amount, notes: notes || null, updated_at: new Date().toISOString() }).eq("id", existingId);
    } else {
      await SB.from("pnl_entries").insert({
        category_id: categoryId,
        period: period,
        amount: amount,
        notes: notes || null,
        created_by: currentUser ? currentUser.id : null,
      });
    }
    loadEntries();
    loadYtd();
  }

  async function handleSyncVentas() {
    setSyncing(true);
    try {
      var parts = period.split("-");
      var y = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10);
      var startDate = period + "-01";
      var endM = m + 1;
      var endY = y;
      if (endM > 12) { endM = 1; endY++; }
      var endDate = endY + "-" + ("0" + endM).slice(-2) + "-01";

      var res = await SB.from("leads").select("sale_price").eq("status", "venta").gte("fecha_contacto", startDate).lt("fecha_contacto", endDate);
      var total = 0;
      if (res.data) {
        res.data.forEach(function(l) { total += Number(l.sale_price || 0); });
      }

      var pkgCat = categories.find(function(c) { return c.code === "rev_package_sales"; });
      if (pkgCat) {
        var existing = entries.find(function(e) { return e.category_id === pkgCat.id; });
        await handleSave(pkgCat.id, total, "Auto-sync from ventas " + period, existing ? existing.id : null);
      }
    } catch (e) {
      console.error("Sync error:", e);
    }
    setSyncing(false);
  }

  var tabs = [{ id: "pnl", label: "P&L Mensual" }];
  if (isAdmin) tabs.push({ id: "categorias", label: "Categorías" });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", fontFamily: C.font, background: C.bg }}>
      {/* Module header */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: C.t1 }}>Finanzas</div>
        <div style={{ fontSize: "13px", color: C.t3, marginTop: "2px" }}>Estado de Resultados (P&L) hasta GOP</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "2px solid " + C.border, marginBottom: "16px" }}>
        {tabs.map(function(t) {
          var active = tab === t.id;
          return (
            <button key={t.id} onClick={function() { setTab(t.id); }}
              style={{ padding: "8px 18px", fontSize: "13px", fontWeight: active ? "700" : "500",
                color: active ? C.brand : C.t3, background: "transparent", border: "none",
                borderBottom: active ? "2px solid " + C.brand : "2px solid transparent",
                marginBottom: "-2px", cursor: "pointer", transition: "all 0.15s" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.t3, fontSize: "14px" }}>Cargando datos financieros...</div>
      ) : (
        <>
          {tab === "pnl" && (
            <PnlTab
              categories={categories}
              entries={entries}
              ytdEntries={ytdEntries}
              period={period}
              setPeriod={setPeriod}
              onSave={handleSave}
              onSyncVentas={handleSyncVentas}
              syncing={syncing}
              currentUser={currentUser}
            />
          )}
          {tab === "categorias" && isAdmin && (
            <CategoriasTab categories={categories} onRefresh={function() { loadCategories(); loadEntries(); loadYtd(); }} />
          )}
        </>
      )}
    </div>
  );
}
