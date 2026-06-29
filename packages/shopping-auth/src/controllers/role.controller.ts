// Copyright IBM Corp. 2019,2020. All Rights Reserved.
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
} from '@loopback/rest';
import {Role} from '../models';
import {RoleRepository} from '../repositories';
import {authenticate, STRATEGY} from 'loopback4-authentication';
import {authorize} from 'loopback4-authorization';
import {PermissionKey} from '../permission-keys';
import {OPERATION_SECURITY_SPEC} from '../utils';

export class RoleController {
  constructor(
    @repository(RoleRepository)
    public roleRepository: RoleRepository,
  ) {}

  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  @post('/roles', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Role model instance',
        content: {'application/json': {schema: getModelSchemaRef(Role)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Role, {
            title: 'NewRole',
          }),
        },
      },
    })
    role: Role,
  ): Promise<Role> {
    return this.roleRepository.create(role);
  }

  @authorize({permissions: ['*']})
  @get('/roles/count', {
    responses: {
      '200': {
        description: 'Role model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(Role))
    where?: Where<Role>,
  ): Promise<Count> {
    return this.roleRepository.count(where);
  }

  @authorize({permissions: ['*']})
  @get('/roles', {
    responses: {
      '200': {
        description: 'Array of Role model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Role, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Role))
    filter?: Filter<Role>,
  ): Promise<Role[]> {
    return this.roleRepository.find(filter);
  }

  @patch('/roles', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'Role PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Role, {partial: true}),
        },
      },
    })
    role: Role,
    @param.query.object('where', getWhereSchemaFor(Role))
    where?: Where<Role>,
  ): Promise<Count> {
    return this.roleRepository.updateAll(role, where);
  }

  @get('/roles/{id}', {
    responses: {
      '200': {
        description: 'Role model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Role, {includeRelations: true}),
          },
        },
      },
    },
  })
  @authorize({permissions: ['*']})
  async findById(
    @param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(Role))
    filter?: Filter<Role>,
  ): Promise<Role> {
    return this.roleRepository.findById(id, filter);
  }

  @patch('/roles/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Role PATCH success',
      },
    },
  })
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Role, {partial: true}),
        },
      },
    })
    role: Role,
  ): Promise<void> {
    await this.roleRepository.updateById(id, role);
  }

  @put('/roles/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Role PUT success',
      },
    },
  })
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() role: Role,
  ): Promise<void> {
    await this.roleRepository.replaceById(id, role);
  }

  @del('/roles/{id}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '204': {
        description: 'Role DELETE success',
      },
    },
  })
  @authenticate(STRATEGY.BEARER)
  @authorize({permissions: [PermissionKey.AdministratorAccess]})
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.roleRepository.deleteById(id);
  }
}
