const MEDICAL_PRODUCTS = [
    {
        id: 'med-001',
        name: 'ProCare Pain Relief',
        description: 'Fast-acting pain relief capsules for everyday aches.',
        price: 12.99,
        stock: 38,
        category: 'Pain Relief'
    },
    {
        id: 'med-002',
        name: 'CardioMax Capsules',
        description: 'Supports healthy heart and circulation.',
        price: 24.95,
        stock: 22,
        category: 'Heart Health'
    },
    {
        id: 'med-003',
        name: 'AllerGuard Tablets',
        description: 'Non-drowsy allergy relief for seasonal symptoms.',
        price: 15.5,
        stock: 45,
        category: 'Allergy'
    },
    {
        id: 'med-004',
        name: 'SkinRenew Cream',
        description: 'Hydrating cream for dry and sensitive skin.',
        price: 18.75,
        stock: 30,
        category: 'Skincare'
    }
];

function getAllProducts() {
    return MEDICAL_PRODUCTS.map(product => ({ ...product }));
}

function getProductById(productId) {
    return MEDICAL_PRODUCTS.find(product => product.id === productId) || null;
}

module.exports = {
    getAllProducts,
    getProductById
};
