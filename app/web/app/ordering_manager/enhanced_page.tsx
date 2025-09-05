"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

// Type definitions for comprehensive inventory management
type Vendor = {
  id: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  delivery_schedule?: string;
  minimum_order_amount?: number;
  is_active: boolean;
  notes?: string;
};

type InventoryCategory = {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
};

type InventoryItem = {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category_id?: string;
  primary_vendor_id?: string;
  unit_of_measure: string;
  package_size?: string;
  cost_per_unit?: number;
  current_stock: number;
  minimum_stock: number;
  reorder_point: number;
  storage_requirements?: string;
  photo_url?: string;
  is_active: boolean;
  notes?: string;
  category?: InventoryCategory;
  vendor?: Vendor;
};

type VendorItem = {
  id: string;
  vendor_id: string;
  inventory_item_id: string;
  vendor_sku?: string;
  vendor_name?: string;
  vendor_unit_cost?: number;
  minimum_order_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
  vendor?: Vendor;
  inventory_item?: InventoryItem;
};

type OrderList = {
  id: string;
  name: string;
  description?: string;
  list_type: string;
  is_template: boolean;
  total_estimated_cost: number;
  notes?: string;
  created_at: string;
};

type OrderListItem = {
  id: string;
  order_list_id: string;
  inventory_item_id: string;
  vendor_id?: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  priority: number;
  notes?: string;
  inventory_item?: InventoryItem;
  vendor?: Vendor;
};

export default function OrderingManagerPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'vendors' | 'orders' | 'reports'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [vendorItems, setVendorItems] = useState<VendorItem[]>([]);
  const [orderLists, setOrderLists] = useState<OrderList[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);

  // Form states
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showOrderListForm, setShowOrderListForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingOrderList, setEditingOrderList] = useState<OrderList | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadVendors(),
        loadCategories(),
        loadInventoryItems(),
        loadOrderLists(),
        loadLowStockItems()
      ]);
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    setVendors(data || []);
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("inventory_categories")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    setCategories(data || []);
  };

  const loadInventoryItems = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(`
        *,
        category:inventory_categories(*),
        vendor:vendors(*)
      `)
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    setInventoryItems(data || []);
  };

  const loadOrderLists = async () => {
    const { data, error } = await supabase
      .from("order_lists")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setOrderLists(data || []);
  };

  const loadLowStockItems = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(`
        *,
        category:inventory_categories(*),
        vendor:vendors(*)
      `)
      .lte("current_stock", "reorder_point")
      .eq("is_active", true)
      .order("current_stock");
    if (error) throw error;
    setLowStockItems(data || []);
  };

  // Filter inventory items based on search and filters
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesVendor = !selectedVendor || item.primary_vendor_id === selectedVendor;
    const matchesLowStock = !showLowStockOnly || item.current_stock <= item.reorder_point;
    
    return matchesSearch && matchesCategory && matchesVendor && matchesLowStock;
  });

  const saveVendor = async (vendorData: Partial<Vendor>) => {
    try {
      if (editingVendor) {
        const { error } = await supabase
          .from("vendors")
          .update(vendorData)
          .eq("id", editingVendor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vendors")
          .insert([vendorData]);
        if (error) throw error;
      }
      
      await loadVendors();
      setShowVendorForm(false);
      setEditingVendor(null);
    } catch (e: any) {
      setError(e?.message || "Failed to save vendor");
    }
  };

  const saveInventoryItem = async (itemData: Partial<InventoryItem>) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update(itemData)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert([{
            ...itemData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }]);
        if (error) throw error;
      }
      
      await loadInventoryItems();
      await loadLowStockItems();
      setShowItemForm(false);
      setEditingItem(null);
    } catch (e: any) {
      setError(e?.message || "Failed to save inventory item");
    }
  };

  const createOrderList = async (listData: Partial<OrderList>) => {
    try {
      const { error } = await supabase
        .from("order_lists")
        .insert([{
          ...listData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);
      if (error) throw error;
      
      await loadOrderLists();
      setShowOrderListForm(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create order list");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ordering system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ordering Manager</h1>
              <p className="text-gray-600">Comprehensive inventory and vendor management</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowVendorForm(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                + Add Vendor
              </button>
              <button
                onClick={() => setShowItemForm(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                + Add Item
              </button>
              <button
                onClick={() => setShowOrderListForm(true)}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                + Create Order List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Dashboard', icon: '📊' },
              { key: 'inventory', label: 'Inventory', icon: '📦' },
              { key: 'vendors', label: 'Vendors', icon: '🏪' },
              { key: 'orders', label: 'Order Lists', icon: '📝' },
              { key: 'reports', label: 'Reports', icon: '📈' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            lowStockItems={lowStockItems}
            totalItems={inventoryItems.length}
            totalVendors={vendors.length}
            totalOrderLists={orderLists.length}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            items={filteredItems}
            categories={categories}
            vendors={vendors}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedVendor={selectedVendor}
            setSelectedVendor={setSelectedVendor}
            showLowStockOnly={showLowStockOnly}
            setShowLowStockOnly={setShowLowStockOnly}
            onEditItem={(item) => {
              setEditingItem(item);
              setShowItemForm(true);
            }}
          />
        )}

        {activeTab === 'vendors' && (
          <VendorsTab
            vendors={vendors}
            onEditVendor={(vendor) => {
              setEditingVendor(vendor);
              setShowVendorForm(true);
            }}
          />
        )}

        {activeTab === 'orders' && (
          <OrderListsTab
            orderLists={orderLists}
            onEditOrderList={(list) => {
              setEditingOrderList(list);
              setShowOrderListForm(true);
            }}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            inventoryItems={inventoryItems}
            lowStockItems={lowStockItems}
            vendors={vendors}
          />
        )}
      </div>

      {/* Modals */}
      {showVendorForm && (
        <VendorFormModal
          vendor={editingVendor}
          onSave={saveVendor}
          onClose={() => {
            setShowVendorForm(false);
            setEditingVendor(null);
          }}
        />
      )}

      {showItemForm && (
        <InventoryItemFormModal
          item={editingItem}
          categories={categories}
          vendors={vendors}
          onSave={saveInventoryItem}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {showOrderListForm && (
        <OrderListFormModal
          orderList={editingOrderList}
          onSave={createOrderList}
          onClose={() => {
            setShowOrderListForm(false);
            setEditingOrderList(null);
          }}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ lowStockItems, totalItems, totalVendors, totalOrderLists }: {
  lowStockItems: InventoryItem[];
  totalItems: number;
  totalVendors: number;
  totalOrderLists: number;
}) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">🏪</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{totalVendors}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Order Lists</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrderLists}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-4">🚨 Low Stock Alert</h3>
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <span className="text-red-700">{item.name}</span>
                <span className="text-red-600 font-semibold">
                  {item.current_stock} {item.unit_of_measure} (Need: {item.reorder_point})
                </span>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <p className="text-red-600 font-medium">+{lowStockItems.length - 5} more items</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inventory Tab Component
function InventoryTab({ 
  items, 
  categories, 
  vendors, 
  searchTerm, 
  setSearchTerm, 
  selectedCategory, 
  setSelectedCategory,
  selectedVendor,
  setSelectedVendor,
  showLowStockOnly,
  setShowLowStockOnly,
  onEditItem 
}: {
  items: InventoryItem[];
  categories: InventoryCategory[];
  vendors: Vendor[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedVendor: string;
  setSelectedVendor: (vendor: string) => void;
  showLowStockOnly: boolean;
  setShowLowStockOnly: (show: boolean) => void;
  onEditItem: (item: InventoryItem) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
            />
            <span>Low Stock Only</span>
          </label>

          <div className="text-sm text-gray-600">
            Showing {items.length} items
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <button
                onClick={() => onEditItem(item)}
                className="text-blue-500 hover:text-blue-700"
              >
                ✏️
              </button>
            </div>
            
            {item.photo_url && (
              <img 
                src={item.photo_url} 
                alt={item.name}
                className="w-full h-32 object-cover rounded mb-4"
              />
            )}
            
            <div className="space-y-2 text-sm">
              <p><strong>SKU:</strong> {item.sku || 'N/A'}</p>
              <p><strong>Category:</strong> {item.category?.name || 'N/A'}</p>
              <p><strong>Vendor:</strong> {item.vendor?.name || 'N/A'}</p>
              <p><strong>Current Stock:</strong> 
                <span className={item.current_stock <= item.reorder_point ? 'text-red-600 font-semibold' : ''}>
                  {item.current_stock} {item.unit_of_measure}
                </span>
              </p>
              <p><strong>Reorder Point:</strong> {item.reorder_point} {item.unit_of_measure}</p>
              <p><strong>Cost per Unit:</strong> ${item.cost_per_unit?.toFixed(2) || '0.00'}</p>
              {item.storage_requirements && (
                <p><strong>Storage:</strong> {item.storage_requirements}</p>
              )}
            </div>

            {item.current_stock <= item.reorder_point && (
              <div className="mt-4 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded">
                ⚠️ Low Stock - Reorder needed
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Vendors Tab Component
function VendorsTab({ vendors, onEditVendor }: {
  vendors: Vendor[];
  onEditVendor: (vendor: Vendor) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg">{vendor.name}</h3>
              <button
                onClick={() => onEditVendor(vendor)}
                className="text-blue-500 hover:text-blue-700"
              >
                ✏️
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              {vendor.company_name && <p><strong>Company:</strong> {vendor.company_name}</p>}
              {vendor.contact_person && <p><strong>Contact:</strong> {vendor.contact_person}</p>}
              {vendor.email && <p><strong>Email:</strong> {vendor.email}</p>}
              {vendor.phone && <p><strong>Phone:</strong> {vendor.phone}</p>}
              {vendor.payment_terms && <p><strong>Terms:</strong> {vendor.payment_terms}</p>}
              {vendor.delivery_schedule && <p><strong>Delivery:</strong> {vendor.delivery_schedule}</p>}
              {vendor.minimum_order_amount && (
                <p><strong>Min Order:</strong> ${vendor.minimum_order_amount}</p>
              )}
            </div>

            {vendor.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                <strong>Notes:</strong> {vendor.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Order Lists Tab Component
function OrderListsTab({ orderLists, onEditOrderList }: {
  orderLists: OrderList[];
  onEditOrderList: (list: OrderList) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orderLists.map((list) => (
          <div key={list.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg">{list.name}</h3>
              <button
                onClick={() => onEditOrderList(list)}
                className="text-blue-500 hover:text-blue-700"
              >
                ✏️
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <p><strong>Type:</strong> {list.list_type}</p>
              <p><strong>Est. Cost:</strong> ${list.total_estimated_cost.toFixed(2)}</p>
              <p><strong>Template:</strong> {list.is_template ? 'Yes' : 'No'}</p>
              <p><strong>Created:</strong> {new Date(list.created_at).toLocaleDateString()}</p>
            </div>

            {list.description && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                {list.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Reports Tab Component  
function ReportsTab({ inventoryItems, lowStockItems, vendors }: {
  inventoryItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  vendors: Vendor[];
}) {
  const totalValue = inventoryItems.reduce((sum, item) => 
    sum + (item.current_stock * (item.cost_per_unit || 0)), 0
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg mb-4">📊 Inventory Summary</h3>
          <div className="space-y-2">
            <p>Total Items: {inventoryItems.length}</p>
            <p>Total Value: ${totalValue.toFixed(2)}</p>
            <p>Low Stock Items: {lowStockItems.length}</p>
            <p>Active Vendors: {vendors.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg mb-4">⚠️ Reorder Alerts</h3>
          <div className="space-y-1">
            {lowStockItems.slice(0, 5).map((item) => (
              <p key={item.id} className="text-sm text-red-600">
                {item.name}: {item.current_stock} left
              </p>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg mb-4">🏪 Top Vendors</h3>
          <div className="space-y-1">
            {vendors.slice(0, 5).map((vendor) => (
              <p key={vendor.id} className="text-sm">
                {vendor.name}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Vendor Form Modal
function VendorFormModal({ vendor, onSave, onClose }: {
  vendor: Vendor | null;
  onSave: (data: Partial<Vendor>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    company_name: vendor?.company_name || '',
    contact_person: vendor?.contact_person || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || '',
    payment_terms: vendor?.payment_terms || '',
    delivery_schedule: vendor?.delivery_schedule || '',
    minimum_order_amount: vendor?.minimum_order_amount || 0,
    notes: vendor?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {vendor ? 'Edit Vendor' : 'Add New Vendor'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Vendor Name *"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
          
          <input
            type="text"
            placeholder="Company Name"
            value={formData.company_name}
            onChange={(e) => setFormData({...formData, company_name: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <input
            type="text"
            placeholder="Contact Person"
            value={formData.contact_person}
            onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <textarea
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
          />
          
          <input
            type="text"
            placeholder="Payment Terms (e.g., Net 30)"
            value={formData.payment_terms}
            onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <input
            type="text"
            placeholder="Delivery Schedule"
            value={formData.delivery_schedule}
            onChange={(e) => setFormData({...formData, delivery_schedule: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <input
            type="number"
            placeholder="Minimum Order Amount"
            value={formData.minimum_order_amount}
            onChange={(e) => setFormData({...formData, minimum_order_amount: parseFloat(e.target.value) || 0})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <textarea
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
          />
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            >
              {vendor ? 'Update' : 'Create'} Vendor
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inventory Item Form Modal
function InventoryItemFormModal({ item, categories, vendors, onSave, onClose }: {
  item: InventoryItem | null;
  categories: InventoryCategory[];
  vendors: Vendor[];
  onSave: (data: Partial<InventoryItem>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    sku: item?.sku || '',
    category_id: item?.category_id || '',
    primary_vendor_id: item?.primary_vendor_id || '',
    unit_of_measure: item?.unit_of_measure || '',
    package_size: item?.package_size || '',
    cost_per_unit: item?.cost_per_unit || 0,
    current_stock: item?.current_stock || 0,
    minimum_stock: item?.minimum_stock || 0,
    reorder_point: item?.reorder_point || 0,
    storage_requirements: item?.storage_requirements || '',
    photo_url: item?.photo_url || '',
    notes: item?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {item ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Item Name *"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            />
            
            <input
              type="text"
              placeholder="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({...formData, sku: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            <select
              value={formData.primary_vendor_id}
              onChange={(e) => setFormData({...formData, primary_vendor_id: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Unit of Measure *"
              value={formData.unit_of_measure}
              onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            />
            
            <input
              type="text"
              placeholder="Package Size"
              value={formData.package_size}
              onChange={(e) => setFormData({...formData, package_size: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            
            <input
              type="number"
              step="0.01"
              placeholder="Cost per Unit"
              value={formData.cost_per_unit}
              onChange={(e) => setFormData({...formData, cost_per_unit: parseFloat(e.target.value) || 0})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Current Stock"
              value={formData.current_stock}
              onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            
            <input
              type="number"
              placeholder="Minimum Stock"
              value={formData.minimum_stock}
              onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value) || 0})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            
            <input
              type="number"
              placeholder="Reorder Point"
              value={formData.reorder_point}
              onChange={(e) => setFormData({...formData, reorder_point: parseInt(e.target.value) || 0})}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          
          <input
            type="text"
            placeholder="Storage Requirements"
            value={formData.storage_requirements}
            onChange={(e) => setFormData({...formData, storage_requirements: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <input
            type="url"
            placeholder="Photo URL"
            value={formData.photo_url}
            onChange={(e) => setFormData({...formData, photo_url: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          
          <textarea
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
          />
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
            >
              {item ? 'Update' : 'Create'} Item
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Order List Form Modal
function OrderListFormModal({ orderList, onSave, onClose }: {
  orderList: OrderList | null;
  onSave: (data: Partial<OrderList>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: orderList?.name || '',
    description: orderList?.description || '',
    list_type: orderList?.list_type || 'custom',
    is_template: orderList?.is_template || false,
    notes: orderList?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">
          {orderList ? 'Edit Order List' : 'Create New Order List'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="List Name *"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
          
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
          />
          
          <select
            value={formData.list_type}
            onChange={(e) => setFormData({...formData, list_type: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="custom">Custom</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="emergency">Emergency</option>
            <option value="seasonal">Seasonal</option>
          </select>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_template}
              onChange={(e) => setFormData({...formData, is_template: e.target.checked})}
            />
            <span>Save as template</span>
          </label>
          
          <textarea
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
          />
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600"
            >
              {orderList ? 'Update' : 'Create'} List
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
