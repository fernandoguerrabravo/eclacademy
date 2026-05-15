// ===== COURSE DATA =====
const courses = [
    {
        id: 1,
        title: "Cumplimiento Aduanero para Amazon Sellers",
        price: 297,
        originalPrice: 497,
        icon: "fas fa-boxes-packing",
        category: "Aduanas & Logística"
    },
    {
        id: 2,
        title: "Regulaciones FDA: Guía Completa",
        price: 247,
        originalPrice: 397,
        icon: "fas fa-prescription-bottle-medical",
        category: "Regulaciones"
    },
    {
        id: 3,
        title: "Gestión Fintech y Contabilidad Internacional",
        price: 197,
        originalPrice: 347,
        icon: "fas fa-money-bill-transfer",
        category: "Finanzas"
    },
    {
        id: 4,
        title: "Cumplimiento USDA para Exportadores",
        price: 197,
        originalPrice: 297,
        icon: "fas fa-seedling",
        category: "Regulaciones"
    },
    {
        id: 5,
        title: "Logística Internacional & FBA",
        price: 297,
        originalPrice: 447,
        icon: "fas fa-truck-fast",
        category: "Logística"
    },
    {
        id: 6,
        title: "Tratados de Libre Comercio & Beneficios Arancelarios",
        price: 147,
        originalPrice: 247,
        icon: "fas fa-file-contract",
        category: "Comercio Internacional"
    }
];

// ===== CART STATE =====
let cart = JSON.parse(localStorage.getItem('eclCart')) || [];

// ===== DOM ELEMENTS =====
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartFooter = document.getElementById('cartFooter');
const cartTotal = document.getElementById('cartTotal');
const navbar = document.getElementById('navbar');
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

// ===== CART FUNCTIONS =====
function addToCart(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // Check if already in cart
    if (cart.find(item => item.id === courseId)) {
        showNotification('Este curso ya está en tu carrito', 'warning');
        openCart();
        return;
    }

    cart.push(course);
    saveCart();
    updateCartUI();
    showNotification(`"${course.title}" agregado al carrito`, 'success');
    openCart();
}

function removeFromCart(courseId) {
    cart = cart.filter(item => item.id !== courseId);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('eclCart', JSON.stringify(cart));
}

function updateCartUI() {
    // Update count
    cartCount.textContent = cart.length;
    cartCount.style.display = cart.length > 0 ? 'flex' : 'none';

    // Update cart items
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>Tu carrito está vacío</p>
            </div>
        `;
        cartFooter.style.display = 'none';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-icon">
                    <i class="${item.icon}"></i>
                </div>
                <div class="cart-item-info">
                    <h4>${item.title}</h4>
                    <span>$${item.price}</span>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Eliminar ${item.title}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        cartFooter.style.display = 'block';

        // Update total
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        cartTotal.textContent = `$${total}`;
    }
}

function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function checkout() {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const courseNames = cart.map(c => c.title).join(', ');
    alert(`¡Gracias por tu compra!\n\nCursos: ${courseNames}\nTotal: $${total}\n\nSerás redirigido al procesador de pagos.`);
    cart = [];
    saveCart();
    updateCartUI();
    closeCart();
}

// ===== NOTIFICATION =====
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    // Styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '90px',
        right: '24px',
        background: type === 'success' ? '#10b981' : '#f59e0b',
        color: 'white',
        padding: '14px 24px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.9rem',
        fontWeight: '500',
        zIndex: '3000',
        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        transform: 'translateX(120%)',
        transition: 'transform 0.3s ease'
    });

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== EVENT LISTENERS =====
cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Close mobile menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// Contact form
document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    showNotification('¡Mensaje enviado! Te contactaremos pronto.', 'success');
    e.target.reset();
});

// Keyboard accessibility for cart
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartSidebar.classList.contains('active')) {
        closeCart();
    }
});

// Initialize cart UI on load
updateCartUI();
