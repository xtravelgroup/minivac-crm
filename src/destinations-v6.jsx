import { useState, useMemo, useEffect } from "react";
import { supabase as SB } from "./supabase.js";

var SB_TABLE = "destinos_catalog";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const MARITAL_OPTIONS  = ["Casado", "Unión libre", "Soltero", "Divorciado", "Viudo"];
const CAPACITY_OPTIONS = ["Parejas", "Familias", "Grupos", "Solo adultos"];
const PLAN_OPTIONS     = ["Todo Incluido", "Solo Habitación", "Desayuno incluido", "Media pensión", "Todo Incluido Premium"];
const CATEGORIES       = ["Premium", "Ultra Premium", "Familiar", "Romance", "Boutique", "Eco Premium", "Clásico"];
const DEST_ICONS       = ["🏖️","🌴","🌵","🌺","⛵","🌿","🏊","🏔️","🏝️","🌊","🦀","🐠","🌅","🏄","🎰","🍹","🌋","🏜️"];
const GIFT_ICONS       = ["🎁","🌙","✈️","🗺️","🍽️","💆","🚌","💳","🍾","🎭","⛷️","🤿","🎪","🚤","🏌️","🎶"];
const GIFT_SUGGESTIONS = ["Noches extra","Tour o excursión","Traslados incluidos","Crédito de resort","Tarjeta de regalo $100","Cena romántica","Spa / masaje","Botella de vino"];
const CAT_COLORS = { "Premium":"#4fc3f7","Ultra Premium":"#ce93d8","Familiar":"#a5d6a7","Romance":"#f48fb1","Boutique":"#ffcc80","Eco Premium":"#80cbc4","Clásico":"#fff176" };

// Región: nacional = dentro de USA | internacional = fuera de USA
const REGION_OPTIONS = [
  { value:"nacional",      label:"🇺🇸 Nacional (USA)",        color:"#60a5fa", bg:"rgba(96,165,250,0.12)", border:"rgba(96,165,250,0.35)" },
  { value:"internacional", label:"🌎 Internacional",           color:"#a78bfa", bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.35)" },
];

// Regalos siempre incluidos — catálogo base
const INCLUDED_GIFT_OPTIONS = [
  { id:"IG01", icon:"🚐", label:"Traslado aeropuerto → hotel (one way)" },
  { id:"IG02", icon:"🚐", label:"Traslado hotel → aeropuerto (one way)" },
  { id:"IG03", icon:"🚐↩️",label:"Traslado redondo (aeropuerto ↔ hotel)" },
  { id:"IG04", icon:"💆", label:"Certificado Spa" },
  { id:"IG05", icon:"🍽️", label:"All-Inclusive (alimentos y bebidas)" },
  { id:"IG06", icon:"🥐", label:"Desayunos incluidos" },
  { id:"IG07", icon:"🍷", label:"Cena romántica" },
  { id:"IG08", icon:"🌹", label:"Decoración de habitación" },
  { id:"IG09", icon:"🕐", label:"Late check-out" },
  { id:"IG10", icon:"🌅", label:"Early check-in" },
  { id:"IG11", icon:"🎟️", label:"Entradas a atracción incluidas" },
  { id:"IG12", icon:"💳", label:"Crédito de resort" },
  { id:"IG13", icon:"🤿", label:"Actividad acuática incluida" },
  { id:"IG14", icon:"🏌️", label:"Green fee / golf incluido" },
  { id:"IG15", icon:"🍾", label:"Botella de champagne" },
];

// Amenidades de hotel — se configuran por hotel en el editor
const AMENITY_OPTIONS = [
  "Piscina",
  "Playa privada",
  "Spa",
  "Gimnasio",
  "Casino",
  "Shows nocturnos",
  "Golf",
  "Restaurantes múltiples",
  "Kids club",
  "Butler service",
  "Wi-Fi incluido",
  "Estacionamiento",
  "Acceso a parque temático",
  "Centro de buceo",
  "Bar swim-up",
];



// ═══════════════════════════════════════════════════════════════
// QUALIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════
function qualify(destinations, profile) {
  if (!profile.age || !profile.maritalStatus) return [];
  const age = Number(profile.age);
  return destinations.filter(d => d.active).map(d => {
    const active = d.qc.hotels.filter(h => h.active);
    const qualifiedHotels = active.filter(h =>
      age >= h.ageMin && age <= h.ageMax && h.marital.includes(profile.maritalStatus)
    );
    const qualifies = qualifiedHotels.length > 0;
    const reasons = [];
    if (!qualifies && active.length > 0) {
      const s = active[0];
      if (age < s.ageMin || age > s.ageMax) reasons.push(`Edad ${age} fuera de rango`);
      if (!s.marital.includes(profile.maritalStatus)) reasons.push(`Estado civil no aplica`);
    }
    return { dest:d, qualifies, qualifiedHotels, reasons, hasNQ: d.nq?.enabled && d.nq.hotels.length > 0 };
  });
}

const fmt = n => "$" + Number(n || 0).toLocaleString();
const uid = () => "X" + Date.now() + Math.random().toString(36).slice(2, 5);

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
// ── Convierte fila de Supabase → formato interno del modulo
function dbToDestino(r) {
  var qc = r.qc  || {};
  var nq = r.nq  || {};
  return {
    id:            r.id,
    name:          r.nombre,
    state:         r.estado         || "",
    icon:          r.icon           || "🏖️",
    region:        r.region         || "internacional",
    category:      r.categoria      || "",
    description:   r.descripcion    || "",
    active:        r.activo !== false,
    includedGifts: r.included_gifts || [],
    qc: {
      nights:      qc.nights      || 4,
      ageMin:      qc.ageMin      || 18,
      ageMax:      qc.ageMax      || 99,
      marital:     qc.marital     || [],
      adultos:     qc.adultos     || 2,
      ninos:       qc.ninos       || 0,
      edadMaxNino: qc.edadMaxNino || 12,
      hotels:      qc.hotels      || [],
      gifts:       qc.gifts       || { enabled:false, maxChoices:1, items:[] },
    },
    nq: {
      enabled: nq.enabled || false,
      nights:  nq.nights  || 3,
      label:   nq.label   || "",
      hotels:  nq.hotels  || [],
    },
  };
}

// ── Convierte formato interno → fila de Supabase
function destinoToDB(d) {
  return {
    id:             d.id,
    nombre:         d.name          || "",
    estado:         d.state         || "",
    icon:           d.icon          || "🏖️",
    region:         d.region        || "internacional",
    categoria:      d.category      || "",
    descripcion:    d.description   || "",
    activo:         d.active !== false,
    qc:             d.qc            || {},
    nq:             d.nq            || { enabled:false, nights:3, label:"", hotels:[] },
    included_gifts: d.includedGifts || [],
  };
}

export default function DestinationsModule() {
  var [destinations, setDestinations] = useState([]);
  var [loadingDB,    setLoadingDB]    = useState(true);
  var [saving,       setSaving]       = useState(false);
  var [tab,          setTab]          = useState("catalog");
  var [modal,        setModal]        = useState(null);
  var [toast,        setToast]        = useState(null);

  function notify(msg, ok) {
    var isOk = ok === undefined ? true : ok;
    setToast({msg:msg, ok:isOk});
    setTimeout(function(){ setToast(null); }, 3500);
  }

  // ── Cargar desde Supabase
  function cargar() {
    setLoadingDB(true);
    SB.from(SB_TABLE)
      .select("*")
      .order("id", { ascending:true })
      .then(function(res) {
        setLoadingDB(false);
        if (res.error) { notify("Error cargando destinos: " + res.error.message, false); return; }
        setDestinations((res.data || []).map(dbToDestino));
      });
  }

  useEffect(function() { cargar(); }, []);

  // ── Guardar (upsert) destino
  function save(d) {
    setSaving(true);
    var isNew = !(d.id && destinations.find(function(x){ return x.id === d.id; }));
    var row = destinoToDB(d);
    // Si es nuevo y no tiene id, generar uno
    if (!row.id) {
      var maxNum = destinations.reduce(function(acc, x) {
        var n = parseInt((x.id || "D00").replace("D",""), 10);
        return n > acc ? n : acc;
      }, 0);
      row.id = "D" + ("0" + (maxNum + 1)).slice(-2);
      d = Object.assign({}, d, { id: row.id });
    }
    SB.from(SB_TABLE)
      .upsert(row, { onConflict:"id" })
      .then(function(res) {
        setSaving(false);
        if (res.error) { notify("Error guardando: " + res.error.message, false); return; }
        if (isNew) {
          setDestinations(function(p){ return p.concat([d]); });
        } else {
          setDestinations(function(p){ return p.map(function(x){ return x.id === d.id ? d : x; }); });
        }
        notify(isNew ? "Destino creado ✓" : "Destino actualizado ✓");
        setModal(null);
      });
  }

  // ── Eliminar destino
  function del(id) {
    SB.from(SB_TABLE).delete().eq("id", id).then(function(res) {
      if (res.error) { notify("Error eliminando: " + res.error.message, false); return; }
      setDestinations(function(p){ return p.filter(function(d){ return d.id !== id; }); });
      notify("Destino eliminado");
      setModal(null);
    });
  }

  // ── Activar / desactivar destino
  function tog(id) {
    var dest = destinations.find(function(d){ return d.id === id; });
    if (!dest) return;
    var nuevoActivo = !dest.active;
    SB.from(SB_TABLE).update({ activo: nuevoActivo }).eq("id", id).then(function(res) {
      if (res.error) { notify("Error: " + res.error.message, false); return; }
      setDestinations(function(p){ return p.map(function(d){ return d.id === id ? Object.assign({}, d, { active: nuevoActivo }) : d; }); });
    });
  }

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.brand}>
          <span style={{fontSize:24}}>🗺️</span>
          <div>
            <div style={S.brandTitle}>Módulo de Destinos</div>
            <div style={S.brandSub}>
              {loadingDB ? "Cargando..." : (
                destinations.filter(function(d){ return d.active; }).length + " activos · " +
                destinations.reduce(function(s,d){ return s + (d.qc.hotels||[]).filter(function(h){ return h.active; }).length; }, 0) + " hoteles QC · " +
                destinations.filter(function(d){ return d.nq && d.nq.enabled; }).length + " con NQ"
              )}
            </div>
          </div>
        </div>
        <div style={S.tabRow}>
          {[["catalog","🗺️ Catálogo"],["qualify","✅ Calificador"],["rules","⚙️ Reglas"]].map(function(pair){
            var id = pair[0]; var label = pair[1];
            return <button key={id} style={Object.assign({},S.tabBtn,tab===id?S.tabOn:{})} onClick={function(){ setTab(id); }}>{label}</button>;
          })}
        </div>
        {tab==="catalog" && (
          <button style={S.btnAdd} onClick={function(){ setModal({data:null}); }}>+ Nuevo Destino</button>
        )}
      </div>

      <div style={S.body}>
        {loadingDB && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,gap:12,color:"#9ca3af",fontSize:14}}>
            <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Cargando destinos...
          </div>
        )}
        {!loadingDB && tab==="catalog" && <CatalogTab destinations={destinations} onEdit={function(d){ setModal({data:d}); }} onToggle={tog} />}
        {!loadingDB && tab==="qualify" && <QualifyTab destinations={destinations} />}
        {!loadingDB && tab==="rules"   && <RulesTab   destinations={destinations} onEdit={function(d){ setModal({data:d}); }} />}
      </div>

      {modal && <DestModal data={modal.data} saving={saving} onSave={save} onDelete={modal.data ? function(){ del(modal.data.id); } : null} onClose={function(){ setModal(null); }} />}
      {toast && <div style={Object.assign({},S.toast,{background:toast.ok?"#edf7ee":"#fef2f2",borderColor:toast.ok?"#a3d9a5":"#f5b8b8",color:toast.ok?"#1a7f3c":"#b91c1c"})}>{toast.msg}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATALOG TAB
// ═══════════════════════════════════════════════════════════════
function CatalogTab({ destinations, onEdit, onToggle }) {
  const [search, setSearch] = useState("");
  const [fCat, setFCat]     = useState("all");
  const [fNQ, setFNQ]       = useState("all");
  const [fReg, setFReg]     = useState("all");

  const filtered = destinations.filter(d => {
    const mQ = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const mC = fCat==="all" || d.category===fCat;
    const mN = fNQ==="all" || (fNQ==="yes" ? d.nq?.enabled : !d.nq?.enabled);
    const mR = fReg==="all" || d.region===fReg;
    return mQ && mC && mN && mR;
  });

  return (
    <div style={S.page}>
      <div style={S.toolbar}>
        <input style={S.search} placeholder="🔍 Buscar destino…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={S.select} value={fReg} onChange={e=>setFReg(e.target.value)}>
          <option value="all">🌎 Todos</option>
          <option value="nacional">🇺🇸 Nacionales (USA)</option>
          <option value="internacional">🌍 Internacionales</option>
        </select>
        <select style={S.select} value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <select style={S.select} value={fNQ} onChange={e=>setFNQ(e.target.value)}>
          <option value="all">Con y sin NQ</option>
          <option value="yes">Con paquete NQ</option>
          <option value="no">Solo QC</option>
        </select>
        <span style={{color:"#9ca3af",fontSize:12}}>{filtered.length} destino{filtered.length!==1?"s":""}</span>
      </div>
      <div style={S.destGrid}>
        {filtered.map(d=><DestCard key={d.id} dest={d} onEdit={onEdit} onToggle={onToggle} />)}
        {filtered.length===0 && <div style={{...S.empty,gridColumn:"span 3"}}>Sin resultados</div>}
      </div>
    </div>
  );
}

function DestCard({ dest:d, onEdit, onToggle }) {
  const [panel, setPanel] = useState(null); // null | "qc" | "nq"
  const accent = CAT_COLORS[d.category] || "#4fc3f7";
  const qcHotels = d.qc.hotels.filter(h=>h.active);
  const nqHotels = d.nq?.hotels?.filter(h=>h.active) || [];
  const hasGifts = d.qc.gifts?.enabled;
  const activeGifts = d.qc.gifts?.items?.filter(g=>g.active) || [];

  return (
    <div style={{...S.destCard,opacity:d.active?1:0.55}}>
      {/* BANNER */}
      <div style={S.destBanner}>
        <span style={{fontSize:50}}>{d.icon}</span>
        <div style={{position:"absolute",top:10,right:10,display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {/* Región */}
          {d.region&&(()=>{const r=REGION_OPTIONS.find(x=>x.value===d.region);return r?<span style={{...S.pill,background:r.bg,color:r.color,borderColor:r.border,fontSize:10}}>{r.label}</span>:null;})()}
          <span style={{...S.pill,background:accent+"22",color:accent,borderColor:accent+"44"}}>{d.category}</span>
          {d.nq?.enabled && <span style={{...S.pill,background:"#f3e8ff",color:"#7c3aed",borderColor:"#d8b4fe"}}>NQ disponible</span>}
          <span style={{...S.pill,background:d.active?"#edf7ee":"#fef2f2",color:d.active?"#1a7f3c":"#b91c1c"}}>
            {d.active?"● Activo":"● Inactivo"}
          </span>
        </div>
        <div style={{position:"absolute",bottom:10,left:14}}>
          <div style={{fontSize:18,fontWeight:900,color:"#fff"}}>{d.name}</div>
          <div style={{fontSize:11,color:"#90caf9"}}>📍 {d.state}</div>
        </div>
      </div>

      {/* PACKAGE TOGGLE ROW */}
      <div style={S.pkgRow}>
        {/* QC */}
        <button style={{...S.pkgBtn,borderRight:"1px solid #e3e6ea",...(panel==="qc"?S.pkgBtnOn:{})}} onClick={()=>setPanel(panel==="qc"?null:"qc")}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16}}>⭐</span>
            <div style={{textAlign:"left"}}>
              <div style={{fontWeight:700,color:"#1a385a",fontSize:12}}>Paquete QC</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>{d.qc.nights}n · {d.qc.adultos||2} adultos{d.qc.ninos>0?" · "+d.qc.ninos+" niños":""} · edad {d.qc.ageMin}-{d.qc.ageMax} · {qcHotels.length} hotel{qcHotels.length!==1?"es":""}</div>
            </div>
          </div>
          <span style={{fontSize:10,color:"#9ca3af"}}>{panel==="qc"?"▲":"▼"}</span>
        </button>

        {/* NQ */}
        <button style={{...S.pkgBtn,...(panel==="nq"?S.pkgBtnOn:{}),...(!d.nq?.enabled?{cursor:"default",opacity:0.4}:{})}} onClick={()=>d.nq?.enabled&&setPanel(panel==="nq"?null:"nq")}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16}}>{d.nq?.enabled?"🔹":"—"}</span>
            <div style={{textAlign:"left"}}>
              <div style={{fontWeight:700,color:d.nq?.enabled?"#1565c0":"#9ca3af",fontSize:12}}>
                {d.nq?.enabled?"Paquete NQ":"Sin paquete NQ"}
              </div>
              {d.nq?.enabled && <div style={{fontSize:10,color:"#9ca3af"}}>{d.nq.nights} noches · {nqHotels.length} hotel{nqHotels.length!==1?"es":""} · sin regalos</div>}
            </div>
          </div>
          {d.nq?.enabled && <span style={{fontSize:10,color:"#9ca3af"}}>{panel==="nq"?"▲":"▼"}</span>}
        </button>
      </div>

      {/* QC PANEL */}
      {panel==="qc" && (
        <div style={S.expandPanel}>

          {/* ── REGALOS SIEMPRE INCLUIDOS DEL DESTINO ── */}
          {(d.includedGifts||[]).length>0 && (
            <div style={{...S.panelSection,background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.18)",borderRadius:10,marginBottom:8}}>
              <div style={{...S.panelLabel,color:"#4ade80"}}>✅ Incluido siempre en este destino</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {(d.includedGifts||[]).map(id=>{
                  const g=INCLUDED_GIFT_OPTIONS.find(x=>x.id===id);
                  return g?(<span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:"#4ade80",background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.25)",padding:"3px 9px",borderRadius:20}}>{g.icon} {g.label}</span>):null;
                })}
              </div>
            </div>
          )}

          {/* ── BONO EXCLUSIVO (gift opcional del vendedor) ── */}
          {hasGifts && (
            <div style={{...S.panelSection,background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:10,marginBottom:8}}>
              <div style={{...S.panelLabel,color:"#fbbf24"}}>⭐ Bono exclusivo — cliente elige {d.qc.gifts.maxChoices}</div>
              {activeGifts.map(g=>(
                <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0"}}>
                  <span style={{fontSize:16}}>{g.icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#fbbf24"}}>{g.name}</div>
                    {g.description && <div style={{fontSize:10,color:"#9ca3af"}}>{g.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── HOTELES QC ── */}
          <div style={S.panelSection}>
            <div style={S.panelLabel}>🏨 Hoteles QC</div>
            {d.qc.hotels.map(h=>(
              <div key={h.id} style={{...S.hotelRow,opacity:h.active?1:0.4}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:h.active?"#1a1f2e":"#9ca3af",fontSize:13}}>{h.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                    <span style={{...S.chip,background:"#e8f0fe",color:"#1565c0"}}>{h.plan}</span>
                    {h.capacity.map(c=><span key={c} style={{...S.chip,background:"#edf7ee",color:"#1a7f3c"}}>{c}</span>)}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>🎂 {h.ageMin}–{h.ageMax} · {h.marital.join(", ")}</div>
                  {/* Hotel gifts */}
                  {h.hotelGifts?.length>0 && (
                    <div style={{marginTop:5,display:"flex",flexWrap:"wrap",gap:4}}>
                      {h.hotelGifts.map((g,i)=>(
                        <span key={i} style={{fontSize:10,color:"#a78bfa",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.25)",padding:"2px 7px",borderRadius:20}}>🏨 {g}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!h.active && <span style={{...S.pill,background:"#fef2f2",color:"#b91c1c",fontSize:10}}>Inactivo</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NQ PANEL */}
      {panel==="nq" && d.nq?.enabled && (
        <div style={{...S.expandPanel,borderLeft:"3px solid #4a2580"}}>
          <div style={S.panelSection}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={S.panelLabel}>🔹 Paquete NQ — {d.nq.label || d.name+" NQ"}</div>
              <span style={{...S.pill,background:"#f3e8ff",color:"#7c3aed",borderColor:"#d8b4fe",fontSize:10}}>{d.nq.nights} noches</span>
            </div>
            {d.nq.hotels.map(h=>(
              <div key={h.id} style={{...S.hotelRow,opacity:h.active?1:0.4}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:h.active?"#1a1f2e":"#9ca3af",fontSize:13}}>{h.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                    <span style={{...S.chip,background:"#f3e8ff",color:"#7c3aed"}}>{h.plan}</span>
                    {h.capacity.map(c=><span key={c} style={{...S.chip}}>{c}</span>)}
                  </div>
                  {h.hotelGifts?.length>0 && (
                    <div style={{marginTop:5,display:"flex",flexWrap:"wrap",gap:4}}>
                      {h.hotelGifts.map((g,i)=>(
                        <span key={i} style={{fontSize:10,color:"#a78bfa",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.25)",padding:"2px 7px",borderRadius:20}}>🏨 {g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{marginTop:10,padding:"8px 10px",borderRadius:8,background:"rgba(21,101,192,0.04)",border:"1px solid rgba(21,101,192,0.15)",fontSize:11,color:"#9ca3af",fontStyle:"italic"}}>
              ℹ️ Paquete NQ no incluye bonos exclusivos ni regalos del destino
            </div>
          </div>
        </div>
      )}

      <div style={{padding:"10px 14px",fontSize:12,color:"#9ca3af",lineHeight:1.5,flex:1}}>{d.description}</div>

      {/* Gifts always included — visible en la tarjeta */}
      {(d.includedGifts||[]).length>0 && (
        <div style={{padding:"8px 14px",borderTop:"1px solid #e3e6ea"}}>
          <div style={{fontSize:10,color:"#4ade80",fontWeight:700,marginBottom:5,letterSpacing:"0.06em",textTransform:"uppercase"}}>✅ Incluido siempre</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {(d.includedGifts||[]).map(id=>{
              const g=INCLUDED_GIFT_OPTIONS.find(x=>x.id===id);
              return g?<span key={id} style={{fontSize:10,fontWeight:600,color:"#4ade80",background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",padding:"2px 7px",borderRadius:20}}>{g.icon} {g.label}</span>:null;
            })}
          </div>
        </div>
      )}

      <div style={S.destActions}>
        <button style={S.btnSec} onClick={()=>onToggle(d.id)}>{d.active?"⏸ Desactivar":"▶ Activar"}</button>
        <button style={S.btnAdd} onClick={()=>onEdit(d)}>✏ Editar</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUALIFY TAB
// ═══════════════════════════════════════════════════════════════
function QualifyTab({ destinations }) {
  const [profile, setProfile] = useState({firstName:"",lastName:"",age:"",maritalStatus:"",hasCouple:true});
  const [ran, setRan]         = useState(false);
  const [selGifts, setSelGifts] = useState({});
  const set = (k,v) => { setProfile(p=>({...p,[k]:v})); setRan(false); };

  const results = useMemo(()=>{
    if(!ran) return [];
    return qualify(destinations, profile);
  },[ran,profile,destinations]);

  const qcList = results.filter(r=>r.qualifies);
  const nqList = results.filter(r=>!r.qualifies && r.hasNQ);
  const noneList = results.filter(r=>!r.qualifies && !r.hasNQ);

  const toggleGift = (destId,giftId,maxChoices) => {
    setSelGifts(prev=>{
      const curr = prev[destId]||[];
      if(curr.includes(giftId)) return {...prev,[destId]:curr.filter(g=>g!==giftId)};
      if(curr.length>=maxChoices) return prev;
      return {...prev,[destId]:[...curr,giftId]};
    });
  };

  return (
    <div style={S.page}>
      <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:20,alignItems:"start"}}>
        {/* FORM */}
        <div style={S.card}>
          <div style={S.cardTitle}>📋 Perfil del Cliente</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FLD label="Nombre">  <INP value={profile.firstName} onChange={v=>set("firstName",v)} placeholder="Carlos" /></FLD>
            <FLD label="Apellido"><INP value={profile.lastName}  onChange={v=>set("lastName",v)}  placeholder="González" /></FLD>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <FLD label="Edad *">
              <input style={S.inp} type="number" min="18" max="99" value={profile.age} onChange={e=>set("age",e.target.value)} placeholder="38" />
            </FLD>
            <FLD label="Estado civil *">
              <select style={S.inp} value={profile.maritalStatus} onChange={e=>set("maritalStatus",e.target.value)}>
                <option value="">Seleccionar…</option>
                {MARITAL_OPTIONS.map(m=><option key={m}>{m}</option>)}
              </select>
            </FLD>
          </div>
          <FLD label="¿Viene con pareja?">
            <div style={{display:"flex",gap:8,marginTop:6}}>
              {[true,false].map(v=>(
                <button key={String(v)} style={{...S.toggleBtn,...(profile.hasCouple===v?S.toggleOn:{})}} onClick={()=>set("hasCouple",v)}>
                  {v?"👫 Sí":"🧍 No"}
                </button>
              ))}
            </div>
          </FLD>
          <button style={{...S.btnAdd,width:"100%",marginTop:18,padding:"12px",fontSize:14,opacity:profile.age&&profile.maritalStatus?1:0.4}}
            onClick={()=>profile.age&&profile.maritalStatus&&setRan(true)}>
            ✅ Calificar Destinos →
          </button>
          {ran && (
            <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              {[
                {val:qcList.length, label:"Califica QC",   color:"#1a7f3c", bg:"#edf7ee"},
                {val:nqList.length, label:"Tiene NQ",      color:"#7c3aed", bg:"#f3e8ff"},
                {val:noneList.length,label:"Sin paquete",  color:"#b91c1c", bg:"#fef2f2"},
              ].map((k,i)=>(
                <div key={i} style={{textAlign:"center",background:k.bg,borderRadius:8,padding:"8px 0"}}>
                  <div style={{fontSize:20,fontWeight:900,color:k.color}}>{k.val}</div>
                  <div style={{fontSize:10,color:"#9ca3af"}}>{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RESULTS */}
        <div>
          {!ran ? (
            <div style={{...S.card,display:"flex",alignItems:"center",justifyContent:"center",minHeight:260,flexDirection:"column",gap:10,color:"#9ca3af"}}>
              <span style={{fontSize:48}}>✅</span>
              <span>Completa el perfil y presiona "Calificar"</span>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>

              {/* QC RESULTS */}
              {qcList.length>0 && (
                <div style={S.card}>
                  <div style={{...S.cardTitle,color:"#a5d6a7"}}>⭐ CALIFICA — Paquete QC ({qcList.length})</div>
                  {qcList.map(r=>(
                    <QCRow key={r.dest.id} result={r} selGifts={selGifts[r.dest.id]||[]} onToggleGift={(g)=>toggleGift(r.dest.id,g,r.dest.qc.gifts?.maxChoices||0)} />
                  ))}
                </div>
              )}

              {/* NQ RESULTS */}
              {nqList.length>0 && (
                <div style={{...S.card,borderColor:"#4a2580"}}>
                  <div style={{...S.cardTitle,color:"#ce93d8"}}>🔹 NO CALIFICA QC — Paquete NQ disponible ({nqList.length})</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:14}}>
                    El cliente no cumple los requisitos del paquete QC, pero puede acceder al paquete alternativo al mismo precio.
                  </div>
                  {nqList.map(r=><NQRow key={r.dest.id} result={r} />)}
                </div>
              )}

              {/* NO PACKAGE */}
              {noneList.length>0 && (
                <div style={S.card}>
                  <div style={{...S.cardTitle,color:"#ef9a9a"}}>❌ SIN PAQUETE DISPONIBLE ({noneList.length})</div>
                  {noneList.map(r=>(
                    <div key={r.dest.id} style={S.notQualRow}>
                      <span style={{fontSize:20}}>{r.dest.icon}</span>
                      <div style={{flex:1}}>
                        <span style={{fontWeight:700,color:"#1a1f2e"}}>{r.dest.name}</span>
                        {r.reasons.length>0 && <div style={{fontSize:11,color:"#ef9a9a",marginTop:2}}>{r.reasons.join(" · ")}</div>}
                      </div>
                      <span style={{color:"#9ca3af",fontSize:12}}>{r.dest.state}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* SALE SHEET */}
              {(qcList.length>0||nqList.length>0) && (
                <SaleSheet profile={profile} qcList={qcList} nqList={nqList} selGifts={selGifts} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QCRow({ result:r, selGifts, onToggleGift }) {
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [hotelsOpen, setHotelsOpen] = useState(false);
  const accent = CAT_COLORS[r.dest.category]||"#4fc3f7";
  const gifts  = r.dest.qc.gifts;
  const activeGifts = gifts?.items?.filter(g=>g.active)||[];
  const remaining = (gifts?.maxChoices||0)-selGifts.length;

  return (
    <div style={{...S.qRow,borderColor:accent+"44",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28}}>{r.dest.icon}</span>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:800,color:"#fff",fontSize:15}}>{r.dest.name}</span>
            <span style={{...S.pill,background:accent+"22",color:accent,borderColor:accent+"44"}}>{r.dest.category}</span>
            <span style={{...S.pill,background:"#e8f0fe",color:"#1565c0"}}>⭐ QC · {r.dest.qc.nights} noches</span>
            {gifts?.enabled && <span style={{...S.pill,background:"#3a2800",color:"#fff176",borderColor:"#f9a82544"}}>🎁 {selGifts.length}/{gifts.maxChoices}</span>}
          </div>
          <div style={{fontSize:12,color:"#90caf9",marginTop:2}}>
            📍 {r.dest.state} · 🏨 {r.qualifiedHotels.length} hotel(es)
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {gifts?.enabled && activeGifts.length>0 && (
            <button style={{...S.btnXs,...(giftsOpen?{background:"#3a2800",color:"#fff176"}:{})}} onClick={()=>setGiftsOpen(!giftsOpen)}>
              🎁 Regalos {giftsOpen?"▲":"▼"}
            </button>
          )}
          <button style={S.btnXs} onClick={()=>setHotelsOpen(!hotelsOpen)}>🔒 Hoteles {hotelsOpen?"▲":"▼"}</button>
        </div>
      </div>

      {giftsOpen && gifts?.enabled && (
        <div style={{marginTop:12,background:"#fffbe0",border:"1px solid #f0d080",borderRadius:10,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:13,color:"#fff176",fontWeight:700}}>Elige {gifts.maxChoices} regalo{gifts.maxChoices!==1?"s":""}</div>
            <div style={{fontSize:12,fontWeight:700,background:remaining>0?"#3a2800":"#0d3a1a",color:remaining>0?"#fff176":"#a5d6a7",padding:"2px 10px",borderRadius:20}}>
              {remaining>0?`Faltan ${remaining}`:"¡Completo! ✓"}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
            {activeGifts.map(g=>{
              const chosen=selGifts.includes(g.id);
              const disabled=!chosen&&remaining===0;
              return (
                <button key={g.id} disabled={disabled} onClick={()=>onToggleGift(g.id)}
                  style={{...S.giftBtn,opacity:disabled?0.3:1,borderColor:chosen?"#f59e0b":"#e3e6ea",background:chosen?"#fffbe0":"#f9fafb",cursor:disabled?"not-allowed":"pointer"}}>
                  <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                    <span style={{fontSize:22,flexShrink:0}}>{g.icon}</span>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontWeight:700,color:chosen?"#92400e":"#1a1f2e",fontSize:12}}>{g.name}</div>
                      {g.description&&<div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>{g.description}</div>}
                    </div>
                    {chosen&&<span style={{marginLeft:"auto",fontSize:16}}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hotelsOpen && (
        <div style={{marginTop:10,borderTop:"1px solid #e3e6ea",paddingTop:10}}>
          <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>🔒 Uso interno</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
            {r.qualifiedHotels.map(h=>(
              <div key={h.id} style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:8,padding:10}}>
                <div style={{fontWeight:700,color:"#fff",fontSize:12}}>{h.name}</div>
                <span style={{...S.chip,background:"#e8f0fe",color:"#1565c0",marginTop:4,display:"inline-block"}}>{h.plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NQRow({ result:r }) {
  const [open, setOpen] = useState(false);
  const nq = r.dest.nq;

  return (
    <div style={{...S.qRow,borderColor:"#4a2580",marginBottom:10,borderLeft:"3px solid #7b2ff7"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28}}>{r.dest.icon}</span>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,color:"#1a1f2e",fontSize:15}}>{r.dest.name}</span>
            <span style={{...S.pill,background:"#f3e8ff",color:"#7c3aed",borderColor:"#d8b4fe"}}>🔹 NQ · {nq.nights} noches</span>
            <span style={{...S.pill,background:"#f4f5f7",color:"#9ca3af"}}>Sin regalos</span>
          </div>
          <div style={{fontSize:12,color:"#90caf9",marginTop:2}}>
            📍 {r.dest.state} · 🏨 {nq.hotels.filter(h=>h.active).length} hotel(es)
          </div>
          {r.reasons.length>0 && (
            <div style={{fontSize:11,color:"#ce93d8",marginTop:3}}>
              ⚠ No calificó QC: {r.reasons.join(" · ")}
            </div>
          )}
        </div>
        <button style={{...S.btnXs,color:"#ce93d8"}} onClick={()=>setOpen(!open)}>🔒 Hoteles {open?"▲":"▼"}</button>
      </div>

      {open && (
        <div style={{marginTop:10,borderTop:"1px solid #e3e6ea",paddingTop:10}}>
          <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>🔒 Hoteles NQ — Uso interno</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
            {nq.hotels.filter(h=>h.active).map(h=>(
              <div key={h.id} style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:8,padding:10}}>
                <div style={{fontWeight:700,color:"#1a1f2e",fontSize:12}}>{h.name}</div>
                <span style={{...S.chip,background:"#f3e8ff",color:"#7c3aed",marginTop:4,display:"inline-block"}}>{h.plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SALE SHEET
// ═══════════════════════════════════════════════════════════════
function SaleSheet({ profile, qcList, nqList, selGifts }) {
  const [open, setOpen]         = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const total = qcList.length + nqList.length;
  const giftsTotal = Object.values(selGifts).reduce((s,a)=>s+a.length,0);
  const destCount = total;

  return (
    <div style={{...S.card,border:"1px solid #e3e6ea"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={S.cardTitle}>📄 RESUMEN HOJA DE VENTA</div>
        <button style={S.btnXs} onClick={()=>setOpen(!open)}>{open?"Ocultar ▲":"Ver detalle ▼"}</button>
      </div>

      {/* SUMMARY PILLS */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <span style={{...S.pill,background:"#e8f0fe",color:"#1565c0",fontSize:12,padding:"4px 12px"}}>
          👤 {profile.firstName} {profile.lastName} · {profile.age} años · {profile.maritalStatus}
        </span>
        <span style={{...S.pill,background:"#edf7ee",color:"#1a7f3c",fontSize:12,padding:"4px 12px"}}>
          ⭐ {qcList.length} destino{qcList.length!==1?"s":""} QC
        </span>
        {nqList.length>0 && (
          <span style={{...S.pill,background:"#f3e8ff",color:"#7c3aed",fontSize:12,padding:"4px 12px"}}>
            🔹 {nqList.length} destino{nqList.length!==1?"s":""} NQ
          </span>
        )}
        {giftsTotal>0 && (
          <span style={{...S.pill,background:"#3a2800",color:"#fff176",fontSize:12,padding:"4px 12px"}}>
            🎁 {giftsTotal} regalo{giftsTotal!==1?"s":""}
          </span>
        )}
      </div>

      {/* PRICE SECTION — filled by seller */}
      <div style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:10,padding:16,marginBottom:open?16:0}}>
        <div style={{fontSize:11,color:"#1a385a",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>
          💰 Precio del Paquete — lo define el vendedor
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,alignItems:"end"}}>
          <div>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>
              Paquete ({destCount} destino{destCount!==1?"s":""})
            </div>
            <div style={{fontSize:11,color:"#9ca3af",marginBottom:6}}>
              {[...qcList.map(r=>`⭐ ${r.dest.name}`),...nqList.map(r=>`🔹 ${r.dest.name}`)].join(" · ")}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>
              Precio de venta ($)
            </div>
            <input
              style={{...S.inp,fontSize:16,fontWeight:700,color:"#a5d6a7"}}
              type="number"
              placeholder="Ej: 45,000"
              value={salePrice}
              onChange={e=>setSalePrice(e.target.value)}
            />
          </div>
          <div>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>
              Pago hoy / Enganche ($)
            </div>
            <input
              style={{...S.inp,fontSize:16,fontWeight:700,color:"#fff176"}}
              type="number"
              placeholder="Ej: 9,000"
              value={downPayment}
              onChange={e=>setDownPayment(e.target.value)}
            />
          </div>
        </div>
        {salePrice && downPayment && (
          <div style={{marginTop:12,display:"flex",gap:16,padding:"10px 14px",background:"#f4f5f7",borderRadius:8}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#a5d6a7"}}>${Number(salePrice).toLocaleString()}</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>Precio total</div>
            </div>
            <div style={{width:1,background:"#e3e6ea"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#fff176"}}>${Number(downPayment).toLocaleString()}</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>Pago hoy</div>
            </div>
            <div style={{width:1,background:"#e3e6ea"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#90caf9"}}>${(Number(salePrice)-Number(downPayment)).toLocaleString()}</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>Saldo restante</div>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[...qcList.map(r=>({r,type:"qc"})),...nqList.map(r=>({r,type:"nq"}))].map(({r,type})=>{
            const chosen = type==="qc" ? (selGifts[r.dest.id]||[]).map(gid=>r.dest.qc.gifts?.items?.find(g=>g.id===gid)).filter(Boolean) : [];
            const pkg = type==="qc" ? r.dest.qc : r.dest.nq;
            // collect unique plans from hotels
            const plans = [...new Set((type==="qc"?r.qualifiedHotels:r.dest.nq.hotels.filter(h=>h.active)).map(h=>h.plan))];
            return (
              <div key={r.dest.id} style={{background:"#f9fafb",borderRadius:10,padding:14,border:"1px solid #e3e6ea"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:(chosen.length>0||plans.length>0)?10:0}}>
                  <span style={{fontSize:22}}>{r.dest.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontWeight:800,color:"#fff",fontSize:14}}>{r.dest.name}</span>
                      <span style={{...S.pill,background:type==="qc"?"#e8f0fe":"#f3e8ff",color:type==="qc"?"#1565c0":"#7c3aed",fontSize:10}}>
                        {type==="qc"?"⭐ QC":"🔹 NQ"}
                      </span>
                    </div>
                    <div style={{fontSize:11,color:"#90caf9",marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
                      <span>🌙 {pkg.nights} noches</span>
                      {plans.length>0 && <span>🏨 {plans.join(" / ")}</span>}
                      {type==="nq"&&<span style={{color:"#9ca3af"}}>Sin regalos</span>}
                    </div>
                  </div>
                </div>
                {chosen.length>0 && (
                  <div style={{borderTop:"1px solid #e3e6ea",paddingTop:8}}>
                    <div style={{fontSize:10,color:"#fff176",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Regalos seleccionados</div>
                    {chosen.map(g=>(
                      <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:15}}>{g.icon}</span>
                        <span style={{fontSize:12,color:"#fff176",fontWeight:600}}>{g.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RULES TAB
// ═══════════════════════════════════════════════════════════════
function RulesTab({ destinations, onEdit }) {
  return (
    <div style={S.page}>
      {destinations.map(d=>(
        <div key={d.id} style={{...S.card,opacity:d.active?1:0.5,marginBottom:4}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>{d.icon}</span>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:800,color:"#fff",fontSize:14}}>{d.name}</span>
                  {d.nq?.enabled && <span style={{...S.pill,background:"#f3e8ff",color:"#7c3aed",borderColor:"#d8b4fe",fontSize:10}}>NQ disponible</span>}
                </div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{d.state} · QC: {d.qc.nights}n · {d.qc.hotels.filter(h=>h.active).length} hoteles{d.nq?.enabled?` · NQ: ${d.nq.nights}n · ${d.nq.hotels.filter(h=>h.active).length} hoteles`:""}</div>
              </div>
            </div>
            <button style={S.btnSec} onClick={()=>onEdit(d)}>✏ Editar</button>
          </div>

          <div style={{fontSize:10,color:"#1a385a",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Hoteles QC — Reglas de calificación</div>
          <table style={S.table}>
            <thead><tr>{["Hotel","Plan","Edad mín.","Edad máx.","Estados civiles"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {d.qc.hotels.map((h,i)=>(
                <tr key={h.id} style={{background:i%2===0?"#ffffff":"#f9fafb",opacity:h.active?1:0.4}}>
                  <td style={S.td}><span style={{fontWeight:700,color:"#fff"}}>{h.name}</span></td>
                  <td style={S.td}><span style={{...S.chip,background:"#e8f0fe",color:"#1565c0"}}>{h.plan}</span></td>
                  <td style={{...S.td,textAlign:"center"}}><span style={{color:"#fff176",fontWeight:700}}>{h.ageMin}</span></td>
                  <td style={{...S.td,textAlign:"center"}}><span style={{color:"#fff176",fontWeight:700}}>{h.ageMax}</span></td>
                  <td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{h.marital.map(m=><span key={m} style={S.chip}>{m}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>

          {d.nq?.enabled && d.nq.hotels.length>0 && (
            <>
              <div style={{fontSize:10,color:"#ce93d8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,margin:"14px 0 8px"}}>Hoteles NQ — Sin reglas de calificación (aplica a quien no cumple QC)</div>
              <table style={S.table}>
                <thead><tr>{["Hotel","Plan","Capacidad"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {d.nq.hotels.map((h,i)=>(
                    <tr key={h.id} style={{background:i%2===0?"#ffffff":"#f9fafb",opacity:h.active?1:0.4}}>
                      <td style={S.td}><span style={{fontWeight:700,color:"#1a1f2e"}}>{h.name}</span></td>
                      <td style={S.td}><span style={{...S.chip,background:"#f3e8ff",color:"#7c3aed"}}>{h.plan}</span></td>
                      <td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{h.capacity.map(c=><span key={c} style={S.chip}>{c}</span>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DESTINATION MODAL
// ═══════════════════════════════════════════════════════════════
function DestModal({ data, saving, onSave, onDelete, onClose }) {
  const blankDest = {
    name:"", state:"", icon:"🏖️", category:CATEGORIES[0], description:"", active:true,
    region:"internacional",
    includedGifts: [],
    qc:  { nights:5, ageMin:18, ageMax:99, marital:[], adultos:2, ninos:0, edadMaxNino:12, hotels:[], gifts:{ enabled:false, maxChoices:1, items:[] } },
    nq:  { enabled:false, nights:3, label:"", hotels:[] },
  };
  const clone = d => ({
    ...d,
    includedGifts: [...(d.includedGifts||[])],
    qc:  { ...d.qc, hotels:d.qc.hotels.map(h=>({...h,marital:[...h.marital],capacity:[...h.capacity],amenities:[...(h.amenities||[])],hotelGifts:[...(h.hotelGifts||[])]})), gifts:{ ...d.qc.gifts, items:(d.qc.gifts?.items||[]).map(g=>({...g})) } },
    nq:  { ...d.nq, hotels:(d.nq?.hotels||[]).map(h=>({...h,capacity:[...h.capacity],amenities:[...(h.amenities||[])],hotelGifts:[...(h.hotelGifts||[])]})) },
  });
  const [f, setF]   = useState(data ? clone(data) : blankDest);
  const [mTab, setMTab] = useState("info");
  const [editQCH, setEditQCH]   = useState(null);
  const [editNQH, setEditNQH]   = useState(null);
  const [editGift, setEditGift] = useState(null);
  const set  = (k,v)   => setF(p=>({...p,[k]:v}));
  const setQC = (k,v)  => setF(p=>({...p,qc:{...p.qc,[k]:v}}));
  const setNQ = (k,v)  => setF(p=>({...p,nq:{...p.nq,[k]:v}}));
  const setGC = (k,v)  => setF(p=>({...p,qc:{...p.qc,gifts:{...p.qc.gifts,[k]:v}}}));

  // QC hotels
  const saveQCH = h => { setF(p=>({...p,qc:{...p.qc,hotels:h.id?p.qc.hotels.map(x=>x.id===h.id?h:x):[...p.qc.hotels,{...h,id:uid()}]}})); setEditQCH(null); };
  const delQCH  = id => setF(p=>({...p,qc:{...p.qc,hotels:p.qc.hotels.filter(h=>h.id!==id)}}));
  const togQCH  = id => setF(p=>({...p,qc:{...p.qc,hotels:p.qc.hotels.map(h=>h.id===id?{...h,active:!h.active}:h)}}));

  // NQ hotels
  const saveNQH = h => { setF(p=>({...p,nq:{...p.nq,hotels:h.id?p.nq.hotels.map(x=>x.id===h.id?h:x):[...p.nq.hotels,{...h,id:uid()}]}})); setEditNQH(null); };
  const delNQH  = id => setF(p=>({...p,nq:{...p.nq,hotels:p.nq.hotels.filter(h=>h.id!==id)}}));
  const togNQH  = id => setF(p=>({...p,nq:{...p.nq,hotels:p.nq.hotels.map(h=>h.id===id?{...h,active:!h.active}:h)}}));

  // Gifts
  const saveGift = g => { setF(p=>({...p,qc:{...p.qc,gifts:{...p.qc.gifts,items:g.id?p.qc.gifts.items.map(x=>x.id===g.id?g:x):[...p.qc.gifts.items,{...g,id:uid()}]}}})); setEditGift(null); };
  const delGift  = id => setF(p=>({...p,qc:{...p.qc,gifts:{...p.qc.gifts,items:p.qc.gifts.items.filter(g=>g.id!==id)}}}));
  const togGift  = id => setF(p=>({...p,qc:{...p.qc,gifts:{...p.qc.gifts,items:p.qc.gifts.items.map(g=>g.id===id?{...g,active:!g.active}:g)}}}));

  const valid = f.name && f.state;
  const includedCount = (f.includedGifts||[]).length;
  const bonusCount = f.qc.gifts?.items?.length||0;
  const TABS = [
    ["info","📋 Info"],
    ["qc_hotels",`⭐ Hoteles QC (${f.qc.hotels.length})`],
    ["gifts",`🎁 Regalos (${includedCount}✓ + ${bonusCount}⭐)`],
    ["nq",`🔹 Paquete NQ (${f.nq?.hotels?.length||0})`]
  ];

  return (
    <div style={S.overlayBg}>
      <div style={{...S.modal,maxWidth:"780px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={S.modalTitle}>{data?"✏️ Editar Destino":"🗺️ Nuevo Destino"}</div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",gap:0,borderBottom:"1px solid #e3e6ea",marginBottom:20,flexWrap:"wrap"}}>
          {TABS.map(([id,label])=>(
            <button key={id} style={{...S.mTab,...(mTab===id?S.mTabOn:{})}} onClick={()=>setMTab(id)}>{label}</button>
          ))}
        </div>

        {/* INFO */}
        {mTab==="info" && (
          <div>
            <FLD label="Ícono"><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>{DEST_ICONS.map(e=><button key={e} style={{...S.emojiBtn,...(f.icon===e?S.emojiBtnOn:{})}} onClick={()=>set("icon",e)}>{e}</button>)}</div></FLD>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
              <FLD label="Nombre *"><INP value={f.name} onChange={v=>set("name",v)} placeholder="Cancún" /></FLD>
              <FLD label="Estado / Provincia *"><INP value={f.state} onChange={v=>set("state",v)} placeholder="Quintana Roo / Nevada" /></FLD>
              <FLD label="Categoría"><select style={S.inp} value={f.category} onChange={e=>set("category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FLD>
              <FLD label="Estado"><select style={S.inp} value={f.active?"1":"0"} onChange={e=>set("active",e.target.value==="1")}><option value="1">● Activo</option><option value="0">● Inactivo</option></select></FLD>
            </div>

            {/* REGIÓN */}
            <FLD label="Región">
              <div style={{display:"flex",gap:8,marginTop:6}}>
                {REGION_OPTIONS.map(r=>(
                  <button key={r.value} onClick={()=>set("region",r.value)}
                    style={{flex:1,padding:"10px 14px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                      border:`2px solid ${f.region===r.value?r.border:"#eceff3"}`,
                      background:f.region===r.value?r.bg:"transparent",
                      color:f.region===r.value?r.color:"#9ca3af",transition:"all 0.15s"}}>
                    {r.label}
                  </button>
                ))}
              </div>
            </FLD>

            <FLD label="Descripción"><textarea style={{...S.inp,height:64,resize:"vertical",marginTop:8}} value={f.description} onChange={e=>set("description",e.target.value)} /></FLD>

            {/* CALIFICACIÓN DEL DESTINO */}
            <div style={{marginTop:16,padding:"14px 16px",borderRadius:12,background:"#f0f7ff",border:"1px solid #c5d8fc"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1565c0",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>
                ✅ Calificación del destino
              </div>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:14}}>
                El vendedor solo verá este destino si el cliente cumple estas reglas.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                <FLD label="Noches QC">
                  <input style={S.inp} type="number" min="1" max="14" value={f.qc.nights||5}
                    onChange={e=>set("qc",Object.assign({},f.qc,{nights:Number(e.target.value)}))} />
                </FLD>
                <FLD label="Edad mínima">
                  <input style={S.inp} type="number" min="18" max="99" value={f.qc.ageMin||18}
                    onChange={e=>set("qc",Object.assign({},f.qc,{ageMin:Number(e.target.value)}))} />
                </FLD>
                <FLD label="Edad máxima">
                  <input style={S.inp} type="number" min="18" max="99" value={f.qc.ageMax||99}
                    onChange={e=>set("qc",Object.assign({},f.qc,{ageMax:Number(e.target.value)}))} />
                </FLD>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                <FLD label="Adultos incluidos">
                  <input style={S.inp} type="number" min="1" max="6" value={f.qc.adultos||2}
                    onChange={e=>set("qc",Object.assign({},f.qc,{adultos:Number(e.target.value)}))} />
                </FLD>
                <FLD label="Niños incluidos">
                  <input style={S.inp} type="number" min="0" max="6" value={f.qc.ninos||0}
                    onChange={e=>set("qc",Object.assign({},f.qc,{ninos:Number(e.target.value)}))} />
                </FLD>
                <FLD label="Edad máx. niño">
                  <input style={S.inp} type="number" min="0" max="17" value={f.qc.edadMaxNino||12}
                    onChange={e=>set("qc",Object.assign({},f.qc,{edadMaxNino:Number(e.target.value)}))}
                    disabled={!(f.qc.ninos>0)}
                    style={{...S.inp, opacity:f.qc.ninos>0?1:0.4}} />
                </FLD>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                <FLD label="Adultos incluidos">
                  <input style={S.inp} type="number" min="1" max="6" value={f.qc.adultos||2}
                    onChange={e=>set("qc",Object.assign({},f.qc,{adultos:Number(e.target.value)}))} />
                </FLD>
                <FLD label="Niños incluidos">
                  <input style={S.inp} type="number" min="0" max="6" value={f.qc.ninos||0}
                    onChange={e=>set("qc",Object.assign({},f.qc,{ninos:Number(e.target.value)}))} />
                </FLD>
                <FLD label="Edad máx. niño">
                  <input style={S.inp} type="number" min="0" max="17" value={f.qc.edadMaxNino||12}
                    onChange={e=>set("qc",Object.assign({},f.qc,{edadMaxNino:Number(e.target.value)}))}
                    disabled={!f.qc.ninos}
                    style={{...S.inp, opacity:f.qc.ninos?1:0.4}} />
                </FLD>
              </div>
              <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>
                Estados civiles que califican
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {["Casado","Union libre","Soltero hombre","Soltera mujer","Divorciado","Viudo"].map(function(ec){
                  var sel = (f.qc.marital||[]).includes(ec);
                  return (
                    <div key={ec} onClick={function(){
                      var cur = f.qc.marital||[];
                      var next = sel ? cur.filter(function(x){ return x!==ec; }) : cur.concat([ec]);
                      set("qc", Object.assign({},f.qc,{marital:next}));
                    }} style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:sel?"700":"400",
                      background:sel?"#1a385a":"#f4f5f7",color:sel?"#fff":"#6b7280",
                      border:"1px solid "+(sel?"#1a385a":"#e3e6ea"),transition:"all 0.14s"}}>
                      {ec}
                    </div>
                  );
                })}
              </div>
              {(f.qc.marital||[]).length===0 && (
                <div style={{marginTop:8,fontSize:11,color:"#f59e0b"}}>⚠ Selecciona al menos un estado civil</div>
              )}
            </div>
            <div style={{marginTop:16,padding:"14px 16px",borderRadius:12,background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.2)"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#4ade80",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>
                🎁 Regalos siempre incluidos en este destino
              </div>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:10}}>
                Todos los clientes que compren este destino reciben estos regalos. Aparecen en el certificado, verificación, CS y portal del cliente.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                {INCLUDED_GIFT_OPTIONS.map(g=>{
                  const sel=(f.includedGifts||[]).includes(g.id);
                  return(
                    <div key={g.id} onClick={()=>set("includedGifts",sel?(f.includedGifts||[]).filter(x=>x!==g.id):[...(f.includedGifts||[]),g.id])}
                      style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                        background:sel?"rgba(74,222,128,0.08)":"#fafbfc",
                        border:`1px solid ${sel?"rgba(74,222,128,0.35)":"#f0f1f4"}`,transition:"all 0.14s"}}>
                      <span style={{fontSize:16}}>{g.icon}</span>
                      <span style={{fontSize:11,fontWeight:sel?"700":"400",color:sel?"#4ade80":"#546e7a",flex:1}}>{g.label}</span>
                      {sel&&<span style={{color:"#4ade80",fontSize:13}}>✓</span>}
                    </div>
                  );
                })}
              </div>
              {(f.includedGifts||[]).length>0&&(
                <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.15)",fontSize:11,color:"#4ade80"}}>
                  ✓ {(f.includedGifts||[]).length} regalo{(f.includedGifts||[]).length!==1?"s":""} incluido{(f.includedGifts||[]).length!==1?"s":""}: {(f.includedGifts||[]).map(id=>INCLUDED_GIFT_OPTIONS.find(g=>g.id===id)?.label).filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QC HOTELS */}
        {mTab==="qc_hotels" && !editQCH && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <FLD label="Noches QC"><input style={{...S.inp,width:80,display:"inline-block"}} type="number" min="1" max="30" value={f.qc.nights} onChange={e=>setQC("nights",Number(e.target.value))} /></FLD>
              </div>
              <button style={S.btnAdd} onClick={()=>setEditQCH("new")}>+ Agregar Hotel QC</button>
            </div>
            {f.qc.hotels.length===0&&<div style={{...S.empty,border:"1px dashed #e3e6ea",borderRadius:8,padding:24}}>Sin hoteles QC aún.</div>}
            {f.qc.hotels.map(h=>(
              <div key={h.id} style={{...S.expandRow,opacity:h.active?1:0.5}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:"#fff"}}>{h.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                    <span style={{...S.chip,background:"#e8f0fe",color:"#1565c0"}}>{h.plan}</span>
                    {h.capacity.map(c=><span key={c} style={{...S.chip,background:"#edf7ee",color:"#1a7f3c"}}>{c}</span>)}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>🎂 {h.ageMin}–{h.ageMax} · {h.marital.join(", ")}</div>
                </div>
                <div style={{display:"flex",gap:5}}><button style={S.btnXs} onClick={()=>togQCH(h.id)}>{h.active?"Desactivar":"Activar"}</button><button style={S.btnXs} onClick={()=>setEditQCH(h)}>Editar</button><button style={{...S.btnXs,color:"#ef9a9a"}} onClick={()=>delQCH(h.id)}>🗑</button></div>
              </div>
            ))}
          </div>
        )}
        {mTab==="qc_hotels" && editQCH && <HotelQCForm data={editQCH==="new"?null:editQCH} onSave={saveQCH} onCancel={()=>setEditQCH(null)} />}

        {/* GIFTS — 2 secciones */}
        {mTab==="gifts" && !editGift && (
          <div>
            {/* ── SECCIÓN 1: Siempre incluidos ── */}
            <div style={{marginBottom:20,padding:"14px 16px",borderRadius:12,background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:"#4ade80",letterSpacing:"0.08em",textTransform:"uppercase"}}>✅ Siempre incluidos en este destino</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>Todos los clientes los reciben. Aparecen en el certificado, portal y reserva.</div>
                </div>
                <span style={{fontSize:11,color:"#4ade80",fontWeight:700,background:"rgba(74,222,128,0.1)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(74,222,128,0.25)",whiteSpace:"nowrap"}}>
                  {(f.includedGifts||[]).length} activos
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                {INCLUDED_GIFT_OPTIONS.map(g=>{
                  const sel=(f.includedGifts||[]).includes(g.id);
                  return(
                    <div key={g.id} onClick={()=>set("includedGifts",sel?(f.includedGifts||[]).filter(x=>x!==g.id):[...(f.includedGifts||[]),g.id])}
                      style={{padding:"7px 10px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                        background:sel?"rgba(74,222,128,0.08)":"#fafbfc",
                        border:`1px solid ${sel?"rgba(74,222,128,0.35)":"#f2f3f6"}`,transition:"all 0.13s"}}>
                      <span style={{fontSize:16}}>{g.icon}</span>
                      <span style={{fontSize:11,fontWeight:sel?"700":"400",color:sel?"#4ade80":"#546e7a",flex:1}}>{g.label}</span>
                      {sel&&<span style={{color:"#4ade80",fontSize:12,flexShrink:0}}>✓</span>}
                    </div>
                  );
                })}
              </div>
              {(f.includedGifts||[]).length>0&&(
                <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.15)",fontSize:11,color:"#4ade80"}}>
                  🎁 {(f.includedGifts||[]).map(id=>INCLUDED_GIFT_OPTIONS.find(g=>g.id===id)?.label).filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            {/* ── SECCIÓN 2: Bono exclusivo (vendedor elige uno) ── */}
            <div style={{padding:"14px 16px",borderRadius:12,background:"rgba(251,191,36,0.04)",border:"1px solid rgba(251,191,36,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:"#fbbf24",letterSpacing:"0.08em",textTransform:"uppercase"}}>⭐ Bono exclusivo del destino</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>El vendedor elige <strong style={{color:"#fbbf24"}}>uno</strong> al cerrar la venta. Se confirma en verificación.</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {f.qc.gifts.enabled&&<span style={{fontSize:11,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,0.1)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(251,191,36,0.25)",whiteSpace:"nowrap"}}>{f.qc.gifts.items.length} opciones</span>}
                  <div style={{display:"flex",gap:6}}>
                    {[true,false].map(v=><button key={String(v)} style={{...S.toggleBtn,padding:"5px 12px",fontSize:11,...(f.qc.gifts.enabled===v?{...S.toggleOn,borderColor:"#c17900",color:"#fbbf24",background:"rgba(193,121,0,0.2)"}:{})}} onClick={()=>setGC("enabled",v)}>{v?"⭐ Activo":"Desactivado"}</button>)}
                  </div>
                </div>
              </div>
              {f.qc.gifts.enabled && (
                <>
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                    <button style={{...S.btnAdd,background:"#c17900",fontSize:12}} onClick={()=>setEditGift("new")}>+ Agregar opción de bono</button>
                  </div>
                  {f.qc.gifts.items.length===0&&<div style={{textAlign:"center",padding:"20px",color:"#9ca3af",fontSize:12,fontStyle:"italic",border:"1px dashed rgba(251,191,36,0.2)",borderRadius:8}}>Sin opciones de bono aún. El vendedor no podrá elegir ningún bono para este destino.</div>}
                  {f.qc.gifts.items.map(g=>(
                    <div key={g.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:9,marginBottom:6,
                      background:g.active?"rgba(251,191,36,0.05)":"rgba(255,255,255,0.01)",
                      border:`1px solid ${g.active?"rgba(251,191,36,0.2)":"#f4f5f7"}`,opacity:g.active?1:0.45}}>
                      <span style={{fontSize:22}}>{g.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,color:g.active?"#fbbf24":"#546e7a",fontSize:13}}>{g.name}</div>
                        {g.description&&<div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{g.description}</div>}
                      </div>
                      <div style={{display:"flex",gap:5}}>
                        <button style={S.btnXs} onClick={()=>togGift(g.id)}>{g.active?"Desactivar":"Activar"}</button>
                        <button style={S.btnXs} onClick={()=>setEditGift(g)}>Editar</button>
                        <button style={{...S.btnXs,color:"#ef9a9a"}} onClick={()=>delGift(g.id)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
        {mTab==="gifts" && editGift && <GiftForm data={editGift==="new"?null:editGift} onSave={saveGift} onCancel={()=>setEditGift(null)} />}

        {/* NQ */}
        {mTab==="nq" && !editNQH && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,background:"#f9fafb",borderRadius:10,padding:14,border:"1px solid #e3e6ea"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:"#fff"}}>¿Este destino tiene paquete NQ?</div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Para clientes que no cumplen las reglas QC. Mismo precio, menos noches, hoteles distintos, sin regalos.</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {[true,false].map(v=><button key={String(v)} style={{...S.toggleBtn,...(f.nq.enabled===v?{...S.toggleOn,borderColor:"#7b2ff7",color:"#ce93d8",background:"rgba(123,47,247,0.2)"}:{})}} onClick={()=>setNQ("enabled",v)}>{v?"🔹 Sí":"Sin NQ"}</button>)}
              </div>
            </div>
            {f.nq.enabled && (
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <FLD label="Nombre del paquete NQ"><INP value={f.nq.label} onChange={v=>setNQ("label",v)} placeholder="Cancún Esencial" /></FLD>
                  <FLD label="Noches NQ"><input style={S.inp} type="number" min="1" max="30" value={f.nq.nights} onChange={e=>setNQ("nights",Number(e.target.value))} /></FLD>
                </div>
                <div style={{...S.card,background:"#f9fafb",border:"1px dashed #d8b4fe",marginBottom:12,padding:10}}>
                  <div style={{fontSize:11,color:"#ce93d8"}}>🔒 Los regalos no aplican al paquete NQ — siempre van sin regalos.</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontSize:12,color:"#9ca3af"}}>{f.nq.hotels.length} hotel(es) NQ</span>
                  <button style={{...S.btnAdd,background:"#4a2580"}} onClick={()=>setEditNQH("new")}>+ Agregar Hotel NQ</button>
                </div>
                {f.nq.hotels.length===0&&<div style={{...S.empty,border:"1px dashed #4a2580",borderRadius:8,padding:24,color:"#ce93d8"}}>Sin hoteles NQ aún.</div>}
                {f.nq.hotels.map(h=>(
                  <div key={h.id} style={{...S.expandRow,opacity:h.active?1:0.5,background:"#f9fafb",borderRadius:8,marginBottom:6}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:"#1a1f2e"}}>{h.name}</div>
                      <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                        <span style={{...S.chip,background:"#f3e8ff",color:"#7c3aed"}}>{h.plan}</span>
                        {h.capacity.map(c=><span key={c} style={S.chip}>{c}</span>)}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:5}}><button style={S.btnXs} onClick={()=>togNQH(h.id)}>{h.active?"Desactivar":"Activar"}</button><button style={S.btnXs} onClick={()=>setEditNQH(h)}>Editar</button><button style={{...S.btnXs,color:"#ef9a9a"}} onClick={()=>delNQH(h.id)}>🗑</button></div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {mTab==="nq" && editNQH && <HotelNQForm data={editNQH==="new"?null:editNQH} onSave={saveNQH} onCancel={()=>setEditNQH(null)} />}

        <div style={{display:"flex",justifyContent:"space-between",marginTop:22}}>
          <div>{onDelete&&<button style={{...S.btnXs,color:"#ef9a9a",padding:"8px 14px",fontSize:12}} onClick={onDelete}>🗑 Eliminar</button>}</div>
          <div style={{display:"flex",gap:10}}>
            <button style={S.btnSec} onClick={onClose}>Cancelar</button>
            <button style={Object.assign({},S.btnAdd,{opacity:(valid&&!saving)?1:0.4,cursor:(valid&&!saving)?"pointer":"not-allowed"})} onClick={function(){ if(valid&&!saving) onSave(f); }}>{saving ? "Guardando..." : (data?"Guardar cambios":"Crear destino")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOTEL FORMS
// ═══════════════════════════════════════════════════════════════
function HotelQCForm({ data, onSave, onCancel }) {
  const blank = { name:"", plan:PLAN_OPTIONS[0], capacity:[], ageMin:25, ageMax:65, marital:[], active:true, amenities:[], hotelGifts:[] };
  const [h, setH] = useState(data?{...data,capacity:[...data.capacity],marital:[...data.marital],amenities:[...(data.amenities||[])],hotelGifts:[...(data.hotelGifts||[])]}:blank);
  const [newHG, setNewHG] = useState("");
  const set=(k,v)=>setH(p=>({...p,[k]:v}));
  const tog=(k,v)=>setH(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const addHG=()=>{ if(newHG.trim()){ set("hotelGifts",[...h.hotelGifts,newHG.trim()]); setNewHG(""); }};
  const valid=h.name&&h.capacity.length>0&&h.marital.length>0;
  return (
    <div style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:10,padding:16}}>
      <div style={{fontSize:13,fontWeight:700,color:"#1a385a",marginBottom:14}}>{data?"✏️ Editar hotel QC":"🏨 Nuevo hotel QC"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <FLD label="Nombre *"><INP value={h.name} onChange={v=>set("name",v)} placeholder="Grand Oasis Palm" /></FLD>
        <FLD label="Plan incluido"><select style={S.inp} value={h.plan} onChange={e=>set("plan",e.target.value)}>{PLAN_OPTIONS.map(p=><option key={p}>{p}</option>)}</select></FLD>
        <FLD label="Edad mín."><input style={S.inp} type="number" min="18" max="99" value={h.ageMin} onChange={e=>set("ageMin",Number(e.target.value))} /></FLD>
        <FLD label="Edad máx."><input style={S.inp} type="number" min="18" max="99" value={h.ageMax} onChange={e=>set("ageMax",Number(e.target.value))} /></FLD>
      </div>
      <FLD label="Capacidad *"><div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>{CAPACITY_OPTIONS.map(c=><button key={c} style={{...S.toggleBtn,...(h.capacity.includes(c)?S.toggleOn:{})}} onClick={()=>tog("capacity",c)}>{c}</button>)}</div></FLD>
      <FLD label="Estados civiles *"><div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>{MARITAL_OPTIONS.map(m=><button key={m} style={{...S.toggleBtn,...(h.marital.includes(m)?S.toggleOn:{})}} onClick={()=>tog("marital",m)}>{m}</button>)}</div></FLD>

      {/* Amenidades del hotel */}
      <div style={{marginTop:14,padding:"12px 14px",borderRadius:10,background:"rgba(79,195,247,0.05)",border:"1px solid rgba(79,195,247,0.15)"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#1a385a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>🏨 Amenidades del hotel</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
          {AMENITY_OPTIONS.map(a=>{
            const sel=h.amenities.includes(a);
            return(
              <div key={a} onClick={()=>tog("amenities",a)}
                style={{padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:11,
                  background:sel?"rgba(79,195,247,0.1)":"#fafbfc",
                  border:`1px solid ${sel?"rgba(79,195,247,0.3)":"#f2f3f6"}`,
                  color:sel?"#1565c0":"#9ca3af",fontWeight:sel?"700":"400",transition:"all 0.12s",textAlign:"center"}}>
                {a}
              </div>
            );
          })}
        </div>
      </div>

      {/* Regalos específicos del hotel */}
      <div style={{marginTop:12,padding:"12px 14px",borderRadius:10,background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.18)"}}>
        <div style={{fontSize:10,fontWeight:800,color:"#4ade80",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>🎁 Regalos extra que da este hotel</div>
        <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>Aparecen junto con los regalos del destino en el certificado y reserva.</div>
        {h.hotelGifts.map((g,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:7,marginBottom:4,background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.15)"}}>
            <span style={{fontSize:13}}>🎁</span>
            <span style={{flex:1,fontSize:12,color:"#4ade80"}}>{g}</span>
            <button style={{...S.btnXs,color:"#ef9a9a",padding:"2px 7px"}} onClick={()=>set("hotelGifts",h.hotelGifts.filter((_,j)=>j!==i))}>✕</button>
          </div>
        ))}
        <div style={{display:"flex",gap:6,marginTop:6}}>
          <input style={{...S.inp,flex:1}} placeholder='Ej: "Masaje de bienvenida 30 min"' value={newHG} onChange={e=>setNewHG(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addHG()} />
          <button style={{...S.btnAdd,padding:"8px 14px",fontSize:12}} onClick={addHG}>+ Agregar</button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <button style={S.btnSec} onClick={onCancel}>Cancelar</button>
        <button style={{...S.btnAdd,opacity:valid?1:0.4}} onClick={()=>valid&&onSave(h)}>{data?"Guardar cambios":"Agregar hotel"}</button>
      </div>
    </div>
  );
}

function HotelNQForm({ data, onSave, onCancel }) {
  const blank = { name:"", plan:PLAN_OPTIONS[0], capacity:[], active:true };
  const [h, setH] = useState(data?{...data,capacity:[...data.capacity]}:blank);
  const set=(k,v)=>setH(p=>({...p,[k]:v}));
  const tog=(k,v)=>setH(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const valid=h.name&&h.capacity.length>0;
  return (
    <div style={{background:"#f9fafb",border:"1px solid #d8b4fe",borderRadius:10,padding:16}}>
      <div style={{fontSize:13,fontWeight:700,color:"#ce93d8",marginBottom:14}}>{data?"✏️ Editar hotel NQ":"🔹 Hotel NQ"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <FLD label="Nombre *"><INP value={h.name} onChange={v=>set("name",v)} placeholder="Crown Paradise" /></FLD>
        <FLD label="Plan"><select style={S.inp} value={h.plan} onChange={e=>set("plan",e.target.value)}>{PLAN_OPTIONS.map(p=><option key={p}>{p}</option>)}</select></FLD>
      </div>
      <FLD label="Capacidad *"><div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>{CAPACITY_OPTIONS.map(c=><button key={c} style={{...S.toggleBtn,...(h.capacity.includes(c)?{...S.toggleOn,borderColor:"#7b2ff7",color:"#ce93d8",background:"rgba(123,47,247,0.2)"}:{})}} onClick={()=>tog("capacity",c)}>{c}</button>)}</div></FLD>
      <div style={{fontSize:11,color:"#9ca3af",marginTop:10,fontStyle:"italic"}}>Los hoteles NQ no tienen reglas de calificación — aplican a todos los que no cumplen QC.</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}><button style={S.btnSec} onClick={onCancel}>Cancelar</button><button style={{...S.btnAdd,background:"#4a2580",opacity:valid?1:0.4}} onClick={()=>valid&&onSave(h)}>{data?"Guardar":"Agregar"}</button></div>
    </div>
  );
}

function GiftForm({ data, onSave, onCancel }) {
  const blank={ icon:"🎁", name:"", description:"", active:true };
  const [g,setG]=useState(data?{...data}:blank);
  const set=(k,v)=>setG(p=>({...p,[k]:v}));
  const valid=g.name;
  return (
    <div style={{background:"#fffbe0",border:"1px solid #f0d080",borderRadius:10,padding:16}}>
      <div style={{fontSize:13,fontWeight:700,color:"#fff176",marginBottom:14}}>{data?"✏️ Editar regalo":"🎁 Nuevo regalo"}</div>
      <FLD label="Ícono"><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>{GIFT_ICONS.map(e=><button key={e} style={{...S.emojiBtn,...(g.icon===e?{...S.emojiBtnOn,borderColor:"#f9a825"}:{})}} onClick={()=>set("icon",e)}>{e}</button>)}</div></FLD>
      <div style={{marginTop:12}}>
        <FLD label="Nombre *">
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6,marginTop:4}}>{GIFT_SUGGESTIONS.map(s=><button key={s} style={S.btnXs} onClick={()=>set("name",s)}>{s}</button>)}</div>
          <INP value={g.name} onChange={v=>set("name",v)} placeholder="Noche extra" />
        </FLD>
        <FLD label="Descripción"><textarea style={{...S.inp,height:56,resize:"vertical",marginTop:6}} value={g.description} onChange={e=>set("description",e.target.value)} placeholder="Detalle del regalo…" /></FLD>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}><button style={S.btnSec} onClick={onCancel}>Cancelar</button><button style={{...S.btnAdd,background:"#c17900",opacity:valid?1:0.4}} onClick={()=>valid&&onSave(g)}>{data?"Guardar":"Agregar"}</button></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════
function FLD({label,children}){ return <div style={{marginBottom:4}}><div style={S.lbl}>{label}</div>{children}</div>; }
function INP({value,onChange,placeholder=""}){ return <input style={S.inp} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />; }

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const S = {
  // ── Layout
  root:       { display:"flex",flexDirection:"column",minHeight:"100vh",background:"#f4f5f7",fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",color:"#3d4554",fontSize:13 },
  header:     { background:"#ffffff",borderBottom:"1px solid #e3e6ea",padding:"0 24px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",minHeight:52,position:"sticky",top:0,zIndex:100 },
  brand:      { display:"flex",alignItems:"center",gap:10,padding:"10px 0",flexShrink:0 },
  brandTitle: { fontSize:15,fontWeight:700,color:"#1a1f2e",letterSpacing:0 },
  brandSub:   { fontSize:11,color:"#9ca3af",marginTop:2 },
  tabRow:     { display:"flex",flex:1 },
  tabBtn:     { background:"none",border:"none",borderBottom:"2px solid transparent",color:"#9ca3af",padding:"16px 14px",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",transition:"all 0.15s" },
  tabOn:      { color:"#1a385a",borderBottomColor:"#1a385a" },
  body:       { flex:1,overflowY:"auto" },
  page:       { padding:"20px 24px",display:"flex",flexDirection:"column",gap:16 },
  // ── Toolbar
  toolbar:    { display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" },
  search:     { background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:8,color:"#1a1f2e",padding:"8px 12px",fontSize:13,flex:1,minWidth:180,outline:"none" },
  select:     { background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:8,color:"#3d4554",padding:"8px 12px",fontSize:13,outline:"none",cursor:"pointer" },
  empty:      { textAlign:"center",color:"#9ca3af",padding:"32px 0",fontSize:13 },
  // ── Destination grid & card
  destGrid:   { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:16 },
  destCard:   { background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",transition:"box-shadow 0.18s" },
  destBanner: { position:"relative",height:96,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#1a2e4a,#1a385a)" },
  pkgRow:     { display:"flex",borderBottom:"1px solid #f0f1f4" },
  pkgBtn:     { flex:1,background:"none",border:"none",color:"#3d4554",padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"background 0.15s",fontSize:12,fontWeight:600 },
  pkgBtnOn:   { background:"#f4f5f7" },
  expandPanel:{ background:"#f9fafb",borderBottom:"1px solid #e3e6ea" },
  panelSection:{ padding:"12px 16px" },
  panelLabel: { fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8 },
  hotelRow:   { display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f0f1f4" },
  destActions:{ display:"flex",gap:8,padding:"12px 14px",borderTop:"1px solid #e3e6ea",marginTop:"auto",background:"#fafafa" },
  pill:       { padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700 },
  chip:       { padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:"#e8f0fe",color:"#1565c0",border:"1px solid #c5d8fc" },
  // ── Cards genéricos (qualify/rules)
  card:       { background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:12,padding:18,boxShadow:"0 1px 3px rgba(0,0,0,0.04)" },
  cardTitle:  { fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,paddingBottom:8,borderBottom:"1px solid #e3e6ea" },
  qRow:       { border:"1px solid #e3e6ea",borderRadius:10,padding:14,background:"#f9fafb" },
  notQualRow: { display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f0f1f4" },
  giftBtn:    { background:"#f9fafb",border:"1px solid",borderRadius:10,padding:12,textAlign:"left",transition:"all 0.15s",width:"100%",cursor:"pointer" },
  // ── Table
  table:      { width:"100%",borderCollapse:"collapse" },
  th:         { background:"#f4f5f7",color:"#9ca3af",padding:"8px 12px",textAlign:"left",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid #e3e6ea",whiteSpace:"nowrap" },
  td:         { padding:"9px 12px",borderBottom:"1px solid #f0f1f4",verticalAlign:"middle",color:"#3d4554" },
  expandRow:  { display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f0f1f4" },
  // ── Modal
  overlayBg:  { position:"fixed",inset:0,background:"rgba(15,20,30,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20 },
  modal:      { background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:14,padding:26,width:"100%",maxWidth:680,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.10)" },
  modalTitle: { fontSize:16,fontWeight:700,color:"#1a1f2e" },
  closeBtn:   { background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:20,lineHeight:1 },
  mTab:       { background:"none",border:"none",borderBottom:"2px solid transparent",color:"#9ca3af",padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:600 },
  mTabOn:     { color:"#1a385a",borderBottomColor:"#1a385a" },
  lbl:        { fontSize:10,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,display:"block" },
  inp:        { background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:8,color:"#1a1f2e",padding:"8px 11px",fontSize:13,width:"100%",boxSizing:"border-box",outline:"none",display:"block",fontFamily:"inherit" },
  emojiBtn:   { background:"#f4f5f7",border:"1px solid #e3e6ea",borderRadius:8,padding:"6px 9px",fontSize:18,cursor:"pointer" },
  emojiBtnOn: { border:"1px solid #aac4f0",background:"#e8f0fe" },
  toggleBtn:  { background:"#f4f5f7",border:"1px solid #e3e6ea",borderRadius:8,color:"#9ca3af",padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",flex:1 },
  toggleOn:   { background:"#e8f0fe",borderColor:"#aac4f0",color:"#1565c0" },
  // ── Buttons
  btnAdd:     { background:"#1a385a",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" },
  btnSec:     { background:"#f4f5f7",color:"#3d4554",border:"1px solid #e3e6ea",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer" },
  btnXs:      { background:"#f4f5f7",color:"#3d4554",border:"1px solid #e3e6ea",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit" },
  // ── Toast
  toast:      { position:"fixed",bottom:24,right:24,color:"#fff",padding:"12px 22px",borderRadius:9,fontWeight:600,fontSize:13,zIndex:300,border:"1px solid",boxShadow:"0 4px 20px rgba(0,0,0,0.15)" },
};
