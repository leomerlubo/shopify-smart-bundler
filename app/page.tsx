"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Product = { sku: string; title: string; brand: string; type: string; price: number; image: string };
type Item = Product & { quantity: number };
type Draft = { id: string; sku: string; title: string; brand: string; items: Item[]; price: number; source: string };
type View = "home" | "create" | "bulk" | "drafts";

const PRODUCTS: Product[] = [
  { sku: "PYE22KYNFS", title: "GE Profile French Door Refrigerator", brand: "GE", type: "Refrigerator", price: 2499, image: "RF" },
  { sku: "PSS93YPFS", title: "GE Profile Smart Slide In Range", brand: "GE", type: "Range", price: 1899, image: "RG" },
  { sku: "PDT755SYRFS", title: "GE Profile Smart Dishwasher", brand: "GE", type: "Dishwasher", price: 1099, image: "DW" },
  { sku: "GFW655SSVWW", title: "GE Front Load Washer", brand: "GE", type: "Washer", price: 899, image: "WA" },
  { sku: "GFD65ESSVWW", title: "GE Smart Electric Dryer", brand: "GE", type: "Dryer", price: 899, image: "DR" },
  { sku: "RF29BB8600AP", title: "Samsung Bespoke French Door Refrigerator", brand: "Samsung", type: "Refrigerator", price: 2799, image: "RF" }
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const randomId = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const signature = (items: Item[]) => items.map(item => `${item.sku}:${item.quantity}`).sort().join("|");

function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [connected, setConnected] = useState(false);
  const [shop, setShop] = useState("");
  const [brand, setBrand] = useState("GE");
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [notice, setNotice] = useState("");
  const [imageDraft, setImageDraft] = useState<Draft | null>(null);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1" && params.get("shop")) {
      setShop(params.get("shop") || "");
      setConnected(true);
      setNotice("Shopify store connected successfully.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3200); }
  function addProduct(product: Product) { if (items.some(item => item.sku === product.sku) || items.length >= 7) return; const next = [...items, { ...product, quantity: 1 }]; setItems(next); setBrand(product.brand); setTitle(`${product.brand} ${next.length} Piece Appliance Package`); setPrice(String(next.reduce((sum, item) => sum + item.price, 0))); }
  function saveDraft(nextItems = items, nextBrand = brand, nextTitle = title, nextPrice = Number(price || total), source = "Manual") {
    if (!nextItems.length) return flash("Add at least one product first.");
    if (drafts.some(draft => signature(draft.items) === signature(nextItems))) return flash("This product combination already exists in Drafts.");
    const code = nextBrand === "Samsung" ? "SAM" : nextBrand.slice(0, 3).toUpperCase();
    const pieces = nextItems.reduce((sum, item) => sum + item.quantity, 0);
    setDrafts(current => [{ id: crypto.randomUUID(), sku: `BNDL${code}${pieces}P${randomId()}`, title: nextTitle || `${nextBrand} Appliance Package`, brand: nextBrand, items: nextItems, price: nextPrice, source }, ...current]);
    setView("drafts"); flash("Bundle saved as a draft. Add its image before publishing.");
  }
  function template() {
    const headers = ["Main Brand", "Bundle Title", "SKU 1", "Quantity 1", "SKU 2", "Quantity 2", "SKU 3", "Quantity 3", "Bundle Price", "Notes"];
    const sample = ["GE", "GE Laundry Pair", "GFW655SSVWW", "1", "GFD65ESSVWW", "1", "", "", "1699", "Create image before publishing"];
    const blob = new Blob([[headers, sample].map(row => row.map(value => `"${value}"`).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "bundle-upload-template.csv"; link.click(); URL.revokeObjectURL(link.href);
  }
  async function uploadCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const rows = parseCsv(await file.text()); if (rows.length < 2) return flash("No bundle rows were found.");
    const headers = rows[0].map(header => header.toLowerCase()); const index = (name: string) => headers.indexOf(name.toLowerCase());
    let imported = 0;
    rows.slice(1).forEach((row, rowIndex) => {
      const value = (name: string) => row[index(name)]?.trim() || ""; const rowItems: Item[] = [];
      for (let i = 1; i <= 3; i++) { const sku = value(`SKU ${i}`).toUpperCase(); if (!sku) continue; const product = PRODUCTS.find(item => item.sku === sku); if (product) rowItems.push({ ...product, quantity: Math.max(1, Number(value(`Quantity ${i}`) || 1)) }); }
      if (!rowItems.length) return; const rowBrand = value("Main Brand") || rowItems[0].brand; const rowPrice = Number(value("Bundle Price")) || rowItems.reduce((sum, item) => sum + item.price * item.quantity, 0); const code = rowBrand === "Samsung" ? "SAM" : rowBrand.slice(0, 3).toUpperCase(); const pieces = rowItems.reduce((sum, item) => sum + item.quantity, 0);
      setDrafts(current => [{ id: `${Date.now()}-${rowIndex}`, sku: `BNDL${code}${pieces}P${randomId()}`, title: value("Bundle Title") || `${rowBrand} Appliance Package`, brand: rowBrand, items: rowItems, price: rowPrice, source: "CSV" }, ...current]); imported++;
    });
    setView("drafts"); flash(`${imported} bundle draft${imported === 1 ? "" : "s"} imported.`);
  }

  if (!connected) return <main className="connect"><section><div className="logo">B</div><p className="eyebrow">SHOPIFY SMART BUNDLER</p><h1>Create product bundles from items already in your Shopify store.</h1><p>Connect securely through Shopify, select component SKUs, generate bundle details, and prepare product images.</p><label>Shopify store domain<input value={shop} onChange={event => setShop(event.target.value)} placeholder="your-store.myshopify.com" /></label><button className="primary" onClick={() => { if (!shop) return flash("Enter your Shopify store domain."); window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(shop)}`; }}>Sign in with Shopify</button><button className="preview" onClick={() => setConnected(true)}>Explore with sample products</button>{notice && <div className="toast">{notice}</div>}</section></main>;

  return <main><header><button className="brand" onClick={() => setView("home")}><b>B</b><span>Smart Bundler<small>for Shopify</small></span></button><nav>{(["home", "create", "bulk", "drafts"] as View[]).map(item => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "bulk" ? "Bulk upload" : item[0].toUpperCase() + item.slice(1)}</button>)}</nav><span className="store">● Connected store</span></header>{notice && <div className="toast">{notice}</div>}
    {view === "home" && <section className="workspace"><div className="heading"><div><p className="eyebrow">BUNDLE WORKSPACE</p><h1>Build Shopify bundles faster</h1><p>Create them individually or import component SKUs in bulk.</p></div><button className="primary" onClick={() => setView("create")}>＋ Create bundle</button></div><div className="stats"><article><span>Bundle drafts</span><strong>{drafts.length}</strong></article><article><span>Ready for images</span><strong>{drafts.length}</strong></article><article><span>Published</span><strong>0</strong></article></div><div className="actions"><button onClick={() => setView("create")}><b>＋</b><span><strong>Create bundle</strong><small>Select existing Shopify products</small></span></button><button onClick={() => setView("bulk")}><b>⇧</b><span><strong>Bulk upload CSV</strong><small>Import multiple SKU combinations</small></span></button><button onClick={() => setView("drafts")}><b>▧</b><span><strong>Drafts and images</strong><small>Finish imported bundles</small></span></button></div></section>}
    {view === "create" && <section className="workspace"><div className="heading"><div><p className="eyebrow">CREATE</p><h1>Create a bundle</h1><p>Choose up to seven existing products.</p></div></div><div className="createGrid"><article className="panel"><label>Main brand<select value={brand} onChange={event => setBrand(event.target.value)}><option>GE</option><option>Samsung</option></select></label><h2>Shopify products</h2><div className="products">{PRODUCTS.map(product => <button key={product.sku} disabled={items.some(item => item.sku === product.sku)} onClick={() => addProduct(product)}><i>{product.image}</i><span><strong>{product.title}</strong><small>{product.sku} · {money.format(product.price)}</small></span><b>{items.some(item => item.sku === product.sku) ? "✓" : "+"}</b></button>)}</div></article><aside className="panel"><p className="eyebrow">BUNDLE DETAILS</p><label>Bundle title<input value={title} onChange={event => setTitle(event.target.value)} /></label><label>Bundle price<input type="number" value={price} onChange={event => setPrice(event.target.value)} /></label><div className="selected">{items.map(item => <span key={item.sku}>{item.sku}<button onClick={() => setItems(current => current.filter(row => row.sku !== item.sku))}>×</button></span>)}</div><p>Combined price <strong>{money.format(total)}</strong></p><button className="primary wide" onClick={() => saveDraft()}>Save as draft</button></aside></div></section>}
    {view === "bulk" && <section className="workspace"><div className="heading"><div><p className="eyebrow">BULK CREATE</p><h1>Upload bundles by CSV</h1><p>Every valid row becomes a draft and receives a generated BNDL SKU.</p></div><button className="secondary" onClick={template}>↓ Download template</button></div><article className="panel upload"><div><b>1</b><h2>Download and complete the template</h2><p>Add the main brand, bundle title, component SKUs, quantities, price, and notes.</p><button className="secondary" onClick={template}>Download CSV template</button></div><label><input type="file" accept=".csv,text/csv" onChange={uploadCsv} /><span>⇧</span><strong>Choose a completed CSV file</strong><small>Uploaded bundles remain drafts until their images are created.</small></label></article></section>}
    {view === "drafts" && <section className="workspace"><div className="heading"><div><p className="eyebrow">DRAFTS</p><h1>Bundle drafts</h1><p>Create the product image, review the details, then publish to Shopify.</p></div><button className="secondary" onClick={() => setView("bulk")}>⇧ Bulk upload</button></div>{drafts.length ? <div className="drafts">{drafts.map(draft => <article className="panel" key={draft.id}><span className="badge">DRAFT · {draft.source}</span><h2>{draft.title}</h2><code>{draft.sku}</code><p>{draft.items.map(item => item.sku).join(" · ")}</p><strong>{money.format(draft.price)}</strong><button className="primary wide" onClick={() => setImageDraft(draft)}>▧ Create image</button></article>)}</div> : <article className="panel empty"><b>▧</b><h2>No drafts yet</h2><p>Create a bundle manually or upload your CSV template.</p></article>}</section>}
    {imageDraft && <div className="modal"><section><header><div><p className="eyebrow">IMAGE STUDIO</p><h2>{imageDraft.sku}</h2></div><button onClick={() => setImageDraft(null)}>×</button></header><div className="studio"><aside><h3>Shopify product images</h3><p>Images matched from each component SKU will appear here.</p>{imageDraft.items.map(item => <button key={item.sku}><i>{item.image}</i><span><strong>{item.sku}</strong><small>{item.type} · Main image</small></span><b>＋</b></button>)}<label className="imageUpload"><input type="file" accept="image/*" multiple /><span>⇧</span><strong>Upload additional images</strong></label></aside><div className="canvas"><b>Bundle image canvas</b><p>Select Shopify images or upload your own, then arrange them here.</p></div></div><footer><span>{imageDraft.items.length} Shopify images available</span><button className="primary" onClick={() => flash("Image editor controls will save this image to the bundle draft.")}>Save bundle image</button></footer></section></div>}
  </main>;
}
