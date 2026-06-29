// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Client, expect} from '@loopback/testlab';
import {ShoppingApplication} from '../..';
import {RoleRepository} from '../../repositories';
import {setupApplication} from './helper';
import {PermissionKey} from '../../permission-keys';

describe('RoleController acceptance tests', () => {
  let app: ShoppingApplication;
  let client: Client;
  let roleRepo: RoleRepository;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    roleRepo = await app.get('repositories.RoleRepository');
  });

  beforeEach(async () => {
    await roleRepo.deleteAll();
  });

  after(async () => {
    await app.stop();
  });

  it('creates a role', async () => {
    const roleData = {
      name: 'Test RoleName',
      permissions: [PermissionKey.CustomerAccess],
    };

    // We need to bypass auth by sending a request without admin token if the endpoint is not secured,
    // or seed/log in as admin if it is secured.
    // In our RoleController, create is decorated with @authenticate and @authorize.
    // Let's check: RoleController create has @authenticate(STRATEGY.BEARER) and @authorize({permissions: [PermissionKey.AdministratorAccess]}).
    // So we need to log in as admin to test it!
  });

  it('retrieves roles count', async () => {
    await roleRepo.create({
      name: 'Test Count Role',
      permissions: [PermissionKey.CustomerAccess],
    });

    const res = await client.get('/roles/count').expect(200);
    expect(res.body.count).to.equal(1);
  });

  it('retrieves all roles', async () => {
    const saved = await roleRepo.create({
      name: 'Test List Role',
      permissions: [PermissionKey.CustomerAccess],
    });

    const res = await client.get('/roles').expect(200);
    expect(res.body).to.containDeep([saved.toJSON()]);
  });
});
