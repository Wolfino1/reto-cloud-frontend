const API_BASE = 'https://j5rhha03ye.execute-api.us-east-1.amazonaws.com/Prod';

let products = [];
let cart = new Map();

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

async function loadProducts() {
  const container = document.getElementById('products-container');
  const errorBox = document.getElementById('products-error');
  container.innerHTML = '';
  errorBox.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    products = Array.isArray(data) ? data : [];
    renderProducts();
  } catch (err) {
    console.error('Error cargando productos:', err);
    errorBox.textContent = 'No se pudieron cargar los productos.';
    errorBox.classList.remove('hidden');
  }
}

function renderProducts() {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  if (!products.length) {
    container.innerHTML = '<p>No hay productos disponibles.</p>';
    return;
  }

  products.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';

    card.innerHTML = `
      <div class="product-image-wrapper">
        <img src="${p.image_url}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${formatPrice(p.price)}</div>
      <div class="product-actions">
        <button class="btn-secondary" data-action="remove" data-id="${p.id}">-</button>
        <button class="btn-primary" data-action="add" data-id="${p.id}">Añadir</button>
      </div>
    `;

    container.appendChild(card);
  });

  container.addEventListener('click', handleProductClick, { once: true });
}

function handleProductClick(event) {
  const btn = event.target.closest('button[data-action]');
  if (!btn) {
    event.currentTarget.addEventListener('click', handleProductClick, { once: true });
    return;
  }

  const id = Number(btn.dataset.id);
  const product = products.find(p => p.id === id);
  if (!product) {
    event.currentTarget.addEventListener('click', handleProductClick, { once: true });
    return;
  }

  const action = btn.dataset.action;
  if (action === 'add') {
    addToCart(product);
  } else if (action === 'remove') {
    removeFromCart(product.id);
  }

  event.currentTarget.addEventListener('click', handleProductClick, { once: true });
}

function addToCart(product) {
  const existing = cart.get(product.id) || { product, qty: 0 };
  existing.qty += 1;
  cart.set(product.id, existing);
  renderCart();
}

function removeFromCart(productId) {
  const existing = cart.get(productId);
  if (!existing) return;
  existing.qty -= 1;
  if (existing.qty <= 0) {
    cart.delete(productId);
  } else {
    cart.set(productId, existing);
  }
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');

  container.innerHTML = '';

  if (!cart.size) {
    container.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
    totalEl.textContent = '$0.00';
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;

  cart.forEach(({ product, qty }) => {
    total += Number(product.price) * qty;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="cart-item-name">${product.name}</span>
      <span class="cart-item-qty">x${qty}</span>
    `;
    container.appendChild(row);
  });

  totalEl.textContent = formatPrice(total);
  checkoutBtn.disabled = false;
}

async function submitOrder() {
  const messageBox = document.getElementById('order-message');
  messageBox.classList.add('hidden');
  messageBox.textContent = '';

  if (!cart.size) return;

  const items = [];
  cart.forEach(({ product, qty }) => {
    items.push({ productId: product.id, quantity: qty });
  });

  try {
    const res = await fetch(`${API_BASE}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    cart.clear();
    renderCart();
    messageBox.textContent = `Pedido creado correctamente. Total: ${formatPrice(data.total || 0)}`;
    messageBox.className = 'message success';
  } catch (err) {
    console.error('Error creando pedido:', err);
    messageBox.textContent = 'Hubo un error al crear el pedido.';
    messageBox.className = 'message error';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.addEventListener('click', submitOrder);
});
