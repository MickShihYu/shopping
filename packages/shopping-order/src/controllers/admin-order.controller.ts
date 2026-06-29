// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {authenticate, STRATEGY} from 'loopback4-authentication';
import {authorize} from 'loopback4-authorization';
import {PermissionKey} from '../permission-keys';
import {repository} from '@loopback/repository';
import {get, post, patch, HttpErrors, param, requestBody} from '@loopback/rest';
import {Order} from '../models';
import {OrderRepository} from '../repositories';
import {OPERATION_SECURITY_SPEC} from '../utils';

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3001';
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3003';

/**
 * Controller for Admin Order Operations
 */
export class AdminOrderController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
  ) {}

  /**
   * Search all orders with optional filters for admins
   */
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @post('/admin/orders', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Array of Order model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: {'x-ts-type': Order}},
          },
        },
      },
    },
  })
  async findAdminOrders(
    @requestBody() searchParameters: any,
  ): Promise<Order[]> {
    const {status, email, startDate, endDate} = searchParameters;
    const filterWhere: any = {};

    if (status) {
      filterWhere.status = status;
    }
    if (email) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(email);
      if (isObjectId) {
        filterWhere.or = [
          {email: {regexp: new RegExp(email, 'i')}},
          {orderId: email},
        ];
      } else {
        filterWhere.email = {regexp: new RegExp(email, 'i')};
      }
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end) {
        end.setHours(23, 59, 59, 999);
      }
      filterWhere.date = {gte: start, lte: end};
    }

    const orders = await this.orderRepository.find({where: filterWhere});
    return orders;
  }

  /**
   * State Machine transition endpoint for order status
   */
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @patch('/admin/orders/{id}/status', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Order status updated successfully',
      },
    },
  })
  async updateOrderStatus(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: {type: 'string'},
            },
            required: ['status'],
          },
        },
      },
    })
    statusUpdate: {status: string},
  ): Promise<void> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new HttpErrors.NotFound('Order not found');
    }

    const currentStatus = order.status || 'PENDING';
    const targetStatus = statusUpdate.status;

    // Transition definitions
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new HttpErrors.BadRequest(
        `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      );
    }

    // Apply state change
    await this.orderRepository.updateById(id, {status: targetStatus});

    // Release stock if cancelled by admin
    if (targetStatus === 'CANCELLED') {
      if (order.products) {
        for (const item of order.products) {
          await fetch(
            `${PRODUCT_SERVICE_URL}/products/${item.productId}/increase-stock`,
            {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({quantity: item.quantity}),
            },
          );
        }
      }
    }
  }

  /**
   * Get dashboard statistics for orders
   */
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @get('/admin/orders/dashboard', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Dashboard Statistics',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                todayOrdersCount: {type: 'number'},
                todayRevenue: {type: 'number'},
                ordersByStatus: {
                  type: 'object',
                  properties: {
                    PENDING: {type: 'number'},
                    PROCESSING: {type: 'number'},
                    SHIPPED: {type: 'number'},
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getDashboardStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const allOrders = await this.orderRepository.find();

    let todayOrdersCount = 0;
    let todayRevenue = 0;
    const ordersByStatus = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
    };

    allOrders.forEach(order => {
      const orderDate = new Date(order.date || 0);
      const isToday = orderDate >= today && orderDate <= endOfToday;

      if (isToday) {
        todayOrdersCount++;
        if (order.status !== 'CANCELLED') {
          todayRevenue += order.total || 0;
        }
      }

      if (order.status === 'PENDING') ordersByStatus.PENDING++;
      if (order.status === 'PROCESSING') ordersByStatus.PROCESSING++;
      if (order.status === 'SHIPPED') ordersByStatus.SHIPPED++;
    });

    return {
      todayOrdersCount,
      todayRevenue,
      ordersByStatus,
    };
  }

  /**
   * Get single order details for admins
   */
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @get('/admin/orders/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Order model instance with customer info',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                order: {'x-ts-type': Order},
                customer: {
                  type: 'object',
                  properties: {
                    firstName: {type: 'string'},
                    lastName: {type: 'string'},
                    email: {type: 'string'},
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getAdminOrderDetail(@param.path.string('id') id: string): Promise<any> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new HttpErrors.NotFound('Order not found');
    }
    let customer: any = null;
    if (order.userId) {
      try {
        const res = await fetch(`${AUTH_SERVICE_URL}/users/${order.userId}`);
        if (res.ok) {
          const user: any = await res.json();
          customer = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          };
        }
      } catch (err) {
        // Customer might be deleted
      }
    }
    return {
      order,
      customer,
    };
  }

  /**
   * Check if any orders contain the given productId
   */
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @get('/admin/orders/check-product/{productId}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Whether any orders reference this product',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                hasOrders: {type: 'boolean'},
                count: {type: 'number'},
              },
            },
          },
        },
      },
    },
  })
  async checkProductHasOrders(
    @param.path.string('productId') productId: string,
  ): Promise<{hasOrders: boolean; count: number}> {
    const allOrders = await this.orderRepository.find({
      where: {status: {neq: 'CANCELLED'}},
    });
    const matching = allOrders.filter(order =>
      order.products?.some(p => p.productId === productId),
    );
    return {hasOrders: matching.length > 0, count: matching.length};
  }
}
