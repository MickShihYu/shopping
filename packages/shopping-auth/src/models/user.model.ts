// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Entity,
  model,
  property,
  hasMany,
  hasOne,
  belongsTo,
} from '@loopback/repository';
import {UserCredentials} from './user-credentials.model';
import {Role} from './role.model';

@model({
  settings: {
    indexes: {
      uniqueEmail: {
        keys: {
          email: 1,
        },
        options: {
          unique: true,
        },
      },
    },
  },
})
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  email: string;

  @property({
    type: 'string',
  })
  firstName?: string;

  @property({
    type: 'string',
  })
  lastName?: string;

  @property({
    type: 'string',
  })
  phone?: string;

  @hasOne(() => UserCredentials)
  userCredentials: UserCredentials;

  @belongsTo(() => Role)
  roleId: string;

  @property({
    type: 'string',
  })
  resetKey?: string;

  @property({
    type: 'number',
  })
  resetCount: number;

  @property({
    type: 'string',
  })
  resetTimestamp: string;

  @property({
    type: 'string',
  })
  resetKeyTimestamp: string;

  @property({
    type: 'object',
  })
  role?: Role;

  @property({
    type: 'string',
  })
  roleName?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  permissions?: string[];

  constructor(data?: Partial<User>) {
    super(data);
  }
}
