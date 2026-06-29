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
import {AuthorizationTags} from '@loopback/authorization';
import {BootMixin} from '@loopback/boot';
import {
  ApplicationConfig,
  BindingKey,
  createBindingFromClass,
} from '@loopback/core';
import {RepositoryMixin, SchemaMigrationOptions} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {PasswordHasherBindings, UserServiceBindings} from './keys';
import {UserWithPassword, Role} from './models';
import {UserRepository, RoleRepository} from './repositories';
import {PermissionKey} from './permission-keys';
import {ShoppySequence} from './sequence';
import {
  UserManagementService,
  BcryptHasher,
  SecuritySpecEnhancer,
  JWTService,
} from './services';
import YAML = require('yaml');
import {ErrorHandlerMiddlewareProvider} from './middlewares';
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

    this.bind('authorizationProviders.my-authorizer')
      .toProvider(MyAuthorizationProvider)
      .tag(AuthorizationTags.AUTHORIZER);

    this.bind(UserServiceBindings.USER_SERVICE).toClass(UserManagementService);

    // Set up the custom sequence
    this.sequence(ShoppySequence);

    // Customize @loopback/rest-explorer configuration here
    this.bind(RestExplorerBindings.CONFIG).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.bind(AuthorizationBindings.CONFIG).to({
      allowAlwaysPaths: [
        '/explorer',
        '/openapi.json',
        '/ping',
        '/users/login',
        '/users/sign-up',
        '/users/forgot-password',
        '/users/reset-password/init',
        '/users/reset-password/finish',
        '/users/{userId}/recommend',
        '/products',
        '/products/count',
        '/products/{id}',
      ],
    });
    this.component(AuthorizationComponent as any);

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
    if (this.options.databaseSeeding !== false) {
      await this.migrateSchema();
    }
    return super.start();
  }

  async migrateSchema(options?: SchemaMigrationOptions): Promise<void> {
    await super.migrateSchema(options);

    // Pre-populate roles
    const roleRepo = await this.getRepository(RoleRepository);
    const existingRoles = await roleRepo.find();
    const existingRoleNames = existingRoles.map(r => r.name);

    if (!existingRoleNames.includes('admin')) {
      await roleRepo.create({
        name: 'admin',
        permissions: [
          PermissionKey.SuperAdminAccess,
          PermissionKey.AdministratorAccess,
          PermissionKey.CustomerAccess,
        ],
      });
    }
    if (!existingRoleNames.includes('support')) {
      await roleRepo.create({
        name: 'support',
        permissions: [
          PermissionKey.AdministratorAccess,
          PermissionKey.CustomerAccess,
        ],
      });
    }
    if (!existingRoleNames.includes('customer')) {
      await roleRepo.create({
        name: 'customer',
        permissions: [PermissionKey.CustomerAccess],
      });
    }

    // Build roleMap from DB
    const allRoles = await roleRepo.find();
    const roleMap: Record<string, string> = {};
    for (const role of allRoles) {
      roleMap[role.name] = role.id!;
    }

    // Pre-populate users
    const userRepo = await this.getRepository(UserRepository);
    const usersDir = path.join(__dirname, '../fixtures/users');
    const userFiles = fs.readdirSync(usersDir);

    for (const file of userFiles) {
      if (file.endsWith('.yml')) {
        const userFile = path.join(usersDir, file);
        const yamlString = YAML.parse(fs.readFileSync(userFile, 'utf8'));

        const existingUsers = await userRepo.findOne({
          where: {email: yamlString.email},
        });
        if (!existingUsers) {
          yamlString.roleId = roleMap[yamlString.role] ?? yamlString.role;
          delete yamlString.role;
          delete yamlString.permissions;
          const userWithPassword = new UserWithPassword(yamlString);
          const userManagementService = await this.get<UserManagementService>(
            UserServiceBindings.USER_SERVICE,
          );
          await userManagementService.createUser(userWithPassword);
        }
      }
    }
  }
}
