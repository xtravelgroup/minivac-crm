import { useState, useEffect, useRef, useCallback } from "react";

var BRAND_DARK = "#1a385a";
var BRAND_MID  = "#47718a";
var GREEN  = "#22c55e";
var AMBER  = "#f59e0b";
var RED    = "#ef4444";

var GKEY = "AIzaSyDybVxw5BcM_zge6jq3IZ4IPies1uZWV88";

// Mapeo de tipos Google Places a amenidades del CRM
var AMENITY_MAP = {
  "pool":               "Piscina",
  "spa":                "Spa",
  "gym":                "Gimnasio",
  "fitness_center":     "Gimnasio",
  "bar":                "Bar",
  "restaurant":         "Restaurante principal",
  "parking":            "Estacionamiento",
  "wifi":               "Wi-Fi incluido",
  "beach_access":       "Playa privada",
  "golf_course":        "Golf",
  "casino":             "Casino",
  "kids_club":          "Kids club",
  "tennis_court":       "Tenis",
  "room_service":       "Room service 24h",
  "concierge":          "Concierge",
  "laundry":            "Lavanderia",
  "business_center":    "Wi-Fi alta velocidad",
  "airport_shuttle":    "Transfer incluido",
};

// Mapeo de rating a categoria
function ratingToCategoria(rating, priceLevel) {
  if (priceLevel >= 4 || rating >= 4.8) return "Gran Lujo";
  if (priceLevel >= 3 || rating >= 4.5) return "5 estrellas";
  if (priceLevel >= 2 || rating >= 4.0) return "4 estrellas";
  if (rating >= 3.5) return "3 estrellas";
  return "3 estrellas";
}

function uid() { return "HG" + Date.now() + Math.floor(Math.random() * 9999); }

//     Loader del script de Google                                              

function useGoogleMaps() {
  var [ready, setReady] = useState(false);
  var [error, setError] = useState(null);

  useEffect(function () {
    if (window.google && window.google.maps && window.google.maps.places) {
      setReady(true);
      return;
    }
    if (document.getElementById("gmaps-script")) {
      var check = setInterval(function () {
        if (window.google && window.google.maps && window.google.maps.places) {
          setReady(true);
          clearInterval(check);
        }
      }, 200);
      return function () { clearInterval(check); };
    }
    var script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + GKEY + "&libraries=places&language=es";
    script.async = true;
    script.defer = true;
    script.onload = function () { setReady(true); };
    script.onerror = function () { setError("No se pudo cargar Google Maps. Verifica la API key."); };
    document.head.appendChild(script);
  }, []);

  return { ready: ready, error: error };
}

//     Estilos helpers                                                           

var S = {
  inp: {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1px solid #e2e8f0", fontSize: "14px", color: "#1a1f2e",
    background: "#fff", outline: "none", boxSizing: "border-box",
    fontFamily: "'Poppins','DM Sans','Segoe UI',sans-serif",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  lbl: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "5px", display: "block" },
  card: {
    background: "#fff", borderRadius: "14px",
    border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
};

function Btn(props) {
  var v = props.v || "primary"; var sm = props.sm;
  var styles = {
    primary: { background: "linear-gradient(135deg," + BRAND_DARK + "," + BRAND_MID + ")", color: "#fff", border: "none" },
    ghost:   { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
    danger:  { background: "#fef2f2", color: RED, border: "1px solid #fecaca" },
    success: { background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", border: "none" },
  };
  var st = styles[v] || styles.primary;
  return (
    <button onClick={props.onClick} disabled={props.disabled}
      style={Object.assign({}, st, {
        padding: sm ? "5px 12px" : "9px 18px", borderRadius: "9px", cursor: props.disabled ? "not-allowed" : "pointer",
        fontSize: sm ? "11px" : "13px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px",
        opacity: props.disabled ? 0.5 : 1, whiteSpace: "nowrap",
        fontFamily: "'Poppins','DM Sans','Segoe UI',sans-serif",
      })}>
      {props.children}
    </button>
  );
}

//     Autocompletado                                                            

function PlacesAutocomplete(props) {
  var inputRef = useRef(null);
  var acRef = useRef(null);
  var [query, setQuery] = useState("");
  var [suggestions, setSuggestions] = useState([]);
  var [loading, setLoading] = useState(false);
  var [open, setOpen] = useState(false);
  var debounceRef = useRef(null);

  useEffect(function () {
    if (!props.ready || !window.google) return;
    var service = new window.google.maps.places.AutocompleteService();
    acRef.current = service;
  }, [props.ready]);

  function handleInput(e) {
    var val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(function () {
      if (!acRef.current) return;
      acRef.current.getPlacePredictions(
        { input: val + " hotel", types: ["lodging"], language: "es" },
        function (results, status) {
          setLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setSuggestions(results);
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 350);
  }

  function selectSuggestion(suggestion) {
    setQuery(suggestion.description);
    setSuggestions([]);
    setOpen(false);
    props.onSelect(suggestion.place_id, suggestion.description);
  }

  return (
    <div style={{ position: "relative" }}>
      <label style={S.lbl}>Buscar hotel</label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          style={Object.assign({}, S.inp, { paddingLeft: "42px", fontSize: "14px" })}
          value={query}
          onChange={handleInput}
          onFocus={function () { setOpen(true); }}
          onBlur={function () { setTimeout(function () { setOpen(false); }, 200); }}
          placeholder="Ej: Grand Oasis Palm Cancun..."
          autoComplete="off"
          disabled={!props.ready}
        />
        <div style={{
          position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
          fontSize: "18px", pointerEvents: "none",
        }}>
          {loading ? (
            <div style={{
              width: "16px", height: "16px", border: "2px solid #e2e8f0",
              borderTopColor: BRAND_MID, borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }} />
          ) : " "}
        </div>
        {query && (
          <button onClick={function () { setQuery(""); setSuggestions([]); props.onClear && props.onClear(); }}
            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px" }}>
            x
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 500,
          background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden",
        }}>
          {suggestions.map(function (s) {
            var main = s.structured_formatting ? s.structured_formatting.main_text : s.description;
            var secondary = s.structured_formatting ? s.structured_formatting.secondary_text : "";
            return (
              <div key={s.place_id}
                onMouseDown={function () { selectSuggestion(s); }}
                style={{
                  padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f8fafc",
                  transition: "background 0.1s",
                }}
                onMouseEnter={function (e) { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = "#fff"; }}
              >
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a1f2e" }}>{main}</div>
                {secondary && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{secondary}</div>}
              </div>
            );
          })}
          <div style={{ padding: "6px 14px", background: "#f8fafc", display: "flex", alignItems: "center", gap: "4px" }}>
            <img src={"https://developers.google.com/static/maps/documentation/images/google_on_white.png"}
              alt="Google" style={{ height: "14px", opacity: 0.5 }} />
          </div>
        </div>
      )}
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}

//     Galeria de fotos                                                          

function PhotoGallery(props) {
  var photos = props.photos || [];
  var [active, setActive] = useState(0);
  if (photos.length === 0) return (
    <div style={{
      height: "220px", borderRadius: "12px", background: "#f1f5f9",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "2px dashed #e2e8f0", color: "#94a3b8", fontSize: "13px",
    }}>
      Sin fotos disponibles
    </div>
  );
  return (
    <div>
      <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", marginBottom: "8px" }}>
        <img src={photos[active]} alt={"Foto " + (active + 1)}
          style={{ width: "100%", height: "240px", objectFit: "cover", display: "block" }} />
        <div style={{
          position: "absolute", bottom: "8px", right: "8px",
          background: "rgba(0,0,0,0.5)", borderRadius: "6px", padding: "3px 8px",
          fontSize: "11px", color: "#fff",
        }}>
          {(active + 1) + " / " + photos.length}
        </div>
        {active > 0 && (
          <button onClick={function () { setActive(active - 1); }}
            style={{
              position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
              width: "32px", height: "32px", color: "#fff", cursor: "pointer", fontSize: "16px",
            }}>{"<"}</button>
        )}
        {active < photos.length - 1 && (
          <button onClick={function () { setActive(active + 1); }}
            style={{
              position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
              width: "32px", height: "32px", color: "#fff", cursor: "pointer", fontSize: "16px",
            }}>{">"}</button>
        )}
      </div>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
        {photos.map(function (p, i) {
          return (
            <img key={i} src={p} alt={"Thumb " + i}
              onClick={function () { setActive(i); }}
              style={{
                width: "60px", height: "45px", objectFit: "cover", borderRadius: "6px",
                cursor: "pointer", flexShrink: 0,
                border: active === i ? ("2px solid " + BRAND_MID) : "2px solid transparent",
                opacity: active === i ? 1 : 0.7, transition: "all 0.15s",
              }} />
          );
        })}
      </div>
    </div>
  );
}

//     Vista previa del hotel importado                                         

function HotelPreview(props) {
  var d = props.data;
  var [plan, setPlan] = useState("Todo Incluido");
  var [categoria, setCategoria] = useState(d.categoria || "4 estrellas");
  var [destino, setDestino] = useState(d.destino || "");
  var [amenidadesExtra, setAmenidadesExtra] = useState([]);
  var [amenidadesRemove, setAmenidadesRemove] = useState([]);

  var PLANES = ["Todo Incluido", "Todo Incluido Premium", "Solo Habitacion", "Desayuno incluido", "Media pension"];
  var CATS = ["3 estrellas", "4 estrellas", "5 estrellas", "Boutique", "Gran Lujo"];

  var amenidadesFinales = d.amenidades
    .filter(function (a) { return amenidadesRemove.indexOf(a) === -1; })
    .concat(amenidadesExtra);

  function toggleAmenidad(a) {
    if (amenidadesRemove.indexOf(a) > -1) {
      setAmenidadesRemove(amenidadesRemove.filter(function (x) { return x !== a; }));
    } else {
      setAmenidadesRemove(amenidadesRemove.concat([a]));
    }
  }

  function handleImport() {
    var hotelFinal = Object.assign({}, d, {
      plan: plan,
      categoria: categoria,
      destino: destino,
      amenidades: amenidadesFinales,
    });
    props.onImport(hotelFinal);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Fotos */}
      <PhotoGallery photos={d.fotos} />

      {/* Info principal */}
      <div style={Object.assign({}, S.card, { padding: "16px" })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: BRAND_DARK }}>{d.nombre}</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{d.direccion}</div>
          </div>
          {d.rating > 0 && (
            <div style={{
              background: AMBER + "18", border: "1px solid " + AMBER + "44",
              borderRadius: "8px", padding: "6px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: AMBER }}>{d.rating}</div>
              <div style={{ fontSize: "10px", color: "#92400e" }}>{"(" + d.totalRatings + " resenas)"}</div>
            </div>
          )}
        </div>
        {d.telefono && (
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            {"Tel: " + d.telefono}
          </div>
        )}
        {d.website && (
          <a href={d.website} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "12px", color: BRAND_MID, textDecoration: "none" }}>
            {d.website.length > 50 ? d.website.substring(0, 50) + "..." : d.website}
          </a>
        )}
      </div>

      {/* Configuracion CRM */}
      <div style={Object.assign({}, S.card, { padding: "16px" })}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: BRAND_DARK, marginBottom: "12px" }}>
          Configuracion para el CRM
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div>
            <label style={S.lbl}>Destino</label>
            <input style={S.inp} value={destino}
              onChange={function (e) { setDestino(e.target.value); }}
              placeholder="Ej: Cancun" />
          </div>
          <div>
            <label style={S.lbl}>Plan</label>
            <select style={Object.assign({}, S.inp, { cursor: "pointer" })} value={plan}
              onChange={function (e) { setPlan(e.target.value); }}>
              {PLANES.map(function (p) { return <option key={p}>{p}</option>; })}
            </select>
          </div>
          <div>
            <label style={S.lbl}>Categoria</label>
            <select style={Object.assign({}, S.inp, { cursor: "pointer" })} value={categoria}
              onChange={function (e) { setCategoria(e.target.value); }}>
              {CATS.map(function (c) { return <option key={c}>{c}</option>; })}
            </select>
          </div>
        </div>
      </div>

      {/* Amenidades detectadas */}
      <div style={Object.assign({}, S.card, { padding: "16px" })}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: BRAND_DARK, marginBottom: "4px" }}>
          Amenidades detectadas
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px" }}>
          Haz clic para activar o desactivar. Puedes agregar mas despues.
        </div>
        {d.amenidades.length === 0 && (
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>No se detectaron amenidades automaticamente.</div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {d.amenidades.map(function (a) {
            var off = amenidadesRemove.indexOf(a) > -1;
            return (
              <div key={a} onClick={function () { toggleAmenidad(a); }}
                style={{
                  padding: "4px 11px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "600",
                  background: off ? "#f8fafc" : (BRAND_MID + "15"),
                  color: off ? "#cbd5e1" : BRAND_MID,
                  border: "1px solid " + (off ? "#e2e8f0" : (BRAND_MID + "40")),
                  textDecoration: off ? "line-through" : "none",
                  transition: "all 0.12s",
                }}>
                {a}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tipos de habitacion de Google */}
      {d.tiposHabitacion && d.tiposHabitacion.length > 0 && (
        <div style={Object.assign({}, S.card, { padding: "16px" })}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: BRAND_DARK, marginBottom: "10px" }}>
            Tipos de habitacion detectados
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {d.tiposHabitacion.map(function (t, i) {
              return (
                <div key={i} style={{
                  padding: "10px 14px", background: "#f8fafc", borderRadius: "9px",
                  border: "1px solid #e2e8f0", fontSize: "13px", color: "#475569",
                }}>
                  {t}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>
            Estos tipos se importaran como habitaciones base. Podras editarlos despues.
          </div>
        </div>
      )}

      {/* Descripcion */}
      {d.descripcion && (
        <div style={Object.assign({}, S.card, { padding: "16px" })}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: BRAND_DARK, marginBottom: "6px" }}>
            Descripcion (Google)
          </div>
          <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>{d.descripcion}</div>
        </div>
      )}

      {/* Boton importar */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingBottom: "20px" }}>
        <Btn v="ghost" onClick={props.onCancel}>Cancelar</Btn>
        <Btn v="success" onClick={handleImport}>
          Importar hotel al CRM
        </Btn>
      </div>

    </div>
  );
}

//     Componente principal                                                      

export default function HotelSearch(props) {
  var { ready, error } = useGoogleMaps();
  var [step, setStep] = useState("search");
  var [loading, setLoading] = useState(false);
  var [loadingMsg, setLoadingMsg] = useState("");
  var [hotelData, setHotelData] = useState(null);
  var [apiError, setApiError] = useState(null);
  var serviceRef = useRef(null);
  var dummyRef = useRef(null);

  useEffect(function () {
    if (!ready || !window.google) return;
    var div = document.createElement("div");
    dummyRef.current = div;
    serviceRef.current = new window.google.maps.places.PlacesService(div);
  }, [ready]);

  function fetchPlaceDetails(placeId) {
    setLoading(true);
    setStep("loading");
    setApiError(null);
    setLoadingMsg("Obteniendo informacion del hotel...");

    var fields = [
      "place_id", "name", "formatted_address", "formatted_phone_number",
      "website", "rating", "user_ratings_total", "price_level",
      "photos", "types", "opening_hours", "editorial_summary",
      "geometry", "international_phone_number",
    ];

    serviceRef.current.getDetails({ placeId: placeId, fields: fields, language: "es" },
      function (place, status) {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) {
          setApiError("No se encontraron datos para este lugar. Intenta con otro hotel.");
          setStep("search");
          setLoading(false);
          return;
        }
        setLoadingMsg("Procesando fotos...");
        processPlaceData(place);
      }
    );
  }

  function processPlaceData(place) {
    // Fotos - hasta 8
    var fotos = [];
    if (place.photos && place.photos.length > 0) {
      var maxPhotos = Math.min(place.photos.length, 8);
      for (var i = 0; i < maxPhotos; i++) {
        try {
          fotos.push(place.photos[i].getUrl({ maxWidth: 900, maxHeight: 600 }));
        } catch (e) {}
      }
    }

    // Amenidades desde tipos de lugar
    var amenidades = [];
    var types = place.types || [];
    var typesStr = types.join(" ");
    if (typesStr.indexOf("lodging") > -1 || typesStr.indexOf("hotel") > -1) {
      // Amenidades inferidas por tipo de lugar y rating
      var rating = place.rating || 0;
      var priceLevel = place.price_level || 0;

      if (priceLevel >= 3 || rating >= 4.5) {
        amenidades = amenidades.concat(["Spa", "Gimnasio", "Concierge", "Room service 24h", "Wi-Fi incluido", "Restaurante principal", "Bar"]);
      } else if (priceLevel >= 2 || rating >= 4.0) {
        amenidades = amenidades.concat(["Gimnasio", "Wi-Fi incluido", "Restaurante principal", "Bar"]);
      } else {
        amenidades = amenidades.concat(["Wi-Fi incluido"]);
      }

      if (typesStr.indexOf("resort") > -1 || typesStr.indexOf("beach") > -1) {
        amenidades.push("Piscina");
        amenidades.push("Playa privada");
      }
      if (typesStr.indexOf("resort") > -1) {
        amenidades.push("Shows nocturnos");
        amenidades.push("Kids club");
      }
      if (typesStr.indexOf("spa") > -1) {
        if (amenidades.indexOf("Spa") === -1) amenidades.push("Spa");
      }
      if (typesStr.indexOf("golf") > -1) {
        amenidades.push("Golf");
      }
      if (typesStr.indexOf("casino") > -1) {
        amenidades.push("Casino");
      }
    }

    // Deduplicar amenidades
    var amenUniq = [];
    amenidades.forEach(function (a) {
      if (amenUniq.indexOf(a) === -1) amenUniq.push(a);
    });

    // Tipos de habitacion inferidos
    var tiposHabitacion = [];
    var priceL = place.price_level || 0;
    if (priceL >= 4) {
      tiposHabitacion = ["Suite Presidencial", "Junior Suite Deluxe", "Habitacion Superior Ocean View", "Habitacion Estandar"];
    } else if (priceL >= 3) {
      tiposHabitacion = ["Junior Suite", "Habitacion Superior", "Habitacion Estandar Garden View"];
    } else if (priceL >= 2) {
      tiposHabitacion = ["Habitacion Superior", "Habitacion Estandar"];
    } else {
      tiposHabitacion = ["Habitacion Estandar"];
    }

    // Direccion limpia
    var direccion = place.formatted_address || "";

    // Descripcion
    var descripcion = "";
    if (place.editorial_summary && place.editorial_summary.overview) {
      descripcion = place.editorial_summary.overview;
    }

    // Categoria
    var categoria = ratingToCategoria(place.rating || 0, place.price_level || 0);

    // Destino - extraer ciudad de la direccion
    var destino = "";
    if (direccion) {
      var parts = direccion.split(",");
      if (parts.length >= 2) {
        destino = parts[1].trim();
        // Limpiar numeros de CP
        destino = destino.replace(/\d+/g, "").trim();
      }
    }

    var data = {
      id:            uid(),
      placeId:       place.place_id,
      nombre:        place.name || "",
      direccion:     direccion,
      telefono:      place.formatted_phone_number || "",
      website:       place.website || "",
      rating:        place.rating || 0,
      totalRatings:  place.user_ratings_total || 0,
      priceLevel:    place.price_level || 0,
      fotos:         fotos,
      amenidades:    amenUniq,
      tiposHabitacion: tiposHabitacion,
      descripcion:   descripcion,
      categoria:     categoria,
      destino:       destino,
      // Campos CRM que se llenan despues
      plan:          "Todo Incluido",
      activo:        true,
      capacidad:     { maxAdultos: 2, permitirNinos: false, edadMinNino: 0, edadMaxNino: 12, maxNinos: 0 },
      restricciones: { edadMin: 25, edadMax: 65, estadoCivil: ["Casado", "Union libre"] },
      habitaciones:  tiposHabitacion.map(function (t) {
        return {
          id: uid(), nombre: t, tipoCama: "King", vistas: [], maxOcupantes: 2, m2: 0,
          amenidades: [], activo: true, descripcion: "",
        };
      }),
      tarifas:       { precioBase: 0, moneda: "USD", notasTA: "" },
      regalosHotel:  [],
      notas:         "Importado desde Google Places. Verifica y completa la informacion.",
    };

    setHotelData(data);
    setStep("preview");
    setLoading(false);
  }

  function handleImport(hotelFinal) {
    props.onImport && props.onImport(hotelFinal);
  }

  return (
    <div style={{
      fontFamily: "'Poppins','DM Sans','Segoe UI',sans-serif",
      background: "#f1f5f9", minHeight: "100%",
    }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg," + BRAND_DARK + "," + BRAND_MID + ")",
        padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button onClick={props.onClose}
          style={{
            background: "#e4e7eb", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px", color: "#fff", padding: "5px 13px", cursor: "pointer",
            fontSize: "12px", fontFamily: "inherit",
          }}>
          Volver
        </button>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#fff" }}>
            Importar hotel desde Google
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "1px" }}>
            Busca el hotel y se importaran datos, fotos y amenidades automaticamente
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: "760px", margin: "0 auto" }}>

        {/* Error de API */}
        {error && (
          <div style={{
            padding: "14px 16px", background: "#fef2f2", borderRadius: "10px",
            border: "1px solid #fecaca", color: RED, fontSize: "13px", marginBottom: "16px",
          }}>
            {error}
          </div>
        )}

        {/* Error de busqueda */}
        {apiError && (
          <div style={{
            padding: "14px 16px", background: "#fef2f2", borderRadius: "10px",
            border: "1px solid #fecaca", color: RED, fontSize: "13px", marginBottom: "16px",
          }}>
            {apiError}
          </div>
        )}

        {/* Paso: busqueda */}
        {step === "search" && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              {!ready && !error && (
                <div style={{
                  padding: "12px 16px", background: "#eff6ff", borderRadius: "10px",
                  border: "1px solid #bfdbfe", color: BRAND_MID, fontSize: "13px", marginBottom: "12px",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <div style={{
                    width: "14px", height: "14px", border: "2px solid #bfdbfe",
                    borderTopColor: BRAND_MID, borderRadius: "50%",
                    animation: "spin 0.7s linear infinite", flexShrink: 0,
                  }} />
                  Cargando Google Places...
                </div>
              )}
              <PlacesAutocomplete
                ready={ready}
                onSelect={function (placeId, desc) { fetchPlaceDetails(placeId); }}
                onClear={function () { setHotelData(null); setApiError(null); }}
              />
            </div>
            <div style={{
              padding: "14px 16px", background: "#fff", borderRadius: "12px",
              border: "1px solid #e2e8f0", fontSize: "12px", color: "#64748b", lineHeight: "1.7",
            }}>
              <div style={{ fontWeight: "700", color: BRAND_DARK, marginBottom: "6px" }}>
                Como funciona:
              </div>
              <div>1. Escribe el nombre del hotel y seleccionalo de la lista.</div>
              <div>2. Se importaran automaticamente: nombre, direccion, telefono, fotos, rating y amenidades.</div>
              <div>3. Revisa y ajusta la informacion antes de guardar en el CRM.</div>
              <div>4. Podras editar todos los detalles (habitaciones, restricciones, tarifas) despues.</div>
            </div>
          </div>
        )}

        {/* Paso: cargando */}
        {step === "loading" && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
          }}>
            <div style={{
              width: "48px", height: "48px", border: "4px solid #e2e8f0",
              borderTopColor: BRAND_MID, borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <div style={{ fontSize: "14px", fontWeight: "600", color: BRAND_DARK, marginBottom: "4px" }}>
              Obteniendo datos del hotel
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>{loadingMsg}</div>
          </div>
        )}

        {/* Paso: preview */}
        {step === "preview" && hotelData && (
          <HotelPreview
            data={hotelData}
            onImport={handleImport}
            onCancel={function () { setStep("search"); setHotelData(null); }}
          />
        )}

      </div>

      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
