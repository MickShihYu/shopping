// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {AuthenticationComponent, Strategies} from 'loopback4-authentication';
import {
  AuthorizationComponent,
  AuthorizationBindings,
} from 'loopback4-authorization';
import {TokenServiceBindings} from '@loopback/authentication-jwt';
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig, BindingKey} from '@loopback/core';
import {RepositoryMixin, SchemaMigrationOptions} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import crypto from 'crypto';
import path from 'path';
import {PasswordHasherBindings} from './keys';
import {ShoppySequence} from './sequence';
import {BcryptHasher, JWTService} from './services';
import {BearerTokenVerifyProvider} from './providers/bearer-token-verify.provider';
import {MyAuthorizationProvider} from './providers/authorization.provider';

/**
 * Information from package.json
 */
export interface PackageInfo {
  name: string;
  version: string;
  description: string;
}
export const PackageKey = BindingKey.create<PackageInfo>('application.package');

const pkg: PackageInfo = require('../package.json');

export class ShoppingApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options?: ApplicationConfig) {
    super(options);

    // Generate RSA key pair if not in environment
    let privateKey = process.env.JWT_PRIVATE_KEY;
    let publicKey = process.env.JWT_PUBLIC_KEY;
    if (!privateKey || !publicKey) {
      const keypair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });
      privateKey = privateKey || keypair.privateKey;
      publicKey = publicKey || keypair.publicKey;
    }

    this.bind('jwt.private.key').to(privateKey);
    this.bind('jwt.public.key').to(publicKey);
    this.bind('jwt.issuer').to(process.env.JWT_ISSUER || 'shopping-service');
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(
      process.env.JWT_EXPIRES_IN || '86400',
    );
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);
    this.bind(PasswordHasherBindings.PASSWORD_HASHER).toClass(BcryptHasher);
    this.bind(PasswordHasherBindings.ROUNDS).to(10);

    this.component(AuthenticationComponent as any);

    this.bind(Strategies.Passport.BEARER_TOKEN_VERIFIER).toProvider(
      BearerTokenVerifyProvider,
    );

    // Set up the custom sequence
    this.sequence(ShoppySequence);

    // Customize @loopback/rest-explorer configuration here
    this.bind(RestExplorerBindings.CONFIG).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.bind(AuthorizationBindings.CONFIG).to({
      allowAlwaysPaths: ['/explorer', '/openapi.json', '/ping'],
    });
    this.component(AuthorizationComponent as any);
    this.bind('authorizationProviders.my-provider').toProvider(
      MyAuthorizationProvider,
    );

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    this.projectRoot = __dirname;
    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async start(): Promise<void> {
    return super.start();
  }
}
