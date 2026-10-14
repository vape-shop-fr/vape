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
const FREE_FROM = 39, SHIPPING = 4.9; // livraison offerte dès 39 € (à modifier)

const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);
const $ = id => document.getElementById(id);
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
};
const euro = n => n.toFixed(2).replace(".", ",") + " €";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const tint = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
let status = "none";

/* ============ Illustrations des produits (SVG générés, pas de photos) ============ */
function art(type, color, label = "") {
  const L = esc(label.slice(0, 12));
  const D = "#0E2A2B";
  const shapes = {
    bottle: `<rect x="178" y="44" width="44" height="30" rx="6" fill="${D}"/><rect x="186" y="74" width="28" height="16" fill="#2B4A4B"/>
      <rect x="150" y="90" width="100" height="172" rx="24" fill="${color}"/><rect x="150" y="90" width="100" height="172" rx="24" fill="rgba(255,255,255,.2)"/>
      <rect x="162" y="138" width="76" height="84" rx="10" fill="#fff"/><text x="200" y="174" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14" fill="${D}">${L}</text>
      <text x="200" y="198" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#587270">10 ml</text>`,
    pod: `<rect x="160" y="38" width="80" height="224" rx="36" fill="${color}"/><rect x="176" y="38" width="48" height="56" rx="12" fill="${D}"/>
      <rect x="186" y="54" width="28" height="24" rx="6" fill="rgba(255,255,255,.55)"/><circle cx="200" cy="196" r="15" fill="rgba(255,255,255,.75)"/><rect x="188" y="232" width="24" height="6" rx="3" fill="rgba(255,255,255,.6)"/>`,
    hookah: `<rect x="190" y="30" width="20" height="30" rx="4" fill="${D}"/><path d="M162 60h76l-8 28h-60z" fill="${color}"/><rect x="194" y="88" width="12" height="64" fill="${D}"/>
      <path d="M200 148c-60 0-86 42-86 76 0 22 32 38 86 38s86-16 86-38c0-34-26-76-86-76z" fill="${color}"/><path d="M200 148c-60 0-86 42-86 76 0 22 32 38 86 38s86-16 86-38c0-34-26-76-86-76z" fill="rgba(255,255,255,.22)"/>
      <path d="M238 118c64 0 74 64 42 102" stroke="${D}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    tin: `<rect x="114" y="82" width="172" height="150" fill="${color}"/><ellipse cx="200" cy="232" rx="86" ry="18" fill="${color}"/><ellipse cx="200" cy="82" rx="86" ry="18" fill="${D}"/>
      <rect x="114" y="126" width="172" height="66" fill="#fff"/><text x="200" y="156" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="16" fill="${D}">${L}</text>
      <text x="200" y="177" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#587270">sans tabac, sans nicotine</text>`,
    bowl: `<path d="M118 112h164l-26 112a20 20 0 0 1-20 16h-68a20 20 0 0 1-20-16z" fill="${color}"/><ellipse cx="200" cy="112" rx="82" ry="17" fill="${D}"/>
      <circle cx="170" cy="112" r="5" fill="#587270"/><circle cx="200" cy="114" r="5" fill="#587270"/><circle cx="230" cy="112" r="5" fill="#587270"/>`,
    hose: `<path d="M64 226c44-116 124 44 164-62s84-44 104-96" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <rect x="312" y="40" width="44" height="22" rx="8" fill="${D}" transform="rotate(-25 334 51)"/>`,
    heater: `<rect x="128" y="64" width="144" height="156" rx="28" fill="${D}"/><circle cx="200" cy="140" r="44" fill="${color}"/><circle cx="200" cy="140" r="24" fill="rgba(255,255,255,.6)"/>
      <rect x="168" y="220" width="64" height="18" rx="6" fill="#2B4A4B"/>`,
    charcoal: `<g fill="#2B2F31"><rect x="118" y="150" width="72" height="72" rx="8" transform="rotate(-8 154 186)"/><rect x="206" y="140" width="72" height="72" rx="8" transform="rotate(6 242 176)"/><rect x="164" y="92" width="72" height="72" rx="8" transform="rotate(-2 200 128)"/></g>
      <circle cx="150" cy="176" r="5" fill="#E8735A"/><circle cx="246" cy="168" r="4" fill="#F2A93B"/><circle cx="196" cy="120" r="4" fill="#E8735A"/>`,
    box: `<rect x="128" y="78" width="144" height="134" rx="20" fill="${color}"/><path d="M128 128h144" stroke="rgba(255,255,255,.6)" stroke-width="6"/><circle cx="200" cy="170" r="16" fill="rgba(255,255,255,.75)"/>`
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tint(color, .3)}"/><stop offset="1" stop-color="${tint(color, .08)}"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/><circle cx="330" cy="62" r="92" fill="${tint(color, .16)}"/><ellipse cx="200" cy="268" rx="90" ry="9" fill="rgba(14,42,43,.12)"/>${shapes[type] || shapes.box}</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/* ============ Catalogue (à modifier : noms, prix, descriptions) ============ */
const CATS = [["all", "Tout"], ["eliquides", "E-liquides"], ["pods", "Kits pod"], ["melanges", "Mélanges sans tabac"], ["chichas", "Chichas"], ["chauffe", "Chauffe & charbon"], ["acc", "Accessoires"]];
const TIPS = {
  eliquides: "Baisser la nicotine par paliers (18, 12, 6, 3 puis 0 mg) aide à réduire la dépendance.",
  pods: "Tu choisis ta dose de nicotine et tu peux la baisser avec le temps. Rechargeable, donc moins de déchets.",
  melanges: "Moins nocif ne veut pas dire sans risque : la combustion produit toujours du monoxyde de carbone.",
  chauffe: "Le charbon est la principale source de monoxyde de carbone d'une séance de chicha.",
  chichas: "Une séance de chicha dure souvent longtemps : fais des pauses et aère la pièce.",
  acc: "Aucun accessoire ne rend la chicha ou la vape inoffensive. L'objectif reste de réduire."
};
const P = [];
const add = (cat, name, brand, desc, type, color, v, x = {}) => {
  const id = "p" + (P.length + 1);
  P.push({ id, cat, name, brand, desc, type, color, v, lab: name.split(" ")[0], ...x });
  return id;
};

// E-liquides : 24 goûts x 5 dosages
const STY = ["fruité et frais", "gourmand", "pétillant", "doux et rond", "glacé", "acidulé"];
const FL = [["Fraise Glacée", "#E85D75"], ["Pastèque Menthe", "#4FB286"], ["Mangue Passion", "#F2A93B"], ["Cola Citron", "#8A5A3C"], ["Myrtille Givrée", "#5B6FD6"], ["Raisin Blanc", "#B7C95A"],
  ["Pêche Thé Glacé", "#F4A77B"], ["Ananas Coco", "#E9CB3F"], ["Menthe Polaire", "#3FB6B0"], ["Framboise Bleue", "#3E7CD9"], ["Kiwi Citron Vert", "#7BC043"], ["Cerise Noire", "#8E2441"],
  ["Banane Crème", "#E6D071"], ["Citron Meringué", "#EBD960"], ["Melon Miel", "#9ED36A"], ["Cassis Réglisse", "#5A3E7A"], ["Pomme Verte", "#8CC63F"], ["Litchi Rose", "#EE88AB"],
  ["Café Noisette", "#8A5A3C"], ["Vanille Caramel", "#D9A441"], ["Blond Doux", "#B88B4A"], ["Orange Sanguine", "#E2582D"], ["Grenade Cranberry", "#B22A4A"], ["Eau de Coco", "#7FC4C0"]];
FL.forEach(([n, c], i) => {
  const jnr = i < 12, base = jnr ? 4.9 : 4.5;
  add("eliquides", n, jnr ? "JNR" : "Plus Léger", `E-liquide ${STY[i % STY.length]} au goût ${n.toLowerCase()}. Flacon de 10 ml, 50/50 PG/VG.`, "bottle", c,
    [0, 3, 6, 12, 18].map(m => ({ l: m + " mg", p: base, nic: m })), { light: true, badge: "De 0 à 18 mg", defNic: 6 });
});

// Kits pod, pods de rechange, accessoires vape
const KC = [{ l: "Noir", c: "#2B3A3B" }, { l: "Menthe", c: "#4FA38A" }, { l: "Corail", c: "#E8735A" }, { l: "Bleu nuit", c: "#2F4A8A" }];
const KITS = ["Nova", "Lune", "Brume", "Zéphyr", "Alba", "Onyx", "Opale", "Cirrus"];
KITS.forEach((n, i) => add("pods", "Kit pod " + n, "Plus Léger", "Kit pod rechargeable en USB-C, prêt à l'emploi. Tu choisis ta dose de nicotine et tu la baisses avec le temps.", "pod", "#4FA38A",
  KC.map(c => ({ ...c, p: +(19.9 + i).toFixed(2) })), { light: true, badge: "Rechargeable" }));
KITS.forEach((n, i) => add("pods", `Pods ${n} (x2)`, "Plus Léger", `Deux pods de rechange compatibles avec le kit pod ${n}. À remplir avec l'e-liquide de ton choix.`, "pod", "#5B8DEF", [{ l: "x2", p: 6.9 }, { l: "x4", p: 12.9 }]));
add("pods", "Résistances mesh 0,6 Ω (x5)", "Plus Léger", "Résistances de rechange pour une vapeur régulière et un goût net.", "box", "#9A8F86", [{ l: "x5", p: 9.9 }]);
add("pods", "Résistances mesh 0,8 Ω (x5)", "Plus Léger", "Un peu plus douce, adaptée aux dosages de nicotine plus bas.", "box", "#8FA9A6", [{ l: "x5", p: 9.9 }]);
[["Câble USB-C 1 m", 4.9, "Câble de recharge robuste pour tous les kits pod USB-C.", "#4F6D7A"], ["Chargeur secteur USB-C", 7.9, "Chargeur compact, un seul port.", "#7A8B99"],
 ["Étui de transport", 8.9, "Étui rigide pour ton kit, deux pods et un câble.", "#E8735A"], ["Lanyard de protection", 3.9, "Cordon réglable, pour ne plus perdre ton kit.", "#F2A93B"],
 ["Support de bureau", 9.9, "Pose ton kit à la verticale, à l'abri de la poussière.", "#4FA38A"], ["Kit de nettoyage", 6.9, "Cotons-tiges et lingettes pour entretenir ton kit.", "#9ED36A"]]
  .forEach(([n, p, d, c]) => add("pods", n, "Plus Léger", d, "box", c, [{ l: "Standard", p }]));

// Chichas (narguilés)
const HK = ["Kyoto", "Marrakech", "Istanbul", "Oslo", "Dubaï", "Lisbonne", "Tanger", "Séoul"];
const HC = ["#C26A3D", "#3F7F8C", "#7A5BA8", "#4B6B4F", "#C2A13D", "#B24A5C", "#2F4A8A", "#8A8F96"];
HK.forEach((n, i) => { const p = +(29.9 + i * 4).toFixed(2);
  add("chichas", "Chicha " + n, "Plus Léger", "Chicha complète : vase, tige, bol, tuyau et pince. Se démonte pour se nettoyer facilement.", "hookah", HC[i],
    [{ l: "45 cm", p }, { l: "60 cm", p: p + 10 }, { l: "75 cm", p: p + 20 }]); });

// Mélanges sans tabac ni nicotine
const MF = [["Double Pomme", "#B3402F"], ["Menthe Glaciale", "#3FB6B0"], ["Pastèque Fraîche", "#4FB286"], ["Raisin Menthe", "#7A5BA8"], ["Citron Vert", "#8CC63F"], ["Pêche Abricot", "#F4A77B"],
  ["Mangue", "#F2A93B"], ["Fraise Kiwi", "#E85D75"], ["Myrtille", "#5B6FD6"], ["Ananas", "#E9CB3F"], ["Cerise", "#8E2441"], ["Melon", "#9ED36A"], ["Litchi Rose", "#EE88AB"],
  ["Cola", "#8A5A3C"], ["Orange Cannelle", "#E2582D"], ["Cactus Poire", "#7BC043"], ["Passion Goyave", "#E8735A"], ["Noix de Coco", "#7FC4C0"], ["Gomme Rose", "#F08FB0"], ["Thé Glacé", "#C9A15B"]];
MF.forEach(([n, c]) => add("melanges", n, "Plus Léger", `Mélange sans tabac ni nicotine, goût ${n.toLowerCase()}. Pour chicha classique ou avec un chauffe-chicha.`, "tin", c,
  [{ l: "50 g", p: 5.9 }, { l: "200 g", p: 17.9 }, { l: "1 kg", p: 64 }], { light: true, badge: "Sans tabac" }));

// Chauffe-chicha et charbon
const HT = [["Éclat", 24.9, "#F2A93B"], ["Éclat Pro", 34.9, "#E8735A"], ["Compact", 21.9, "#4FA38A"], ["Duo", 39.9, "#B24A5C"]];
const heaterIds = HT.map(([n, p, c]) => add("chauffe", "Chauffe-chicha " + n, "Plus Léger", "Chauffe électrique : plus de charbon, donc plus de monoxyde de carbone venant du charbon. Réglage de la température.", "heater", c,
  [{ l: "Standard", p }], { light: true, badge: "Sans charbon" }));
["Coco (cubes)", "Coco (plat)", "Naturel (rapide)"].forEach((n, i) => add("chauffe", "Charbon naturel " + n, "Plus Léger", "Charbon naturel, brûle longtemps. Il dégage du monoxyde de carbone.", "charcoal", "#6E7B7A",
  [{ l: "500 g", p: 3.9 + i * .3 }, { l: "1 kg", p: 5.5 + i * .4 }, { l: "3 kg", p: 14.9 + i }], { better: heaterIds[i % heaterIds.length], badge: "Il existe plus léger" }));

// Bols, tuyaux, accessoires chicha
[["Bol silicone", 5.9, "Bol souple, se nettoie à l'eau."], ["Bol céramique", 8.9, "Bol classique, bonne tenue à la chaleur."], ["Bol pierre", 9.9, "Pierre naturelle, diffuse la chaleur de façon régulière."],
 ["Bol phunnel", 10.9, "Bol à cheminée centrale, pour une chaleur uniforme."], ["Bol vortex", 11.9, "Dessin hélicoïdal, pour limiter les pertes."], ["Bol grille", 7.9, "Grille inox fine, pratique avec les mélanges sans tabac."]]
  .forEach(([n, p, d], i) => add("acc", n, "Plus Léger", d, "bowl", HC[i], [{ l: "Noir", p, c: "#2B3A3B" }, { l: "Terre", p, c: "#C26A3D" }, { l: "Vert", p, c: "#4B6B4F" }]));
[["Tuyau silicone lavable", 12.9, "Se lave à l'eau chaude, sans goût résiduel.", "#4FA38A"], ["Tuyau cuir", 16.9, "Finition cuir, embout métal.", "#8A5A3C"], ["Tuyau lumineux", 14.9, "LED intégrée, rechargeable en USB-C.", "#5B8DEF"],
 ["Embouts jetables (x50)", 4.9, "Un embout par personne, pour partager sans partager.", "#7FC4C0"], ["Embout verre", 7.9, "Embout lavable, réutilisable.", "#9ED36A"], ["Tuyau court voyage", 9.9, "Format compact pour la mallette.", "#E8735A"]]
  .forEach(([n, p, d, c]) => add("acc", n, "Plus Léger", d, "hose", c, [{ l: "Standard", p }]));
[["Brosses de nettoyage", 4.9, "Brosses pour tige et tuyau."], ["Pinces inox", 5.9, "Pour manipuler le bol sans te brûler."], ["Joints silicone (x10)", 3.9, "Joints de rechange pour une chicha bien étanche."],
 ["Housse de chicha", 12.9, "Housse rembourrée pour le transport."], ["Plateau récupérateur", 9.9, "Garde la table propre."], ["Base verre de rechange", 14.9, "Vase de remplacement."],
 ["Papier alu pré-percé (x100)", 3.5, "Feuilles prêtes à l'emploi pour bol à grille."], ["Mallette de transport", 29.9, "Mallette rigide avec mousse sur mesure."]]
  .forEach(([n, p, d], i) => add("acc", n, "Plus Léger", d, "box", HC[(i + 3) % HC.length], [{ l: "Standard", p }]));

const byId = Object.fromEntries(P.map(p => [p.id, p]));
const minP = p => Math.min(...p.v.map(x => x.p));
const cache = {};
const img = (p, c) => cache[p.id + (c || "")] ??= art(p.type, c || p.color, p.lab);

/* ============ Porte 18+ ============ */
const gate = $("gate");
if (store.get("age18") === "1") gate.classList.add("hidden");
$("yes").onclick = () => { store.set("age18", "1"); gate.classList.add("hidden"); };
$("no").onclick = () => {
  $("gateMsg").textContent = "Désolé, ce site est réservé aux personnes majeures.";
  $("gateBtns").classList.add("hidden");
};

/* ============ Cookies (mesure d'audience seulement après accord) ============ */
async function startAnalytics() {
  const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js");
  getAnalytics(app);
}
const ck = store.get("cookies");
if (ck === "yes") startAnalytics(); else if (!ck) $("cookies").style.display = "grid";
$("ckYes").onclick = () => { store.set("cookies", "yes"); $("cookies").style.display = "none"; startAnalytics(); };
$("ckNo").onclick = () => { store.set("cookies", "no"); $("cookies").style.display = "none"; };
$("cookieLink").onclick = e => { e.preventDefault(); $("cookies").style.display = "grid"; };

/* ============ Catalogue ============ */
let cat = "all";
$("heroA").src = art("bottle", "#8FA9A6", "18 mg");
$("heroB").src = art("bottle", "#F2A93B", "6 mg");
$("chips").innerHTML = CATS.map(([id, l]) => `<button data-c="${id}" aria-pressed="${id === "all"}">${l}</button>`).join("");
$("chips").onclick = e => { const b = e.target.closest("button"); if (!b) return; cat = b.dataset.c;
  $("chips").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); renderShop(); };
["q", "sort", "onlyLight"].forEach(id => $(id).addEventListener("input", renderShop));
$("seeAll").onclick = () => $("catalogue").scrollIntoView();
$("seeLight").onclick = () => { $("onlyLight").checked = true; renderShop(); $("catalogue").scrollIntoView(); };

function renderShop() {
  const q = norm($("q").value.trim()), sort = $("sort").value, light = $("onlyLight").checked;
  let list = P.filter(p => (cat === "all" || p.cat === cat) && (!light || p.light) && (!q || norm(`${p.name} ${p.brand} ${p.desc}`).includes(q)));
  if (sort === "asc") list.sort((a, b) => minP(a) - minP(b)); else if (sort === "desc") list.sort((a, b) => minP(b) - minP(a));
  $("count").textContent = `${list.length} produit${list.length > 1 ? "s" : ""}`;
  $("shop").innerHTML = list.length ? list.map(p => {
    const multi = p.v.some(x => x.p !== p.v[0].p);
    return `<article class="card${p.light ? " light" : ""}">
      <div class="thumb"><img src="${img(p)}" alt="${esc(p.name)}" loading="lazy">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}</div>
      <div class="info"><p class="brand">${esc(p.brand)}</p><h3><button data-id="${p.id}">${esc(p.name)}</button></h3><p class="d">${esc(p.desc)}</p>
      <div class="foot"><span class="price">${multi ? "<small>dès</small>" : ""}${euro(minP(p))}</span><span class="more">${p.v.length > 1 ? p.v.length + " variantes" : ""}</span></div></div></article>`;
  }).join("") : `<p class="empty">Aucun produit ne correspond. Essaie un autre mot.</p>`;
}
$("shop").onclick = e => { const b = e.target.closest("button[data-id]"); if (b) openProduct(b.dataset.id); };
renderShop();

/* ============ Fiche produit ============ */
let cur = null;
const pDlg = $("pDlg");
function openProduct(id) {
  const p = byId[id];
  let vi = Math.max(0, p.v.findIndex(v => v.nic === p.defNic));
  cur = { p, vi, q: 1 };
  $("pBrand").textContent = p.brand; $("pName").textContent = p.name; $("pDesc").textContent = p.desc; $("pTip").textContent = TIPS[p.cat];
  const b = p.better && byId[p.better];
  $("pBetter").innerHTML = b ? `<div class="better"><img src="${img(b)}" alt=""><p><strong>Version plus légère</strong><br>${esc(b.name)}, dès ${euro(minP(b))}</p><button class="amber" data-b="${b.id}">Voir</button></div>` : "";
  paintProduct();
  if (!pDlg.open) pDlg.showModal();
}
function paintProduct() {
  const { p, vi, q } = cur, v = p.v[vi];
  $("pImg").src = img(p, v.c); $("pImg").alt = p.name;
  $("pVars").innerHTML = p.v.length > 1 ? p.v.map((x, i) => `<button data-i="${i}" aria-pressed="${i === vi}">${x.c ? `<i style="background:${x.c}"></i>` : ""}${esc(x.l)}</button>`).join("") : "";
  const n = $("pNudge"), high = v.nic >= 12;
  n.classList.toggle("on", high);
  n.textContent = high ? "Astuce : à 6 mg ou moins, tu réduis ta dépendance. Tu peux descendre par paliers." : "";
  $("pPrice").textContent = euro(v.p * q); $("qn").textContent = q;
}
$("pVars").onclick = e => { const b = e.target.closest("button"); if (b) { cur.vi = +b.dataset.i; paintProduct(); } };
$("qm").onclick = () => { cur.q = Math.max(1, cur.q - 1); paintProduct(); };
$("qp").onclick = () => { cur.q = Math.min(20, cur.q + 1); paintProduct(); };
$("pBetter").onclick = e => { const b = e.target.closest("button[data-b]"); if (b) openProduct(b.dataset.b); };
$("pClose").onclick = () => pDlg.close();
$("pAdd").onclick = () => {
  const { p, vi, q } = cur, line = cart.find(l => l.id === p.id && l.vi === vi);
  if (line) line.q = Math.min(20, line.q + q); else cart.push({ id: p.id, vi, q });
  saveCart(); toast("Ajouté au panier"); pDlg.close();
};
[pDlg, $("cartDlg"), $("authDlg")].forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
let tt; function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 1800); }

/* ============ Panier ============ */
let cart = [];
try { cart = JSON.parse(store.get("cart") || "[]"); } catch {}
cart = cart.filter(l => l && byId[l.id] && byId[l.id].v[l.vi] && l.q > 0);
function saveCart() { store.set("cart", JSON.stringify(cart)); $("cartN").textContent = cart.reduce((s, l) => s + l.q, 0); }
saveCart();
function renderCart() {
  const box = $("cartList"); $("cartErr").textContent = "";
  if (!cart.length) { box.innerHTML = `<p class="empty">Ton panier est vide.</p>`; return; }
  const sub = cart.reduce((s, l) => s + byId[l.id].v[l.vi].p * l.q, 0), ship = sub >= FREE_FROM ? 0 : SHIPPING;
  box.innerHTML = cart.map((l, i) => { const p = byId[l.id], v = p.v[l.vi];
    return `<div class="line"><img src="${img(p, v.c)}" alt=""><div>${esc(p.name)}<small>${p.v.length > 1 ? esc(v.l) + " · " : ""}${euro(v.p)}</small>
      <div class="qty"><button class="ghost" data-a="m" data-i="${i}" aria-label="Moins">−</button><span>${l.q}</span><button class="ghost" data-a="p" data-i="${i}" aria-label="Plus">+</button></div></div>
      <button class="ghost" data-a="x" data-i="${i}">Retirer</button></div>`; }).join("") +
    `<div class="bar2" aria-hidden="true"><span style="width:${Math.min(100, sub / FREE_FROM * 100)}%"></span></div>
     <p style="margin:0;font-size:.9rem">${sub >= FREE_FROM ? "Livraison offerte" : `Encore ${euro(FREE_FROM - sub)} pour la livraison offerte`}</p>
     <div class="sum"><div><span>Sous-total</span><span>${euro(sub)}</span></div><div><span>Livraison</span><span>${ship ? euro(ship) : "Offerte"}</span></div><div class="price"><span>Total</span><span>${euro(sub + ship)}</span></div></div>`;
}
$("cartList").onclick = e => { const b = e.target.closest("button[data-a]"); if (!b) return; const l = cart[+b.dataset.i], a = b.dataset.a;
  if (a === "x" || (a === "m" && l.q === 1)) cart.splice(+b.dataset.i, 1); else l.q = Math.min(20, l.q + (a === "p" ? 1 : -1));
  saveCart(); renderCart(); };
$("cartBtn").onclick = () => { renderCart(); $("cartDlg").showModal(); };
$("cartClose").onclick = () => $("cartDlg").close();
$("order").onclick = () => {
  if (!cart.length) { $("cartErr").textContent = "Ajoute un produit avant de commander."; return; }
  if (!auth.currentUser) { $("cartErr").textContent = "Connecte-toi pour commander."; return; }
  if (status !== "verified") { $("cartErr").textContent = "Ton identité doit d'abord être validée (voir « Mon compte »)."; return; }
  $("cartErr").textContent = "Le paiement n'est pas encore branché sur ce site.";
};

/* ============ Connexion ============ */
const errMsg = e => ({ "auth/invalid-credential": "Email ou mot de passe incorrect.", "auth/email-already-in-use": "Cet email a déjà un compte.",
  "auth/weak-password": "Mot de passe trop court (6 caractères min.).", "auth/invalid-email": "Email invalide.",
  "auth/popup-closed-by-user": "Connexion annulée." }[e.code] || "Erreur : " + (e.code || e.message));
const run = async fn => { $("authErr").textContent = ""; try { await fn(); $("authDlg").close(); } catch (e) { $("authErr").textContent = errMsg(e); } };
$("authBtn").onclick = () => auth.currentUser ? signOut(auth) : $("authDlg").showModal();
$("authClose").onclick = () => $("authDlg").close();
$("acctBtn").onclick = () => $("account").scrollIntoView();
$("doLogin").onclick = () => run(() => signInWithEmailAndPassword(auth, $("email").value.trim(), $("pwd").value));
$("doSignup").onclick = () => run(() => createUserWithEmailAndPassword(auth, $("email").value.trim(), $("pwd").value));
$("gBtn").onclick = () => run(() => signInWithPopup(auth, new GoogleAuthProvider()));
$("aBtn").onclick = () => run(() => signInWithPopup(auth, new OAuthProvider("apple.com")));

/* ============ Vérification d'identité ============ */
let unsubV = null, unsubAdmin = null;
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

/* ============ Dashboard admin ============ */
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
  $("acctBtn").classList.toggle("hidden", !user);
  $("admin").classList.add("hidden");
  if (!user) return;
  unsubV = onSnapshot(doc(db, "verifs", user.uid), s => renderAccount(user, s.data()));
  if (user.email === ADMIN_EMAIL && user.emailVerified) { $("admin").classList.remove("hidden"); watchAdmin(); }
});
