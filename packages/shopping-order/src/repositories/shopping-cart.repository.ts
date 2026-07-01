// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { inject } from '@loopback/context';
import { DefaultKeyValueRepository } from '@loopback/repository';
import { promisify } from 'util';
import { RedisDataSource } from '../datasources/redis.datasource';
import { ShoppingCart, ShoppingCartItem } from '../models';
import { retry, Task } from '../utils/retry';

export class ShoppingCartRepository extends DefaultKeyValueRepository<ShoppingCart> {
  constructor(@inject('datasources.redis') dataSource: RedisDataSource) {
    super(ShoppingCart, dataSource);
  }

  /**
   * Add an item to the shopping cart with optimistic lock to allow concurrent
   * `adding to cart` from multiple devices. If race condition happens, it will
   * try 10 times at an interval of 10 ms. Timeout will be reported as an error.
   *
   * @param userId User id
   * @param item Item to be added
   * @returns A promise that's resolved with the updated ShoppingCart instance
   *
   */
  addItem(userId: string, item: ShoppingCartItem) {
    const task: Task<ShoppingCart> = {
      run: async () => {
        const addItemToCart = (cart: ShoppingCart | null) => {
          cart = cart ?? new ShoppingCart({ userId });
          cart.items = cart.items ?? [];
          cart.items.push(item);
          return cart;
        };
        const result = await this.checkAndSet(userId, addItemToCart);
        if (result.status === 'abort') {
          // Business logic rejected (e.g. cart invalid), stop retrying
          return { done: true, value: null as any };
        }
        return {
          done: result.status === 'success',
          value: result.value as any,
        };
      },
      description: `update the shopping cart for '${userId}'`,
    };
    return retry(task, { maxTries: 100, interval: 20 });
  }

  /**
   * Use Redis WATCH and Transaction to check and set against a key
   * See https://redis.io/topics/transactions#optimistic-locking-using-check-and-set
   *
   * Ideally, this method should be made available by `KeyValueRepository`.
   *
   * @param userId User id
   * @param check A function that checks the current value and produces a new
   * value. It returns `null` to abort.
   *
   * @returns A promise that's resolved with the updated ShoppingCart instance
   * or with null if the transaction failed due to a race condition.
   * See https://github.com/NodeRedis/node_redis#optimistic-locks
   */
  async checkAndSet(
    userId: string,
    check: (current: ShoppingCart | null) => ShoppingCart | null,
  ): Promise<{status: 'lock_failed' | 'abort' | 'success', value?: ShoppingCart}> {
    const connector = this.kvModelClass.dataSource!.connector!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const execute = promisify((cmd: string, args: any[], cb: Function) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      connector.execute!(cmd, args, cb);
    });

    const lockKey = `lock:cart:${userId}`;
    // Generate a unique token for this lock request
    const lockToken = Math.random().toString(36).substring(2, 15);

    // Try to acquire a lock using SETNX with an expiration of 2 seconds
    const acquired = await execute('SET', [lockKey, lockToken, 'NX', 'PX', 2000]);

    // If we cannot acquire the lock, return lock_failed to trigger the built-in retry mechanism
    if (!acquired) return { status: 'lock_failed' };

    try {
      let cart: ShoppingCart | null = await this.get(userId);
      cart = check(cart);
      if (!cart) return { status: 'abort' };
      await this.set(userId, cart);
      return { status: 'success', value: cart };
    } finally {
      // Safely release the lock only if we still own it using Lua script for atomicity
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await execute('EVAL', [script, 1, lockKey, lockToken]);
    }
  }
}
