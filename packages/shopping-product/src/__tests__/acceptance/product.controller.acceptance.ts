import {Client, expect} from '@loopback/testlab';
import {ShoppingApplication} from '../..';
import {setupApplication} from './helper';
import {ProductRepository} from '../../repositories';

describe('ProductController', () => {
  let app: ShoppingApplication;
  let client: Client;
  let productRepo: ProductRepository;

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());
    productRepo = await app.getRepository(ProductRepository);
  });

  beforeEach(async () => {
    await productRepo.deleteAll();
  });

  after(async () => {
    await app.stop();
  });

  it('invokes GET /products/count', async () => {
    await productRepo.create({
      name: 'Test Product',
      price: 10,
      description: 'A test product',
      isActive: true,
      inventory: 10,
    });

    const res = await client.get('/products/count').expect(200);
    expect(res.body).to.containEql({count: 1});
  });

  it('invokes GET /products', async () => {
    const product = await productRepo.create({
      name: 'Test Product 2',
      price: 20,
      description: 'Another test product',
      isActive: true,
      inventory: 5,
    });

    const res = await client.get('/products').expect(200);
    expect(res.body).to.be.Array();
    expect(res.body.length).to.equal(1);
    expect(res.body[0].name).to.equal('Test Product 2');
    expect(res.body[0].price).to.equal(20);
    expect(res.body[0].productId).to.equal(product.productId?.toString());
  });

  it('invokes GET /products/{id}', async () => {
    const product = await productRepo.create({
      name: 'Test Product 3',
      price: 30,
      description: 'Yet another test product',
      isActive: true,
      inventory: 15,
    });

    const res = await client.get(`/products/${product.productId}`).expect(200);
    expect(res.body.name).to.equal('Test Product 3');
    expect(res.body.price).to.equal(30);
  });

  it('does not count inactive products or products with no inventory for public endpoints', async () => {
    await productRepo.create({
      name: 'Inactive Product',
      price: 10,
      isActive: false,
      inventory: 10,
    });

    await productRepo.create({
      name: 'No Inventory Product',
      price: 10,
      isActive: true,
      inventory: 0,
    });

    const resCount = await client.get('/products/count').expect(200);
    expect(resCount.body).to.containEql({count: 0});

    const resFind = await client.get('/products').expect(200);
    expect(resFind.body.length).to.equal(0);
  });
});
