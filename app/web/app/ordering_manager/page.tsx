"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

// Types
type Vendor = {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  delivery_days: string[];
  cutoff_time: string;
  minimum_order?: number;
  notes?: string;
  status: 'active' | 'inactive';
  created_at?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  vendor_id?: string;
  unit_type: string;
  cost_per_unit: number;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  last_ordered?: string;
  last_count_date?: string;
  notes?: string;
  photo_url?: string;
  barcode?: string;
  storage_location?: string;
  created_at?: string;
};

type Order = {
  id: string;
  order_number: string;
  vendor_id: string;
  vendor_name?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'received' | 'cancelled';
  total_amount: number;
  order_date: string;
  expected_delivery?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  items: OrderItem[];
  created_at?: string;
};

type OrderItem = {
  id?: string;
  order_id?: string;
  inventory_item_id: string;
  item_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes?: string;
};

type InventoryCount = {
  id: string;
  list_name: string;
  assigned_to: string;
  assigned_to_name?: string;
  items: string[];
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string;
  notes?: string;
  created_at?: string;
  completed_at?: string;
};

export default function OrderingManagerPage() {
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'vendors' | 'orders' | 'counts'>('overview');
  
  // Data State - Initialize with fallback data for demo
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: '1',
      name: 'Mediterranean Fresh Foods',
      contact_person: 'John Doe',
      email: 'orders@medfresh.com',
      phone: '555-0123',
      address: '123 Supplier St, Food City',
      delivery_days: ['monday', 'wednesday', 'friday'],
      cutoff_time: '14:00',
      minimum_order: 150,
      status: 'active'
    }
  ]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Ground Lamb',
      category: 'Meat',
      unit_type: 'lbs',
      cost_per_unit: 8.50,
      current_stock: 15,
      minimum_stock: 20,
      maximum_stock: 100,
      storage_location: 'Walk-in Freezer A',
      vendor_id: '1'
    }
  ]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form State
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showCreateCount, setShowCreateCount] = useState(false);
  
  const [newVendor, setNewVendor] = useState({
    name: '', contact_person: '', email: '', phone: '', address: '',
    delivery_days: [] as string[], cutoff_time: '', minimum_order: 0, notes: ''
  });
  
  const [newItem, setNewItem] = useState({
    name: '', category: '', vendor_id: '', unit_type: '', cost_per_unit: 0,
    current_stock: 0, minimum_stock: 0, maximum_stock: 0, notes: '', storage_location: ''
  });
  
  const [newOrder, setNewOrder] = useState({
    vendor_id: '', order_date: new Date().toISOString().slice(0, 10),
    expected_delivery: '', notes: '', items: [] as OrderItem[]
  });
  
  const [newCount, setNewCount] = useState({
    list_name: '', assigned_to: '', items: [] as string[], due_date: '', notes: ''
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to load from database, but handle gracefully if tables don't exist
      try {
        const [usersRes] = await Promise.all([
          supabase.from("users").select("id, name, email").then(res => {
            if (res.error) console.warn("Users table not found, using defaults");
            return res;
          })
        ]);

        setUsers(usersRes.data || []);
      } catch (err) {
        console.warn("Database tables not yet set up, using demo data");
      }
      
    } catch (err) {
      console.warn("Could not load data, using demo data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create vendor (demo mode - just adds to state)
  const createVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newVendorData = {
        ...newVendor,
        id: Date.now().toString(),
        status: 'active' as const
      };
      
      setVendors(prev => [...prev, newVendorData]);
      setNewVendor({ name: '', contact_person: '', email: '', phone: '', address: '', delivery_days: [], cutoff_time: '', minimum_order: 0, notes: '' });
      setShowCreateVendor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vendor");
    }
  };

  // Create inventory item (demo mode)
  const createInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItemData = {
        ...newItem,
        id: Date.now().toString()
      };
      
      setInventoryItems(prev => [...prev, newItemData]);
      setNewItem({ name: '', category: '', vendor_id: '', unit_type: '', cost_per_unit: 0, current_stock: 0, minimum_stock: 0, maximum_stock: 0, notes: '', storage_location: '' });
      setShowCreateItem(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create inventory item");
    }
  };

  // Create order (demo mode)
  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orderNumber = `ORD-${Date.now()}`;
      const vendor = vendors.find(v => v.id === newOrder.vendor_id);
      
      const newOrderData = {
        ...newOrder,
        id: Date.now().toString(),
        order_number: orderNumber,
        vendor_name: vendor?.name,
        status: 'pending_approval' as const,
        total_amount: newOrder.items.reduce((sum, item) => sum + item.total_cost, 0),
        created_by: 'current_user',
        created_at: new Date().toISOString()
      };

      setOrders(prev => [...prev, newOrderData]);
      setNewOrder({ vendor_id: '', order_date: new Date().toISOString().slice(0, 10), expected_delivery: '', notes: '', items: [] });
      setShowCreateOrder(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    }
  };

  // Generate PDF for order
  const generateOrderPDF = async (order: Order) => {
    try {
      const vendor = vendors.find(v => v.id === order.vendor_id);
      
      // Simple HTML content for PDF
      const htmlContent = `
        <html>
          <head>
            <title>Purchase Order ${order.order_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .vendor-info { margin-bottom: 30px; }
              .order-info { margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f5f5f5; }
              .total { font-weight: bold; text-align: right; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PURCHASE ORDER</h1>
              <h2>${order.order_number}</h2>
            </div>
            
            <div class="vendor-info">
              <h3>Vendor Information</h3>
              <p><strong>${vendor?.name}</strong></p>
              ${vendor?.contact_person ? `<p>Contact: ${vendor.contact_person}</p>` : ''}
              ${vendor?.email ? `<p>Email: ${vendor.email}</p>` : ''}
              ${vendor?.phone ? `<p>Phone: ${vendor.phone}</p>` : ''}
              ${vendor?.address ? `<p>Address: ${vendor.address}</p>` : ''}
            </div>
            
            <div class="order-info">
              <p><strong>Order Date:</strong> ${new Date(order.order_date).toLocaleDateString()}</p>
              ${order.expected_delivery ? `<p><strong>Expected Delivery:</strong> ${new Date(order.expected_delivery).toLocaleDateString()}</p>` : ''}
              <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.item_name}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.unit_cost.toFixed(2)}</td>
                    <td>$${item.total_cost.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total">TOTAL:</td>
                  <td class="total">$${order.total_amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            ${order.notes ? `
              <div>
                <h3>Notes</h3>
                <p>${order.notes}</p>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>Generated on ${new Date().toLocaleDateString()} by JAYNA Restaurant Management System</p>
            </div>
          </body>
        </html>
      `;

      // Create and download PDF
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PO_${order.order_number}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError("Failed to generate PDF");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Ordering Manager</h1>
        <p className="text-slate-600">Comprehensive inventory and supplier management system</p>
      </div>

      {error && (
        <div className="alert alert-error mb-8">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'inventory', label: 'Inventory', icon: '📦' },
              { id: 'vendors', label: 'Vendors', icon: '🏢' },
              { id: 'orders', label: 'Orders', icon: '📋' },
              { id: 'counts', label: 'Counts', icon: '📝' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stat-card">
              <div className="text-2xl font-semibold text-slate-900">{inventoryItems.length}</div>
              <div className="text-sm text-slate-600">Inventory Items</div>
              <div className="text-xs text-red-600 mt-1">
                {inventoryItems.filter(item => item.current_stock <= item.minimum_stock).length} need reorder
              </div>
            </div>
            
            <div className="stat-card">
              <div className="text-2xl font-semibold text-slate-900">{vendors.length}</div>
              <div className="text-sm text-slate-600">Active Vendors</div>
              <div className="text-xs text-blue-600 mt-1">
                {vendors.filter(v => v.status === 'active').length} active
              </div>
            </div>
            
            <div className="stat-card">
              <div className="text-2xl font-semibold text-slate-900">{orders.length}</div>
              <div className="text-sm text-slate-600">Total Orders</div>
              <div className="text-xs text-yellow-600 mt-1">
                {orders.filter(o => o.status === 'pending_approval').length} pending approval
              </div>
            </div>
            
            <div className="stat-card">
              <div className="text-2xl font-semibold text-slate-900">
                ${orders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(0)}
              </div>
              <div className="text-sm text-slate-600">Total Order Value</div>
              <div className="text-xs text-slate-500 mt-1">This period</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setShowCreateOrder(true)}
              className="btn btn-primary"
            >
              Create New Order
            </button>
            <button
              onClick={() => setShowCreateItem(true)}
              className="btn btn-secondary"
            >
              Add Inventory Item
            </button>
            <button
              onClick={() => setShowCreateVendor(true)}
              className="btn btn-outline"
            >
              Add Vendor
            </button>
            <button
              onClick={() => setShowCreateCount(true)}
              className="btn btn-outline"
            >
              Schedule Count
            </button>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900">Recent Orders</h3>
            </div>
            <div className="p-6">
              {orders.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <div>No orders created yet</div>
                  <div className="text-sm mt-2">Click "Create New Order" to get started</div>
                </div>
              ) : (
                orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                    <div>
                      <div className="font-medium text-slate-900">{order.order_number}</div>
                      <div className="text-sm text-slate-600">{order.vendor_name} • ${order.total_amount.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        order.status === 'approved' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      {order.status === 'approved' && (
                        <button
                          onClick={() => generateOrderPDF(order)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Download PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">Inventory Management</h2>
            <button
              onClick={() => setShowCreateItem(true)}
              className="btn btn-primary"
            >
              Add New Item
            </button>
          </div>

          <div className="card">
            <div className="p-6">
              <div className="grid gap-4">
                {inventoryItems.map(item => (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-sm text-slate-600 mb-2">{item.category} • {item.unit_type}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Stock:</span>
                            <span className={`ml-1 font-medium ${
                              item.current_stock <= item.minimum_stock ? 'text-red-600' : 'text-slate-900'
                            }`}>
                              {item.current_stock}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Min:</span>
                            <span className="ml-1">{item.minimum_stock}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Cost:</span>
                            <span className="ml-1">${item.cost_per_unit}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Location:</span>
                            <span className="ml-1">{item.storage_location || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      {item.current_stock <= item.minimum_stock && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                          Reorder
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendors Tab */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">Vendor Management</h2>
            <button
              onClick={() => setShowCreateVendor(true)}
              className="btn btn-primary"
            >
              Add New Vendor
            </button>
          </div>

          <div className="grid gap-6">
            {vendors.map(vendor => (
              <div key={vendor.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-slate-900">{vendor.name}</h3>
                    <div className="text-sm text-slate-600">{vendor.contact_person}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {vendor.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <span className="ml-1">{vendor.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <span className="ml-1">{vendor.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Delivery Days:</span>
                    <span className="ml-1">{vendor.delivery_days.join(', ') || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cutoff Time:</span>
                    <span className="ml-1">{vendor.cutoff_time || 'N/A'}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500">Address:</span>
                    <span className="ml-1">{vendor.address || 'N/A'}</span>
                  </div>
                </div>
                
                {vendor.minimum_order && vendor.minimum_order > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="text-slate-500">Minimum Order:</span>
                    <span className="ml-1 font-medium">${vendor.minimum_order}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">Order Management</h2>
            <button
              onClick={() => setShowCreateOrder(true)}
              className="btn btn-primary"
            >
              Create New Order
            </button>
          </div>

          <div className="card">
            <div className="p-6 space-y-4">
              {orders.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <div>No orders created yet</div>
                  <div className="text-sm mt-2">Create your first order to get started</div>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-slate-900">{order.order_number}</div>
                        <div className="text-sm text-slate-600">{order.vendor_name}</div>
                        <div className="text-sm text-slate-500">
                          Order Date: {new Date(order.order_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-medium text-slate-900">${order.total_amount.toFixed(2)}</div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          order.status === 'approved' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {order.items.length > 0 && (
                      <div className="text-sm text-slate-600 mb-3">
                        Items: {order.items.map(item => `${item.item_name} (${item.quantity})`).join(', ')}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {order.status === 'approved' && (
                        <button
                          onClick={() => generateOrderPDF(order)}
                          className="btn btn-outline text-sm"
                        >
                          Download PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Create New Order</h3>
            <form onSubmit={createOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Vendor</label>
                <select
                  className="input w-full"
                  value={newOrder.vendor_id}
                  onChange={e => setNewOrder({...newOrder, vendor_id: e.target.value})}
                  required
                >
                  <option value="">Select vendor</option>
                  {vendors.filter(v => v.status === 'active').map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Order Date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={newOrder.order_date}
                    onChange={e => setNewOrder({...newOrder, order_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Expected Delivery</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={newOrder.expected_delivery}
                    onChange={e => setNewOrder({...newOrder, expected_delivery: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Notes</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={newOrder.notes}
                  onChange={e => setNewOrder({...newOrder, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Create Order (Pending Approval)
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateOrder(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Vendor Modal */}
      {showCreateVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Add New Vendor</h3>
            <form onSubmit={createVendor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Vendor Name</label>
                <input
                  className="input w-full"
                  value={newVendor.name}
                  onChange={e => setNewVendor({...newVendor, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Contact Person</label>
                  <input
                    className="input w-full"
                    value={newVendor.contact_person}
                    onChange={e => setNewVendor({...newVendor, contact_person: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Email</label>
                  <input
                    type="email"
                    className="input w-full"
                    value={newVendor.email}
                    onChange={e => setNewVendor({...newVendor, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Phone</label>
                  <input
                    className="input w-full"
                    value={newVendor.phone}
                    onChange={e => setNewVendor({...newVendor, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Cutoff Time</label>
                  <input
                    type="time"
                    className="input w-full"
                    value={newVendor.cutoff_time}
                    onChange={e => setNewVendor({...newVendor, cutoff_time: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Address</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={newVendor.address}
                  onChange={e => setNewVendor({...newVendor, address: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Minimum Order Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="input w-full"
                  value={newVendor.minimum_order}
                  onChange={e => setNewVendor({...newVendor, minimum_order: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Add Vendor
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateVendor(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Inventory Item Modal */}
      {showCreateItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Add Inventory Item</h3>
            <form onSubmit={createInventoryItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Item Name</label>
                <input
                  className="input w-full"
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Category</label>
                  <select
                    className="input w-full"
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Meat">Meat</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Supplies">Supplies</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Unit Type</label>
                  <select
                    className="input w-full"
                    value={newItem.unit_type}
                    onChange={e => setNewItem({...newItem, unit_type: e.target.value})}
                    required
                  >
                    <option value="">Select unit</option>
                    <option value="lbs">Pounds</option>
                    <option value="oz">Ounces</option>
                    <option value="kg">Kilograms</option>
                    <option value="each">Each</option>
                    <option value="case">Case</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Current Stock</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={newItem.current_stock}
                    onChange={e => setNewItem({...newItem, current_stock: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Minimum Stock</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={newItem.minimum_stock}
                    onChange={e => setNewItem({...newItem, minimum_stock: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Cost Per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input w-full"
                    value={newItem.cost_per_unit}
                    onChange={e => setNewItem({...newItem, cost_per_unit: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Storage Location</label>
                <input
                  className="input w-full"
                  value={newItem.storage_location}
                  onChange={e => setNewItem({...newItem, storage_location: e.target.value})}
                  placeholder="e.g., Walk-in Freezer A, Dry Storage Room 2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateItem(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
