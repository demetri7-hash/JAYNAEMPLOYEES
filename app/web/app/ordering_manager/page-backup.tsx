"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

type User = { id: string; email?: string; name?: string };
type Role = { id: string; name: string };

type Task = {
  id: string | number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  for_date?: string | null;
  due_at?: string | null;
  status?: string | null;
  completed_at?: string | null;
  assignee_user_id?: string | null;
  assignee_role_id?: string | null;
  completion_reason?: string | null;
};

export default function OrderingManagerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set());
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editNotes, setEditNotes] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Ordering-specific state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    notes: "",
    due_at: "",
    assignee_user_id: "",
    assignee_role_id: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'inventory' | 'vendor' | 'delivery'>('all');

  // Ordering Management state
  const [showInventoryManagement, setShowInventoryManagement] = useState(false);
  const [showSupplierCoordination, setShowSupplierCoordination] = useState(false);
  const [showCostTracking, setShowCostTracking] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [inventoryItems, setInventoryItems] = useState("");
  const [lowStockItems, setLowStockItems] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [savingInventory, setSavingInventory] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierItems, setSupplierItems] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderAmount, setOrderAmount] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [budgetNotes, setBudgetNotes] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [savingCosts, setSavingCosts] = useState(false);

  // Load users and roles
  useEffect(() => {
    const loadMeta = async () => {
      const { data: userData } = await supabase.from("profiles").select("id,email,name");
      setUsers(userData || []);
      const { data: roleData } = await supabase.from("roles").select("id,name");
      setRoles(roleData || []);
    };
    loadMeta();
  }, []);

  // Load ordering-related tasks
  useEffect(() => {
    let sub: any = null;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load today's ordering-related tasks
        const { data: allTasks, error: allErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .order("due_at", { ascending: true, nullsFirst: true });
        if (allErr) throw allErr;
        setTasks(allTasks || []);

        // Subscribe to realtime changes
        sub = supabase
          .channel('ordering-manager-tasks')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'task_instances',
            filter: `for_date=eq.${today}`,
          }, (payload: any) => {
            setTasks((prev) => {
              if (payload.eventType === 'INSERT') {
                if (!prev.some((t) => t.id === payload.new.id)) {
                  return [...prev, payload.new];
                }
                return prev;
              }
              if (payload.eventType === 'UPDATE') {
                return prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t);
              }
              if (payload.eventType === 'DELETE') {
                return prev.filter((t) => t.id !== payload.old.id);
              }
              return prev;
            });
          })
          .subscribe();
      } catch (e: any) {
        setError(e?.message || "Failed to load ordering tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (sub) sub.unsubscribe(); };
  }, [today]);

  // Filter tasks by ordering categories
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks;
    
    return tasks.filter(task => {
      const title = (task.title || task.name || '').toLowerCase();
      switch (taskFilter) {
        case 'inventory':
          return title.includes('inventory') || title.includes('stock') || title.includes('count') || title.includes('check');
        case 'vendor':
          return title.includes('vendor') || title.includes('supplier') || title.includes('order') || title.includes('delivery');
        case 'delivery':
          return title.includes('delivery') || title.includes('receive') || title.includes('unload') || title.includes('inspect');
        default:
          return true;
      }
    });
  }, [tasks, taskFilter]);

  // Create custom ordering task
  const handleCreateTask = async (e: any) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      const payload: any = {
        title: newTask.title,
        notes: newTask.notes,
        for_date: today,
        due_at: newTask.due_at || null,
        assignee_user_id: newTask.assignee_user_id || null,
        assignee_role_id: newTask.assignee_role_id || null,
        status: "pending",
      };
      if (!payload.title) throw new Error("Title required");
      const { error: insErr } = await supabase.from("task_instances").insert([payload]);
      if (insErr) throw insErr;
      setShowCreate(false);
      setNewTask({ title: "", notes: "", due_at: "", assignee_user_id: "", assignee_role_id: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to create ordering task");
    } finally {
      setCreatingTask(false);
    }
  };

  // Toggle task completion
  const toggleDone = async (task: Task) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(task.id));
      const done = !!(task.completed_at || task.status === "completed" || task.status === "done");
      const patch: any = done
        ? { completed_at: null, status: "pending" }
        : { completed_at: new Date().toISOString(), status: "completed" };
      const { error: updErr } = await supabase.from("task_instances").update(patch).eq("id", task.id);
      if (updErr) throw updErr;
    } catch (e: any) {
      setError(e?.message || "Failed to update task");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  // Edit task
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditNotes(task.notes || "");
    setEditReason(task.completion_reason || "");
  };
  
  const saveEdit = async (task: Task) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(task.id));
      const patch: any = { notes: editNotes, completion_reason: editReason };
      const { error: updErr } = await supabase.from("task_instances").update(patch).eq("id", task.id);
      if (updErr) throw updErr;
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update notes");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  // Save inventory management
  const saveInventoryManagement = async () => {
    setSavingInventory(true);
    try {
      const { error } = await supabase
        .from("daily_reports")
        .upsert({
          date: today,
          report_type: "inventory_management",
          notes: `Inventory Items: ${inventoryItems}\n\nLow Stock: ${lowStockItems}\n\nOrder Notes: ${orderNotes}`,
          created_by: (await supabase.auth.getSession()).data.session?.user?.id,
        });
      
      if (error) throw error;
      setInventoryItems("");
      setLowStockItems("");
      setOrderNotes("");
      setShowInventoryManagement(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save inventory management");
    } finally {
      setSavingInventory(false);
    }
  };

  // Save supplier order
  const saveSupplierOrder = async () => {
    setSavingOrder(true);
    try {
      const { error } = await supabase
        .from("daily_reports")
        .upsert({
          date: today,
          report_type: "supplier_order",
          notes: `Supplier: ${supplierName}\n\nItems: ${supplierItems}\n\nDelivery Date: ${deliveryDate}\n\nAmount: $${orderAmount}`,
          created_by: (await supabase.auth.getSession()).data.session?.user?.id,
        });
      
      if (error) throw error;
      setSupplierName("");
      setSupplierItems("");
      setDeliveryDate("");
      setOrderAmount("");
      setShowSupplierCoordination(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save supplier order");
    } finally {
      setSavingOrder(false);
    }
  };

  // Save cost tracking
  const saveCostTracking = async () => {
    setSavingCosts(true);
    try {
      const { error } = await supabase
        .from("daily_reports")
        .upsert({
          date: today,
          report_type: "cost_tracking",
          notes: `Monthly Cost Analysis: $${monthlyCost}\n\nBudget Notes: ${budgetNotes}`,
          created_by: (await supabase.auth.getSession()).data.session?.user?.id,
        });
      
      if (error) throw error;
      setBudgetNotes("");
      setMonthlyCost("");
      setShowCostTracking(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save cost tracking");
    } finally {
      setSavingCosts(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-center mb-4">📦 Ordering Manager Dashboard</h1>
      
      {/* Ordering Overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
          <div className="text-blue-900 font-semibold">📋 Total Tasks</div>
          <div className="text-2xl font-bold text-blue-700">{filteredTasks.length}</div>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <div className="text-green-900 font-semibold">✅ Completed</div>
          <div className="text-2xl font-bold text-green-700">
            {filteredTasks.filter(t => t.completed_at || t.status === 'completed').length}
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <div className="text-amber-900 font-semibold">⏳ Pending</div>
          <div className="text-2xl font-bold text-amber-700">
            {filteredTasks.filter(t => !t.completed_at && t.status !== 'completed').length}
          </div>
        </div>
      </div>

      {/* Ordering Management Dashboard */}
      <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500 mb-4">
        <h2 className="text-xl font-semibold mb-4 text-blue-600">📦 Ordering & Inventory Operations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowInventoryManagement(!showInventoryManagement)}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-left transition-colors"
          >
            <div className="font-medium text-blue-700">📊 Inventory Management</div>
            <div className="text-sm text-blue-600">Track stock levels and order requirements</div>
          </button>
          
          <button
            onClick={() => setShowSupplierCoordination(!showSupplierCoordination)}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 text-left transition-colors"
          >
            <div className="font-medium text-green-700">🚚 Supplier Coordination</div>
            <div className="text-sm text-green-600">Manage orders and supplier relationships</div>
          </button>
          
          <button
            onClick={() => setShowCostTracking(!showCostTracking)}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 text-left transition-colors"
          >
            <div className="font-medium text-purple-700">💰 Cost Tracking</div>
            <div className="text-sm text-purple-600">Monitor budgets and spending analysis</div>
          </button>
          
          <button
            onClick={() => setShowOrderHistory(!showOrderHistory)}
            className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 text-left transition-colors"
          >
            <div className="font-medium text-orange-700">📈 Order History</div>
            <div className="text-sm text-orange-600">Review past orders and trends</div>
          </button>
        </div>

        {/* Inventory Management */}
        {showInventoryManagement && (
          <div className="border rounded-lg p-4 mb-4 bg-blue-50">
            <h3 className="font-medium text-blue-700 mb-3">📊 Inventory Management</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Inventory Items
                  </label>
                  <textarea
                    value={inventoryItems}
                    onChange={(e) => setInventoryItems(e.target.value)}
                    placeholder="List current inventory items and quantities..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Low Stock Items
                  </label>
                  <textarea
                    value={lowStockItems}
                    onChange={(e) => setLowStockItems(e.target.value)}
                    placeholder="Items running low that need reordering..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Notes
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Priority items, special requirements, deadlines..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <button
                onClick={saveInventoryManagement}
                disabled={savingInventory || (!inventoryItems.trim() && !lowStockItems.trim() && !orderNotes.trim())}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {savingInventory ? '📊 Saving...' : '📊 Save Inventory Management'}
              </button>
            </div>
          </div>
        )}

        {/* Supplier Coordination */}
        {showSupplierCoordination && (
          <div className="border rounded-lg p-4 mb-4 bg-green-50">
            <h3 className="font-medium text-green-700 mb-3">🚚 Supplier Coordination</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Items Ordered
                  </label>
                  <textarea
                    value={supplierItems}
                    onChange={(e) => setSupplierItems(e.target.value)}
                    placeholder="List items, quantities, specifications..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder="Total order amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <button
                onClick={saveSupplierOrder}
                disabled={savingOrder || !supplierName.trim()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
              >
                {savingOrder ? '🚚 Saving...' : '🚚 Save Supplier Order'}
              </button>
            </div>
          </div>
        )}

        {/* Cost Tracking */}
        {showCostTracking && (
          <div className="border rounded-lg p-4 mb-4 bg-purple-50">
            <h3 className="font-medium text-purple-700 mb-3">💰 Cost Tracking & Budget Analysis</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Cost Analysis ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyCost}
                    onChange={(e) => setMonthlyCost(e.target.value)}
                    placeholder="Enter monthly cost total"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Notes & Analysis
                  </label>
                  <textarea
                    value={budgetNotes}
                    onChange={(e) => setBudgetNotes(e.target.value)}
                    placeholder="Budget variance, cost-saving opportunities, trends..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded border">
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-700">Food Costs</div>
                  <div className="text-sm text-gray-600">Track food & beverage expenses</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-700">Supply Costs</div>
                  <div className="text-sm text-gray-600">Monitor supplies & packaging</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-700">Vendor Analysis</div>
                  <div className="text-sm text-gray-600">Compare supplier pricing</div>
                </div>
              </div>
              
              <button
                onClick={saveCostTracking}
                disabled={savingCosts || (!monthlyCost.trim() && !budgetNotes.trim())}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
              >
                {savingCosts ? '💰 Saving...' : '💰 Save Cost Tracking'}
              </button>
            </div>
          </div>
        )}

        {/* Order History */}
        {showOrderHistory && (
          <div className="border rounded-lg p-4 mb-4 bg-orange-50">
            <h3 className="font-medium text-orange-700 mb-3">📈 Order History & Trends</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded border">
                <div className="font-medium text-orange-700">Recent Orders</div>
                <div className="text-sm text-gray-600 mt-2">
                  • Order tracking and delivery status
                  <br />• Supplier performance metrics  
                  <br />• Recurring order patterns
                </div>
              </div>
              <div className="bg-white p-4 rounded border">
                <div className="font-medium text-orange-700">Spending Trends</div>
                <div className="text-sm text-gray-600 mt-2">
                  • Monthly cost comparisons
                  <br />• Seasonal ordering patterns
                  <br />• Budget vs. actual analysis
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          className="rounded-lg bg-green-600 px-4 py-3 text-white font-medium"
          onClick={() => setShowCreate(v => !v)}
        >
          {showCreate ? "❌ Cancel" : "➕ Create Order Task"}
        </button>
        <a 
          href="/inventory"
          className="rounded-lg bg-blue-600 px-4 py-3 text-white font-medium text-center"
        >
          📊 View Inventory
        </a>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3 mb-4">
        <a href="/today" className="rounded-lg bg-blue-100 px-3 py-2 text-blue-800 text-sm font-medium flex-1 text-center">
          📋 Today's View
        </a>
        <a href="/kitchen_manager" className="rounded-lg bg-green-100 px-3 py-2 text-green-800 text-sm font-medium flex-1 text-center">
          🍽️ Kitchen
        </a>
        <a href="/general_manager" className="rounded-lg bg-purple-100 px-3 py-2 text-purple-800 text-sm font-medium flex-1 text-center">
          🎯 GM Dashboard
        </a>
      </div>

      {/* Task Category Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${taskFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('all')}
        >📦 All Orders</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${taskFilter === 'inventory' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('inventory')}
        >📊 Inventory</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${taskFilter === 'vendor' ? 'bg-orange-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('vendor')}
        >🏢 Vendors</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${taskFilter === 'delivery' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('delivery')}
        >🚚 Deliveries</button>
      </div>

      {/* Custom Task Creation */}
      {showCreate && (
        <form className="space-y-3 p-4 border rounded-lg bg-green-50 mb-4" onSubmit={handleCreateTask}>
          <div className="font-semibold text-green-900">📦 Create Ordering Task</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Task title (e.g., 'Order fresh vegetables from ABC Supply')"
            value={newTask.title}
            onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
            placeholder="Order details, quantities, special instructions..."
            value={newTask.notes}
            onChange={e => setNewTask(t => ({ ...t, notes: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            type="time"
            value={newTask.due_at}
            onChange={e => setNewTask(t => ({ ...t, due_at: e.target.value }))}
            placeholder="Due time"
          />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={newTask.assignee_role_id}
            onChange={e => setNewTask(t => ({ ...t, assignee_role_id: e.target.value }))}
          >
            <option value="">👥 Assign to role</option>
            {roles.filter(r => ['ordering_manager', 'kitchen_manager', 'assistant_manager'].includes(r.name)).map(r => 
              <option key={r.id} value={r.id}>{r.name}</option>
            )}
          </select>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={newTask.assignee_user_id}
            onChange={e => setNewTask(t => ({ ...t, assignee_user_id: e.target.value }))}
          >
            <option value="">👤 Assign to specific person (optional)</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-white font-medium"
            disabled={creatingTask}
          >{creatingTask ? "Creating…" : "✅ Create Task"}</button>
        </form>
      )}

      {loading && <p className="text-center text-gray-600">Loading ordering tasks...</p>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>}

      {/* Tasks Display */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">
            📦 Ordering Tasks ({filteredTasks.length}) - {taskFilter === 'all' ? 'All Categories' : taskFilter.charAt(0).toUpperCase() + taskFilter.slice(1)}
          </h2>
          {filteredTasks.map((task) => {
            const title = task.title || task.name || `Task ${task.id}`;
            const done = !!(task.completed_at || task.status === "completed");
            return (
              <div key={task.id} className="rounded-lg bg-white p-4 border shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="font-medium text-lg">{title}</div>
                    {task.due_at && (
                      <div className="text-sm text-gray-500">⏰ Due: {new Date(task.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      👤 {task.assignee_user_id || "Unassigned"} | 👥 {task.assignee_role_id || "Unassigned"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {done ? "✅ Done" : "⏳ Pending"}
                    </span>
                    <button
                      disabled={updatingIds.has(task.id)}
                      onClick={() => toggleDone(task)}
                      className={`text-sm rounded-lg px-3 py-1 border font-medium ${done ? "bg-white hover:bg-gray-50" : "bg-green-600 text-white"}`}
                    >
                      {updatingIds.has(task.id) ? "⏳" : done ? "↩️ Undo" : "✅ Done"}
                    </button>
                    <button
                      className="text-sm rounded-lg px-3 py-1 border bg-blue-50 hover:bg-blue-100 font-medium"
                      onClick={() => startEdit(task)}
                    >✏️ Edit</button>
                  </div>
                </div>
                
                {editingId === task.id ? (
                  <form className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg" onSubmit={e => { e.preventDefault(); saveEdit(task); }}>
                    <textarea
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      rows={3}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Order details, notes"
                    />
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editReason}
                      onChange={e => setEditReason(e.target.value)}
                      placeholder="Completion reason or delivery notes"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-white text-sm font-medium" disabled={updatingIds.has(task.id)}>💾 Save</button>
                      <button type="button" className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium" onClick={() => setEditingId(null)}>❌ Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {task.notes && <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">📝 {task.notes}</div>}
                    {task.completion_reason && <div className="mt-1 text-xs text-gray-500">✅ {task.completion_reason}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <div className="font-medium mb-1">No ordering tasks yet</div>
            <div className="text-sm">Create tasks to manage inventory and orders</div>
          </div>
        )
      )}
    </div>
  );
}
