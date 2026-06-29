import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Order } from '../services/api';
import { ClipboardList, Trash2 } from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    try {
      await api.cancelOrder(orderId);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'badge-pending';
      case 'PROCESSING':
        return 'badge-processing';
      case 'SHIPPED':
        return 'badge-shipped';
      case 'COMPLETED':
        return 'badge-completed';
      case 'CANCELLED':
        return 'badge-cancelled';
      default:
        return '';
    }
  };

  return (
    <div className="orders-page-container">
      <div className="orders-section glass">
        <h2 className="section-title d-flex align-items-center gap-8">
          <ClipboardList size={22} />
          <span>My Orders</span>
        </h2>

        {loading ? (
          <div className="loading-container p-4">
            <div className="spinner"></div>
            <span>Fetching your orders...</span>
          </div>
        ) : error ? (
          <div className="error-message p-4 text-center text-danger">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders-state p-4 text-center">
            <p>You have not placed any orders yet.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table id="userOrdersTable">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Order ID</th>
                    <th style={{ width: '20%' }}>Date</th>
                    <th style={{ width: '25%' }}>Items</th>
                    <th style={{ width: '10%' }}>Total</th>
                    <th style={{ width: '15%' }}>Status</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage).map((order: Order) => (
                    <tr key={order.orderId}>
                      <td className="font-semibold text-secondary truncate-cell" title={order.orderId}>{order.orderId}</td>
                      <td>{new Date(order.date).toLocaleString()}</td>
                      <td>
                        <div className="text-muted" style={{ fontSize: '0.85em' }}>
                          {order.products.map(p => `${p.name} (x${p.quantity})`).join(', ')}
                        </div>
                      </td>
                      <td className="font-semibold text-primary">${order.total?.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        {order.status === 'PENDING' && (
                          <button
                            className="btn btn-danger btn-sm d-flex align-items-center gap-4"
                            onClick={() => handleCancelOrder(order.orderId)}
                          >
                            <Trash2 size={14} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
};
