import { Client, expect } from '@loopback/testlab';
import { ShoppingApplication } from '../..';
import { setupApplication, teardownApplication, generateToken } from './helper';
import { securityId } from '@loopback/security';
import { OrderRepository } from '../../repositories';

describe('AdminOrderController', () => {
  let app: ShoppingApplication;
  let client: Client;
  let orderRepo: OrderRepository;

  const testAdmin = {
    [securityId]: 'admin123',
    id: 'admin123',
    name: 'Admin User',
    email: 'admin@example.com',
    roleName: 'admin',
    permissions: ['AdministratorAccess'],
  };

  let token: string;

  before('setupApplication', async () => {
    ({ app, client } = await setupApplication());
    orderRepo = await app.get('repositories.OrderRepository');
    token = await generateToken(app, testAdmin);
  });

  after(async () => {
    await teardownApplication(app);
  });

  beforeEach(async () => {
    await orderRepo.deleteAll();
  });

  it('searches all orders with filters for admins', async () => {
    await orderRepo.create({
      orderId: 'o1',
      userId: 'user123',
      total: 100,
      status: 'PENDING',
      products: [{ productId: 'p1', quantity: 1, price: 100 }],
      date: new Date().toString(),
      email: 'search@example.com',
    });
    await orderRepo.create({
      orderId: 'o2',
      userId: 'user456',
      total: 50,
      status: 'SHIPPED',
      products: [{ productId: 'p1', quantity: 1, price: 50 }],
      date: new Date().toString(),
      email: 'other@example.com',
    });

    const res = await client
      .post('/admin/orders')
      .set('Authorization', 'Bearer ' + token)
      .send({ status: 'PENDING' })
      .expect(200);

    expect(res.body).to.be.Array();
    expect(res.body.length).to.equal(1);
    expect(res.body[0].orderId).to.equal('o1');
  });

  it('updates order status for admins', async () => {
    const created = await orderRepo.create({
      userId: 'u1',
      total: 50,
      status: 'PENDING',
      products: [{ productId: 'p1', quantity: 1, price: 50 }],
    });

    await client
      .patch(`/admin/orders/${created.getId()}/status`)
      .set('Authorization', 'Bearer ' + token)
      .send({ status: 'PROCESSING' })
      .expect(204);

    const saved = await orderRepo.findById(created.getId());
    expect(saved.status).to.equal('PROCESSING');
  });

  it('gets dashboard statistics', async () => {
    await orderRepo.create({
      userId: 'u1',
      total: 100,
      status: 'SHIPPED',
      products: [{ productId: 'p1', quantity: 1, price: 100 }],
      date: new Date().toString(),
    });

    const res = await client
      .get('/admin/orders/dashboard')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(res.body.todayOrdersCount).to.be.Number();
    expect(res.body.todayRevenue).to.be.Number();
    expect(res.body.ordersByStatus.SHIPPED).to.equal(1);
  });

  it('gets single order detail', async () => {
    const created = await orderRepo.create({
      userId: 'user1',
      total: 150,
      status: 'PENDING',
      products: [{ productId: 'p1', quantity: 1, price: 150 }],
    });

    const res = await client
      .get(`/admin/orders/${created.orderId}`)
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    expect(res.body.order.orderId).to.equal(created.orderId?.toString());
    expect(res.body.customer).to.have.property('firstName', 'Test'); // From mock server
  });
});
