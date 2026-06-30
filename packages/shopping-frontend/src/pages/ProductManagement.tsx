import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Product, Order } from '../services/api';
import { Pencil, Trash2, PlusCircle, LayoutGrid, AlertCircle, X, Check, ClipboardList, Search } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';

export const ProductManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const { confirm, modal } = useConfirm();
  const [activeTab, setActiveTab] = useState<'list' | 'orders'>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Admin Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderEmailFilter, setOrderEmailFilter] = useState('');
  const [orderStartDateFilter, setOrderStartDateFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [orderEndDateFilter, setOrderEndDateFilter] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const ordersPerPage = 5;

  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [inventory, setInventory] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [productDashboardData, setProductDashboardData] = useState<any>(null);

  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editInventory, setEditInventory] = useState('0');
  const [editLowStockThreshold, setEditLowStockThreshold] = useState('5');
  const [editIsActive, setEditIsActive] = useState(true);

  const itemsPerPage = 4;

  const fetchProducts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const [productsRes, countRes, dashboardRes] = await Promise.all([
        api.getAdminProducts({ skip, limit: itemsPerPage }),
        api.getAdminProductsCount(),
        api.getAdminProductDashboard(),
      ]);
      setProducts(productsRes);
      setTotalPages(Math.ceil(countRes.count / itemsPerPage) || 1);
      setProductDashboardData(dashboardRes);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setLoadError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [currentPage, isAdmin]);

  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchAdminOrders = async (overrideStatus?: string) => {
    setOrdersLoading(true);
    const statusQuery = overrideStatus !== undefined ? overrideStatus : orderStatusFilter;
    try {
      const data = await api.getAdminOrders(
        statusQuery || undefined,
        orderEmailFilter || undefined,
        orderStartDateFilter || undefined,
        orderEndDateFilter || undefined
      );
      const newOrders = data || [];
      setOrders(newOrders);

      // Safety pagination check: if current page exceeds new items total, reset to page 1
      if ((orderCurrentPage - 1) * ordersPerPage >= newOrders.length) {
        setOrderCurrentPage(1);
      }
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const data = await api.getAdminDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    let isActive = true;

    if (isAdmin && activeTab === 'orders') {
      fetchDashboardData();
      const timer = setTimeout(() => {
        setOrdersLoading(true);
        api.getAdminOrders(
          orderStatusFilter || undefined,
          orderEmailFilter || undefined,
          orderStartDateFilter || undefined,
          orderEndDateFilter || undefined
        )
          .then((data) => {
            if (isActive) {
              setOrders(data || []);
              setOrderCurrentPage(1);
            }
          })
          .catch((err) => {
            if (isActive) console.error('Failed to load admin orders:', err);
          })
          .finally(() => {
            if (isActive) setOrdersLoading(false);
          });
      }, 300);
      return () => {
        isActive = false;
        clearTimeout(timer);
      };
    }
  }, [isAdmin, activeTab, orderStatusFilter, orderEmailFilter, orderStartDateFilter, orderEndDateFilter]);

  const handleDelete = async (productId: string) => {
    try {
      const { hasOrders, count } = await api.checkProductHasOrders(productId);
      if (hasOrders) {
        alert(`Cannot delete: this product is referenced in ${count} order${count > 1 ? 's' : ''}. Deactivate it instead.`);
        return;
      }
    } catch {
      // If the check fails, fall through and let the delete attempt surface any error
    }

    if (!await confirm({ message: 'Are you sure you want to remove this product?', danger: true })) return;
    try {
      await api.deleteProduct(productId);
      // If we are on the last item of the last page, go back a page
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await fetchProducts();
      }
    } catch {
      alert('Error removing product. Try again');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    try {
      await api.createProduct({
        name,
        price: parseFloat(price) || 0,
        image: image || '/favicon.png', // Fallback image
        description,
        details,
        inventory: parseInt(inventory) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
      });
      // Reset form
      setName('');
      setPrice('');
      setImage('');
      setDescription('');
      setDetails('');
      setInventory('0');
      setLowStockThreshold('5');
      setIsCreateOpen(false);
      await fetchProducts();
    } catch {
      alert('Error while trying to save product. Try again');
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditImage(product.image);
    setEditDescription(product.description);
    setEditDetails(product.details);
    setEditInventory((product.inventory ?? 0).toString());
    setEditLowStockThreshold((product.lowStockThreshold ?? 5).toString());
    setEditIsActive(product.isActive ?? true);
  };

  if (!isAdmin) {
    return (
      <div className="empty-catalog text-center">
        <AlertCircle size={48} className="text-danger mx-auto mb-3" />
        <h2>Access Denied</h2>
        <p>Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page-container" id="productManagement">
        <div className="admin-header">
          <h1>Product Management</h1>
          <p>Manage store catalog inventory, add new products, edit details, or remove listings.</p>
        </div>

        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <LayoutGrid size={16} />
            <span>Products Management</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ClipboardList size={16} />
            <span>Order Management</span>
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="admin-tab-pane">
            {productDashboardData && (
              <div className="orders-dashboard-bar glass p-4 rounded-lg mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--bg-card-dark)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Total Products</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{productDashboardData.totalProducts}</div>
                </div>
                <div className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--bg-card-dark)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Low Stock Alerts</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>{productDashboardData.lowStockProducts}</div>
                </div>
                <div className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--bg-card-dark)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px', textAlign: 'center' }}>Product Status</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '6px' }}></span>Active:</span>
                    <strong>{productDashboardData.activeProducts}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginTop: '6px' }}>
                    <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', marginRight: '6px' }}></span>Inactive:</span>
                    <strong>{productDashboardData.inactiveProducts}</strong>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                className="btn btn-primary d-flex align-items-center gap-8"
                onClick={() => setIsCreateOpen(true)}
                id="addProductButton"
              >
                <PlusCircle size={16} />
                <span>New Product</span>
              </button>
            </div>

            {loading ? (
              <div className="loading-container p-4">
                <div className="spinner"></div>
                <span>Fetching catalog list...</span>
              </div>
            ) : loadError ? (
              <div className="empty-catalog text-center p-4">
                <AlertCircle size={32} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--danger)' }}>{loadError}</p>
                <button className="btn btn-secondary btn-sm" onClick={fetchProducts}>Retry</button>
              </div>
            ) : products.length === 0 ? (
              <div className="empty-catalog text-center p-4">
                <p>Inventory is empty. Start by adding a product.</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table id="productsTable">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>Price</th>
                        <th style={{ width: '20%' }}>Name</th>
                        <th style={{ width: '10%' }}>Stock</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '25%' }}>Description</th>
                        <th style={{ width: '25%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.productId}>
                          <td className="font-semibold text-primary">${product.price.toFixed(2)}</td>
                          <td className="font-semibold">{product.name}</td>
                          <td className="font-semibold text-secondary">{product.inventory ?? 0}</td>
                          <td>
                            <span className={`status-badge ${product.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-secondary truncate-cell">{product.description}</td>
                          <td>
                            <div className="btn-group">
                              <button
                                onClick={() => handleEditClick(product)}
                                className="btn btn-secondary btn-sm"
                                title="Edit Product"
                                id="editProductButton"
                              >
                                <Pencil size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(product.productId)}
                                className="btn btn-danger btn-sm"
                                title="Delete Product"
                                id="deleteProductButton"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <ul className="pagination" id="productsPagination" data-cy="productsPagination">
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <li
                          key={pageNumber}
                          className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
                        >
                          <button onClick={() => setCurrentPage(pageNumber)}>
                            {pageNumber}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="admin-tab-pane">
            {dashboardData && (
              <div className="orders-dashboard-bar glass p-4 rounded-lg mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--bg-card-dark)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Today's Orders</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{dashboardData.todayOrdersCount}</div>
                </div>
                <div className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--bg-card-dark)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Today's Revenue</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>${dashboardData.todayRevenue.toFixed(2)}</div>
                </div>
                <div className="stat-card" style={{ padding: '16px', backgroundColor: 'var(--bg-card-dark)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px', textAlign: 'center' }}>Orders by Status</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', marginRight: '6px' }}></span>PENDING:</span>
                    <strong>{dashboardData.ordersByStatus.PENDING}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginTop: '6px' }}>
                    <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', marginRight: '6px' }}></span>PROCESSING:</span>
                    <strong>{dashboardData.ordersByStatus.PROCESSING}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginTop: '6px' }}>
                    <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '6px' }}></span>SHIPPED:</span>
                    <strong>{dashboardData.ordersByStatus.SHIPPED}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="orders-filters-bar glass p-4 rounded-lg mb-4" style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Status Filter</label>
                <select
                  className="form-control"
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px' }}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Email / Order ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Filter by email or ID..."
                    value={orderEmailFilter}
                    onChange={(e) => setOrderEmailFilter(e.target.value)}
                    style={{ padding: '10px 36px 10px 14px', borderRadius: '8px' }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={orderStartDateFilter}
                  onChange={(e) => setOrderStartDateFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0, flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={orderEndDateFilter}
                  onChange={(e) => setOrderEndDateFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px' }}
                />
              </div>
            </div>

            {ordersLoading ? (
              <div className="loading-container p-4">
                <div className="spinner"></div>
                <span>Fetching order list...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="empty-catalog text-center p-4">
                <p>No orders found matching filters.</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table id="ordersTable">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>Order ID</th>
                        <th style={{ width: '15%' }}>Date</th>
                        <th style={{ width: '20%' }}>Customer & Items</th>
                        <th style={{ width: '10%' }}>Total</th>
                        <th style={{ width: '15%' }}>Status</th>
                        <th style={{ width: '25%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice((orderCurrentPage - 1) * ordersPerPage, orderCurrentPage * ordersPerPage).map((order) => {
                        const getBadgeClass = (st: string) => {
                          switch (st) {
                            case 'PENDING': return 'badge-pending';
                            case 'PROCESSING': return 'badge-processing';
                            case 'SHIPPED': return 'badge-shipped';
                            case 'COMPLETED': return 'badge-completed';
                            case 'CANCELLED': return 'badge-cancelled';
                            default: return '';
                          }
                        };

                        const handleStatusChange = async (targetStatus: string) => {
                          const ok = await confirm({
                            message: `Change order status to ${targetStatus}?`,
                            confirmLabel: `Set ${targetStatus}`,
                            danger: targetStatus === 'CANCELLED',
                          });
                          if (!ok) return;
                          try {
                            await api.updateAdminOrderStatus(order.orderId, targetStatus);
                            setTimeout(() => {
                              setOrderCurrentPage(1);
                              fetchAdminOrders();
                              fetchDashboardData();
                            }, 200);
                          } catch (err: any) {
                            alert(err.message || 'Failed to update order status');
                          }
                        };

                        return (
                          <tr key={order.orderId}>
                            <td className="font-semibold text-secondary truncate-cell" title={order.orderId}>{order.orderId}</td>
                            <td>{new Date(order.date).toLocaleString()}</td>
                            <td>
                              <div className="font-semibold">{order.fullName}</div>
                              <div className="text-secondary" style={{ fontSize: '0.85em' }}>{order.email}</div>
                              <div className="text-muted" style={{ fontSize: '0.8em', marginTop: '4px' }}>
                                {order.products.map(p => `${p.name} (x${p.quantity})`).join(', ')}
                              </div>
                            </td>
                            <td className="font-semibold text-primary">${order.total?.toFixed(2)}</td>
                            <td>
                              <span className={`status-badge ${getBadgeClass(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group">
                                {order.status === 'PENDING' && (
                                  <>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleStatusChange('PROCESSING')}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleStatusChange('CANCELLED')}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {order.status === 'PROCESSING' && (
                                  <>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleStatusChange('SHIPPED')}
                                    >
                                      Ship
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleStatusChange('CANCELLED')}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {order.status === 'SHIPPED' && (
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleStatusChange('COMPLETED')}
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {Math.ceil(orders.length / ordersPerPage) > 1 && (
                  <ul className="pagination" style={{ marginTop: '24px', justifyContent: 'center' }}>
                    {Array.from({ length: Math.ceil(orders.length / ordersPerPage) }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <li
                          key={pageNumber}
                          className={`page-item ${orderCurrentPage === pageNumber ? 'active' : ''}`}
                        >
                          <button onClick={() => setOrderCurrentPage(pageNumber)}>
                            {pageNumber}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {/* Product Edit Modal */}
        {editingProduct && (
          <div className="overlay" onClick={() => setEditingProduct(null)}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Product Details</h2>
                <button className="modal-close" onClick={() => setEditingProduct(null)}>
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.updateProduct(editingProduct.productId, {
                      name: editName,
                      price: parseFloat(editPrice) || 0,
                      image: editImage,
                      description: editDescription,
                      details: editDetails,
                      inventory: parseInt(editInventory) || 0,
                      lowStockThreshold: parseInt(editLowStockThreshold) || 5,
                      isActive: editIsActive,
                    });
                    setEditingProduct(null);
                    await fetchProducts();
                  } catch {
                    alert('Failed to update product details');
                  }
                }}
                className="admin-edit-form"
              >
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setEditIsActive(true)}
                      className={`btn btn-sm ${editIsActive ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsActive(false)}
                      className={`btn btn-sm ${!editIsActive ? 'btn-danger' : 'btn-secondary'}`}
                    >
                      Inactive
                    </button>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Price (USD)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock / Inventory</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editInventory}
                      onChange={(e) => setEditInventory(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editLowStockThreshold}
                    onChange={(e) => setEditLowStockThreshold(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Specifications (YAML)</label>
                  <textarea
                    className="form-control"
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                  />
                </div>

                <div className="add-to-cart-actions">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Check size={16} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Create Modal */}
        {isCreateOpen && (
          <div className="overlay" onClick={() => setIsCreateOpen(false)}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">New Product</h2>
                <button className="modal-close" onClick={() => setIsCreateOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="admin-create-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Price (USD)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock / Inventory</label>
                    <input
                      type="number"
                      className="form-control"
                      value={inventory}
                      onChange={(e) => setInventory(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    className="form-control"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., https://example.com/image.jpg"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Specifications (YAML)</label>
                  <textarea
                    className="form-control"
                    placeholder="- Detail item 1&#13;- Detail item 2"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>

                <div className="add-to-cart-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <PlusCircle size={16} />
                    <span>Create Product</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {modal}
    </>
  );
};
