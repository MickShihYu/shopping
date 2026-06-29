import * as http from 'http';

// MOCK PORTS
const PRODUCT_PORT = 3001;
const AUTH_PORT = 3003;

process.env.PRODUCT_SERVICE_URL = `http://127.0.0.1:${PRODUCT_PORT}`;
process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${AUTH_PORT}`;

import {ShoppingApplication} from '../..';
import {
  createRestAppClient,
  givenHttpServerConfig,
  Client,
} from '@loopback/testlab';
import {TokenServiceBindings} from '@loopback/authentication-jwt';

export interface AppWithClient {
  app: ShoppingApplication;
  client: Client;
}

let mockServer: http.Server | undefined;
let mockAuthServer: http.Server | undefined;

export async function setupApplication(): Promise<AppWithClient> {
  const app = new ShoppingApplication({
    rest: givenHttpServerConfig(),
    databaseSeeding: false,
  });

  await app.boot();
  await app.start();

  const client = createRestAppClient(app);

  if (!mockServer) {
    mockServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url?.includes('/products/')) {
        res.writeHead(200);
        if (req.method === 'GET') {
          res.end(
            JSON.stringify({
              id: 'p1',
              name: 'Mock Product',
              price: 100,
              isActive: true,
            }),
          );
        } else {
          res.end(JSON.stringify({success: true}));
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    mockServer.listen(PRODUCT_PORT, '127.0.0.1');
  }

  if (!mockAuthServer) {
    mockAuthServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url?.includes('/users/')) {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
          }),
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    mockAuthServer.listen(AUTH_PORT, '127.0.0.1');
  }

  return {app, client};
}

export async function teardownApplication(app: ShoppingApplication) {
  await app.stop();
  if (mockServer) {
    mockServer.close();
    mockServer = undefined;
  }
  if (mockAuthServer) {
    mockAuthServer.close();
    mockAuthServer = undefined;
  }
}

export async function generateToken(
  app: ShoppingApplication,
  userProfile: any,
): Promise<string> {
  const tokenService = await app.get(TokenServiceBindings.TOKEN_SERVICE);
  return tokenService.generateToken(userProfile);
}
