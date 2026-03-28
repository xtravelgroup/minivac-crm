import { useState, useEffect, useRef, useCallback } from "react";
import { Device } from "@twilio/voice-sdk";

var EDGE_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/twilio-token";
var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";

export default function useTwilioDevice(userId, enabled) {
  var [device, setDevice] = useState(null);
  var [incomingCall, setIncomingCall] = useState(null);
  var [activeCall, setActiveCall] = useState(null);
  var [isRegistered, setIsRegistered] = useState(false);
  var [callDuration, setCallDuration] = useState(0);
  var timerRef = useRef(null);
  var deviceRef = useRef(null);
  var heartbeatRef = useRef(null);

  // Fetch token and initialize device
  useEffect(function () {
    if (!enabled || !userId) {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
        setDevice(null);
        setIsRegistered(false);
      }
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    var cancelled = false;

    function init() {
      fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: userId }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (cancelled || !data.token) return;

          var dev = new Device(data.token, {
            codecPreferences: ["opus", "pcmu"],
            logLevel: "warn",
          });

          dev.on("registered", function () {
            if (!cancelled) setIsRegistered(true);
          });

          dev.on("unregistered", function () {
            if (!cancelled) setIsRegistered(false);
          });

          dev.on("error", function (err) {
            console.error("Twilio Device error:", err);
          });

          dev.on("incoming", function (call) {
            if (cancelled) return;
            setIncomingCall(call);

            call.on("accept", function () {
              setActiveCall(call);
              setIncomingCall(null);
              setCallDuration(0);
            });

            call.on("disconnect", function () {
              setActiveCall(null);
              setIncomingCall(null);
              setCallDuration(0);
              if (timerRef.current) clearInterval(timerRef.current);
            });

            call.on("cancel", function () {
              setIncomingCall(null);
            });

            call.on("reject", function () {
              setIncomingCall(null);
            });
          });

          dev.on("tokenWillExpire", function () {
            // Refresh token
            fetch(EDGE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usuario_id: userId }),
            })
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (d.token) dev.updateToken(d.token);
              });
          });

          dev.register();
          deviceRef.current = dev;
          if (!cancelled) setDevice(dev);
        })
        .catch(function (e) {
          console.error("Failed to init Twilio Device:", e);
        });

      // Heartbeat every 30s
      heartbeatRef.current = setInterval(function () {
        fetch(SB_URL + "/rest/v1/agent_status?usuario_id=eq." + userId, {
          method: "PATCH",
          headers: { apikey: SVC_KEY, Authorization: "Bearer " + SVC_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ last_heartbeat: new Date().toISOString() }),
        });
      }, 30000);
    }

    init();

    return function () {
      cancelled = true;
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [userId, enabled]);

  // Call duration timer
  useEffect(function () {
    if (activeCall) {
      var start = Date.now();
      timerRef.current = setInterval(function () {
        setCallDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return function () { clearInterval(timerRef.current); };
    }
  }, [activeCall]);

  var acceptCall = useCallback(function () {
    if (incomingCall) incomingCall.accept();
  }, [incomingCall]);

  var rejectCall = useCallback(function () {
    if (incomingCall) incomingCall.reject();
  }, [incomingCall]);

  var hangUp = useCallback(function () {
    if (activeCall) activeCall.disconnect();
  }, [activeCall]);

  var toggleMute = useCallback(function () {
    if (activeCall) activeCall.mute(!activeCall.isMuted());
  }, [activeCall]);

  return {
    device: device,
    incomingCall: incomingCall,
    activeCall: activeCall,
    isRegistered: isRegistered,
    callDuration: callDuration,
    acceptCall: acceptCall,
    rejectCall: rejectCall,
    hangUp: hangUp,
    toggleMute: toggleMute,
  };
}
