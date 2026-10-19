const STORAGE_KEY = "store_items";

let inventory = safeParseInventory(localStorage.getItem(STORAGE_KEY));
let currentEditId = null;

const form = document.getElementById("productForm");
const container = document.getElementById("productContainer");
const emptyStateEl = document.getElementById("emptyState");
const cancelBtn = document.getElementById("cancelBtn");

const titleEl = document.getElementById("title");
const priceEl = document.getElementById("price");
const categoryEl = document.getElementById("category");
const imageEl = document.getElementById("image");
const submitBtn = document.getElementById("submitBtn");

const searchBar = document.getElementById("searchBar");
const catFilter = document.getElementById("catFilter");
const priceSort = document.getElementById("priceSort");

const PLACEHOLDER_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
      <rect width='160' height='160' fill='#eee'/>
      <path d='M0 120 C40 90, 70 150, 110 110 S160 120, 160 120 V160 H0 Z' fill='#ddd'/>
      <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' fill='#666' font-family='Arial' font-size='16'>No image</text>
    </svg>
  `);

function safeParseInventory(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeItem(raw) {
  const name = String(raw?.name ?? "").trim();
  const cat = String(raw?.cat ?? "").trim();

  const price = Number(raw?.price);
  const priceSafe = Number.isFinite(price) ? price : NaN;

  let img = String(raw?.img ?? "").trim();
  if (!img || (!/^https?:\/\//i.test(img) && !img.startsWith("data:"))) img = "";

  return {
    id: raw?.id ?? Date.now(),
    name,
    price: priceSafe,
    cat,
    img: img || PLACEHOLDER_IMG,
  };
}

function setEditingMode(editId) {
  currentEditId = editId;
  const isEditing = Boolean(editId);
  submitBtn.textContent = isEditing ? "Update Product" : "Save Product";
  cancelBtn.hidden = !isEditing;
}

function resetFormToCreateMode() {
  currentEditId = null;
  setEditingMode(null);
  form.reset();
}

function escapeHtml(str) {
  const s = String(str);
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const normalized = normalizeItem({
    id: currentEditId || Date.now(),
    name: titleEl.value,
    price: priceEl.value,
    cat: categoryEl.value,
    img: imageEl.value,
  });

  if (!normalized.name) {
    alert("Please enter a valid product name.");
    titleEl.focus();
    return;
  }

  if (!Number.isFinite(normalized.price) || normalized.price < 0) {
    alert("Please enter a valid non-negative price.");
    priceEl.focus();
    return;
  }

  if (currentEditId) {
    inventory = inventory.map((item) =>
      item.id === currentEditId ? normalized : item
    );
  } else {
    inventory.push(normalized);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  resetFormToCreateMode();
  renderItems();
});

cancelBtn.addEventListener("click", () => {
  resetFormToCreateMode();
  renderItems();
});

function getFilters() {
  const searchTerm = String(searchBar.value || "").toLowerCase().trim();
  const catTerm = String(catFilter.value || "").toLowerCase().trim();
  const sortMode = priceSort.value;
  return { searchTerm, catTerm, sortMode };
}

function renderItems() {
  container.innerHTML = "";

  const { searchTerm, catTerm, sortMode } = getFilters();

  const viewList = inventory.filter((i) => {
    const name = String(i?.name ?? "").toLowerCase();
    const cat = String(i?.cat ?? "").toLowerCase();
    return name.includes(searchTerm) && cat.includes(catTerm);
  });

  if (sortMode === "asc") viewList.sort((a, b) => a.price - b.price);
  if (sortMode === "desc") viewList.sort((a, b) => b.price - a.price);

  if (viewList.length === 0) {
    emptyStateEl.hidden = false;
    return;
  }

  emptyStateEl.hidden = true;

  const fragment = document.createDocumentFragment();

  viewList.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.dataset.id = String(item.id);

    const imgAlt = `Product image: ${item.name}`;
    const catText = item.cat ? item.cat : "Uncategorized";

    card.innerHTML = `
      <img src="${item.img}" alt="${escapeHtml(imgAlt)}" loading="lazy" />
      <div class="item-info">
        <h3>${escapeHtml(item.name)}</h3>
        <p>₹${Number(item.price).toLocaleString()} | <span>${escapeHtml(catText)}</span></p>
      </div>
      <div class="actions">
        <button type="button" class="edit-btn" data-action="edit">Edit</button>
        <button type="button" class="del-btn" data-action="delete">Delete</button>
      </div>
    `;

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

container.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const card = e.target.closest(".item-card");
  if (!card) return;

  const id = Number(card.dataset.id);
  const action = btn.dataset.action;

  if (action === "delete") {
    inventory = inventory.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    renderItems();
  } else if (action === "edit") {
    const item = inventory.find((i) => i.id === id);
    if (!item) return;

    titleEl.value = item.name ?? "";
    priceEl.value = Number(item.price ?? "");
    categoryEl.value = item.cat ?? "";
    imageEl.value =
      item.img && item.img.startsWith("data:") ? "" : item.img ?? "";

    setEditingMode(id);
    window.scrollTo(0, 0);
  }
});

[searchBar, catFilter, priceSort].forEach((el) => {
  el.addEventListener("input", renderItems);
  el.addEventListener("change", renderItems);
});

renderItems();

