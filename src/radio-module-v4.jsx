import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

var SB = createClient(
  "https://gsvnvahrjgswwejnuiyn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA"
);

// Brand tokens
var C = {
  dark:    "#1a385a",
  mid:     "#47718a",
  bg:      "#f0f2f5",
  surface: "#ffffff",
  border:  "#dde3ea",
  borderL: "#eef0f3",
  text1:   "#0f1923",
  text2:   "#3d5166",
  text3:   "#7a92a8",
  text4:   "#b0c0cc",
  green:   "#16a34a",
  greenBg: "#f0fdf4",
  greenBd: "#bbf7d0",
  amber:   "#d97706",
  amberBg: "#fffbeb",
  amberBd: "#fde68a",
  red:     "#dc2626",
  redBg:   "#fef2f2",
  redBd:   "#fecaca",
  blue:    "#0369a1",
  blueBg:  "#eff6ff",
  blueBd:  "#bfdbfe",
};
var FONT = "'Poppins','Segoe UI',sans-serif";

// Catalogos
var TIPOS_SPOT  = ["30seg","60seg","45seg","90seg","Mencion","Cuna"];
var DIAS_SEMANA = ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado","Domingo"];
var STATUS_OPTS = ["pendiente","ordenado","confirmado","pagado"];

var STATUS_META = {
  pendiente:  {label:"Pendiente",  color:C.text3,  bg:"#f8fafc",     bd:C.border},
  ordenado:   {label:"Ordenado",   color:C.blue,   bg:C.blueBg,      bd:C.blueBd},
  confirmado: {label:"Confirmado", color:C.amber,  bg:C.amberBg,     bd:C.amberBd},
  pagado:     {label:"Pagado",     color:C.green,  bg:C.greenBg,     bd:C.greenBd},
};

var INC_META = {
  no_salio:  {label:"No salio",  color:C.red,   bg:C.redBg,   bd:C.redBd,  credito:true},
  salio_mal: {label:"Salio mal", color:C.amber, bg:C.amberBg, bd:C.amberBd,credito:false},
  aircheck:  {label:"Aircheck",  color:"#1565c0", bg:"#e8f0fe", bd:"#aac4f0",credito:false},
  otros:     {label:"Otros",     color:"#5b21b6", bg:"#ede9fe", bd:"#c4b5fd",credito:false},
};

// Helpers de fecha
function hoy() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); }
function lunesDe(dateStr) {
  var d   = new Date(dateStr + "T12:00:00");
  var day = d.getDay();
  var mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return mon.toISOString().split("T")[0];
}
function domingoDe(lunesStr) {
  var d = new Date(lunesStr + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}
function fechaDeDia(lunes, dia) {
  var idx = DIAS_SEMANA.indexOf(dia);
  var d   = new Date(lunes + "T12:00:00");
  d.setDate(d.getDate() + (idx < 0 ? 0 : idx));
  return d.toISOString().split("T")[0];
}
function fmtFecha(str) {
  if (!str) return "-";
  var d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("es-MX", {weekday:"short", day:"2-digit", month:"short"});
}
function fmtHora(t) {
  if (!t) return "-";
  var parts = t.split(":");
  var h = parseInt(parts[0]);
  var m = parts[1] || "00";
  var ampm = h >= 12 ? "PM" : "AM";
  var h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return h12 + ":" + m + " " + ampm;
}
function fmtUSD(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
}
function uid() { return "L" + Date.now() + Math.floor(Math.random() * 9999); }
function precioEquipoCalc(spot) {
  var base = Number(spot.costo || 0) * 1.15 + Number(spot.talento || 0);
  return spot.precioEquipo != null ? Number(spot.precioEquipo) : base;
}

//  Componentes base 

function Inp(props) {
  return (
    <input
      type={props.type || "text"}
      value={props.value}
      onChange={props.onChange}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      placeholder={props.placeholder || ""}
      disabled={props.disabled}
      min={props.min}
      max={props.max}
      step={props.step}
      style={Object.assign({
        width: "100%", padding: "9px 12px",
        border: "1.5px solid " + (props.error ? C.red : C.border),
        borderRadius: "8px", fontSize: "13px", color: C.text1,
        background: props.disabled ? C.bg : C.surface,
        outline: "none", boxSizing: "border-box", fontFamily: FONT,
        transition: "border-color 0.15s",
      }, props.style || {})}
    />
  );
}

function Sel(props) {
  return (
    <select
      value={props.value}
      onChange={props.onChange}
      disabled={props.disabled}
      style={Object.assign({
        width: "100%", padding: "9px 12px",
        border: "1.5px solid " + (props.error ? C.red : C.border),
        borderRadius: "8px", fontSize: "13px", color: C.text1,
        background: C.surface, outline: "none",
        boxSizing: "border-box", fontFamily: FONT, cursor: "pointer",
      }, props.style || {})}
    >
      {props.children}
    </select>
  );
}

function Lbl(props) {
  return (
    <div style={{
      fontSize: "11px", fontWeight: "600", color: C.text3,
      marginBottom: "5px", letterSpacing: "0.01em",
    }}>
      {props.children}
    </div>
  );
}

function Btn(props) {
  var v = props.v || "primary";
  var sm = props.sm;
  var styles = {
    primary: {bg:"linear-gradient(135deg,"+C.dark+","+C.mid+")", color:"#fff",   bd:"transparent"},
    ghost:   {bg:C.bg,                                            color:C.text2,  bd:C.border},
    danger:  {bg:C.redBg,                                         color:C.red,    bd:C.redBd},
    success: {bg:C.greenBg,                                       color:C.green,  bd:C.greenBd},
    amber:   {bg:C.amberBg,                                       color:C.amber,  bd:C.amberBd},
    blue:    {bg:C.blueBg,                                        color:C.blue,   bd:C.blueBd},
  };
  var st = styles[v] || styles.ghost;
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: sm ? "5px 11px" : "9px 16px",
        border: "1px solid " + st.bd,
        borderRadius: "8px", cursor: props.disabled ? "not-allowed" : "pointer",
        fontSize: sm ? "11px" : "13px", fontWeight: "600",
        background: st.bg, color: st.color,
        whiteSpace: "nowrap", fontFamily: FONT,
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      {props.children}
    </button>
  );
}

function Badge(props) {
  var meta = props.meta || {};
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: "20px",
      fontSize: "10px", fontWeight: "700",
      color:   meta.color || C.text3,
      background: meta.bg || C.bg,
      border: "1px solid " + (meta.bd || C.border),
      whiteSpace: "nowrap",
    }}>
      {props.children || meta.label}
    </span>
  );
}

function Card(props) {
  return (
    <div style={Object.assign({
      background: C.surface, borderRadius: "12px",
      border: "1px solid " + C.border,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }, props.style || {})} onClick={props.onClick}>
      {props.children}
    </div>
  );
}

function Divider(props) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      margin: "16px 0 12px",
    }}>
      <div style={{fontSize:"10px",fontWeight:"700",color:C.text4,textTransform:"uppercase",letterSpacing:"0.1em",whiteSpace:"nowrap"}}>
        {props.label}
      </div>
      <div style={{flex:1,height:"1px",background:C.borderL}}/>
    </div>
  );
}

//  Modal Emisora 

function EmisoraModal(props) {
  var em = props.emisora;
  var isNew = !em;
  var blank = {nombre:"",frecuencia:"",ciudad:"",contrato:"",activo:true,
    vendedor:"",telefono:"",email:"",tarifaBase:"",notas:""};
  var [d, setD] = useState(isNew ? blank : Object.assign({}, em));
  var [errs, setErrs] = useState({});
  function set(k, v) { setD(function(p){return Object.assign({},p,{[k]:v});}); setErrs(function(p){return Object.assign({},p,{[k]:null});}); }

  function save() {
    var e = {};
    if (!d.nombre.trim())     e.nombre    = "Requerido";
    if (!d.frecuencia.trim()) e.frecuencia= "Requerido";
    if (!d.ciudad.trim())     e.ciudad    = "Requerido";
    if (!d.contrato.trim())   e.contrato  = "Requerido";
    if (Object.keys(e).length) { setErrs(e); return; }
    props.onSave(Object.assign({},d,{tarifaBase:Number(d.tarifaBase)||0}));
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.6)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:C.surface,borderRadius:"16px",width:"100%",maxWidth:"560px",
        maxHeight:"90vh",overflow:"auto",boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>

        <div style={{padding:"16px 20px",background:"linear-gradient(135deg,"+C.dark+","+C.mid+")",
          borderRadius:"16px 16px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:"600",color:"#1a1f2e"}}>
              {isNew ? "Nueva emisora" : d.nombre}
            </div>
            <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"1px"}}>
              {isNew ? "Completa los datos del medio" : d.frecuencia + " - " + d.ciudad}
            </div>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            <Btn v="ghost" sm onClick={props.onClose}>Cancelar</Btn>
            <button onClick={save} style={{background:"#fff",border:"none",borderRadius:"7px",
              color:C.dark,padding:"5px 14px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:FONT}}>
              {isNew ? "Agregar" : "Guardar"}
            </button>
          </div>
        </div>

        <div style={{padding:"20px"}}>
          <Divider label="Datos del medio"/>
          <div style={{marginBottom:"12px"}}>
            <Lbl>Nombre *</Lbl>
            <Inp value={d.nombre} onChange={function(e){set("nombre",e.target.value);}}
              error={errs.nombre} placeholder="ej. Radio Hits"/>
            {errs.nombre && <div style={{fontSize:"11px",color:C.red,marginTop:"3px"}}>{errs.nombre}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <Lbl>Frecuencia *</Lbl>
              <Inp value={d.frecuencia} onChange={function(e){set("frecuencia",e.target.value);}}
                error={errs.frecuencia} placeholder="99.3 FM"/>
              {errs.frecuencia && <div style={{fontSize:"11px",color:C.red,marginTop:"3px"}}>{errs.frecuencia}</div>}
            </div>
            <div>
              <Lbl>Ciudad *</Lbl>
              <Inp value={d.ciudad} onChange={function(e){set("ciudad",e.target.value);}}
                error={errs.ciudad} placeholder="Miami"/>
              {errs.ciudad && <div style={{fontSize:"11px",color:C.red,marginTop:"3px"}}>{errs.ciudad}</div>}
            </div>
            <div>
              <Lbl>Tarifa base (USD)</Lbl>
              <Inp type="number" min="0" value={d.tarifaBase}
                onChange={function(e){set("tarifaBase",e.target.value);}} placeholder="68"/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <Lbl>Num. contrato *</Lbl>
              <Inp value={d.contrato} onChange={function(e){set("contrato",e.target.value);}}
                error={errs.contrato} placeholder="RH-2026-01"/>
              {errs.contrato && <div style={{fontSize:"11px",color:C.red,marginTop:"3px"}}>{errs.contrato}</div>}
            </div>
            <div style={{display:"flex",alignItems:"flex-end",paddingBottom:"2px"}}>
              <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"13px",color:C.text2}}>
                <input type="checkbox" checked={d.activo}
                  onChange={function(e){set("activo",e.target.checked);}}/>
                Emisora activa
              </label>
            </div>
          </div>

          <Divider label="Contacto comercial"/>
          <div style={{marginBottom:"12px"}}>
            <Lbl>Ejecutivo de cuenta / vendedor</Lbl>
            <Inp value={d.vendedor||""} onChange={function(e){set("vendedor",e.target.value);}}
              placeholder="Patricia Lomas"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <Lbl>Telefono</Lbl>
              <Inp value={d.telefono||""} onChange={function(e){set("telefono",e.target.value);}}
                placeholder="(305) 555-0101"/>
            </div>
            <div>
              <Lbl>Correo</Lbl>
              <Inp type="email" value={d.email||""} onChange={function(e){set("email",e.target.value);}}
                placeholder="vendedor@emisora.com"/>
            </div>
          </div>

          <Divider label="Notas internas"/>
          <textarea value={d.notas||""} onChange={function(e){set("notas",e.target.value);}}
            placeholder="Horarios preferidos, historial de incidencias, notas de negociacion..."
            style={{width:"100%",padding:"9px 12px",border:"1.5px solid "+C.border,borderRadius:"8px",
              fontSize:"13px",color:C.text1,background:C.surface,outline:"none",
              boxSizing:"border-box",fontFamily:FONT,minHeight:"80px",resize:"vertical"}}/>
        </div>
      </div>
    </div>
  );
}

//  Modal Spot 

function SpotModal(props) {
  var sp    = props.spot;
  var isNew = !sp;
  var sem   = props.semana;
  var blank = {emisoraId:"",dia:props.diaDefault||"Lunes",hora:"07:00",tipo:"60seg",
    costo:"",talento:"",contrato:"",status:"pendiente",precioEquipo:null,semana:sem.lunes};
  var [d, setD] = useState(isNew ? blank : Object.assign({}, sp));
  var [errs, setErrs] = useState({});
  function set(k, v) { setD(function(p){return Object.assign({},p,{[k]:v});}); setErrs(function(p){return Object.assign({},p,{[k]:null});}); }

  var neto  = Number(d.costo) || 0;
  var tal   = Number(d.talento) || 0;
  var base  = neto * 1.15 + tal;
  var pFinal= d.precioEquipo != null ? Number(d.precioEquipo) : base;

  function save() {
    var e = {};
    if (!d.emisoraId)          e.emisoraId = "Selecciona una emisora";
    if (!d.hora)               e.hora      = "Requerido";
    if (!neto || neto <= 0)    e.costo     = "Ingresa el costo";
    if (Object.keys(e).length) { setErrs(e); return; }
    props.onSave(Object.assign({}, d, {
      fecha:       fechaDeDia(sem.lunes, d.dia),
      costo:       neto,
      talento:     tal,
      precioEquipo: d.precioEquipo != null ? Number(d.precioEquipo) : null,
    }));
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.6)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:C.surface,borderRadius:"16px",width:"100%",maxWidth:"520px",
        maxHeight:"92vh",overflow:"auto",boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>

        <div style={{padding:"16px 20px",background:"linear-gradient(135deg,"+C.dark+","+C.mid+")",
          borderRadius:"16px 16px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"14px",fontWeight:"600",color:"#1a1f2e"}}>
            {isNew ? "Agregar spot" : "Editar spot"}
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            <Btn v="ghost" sm onClick={props.onClose}>Cancelar</Btn>
            <button onClick={save} style={{background:"#fff",border:"none",borderRadius:"7px",
              color:C.dark,padding:"5px 14px",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:FONT}}>
              Guardar
            </button>
          </div>
        </div>

        <div style={{padding:"20px"}}>

          {/* Preview precio */}
          {neto > 0 && (
            <div style={{marginBottom:"16px",padding:"12px 16px",background:C.amberBg,
              border:"1px solid "+C.amberBd,borderRadius:"10px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",textAlign:"center"}}>
                <div>
                  <div style={{fontSize:"10px",fontWeight:"700",color:C.text4,textTransform:"uppercase",marginBottom:"3px"}}>Costo neto</div>
                  <div style={{fontSize:"15px",fontWeight:"700",color:C.red}}>{fmtUSD(neto)}</div>
                </div>
                <div>
                  <div style={{fontSize:"10px",fontWeight:"700",color:C.text4,textTransform:"uppercase",marginBottom:"3px"}}>+15% agencia{tal>0?" + talento":""}</div>
                  <div style={{fontSize:"12px",color:C.text3}}>{fmtUSD(neto*0.15+tal)}</div>
                </div>
                <div>
                  <div style={{fontSize:"10px",fontWeight:"700",color:C.amber,textTransform:"uppercase",marginBottom:"3px"}}>
                    Al equipo{d.precioEquipo!=null?" (manual)":""}
                  </div>
                  <div style={{fontSize:"18px",fontWeight:"800",color:C.amber}}>{fmtUSD(pFinal)}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{marginBottom:"12px"}}>
            <Lbl>Emisora *</Lbl>
            <Sel value={d.emisoraId} onChange={function(e){set("emisoraId",e.target.value);}} error={errs.emisoraId}>
              <option value="">Seleccionar emisora...</option>
              {props.emisoras.filter(function(em){return em.activo;}).map(function(em){
                return <option key={em.id} value={em.id}>{em.nombre} - {em.frecuencia} - {em.ciudad}</option>;
              })}
            </Sel>
            {errs.emisoraId && <div style={{fontSize:"11px",color:C.red,marginTop:"3px"}}>{errs.emisoraId}</div>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <Lbl>Dia *</Lbl>
              <Sel value={d.dia} onChange={function(e){set("dia",e.target.value);}}>
                {DIAS_SEMANA.map(function(dia){
                  return <option key={dia} value={dia}>{dia} - {fmtFecha(fechaDeDia(sem.lunes,dia))}</option>;
                })}
              </Sel>
            </div>
            <div>
              <Lbl>Hora *</Lbl>
              <Inp type="time" value={d.hora} onChange={function(e){set("hora",e.target.value);}} error={errs.hora}/>
              {errs.hora && <div style={{fontSize:"11px",color:C.red,marginTop:"3px"}}>{errs.hora}</div>}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <Lbl>Tipo</Lbl>
              <Sel value={d.tipo} onChange={function(e){set("tipo",e.target.value);}}>
                {TIPOS_SPOT.map(function(t){return <option key={t}>{t}</option>;})}
              </Sel>
            </div>
            <div>
              <Lbl>Costo neto (USD) *</Lbl>
              <Inp type="number" min="0" step="1" value={d.costo}
                onChange={function(e){set("costo",e.target.value);}} error={errs.costo} placeholder="68"/>
              {errs.costo && <div style={{fontSize:"11px",color:C.red,marginTop:"3px"}}>{errs.costo}</div>}
            </div>
            <div>
              <Lbl>Talento (USD)</Lbl>
              <Inp type="number" min="0" step="1" value={d.talento}
                onChange={function(e){set("talento",e.target.value);}} placeholder="0"/>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <Lbl>No. contrato</Lbl>
              <Inp value={d.contrato||""} onChange={function(e){set("contrato",e.target.value);}}
                placeholder="RH-2026-01"/>
            </div>
            <div>
              <Lbl>Status</Lbl>
              <Sel value={d.status} onChange={function(e){set("status",e.target.value);}}>
                {STATUS_OPTS.map(function(s){return <option key={s} value={s}>{STATUS_META[s].label}</option>;})}
              </Sel>
            </div>
          </div>

          <Divider label="Precio al equipo (opcional)"/>
          <div style={{display:"flex",gap:"8px"}}>
            <Inp type="number" min="0" step="1" value={d.precioEquipo != null ? d.precioEquipo : ""}
              onChange={function(e){set("precioEquipo",e.target.value===""?null:Number(e.target.value));}}
              placeholder={"Auto: " + fmtUSD(base)}
              style={{border:"1.5px solid "+(d.precioEquipo!=null?C.amber:C.border)}}/>
            {d.precioEquipo != null && (
              <Btn v="ghost" sm onClick={function(){set("precioEquipo",null);}}>Limpiar</Btn>
            )}
          </div>
          <div style={{fontSize:"11px",color:C.text4,marginTop:"4px"}}>
            Deja vacio para calcular automatico (neto x 1.15 + talento)
          </div>
        </div>
      </div>
    </div>
  );
}

//  Modal Incidencia 

function IncModal(props) {
  var sp  = props.spot;
  var em  = props.emisora;
  var [tipo, setTipo] = useState(sp.incidencia || "no_salio");
  var [nota, setNota] = useState(sp.incidenciaNota || "");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.6)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:C.surface,borderRadius:"16px",width:"100%",maxWidth:"440px",
        boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        <div style={{padding:"16px 20px",background:"linear-gradient(135deg,"+C.red+",#b91c1c)",
          borderRadius:"16px 16px 0 0"}}>
          <div style={{fontSize:"14px",fontWeight:"600",color:"#1a1f2e"}}>Reportar incidencia</div>
          <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>
            {em ? em.nombre : ""} - {fmtHora(sp.hora)} - {sp.dia}
          </div>
        </div>
        <div style={{padding:"20px"}}>
          <div style={{display:"flex",gap:"10px",marginBottom:"16px"}}>
            {Object.entries(INC_META).map(function(entry){
              var k = entry[0]; var v = entry[1];
              var sel = tipo === k;
              return (
                <div key={k} onClick={function(){setTipo(k);}}
                  style={{flex:1,padding:"14px",borderRadius:"10px",cursor:"pointer",
                    border:"2px solid "+(sel?v.color:C.border),
                    background:sel?v.bg:C.surface,transition:"all 0.15s"}}>
                  <div style={{fontSize:"13px",fontWeight:"700",color:sel?v.color:C.text3,marginBottom:"4px"}}>
                    {v.label}
                  </div>
                  {v.credito && (
                    <div style={{fontSize:"10px",color:v.color,fontWeight:"600"}}>Genera credito</div>
                  )}
                </div>
              );
            })}
          </div>

          {INC_META[tipo].credito && (
            <div style={{padding:"10px 14px",background:C.redBg,border:"1px solid "+C.redBd,
              borderRadius:"8px",marginBottom:"14px",fontSize:"12px",color:C.red,fontWeight:"600"}}>
              Se generara un credito pendiente con {em ? em.nombre : "la emisora"} por {fmtUSD(sp.costo)}
            </div>
          )}

          <div style={{marginBottom:"16px"}}>
            <Lbl>Detalle / nota</Lbl>
            <textarea value={nota} onChange={function(e){setNota(e.target.value);}}
              placeholder="Que ocurrio? Hablas con alguien? Numero de reporte..."
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid "+C.border,borderRadius:"8px",
                fontSize:"13px",color:C.text1,background:C.surface,outline:"none",
                boxSizing:"border-box",fontFamily:FONT,minHeight:"80px",resize:"vertical"}}/>
          </div>

          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            {sp.incidencia && (
              <Btn v="ghost" onClick={function(){props.onSave(Object.assign({},sp,{incidencia:null,incidenciaNota:""}));}}>
                Quitar incidencia
              </Btn>
            )}
            <Btn v="ghost" onClick={props.onClose}>Cancelar</Btn>
            <Btn v="danger" onClick={function(){props.onSave(Object.assign({},sp,{incidencia:tipo,incidenciaNota:nota}));}}>
              Registrar
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

//  Fila de spot en el log 

function SpotFila(props) {
  var sp  = props.spot;
  var em  = props.emisora;
  var inc = sp.incidencia ? INC_META[sp.incidencia] : null;
  var stm = STATUS_META[sp.status] || STATUS_META.pendiente;
  var precio = precioEquipoCalc(sp);
  var [confirmDel, setConfirmDel] = useState(false);

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"72px 1fr 60px 80px 90px 130px 100px",
      alignItems:"center", padding:"10px 16px",
      borderBottom:"1px solid "+C.borderL,
      background:props.esHoy?"#f0f6ff":C.surface,
      fontSize:"13px",
    }}>
      <div style={{fontWeight:"600",color:C.text3}}>{fmtHora(sp.hora)}</div>
      <div>
        <div style={{fontWeight:"600",color:C.text1}}>{em ? em.nombre : "-"}</div>
        <div style={{fontSize:"11px",color:C.text4}}>{em ? em.frecuencia : ""} {sp.contrato ? "- "+sp.contrato : ""}</div>
        {inc && <Badge meta={inc}>{inc.label}</Badge>}
      </div>
      <div style={{color:C.text3,fontSize:"12px"}}>{sp.tipo}</div>
      <div style={{fontWeight:"600",color:C.red}}>{fmtUSD(Number(sp.costo||0)+Number(sp.talento||0))}</div>
      <div style={{fontWeight:"700",color:C.amber}}>
        {sp.precioEquipo != null ? "* " : ""}{fmtUSD(precio)}
      </div>
      <div><Badge meta={stm}/></div>
      <div style={{display:"flex",gap:"4px",justifyContent:"flex-end"}}>
        {!confirmDel ? (
          <div style={{display:"flex",gap:"3px"}}>
            <Btn v="ghost" sm onClick={function(){props.onEdit(sp);}}>Editar</Btn>
            {props.isSupervisor && (
              <Btn v={inc?"amber":"ghost"} sm onClick={function(){props.onInc(sp);}}>Inc</Btn>
            )}
            <Btn v="danger" sm onClick={function(){setConfirmDel(true);}}>X</Btn>
          </div>
        ) : (
          <div style={{display:"flex",gap:"3px"}}>
            <Btn v="danger" sm onClick={function(){props.onDelete(sp.id);setConfirmDel(false);}}>Confirmar</Btn>
            <Btn v="ghost"  sm onClick={function(){setConfirmDel(false);}}>No</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

//  Tab: Log Semanal 

function TabLog(props) {
  var spots    = props.spots;
  var emisoras = props.emisoras;
  var sem      = props.semana;
  var todayStr = hoy();

  var spotsDelaSemana = spots.filter(function(s){return s.semana===sem.lunes;});

  return (
    <div>
      {DIAS_SEMANA.map(function(dia) {
        var fecha    = fechaDeDia(sem.lunes, dia);
        var esHoy    = fecha === todayStr;
        var delDia   = spotsDelaSemana
          .filter(function(s){return s.dia===dia;})
          .sort(function(a,b){return (a.hora||"").localeCompare(b.hora||"");});

        var totalNeto   = delDia.reduce(function(t,s){return t+Number(s.costo||0);},0);
        var totalEquipo = delDia.reduce(function(t,s){return t+precioEquipoCalc(s);},0);
        var incidencias = delDia.filter(function(s){return s.incidencia;}).length;

        return (
          <Card key={dia} style={{marginBottom:"8px",overflow:"hidden",
            border:"1px solid "+(esHoy?C.mid:C.border),
            boxShadow:esHoy?"0 0 0 2px "+C.mid+"22":"none"}}>

            {/* Header dia */}
            <div style={{
              padding:"10px 16px",
              background:esHoy?"linear-gradient(135deg,"+C.dark+","+C.mid+")":C.bg,
              display:"flex",justifyContent:"space-between",alignItems:"center",
              borderBottom:"1px solid "+(esHoy?C.mid+"44":C.border),
            }}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{fontWeight:"700",fontSize:"13px",color:esHoy?"#fff":C.text1}}>{dia}</div>
                <div style={{fontSize:"11px",color:esHoy?"rgba(255,255,255,0.6)":C.text4}}>{fmtFecha(fecha)}</div>
                {esHoy && <Badge meta={{color:"#fff",bg:"rgba(255,255,255,0.2)",bd:"rgba(255,255,255,0.3)"}}>HOY</Badge>}
                {incidencias > 0 && <Badge meta={INC_META.no_salio}>{incidencias} inc.</Badge>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
                {delDia.length > 0 && (
                  <div style={{display:"flex",gap:"12px",fontSize:"12px"}}>
                    <span style={{color:esHoy?"rgba(255,255,255,0.7)":C.text3}}>
                      {delDia.length} spot{delDia.length!==1?"s":""}
                    </span>
                    <span style={{color:esHoy?"rgba(255,255,255,0.7)":C.red,fontWeight:"600"}}>
                      {fmtUSD(totalNeto)}
                    </span>
                    <span style={{color:esHoy?"rgba(255,255,255,0.85)":C.amber,fontWeight:"700"}}>
                      {fmtUSD(totalEquipo)}
                    </span>
                  </div>
                )}
                <Btn v={esHoy?"ghost":"ghost"} sm
                  style={esHoy?{background:"#e4e7eb",color:"#fff",border:"1px solid rgba(255,255,255,0.3)"}:{}}
                  onClick={function(){props.onAddSpot(dia);}}>
                  + Spot
                </Btn>
              </div>
            </div>

            {/* Columnas header */}
            {delDia.length > 0 && (
              <div style={{
                display:"grid",
                gridTemplateColumns:"72px 1fr 60px 80px 90px 130px 100px",
                padding:"6px 16px",
                background:"#fafbfc",
                borderBottom:"1px solid "+C.borderL,
              }}>
                {["Hora","Emisora","Tipo","Neto","Al equipo","Status",""].map(function(h,i){
                  return (
                    <div key={i} style={{fontSize:"10px",fontWeight:"700",color:C.text4,
                      textTransform:"uppercase",letterSpacing:"0.06em"}}>
                      {h}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Spots */}
            {delDia.length === 0 ? (
              <div style={{padding:"16px",textAlign:"center",fontSize:"12px",color:C.text4}}>
                Sin spots registrados
              </div>
            ) : (
              delDia.map(function(sp){
                var em = null;
                for (var i=0;i<emisoras.length;i++){if(emisoras[i].id===sp.emisoraId){em=emisoras[i];break;}}
                return (
                  <SpotFila key={sp.id} spot={sp} emisora={em} esHoy={esHoy}
                    isSupervisor={props.isSupervisor}
                    onEdit={props.onEditSpot}
                    onDelete={props.onDeleteSpot}
                    onInc={props.onInc}/>
                );
              })
            )}
          </Card>
        );
      })}
    </div>
  );
}

//  Tab: Emisoras 

function NotasEmisora(props) {
  var emId = props.emisoraId;
  var currentUser = props.currentUser;
  var [notas, setNotas] = useState([]);
  var [loading, setLoading] = useState(true);
  var [nuevaNota, setNuevaNota] = useState("");
  var [saving, setSaving] = useState(false);

  useEffect(function() {
    if (!emId) return;
    setLoading(true);
    SB.from("radio_emisora_notas")
      .select("*, usuarios(nombre)")
      .eq("emisora_id", emId)
      .order("created_at", {ascending: false})
      .then(function(res) {
        setLoading(false);
        if (res.data) setNotas(res.data);
      });
  }, [emId]);

  function agregarNota() {
    if (!nuevaNota.trim()) return;
    setSaving(true);
    SB.from("radio_emisora_notas").insert({
      emisora_id: emId,
      nota: nuevaNota.trim(),
      created_by: currentUser ? currentUser.id : null,
    }).select("*, usuarios(nombre)").single().then(function(res) {
      setSaving(false);
      if (res.error) { return; }
      setNotas(function(p) { return [res.data].concat(p); });
      setNuevaNota("");
    });
  }

  function fmtTs(str) {
    if (!str) return "";
    return new Date(str).toLocaleString("es-MX", {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  }

  return (
    <div>
      <div style={{marginBottom:"12px"}}>
        <textarea value={nuevaNota} onChange={function(e){setNuevaNota(e.target.value);}}
          placeholder="Agregar nota..."
          rows={3}
          style={{width:"100%",padding:"9px 12px",border:"1.5px solid "+C.border,borderRadius:"8px",
            fontSize:"13px",color:C.text1,background:C.surface,outline:"none",
            boxSizing:"border-box",fontFamily:FONT,resize:"vertical"}}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:"6px"}}>
          <Btn sm onClick={agregarNota} disabled={saving||!nuevaNota.trim()}>
            {saving ? "Guardando..." : "Agregar nota"}
          </Btn>
        </div>
      </div>
      {loading && <div style={{fontSize:"12px",color:C.text4,padding:"12px 0"}}>Cargando...</div>}
      {!loading && notas.length === 0 && (
        <div style={{fontSize:"12px",color:C.text4,padding:"12px 0",textAlign:"center"}}>Sin notas</div>
      )}
      {notas.map(function(n) {
        return (
          <div key={n.id} style={{padding:"10px 12px",background:C.bg,borderRadius:"8px",
            border:"1px solid "+C.borderL,marginBottom:"8px"}}>
            <div style={{fontSize:"13px",color:C.text1,lineHeight:"1.6",marginBottom:"6px"}}>{n.nota}</div>
            <div style={{fontSize:"10px",color:C.text4}}>
              {n.usuarios ? n.usuarios.nombre : "Sistema"} - {fmtTs(n.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabEmisoras(props) {
  var emisoras = props.emisoras;
  var spots    = props.spots;
  var isReadOnly = props.isReadOnly;
  var currentUser = props.currentUser;
  var [sel, setSel] = useState(null);
  var [busqueda, setBusqueda] = useState("");
  var [filtroCiudad, setFiltroCiudad] = useState("todas");
  var [selTab, setSelTab] = useState("info");

  var ciudades = ["todas"].concat(Array.from(new Set(emisoras.map(function(e){ return e.ciudad||""; }).filter(Boolean))).sort());

  function kpis(em) {
    var sps = spots.filter(function(s){return s.emisoraId===em.id;});
    var total   = sps.reduce(function(t,s){return t+Number(s.costo||0);},0);
    var equipo  = sps.reduce(function(t,s){return t+precioEquipoCalc(s);},0);
    var incs    = sps.filter(function(s){return s.incidencia;}).length;
    var pendPago= sps.filter(function(s){return s.status!=="pagado";});
    var pendTotal = pendPago.reduce(function(t,s){return t+precioEquipoCalc(s);},0);
    var sinInc = sps.filter(function(s){ return !s.incidencia; });
    var ultima = sinInc.sort(function(a,b){ return (b.fecha+b.hora).localeCompare(a.fecha+a.hora); })[0] || null;
    return {total:total, equipo:equipo, incs:incs, spots:sps.length, pendTotal:pendTotal, ultima:ultima};
  }

  var emisorasFiltradas = emisoras.filter(function(em) {
    var b = busqueda.toLowerCase();
    var matchB = !b || (em.nombre||"").toLowerCase().indexOf(b) !== -1 ||
           (em.ciudad||"").toLowerCase().indexOf(b) !== -1 ||
           (em.frecuencia||"").toLowerCase().indexOf(b) !== -1;
    var matchC = filtroCiudad === "todas" || (em.ciudad||"") === filtroCiudad;
    return matchB && matchC;
  });

  return (
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"12px",alignItems:"center",flexWrap:"wrap"}}>
        <input value={busqueda} onChange={function(e){setBusqueda(e.target.value);}}
          placeholder="Buscar por nombre o ciudad..."
          style={{flex:1,maxWidth:"240px",padding:"8px 12px",border:"1.5px solid "+C.border,
            borderRadius:"8px",fontSize:"13px",color:C.text1,background:C.surface,
            outline:"none",fontFamily:FONT}}/>
        <select value={filtroCiudad} onChange={function(e){setFiltroCiudad(e.target.value);}}
          style={{padding:"8px 12px",border:"1.5px solid "+C.border,borderRadius:"8px",
            fontSize:"13px",color:C.text1,background:C.surface,fontFamily:FONT,cursor:"pointer"}}>
          {ciudades.map(function(c){ return <option key={c} value={c}>{c==="todas"?"Todas las ciudades":c}</option>; })}
        </select>
        {!isReadOnly && (
          <div style={{marginLeft:"auto"}}>
            <Btn onClick={props.onAddEmisora}>+ Nueva emisora</Btn>
          </div>
        )}
      </div>

      {emisoras.length === 0 && (
        <Card style={{padding:"48px",textAlign:"center"}}>
          <div style={{fontSize:"32px",marginBottom:"8px",opacity:"0.3"}}></div>
          <div style={{fontSize:"14px",fontWeight:"600",color:C.text3,marginBottom:"4px"}}>Sin emisoras</div>
          <div style={{fontSize:"12px",color:C.text4,marginBottom:"16px"}}>
            Agrega las emisoras de radio con las que trabajas
          </div>
          <Btn onClick={props.onAddEmisora}>+ Agregar primera emisora</Btn>
        </Card>
      )}

      {busqueda && emisorasFiltradas.length === 0 && (
        <div style={{textAlign:"center",padding:"32px",fontSize:"13px",color:C.text4}}>
          Sin resultados para "{busqueda}"
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
        {emisorasFiltradas.map(function(em){
          var k = kpis(em);
          return (
            <Card key={em.id} style={{padding:"16px",cursor:"pointer",transition:"all 0.15s",
              borderLeft:"3px solid "+(em.activo?C.mid:C.border),
              opacity:em.activo?1:0.6}}
              onClick={function(){setSel(em);}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"700",color:C.text1}}>{em.nombre}</div>
                  <div style={{fontSize:"12px",color:C.text3}}>{em.frecuencia} - {em.ciudad}</div>
                  {em.contrato && <div style={{fontSize:"11px",color:C.text4,marginTop:"1px"}}>{em.contrato}</div>}
                </div>
                <div style={{display:"flex",gap:"5px",flexDirection:"column",alignItems:"flex-end"}}>
                  <Badge meta={em.activo?{color:C.green,bg:C.greenBg,bd:C.greenBd}:{color:C.text3,bg:C.bg,bd:C.border}}>
                    {em.activo?"Activa":"Inactiva"}
                  </Badge>
                  {em.tarifaBase > 0 && (
                    <span style={{fontSize:"11px",color:C.amber,fontWeight:"600"}}>
                      Base: {fmtUSD(em.tarifaBase)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
                {[
                  {l:"Spots",  v:k.spots,             color:C.text2},
                  {l:"Neto",   v:fmtUSD(k.total),     color:C.red},
                  {l:"Pendiente",v:fmtUSD(k.pendTotal),color:C.amber},
                ].map(function(kp){
                  return (
                    <div key={kp.l} style={{textAlign:"center",padding:"8px",background:C.bg,borderRadius:"8px"}}>
                      <div style={{fontSize:"13px",fontWeight:"700",color:kp.color}}>{kp.v}</div>
                      <div style={{fontSize:"10px",color:C.text4,marginTop:"1px"}}>{kp.l}</div>
                    </div>
                  );
                })}
              </div>
              {em.notas && (
                <div style={{marginTop:"10px",fontSize:"11px",color:C.text4,
                  padding:"6px 10px",background:C.bg,borderRadius:"6px",lineHeight:"1.5",
                  overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                  {em.notas}
                </div>
              )}
              <div style={{marginTop:"8px",fontSize:"11px",color:k.ultima?C.text3:C.text4}}>
                {k.ultima
                  ? <span>📅 Última aparición: <b>{k.ultima.fecha}</b> · {fmtHora(k.ultima.hora)}</span>
                  : <span style={{color:C.text4}}>Sin apariciones registradas</span>
                }
              </div>
              <div style={{marginTop:"10px",display:"flex",justifyContent:"flex-end",gap:"6px"}}>
                <Btn v="ghost" sm onClick={function(e){e.stopPropagation();props.onEditEmisora(em);}}>
                  Editar
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail drawer */}
      {sel && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.5)",zIndex:150,
          display:"flex",justifyContent:"flex-end"}}
          onClick={function(){setSel(null);}}>
          <div style={{width:"500px",maxWidth:"95vw",background:C.surface,height:"100%",
            overflowY:"auto",boxShadow:"-8px 0 32px rgba(0,0,0,0.12)",display:"flex",flexDirection:"column"}}
            onClick={function(e){e.stopPropagation();}}>

            {/* Header */}
            <div style={{padding:"20px 24px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
                <div>
                  <div style={{fontSize:"18px",fontWeight:"700",color:C.text1,marginBottom:"2px"}}>{sel.nombre}</div>
                  <div style={{fontSize:"13px",color:C.mid}}>{sel.frecuencia}{sel.ciudad?" - "+sel.ciudad:""}</div>
                </div>
                <Btn v="ghost" sm onClick={function(){setSel(null);}}>Cerrar</Btn>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px"}}>
                {(function(){
                  var k = kpis(sel);
                  return [
                    {l:"Spots",   v:k.spots,            color:C.text2},
                    {l:"Neto",    v:fmtUSD(k.total),    color:C.red},
                    {l:"Equipo",  v:fmtUSD(k.equipo),   color:C.amber},
                    {l:"Pendiente",v:fmtUSD(k.pendTotal),color:C.dark},
                  ].map(function(kp){
                    return(
                      <div key={kp.l} style={{textAlign:"center",padding:"8px",background:C.bg,borderRadius:"8px"}}>
                        <div style={{fontSize:"13px",fontWeight:"700",color:kp.color}}>{kp.v}</div>
                        <div style={{fontSize:"10px",color:C.text4,marginTop:"1px"}}>{kp.l}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Sub-tabs */}
            <div style={{display:"flex",gap:"2px",padding:"0 24px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
              {[{k:"info",l:"Informacion"},{k:"apariciones",l:"Apariciones"},{k:"incidencias",l:"Incidencias"},{k:"pagos",l:"Pagos"},{k:"notas",l:"Notas"}].map(function(t){
                var isA = selTab===t.k;
                return(
                  <button key={t.k} onClick={function(){setSelTab(t.k);}}
                    style={{padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",
                      fontSize:"12px",fontFamily:FONT,fontWeight:isA?"700":"400",
                      color:isA?C.dark:C.text3,
                      borderBottom:"2px solid "+(isA?C.dark:"transparent")}}>
                    {t.l}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
              {selTab==="info" && (
                <div>
                  {sel.vendedor && (
                    <Card style={{padding:"12px",marginBottom:"12px"}}>
                      <div style={{fontSize:"11px",fontWeight:"700",color:C.text4,marginBottom:"6px"}}>CONTACTO COMERCIAL</div>
                      <div style={{fontSize:"13px",fontWeight:"600",color:C.text1}}>{sel.vendedor}</div>
                      {sel.telefono && <div style={{fontSize:"12px",color:C.text3,marginTop:"2px"}}>{sel.telefono}</div>}
                      {sel.email    && <div style={{fontSize:"12px",color:C.mid,marginTop:"2px"}}>{sel.email}</div>}
                    </Card>
                  )}
                  {sel.contrato && (
                    <Card style={{padding:"12px",marginBottom:"12px"}}>
                      <div style={{fontSize:"11px",fontWeight:"700",color:C.text4,marginBottom:"4px"}}>CONTRATO</div>
                      <div style={{fontSize:"13px",color:C.text1}}>{sel.contrato}</div>
                    </Card>
                  )}
                  {sel.notas && (
                    <Card style={{padding:"12px",marginBottom:"12px"}}>
                      <div style={{fontSize:"11px",fontWeight:"700",color:C.text4,marginBottom:"6px"}}>NOTAS</div>
                      <div style={{fontSize:"13px",color:C.text2,lineHeight:"1.6"}}>{sel.notas}</div>
                    </Card>
                  )}
                  {!isReadOnly && (
                    <Btn v="primary" onClick={function(){props.onEditEmisora(sel);setSel(null);}}>
                      Editar emisora
                    </Btn>
                  )}
                </div>
              )}
              {selTab==="notas" && (
                <NotasEmisora emisoraId={sel.id} currentUser={currentUser}/>
              )}
              {selTab==="apariciones" && (function(){
                var sps = spots.filter(function(s){ return s.emisoraId===sel.id && !s.incidencia; })
                  .sort(function(a,b){ return (b.fecha+b.hora).localeCompare(a.fecha+a.hora); });
                return (
                  <div>
                    <div style={{fontSize:"11px",fontWeight:"700",color:C.text4,marginBottom:"12px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Apariciones recientes</div>
                    {sps.length===0 && <div style={{color:C.text4,fontSize:"13px"}}>Sin apariciones</div>}
                    {sps.map(function(s){
                      return (
                        <div key={s.id} style={{padding:"10px 12px",borderRadius:"8px",background:C.bg,border:"1px solid "+C.border,marginBottom:"6px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <div style={{fontSize:"13px",fontWeight:"600",color:C.text1}}>{s.fecha} · {fmtHora(s.hora)}</div>
                              <div style={{fontSize:"11px",color:C.text4}}>{s.tipo} · {s.contrato||"—"}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:"13px",fontWeight:"700",color:C.red}}>{fmtUSD(Number(s.costo||0)+Number(s.talento||0))}</div>
                              <div style={{fontSize:"11px",color:C.amber}}>{fmtUSD(precioEquipoCalc(s))} equipo</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {selTab==="incidencias" && (function(){
                var sps = spots.filter(function(s){ return s.emisoraId===sel.id && s.incidencia; })
                  .sort(function(a,b){ return (b.fecha+b.hora).localeCompare(a.fecha+a.hora); });
                return (
                  <div>
                    <div style={{fontSize:"11px",fontWeight:"700",color:C.text4,marginBottom:"12px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Incidencias</div>
                    {sps.length===0 && <div style={{color:C.text4,fontSize:"13px"}}>Sin incidencias</div>}
                    {sps.map(function(s){
                      var inc = INC_META[s.incidencia];
                      return (
                        <div key={s.id} style={{padding:"10px 12px",borderRadius:"8px",background:C.bg,border:"1px solid "+C.border,marginBottom:"6px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                            <span style={{fontSize:"11px",fontWeight:"700",color:inc.color,background:inc.bg,border:"1px solid "+inc.bd,padding:"2px 7px",borderRadius:"8px"}}>{inc.label}</span>
                            <span style={{fontSize:"11px",color:C.text4}}>{s.fecha} · {fmtHora(s.hora)}</span>
                          </div>
                          {s.incidenciaNota && <div style={{fontSize:"12px",color:C.text2,fontStyle:"italic"}}>"{s.incidenciaNota}"</div>}
                          {s.incidencia_accion && <div style={{fontSize:"11px",fontWeight:"700",color:C.blue,marginTop:"4px"}}>Acción: {{"mg_credito":"MG Crédito","cambio_horario":"Cambio de horario","credito_negado":"Crédito negado"}[s.incidencia_accion]}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {selTab==="pagos" && (function(){
                var sps = spots.filter(function(s){ return s.emisoraId===sel.id; })
                  .sort(function(a,b){ return (b.fecha+b.hora).localeCompare(a.fecha+a.hora); });
                var pagados = sps.filter(function(s){ return s.status==="pagado"; });
                var pendientes = sps.filter(function(s){ return s.status!=="pagado"; });
                var totalPag = pagados.reduce(function(t,s){ return t+precioEquipoCalc(s); },0);
                var totalPend = pendientes.reduce(function(t,s){ return t+precioEquipoCalc(s); },0);
                return (
                  <div>
                    <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}>
                      <div style={{flex:1,padding:"10px",borderRadius:"8px",background:C.greenBg,border:"1px solid "+C.greenBd,textAlign:"center"}}>
                        <div style={{fontSize:"14px",fontWeight:"800",color:C.green}}>{fmtUSD(totalPag)}</div>
                        <div style={{fontSize:"10px",color:C.green,marginTop:"2px"}}>Pagado</div>
                      </div>
                      <div style={{flex:1,padding:"10px",borderRadius:"8px",background:C.amberBg,border:"1px solid "+C.amberBd,textAlign:"center"}}>
                        <div style={{fontSize:"14px",fontWeight:"800",color:C.amber}}>{fmtUSD(totalPend)}</div>
                        <div style={{fontSize:"10px",color:C.amber,marginTop:"2px"}}>Pendiente</div>
                      </div>
                    </div>
                    {sps.map(function(s){
                      var isPag = s.status==="pagado";
                      return (
                        <div key={s.id} style={{padding:"8px 12px",borderRadius:"8px",background:C.bg,border:"1px solid "+C.border,marginBottom:"5px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>{s.fecha} · {fmtHora(s.hora)}</div>
                            <div style={{fontSize:"11px",color:C.text4}}>{s.tipo}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:"13px",fontWeight:"700",color:isPag?C.green:C.amber}}>{fmtUSD(precioEquipoCalc(s))}</div>
                            <div style={{fontSize:"10px",color:isPag?C.green:C.amber,fontWeight:"600"}}>{isPag?"Pagado":"Pendiente"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//  Tab: Ordenes (record global de todos los spots) 

function TabOrdenes(props) {
  var spots    = props.spots;
  var emisoras = props.emisoras;
  var [busqueda,  setBusqueda]  = useState("");
  var [filtroEm,  setFiltroEm]  = useState("todas");
  var [filtroSt,  setFiltroSt]  = useState("todos");
  var [auditSpot, setAuditSpot] = useState(null);
  var [audit,     setAudit]     = useState([]);
  var [loadAudit, setLoadAudit] = useState(false);

  function emNombre(id) {
    for (var i=0;i<emisoras.length;i++){if(emisoras[i].id===id)return emisoras[i].nombre;}
    return "-";
  }

  function verAudit(spot) {
    setAuditSpot(spot);
    setLoadAudit(true);
    SB.from("radio_audit")
      .select("*, usuarios(nombre)")
      .eq("spot_id", spot.id)
      .order("created_at", {ascending:false})
      .then(function(res) {
        setLoadAudit(false);
        if (res.data) setAudit(res.data);
      });
  }

  function fmtTs(str) {
    if (!str) return "";
    return new Date(str).toLocaleString("es-MX", {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  }

  var filtrados = spots.filter(function(s) {
    var b = busqueda.toLowerCase();
    var mB = b==="" || emNombre(s.emisoraId).toLowerCase().indexOf(b)!==-1 ||
             (s.hora||"").indexOf(b)!==-1 || (s.tipo||"").toLowerCase().indexOf(b)!==-1;
    var mE = filtroEm==="todas" || s.emisoraId===filtroEm;
    var mS = filtroSt==="todos" || s.status===filtroSt;
    return mB && mE && mS;
  }).sort(function(a,b){ return (b.fecha||"").localeCompare(a.fecha||""); });

  var INP = {padding:"8px 12px",border:"1.5px solid "+C.border,borderRadius:"8px",fontSize:"12px",
    color:C.text1,background:C.surface,outline:"none",fontFamily:FONT,cursor:"pointer"};

  return (
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
        <input value={busqueda} onChange={function(e){setBusqueda(e.target.value);}}
          placeholder="Buscar emisora, hora, tipo..."
          style={Object.assign({},INP,{flex:1,minWidth:"180px",maxWidth:"280px",cursor:"text"})}/>
        <select value={filtroEm} onChange={function(e){setFiltroEm(e.target.value);}} style={INP}>
          <option value="todas">Todas las emisoras</option>
          {emisoras.map(function(em){return <option key={em.id} value={em.id}>{em.nombre}</option>;})}
        </select>
        <select value={filtroSt} onChange={function(e){setFiltroSt(e.target.value);}} style={INP}>
          <option value="todos">Todos los status</option>
          {["pendiente","ordenado","confirmado","pagado"].map(function(s){
            return <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>;
          })}
        </select>
        <div style={{marginLeft:"auto",fontSize:"12px",color:C.text4,display:"flex",alignItems:"center"}}>
          {filtrados.length} ordenes
        </div>
      </div>

      <Card style={{overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 80px 80px 90px 90px 80px",
          padding:"8px 14px",background:"#f8f9fb",borderBottom:"1px solid "+C.border}}>
          {["Emisora","Fecha","Hora","Tipo","Costo","Status",""].map(function(h,i){
            return <div key={i} style={{fontSize:"10px",fontWeight:"700",color:C.text4,
              textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</div>;
          })}
        </div>
        {filtrados.length===0 && (
          <div style={{padding:"32px",textAlign:"center",fontSize:"13px",color:C.text4}}>Sin ordenes</div>
        )}
        {filtrados.map(function(s, idx) {
          var sm = STATUS_META[s.status] || STATUS_META.pendiente;
          return (
            <div key={s.id} style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 80px 80px 90px 90px 80px",
              padding:"9px 14px",alignItems:"center",
              background:idx%2===0?C.surface:"#fafbfc",
              borderBottom:"1px solid "+C.borderL}}>
              <div style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>{emNombre(s.emisoraId)}</div>
              <div style={{fontSize:"11px",color:C.text3}}>{fmtFecha(s.fecha)}</div>
              <div style={{fontSize:"11px",color:C.text2}}>{fmtHora(s.hora)}</div>
              <div style={{fontSize:"11px",color:C.text3}}>{s.tipo}</div>
              <div style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>{fmtUSD(s.costo)}</div>
              <div>
                <Badge meta={sm}>{sm.label}</Badge>
              </div>
              <div>
                <Btn v="ghost" sm onClick={function(){verAudit(s);}}>Historial</Btn>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Drawer auditoria */}
      {auditSpot && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,25,35,0.5)",zIndex:200,
          display:"flex",justifyContent:"flex-end"}} onClick={function(){setAuditSpot(null);}}>
          <div style={{width:"420px",maxWidth:"95vw",background:C.surface,height:"100%",
            overflowY:"auto",boxShadow:"-8px 0 32px rgba(0,0,0,0.12)",padding:"24px"}}
            onClick={function(e){e.stopPropagation();}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <div>
                <div style={{fontSize:"14px",fontWeight:"700",color:C.text1}}>Historial de cambios</div>
                <div style={{fontSize:"12px",color:C.text3,marginTop:"2px"}}>
                  {emNombre(auditSpot.emisoraId)} - {fmtFecha(auditSpot.fecha)} {fmtHora(auditSpot.hora)}
                </div>
              </div>
              <Btn v="ghost" sm onClick={function(){setAuditSpot(null);}}>Cerrar</Btn>
            </div>
            {loadAudit && <div style={{fontSize:"12px",color:C.text4,padding:"20px 0"}}>Cargando...</div>}
            {!loadAudit && audit.length===0 && (
              <div style={{fontSize:"12px",color:C.text4,padding:"20px 0",textAlign:"center"}}>
                Sin historial registrado
              </div>
            )}
            {audit.map(function(a) {
              return (
                <div key={a.id} style={{padding:"10px 12px",background:C.bg,borderRadius:"8px",
                  border:"1px solid "+C.borderL,marginBottom:"8px"}}>
                  <div style={{fontSize:"12px",fontWeight:"600",color:C.text1,marginBottom:"3px"}}>{a.accion}</div>
                  {a.detalle && <div style={{fontSize:"11px",color:C.text3,marginBottom:"4px"}}>{a.detalle}</div>}
                  <div style={{fontSize:"10px",color:C.text4}}>
                    {a.usuario_nombre || (a.usuarios ? a.usuarios.nombre : "Sistema")} - {fmtTs(a.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

//  Tab: Finanzas 

function TabFinanzas(props) {
  var spots    = props.spots;
  var emisoras = props.emisoras;
  var sem      = props.semana;

  var semanaSpots = spots.filter(function(s){return s.semana===sem.lunes;});
  var totalNeto   = semanaSpots.reduce(function(t,s){return t+Number(s.costo||0);},0);
  var totalEquipo = semanaSpots.reduce(function(t,s){return t+precioEquipoCalc(s);},0);
  var totalTalento= semanaSpots.reduce(function(t,s){return t+Number(s.talento||0);},0);
  var margen      = totalEquipo - totalNeto - totalTalento;
  var totalIncs   = semanaSpots.filter(function(s){return s.incidencia;}).length;

  // Por emisora
  var porEmisora = emisoras.map(function(em){
    var sps = semanaSpots.filter(function(s){return s.emisoraId===em.id;});
    return {
      em: em,
      spots:  sps.length,
      neto:   sps.reduce(function(t,s){return t+Number(s.costo||0);},0),
      equipo: sps.reduce(function(t,s){return t+precioEquipoCalc(s);},0),
      incs:   sps.filter(function(s){return s.incidencia;}).length,
    };
  }).filter(function(x){return x.spots>0;}).sort(function(a,b){return b.neto-a.neto;});

  // Por status
  var porStatus = STATUS_OPTS.map(function(st){
    var sps = semanaSpots.filter(function(s){return s.status===st;});
    return {
      st: st,
      spots:  sps.length,
      equipo: sps.reduce(function(t,s){return t+precioEquipoCalc(s);},0),
    };
  });

  var kpis = [
    {l:"Spots semana",    v:semanaSpots.length,    color:C.dark,  fmt:"n"},
    {l:"Gasto neto",      v:totalNeto,              color:C.red,   fmt:"$"},
    {l:"Al equipo",       v:totalEquipo,            color:C.amber, fmt:"$"},
    {l:"Margen agencia",  v:margen,                 color:C.green, fmt:"$"},
    {l:"Incidencias",     v:totalIncs,              color:totalIncs>3?C.red:totalIncs>0?C.amber:C.green, fmt:"n"},
  ];

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px",marginBottom:"16px"}}>
        {kpis.map(function(k){
          return (
            <Card key={k.l} style={{padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:"20px",fontWeight:"800",color:k.color,letterSpacing:"-0.5px"}}>
                {k.fmt==="$" ? fmtUSD(k.v) : k.v}
              </div>
              <div style={{fontSize:"10px",color:C.text4,marginTop:"3px",fontWeight:"600",letterSpacing:"0.05em"}}>
                {k.l.toUpperCase()}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>

        {/* Por emisora */}
        <Card style={{overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border,
            fontSize:"12px",fontWeight:"700",color:C.text1}}>
            Por emisora
          </div>
          {porEmisora.length === 0 ? (
            <div style={{padding:"24px",textAlign:"center",fontSize:"12px",color:C.text4}}>
              Sin spots esta semana
            </div>
          ) : (
            porEmisora.map(function(x){
              var pct = totalNeto > 0 ? Math.round(x.neto/totalNeto*100) : 0;
              return (
                <div key={x.em.id} style={{padding:"10px 16px",borderBottom:"1px solid "+C.borderL}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                    <div>
                      <div style={{fontSize:"13px",fontWeight:"600",color:C.text1}}>{x.em.nombre}</div>
                      <div style={{fontSize:"11px",color:C.text4}}>{x.spots} spots</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"13px",fontWeight:"700",color:C.red}}>{fmtUSD(x.neto)}</div>
                      <div style={{fontSize:"11px",color:C.amber}}>{fmtUSD(x.equipo)} al equipo</div>
                    </div>
                  </div>
                  <div style={{height:"4px",background:C.borderL,borderRadius:"2px"}}>
                    <div style={{height:"4px",width:pct+"%",background:C.mid,borderRadius:"2px",transition:"width 0.3s"}}/>
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {/* Por status */}
        <Card style={{overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border,
            fontSize:"12px",fontWeight:"700",color:C.text1}}>
            Por status de pago
          </div>
          {porStatus.map(function(x){
            var meta = STATUS_META[x.st];
            return (
              <div key={x.st} style={{padding:"12px 16px",borderBottom:"1px solid "+C.borderL,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <Badge meta={meta}/>
                  <span style={{fontSize:"12px",color:C.text3}}>{x.spots} spots</span>
                </div>
                <div style={{fontSize:"13px",fontWeight:"700",color:meta.color}}>{fmtUSD(x.equipo)}</div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

//  Tab: Pagos  expediente de pagos por emisora

var METODOS = ["transferencia","cheque","efectivo","tarjeta","otro"];
var METODO_LABEL = {transferencia:"Transferencia",cheque:"Cheque",efectivo:"Efectivo",tarjeta:"Tarjeta",otro:"Otro"};

function PagoModal(props) {
  var em      = props.emisora;
  var spots   = props.spotsPendientes;
  var [fecha,  setFecha]  = useState(hoy());
  var [metodo, setMetodo] = useState("transferencia");
  var [ref,    setRef]    = useState("");
  var [notas,  setNotas]  = useState("");
  var [sel,    setSel]    = useState({});
  var [saving, setSaving] = useState(false);
  var [err,    setErr]    = useState("");

  function toggleSpot(id) {
    setSel(function(p){
      var n = Object.assign({},p);
      if (n[id]) { delete n[id]; } else { n[id] = true; }
      return n;
    });
  }
  function toggleAll() {
    if (Object.keys(sel).length === spots.length) {
      setSel({});
    } else {
      var n = {};
      spots.forEach(function(s){ n[s.id] = true; });
      setSel(n);
    }
  }

  var selIds    = Object.keys(sel);
  var montoCalc = spots.filter(function(s){return sel[s.id];}).reduce(function(t,s){return t+precioEquipoCalc(s);},0);
  var todosSeleccionados = selIds.length === spots.length && spots.length > 0;

  function save() {
    if (selIds.length === 0) { setErr("Selecciona al menos un spot"); return; }
    if (!fecha)              { setErr("Ingresa la fecha"); return; }
    if (montoCalc <= 0)      { setErr("El monto debe ser mayor a cero"); return; }
    setErr("");
    setSaving(true);
    props.onSave({
      emisoraId: em.id,
      fecha:     fecha,
      monto:     montoCalc,
      metodo:    metodo,
      referencia:ref || null,
      notas:     notas || null,
      spotIds:   selIds,
    }, function(ok){ setSaving(false); if (!ok) setErr("Error al guardar, intenta de nuevo."); });
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,15,25,0.5)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:C.surface,borderRadius:"12px",width:"100%",maxWidth:"640px",
        maxHeight:"92vh",overflow:"auto",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",
        border:"1px solid "+C.border}}>

        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.border,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          background:"#f8f9fb",borderRadius:"12px 12px 0 0"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:"700",color:C.text1}}>
              Registrar pago  {em.nombre}
            </div>
            <div style={{fontSize:"11px",color:C.text3,marginTop:"1px"}}>
              {em.frecuencia} {em.ciudad ? "- "+em.ciudad : ""}
            </div>
          </div>
          <Btn v="ghost" sm onClick={props.onClose}>Cancelar</Btn>
        </div>

        <div style={{padding:"18px"}}>

          {/* Seleccion de spots */}
          <div style={{marginBottom:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <Lbl>Spots a incluir en este pago *</Lbl>
              {spots.length > 0 && (
                <button onClick={toggleAll} style={{fontSize:"11px",fontWeight:"600",
                  color:C.blue,background:"none",border:"none",cursor:"pointer",fontFamily:FONT}}>
                  {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              )}
            </div>
            {spots.length === 0 ? (
              <div style={{padding:"20px",textAlign:"center",background:C.bg,
                borderRadius:"8px",fontSize:"12px",color:C.text4}}>
                No hay spots pendientes de pago para esta emisora
              </div>
            ) : (
              <div style={{border:"1px solid "+C.border,borderRadius:"8px",overflow:"hidden"}}>
                {/* Cabecera tabla */}
                <div style={{display:"grid",gridTemplateColumns:"28px 90px 1fr 60px 90px 90px",
                  padding:"6px 12px",background:"#f8f9fb",
                  borderBottom:"1px solid "+C.border}}>
                  {["","Fecha","Emisora / Tipo","Tipo","Neto","Al equipo"].map(function(h,i){
                    return (
                      <div key={i} style={{fontSize:"10px",fontWeight:"700",color:C.text4,
                        textTransform:"uppercase",letterSpacing:"0.05em"}}>
                        {i===0 ? (
                          <input type="checkbox" checked={todosSeleccionados}
                            onChange={toggleAll} style={{cursor:"pointer"}}/>
                        ) : h}
                      </div>
                    );
                  })}
                </div>
                {/* Filas */}
                {spots.map(function(sp,idx){
                  var esSel = !!sel[sp.id];
                  var precio = precioEquipoCalc(sp);
                  return (
                    <div key={sp.id}
                      onClick={function(){toggleSpot(sp.id);}}
                      style={{
                        display:"grid",gridTemplateColumns:"28px 90px 1fr 60px 90px 90px",
                        padding:"8px 12px",cursor:"pointer",
                        background:esSel?"#f0f7ff":idx%2===0?C.surface:"#fafbfc",
                        borderBottom:"1px solid "+C.borderL,
                        borderLeft:"3px solid "+(esSel?C.blue:"transparent"),
                        transition:"all 0.1s",
                        alignItems:"center",
                      }}>
                      <input type="checkbox" checked={esSel} onChange={function(){toggleSpot(sp.id);}}
                        onClick={function(e){e.stopPropagation();}}
                        style={{cursor:"pointer"}}/>
                      <div style={{fontSize:"12px",color:C.text3}}>{fmtFecha(sp.fecha)}</div>
                      <div>
                        <div style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>
                          {fmtHora(sp.hora)}
                        </div>
                        {sp.contrato && <div style={{fontSize:"10px",color:C.text4}}>{sp.contrato}</div>}
                      </div>
                      <div style={{fontSize:"11px",color:C.text3}}>{sp.tipo}</div>
                      <div style={{fontSize:"12px",fontWeight:"600",color:C.red}}>{fmtUSD(Number(sp.costo||0)+Number(sp.talento||0))}</div>
                      <div style={{fontSize:"13px",fontWeight:"700",color:C.amber}}>{fmtUSD(precio)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen monto seleccionado */}
          {selIds.length > 0 && (
            <div style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"10px 14px",background:C.greenBg,
              border:"1px solid "+C.greenBd,
              borderRadius:"8px",marginBottom:"16px",
            }}>
              <span style={{fontSize:"12px",color:C.green,fontWeight:"600"}}>
                {selIds.length} spot{selIds.length!==1?"s":""} seleccionado{selIds.length!==1?"s":""}
              </span>
              <span style={{fontSize:"16px",fontWeight:"800",color:C.green}}>
                {fmtUSD(montoCalc)}
              </span>
            </div>
          )}

          {/* Datos del pago */}
          <Divider label="Datos del pago"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
            <div>
              <Lbl>Fecha del pago *</Lbl>
              <Inp type="date" value={fecha}
                onChange={function(e){setFecha(e.target.value);}}/>
            </div>
            <div>
              <Lbl>Metodo de pago</Lbl>
              <Sel value={metodo} onChange={function(e){setMetodo(e.target.value);}}>
                {METODOS.map(function(m){return <option key={m} value={m}>{METODO_LABEL[m]}</option>;})}
              </Sel>
            </div>
          </div>
          <div style={{marginBottom:"12px"}}>
            <Lbl>Numero de referencia / cheque (opcional)</Lbl>
            <Inp value={ref} onChange={function(e){setRef(e.target.value);}}
              placeholder="ej. TRF-20260310-001 o Cheque #4421"/>
          </div>
          <div style={{marginBottom:"16px"}}>
            <Lbl>Notas (opcional)</Lbl>
            <textarea value={notas} onChange={function(e){setNotas(e.target.value);}}
              placeholder="Comentarios adicionales del pago..."
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid "+C.border,
                borderRadius:"8px",fontSize:"13px",color:C.text1,background:C.surface,
                outline:"none",boxSizing:"border-box",fontFamily:FONT,
                minHeight:"60px",resize:"vertical"}}/>
          </div>

          {err && (
            <div style={{padding:"9px 12px",background:C.redBg,border:"1px solid "+C.redBd,
              borderRadius:"8px",color:C.red,fontSize:"12px",marginBottom:"12px"}}>
              {err}
            </div>
          )}

          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <Btn v="ghost" onClick={props.onClose}>Cancelar</Btn>
            <Btn v="success" onClick={save} disabled={saving || selIds.length===0}>
              {saving ? "Guardando..." : "Registrar pago " + (selIds.length>0?fmtUSD(montoCalc):"")}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabPagos(props) {
  var spots    = props.spots;
  var emisoras = props.emisoras;
  var pagos    = props.pagos;
  var pagoSpots= props.pagoSpots;
  var isReadOnly = props.isReadOnly;
  var [emSel,   setEmSel]   = useState(null);
  var [modalEm, setModalEm] = useState(null);
  var [filtro,  setFiltro]  = useState("pendiente");

  // Spots pendientes (no pagados)
  function spotsPendEmisora(emId) {
    return spots.filter(function(s){ return s.emisoraId===emId && s.status!=="pagado"; });
  }

  // Pagos de una emisora
  function pagosEmisora(emId) {
    return pagos.filter(function(p){ return p.emisoraId===emId; })
      .sort(function(a,b){ return b.fecha.localeCompare(a.fecha); });
  }

  // Spots cubiertos por un pago
  function spotsDelPago(pagoId) {
    var ids = pagoSpots.filter(function(ps){ return ps.pagoId===pagoId; }).map(function(ps){return ps.spotId;});
    return spots.filter(function(s){ return ids.indexOf(s.id)>=0; });
  }

  // Resumen global
  var totalPendiente = spots.filter(function(s){return s.status!=="pagado";})
    .reduce(function(t,s){return t+precioEquipoCalc(s);},0);
  var totalPagado = pagos.reduce(function(t,p){return t+Number(p.monto||0);},0);
  var totalSpotsPend = spots.filter(function(s){return s.status!=="pagado";}).length;

  // Emisoras con deuda
  var emisorasConDeuda = emisoras.map(function(em){
    var pend = spotsPendEmisora(em.id);
    var montoPend = pend.reduce(function(t,s){return t+precioEquipoCalc(s);},0);
    var ultPago = pagosEmisora(em.id)[0] || null;
    return {em:em, pend:pend.length, montoPend:montoPend, ultPago:ultPago};
  }).filter(function(x){
    if (filtro==="pendiente") return x.pend > 0;
    if (filtro==="todas")     return true;
    return x.ultPago !== null;
  }).sort(function(a,b){return b.montoPend-a.montoPend;});

  return (
    <div>
      {/* KPIs globales */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"16px"}}>
        {[
          {l:"Spots pendientes de pago", v:totalSpotsPend,       color:C.amber, fmt:"n"},
          {l:"Monto pendiente total",    v:totalPendiente,         color:C.red,   fmt:"$"},
          {l:"Total pagado historico",   v:totalPagado,            color:C.green, fmt:"$"},
        ].map(function(k){
          return (
            <Card key={k.l} style={{padding:"14px 16px"}}>
              <div style={{fontSize:"20px",fontWeight:"800",color:k.color,letterSpacing:"-0.5px"}}>
                {k.fmt==="$" ? fmtUSD(k.v) : k.v}
              </div>
              <div style={{fontSize:"10px",color:C.text4,marginTop:"3px",fontWeight:"600",
                textTransform:"uppercase",letterSpacing:"0.05em"}}>
                {k.l}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filtro + layout */}
      <div style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>

        {/* Lista de emisoras */}
        <div style={{width:"300px",flexShrink:0}}>
          <div style={{display:"flex",gap:"4px",marginBottom:"10px"}}>
            {[["pendiente","Con deuda"],["pagadas","Con pagos"],["todas","Todas"]].map(function(f){
              var isA = filtro===f[0];
              return (
                <button key={f[0]} onClick={function(){setFiltro(f[0]);setEmSel(null);}}
                  style={{
                    padding:"5px 10px",borderRadius:"6px",cursor:"pointer",border:"1px solid "+C.border,
                    fontSize:"11px",fontWeight:isA?"600":"400",fontFamily:FONT,
                    background:isA?C.dark:"transparent",color:isA?"#fff":C.text3,
                  }}>
                  {f[1]}
                </button>
              );
            })}
          </div>
          <Card style={{overflow:"hidden"}}>
            {emisorasConDeuda.length === 0 ? (
              <div style={{padding:"32px",textAlign:"center",fontSize:"12px",color:C.text4}}>
                {filtro==="pendiente" ? "No hay emisoras con deuda pendiente" : "Sin emisoras"}
              </div>
            ) : (
              emisorasConDeuda.map(function(x){
                var isA = emSel && emSel.id===x.em.id;
                return (
                  <div key={x.em.id}
                    onClick={function(){setEmSel(x.em);}}
                    style={{
                      padding:"12px 14px",
                      borderBottom:"1px solid "+C.borderL,
                      cursor:"pointer",
                      background:isA?C.blueBg:C.surface,
                      borderLeft:"3px solid "+(isA?C.blue:x.pend>0?C.amber:"transparent"),
                      transition:"all 0.1s",
                    }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
                      <div style={{fontSize:"13px",fontWeight:"600",color:isA?C.blue:C.text1}}>
                        {x.em.nombre}
                      </div>
                      {x.pend > 0 && (
                        <Badge meta={{color:C.amber,bg:C.amberBg,bd:C.amberBd}}>
                          {x.pend} pendiente{x.pend!==1?"s":""}
                        </Badge>
                      )}
                    </div>
                    <div style={{fontSize:"11px",color:C.text4,marginBottom:"4px"}}>
                      {x.em.frecuencia} {x.em.ciudad?"-"+x.em.ciudad:""}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:"13px",fontWeight:"700",color:x.pend>0?C.red:C.text4}}>
                        {x.pend>0 ? fmtUSD(x.montoPend) : "Sin deuda"}
                      </span>
                      {x.ultPago && (
                        <span style={{fontSize:"10px",color:C.text4}}>
                          Ult. pago {fmtFecha(x.ultPago.fecha)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Panel derecho: expediente de la emisora seleccionada */}
        <div style={{flex:1,minWidth:0}}>
          {!emSel ? (
            <Card style={{padding:"48px",textAlign:"center"}}>
              <div style={{fontSize:"28px",opacity:"0.15",marginBottom:"8px"}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke={C.text4} strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <div style={{fontSize:"13px",fontWeight:"600",color:C.text3,marginBottom:"4px"}}>
                Selecciona una emisora
              </div>
              <div style={{fontSize:"12px",color:C.text4}}>
                para ver su expediente de pagos
              </div>
            </Card>
          ) : (
            <ExpedienteEmisora
              emisora={emSel}
              spots={spots}
              spotsPend={spotsPendEmisora(emSel.id)}
              pagos={pagosEmisora(emSel.id)}
              pagoSpots={pagoSpots}
              allSpots={spots}
              isReadOnly={isReadOnly}
              onPagar={function(){setModalEm(emSel);}}
              onDeletePago={props.onDeletePago}
            />
          )}
        </div>
      </div>

      {/* Modal nuevo pago */}
      {modalEm && (
        <PagoModal
          emisora={modalEm}
          spotsPendientes={spotsPendEmisora(modalEm.id)}
          onSave={function(data, cb){
            props.onSavePago(data, function(ok){
              if (ok) setModalEm(null);
              cb(ok);
            });
          }}
          onClose={function(){setModalEm(null);}}/>
      )}
    </div>
  );
}

function ExpedienteEmisora(props) {
  var em         = props.emisora;
  var spotsPend  = props.spotsPend;
  var pagos      = props.pagos;
  var pagoSpots  = props.pagoSpots;
  var allSpots   = props.allSpots;
  var isReadOnly = props.isReadOnly;
  var [tabLocal, setTabLocal] = useState("pendientes");
  var [expandPago, setExpandPago] = useState(null);
  var [confirmDel, setConfirmDel] = useState(null);

  var montoPend   = spotsPend.reduce(function(t,s){return t+precioEquipoCalc(s);},0);
  var totalPagado = pagos.reduce(function(t,p){return t+Number(p.monto||0);},0);

  function spotsDelPago(pagoId) {
    var ids = pagoSpots.filter(function(ps){return ps.pagoId===pagoId;}).map(function(ps){return ps.spotId;});
    return allSpots.filter(function(s){return ids.indexOf(s.id)>=0;});
  }

  var METODO_COLOR = {
    transferencia:{color:C.blue,bg:C.blueBg,bd:C.blueBd},
    cheque:{color:C.dark,bg:C.brandLt,bd:C.brandBd},
    efectivo:{color:C.green,bg:C.greenBg,bd:C.greenBd},
    tarjeta:{color:"#5b21b6",bg:"#ede9fe",bd:"#c4b5fd"},
    otro:{color:C.text3,bg:C.bg,bd:C.border},
  };

  return (
    <Card style={{overflow:"hidden"}}>
      {/* Header emisora */}
      <div style={{padding:"14px 16px",borderBottom:"1px solid "+C.border,
        background:"#f8f9fb"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
          <div>
            <div style={{fontSize:"15px",fontWeight:"700",color:C.text1}}>{em.nombre}</div>
            <div style={{fontSize:"12px",color:C.text3}}>
              {em.frecuencia}{em.ciudad ? " - "+em.ciudad : ""}
              {em.contrato ? " | "+em.contrato : ""}
            </div>
          </div>
          {!isReadOnly && spotsPend.length > 0 && (
            <Btn v="success" onClick={props.onPagar}>
              Registrar pago
            </Btn>
          )}
        </div>
        {/* KPIs emisora */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px"}}>
          {[
            {l:"Spots pendientes", v:spotsPend.length,     color:C.amber, fmt:"n"},
            {l:"Monto pendiente",  v:montoPend,             color:C.red,   fmt:"$"},
            {l:"Pagos realizados", v:pagos.length,          color:C.green, fmt:"n"},
            {l:"Total pagado",     v:totalPagado,           color:C.green, fmt:"$"},
          ].map(function(k){
            return (
              <div key={k.l} style={{textAlign:"center",padding:"8px",
                background:C.surface,borderRadius:"6px",border:"1px solid "+C.borderL}}>
                <div style={{fontSize:"16px",fontWeight:"800",color:k.color}}>
                  {k.fmt==="$" ? fmtUSD(k.v) : k.v}
                </div>
                <div style={{fontSize:"10px",color:C.text4,marginTop:"2px"}}>{k.l}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs locales */}
      <div style={{display:"flex",gap:"2px",padding:"0 16px",
        borderBottom:"1px solid "+C.border,background:C.surface}}>
        {[["pendientes","Spots pendientes ("+spotsPend.length+")"],["historial","Historial de pagos ("+pagos.length+")"]].map(function(t){
          var isA = tabLocal===t[0];
          return (
            <button key={t[0]} onClick={function(){setTabLocal(t[0]);}}
              style={{padding:"9px 12px",background:"transparent",border:"none",
                borderBottom:"2px solid "+(isA?C.dark:"transparent"),
                cursor:"pointer",fontSize:"12px",fontWeight:isA?"600":"400",
                color:isA?C.text1:C.text3,fontFamily:FONT,transition:"all 0.12s"}}>
              {t[1]}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div style={{padding:"0"}}>

        {/* Spots pendientes */}
        {tabLocal==="pendientes" && (
          <div>
            {spotsPend.length === 0 ? (
              <div style={{padding:"32px",textAlign:"center"}}>
                <div style={{fontSize:"12px",color:C.green,fontWeight:"600",marginBottom:"4px"}}>
                  Al dia
                </div>
                <div style={{fontSize:"12px",color:C.text4}}>
                  No hay spots pendientes de pago
                </div>
              </div>
            ) : (
              <div>
                {/* Header tabla */}
                <div style={{display:"grid",gridTemplateColumns:"90px 80px 60px 80px 90px 110px",
                  padding:"6px 16px",background:"#f8f9fb",
                  borderBottom:"1px solid "+C.border}}>
                  {["Fecha","Hora","Tipo","Neto","Al equipo","Status"].map(function(h,i){
                    return <div key={i} style={{fontSize:"10px",fontWeight:"700",color:C.text4,
                      textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</div>;
                  })}
                </div>
                {spotsPend.map(function(sp,idx){
                  var sm = STATUS_META[sp.status]||STATUS_META.pendiente;
                  return (
                    <div key={sp.id} style={{
                      display:"grid",gridTemplateColumns:"90px 80px 60px 80px 90px 110px",
                      padding:"8px 16px",
                      background:idx%2===0?C.surface:"#fafbfc",
                      borderBottom:"1px solid "+C.borderL,
                      alignItems:"center",
                    }}>
                      <div style={{fontSize:"12px",color:C.text3}}>{fmtFecha(sp.fecha)}</div>
                      <div style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>{fmtHora(sp.hora)}</div>
                      <div style={{fontSize:"11px",color:C.text3}}>{sp.tipo}</div>
                      <div style={{fontSize:"12px",fontWeight:"600",color:C.red}}>{fmtUSD(sp.costo)}</div>
                      <div style={{fontSize:"13px",fontWeight:"700",color:C.amber}}>{fmtUSD(precioEquipoCalc(sp))}</div>
                      <div><Badge meta={sm}/></div>
                    </div>
                  );
                })}
                {/* Total */}
                <div style={{display:"grid",gridTemplateColumns:"90px 80px 60px 80px 90px 110px",
                  padding:"8px 16px",background:C.amberBg,
                  borderTop:"2px solid "+C.amberBd,alignItems:"center"}}>
                  <div style={{fontSize:"11px",fontWeight:"700",color:C.amber,gridColumn:"1/4"}}>
                    TOTAL ({spotsPend.length} spots)
                  </div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:C.red}}>
                    {fmtUSD(spotsPend.reduce(function(t,s){return t+Number(s.costo||0);},0))}
                  </div>
                  <div style={{fontSize:"14px",fontWeight:"800",color:C.amber}}>
                    {fmtUSD(montoPend)}
                  </div>
                  <div/>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historial de pagos */}
        {tabLocal==="historial" && (
          <div>
            {pagos.length === 0 ? (
              <div style={{padding:"32px",textAlign:"center",fontSize:"12px",color:C.text4}}>
                No hay pagos registrados para esta emisora
              </div>
            ) : (
              pagos.map(function(pago){
                var spotsDePago = spotsDelPago(pago.id);
                var isExp = expandPago === pago.id;
                var mc = METODO_COLOR[pago.metodo] || METODO_COLOR.otro;
                return (
                  <div key={pago.id} style={{borderBottom:"1px solid "+C.borderL}}>
                    {/* Fila pago */}
                    <div style={{
                      display:"flex",alignItems:"center",gap:"12px",
                      padding:"12px 16px",cursor:"pointer",
                      background:isExp?C.blueBg:C.surface,
                      transition:"background 0.1s",
                    }}
                      onClick={function(){setExpandPago(isExp?null:pago.id);}}>
                      {/* Fecha */}
                      <div style={{minWidth:"80px"}}>
                        <div style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>{fmtFecha(pago.fecha)}</div>
                        <div style={{fontSize:"10px",color:C.text4}}>{pago.fecha}</div>
                      </div>
                      {/* Metodo */}
                      <Badge meta={mc}>{METODO_LABEL[pago.metodo]||pago.metodo}</Badge>
                      {/* Referencia */}
                      {pago.referencia && (
                        <div style={{fontSize:"11px",color:C.text3,flex:1}}>
                          {pago.referencia}
                        </div>
                      )}
                      {!pago.referencia && <div style={{flex:1}}/>}
                      {/* Spots cubiertos */}
                      <div style={{fontSize:"11px",color:C.text4,textAlign:"right",minWidth:"60px"}}>
                        {spotsDePago.length} spot{spotsDePago.length!==1?"s":""}
                      </div>
                      {/* Monto */}
                      <div style={{fontSize:"15px",fontWeight:"800",color:C.green,minWidth:"90px",textAlign:"right"}}>
                        {fmtUSD(pago.monto)}
                      </div>
                      {/* Expand */}
                      <div style={{fontSize:"11px",color:C.text4,width:"16px",textAlign:"center"}}>
                        {isExp ? "v" : ">"}
                      </div>
                    </div>
                    {/* Detalle expandido */}
                    {isExp && (
                      <div style={{background:"#f8fbff",borderTop:"1px solid "+C.borderL,padding:"12px 16px"}}>
                        {pago.notas && (
                          <div style={{fontSize:"12px",color:C.text3,marginBottom:"10px",
                            padding:"8px 10px",background:C.surface,borderRadius:"6px",
                            border:"1px solid "+C.borderL}}>
                            {pago.notas}
                          </div>
                        )}
                        {spotsDePago.length > 0 && (
                          <div style={{marginBottom:"10px"}}>
                            <div style={{fontSize:"10px",fontWeight:"700",color:C.text4,
                              textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"6px"}}>
                              Spots cubiertos por este pago
                            </div>
                            <div style={{border:"1px solid "+C.borderL,borderRadius:"6px",overflow:"hidden"}}>
                              {spotsDePago.map(function(sp,i){
                                return (
                                  <div key={sp.id} style={{
                                    display:"grid",gridTemplateColumns:"90px 80px 60px 80px 90px",
                                    padding:"7px 12px",alignItems:"center",
                                    background:i%2===0?C.surface:"#fafbfc",
                                    borderBottom:i<spotsDePago.length-1?"1px solid "+C.borderL:"none",
                                  }}>
                                    <div style={{fontSize:"11px",color:C.text3}}>{fmtFecha(sp.fecha)}</div>
                                    <div style={{fontSize:"11px",fontWeight:"600",color:C.text1}}>{fmtHora(sp.hora)}</div>
                                    <div style={{fontSize:"11px",color:C.text3}}>{sp.tipo}</div>
                                    <div style={{fontSize:"11px",fontWeight:"600",color:C.red}}>{fmtUSD(sp.costo)}</div>
                                    <div style={{fontSize:"12px",fontWeight:"700",color:C.green}}>{fmtUSD(precioEquipoCalc(sp))}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {!isReadOnly && (
                          <div style={{display:"flex",justifyContent:"flex-end"}}>
                            {confirmDel===pago.id ? (
                              <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                                <span style={{fontSize:"11px",color:C.red,fontWeight:"600"}}>
                                  Eliminar pago y revertir spots?
                                </span>
                                <Btn v="danger" sm onClick={function(){props.onDeletePago(pago.id);setConfirmDel(null);setExpandPago(null);}}>
                                  Si, eliminar
                                </Btn>
                                <Btn v="ghost" sm onClick={function(){setConfirmDel(null);}}>No</Btn>
                              </div>
                            ) : (
                              <Btn v="danger" sm onClick={function(){setConfirmDel(pago.id);}}>
                                Eliminar pago
                              </Btn>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

//  Root 

function TabIncidencias({ spots, emisoras, semana, setSpots }) {
  var emMap = {};
  emisoras.forEach(function(e){ emMap[e.id] = e; });
  var [filtroTipo, setFiltroTipo] = useState("all");
  var [filtroSemana, setFiltroSemana] = useState("actual");
  var [accionModal, setAccionModal] = useState(null);
  var [accionTipo, setAccionTipo] = useState("");
  var [accionNota, setAccionNota] = useState("");
  var [repFecha, setRepFecha] = useState("");
  var [repHora, setRepHora] = useState("");
  var [repEmisora, setRepEmisora] = useState("");
  var [saving, setSaving] = useState(false);

  function abrirAccion(sp) {
    setAccionModal(sp);
    setAccionTipo(sp.incidencia_accion || "");
    setAccionNota(sp.incidencia_accion_nota || "");
    setRepFecha("");
    setRepHora("");
    setRepEmisora(sp.emisoraId || "");
  }

  function guardarAccion() {
    if (!accionTipo) return;
    setSaving(true);
    var update = { incidencia_accion: accionTipo, incidencia_accion_nota: accionNota };
    SB.from("radio_spots").update(update).eq("id", accionModal.id).then(function(res) {
      if (res.error) { setSaving(false); return; }
      if (accionTipo === "cambio_horario" && repFecha && repHora && repEmisora) {
        var nuevoSpot = {
          emisora_id: repEmisora,
          fecha: repFecha,
          dia_semana: (function(){ var d=new Date(repFecha+"T12:00:00").toLocaleDateString("es-MX",{weekday:"long"}); return d.charAt(0).toUpperCase()+d.slice(1).replace("é","e").replace("á","a").replace("ó","o"); })(),
          hora: repHora,
          tipo: accionModal.tipo,
          costo: 0,
          talento: 0,
          contrato: accionModal.contrato,
          status: "confirmado",
          semana: lunesDe(repFecha),
          repuesto_spot_id: accionModal.id,
          precio_equipo: 0,
        };
        SB.from("radio_spots").insert(nuevoSpot).select().single().then(function(res2) {
          if (!res2.error && res2.data) {
            var mapped = {
              id: res2.data.id,
              emisoraId: res2.data.emisora_id,
              semana: res2.data.semana,
              fecha: res2.data.fecha,
              dia: res2.data.dia_semana,
              hora: res2.data.hora,
              tipo: res2.data.tipo,
              costo: 0,
              talento: 0,
              contrato: res2.data.contrato || "",
              status: res2.data.status || "confirmado",
              incidencia: null,
              incidenciaNota: "",
              incidencia_accion: null,
              incidencia_accion_nota: "",
              repuesto_spot_id: res2.data.repuesto_spot_id || null,
              precioEquipo: 0,
            };
            setSpots(function(p){ return p.concat([mapped]); });
          }
        });
      }
      setSpots(function(p){ return p.map(function(s){ return s.id===accionModal.id ? Object.assign({},s,update) : s; }); });
      setSaving(false);
      setAccionModal(null);
    });
  }

  var spotsConInc = spots.filter(function(s){
    if (!s.incidencia) return false;
    if (filtroTipo !== "all" && s.incidencia !== filtroTipo) return false;
    if (filtroSemana === "actual" && s.semana !== semana.lunes) return false;
    return true;
  }).sort(function(a,b){ return (b.fecha||"").localeCompare(a.fecha||""); });
  var totalCredito = spotsConInc.filter(function(s){ return INC_META[s.incidencia] && INC_META[s.incidencia].credito && !s.incidencia_accion; }).reduce(function(t,s){ return t + Number(s.costo||0) + Number(s.talento||0); }, 0);
  return (
    <div>
      <div style={{display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:"6px"}}>
          {[["all","Todas"],["no_salio","No salio"],["salio_mal","Salio mal"],["aircheck","Aircheck"],["otros","Otros"]].map(function(opt){
            var isA = filtroTipo===opt[0];
            return <button key={opt[0]} onClick={function(){setFiltroTipo(opt[0]);}} style={{padding:"4px 10px",borderRadius:"6px",border:"1px solid "+(isA?C.dark:C.border),background:isA?C.dark:"transparent",color:isA?C.bg:C.text3,fontSize:"11px",fontWeight:isA?"700":"400",cursor:"pointer",fontFamily:FONT}}>{opt[1]}</button>;
          })}
        </div>
        <div style={{display:"flex",gap:"6px",marginLeft:"auto"}}>
          {[["actual","Semana actual"],["todas","Todas"]].map(function(opt){
            var isA = filtroSemana===opt[0];
            return <button key={opt[0]} onClick={function(){setFiltroSemana(opt[0]);}} style={{padding:"4px 10px",borderRadius:"6px",border:"1px solid "+(isA?C.blue:C.border),background:isA?C.blueBg:"transparent",color:isA?C.blue:C.text3,fontSize:"11px",fontWeight:isA?"700":"400",cursor:"pointer",fontFamily:FONT}}>{opt[1]}</button>;
          })}
        </div>
      </div>
      <div style={{display:"flex",gap:"10px",marginBottom:"16px"}}>
        <div style={{padding:"12px 16px",borderRadius:"10px",background:C.redBg,border:"1px solid "+C.redBd,minWidth:"120px"}}>
          <div style={{fontSize:"9px",fontWeight:"700",color:C.red,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"4px"}}>Total incidencias</div>
          <div style={{fontSize:"22px",fontWeight:"800",color:C.red}}>{spotsConInc.length}</div>
        </div>
        <div style={{padding:"12px 16px",borderRadius:"10px",background:C.amberBg,border:"1px solid "+C.amberBd,minWidth:"120px"}}>
          <div style={{fontSize:"9px",fontWeight:"700",color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"4px"}}>Credito pendiente</div>
          <div style={{fontSize:"22px",fontWeight:"800",color:C.amber}}>{fmtUSD(totalCredito)}</div>
        </div>
      </div>
      {spotsConInc.length===0 && <div style={{textAlign:"center",padding:"40px",color:C.text4,fontSize:"13px"}}>Sin incidencias reportadas</div>}
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {spotsConInc.map(function(sp){
          var em = emMap[sp.emisoraId]||{};
          var inc = INC_META[sp.incidencia];
          return (
            <div key={sp.id} style={{padding:"12px 16px",borderRadius:"10px",background:C.surface,border:"1px solid "+C.border}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                <div style={{fontSize:"13px",fontWeight:"700",color:C.text1}}>{em.nombre||"—"}</div>
                <span style={{fontSize:"10px",fontWeight:"700",color:inc.color,background:inc.bg,border:"1px solid "+inc.bd,padding:"2px 8px",borderRadius:"10px"}}>{inc.label}</span>
                {inc.credito && <span style={{fontSize:"10px",fontWeight:"700",color:C.red,background:C.redBg,border:"1px solid "+C.redBd,padding:"2px 8px",borderRadius:"10px"}}>Credito: {fmtUSD(Number(sp.costo||0)+Number(sp.talento||0))}</span>}
              </div>
              <div style={{fontSize:"11px",color:C.text4}}>{sp.fecha} · {sp.hora} · {sp.tipo} · {sp.contrato||"—"}</div>
              {sp.incidenciaNota && <div style={{fontSize:"12px",color:C.text2,marginTop:"4px",fontStyle:"italic"}}>"{sp.incidenciaNota}"</div>}
              {sp.incidencia_accion && (
                <div style={{marginTop:"6px",fontSize:"11px",fontWeight:"700",color:sp.incidencia_accion==="mg_credito"?"#1a7f3c":sp.incidencia_accion==="credito_negado"?"#b91c1c":"#1565c0"}}>
                  Acción: {{"mg_credito":"✅ MG - Crédito disponible","cambio_horario":"🔄 Cambio de horario","credito_negado":"❌ Crédito negado"}[sp.incidencia_accion]}
                  {sp.incidencia_accion_nota && <span style={{fontWeight:"400",color:C.text3}}> · {sp.incidencia_accion_nota}</span>}
                </div>
              )}
              {!sp.incidencia_accion && (
                <button onClick={function(){abrirAccion(sp);}} style={{marginTop:"8px",padding:"4px 12px",borderRadius:"6px",background:C.blueBg,border:"1px solid "+C.blueBd,color:C.blue,fontSize:"11px",fontWeight:"600",cursor:"pointer",fontFamily:FONT}}>
                  Tomar acción
                </button>
              )}
              {sp.incidencia_accion && (
                <button onClick={function(){abrirAccion(sp);}} style={{marginTop:"8px",padding:"4px 12px",borderRadius:"6px",background:"transparent",border:"1px solid "+C.border,color:C.text3,fontSize:"11px",cursor:"pointer",fontFamily:FONT}}>
                  Editar acción
                </button>
              )}
            </div>
          );
        })}
      </div>

      {accionModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
          <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:"12px",padding:"24px",width:"100%",maxWidth:"420px"}}>
            <div style={{fontSize:"14px",fontWeight:"700",color:C.text1,marginBottom:"4px"}}>Acción sobre incidencia</div>
            <div style={{fontSize:"12px",color:C.text4,marginBottom:"16px"}}>{(emisoras.find(function(e){return e.id===accionModal.emisoraId;})||{}).nombre} · {accionModal.fecha} · {accionModal.hora}</div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
              {[["mg_credito","✅ MG - Crédito disponible","El crédito queda disponible para usar en otro espacio. No afecta el budget del día de reposición."],["cambio_horario","🔄 Cambio de horario","La emisora repone el spot en otro horario o día."],["credito_negado","❌ Crédito negado por emisora","La emisora no reconoce el crédito."]].map(function(opt){
                var isA = accionTipo===opt[0];
                return (
                  <div key={opt[0]} onClick={function(){setAccionTipo(opt[0]);}} style={{padding:"10px 14px",borderRadius:"8px",border:"2px solid "+(isA?C.blue:C.border),background:isA?C.blueBg:"transparent",cursor:"pointer"}}>
                    <div style={{fontSize:"13px",fontWeight:"700",color:isA?C.blue:C.text1}}>{opt[1]}</div>
                    <div style={{fontSize:"11px",color:C.text3,marginTop:"2px"}}>{opt[2]}</div>
                  </div>
                );
              })}
            </div>
            {accionTipo==="cambio_horario" && (
              <div style={{padding:"10px 12px",borderRadius:"8px",background:C.blueBg,border:"1px solid "+C.blueBd,marginBottom:"12px"}}>
                <div style={{fontSize:"11px",fontWeight:"700",color:C.blue,marginBottom:"8px"}}>Nuevo spot de reposición</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
                  <div>
                    <div style={{fontSize:"11px",color:C.text3,marginBottom:"4px"}}>Fecha</div>
                    <input type="date" value={repFecha} onChange={function(e){setRepFecha(e.target.value);}} style={{width:"100%",padding:"6px 8px",borderRadius:"6px",border:"1px solid "+C.border,fontSize:"12px",fontFamily:FONT,boxSizing:"border-box"}} />
                  </div>
                  <div>
                    <div style={{fontSize:"11px",color:C.text3,marginBottom:"4px"}}>Hora</div>
                    <input type="time" value={repHora} onChange={function(e){setRepHora(e.target.value);}} style={{width:"100%",padding:"6px 8px",borderRadius:"6px",border:"1px solid "+C.border,fontSize:"12px",fontFamily:FONT,boxSizing:"border-box"}} />
                  </div>
                </div>
                <div>
                  <div style={{fontSize:"11px",color:C.text3,marginBottom:"4px"}}>Emisora</div>
                  <select value={repEmisora} onChange={function(e){setRepEmisora(e.target.value);}} style={{width:"100%",padding:"6px 8px",borderRadius:"6px",border:"1px solid "+C.border,fontSize:"12px",fontFamily:FONT,boxSizing:"border-box"}}>
                    {emisoras.map(function(e){ return <option key={e.id} value={e.id}>{e.nombre}</option>; })}
                  </select>
                </div>
              </div>
            )}
            <div style={{marginBottom:"12px"}}>
              <div style={{fontSize:"11px",color:C.text3,marginBottom:"4px"}}>Nota (opcional)</div>
              <input value={accionNota} onChange={function(e){setAccionNota(e.target.value);}} placeholder="Detalles adicionales..." style={{width:"100%",padding:"7px 10px",borderRadius:"6px",border:"1px solid "+C.border,fontSize:"12px",fontFamily:FONT,boxSizing:"border-box"}} />
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={function(){setAccionModal(null);}} style={{flex:1,padding:"8px",borderRadius:"6px",border:"1px solid "+C.border,background:"transparent",fontSize:"12px",cursor:"pointer",fontFamily:FONT}}>Cancelar</button>
              <button onClick={guardarAccion} disabled={!accionTipo||saving} style={{flex:2,padding:"8px",borderRadius:"6px",border:"none",background:accionTipo&&!saving?C.blue:"#94a3b8",color:"#fff",fontSize:"12px",fontWeight:"700",cursor:accionTipo&&!saving?"pointer":"not-allowed",fontFamily:FONT}}>{saving?"Guardando...":"Guardar acción"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RadioModule(props) {
  var isSupervisor = props.isSupervisor;
  var isReadOnly   = props.isReadOnly;
  var currentUser  = props.currentUser;
  var [emisoras,  setEmisoras]  = useState([]);
  var [spots,     setSpots]     = useState([]);
  var [pagos,     setPagos]     = useState([]);
  var [pagoSpots, setPagoSpots] = useState([]);
  var [loading,   setLoading]   = useState(true);
  var [dbOk,      setDbOk]      = useState(false);
  var [tab,       setTab]       = useState("log");
  var [semana,    setSemana]    = useState({lunes:lunesDe(hoy()), domingo:domingoDe(lunesDe(hoy()))});
  var [modal,     setModal]     = useState(null);
  var [incModal,  setIncModal]  = useState(null);
  var [toast,     setToast]     = useState(null);

  function notify(msg, ok) {
    setToast({msg:msg, ok:ok !== false});
    setTimeout(function(){setToast(null);}, 3200);
  }

  function logAudit(spotId, accion, detalle) {
    if (!spotId) return;
    SB.from("radio_audit").insert({
      spot_id:       spotId,
      accion:        accion,
      detalle:       detalle || null,
      usuario_id:    currentUser ? currentUser.id   : null,
      usuario_nombre:currentUser ? currentUser.nombre: "Sistema",
    }).then(function(){});
  }

  //  Carga inicial 
  var load = useCallback(function() {
    setLoading(true);
    Promise.all([
      SB.from("emisoras").select("*").order("nombre"),
      SB.from("radio_spots").select("*").order("fecha").order("hora"),
      SB.from("radio_pagos").select("*").order("fecha", {ascending:false}),
      SB.from("radio_pago_spots").select("*"),
    ]).then(function(results) {
      var resE  = results[0];
      var resS  = results[1];
      var resP  = results[2];
      var resPS = results[3];

      if (resE.data) {
        setEmisoras(resE.data.map(function(e){
          return {
            id:         e.id,
            nombre:     e.nombre,
            frecuencia: e.frecuencia  || "",
            ciudad:     e.ciudad      || "",
            contrato:   e.contrato    || "",
            activo:     e.activo !== false,
            vendedor:   e.vendedor    || "",
            telefono:   e.telefono    || "",
            email:      e.email       || "",
            tarifaBase: Number(e.tarifa_base || 0),
            notas:      e.notas       || "",
          };
        }));
      }

      if (resS.data) {
        setSpots(resS.data.map(function(s){
          var lunes = lunesDe(s.fecha || hoy());
          return {
            id:             s.id,
            emisoraId:      s.emisora_id,
            semana:         s.semana       || lunes,
            fecha:          s.fecha        || "",
            dia:            s.dia_semana   || "",
            hora:           s.hora         || "",
            tipo:           s.tipo         || "60seg",
            costo:          Number(s.costo    || 0),
            talento:        Number(s.talento  || 0),
            contrato:       s.contrato     || "",
            status:         s.status       || "pendiente",
            incidencia:            s.incidencia   || null,
            incidenciaNota:        s.incidencia_nota || "",
            incidencia_accion:     s.incidencia_accion || null,
            incidencia_accion_nota: s.incidencia_accion_nota || "",
            repuesto_spot_id:      s.repuesto_spot_id || null,
            precioEquipo:          s.precio_equipo != null ? Number(s.precio_equipo) : null,
          };
        }));
      }

      if (resP.data) {
        setPagos(resP.data.map(function(p){
          return {
            id:         p.id,
            emisoraId:  p.emisora_id,
            fecha:      p.fecha,
            monto:      Number(p.monto || 0),
            metodo:     p.metodo     || "transferencia",
            referencia: p.referencia || "",
            notas:      p.notas      || "",
            createdAt:  p.created_at,
          };
        }));
      }

      if (resPS.data) {
        setPagoSpots(resPS.data.map(function(ps){
          return {pagoId: ps.pago_id, spotId: ps.spot_id};
        }));
      }

      setDbOk(true);
      setLoading(false);
    }).catch(function(err){
      console.error("[Radio] Error cargando:", err);
      setDbOk(false);
      setLoading(false);
    });
  }, []);

  useEffect(function(){ load(); }, [load]);

  //  Navegacion semana 
  var esSemanaActual = semana.lunes === lunesDe(hoy());

  function prevSemana() {
    var d = new Date(semana.lunes + "T12:00:00");
    d.setDate(d.getDate() - 7);
    var lunes = lunesDe(d.toISOString().split("T")[0]);
    setSemana({lunes:lunes, domingo:domingoDe(lunes)});
  }
  function nextSemana() {
    var d = new Date(semana.lunes + "T12:00:00");
    d.setDate(d.getDate() + 7);
    var lunes = lunesDe(d.toISOString().split("T")[0]);
    setSemana({lunes:lunes, domingo:domingoDe(lunes)});
  }

  //  CRUD spots 
  function saveSpot(draft) {
    var row = {
      emisora_id:      draft.emisoraId,
      semana:          semana.lunes,
      fecha:           draft.fecha || fechaDeDia(semana.lunes, draft.dia),
      dia_semana:      draft.dia,
      hora:            draft.hora,
      tipo:            draft.tipo,
      costo:           Number(draft.costo   || 0),
      talento:         Number(draft.talento || 0),
      contrato:        draft.contrato || null,
      status:          draft.status   || "pendiente",
      incidencia:      draft.incidencia || null,
      incidencia_nota: draft.incidenciaNota || null,
      precio_equipo:   draft.precioEquipo != null ? Number(draft.precioEquipo) : null,
    };
    if (modal && modal.spot) {
      SB.from("radio_spots").update(row).eq("id", draft.id).then(function(res){
        if (res.error) { notify("Error al guardar", false); return; }
        logAudit(draft.id, "Spot editado", "Status: " + row.status + " | Costo: " + fmtUSD(row.costo));
        setSpots(function(p){return p.map(function(s){return s.id===draft.id?Object.assign({},draft):s;});});
        notify("Spot actualizado");
        setModal(null);
      });
    } else {
      SB.from("radio_spots").insert(row).select().single().then(function(res){
        if (res.error) { notify("Error al guardar", false); return; }
        logAudit(res.data.id, "Spot creado", "Emisora: " + (row.emisora_id) + " | " + row.tipo + " | " + fmtUSD(row.costo));
        setSpots(function(p){return p.concat([Object.assign({},draft,{id:res.data.id,semana:semana.lunes})]);});
        notify("Spot agregado");
        setModal(null);
      });
    }
  }

  function deleteSpot(id) {
    SB.from("radio_spots").delete().eq("id", id).then(function(res){
      if (res.error) { notify("Error al eliminar", false); return; }
      setSpots(function(p){return p.filter(function(s){return s.id!==id;});});
      notify("Spot eliminado");
    });
  }

  function saveIncidencia(updated) {
    SB.from("radio_spots").update({
      incidencia:      updated.incidencia || null,
      incidencia_nota: updated.incidenciaNota || null,
    }).eq("id", updated.id).then(function(res){
      if (res.error) { notify("Error al guardar incidencia", false); return; }
      setSpots(function(p){return p.map(function(s){return s.id===updated.id?updated:s;});});
      notify(updated.incidencia ? "Incidencia registrada" : "Incidencia removida");
      setIncModal(null);
    });
  }

  //  CRUD emisoras 
  function saveEmisora(draft) {
    var row = {
      nombre:      draft.nombre,
      frecuencia:  draft.frecuencia || null,
      ciudad:      draft.ciudad     || null,
      contrato:    draft.contrato   || null,
      activo:      draft.activo !== false,
      vendedor:    draft.vendedor   || null,
      telefono:    draft.telefono   || null,
      email:       draft.email      || null,
      tarifa_base: Number(draft.tarifaBase || 0),
      notas:       draft.notas      || null,
    };
    if (modal && modal.emisora) {
      SB.from("emisoras").update(row).eq("id", draft.id).then(function(res){
        if (res.error) { notify("Error al guardar", false); return; }
        setEmisoras(function(p){return p.map(function(e){return e.id===draft.id?Object.assign({},draft):e;});});
        notify("Emisora actualizada");
        setModal(null);
      });
    } else {
      SB.from("emisoras").insert(row).select().single().then(function(res){
        if (res.error) { notify("Error al guardar", false); return; }
        setEmisoras(function(p){return p.concat([Object.assign({},draft,{id:res.data.id})]);});
        notify("Emisora agregada");
        setModal(null);
      });
    }
  }

  //  CRUD pagos 
  function savePago(data, cb) {
    // 1. Insertar pago
    SB.from("radio_pagos").insert({
      emisora_id: data.emisoraId,
      fecha:      data.fecha,
      monto:      data.monto,
      metodo:     data.metodo,
      referencia: data.referencia || null,
      notas:      data.notas      || null,
    }).select().single().then(function(res){
      if (res.error) {
        console.error("[Radio] insert pago:", res.error);
        notify("Error al registrar el pago", false);
        cb(false); return;
      }
      var nuevoPago = {
        id:         res.data.id,
        emisoraId:  res.data.emisora_id,
        fecha:      res.data.fecha,
        monto:      Number(res.data.monto),
        metodo:     res.data.metodo,
        referencia: res.data.referencia || "",
        notas:      res.data.notas      || "",
        createdAt:  res.data.created_at,
      };

      // 2. Insertar filas pago_spots
      var psRows = data.spotIds.map(function(sid){
        return {pago_id: res.data.id, spot_id: sid};
      });
      SB.from("radio_pago_spots").insert(psRows).then(function(resPS){
        if (resPS.error) {
          console.error("[Radio] insert pago_spots:", resPS.error);
        }

        // 3. Marcar spots como pagado
        SB.from("radio_spots").update({status:"pagado"})
          .in("id", data.spotIds).then(function(resUpd){
            if (resUpd.error) {
              console.error("[Radio] update spots pagado:", resUpd.error);
            }
            // Actualizar estado local
            setPagos(function(p){ return [nuevoPago].concat(p); });
            setPagoSpots(function(p){
              return p.concat(data.spotIds.map(function(sid){
                return {pagoId:res.data.id, spotId:sid};
              }));
            });
            setSpots(function(p){
              return p.map(function(s){
                if (data.spotIds.indexOf(s.id) >= 0) {
                  return Object.assign({}, s, {status:"pagado"});
                }
                return s;
              });
            });
            notify("Pago de " + fmtUSD(data.monto) + " registrado");
            cb(true);
          });
      });
    });
  }

  function deletePago(pagoId) {
    // Obtener los spot_ids de este pago antes de borrarlo
    var spotIds = pagoSpots
      .filter(function(ps){ return ps.pagoId === pagoId; })
      .map(function(ps){ return ps.spotId; });

    SB.from("radio_pagos").delete().eq("id", pagoId).then(function(res){
      if (res.error) { notify("Error al eliminar pago", false); return; }

      // Revertir spots a "confirmado" (estado anterior logico)
      if (spotIds.length > 0) {
        SB.from("radio_spots").update({status:"confirmado"})
          .in("id", spotIds).then(function(){
            setSpots(function(p){
              return p.map(function(s){
                if (spotIds.indexOf(s.id) >= 0) {
                  return Object.assign({}, s, {status:"confirmado"});
                }
                return s;
              });
            });
          });
      }

      setPagos(function(p){ return p.filter(function(x){ return x.id !== pagoId; }); });
      setPagoSpots(function(p){ return p.filter(function(x){ return x.pagoId !== pagoId; }); });
      notify("Pago eliminado y spots revertidos a Confirmado");
    });
  }

  //  Tabs 
  var spotsPendTotal = spots.filter(function(s){return s.status!=="pagado";}).length;
  var TABS = [
    {id:"log",      label:"Log semanal"},
    {id:"emisoras", label:"Emisoras ("+emisoras.length+")"},
    {id:"ordenes",  label:"Ordenes ("+spots.length+")"},
    {id:"pagos",    label:"Pagos" + (spotsPendTotal>0 ? " ("+spotsPendTotal+" pend.)":"")},
    {id:"finanzas", label:"Finanzas"},
    {id:"incidencias", label:"Incidencias"},
  ];

  var spotsDelaSemana = spots.filter(function(s){return s.semana===semana.lunes;});
  var totalNeto = spotsDelaSemana.reduce(function(t,s){return t+Number(s.costo||0);},0);
  var totalEq   = spotsDelaSemana.reduce(function(t,s){return t+precioEquipoCalc(s);},0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",fontFamily:FONT,background:C.bg}}>

      {/* Topbar */}
      <div style={{
        background:C.surface, borderBottom:"1px solid "+C.border,
        padding:"0 20px", display:"flex", alignItems:"center",
        minHeight:"52px", flexShrink:0, gap:"12px",
      }}>
        <div style={{flex:1}}>
          <div style={{fontSize:"14px",fontWeight:"700",color:C.text1}}>Radio</div>
          <div style={{fontSize:"11px",color:C.text4,display:"flex",alignItems:"center",gap:"6px"}}>
            Gestion de pauta radial
            <span style={{
              fontSize:"10px",padding:"1px 7px",borderRadius:"10px",fontWeight:"700",
              color:dbOk?C.green:C.amber,
              background:dbOk?C.greenBg:C.amberBg,
              border:"1px solid "+(dbOk?C.greenBd:C.amberBd),
            }}>
              {loading?"Cargando...":dbOk?"Conectado":"Local"}
            </span>
          </div>
        </div>

        {/* Navegacion semana  solo en tabs que la usan */}
        {(tab==="log"||tab==="finanzas") && (
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <Btn v="ghost" sm onClick={prevSemana}>{"<"}</Btn>
            <div style={{textAlign:"center",minWidth:"190px"}}>
              <div style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>
                {fmtFecha(semana.lunes)} - {fmtFecha(semana.domingo)}
              </div>
              {(function(){
                var hoyLunes = lunesDe(hoy());
                if (semana.lunes === hoyLunes) {
                  return <div style={{fontSize:"10px",color:C.mid,fontWeight:"600"}}>Semana actual</div>;
                }
                var diffMs = new Date(semana.lunes+"T12:00:00") - new Date(hoyLunes+"T12:00:00");
                var diffSem = Math.round(diffMs / (7*24*60*60*1000));
                if (diffSem > 0) {
                  return <div style={{fontSize:"10px",color:C.amber,fontWeight:"600"}}>{diffSem === 1 ? "Semana siguiente" : diffSem+" semanas adelante"}</div>;
                }
                return <div style={{fontSize:"10px",color:C.text4,fontWeight:"600"}}>{Math.abs(diffSem)+" semanas atras"}</div>;
              })()}
            </div>
            <Btn v="ghost" sm onClick={nextSemana}>{">"}</Btn>
            {!esSemanaActual && (
              <Btn v="blue" sm onClick={function(){
                var l = lunesDe(hoy());
                setSemana({lunes:l,domingo:domingoDe(l)});
              }}>Hoy</Btn>
            )}
          </div>
        )}

        {(tab==="log"||tab==="finanzas") && spotsDelaSemana.length > 0 && (
          <div style={{display:"flex",gap:"12px",fontSize:"12px",paddingLeft:"12px",
            borderLeft:"1px solid "+C.borderL}}>
            <span style={{color:C.text3}}>{spotsDelaSemana.length} spots</span>
            <span style={{color:C.red,fontWeight:"600"}}>{fmtUSD(totalNeto)}</span>
            <span style={{color:C.amber,fontWeight:"700"}}>{fmtUSD(totalEq)} al equipo</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{background:C.surface,borderBottom:"1px solid "+C.border,
        padding:"0 20px",display:"flex",gap:"2px",flexShrink:0,alignItems:"center"}}>
        {TABS.map(function(t){
          var isA = tab===t.id;
          var isPagos = t.id==="pagos" && spotsPendTotal>0;
          return (
            <button key={t.id} onClick={function(){setTab(t.id);}}
              style={{
                padding:"10px 14px",background:"transparent",border:"none",
                cursor:"pointer",fontSize:"12px",fontFamily:FONT,
                fontWeight:isA?"600":"400",
                color:isA?C.dark:(isPagos?C.amber:C.text3),
                borderBottom:"2px solid "+(isA?C.dark:(isPagos?C.amber:"transparent")),
                transition:"all 0.15s",
              }}>
              {t.label}
            </button>
          );
        })}
        {isReadOnly && (
          <div style={{marginLeft:"auto"}}>
            <span style={{fontSize:"10px",fontWeight:"700",letterSpacing:"0.06em",
              color:"#0f766e",background:"#f0fdfa",border:"1px solid #99f6e4",
              padding:"2px 9px",borderRadius:"6px"}}>
              SOLO LECTURA
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {loading && (
          <div style={{textAlign:"center",padding:"60px",color:C.text4}}>
            <div style={{fontSize:"13px"}}>Cargando datos...</div>
          </div>
        )}
        {!loading && tab==="log" && (
          <TabLog
            spots={spots} emisoras={emisoras} semana={semana}
            isSupervisor={isSupervisor && !isReadOnly}
            onAddSpot={function(dia){if(!isReadOnly) setModal({type:"spot",spot:null,dia:dia});}}
            onEditSpot={function(sp){if(!isReadOnly) setModal({type:"spot",spot:sp});}}
            onDeleteSpot={function(id){if(!isReadOnly) deleteSpot(id);}}
            onInc={function(sp){if(!isReadOnly) setIncModal(sp);}}
          />
        )}
        {!loading && tab==="emisoras" && (
          <TabEmisoras
            emisoras={emisoras} spots={spots}
            isReadOnly={isReadOnly}
            currentUser={currentUser}
            onAddEmisora={function(){if(!isReadOnly) setModal({type:"emisora",emisora:null});}}
            onEditEmisora={function(em){if(!isReadOnly) setModal({type:"emisora",emisora:em});}}
          />
        )}
        {!loading && tab==="ordenes" && (
          <TabOrdenes spots={spots} emisoras={emisoras}/>
        )}
        {!loading && tab==="pagos" && (
          <TabPagos
            spots={spots}
            emisoras={emisoras}
            pagos={pagos}
            pagoSpots={pagoSpots}
            isReadOnly={isReadOnly}
            onSavePago={savePago}
            onDeletePago={deletePago}
          />
        )}
        {!loading && tab==="incidencias" && (
          <TabIncidencias spots={spots} emisoras={emisoras} semana={semana} setSpots={setSpots} />
        )}
        {!loading && tab==="finanzas" && (
          <TabFinanzas spots={spots} emisoras={emisoras} semana={semana}/>
        )}
      </div>

      {/* Modales spot/emisora/incidencia */}
      {modal && modal.type==="emisora" && (
        <EmisoraModal
          emisora={modal.emisora}
          onSave={saveEmisora}
          onClose={function(){setModal(null);}}/>
      )}
      {modal && modal.type==="spot" && (
        <SpotModal
          spot={modal.spot}
          diaDefault={modal.dia}
          emisoras={emisoras}
          semana={semana}
          onSave={saveSpot}
          onClose={function(){setModal(null);}}/>
      )}
      {incModal && (
        <IncModal
          spot={incModal}
          emisora={(function(){
            for(var i=0;i<emisoras.length;i++){if(emisoras[i].id===incModal.emisoraId) return emisoras[i];}
            return null;
          })()}
          onSave={saveIncidencia}
          onClose={function(){setIncModal(null);}}/>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed",bottom:"24px",right:"24px",zIndex:999,
          padding:"11px 18px",borderRadius:"10px",
          background:toast.ok?C.greenBg:C.redBg,
          border:"1px solid "+(toast.ok?C.greenBd:C.redBd),
          color:toast.ok?C.green:C.red,
          fontSize:"13px",fontWeight:"600",
          boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
          fontFamily:FONT,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
