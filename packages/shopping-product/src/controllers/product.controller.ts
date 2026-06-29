// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  put,
  del,
  requestBody,
  HttpErrors,
  RestBindings,
  Request,
} from '@loopback/rest';
import {inject} from '@loopback/core';
import {authenticate, STRATEGY} from 'loopback4-authentication';
import {authorize} from 'loopback4-authorization';
import {PermissionKey} from '../permission-keys';
import {Product} from '../models';
import {ProductRepository} from '../repositories';
import {basicAuthorization} from '../services';
import {OPERATION_SECURITY_SPEC} from '../utils';

const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3002';

export class ProductController {
  constructor(
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject(RestBindings.Http.REQUEST) private req: Request,
  ) {}

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @post('/products', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Product model instance',
        content: {'application/json': {schema: getModelSchemaRef(Product)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, {
            title: 'NewProduct',
            exclude: ['productId'],
          }),
        },
      },
    })
    product: Omit<Product, 'productId'>,
  ): Promise<Product> {
    return this.productRepository.create(product);
  }

  @get('/products/count', {
    responses: {
      '200': {
        description: 'Product model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(Product))
    where?: Where<Product>,
  ): Promise<Count> {
    const customWhere: any = where ?? {};
    customWhere.isActive = true;
    customWhere.inventory = {gt: 0};
    return this.productRepository.count(customWhere);
  }

  @get('/products', {
    responses: {
      '200': {
        description: 'Array of Product model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Product, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Product))
    filter?: Filter<Product>,
  ): Promise<Product[]> {
    const customFilter = filter ?? {};
    customFilter.where = customFilter.where ?? {};
    (customFilter.where as any).isActive = true;
    (customFilter.where as any).inventory = {gt: 0};
    return this.productRepository.find(customFilter);
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @patch('/products', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Product PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, {partial: true}),
        },
      },
    })
    product: Product,
    @param.query.object('where', getWhereSchemaFor(Product))
    where?: Where<Product>,
  ): Promise<Count> {
    return this.productRepository.updateAll(product, where);
  }

  @get('/products/{id}', {
    responses: {
      '200': {
        description: 'Product model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Product, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(Product))
    filter?: Filter<Product>,
  ): Promise<Product> {
    return this.productRepository.findById(id, filter);
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @patch('/products/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Product PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, {partial: true}),
        },
      },
    })
    product: Product,
  ): Promise<void> {
    await this.productRepository.updateById(id, product);
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @put('/products/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Product PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() product: Product,
  ): Promise<void> {
    await this.productRepository.replaceById(id, product);
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @del('/products/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Product DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    try {
      const res = await fetch(
        `${ORDER_SERVICE_URL}/admin/orders/check-product/${id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.req.headers.authorization || '',
          },
        },
      );
      if (!res.ok) {
        throw new HttpErrors.ServiceUnavailable(
          `Cannot verify order references (order service returned ${res.status}). Delete aborted.`,
        );
      }
      const {hasOrders, count} = await res.json();
      if (hasOrders) {
        throw new HttpErrors.Conflict(
          `Cannot delete: this product is referenced in ${count} order${
            count > 1 ? 's' : ''
          }. Deactivate it instead.`,
        );
      }
    } catch (err: any) {
      if (err.status || err.statusCode) throw err;
      console.warn(
        '[deleteById] Order service unreachable, skipping check:',
        err.message,
      );
    }
    await this.productRepository.deleteById(id);
  }

  // ─── Admin-only product listing (no isActive/inventory filter) ───────────

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @get('/admin/products', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'All products for admin (including inactive)',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Product, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async adminFind(
    @param.query.object('filter', getFilterSchemaFor(Product))
    filter?: Filter<Product>,
  ): Promise<Product[]> {
    return this.productRepository.find(filter);
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @get('/admin/products/count', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Total product count for admin',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async adminCount(
    @param.query.object('where', getWhereSchemaFor(Product))
    where?: Where<Product>,
  ): Promise<Count> {
    return this.productRepository.count(where);
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @get('/admin/products/dashboard', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Product dashboard statistics',
        content: {
          'application/json': {
            schema: {type: 'object'},
          },
        },
      },
    },
  })
  async getAdminDashboard(): Promise<any> {
    const totalCount = await this.productRepository.count();
    const activeCount = await this.productRepository.count({isActive: true});
    const products = await this.productRepository.find();

    let lowStockCount = 0;
    for (const p of products) {
      if ((p.inventory ?? 0) <= (p.lowStockThreshold ?? 5)) {
        lowStockCount++;
      }
    }

    return {
      totalProducts: totalCount.count,
      activeProducts: activeCount.count,
      inactiveProducts: totalCount.count - activeCount.count,
      lowStockProducts: lowStockCount,
    };
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @patch('/admin/products/{id}/toggle-active', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Toggle isActive flag',
        content: {
          'application/json': {
            schema: {type: 'object', properties: {isActive: {type: 'boolean'}}},
          },
        },
      },
    },
  })
  async toggleActive(
    @param.path.string('id') id: string,
  ): Promise<{isActive: boolean}> {
    const product = await this.productRepository.findById(id);
    const next = !product.isActive;
    await this.productRepository.updateById(id, {
      isActive: next,
    } as Partial<Product>);
    return {isActive: next};
  }

  @post('/products/{id}/decrease-stock', {
    responses: {
      '200': {
        description: 'Decrease stock success status',
        content: {
          'application/json': {
            schema: {type: 'object', properties: {success: {type: 'boolean'}}},
          },
        },
      },
    },
  })
  async decreaseStock(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              quantity: {type: 'number'},
            },
            required: ['quantity'],
          },
        },
      },
    })
    body: {quantity: number},
  ): Promise<{success: boolean}> {
    const success = await this.productRepository.decreaseStock(
      id,
      body.quantity,
    );
    return {success};
  }

  @post('/products/{id}/increase-stock', {
    responses: {
      '200': {
        description: 'Increase stock success status',
        content: {
          'application/json': {
            schema: {type: 'object', properties: {success: {type: 'boolean'}}},
          },
        },
      },
    },
  })
  async increaseStock(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              quantity: {type: 'number'},
            },
            required: ['quantity'],
          },
        },
      },
    })
    body: {quantity: number},
  ): Promise<{success: boolean}> {
    await this.productRepository.increaseStock(id, body.quantity);
    return {success: true};
  }
}
