import { useState, useEffect } from "react";

var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
var SB_URL  = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var EDGE    = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/zoho-payments";
var ZOHO_ACCOUNT_ID = "874101637";
var ZOHO_API_KEY    = "1003.afb484f19b10b5674c7e6f7c0c0ee5f5.89f010a430837bed480829a015a88641";

export default function CapturaTarjeta() {
  var params = new URLSearchParams(window.location.search);
  var leadId = params.get("lead");
  var token  = params.get("token");

  var [lead,    setLead]    = useState(null);
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState(null);
  var [step,    setStep]    = useState("validando"); // validando | listo | capturando | exito | invalido
  var [zohoReady, setZohoReady] = useState(false);

  useEffect(function() {
    if (!leadId || !token) { setStep("invalido"); setLoading(false); return; }
    fetch(SB_URL + "/rest/v1/leads?id=eq." + leadId + "&captura_token=eq." + token + "&select=id,nombre,apellido,email,salePrice,pagoInicial", {
      headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (!data || !data[0]) { setStep("invalido"); setLoading(false); return; }
      setLead(data[0]);
      setStep("listo");
      setLoading(false);
    })
    .catch(function(){ setStep("invalido"); setLoading(false); });
  }, []);

  useEffect(function() {
    if (window.ZPayments) { setZohoReady(true); return; }
    var s = document.createElement("script");
    s.src = "https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js";
    s.onload = function(){ setZohoReady(true); };
    document.head.appendChild(s);
  }, []);

  function capturar() {
    if (!zohoReady || !window.ZPayments || !lead) return;
    setStep("capturando"); setError(null);
    fetch(EDGE + "/create-customer-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ANON_KEY },
      body: JSON.stringify({ nombre: (lead.nombre||"") + " " + (lead.apellido||""), email: lead.email||"", phone: "" })
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);
      var customerId = data.customer_id;
      var sessionId  = data.payment_method_session_id;
      var instance   = new window.ZPayments({ account_id: ZOHO_ACCOUNT_ID, domain: "US", otherOptions: { api_key: ZOHO_API_KEY } });
      return instance.requestPaymentMethod({ payment_method: "card", transaction_type: "add", customer_id: customerId, payment_method_session_id: sessionId })
        .then(function(result) {
          instance.close();
          var pmId  = result.payment_method_id || result.paymentMethodId || "";
          var last4 = result.card ? result.card.last_four_digits || "" : "";
          var brand = result.card ? result.card.brand || "" : "";
          return fetch(SB_URL + "/rest/v1/leads?id=eq." + leadId, {
            method: "PATCH",
            headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ zohoPaymentMethodId: pmId, zohoCustomerId: customerId, tarjetaLast4: last4, tarjetaBrand: brand, tarjetaCapturaTs: new Date().toISOString(), captura_token: null })
          });
        });
    })
    .then(function(){ setStep("exito"); })
    .catch(function(e){ setError(String(e)); setStep("listo"); });
  }

  var N = lead ? (lead.nombre||"") + " " + (lead.apellido||"") : "";

  return (
    <div style={{minHeight:"100vh",background:"#f0f2f5",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",fontFamily:"'Poppins','Segoe UI',sans-serif"}}>
      <div style={{width:"100%",maxWidth:"420px"}}>
        <div style={{background:"#1a385a",padding:"20px 24px",borderRadius:"12px 12px 0 0",textAlign:"center"}}>
          <div style={{fontSize:"20px",fontWeight:"700",color:"#fff"}}>TRAVEL<span style={{color:"#8aacca"}}>X</span><span style={{fontWeight:"300"}}> GROUP</span></div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",marginTop:"2px"}}>Registro de método de pago</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"0 0 12px 12px",padding:"24px"}}>
          {loading && <div style={{textAlign:"center",color:"#6b7280",padding:"20px"}}>Verificando enlace...</div>}
          {step === "invalido" && (
            <div style={{textAlign:"center",padding:"20px"}}>
              <div style={{fontSize:"32px",marginBottom:"12px"}}>⚠️</div>
              <div style={{fontSize:"14px",fontWeight:"600",color:"#991b1b",marginBottom:"6px"}}>Enlace inválido o expirado</div>
              <div style={{fontSize:"12px",color:"#6b7280"}}>Por favor contacte a su asesor para obtener un nuevo enlace.</div>
            </div>
          )}
          {(step === "listo" || step === "capturando") && lead && (
            <div>
              <div style={{marginBottom:"20px"}}>
                <div style={{fontSize:"11px",color:"#6b7280",marginBottom:"4px"}}>Estimado/a</div>
                <div style={{fontSize:"16px",fontWeight:"700",color:"#1a385a"}}>{N.trim()}</div>
                <div style={{fontSize:"12px",color:"#6b7280",marginTop:"6px",lineHeight:"1.6"}}>
                  Le solicitamos registrar su método de pago de forma segura. Sus datos son procesados por <strong>Zoho Payments</strong> y nunca son almacenados en nuestros servidores.
                </div>
              </div>
              {error && <div style={{fontSize:"12px",color:"#991b1b",padding:"8px 12px",background:"#fef2f2",borderRadius:"8px",border:"1px solid #fecaca",marginBottom:"12px"}}>{error}</div>}
              <button
                onClick={capturar}
                disabled={step==="capturando" || !zohoReady}
                style={{width:"100%",padding:"12px",borderRadius:"8px",background:step==="capturando"?"#6b7280":"#1a385a",color:"#fff",border:"none",fontSize:"14px",fontWeight:"600",cursor:step==="capturando"?"not-allowed":"pointer"}}>
                {step === "capturando" ? "Procesando..." : "Registrar tarjeta de forma segura 🔒"}
              </button>
              <div style={{fontSize:"10px",color:"#9ca3af",textAlign:"center",marginTop:"10px"}}>🔒 Conexión segura · Powered by Zoho Payments</div>
            </div>
          )}
          {step === "exito" && (
            <div style={{textAlign:"center",padding:"20px"}}>
              <div style={{fontSize:"48px",marginBottom:"12px"}}>✅</div>
              <div style={{fontSize:"16px",fontWeight:"700",color:"#065f46",marginBottom:"6px"}}>¡Tarjeta registrada exitosamente!</div>
              <div style={{fontSize:"12px",color:"#6b7280",lineHeight:"1.6"}}>Su método de pago ha sido guardado de forma segura. Nuestro equipo se pondrá en contacto con usted pronto.</div>
              <div style={{marginTop:"16px",fontSize:"12px",color:"#1a385a",fontWeight:"600"}}>X Travel Group · 1 (800) 927-1490</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
