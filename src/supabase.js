// ============================================================
// supabase.js  —  Mini-Vac Vacation Club CRM
// Cliente central + todos los hooks por módulo
//
// Instalación:
//   npm install @supabase/supabase-js
//
// Variables de entorno (.env.local):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGci...
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";

// ============================================================
// CLIENTE
// ============================================================
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local");
}

export var supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// ============================================================
// UTILIDADES INTERNAS
// ============================================================
function handleError(context, error) {
  console.error("[supabase:" + context + "]", error);
  return null;
}

// ============================================================
// ██████  AUTH
// ============================================================

/**
 * Login con email + password.
 * Retorna { user, perfil } donde perfil es la fila de public.usuarios.
 */
export async function login(email, password) {
  var { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
  if (error) return { error: error.message };

  var { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_id", data.user.id)
    .single();

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    return { error: "Usuario inactivo o sin perfil asignado." };
  }

  return { user: data.user, perfil: perfil };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function resetPassword(email) {
  var { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password"
  });
  return error ? { error: error.message } : { ok: true };
}

/** Hook: usuario y perfil actuales */
export function useAuth() {
  var [perfil,   setPerfil]   = useState(null);
  var [loading,  setLoading]  = useState(true);

  useEffect(function() {
    // Sesión inicial
    supabase.auth.getSession().then(function(res) {
      if (res.data.session) {
        supabase.from("usuarios")
          .select("*")
          .eq("auth_id", res.data.session.user.id)
          .single()
          .then(function(r) { setPerfil(r.data); setLoading(false); });
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios
    var { data: sub } = supabase.auth.onAuthStateChange(function(event, session) {
      if (session) {
        supabase.from("usuarios")
          .select("*")
          .eq("auth_id", session.user.id)
          .single()
          .then(function(r) { setPerfil(r.data); });
      } else {
        setPerfil(null);
      }
    });

    return function() { sub.subscription.unsubscribe(); };
  }, []);

  return { perfil: perfil, loading: loading, rol: perfil ? perfil.rol : null };
}

// ============================================================
// ██████  USUARIOS
// ============================================================

export async function fetchUsuarios() {
  var { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("nombre");
  return error ? handleError("fetchUsuarios", error) : data;
}

export async function upsertUsuario(usuario) {
  var { data, error } = await supabase
    .from("usuarios")
    .upsert(usuario, { onConflict: "id" })
    .select()
    .single();
  return error ? handleError("upsertUsuario", error) : data;
}

export async function toggleUsuarioActivo(id, activo) {
  var { data, error } = await supabase
    .from("usuarios")
    .update({ activo: activo })
    .eq("id", id)
    .select()
    .single();
  return error ? handleError("toggleUsuarioActivo", error) : data;
}

/** Hook para el módulo Roles & Permissions */
export function useUsuarios() {
  var [usuarios, setUsuarios] = useState([]);
  var [loading,  setLoading]  = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var data = await fetchUsuarios();
    setUsuarios(data || []);
    setLoading(false);
  }, []);

  useEffect(function() { refresh(); }, []);

  return { usuarios: usuarios, loading: loading, refresh: refresh, setUsuarios: setUsuarios };
}

// ============================================================
// ██████  CATÁLOGOS
// ============================================================

export async function fetchDestinos() {
  var { data } = await supabase.from("destinos").select("*, destino_regalos(regalo_id)").order("label");
  return data || [];
}

export async function fetchHoteles(destinoId) {
  var q = supabase.from("hoteles").select("*").eq("activo", true).order("nombre");
  if (destinoId) q = q.eq("destino_id", destinoId);
  var { data } = await q;
  return data || [];
}

export async function fetchRegalosOpcionales() {
  var { data } = await supabase.from("regalos_opcionales").select("*").order("nombre");
  return data || [];
}

export async function fetchRegalosIncluidos() {
  var { data } = await supabase.from("regalos_incluidos").select("*").order("nombre");
  return data || [];
}

export async function upsertDestino(destino) {
  var { data, error } = await supabase.from("destinos").upsert(destino).select().single();
  return error ? handleError("upsertDestino", error) : data;
}

export async function upsertHotel(hotel) {
  var { data, error } = await supabase.from("hoteles").upsert(hotel).select().single();
  return error ? handleError("upsertHotel", error) : data;
}

export async function upsertRegaloOpcional(regalo) {
  var { data, error } = await supabase.from("regalos_opcionales").upsert(regalo).select().single();
  return error ? handleError("upsertRegaloOpcional", error) : data;
}

export async function setDestinoRegalos(destinoId, regalosIds) {
  // Reemplaza la asignación completa
  await supabase.from("destino_regalos").delete().eq("destino_id", destinoId);
  if (regalosIds.length === 0) return true;
  var rows = regalosIds.map(function(rid) { return { destino_id: destinoId, regalo_id: rid }; });
  var { error } = await supabase.from("destino_regalos").insert(rows);
  return !error;
}

/** Hook para el módulo Destinations */
export function useDestinos() {
  var [destinos,  setDestinos]  = useState([]);
  var [hoteles,   setHoteles]   = useState([]);
  var [regalosOpc, setRegalosOpc] = useState([]);
  var [regalosInc, setRegalosInc] = useState([]);
  var [loading,   setLoading]   = useState(true);

  useEffect(function() {
    Promise.all([fetchDestinos(), fetchHoteles(), fetchRegalosOpcionales(), fetchRegalosIncluidos()])
      .then(function(results) {
        setDestinos(results[0]);
        setHoteles(results[1]);
        setRegalosOpc(results[2]);
        setRegalosInc(results[3]);
        setLoading(false);
      });
  }, []);

  return {
    destinos: destinos,   setDestinos: setDestinos,
    hoteles: hoteles,     setHoteles: setHoteles,
    regalosOpc: regalosOpc, setRegalosOpc: setRegalosOpc,
    regalosInc: regalosInc, setRegalosInc: setRegalosInc,
    loading: loading
  };
}

// ============================================================
// ██████  EMISORAS Y RADIO
// ============================================================

export async function fetchEmisoras() {
  var { data } = await supabase.from("emisoras").select("*").order("nombre");
  return data || [];
}

export async function upsertEmisora(emisora) {
  var { data, error } = await supabase.from("emisoras").upsert(emisora).select().single();
  return error ? handleError("upsertEmisora", error) : data;
}

export async function fetchRadioSpots(filters) {
  filters = filters || {};
  var q = supabase.from("radio_spots").select("*, emisoras(nombre, ciudad)").order("fecha", { ascending: false });
  if (filters.emisora_id) q = q.eq("emisora_id", filters.emisora_id);
  if (filters.desde)      q = q.gte("fecha", filters.desde);
  if (filters.hasta)      q = q.lte("fecha", filters.hasta);
  var { data } = await q;
  return data || [];
}

export async function insertRadioSpot(spot) {
  var { data, error } = await supabase.from("radio_spots").insert(spot).select().single();
  return error ? handleError("insertRadioSpot", error) : data;
}

/** Hook para el módulo Radio */
export function useRadio() {
  var [emisoras, setEmisoras] = useState([]);
  var [spots,    setSpots]    = useState([]);
  var [loading,  setLoading]  = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var [e, s] = await Promise.all([fetchEmisoras(), fetchRadioSpots()]);
    setEmisoras(e);
    setSpots(s);
    setLoading(false);
  }, []);

  useEffect(function() { refresh(); }, []);

  return { emisoras: emisoras, spots: spots, loading: loading, refresh: refresh, setEmisoras: setEmisoras };
}

// ============================================================
// ██████  LEADS (Seller CRM)
// ============================================================

export async function fetchLeads(filtros) {
  filtros = filtros || {};
  var q = supabase
    .from("leads")
    .select("*, lead_notas(*), lead_destinos(*, destinos(label)), usuarios!leads_vendedor_id_fkey(nombre, rol)")
    .order("created_at", { ascending: false });

  if (filtros.vendedor_id)   q = q.eq("vendedor_id", filtros.vendedor_id);
  if (filtros.status)        q = q.eq("status", filtros.status);
  if (filtros.emisora)       q = q.eq("emisora", filtros.emisora);
  if (filtros.desde)         q = q.gte("fecha", filtros.desde);
  if (filtros.hasta)         q = q.lte("fecha", filtros.hasta);

  var { data, error } = await q;
  return error ? handleError("fetchLeads", error) : data;
}

export async function upsertLead(lead) {
  var destinos   = lead.destinos;   delete lead.destinos;
  var notas      = lead.notas;      delete lead.notas;

  var { data: saved, error } = await supabase.from("leads").upsert(lead).select().single();
  if (error) return handleError("upsertLead", error);

  // Sync destinos del lead
  if (destinos !== undefined) {
    await supabase.from("lead_destinos").delete().eq("lead_id", saved.id);
    if (destinos.length > 0) {
      await supabase.from("lead_destinos").insert(
        destinos.map(function(d) { return { lead_id: saved.id, destino_id: d.destId || d.destino_id, tipo: d.tipo, noches: d.noches, regalo_id: d.regalo ? d.regalo.id : null }; })
      );
    }
  }

  return saved;
}

export async function insertLeadNota(nota) {
  var { data, error } = await supabase.from("lead_notas").insert(nota).select().single();
  return error ? handleError("insertLeadNota", error) : data;
}

export async function updateLeadStatus(id, status, extras) {
  var payload = Object.assign({ status: status }, extras || {});
  var { data, error } = await supabase.from("leads").update(payload).eq("id", id).select().single();
  return error ? handleError("updateLeadStatus", error) : data;
}

export async function bulkReassignLeads(leadIds, vendedorId) {
  var { error } = await supabase.from("leads").update({ vendedor_id: vendedorId }).in("id", leadIds);
  return !error;
}

/** Hook para el módulo Seller CRM */
export function useLeads(vendedorId, rol) {
  var [leads,   setLeads]   = useState([]);
  var [loading, setLoading] = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var filtros = {};
    if (rol === "vendedor" && vendedorId) filtros.vendedor_id = vendedorId;
    var data = await fetchLeads(filtros);
    setLeads(data || []);
    setLoading(false);
  }, [vendedorId, rol]);

  useEffect(function() { refresh(); }, [refresh]);

  return { leads: leads, setLeads: setLeads, loading: loading, refresh: refresh };
}

// ============================================================
// ██████  CLIENTES / PAQUETES
// ============================================================

export async function fetchClientes(filtros) {
  filtros = filtros || {};
  var q = supabase
    .from("clientes")
    .select("*, cliente_destinos(*, destinos(label), regalos_opcionales(nombre)), pagos(*)")
    .order("created_at", { ascending: false });

  if (filtros.status_cliente) q = q.eq("status_cliente", filtros.status_cliente);
  if (filtros.vendedor_id)    q = q.eq("vendedor_id", filtros.vendedor_id);
  if (filtros.buscar) {
    q = q.or("nombre.ilike.%" + filtros.buscar + "%,folio.ilike.%" + filtros.buscar + "%,email.ilike.%" + filtros.buscar + "%");
  }

  var { data, error } = await q;
  return error ? handleError("fetchClientes", error) : data;
}

export async function fetchClientePorFolio(folio) {
  var { data, error } = await supabase
    .from("clientes")
    .select("*, cliente_destinos(*, destinos(label), regalos_opcionales(nombre)), pagos(*)")
    .eq("folio", folio)
    .single();
  return error ? null : data;
}

export async function upsertCliente(cliente) {
  var destinos = cliente.destinos; delete cliente.destinos;
  var pagos    = cliente.pagos;    delete cliente.pagos;

  var { data: saved, error } = await supabase.from("clientes").upsert(cliente).select().single();
  if (error) return handleError("upsertCliente", error);

  if (destinos !== undefined) {
    await supabase.from("cliente_destinos").delete().eq("cliente_id", saved.id);
    if (destinos.length > 0) {
      await supabase.from("cliente_destinos").insert(
        destinos.map(function(d, i) {
          return { cliente_id: saved.id, destino_id: d.destId || d.destino_id, tipo: d.tipo, noches: d.noches, regalo_id: d.regalo ? d.regalo.id : null, orden: i };
        })
      );
    }
  }

  return saved;
}

export async function insertPago(pago) {
  var { data, error } = await supabase.from("pagos").insert(pago).select().single();
  return error ? handleError("insertPago", error) : data;
}

/** Hook para Packages Module y CS */
export function useClientes(filtros) {
  var [clientes, setClientes] = useState([]);
  var [loading,  setLoading]  = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var data = await fetchClientes(filtros || {});
    setClientes(data || []);
    setLoading(false);
  }, [JSON.stringify(filtros)]);

  useEffect(function() { refresh(); }, [refresh]);

  return { clientes: clientes, setClientes: setClientes, loading: loading, refresh: refresh };
}

// ============================================================
// ██████  VERIFICACIÓN
// ============================================================

export async function fetchLeadsParaVerificacion() {
  var { data, error } = await supabase
    .from("leads")
    .select("*, lead_destinos(*, destinos(label)), usuarios!leads_vendedor_id_fkey(nombre)")
    .in("status", ["verificacion", "venta"])
    .is("cliente_id", null)
    .order("updated_at", { ascending: false });
  return error ? handleError("fetchLeadsParaVerificacion", error) : data;
}

export async function verificarLead(leadId, expediente) {
  // 1. Crear cliente desde el expediente
  var cliente = await upsertCliente(expediente);
  if (!cliente) return null;

  // 2. Linkear el lead al cliente y marcar como venta
  await supabase.from("leads").update({ status: "venta", cliente_id: cliente.id }).eq("id", leadId);

  return cliente;
}

/** Hook para el módulo Verificación */
export function useVerificacion() {
  var [leads,   setLeads]   = useState([]);
  var [loading, setLoading] = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var data = await fetchLeadsParaVerificacion();
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(function() { refresh(); }, []);

  return { leads: leads, setLeads: setLeads, loading: loading, refresh: refresh };
}

// ============================================================
// ██████  RESERVACIONES
// ============================================================

export async function fetchReservaciones(filtros) {
  filtros = filtros || {};
  var q = supabase
    .from("reservaciones")
    .select("*, clientes(nombre, folio, whatsapp), destinos(label), hoteles(nombre), usuarios!reservaciones_agente_id_fkey(nombre), reservacion_historial(*)")
    .order("created_at", { ascending: false });

  if (filtros.status)    q = q.eq("status", filtros.status);
  if (filtros.agente_id) q = q.eq("agente_id", filtros.agente_id);
  if (filtros.checkin_desde) q = q.gte("checkin", filtros.checkin_desde);
  if (filtros.checkin_hasta) q = q.lte("checkin", filtros.checkin_hasta);

  var { data, error } = await q;
  return error ? handleError("fetchReservaciones", error) : data;
}

export async function upsertReservacion(res) {
  var historial = res.historial; delete res.historial;
  var { data: saved, error } = await supabase.from("reservaciones").upsert(res).select().single();
  if (error) return handleError("upsertReservacion", error);
  return saved;
}

export async function actualizarStatusReservacion(id, status, datos) {
  datos = datos || {};
  var payload = Object.assign({ status: status }, datos);
  var { data: saved, error } = await supabase.from("reservaciones").update(payload).eq("id", id).select().single();
  if (error) return handleError("actualizarStatusReservacion", error);

  // Registrar en historial
  await supabase.from("reservacion_historial").insert({ reservacion_id: id, status_nuevo: status, nota: datos.nota || null });
  return saved;
}

/** Hook para Reservaciones */
export function useReservaciones(filtros) {
  var [reservaciones, setReservaciones] = useState([]);
  var [loading,       setLoading]       = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var data = await fetchReservaciones(filtros || {});
    setReservaciones(data || []);
    setLoading(false);
  }, [JSON.stringify(filtros)]);

  useEffect(function() { refresh(); }, [refresh]);

  return { reservaciones: reservaciones, setReservaciones: setReservaciones, loading: loading, refresh: refresh };
}

// ============================================================
// ██████  CS — Interacciones, Casos, Retenciones
// ============================================================

export async function fetchInteracciones(clienteId) {
  var { data } = await supabase
    .from("interacciones")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function insertInteraccion(inter) {
  var { data, error } = await supabase.from("interacciones").insert(inter).select().single();
  return error ? handleError("insertInteraccion", error) : data;
}

export async function fetchCasos(filtros) {
  filtros = filtros || {};
  var q = supabase.from("casos").select("*, clientes(nombre, folio), usuarios(nombre)").order("created_at", { ascending: false });
  if (filtros.cliente_id)  q = q.eq("cliente_id", filtros.cliente_id);
  if (filtros.status)      q = q.eq("status", filtros.status);
  if (filtros.asignado_id) q = q.eq("asignado_id", filtros.asignado_id);
  var { data } = await q;
  return data || [];
}

export async function upsertCaso(caso) {
  var { data, error } = await supabase.from("casos").upsert(caso).select().single();
  return error ? handleError("upsertCaso", error) : data;
}

export async function fetchRetenciones(filtros) {
  filtros = filtros || {};
  var q = supabase.from("retenciones").select("*, clientes(nombre, folio, status_cliente), usuarios!retenciones_agente_id_fkey(nombre)").order("created_at", { ascending: false });
  if (filtros.status)     q = q.eq("status", filtros.status);
  if (filtros.tipo)       q = q.eq("tipo", filtros.tipo);
  var { data } = await q;
  return data || [];
}

export async function upsertRetencion(ret) {
  var { data, error } = await supabase.from("retenciones").upsert(ret).select().single();
  return error ? handleError("upsertRetencion", error) : data;
}

/** Hook unificado para CS */
export function useCS() {
  var [clientes,       setClientes]       = useState([]);
  var [casos,          setCasos]          = useState([]);
  var [retenciones,    setRetenciones]    = useState([]);
  var [interacciones,  setInteracciones]  = useState([]);
  var [loading,        setLoading]        = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var results = await Promise.all([
      fetchClientes({}),
      fetchCasos({}),
      fetchRetenciones({})
    ]);
    setClientes(results[0] || []);
    setCasos(results[1] || []);
    setRetenciones(results[2] || []);
    setLoading(false);
  }, []);

  useEffect(function() { refresh(); }, []);

  var loadInteracciones = useCallback(async function(clienteId) {
    var data = await fetchInteracciones(clienteId);
    setInteracciones(data);
  }, []);

  return {
    clientes: clientes,             setClientes: setClientes,
    casos: casos,                   setCasos: setCasos,
    retenciones: retenciones,       setRetenciones: setRetenciones,
    interacciones: interacciones,
    loadInteracciones: loadInteracciones,
    loading: loading,
    refresh: refresh
  };
}

// ============================================================
// ██████  COMISIONES
// ============================================================

export async function fetchComisiones(filtros) {
  filtros = filtros || {};
  var q = supabase
    .from("comisiones")
    .select("*, usuarios!comisiones_vendedor_id_fkey(nombre)")
    .order("fecha_venta", { ascending: false });
  if (filtros.vendedor_id) q = q.eq("vendedor_id", filtros.vendedor_id);
  if (filtros.desde)       q = q.gte("fecha_venta", filtros.desde);
  if (filtros.hasta)       q = q.lte("fecha_venta", filtros.hasta);
  var { data } = await q;
  return data || [];
}

export async function upsertComision(com) {
  // Calcular monto automáticamente si falta
  if (!com.comision_monto && com.sale_price && com.comision_pct) {
    com.comision_monto = (com.sale_price * com.comision_pct / 100);
  }
  var { data, error } = await supabase.from("comisiones").upsert(com).select().single();
  return error ? handleError("upsertComision", error) : data;
}

export async function fetchMetas(vendedorId) {
  var q = supabase.from("metas").select("*").order("fecha_inicio", { ascending: false });
  if (vendedorId) q = q.eq("vendedor_id", vendedorId);
  var { data } = await q;
  return data || [];
}

export async function upsertMeta(meta) {
  var { data, error } = await supabase.from("metas").upsert(meta).select().single();
  return error ? handleError("upsertMeta", error) : data;
}

/** Hook para Commissions Module */
export function useComisiones(vendedorId, rol) {
  var [comisiones, setComisiones] = useState([]);
  var [metas,      setMetas]      = useState([]);
  var [usuarios,   setUsuarios]   = useState([]);
  var [loading,    setLoading]    = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var filtros = {};
    if (rol === "vendedor" && vendedorId) filtros.vendedor_id = vendedorId;
    var results = await Promise.all([fetchComisiones(filtros), fetchMetas(vendedorId), fetchUsuarios()]);
    setComisiones(results[0] || []);
    setMetas(results[1] || []);
    setUsuarios(results[2] || []);
    setLoading(false);
  }, [vendedorId, rol]);

  useEffect(function() { refresh(); }, [refresh]);

  return { comisiones: comisiones, metas: metas, usuarios: usuarios, loading: loading, refresh: refresh };
}

// ============================================================
// ██████  AUTOMATIZACIONES
// ============================================================

export async function fetchAutomatizaciones() {
  var { data } = await supabase.from("automatizaciones").select("*").order("nombre");
  return data || [];
}

export async function upsertAutomatizacion(auto) {
  var { data, error } = await supabase.from("automatizaciones").upsert(auto).select().single();
  return error ? handleError("upsertAutomatizacion", error) : data;
}

export async function deleteAutomatizacion(id) {
  var { error } = await supabase.from("automatizaciones").delete().eq("id", id);
  return !error;
}

export async function fetchAutomatizacionLog(filtros) {
  filtros = filtros || {};
  var q = supabase
    .from("automatizacion_log")
    .select("*, automatizaciones(nombre), clientes(nombre, folio)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtros.automatizacion_id) q = q.eq("automatizacion_id", filtros.automatizacion_id);
  var { data } = await q;
  return data || [];
}

export async function insertAutomatizacionLog(entry) {
  var { data, error } = await supabase.from("automatizacion_log").insert(entry).select().single();
  return error ? handleError("insertAutomatizacionLog", error) : data;
}

/** Hook para Automations Module */
export function useAutomatizaciones() {
  var [automatizaciones, setAutomatizaciones] = useState([]);
  var [logEntries,       setLogEntries]       = useState([]);
  var [loading,          setLoading]          = useState(true);

  var refresh = useCallback(async function() {
    setLoading(true);
    var results = await Promise.all([fetchAutomatizaciones(), fetchAutomatizacionLog()]);
    setAutomatizaciones(results[0] || []);
    setLogEntries(results[1] || []);
    setLoading(false);
  }, []);

  useEffect(function() { refresh(); }, []);

  return {
    automatizaciones: automatizaciones, setAutomatizaciones: setAutomatizaciones,
    logEntries: logEntries,
    loading: loading, refresh: refresh
  };
}

// ============================================================
// ██████  EXECUTIVE DASHBOARD
// ============================================================

export async function fetchKPIs(desde, hasta) {
  var [ventas, leads, reservas, retenciones] = await Promise.all([
    supabase.from("comisiones").select("sale_price, cancelada").gte("fecha_venta", desde).lte("fecha_venta", hasta),
    supabase.from("leads").select("status, created_at").gte("fecha", desde).lte("fecha", hasta),
    supabase.from("reservaciones").select("status, total").gte("created_at", desde),
    supabase.from("retenciones").select("tipo, status").gte("created_at", desde)
  ]);

  var ventasData = ventas.data || [];
  var leadsData  = leads.data || [];

  return {
    total_ventas:    ventasData.filter(function(v){return !v.cancelada;}).reduce(function(s,v){return s+Number(v.sale_price||0);}, 0),
    num_ventas:      ventasData.filter(function(v){return !v.cancelada;}).length,
    num_leads:       leadsData.length,
    tasa_cierre:     leadsData.length > 0 ? leadsData.filter(function(l){return l.status==="venta";}).length / leadsData.length : 0,
    reservas_activas: (reservas.data||[]).filter(function(r){return ["solicitada","en_proceso","confirmada"].includes(r.status);}).length,
    retenciones_pendientes: (retenciones.data||[]).filter(function(r){return r.status==="pendiente";}).length,
  };
}

// ============================================================
// ██████  REALTIME — Suscripciones en tiempo real
// ============================================================

/**
 * Suscribe a cambios en leads en tiempo real.
 * Útil en el Seller CRM para actualizar la lista automáticamente.
 * Retorna la función para cancelar la suscripción.
 */
export function subscribeLeads(callback) {
  var channel = supabase.channel("leads-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, function(payload) {
      callback(payload);
    })
    .subscribe();

  return function() { supabase.removeChannel(channel); };
}

export function subscribeReservaciones(callback) {
  var channel = supabase.channel("reservaciones-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "reservaciones" }, function(payload) {
      callback(payload);
    })
    .subscribe();

  return function() { supabase.removeChannel(channel); };
}

export function subscribeCasos(callback) {
  var channel = supabase.channel("casos-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "casos" }, function(payload) {
      callback(payload);
    })
    .subscribe();

  return function() { supabase.removeChannel(channel); };
}

// ============================================================
// ██████  BÚSQUEDA GLOBAL
// ============================================================

export async function buscarGlobal(query) {
  if (!query || query.length < 2) return { clientes: [], leads: [] };

  var [clientes, leads] = await Promise.all([
    supabase.from("clientes").select("id, folio, nombre, tel, email, status_cliente")
      .or("nombre.ilike.%" + query + "%,folio.ilike.%" + query + "%,email.ilike.%" + query + "%,tel.ilike.%" + query + "%")
      .limit(8),
    supabase.from("leads").select("id, folio, nombre, tel, status")
      .or("nombre.ilike.%" + query + "%,folio.ilike.%" + query + "%,tel.ilike.%" + query + "%")
      .limit(8)
  ]);

  return {
    clientes: clientes.data || [],
    leads:    leads.data    || []
  };
}
