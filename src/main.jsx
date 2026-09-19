import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = url && key ? createClient(url, key) : null;

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);

      if (data.session) {
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "PASSWORD_RECOVERY") {
        setResetMode(true);
        setLoading(false);
        return;
      }

      if (session) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(id) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setProfile(data);
    setLoading(false);
  }

  if (!supabase) {
    return (
      <div className="login">
        <div className="card">
          <h1>Setup required</h1>
          <p>
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.
          </p>
        </div>
      </div>
    );
  }

  if (resetMode) {
    return <ResetPassword onDone={() => setResetMode(false)} />;
  }

  if (loading) {
    return (
      <div className="login">
        <div className="card">
          <h1>Loading…</h1>
        </div>
      </div>
    );
  }

  if (!session || !profile || !profile.active) {
    return <Login />;
  }

  return <Dashboard profile={profile} />;
}

/* =========================
   LOGIN
========================= */

function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [msg, setMsg] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sending, setSending] = useState(false);

  async function go() {
    setMsg("");

    if (!u || !p) {
      setMsg("Enter email and password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: u,
      password: p,
    });

    if (error) {
      setMsg(error.message);
    }
  }

  async function sendReset() {
    setMsg("");

    if (!u) {
      setMsg("Enter your login email first.");
      return;
    }

    setSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(u, {
      redirectTo: window.location.origin,
    });

    setSending(false);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Password reset email sent. Check your Gmail.");
    }
  }

  if (forgot) {
    return (
      <div className="login">
        <div className="card">
          <div className="logo">DS</div>

          <h1>Reset Password</h1>

          <p>Enter your registered email address.</p>

          <input
            type="email"
            placeholder="Login email"
            value={u}
            onChange={(e) => setU(e.target.value)}
          />

          <button
            className="primary"
            onClick={sendReset}
            disabled={sending}
          >
            {sending ? "SENDING..." : "SEND RESET LINK"}
          </button>

          {msg && <small>{msg}</small>}

          <button
            className="linkButton"
            onClick={() => {
              setForgot(false);
              setMsg("");
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="card">
        <div className="logo">DS</div>

        <h1>Delivery Studio</h1>

        <p>Secure Owner & Staff Login</p>

        <input
          type="email"
          placeholder="Login email"
          value={u}
          onChange={(e) => setU(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={p}
          onChange={(e) => setP(e.target.value)}
        />

        <button className="primary" onClick={go}>
          LOGIN
        </button>

        <button
          className="linkButton"
          onClick={() => {
            setForgot(true);
            setMsg("");
          }}
        >
          Forgot Password?
        </button>

        {msg && <small>{msg}</small>}
      </div>
    </div>
  );
}

/* =========================
   RESET PASSWORD
========================= */

function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function updatePassword() {
    setMsg("");

    if (!password || !confirm) {
      setMsg("Please enter both password fields.");
      return;
    }

    if (password.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setSuccess(true);
    setMsg("Password changed successfully.");
  }

  if (success) {
    return (
      <div className="login">
        <div className="card">
          <div className="logo">DS</div>

          <h1>Password Updated</h1>

          <p>Your password has been changed successfully.</p>

          <button
            className="primary"
            onClick={async () => {
              await supabase.auth.signOut();
              onDone();
              window.location.hash = "";
            }}
          >
            GO TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="card">
        <div className="logo">DS</div>

        <h1>Set New Password</h1>

        <p>Create a new password for your account.</p>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          className="primary"
          onClick={updatePassword}
          disabled={saving}
        >
          {saving ? "UPDATING..." : "UPDATE PASSWORD"}
        </button>

        {msg && <small>{msg}</small>}
      </div>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard({ profile }) {
  const [tab, setTab] = useState("generator");

  return (
    <div className="app">
      <header>
        <div>
          <b>Delivery Studio</b>
          <span> Online Template Generator</span>
        </div>

        <div className="user">
          {profile.name} · {profile.role}

          <button onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>
      </header>

      <main>
        <aside>
          <button
            className={tab === "generator" ? "active" : ""}
            onClick={() => setTab("generator")}
          >
            📸 Generator
          </button>

          {profile.role === "OWNER" && (
            <>
              <button
                className={tab === "users" ? "active" : ""}
                onClick={() => setTab("users")}
              >
                👥 Users
              </button>

              <button
                className={tab === "templates" ? "active" : ""}
                onClick={() => setTab("templates")}
              >
                🖼️ Templates
              </button>
            </>
          )}
        </aside>

        <section className="content">
          {tab === "generator" && <Generator profile={profile} />}
          {tab === "users" && <Users />}
          {tab === "templates" && <Templates />}
        </section>
      </main>
    </div>
  );
}

/* =========================
   GENERATOR
========================= */

function getDefaultLayout() {
  return {
    photo1: { x: 2.7, y: 29.0, w: 24.5, h: 24.5 },
    photo2: { x: 27.9, y: 29.0, w: 24.5, h: 24.5 },
    photo3: { x: 2.7, y: 54.5, w: 24.5, h: 24.5 },
    photo4: { x: 27.9, y: 54.5, w: 24.5, h: 24.5 },
    name:  { x: 66.0, y: 35.0, w: 31.0, h: 8.5 },
    model: { x: 66.0, y: 45.2, w: 31.0, h: 7.0 },
    date:  { x: 66.0, y: 55.8, w: 31.0, h: 7.0 },
  };
}

function useTemplateBackground() {
  const [background, setBackground] = useState(() => {
    try {
      return localStorage.getItem("delivery_template_background") || "/delivery-template.png";
    } catch {
      return "/delivery-template.png";
    }
  });

  const setAndSaveBackground = (value) => {
    setBackground(value);
    try {
      localStorage.setItem("delivery_template_background", value);
    } catch {}
  };

  const resetBackground = () => {
    setAndSaveBackground("/delivery-template.png");
  };

  return [background, setAndSaveBackground, resetBackground];
}

function useTemplateLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem("delivery_template_layout");
      return saved ? { ...getDefaultLayout(), ...JSON.parse(saved) } : getDefaultLayout();
    } catch {
      return getDefaultLayout();
    }
  });

  const saveLayout = (next) => {
    setLayout(next);
    localStorage.setItem("delivery_template_layout", JSON.stringify(next));
  };

  const resetLayout = () => {
    const defaults = getDefaultLayout();
    setLayout(defaults);
    localStorage.setItem("delivery_template_layout", JSON.stringify(defaults));
  };

  return [layout, saveLayout, resetLayout];
}

function DeliveryCanvas({ form, layout, background = "/delivery-template.png", editor = false, selected, setSelected, updateItem }) {
  const ref = useRef();

  const dragStart = (e, key) => {
    if (!editor) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = e.currentTarget.closest(".delivery-template");
    const rect = canvas.getBoundingClientRect();
    const item = layout[key];
    const startX = e.clientX;
    const startY = e.clientY;

    const move = (ev) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      updateItem(key, {
        ...item,
        x: Math.max(0, Math.min(100 - item.w, item.x + dx)),
        y: Math.max(0, Math.min(100 - item.h, item.y + dy)),
      });
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const resizeStart = (e, key) => {
    if (!editor) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = e.currentTarget.closest(".delivery-template");
    const rect = canvas.getBoundingClientRect();
    const item = layout[key];
    const startX = e.clientX;
    const startY = e.clientY;
    const isPhoto = key.startsWith("photo");

    const move = (ev) => {
      const dw = ((ev.clientX - startX) / rect.width) * 100;
      const dh = ((ev.clientY - startY) / rect.height) * 100;

      if (isPhoto) {
        // Photo slots stay perfectly square while resizing.
        const delta = (dw + dh) / 2;
        const size = Math.max(5, Math.min(45, item.w + delta));
        updateItem(key, { ...item, w: size, h: size });
      } else {
        updateItem(key, {
          ...item,
          w: Math.max(4, Math.min(80, item.w + dw)),
          h: Math.max(3, Math.min(70, item.h + dh)),
        });
      }
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const itemStyle = (key) => ({
    left: `${layout[key].x}%`,
    top: `${layout[key].y}%`,
    width: `${layout[key].w}%`,
    height: key.startsWith("photo") ? `${layout[key].w}%` : `${layout[key].h}%`,
  });

  const renderPhoto = (key, index) => (
    <div
      className={`positioned-item photo-slot ${selected === key ? "selected" : ""}`}
      style={itemStyle(key)}
      onPointerDown={(e) => {
        if (editor) setSelected?.(key);
        dragStart(e, key);
      }}
    >
      {form.photos[index] ? (
        <img src={form.photos[index]} alt="" draggable="false" />
      ) : (
        <span>PHOTO {index + 1}</span>
      )}
      {editor && selected === key && (
        <span
          className="resize-handle"
          onPointerDown={(e) => resizeStart(e, key)}
        />
      )}
    </div>
  );

  const renderText = (key, value, placeholder) => (
    <div
      className={`positioned-item editable-text ${key === "name" ? "name-text" : key === "model" ? "model-text" : "single-line-text"} ${selected === key ? "selected" : ""}`}
      style={itemStyle(key)}
      onPointerDown={(e) => {
        if (editor) setSelected?.(key);
        dragStart(e, key);
      }}
    >
      {value ? value.split("\n").map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </React.Fragment>
      )) : placeholder}
      {editor && selected === key && (
        <span
          className="resize-handle"
          onPointerDown={(e) => resizeStart(e, key)}
        />
      )}
    </div>
  );

  return (
    <div className={`delivery-template ${editor ? "editor-mode" : ""}`} ref={ref}>
      <img
        className="template-background"
        src={background}
        alt=""
        draggable="false"
      />

      {renderPhoto("photo1", 0)}
      {renderPhoto("photo2", 1)}
      {renderPhoto("photo3", 2)}
      {renderPhoto("photo4", 3)}

      {renderText("name", form.name, "Mrs. Meera Malvi")}
      {renderText("model", form.model, "New Hyundai Creta")}
      {renderText("date", form.date, "14/09/2026")}
    </div>
  );
}

function Generator({ profile }) {
  const [form, setForm] = useState({
    name: "",
    model: "New Hyundai Creta",
    date: new Date().toLocaleDateString("en-GB"),
    photos: [null, null, null, null],
  });

  const [layout] = useTemplateLayout();
  const [background] = useTemplateBackground();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraIndex, setCameraIndex] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const ref = useRef();

  const photo = (i, e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const r = new FileReader();
    r.onload = () =>
      setForm((x) => ({
        ...x,
        photos: x.photos.map((p, j) => (j === i ? r.result : p)),
      }));
    r.readAsDataURL(f);
  };


  async function openCamera(startIndex = 0) {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera is not available in this browser. Please use Chrome or Edge on localhost.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraIndex(startIndex);
      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch (err) {
      alert("Camera permission nahi mili. Browser mein Camera ko Allow karein.");
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraIndex(0);
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const image = canvas.toDataURL("image/jpeg", 0.92);
    const currentIndex = cameraIndex;

    setForm((x) => ({
      ...x,
      photos: x.photos.map((p, j) => (j === currentIndex ? image : p)),
    }));

    if (currentIndex < 3) {
      setCameraIndex(currentIndex + 1);
    } else {
      closeCamera();
    }
  }

  async function save() {
    const target =
      document.querySelector(".preview-canvas-wrap .delivery-template");

    if (!target) {
      alert("Preview ready nahi hai. Please thoda wait karke dobara Download PNG dabayein.");
      return;
    }

    try {
      const images = Array.from(target.querySelectorAll("img"));
      await Promise.all(
        images.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                })
        )
      );

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          alert("PNG create nahi ho paaya. Dobara try karein.");
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = "delivery-design.png";
        a.href = url;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch (err) {
      console.error(err);
      alert("Download mein problem aa rahi hai. Please dobara try karein.");
    }

    await supabase.from("generated_designs").insert({
      created_by: profile.id,
      customer_name: form.name,
      model: form.model,
      delivery_date: form.date,
      photo_urls: form.photos,
    });
  }

  return (
    <div>
      <div className="pagehead">
        <div>
          <h2>Delivery Design Generator</h2>
          <p>Photos and customer details are fitted into the saved template.</p>
        </div>
        <button className="primary" onClick={save}>⬇ Download PNG</button>
      </div>

      <div className="grid">
        <div className="panel">
          <label>
            Customer Name
            <textarea
              className="customer-name-input"
              rows="2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={"Rashi Kumar\nDessi"}
            />
            <small className="field-hint">2 lines supported • Enter dabakar next line likhein</small>
          </label>

          <label>
            Car Model
            <input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </label>

          <label>
            Delivery Date
            <input
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>

          <div className="section-heading">
            <div>
              <h3>Delivery Photos</h3>
              <p>Click any card to select a photo.</p>
            </div>
            <span className="photo-count">
              {form.photos.filter(Boolean).length}/4
            </span>
          </div>

          <button
            type="button"
            className="all-camera-btn"
            onClick={() => openCamera(0)}
          >
            <span className="all-camera-icon">📷</span>
            <span>
              <b>Take 4 Photos with Camera</b>
              <small>One by one: Photo 1 → Photo 2 → Photo 3 → Photo 4</small>
            </span>
            <span className="camera-arrow">→</span>
          </button>

          <div className="photoInputs">
            {form.photos.map((photoUrl, i) => (
              <div className={`upload-card ${photoUrl ? "has-photo" : ""}`} key={i}>
                {photoUrl ? (
                  <img src={photoUrl} alt={`Photo ${i + 1}`} />
                ) : (
                  <div className="upload-empty">
                    <div className="camera-circle">📷</div>
                    <strong>Photo {i + 1}</strong>
                    <small>Not selected</small>
                  </div>
                )}

                <label className="choose-photo-btn single-choice">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => photo(i, e)}
                  />
                  <span>{photoUrl ? "✎ Change Photo" : "＋ Select from PC"}</span>
                </label>
              </div>
            ))}
          </div>

          <div className="quick-tip">
            <span>💡</span>
            <span>Photos automatically appear in the selected template positions.</span>
          </div>
        </div>

        <div className="panel previewPanel">
          <div className="preview-heading">
            <div>
              <h3>Design Preview</h3>
              <span>Live preview of your delivery post</span>
            </div>
            <span className="preview-badge">LIVE</span>
          </div>
          <div className="preview-canvas-wrap">
            <DeliveryCanvas form={form} layout={layout} background={background} />
          </div>
        </div>
      </div>

      {cameraOpen && (
        <div className="camera-modal" onClick={closeCamera}>
          <div className="camera-box" onClick={(e) => e.stopPropagation()}>
            <div className="camera-header">
              <div>
                <b>Take 4 Delivery Photos</b>
                <span>Now capturing Photo {cameraIndex + 1} of 4</span>
              </div>
              <button type="button" className="camera-close" onClick={closeCamera}>×</button>
            </div>

            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline muted />
              <div className="camera-frame"></div>
            </div>

            <div className="camera-footer">
              <button type="button" className="secondary" onClick={closeCamera}>Cancel</button>
              <button type="button" className="capture-btn" onClick={capturePhoto}>
                ● Capture Photo {cameraIndex + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   USERS
========================= */

function Users() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => load(), []);

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at");

    setRows(data || []);
  }

async function add() {
  if (!name || !email || !password) {
    return alert("Fill all fields");
  }

  const { data, error } = await supabase.functions.invoke(
    "create-staff",
    {
      body: {
        name,
        email,
        password,
      },
    }
  );

  if (error) {
    return alert(error.message || "Could not create staff account");
  }

  if (!data?.success) {
    return alert(data?.error || "Could not create staff account");
  }

  alert("Staff account created successfully");

  setName("");
  setEmail("");
  setPassword("");

  await load();
}

  return (
    <div>
      <div className="pagehead">
        <div>
          <h2>Staff Users</h2>
          <p>Owner-only management.</p>
        </div>
      </div>

      <div className="panel">
        <h3>Create Staff</h3>

        <p>
          Use a secure Supabase Edge Function for account
          creation. The service-role key must never be exposed
          in the browser.
        </p>

        <input
          placeholder="Staff name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Staff email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Temporary password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="primary" onClick={add}>
          Create Staff
        </button>
      </div>

      <div className="panel">
        <h3>Accounts</h3>

        {rows.map((x) => (
          <div className="userrow" key={x.id}>
            <span>
              <b>{x.name}</b> · {x.username} · {x.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   TEMPLATES
========================= */

function Templates() {
  const [layout, saveLayout, resetLayout] = useTemplateLayout();
  const [background, saveBackground, resetBackground] = useTemplateBackground();
  const [selected, setSelected] = useState("photo1");
  const [bgName, setBgName] = useState("Current template");

  const sampleForm = {
    name: "Mrs. Meera Malvi",
    model: "New Hyundai Creta",
    date: "14/09/2026",
    photos: [null, null, null, null],
  };

  const updateItem = (key, next) => {
    saveLayout({ ...layout, [key]: next });
  };

  const selectedItem = layout[selected];

  const nudge = (dx, dy) => {
    if (!selectedItem) return;
    updateItem(selected, {
      ...selectedItem,
      x: Math.max(0, Math.min(100 - selectedItem.w, selectedItem.x + dx)),
      y: Math.max(0, Math.min(100 - selectedItem.h, selectedItem.y + dy)),
    });
  };

  const uploadBackground = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Please use an image smaller than 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      saveBackground(reader.result);
      setBgName(file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="templates-page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">OWNER STUDIO</div>
          <h2>Template Editor</h2>
          <p>Design ko website se hi set karein — background, photos aur text.</p>
        </div>

        <div className="editor-actions">
          <button className="secondary" onClick={() => {
            resetBackground();
            setBgName("Default Abhishek Hyundai template");
          }}>
            ↺ Default Background
          </button>
          <button className="secondary" onClick={resetLayout}>
            ↺ Reset Placement
          </button>
          <button
            className="primary"
            onClick={() => alert("Template settings saved successfully.")}
          >
            ✓ Save Template
          </button>
        </div>
      </div>

      <div className="editor-toolbar">
        <label className="background-upload">
          <span className="upload-icon">🖼️</span>
          <span>
            <b>Change Background</b>
            <small>PNG / JPG • max 8 MB</small>
          </span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadBackground} />
        </label>

        <div className="background-current">
          <span className="status-dot"></span>
          <span><b>Background:</b> {bgName}</span>
        </div>
      </div>

      <div className="template-editor-grid">
        <div className="panel editor-controls">
          <div className="panel-title-row">
            <div>
              <h3>Design Elements</h3>
              <p>Select an element and drag it on the canvas.</p>
            </div>
          </div>

          <div className="element-list">
            {[
              ["photo1", "📷", "Photo 1"],
              ["photo2", "📷", "Photo 2"],
              ["photo3", "📷", "Photo 3"],
              ["photo4", "📷", "Photo 4"],
              ["name", "👤", "Customer Name"],
              ["model", "🚗", "Car Model"],
              ["date", "📅", "Delivery Date"],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                className={selected === key ? "element-button selected-element" : "element-button"}
                onClick={() => setSelected(key)}
              >
                <span className="element-icon">{icon}</span>
                <span>{label}</span>
                <span className="element-arrow">›</span>
              </button>
            ))}
          </div>

          {selectedItem && (
            <div className="position-controls">
              <div className="selected-label">SELECTED ELEMENT</div>
              <h4>{selected === "name" ? "Customer Name" :
                   selected === "model" ? "Car Model" :
                   selected === "date" ? "Delivery Date" :
                   selected.replace("photo", "Photo ")}</h4>

              {[
                ["x", "X Position"],
                ["y", "Y Position"],
                ["w", selected.startsWith("photo") ? "Square Size" : "Width"],
                ["h", selected.startsWith("photo") ? "Square Size" : "Height"],
              ].map(([field, label]) => (
                <label className="control-row" key={field}>
                  <span>{label}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={Number(selectedItem[field]).toFixed(1)}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (selected.startsWith("photo") && (field === "w" || field === "h")) {
                        updateItem(selected, { ...selectedItem, w: value, h: value });
                      } else {
                        updateItem(selected, {
                          ...selectedItem,
                          [field]: value,
                        });
                      }
                    }}
                  />
                  <em>%</em>
                </label>
              ))}

              <div className="nudge-title">Fine adjustment</div>
              <div className="nudge-grid">
                <button onClick={() => nudge(0, -0.5)}>↑</button>
                <button onClick={() => nudge(-0.5, 0)}>←</button>
                <button onClick={() => nudge(0, 0.5)}>↓</button>
                <button onClick={() => nudge(0.5, 0)}>→</button>
              </div>
            </div>
          )}

          <div className="editor-note">
            <b>Background locked</b>
            <span>Only photos and Name / Model / Date can be moved or resized.</span>
          </div>
        </div>

        <div className="panel previewPanel editor-preview">
          <div className="canvas-header">
            <div>
              <h3>Live Preview</h3>
              <span>Drag elements directly on the design</span>
            </div>
            <span className="live-badge">● LIVE</span>
          </div>

          <div className="canvas-stage">
            <DeliveryCanvas
              form={sampleForm}
              layout={layout}
              background={background}
              editor
              selected={selected}
              setSelected={setSelected}
              updateItem={updateItem}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);