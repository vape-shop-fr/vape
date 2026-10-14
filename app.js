import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, updateDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAO3ZNx7hAFG_qH0BfeSUIMQsRfonH-LXw",
  authDomain: "vape-fc2ca.firebaseapp.com",
  projectId: "vape-fc2ca",
  storageBucket: "vape-fc2ca.firebasestorage.app",
  messagingSenderId: "826171627240",
  appId: "1:826171627240:web:68cb55f24238a68df29b5d",
  measurementId: "G-SCXPMEKRRJ"
};
const ADMIN_EMAIL = "pc2alex.les@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);
const $ = id => document.getElementById(id);
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
};

/* ---------- Produits (à modifier : noms, prix, descriptions, images) ---------- */
const PRODUCTS = [
  { id: "p1", want: { name: "E-liquide JNR 18 mg", price: 6.9, desc: "Dose de nicotine élevée.", color: "#8FA9A6" },
    better: { name: "E-liquide JNR 6 mg", price: 6.9, desc: "Même goût, moins de nicotine. Tu peux baisser par paliers.", color: "#F2A93B" },
    tip: "Baisser la dose de nicotine petit à petit réduit la dépendance." },
  { id: "p2", want: { name: "Chicha tabac traditionnel", price: 12.9, desc: "Tabac mélassé, brûlé au charbon.", color: "#9A8F86" },
    better: { name: "Chicha sans tabac ni nicotine", price: 14.9, desc: "Mélange sans tabac ni nicotine, pour une chicha plus légère.", color: "#E58B4D" },
    tip: "Moins nocif ne veut pas dire sans risque : la combustion produit toujours du monoxyde de carbone." },
  { id: "p3", want: { name: "Charbon naturel", price: 5.5, desc: "Brûle longtemps, dégage du monoxyde de carbone.", color: "#6E7B7A" },
    better: { name: "Chauffe-chicha électrique", price: 29.9, desc: "Chauffe sans charbon, donc sans monoxyde de carbone du charbon.", color: "#4FA38A" },
    tip: "Le charbon est la principale source de monoxyde de carbone d'une séance de chicha." },
  { id: "p4", want: { name: "Vape jetable (puff)", price: 9.9, desc: "Nicotine fixe, jetée après usage.", color: "#A096A8" },
    better: { name: "Kit pod rechargeable", price: 24.9, desc: "Tu choisis ta dose de nicotine et tu la réduis avec le temps. Moins de déchets.", color: "#5B8DEF" },
    tip: "Choisir soi-même la dose permet de diminuer sans s'en rendre compte." }
];
const art = (color, label) => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${color}"/><circle cx="160" cy="100" r="54" fill="rgba(255,255,255,.35)"/><text x="160" y="112" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="700" fill="#0F2A2B">${label}</text></svg>`);
const euro = n => n.toFixed(2).replace(".", ",") + " €";

/* ---------- Porte 18+ ---------- */
const gate = $("gate");
if (store.get("age18") === "1") gate.classList.add("hidden");
$("yes").onclick = () => { store.set("age18", "1"); gate.classList.add("hidden"); };
$("no").onclick = () => {
  $("gateMsg").textContent = "Désolé, ce site est réservé aux personnes majeures.";
  $("gateBtns").classList.add("hidden");
};

/* ---------- Cookies (la mesure d'audience ne démarre qu'après accord) ---------- */
async function startAnalytics() {
  const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js");
  getAnalytics(app);
}
const ck = store.get("cookies");
if (ck === "yes") startAnalytics(); else if (!ck) $("cookies").style.display = "grid";
$("ckYes").onclick = () => { store.set("cookies", "yes"); $("cookies").style.display = "none"; startAnalytics(); };
$("ckNo").onclick = () => { store.set("cookies", "no"); $("cookies").style.display = "none"; };
$("cookieLink").onclick = e => { e.preventDefault(); $("cookies").style.display = "grid"; };

/* ---------- Boutique ---------- */
let cart = [];
try { cart = JSON.parse(store.get("cart") || "[]"); } catch {}
const saveCart = () => { store.set("cart", JSON.stringify(cart)); $("cartBtn").textContent = `Panier (${cart.length})`; };
const find = key => { const [id, k] = key.split(":"); const p = PRODUCTS.find(x => x.id === id); return p && { ...p[k], key }; };

function side(p, k) {
  const d = p[k], el = document.createElement("div");
  el.className = "side " + k;
  const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = k === "want" ? "Ce que tu cherches" : "On te conseille";
  const img = document.createElement("img"); img.src = art(d.color, d.name.split(" ")[0]); img.alt = d.name;
  const h = document.createElement("h3"); h.textContent = d.name;
  const t = document.createElement("p"); t.textContent = d.desc;
  const pr = document.createElement("span"); pr.className = "price"; pr.textContent = euro(d.price);
  const b = document.createElement("button"); b.textContent = "Ajouter"; if (k === "want") b.className = "ghost";
  b.onclick = () => { cart.push(`${p.id}:${k}`); saveCart(); };
  el.append(tag, img, h, t, pr, b);
  return el;
}
PRODUCTS.forEach(p => {
  const c = document.createElement("article"); c.className = "pair";
  const tip = document.createElement("div"); tip.className = "tip"; tip.textContent = p.tip;
  c.append(side(p, "want"), side(p, "better"), tip);
  $("shop").append(c);
});
saveCart();

$("cartBtn").onclick = () => {
  const l = $("cartList"); l.textContent = ""; $("cartErr").textContent = "";
  if (!cart.length) l.textContent = "Ton panier est vide.";
  let total = 0;
  cart.forEach((key, i) => {
    const p = find(key); if (!p) return; total += p.price;
    const r = document.createElement("div"); r.className = "req";
    r.append(Object.assign(document.createElement("span"), { textContent: `${p.name} – ${euro(p.price)}` }));
    const x = document.createElement("button"); x.className = "ghost"; x.textContent = "Retirer";
    x.onclick = () => { cart.splice(i, 1); saveCart(); $("cartBtn").onclick(); };
    r.append(x); l.append(r);
  });
  if (cart.length) l.append(Object.assign(document.createElement("p"), { textContent: "Total : " + euro(total), className: "price" }));
  $("cartDlg").showModal();
};
$("cartClose").onclick = () => $("cartDlg").close();
$("order").onclick = () => {
  if (!auth.currentUser) { $("cartErr").textContent = "Connecte-toi pour commander."; return; }
  if (status !== "verified") { $("cartErr").textContent = "Ton identité doit d'abord être validée (voir plus bas sur la page)."; return; }
  $("cartErr").textContent = "Le paiement n'est pas encore branché sur ce site.";
};

/* ---------- Connexion ---------- */
const errMsg = e => ({ "auth/invalid-credential": "Email ou mot de passe incorrect.", "auth/email-already-in-use": "Cet email a déjà un compte.",
  "auth/weak-password": "Mot de passe trop court (6 caractères min.).", "auth/invalid-email": "Email invalide.",
  "auth/popup-closed-by-user": "Connexion annulée." }[e.code] || "Erreur : " + (e.code || e.message));
const run = async fn => { $("authErr").textContent = ""; try { await fn(); $("authDlg").close(); } catch (e) { $("authErr").textContent = errMsg(e); } };
$("authBtn").onclick = () => auth.currentUser ? signOut(auth) : $("authDlg").showModal();
$("authClose").onclick = () => $("authDlg").close();
$("doLogin").onclick = () => run(() => signInWithEmailAndPassword(auth, $("email").value.trim(), $("pwd").value));
$("doSignup").onclick = () => run(() => createUserWithEmailAndPassword(auth, $("email").value.trim(), $("pwd").value));
$("gBtn").onclick = () => run(() => signInWithPopup(auth, new GoogleAuthProvider()));
$("aBtn").onclick = () => run(() => signInWithPopup(auth, new OAuthProvider("apple.com")));

/* ---------- Vérification d'identité ---------- */
let status = "none", unsubV = null, unsubAdmin = null;
const makeCode = () => {
  const n = crypto.getRandomValues(new Uint32Array(4)), L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return String(n[0] % 10) + n[1] % 10 + n[2] % 10 + n[3] % 10 + [...crypto.getRandomValues(new Uint8Array(3))].map(x => L[x % L.length]).join("");
};
function renderAccount(user, data) {
  const box = $("accountBox"); box.textContent = "";
  const add = (tag, text, cls) => { const e = document.createElement(tag); e.textContent = text; if (cls) e.className = cls; box.append(e); return e; };
  add("h2", "Vérification d'identité");
  status = data?.status || "none";
  if (status === "verified") { add("p", "Identité validée. Tu peux commander.", "ok"); return; }
  if (status === "pending") { add("p", "Demande envoyée. Elle est en attente de validation."); add("p", "Ton code :"); add("div", data.code, "code"); return; }
  if (status === "refused") add("p", "Ta dernière demande a été refusée. Tu peux en envoyer une nouvelle.", "err");
  const code = makeCode();
  add("p", "Écris ce code sur une feuille et prends-toi en photo avec ta carte d'identité et la feuille :");
  add("div", code, "code");
  const f1 = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
  const f2 = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
  add("label", "Photo de ta carte d'identité (recto)"); box.append(f1);
  add("label", "Photo de toi avec la feuille et le code"); box.append(f2);
  const msg = add("p", "", "err");
  const send = add("button", "Envoyer ma demande");
  send.onclick = async () => {
    msg.textContent = "";
    const [a, b] = [f1.files[0], f2.files[0]];
    if (!a || !b) { msg.textContent = "Ajoute les deux photos."; return; }
    if (a.size > 5e6 || b.size > 5e6) { msg.textContent = "Chaque photo doit faire moins de 5 Mo."; return; }
    send.disabled = true; send.textContent = "Envoi…";
    try {
      await uploadBytes(ref(storage, `verifs/${user.uid}/id`), a);
      await uploadBytes(ref(storage, `verifs/${user.uid}/selfie`), b);
      await setDoc(doc(db, "verifs", user.uid), { code, email: user.email, status: "pending", createdAt: serverTimestamp() });
    } catch (e) { msg.textContent = "Envoi impossible : " + (e.code || e.message); send.disabled = false; send.textContent = "Envoyer ma demande"; }
  };
}

/* ---------- Dashboard admin ---------- */
function watchAdmin() {
  unsubAdmin = onSnapshot(query(collection(db, "verifs"), where("status", "==", "pending")), snap => {
    const box = $("reqs"); box.textContent = "";
    if (snap.empty) box.textContent = "Aucune demande en attente.";
    snap.forEach(async d => {
      const v = d.data(), row = document.createElement("div"); row.className = "req";
      const left = document.createElement("div");
      left.append(Object.assign(document.createElement("p"), { textContent: `${v.email} – code ${v.code}` }));
      for (const n of ["id", "selfie"]) {
        try { const url = await getDownloadURL(ref(storage, `verifs/${d.id}/${n}`));
          const a = Object.assign(document.createElement("a"), { href: url, target: "_blank", rel: "noopener" });
          a.append(Object.assign(document.createElement("img"), { src: url, alt: n })); left.append(a); } catch {}
      }
      const btns = document.createElement("div"); btns.className = "row";
      for (const [label, st] of [["Accepter", "verified"], ["Refuser", "refused"]]) {
        const b = document.createElement("button"); b.textContent = label; if (st === "refused") b.className = "ghost";
        b.onclick = () => updateDoc(doc(db, "verifs", d.id), { status: st }); btns.append(b);
      }
      row.append(left, btns); box.append(row);
    });
  });
}

onAuthStateChanged(auth, user => {
  unsubV?.(); unsubAdmin?.(); status = "none";
  $("authBtn").textContent = user ? "Se déconnecter" : "Se connecter";
  $("account").classList.toggle("hidden", !user);
  $("admin").classList.add("hidden");
  if (!user) return;
  unsubV = onSnapshot(doc(db, "verifs", user.uid), s => renderAccount(user, s.data()));
  if (user.email === ADMIN_EMAIL && user.emailVerified) { $("admin").classList.remove("hidden"); watchAdmin(); }
});
