import {Client, expect} from '@loopback/testlab';
import {ShoppingApplication} from '../..';
import {setupApplication, teardownApplication, generateToken} from './helper';
import {securityId} from '@loopback/security';
import {ShoppingCartRepository} from '../../repositories';

describe('ShoppingCartController', () => {
  let app: ShoppingApplication;
  let client: Client;
  let cartRepo: ShoppingCartRepository;

  const testUser = {
    [securityId]: 'test-user-id',
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    roleName: 'customer',
    permissions: ['CustomerAccess'],
  };

  let token: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    cartRepo = await app.get('repositories.ShoppingCartRepository');
    token = await generateToken(app, testUser);
  });

  after(async () => {
    await teardownApplication(app);
  });

  beforeEach(async () => {
    await cartRepo.delete('test-user-id');
  });

  it('gets a shopping cart', async () => {
    await cartRepo.set('test-user-id', {items: []});
    const res = await client
      .get('/shoppingCarts/test-user-id')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(res.body.items).to.be.Array();
  });

  it('creates or replaces a shopping cart', async () => {
    const res = await client
      .post('/shoppingCarts/test-user-id')
      .set('Authorization', 'Bearer ' + token)
      .send({items: [{productId: 'product1', quantity: 2, price: 100}]})
      .expect(204);

    const savedCart = await cartRepo.get('test-user-id');
    expect(savedCart.items!.length).to.equal(1);
    expect(savedCart.items![0].productId).to.equal('product1');
  });

  it('deletes a shopping cart', async () => {
    await cartRepo.set('test-user-id', {
      items: [{productId: 'p1', quantity: 1, price: 10}],
    });
    await client
      .delete('/shoppingCarts/test-user-id')
      .set('Authorization', 'Bearer ' + token)
      .expect(204);

    const check = await cartRepo.get('test-user-id');
    expect(check).to.be.null();
  });

  it('adds an item to shopping cart', async () => {
    await cartRepo.set('test-user-id', {items: []});
    await client
      .post('/shoppingCarts/test-user-id/items')
      .set('Authorization', 'Bearer ' + token)
      .send({productId: 'product2', quantity: 3, price: 50})
      .expect(200);

    const savedCart = await cartRepo.get('test-user-id');
    expect(savedCart.items!.length).to.equal(1);
    expect(savedCart.items![0].quantity).to.equal(3);
  });
});
