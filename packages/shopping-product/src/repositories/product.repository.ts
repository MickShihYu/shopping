// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { MongoDataSource } from '../datasources';
import { Product, ProductRelations } from '../models';
import { ObjectId } from 'mongodb';
import { HttpErrors } from '@loopback/rest';

export class ProductRepository extends DefaultCrudRepository<
  Product,
  typeof Product.prototype.name,
  ProductRelations
> {
  constructor(@inject('datasources.mongo') dataSource: MongoDataSource) {
    super(Product, dataSource);
  }

  async decreaseStock(productId: string, quantity: number): Promise<boolean> {
    const productCollection = (this.dataSource.connector as any).collection('Product');
    const result = await productCollection.findOneAndUpdate(
      {
        _id: new ObjectId(productId),
        isActive: true,
        inventory: { $gte: quantity },
      },
      {
        $inc: { inventory: -quantity },
      },
      { returnDocument: 'after' }
    );

    if (!result.value || !result.lastErrorObject?.updatedExisting) {
      return false;
    }

    if (result.value.inventory <= (result.value.lowStockThreshold ?? 5)) {
      console.warn(
        `[WARNING] Low stock alert: Product ${result.name} (ID: ${productId}) has only ${result.inventory} items left.`,
      );
    }

    return true;
  }

  async increaseStock(productId: string, quantity: number, transactionId?: string): Promise<void> {
    const productCollection = (this.dataSource.connector as any).collection('Product');

    const filter: any = { _id: new ObjectId(productId) };
    if (transactionId) {
      filter.restockedOrders = { $ne: transactionId };
    }

    // Step 1: Pre-flight check for upper bound (assuming default maxStock = 99999 if undefined)
    const product = await productCollection.findOne({ _id: new ObjectId(productId) });
    if (!product) {
      throw new HttpErrors.NotFound(`Product ${productId} not found.`);
    }
    
    // Check if it was already restocked (to avoid throwing a misleading NotFound error later)
    if (transactionId && product.restockedOrders && product.restockedOrders.includes(transactionId)) {
      // Idempotent success
      return;
    }

    const maxStock = product.maxStock ?? 99999;
    if (product.inventory + quantity > maxStock) {
      throw new HttpErrors.BadRequest(`Stock overflow: cannot increase inventory above maxStock (${maxStock}).`);
    }

    // Step 2: Update database with limits and idempotency marker
    const update: any = { $inc: { inventory: quantity } };
    if (transactionId) {
      update.$push = { restockedOrders: transactionId };
    }

    const result = await productCollection.findOneAndUpdate(
      filter,
      update,
      { returnDocument: 'after' },
    );

    if (!result.value || !result.lastErrorObject?.updatedExisting) {
      // If we reach here, either the product disappeared, or it was concurrently updated with the same transactionId.
      throw new HttpErrors.NotFound(
        `Failed to increase stock — product ${productId} not found or already processed.`,
      );
    }
  }
}
