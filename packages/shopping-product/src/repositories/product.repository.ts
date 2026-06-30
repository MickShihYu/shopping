// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { inject } from '@loopback/core';
import { DefaultCrudRepository } from '@loopback/repository';
import { MongoDataSource } from '../datasources';
import { Product, ProductRelations } from '../models';
import { ObjectId } from 'mongodb';

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

  async increaseStock(productId: string, quantity: number): Promise<void> {
    const productCollection = (this.dataSource.connector as any).collection('Product');

    const result = await productCollection.findOneAndUpdate(
      { _id: new ObjectId(productId) },
      { $inc: { inventory: quantity } },
      { returnDocument: 'after' },
    );

    if (!result.value || !result.lastErrorObject?.updatedExisting) {
      console.error(
        `[ERROR] Failed to increase stock — product ${productId} not found.`,
      );
    }
  }
}
