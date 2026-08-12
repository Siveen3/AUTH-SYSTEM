const carts = new Map();

function createCart(userId) {
    if (!carts.has(userId)) {
        carts.set(userId, []);
    }
    return carts.get(userId);
}

function getCart(userId) {
    return createCart(userId);
}

function addItemToCart(userId, item) {
    const cart = createCart(userId);
    const existing = cart.find(entry => entry.productId === item.productId);

    if (existing) {
        existing.quantity += item.quantity;
    } else {
        cart.push({ productId: item.productId, quantity: item.quantity });
    }

    return cart;
}

function removeItemFromCart(userId, productId) {
    const cart = createCart(userId);
    const filtered = cart.filter(entry => entry.productId !== productId);
    carts.set(userId, filtered);
    return filtered;
}

function clearCart(userId) {
    carts.set(userId, []);
    return [];
}

module.exports = {
    getCart,
    addItemToCart,
    removeItemFromCart,
    clearCart
};
