import {Client, expect} from '@loopback/testlab';
import {ShoppingApplication} from '../..';
import {setupApplication, teardownApplication, generateToken} from './helper';
import {securityId} from '@loopback/security';
import {OrderRepository} from '../../repositories';

describe('UserOrderController', () => {
  let app: ShoppingApplication;
  let client: Client;
  let orderRepo: OrderRepository;

  const testUser = {
    [securityId]: 'user123',
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    roleName: 'customer',
    permissions: ['CustomerAccess'],
  };

  let token: string;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    orderRepo = await app.get('repositories.OrderRepository');
    token = await generateToken(app, testUser);
  });

  after(async () => {
    await teardownApplication(app);
  });

  beforeEach(async () => {
    await orderRepo.deleteAll();
  });

  it('creates an order', async () => {
    const res = await client
      .post('/users/user123/orders')
      .set('Authorization', 'Bearer ' + token)
      .send({
        products: [{productId: 'p1', quantity: 2}],
      })
      .expect(200);

    expect(res.body.orderId).to.be.String();
    expect(res.body.status).to.equal('PENDING');
  });

  it('gets orders for user', async () => {
    await orderRepo.create({
      orderId: 'o1',
      userId: 'user123',
      total: 100,
      status: 'PENDING',
      products: [{productId: 'p1', quantity: 1, price: 100}],
    });
    const res = await client
      .get('/users/user123/orders')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(res.body).to.be.Array();
    expect(res.body.length).to.equal(1);
    expect(res.body[0].orderId).to.equal('o1');
  });

  it('cancels an order', async () => {
    await orderRepo.create({
      orderId: 'o2',
      userId: 'user123',
      total: 50,
      status: 'PENDING',
      products: [{productId: 'p1', quantity: 1, price: 50}],
    });
    await client
      .patch('/users/user123/orders/o2/cancel')
      .set('Authorization', 'Bearer ' + token)
      .expect(204);

    const saved = await orderRepo.findById('o2');
    expect(saved.status).to.equal('CANCELLED');
  });

  it('deletes orders for user', async () => {
    await orderRepo.create({
      orderId: 'o3',
      userId: 'user123',
      total: 50,
      status: 'PENDING',
      products: [{productId: 'p1', quantity: 1, price: 50}],
    });
    await client
      .delete('/users/user123/orders')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    const orders = await orderRepo.find();
    expect(orders.length).to.equal(0);
  });
});
