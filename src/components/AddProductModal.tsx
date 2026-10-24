import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Plus, Check } from 'lucide-react';
import { Product, ProductCategory } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  editingProduct?: Product | null;
}

const QUICK_CATEGORIES: { name: ProductCategory; color: string }[] = [
  { name: 'Dairy', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' },
  { name: 'Snacks', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200' },
  { name: 'Beverages', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200' },
  { name: 'Personal Care', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' },
  { name: 'Household', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200' },
  { name: 'Grocery', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' },
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  editingProduct,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(editingProduct?.name || '');
  const [category, setCategory] = useState<ProductCategory>(editingProduct?.category || 'Grocery');
  const [purchasePrice, setPurchasePrice] = useState(editingProduct?.purchasePrice?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(editingProduct?.sellingPrice?.toString() || '');
  const [stock, setStock] = useState(editingProduct?.stock?.toString() || '');
  const [unit, setUnit] = useState(editingProduct?.unit || 'pack');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const qty = parseInt(stock, 10) || 0;

    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `p-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      category,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      stock: qty,
      lowStockThreshold: 15,
      unit,
    };

    onAddProduct(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingProduct ? 'Update product pricing and stock count' : 'Add a new product to your inventory'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body: 2 Columns matching top-right screen */}
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Form (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Product Name
              </label>
              <input
                type="text"
                required
                placeholder="Enter product name (e.g. Amul Butter 500g)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
              >
                <option value="Dairy">Dairy</option>
                <option value="Snacks">Snacks</option>
                <option value="Beverages">Beverages</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Household">Household</option>
                <option value="Grocery">Grocery</option>
                <option value="Spices">Spices</option>
                <option value="Bakery">Bakery</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Purchase Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="Enter purchase price"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Selling Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="Enter selling price"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="Enter stock quantity"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* Green Add Product Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{editingProduct ? 'Update Product' : '+ Add Product'}</span>
            </button>
          </div>

          {/* Right Column: Product Image & Quick Categories (5 cols) (Exact as screenshot) */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Product Image
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-600/60 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 mb-2">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Click to upload image</p>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
              </div>
            </div>

            {/* Quick Categories */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Quick Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.name;

                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : `${cat.color}`
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Note:</span> Products added here will immediately appear in the Billing search and Inventory stock list.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
