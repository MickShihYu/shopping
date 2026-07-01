// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { inject } from '@loopback/core';
import {
  authenticate,
  STRATEGY,
  AuthenticationBindings,
} from 'loopback4-authentication';
import { authorize } from 'loopback4-authorization';
import { PermissionKey } from '../permission-keys';
import { SecurityBindings, securityId, UserProfile } from '@loopback/security';
import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getFilterSchemaFor,
  getWhereSchemaFor,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import { Order } from '../models';
import { OrderRepository } from '../repositories';
import { OPERATION_SECURITY_SPEC } from '../utils';
import { v4 as uuidv4 } from 'uuid';

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

/**
 * Controller for User's Orders
 */
export class UserOrderController {
  constructor(
    @repository(OrderRepository)
    protected orderRepo: OrderRepository,
  ) { }

  /**
   * Create or update the orders for a given user
   * @param userId User id
   * @param order Order
   */
  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: [PermissionKey.CustomerAccess] })
  @post('/users/{userId}/orders', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'User.Order model instance',
        content: { 'application/json': { schema: { 'x-ts-type': Order } } },
      },
    },
  })
  async createOrder(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: UserProfile,
    @param.path.string('userId') userId: string,
    @requestBody() order: Order,
  ): Promise<Order> {
    const currentUserId =
      currentUserProfile.id || currentUserProfile[securityId];
    order.userId = order.userId || userId;
    if (userId !== currentUserId || order.userId !== currentUserId) {
      throw new HttpErrors.Forbidden('Cannot create order for another user');
    }

    if (!order.products || order.products.length === 0) {
      throw new HttpErrors.BadRequest(
        'Order must contain at least one product',
      );
    }

    // Defensive pricing and Stock reservation coordination via REST
    let calculatedTotal = 0;
    const productsToPurchase = [];
    const successfullyDeducted: { productId: string; quantity: number }[] = [];

    // Generate a transaction ID for stock rollback to ensure idempotency
    const rollbackTransactionId = uuidv4();

    try {
      for (const item of order.products) {
        // Fetch product info from Product Service
        const res = await fetch(
          `${PRODUCT_SERVICE_URL}/products/${item.productId}`,
        );
        if (!res.ok) {
          throw new HttpErrors.BadRequest(
            `Product with ID ${item.productId} not found`,
          );
        }
        const product: any = await res.json();

        if (product.isActive === false) {
          throw new HttpErrors.BadRequest(
            `Product ${product.name} is no longer available`,
          );
        }

        // Use real price from Product Service
        item.price = product.price;
        item.name = product.name;
        calculatedTotal += product.price * item.quantity;

        productsToPurchase.push({
          productId: item.productId,
          quantity: item.quantity,
          name: product.name,
        });
      }

      // Deduct stock sequentially from Product Service
      for (const item of productsToPurchase) {
        const res = await fetch(
          `${PRODUCT_SERVICE_URL}/products/${item.productId}/decrease-stock`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: item.quantity }),
          },
        );
        const stockRes = res.ok ? await res.json() : { success: false };

        if (!stockRes.success) {
          throw new HttpErrors.BadRequest(
            `Insufficient stock for product ${item.name}`,
          );
        }
        successfullyDeducted.push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    } catch (err) {
      // Rollback successfully reserved stock in Product Service
      for (const item of successfullyDeducted) {
        await fetch(
          `${PRODUCT_SERVICE_URL}/products/${item.productId}/increase-stock`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: item.quantity, transactionId: rollbackTransactionId }),
          },
        );
      }
      throw err;
    }

    // Apply calculated properties
    order.total = calculatedTotal;
    order.status = 'PENDING';
    order.date = new Date().toString();

    return this.orderRepo.create(order).catch(async (e: any) => {
      // Rollback stock if DB write fails
      for (const item of successfullyDeducted) {
        await fetch(
          `${PRODUCT_SERVICE_URL}/products/${item.productId}/increase-stock`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: item.quantity, transactionId: rollbackTransactionId }),
          },
        );
      }
      throw new HttpErrors.InternalServerError('Failed to save order');
    });
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: [PermissionKey.CustomerAccess] })
  @get('/users/{userId}/orders', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: "Array of User's Orders",
        content: {
          'application/json': {
            schema: { type: 'array', items: { 'x-ts-type': Order } },
          },
        },
      },
    },
  })
  async findOrders(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: UserProfile,
    @param.path.string('userId') userId: string,
    @param.query.object('filter', getFilterSchemaFor(Order))
    filter?: Filter<Order>,
  ): Promise<Order[]> {
    const currentUserId =
      currentUserProfile.id || currentUserProfile[securityId];
    if (userId !== currentUserId) {
      throw new HttpErrors.Forbidden('Cannot view orders of another user');
    }
    const orders = await this.orderRepo.find({
      ...filter,
      where: { ...filter?.where, userId },
    });
    return orders;
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: [PermissionKey.CustomerAccess] })
  @patch('/users/{userId}/orders/{orderId}/cancel', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Order cancelled successfully',
      },
    },
  })
  async cancelOrder(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: UserProfile,
    @param.path.string('userId') userId: string,
    @param.path.string('orderId') orderId: string,
  ): Promise<void> {
    const currentUserId =
      currentUserProfile.id || currentUserProfile[securityId];
    if (userId !== currentUserId) {
      throw new HttpErrors.Forbidden('Cannot cancel order of another user');
    }

    // Find the order
    const orders = await this.orderRepo.find({ where: { orderId, userId } });
    if (orders.length === 0) {
      throw new HttpErrors.NotFound('Order not found');
    }

    const order = orders[0];
    if (order.status !== 'PENDING') {
      throw new HttpErrors.BadRequest('Only pending orders can be cancelled');
    }

    // Release stock FIRST to prevent DB inconsistencies where order is cancelled but stock release fails
    // If stock release fails, order remains PENDING, allowing the client to safely retry.
    if (order.products) {
      for (const item of order.products) {
        const res = await fetch(
          `${PRODUCT_SERVICE_URL}/products/${item.productId}/increase-stock`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: item.quantity, transactionId: orderId }),
          },
        );
        if (!res.ok) {
          throw new HttpErrors.InternalServerError(`Failed to release stock for product ${item.productId}. Cancellation aborted.`);
        }
      }
    }

    // Change status to CANCELLED after successfully releasing stock
    order.status = 'CANCELLED';
    await this.orderRepo.updateById(orderId, { status: 'CANCELLED' });
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: [PermissionKey.CustomerAccess] })
  @patch('/users/{userId}/orders', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'User.Order PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async patchOrders(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: UserProfile,
    @param.path.string('userId') userId: string,
    @requestBody() order: Partial<Order>,
    @param.query.object('where', getWhereSchemaFor(Order)) where?: Where<Order>,
  ): Promise<Count> {
    const currentUserId =
      currentUserProfile.id || currentUserProfile[securityId];
    if (userId !== currentUserId) {
      throw new HttpErrors.Forbidden('Cannot patch orders of another user');
    }
    return this.orderRepo.updateAll(order, { ...where, userId });
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: [PermissionKey.CustomerAccess] })
  @del('/users/{userId}/orders', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'User.Order DELETE success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async deleteOrders(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: UserProfile,
    @param.path.string('userId') userId: string,
    @param.query.object('where', getWhereSchemaFor(Order)) where?: Where<Order>,
  ): Promise<Count> {
    const currentUserId =
      currentUserProfile.id || currentUserProfile[securityId];
    if (userId !== currentUserId) {
      throw new HttpErrors.Forbidden('Cannot delete orders of another user');
    }
    return this.orderRepo.deleteAll({ ...where, userId });
  }
}
