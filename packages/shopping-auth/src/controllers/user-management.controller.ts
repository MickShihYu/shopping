// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  authenticate,
  STRATEGY,
  AuthenticationBindings,
} from 'loopback4-authentication';
import { TokenService, UserService } from '@loopback/authentication';
import { TokenServiceBindings } from '@loopback/authentication-jwt';
import { authorize } from 'loopback4-authorization';
import { PermissionKey } from '../permission-keys';
import { inject } from '@loopback/core';
import { model, property, repository } from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  post,
  put,
  requestBody,
  Request,
  RestBindings,
} from '@loopback/rest';
import { securityId } from '@loopback/security';
import _ from 'lodash';
import { PasswordHasherBindings, UserServiceBindings } from '../keys';
import { ResetPasswordInit, User, KeyAndPassword } from '../models';
import { Credentials, RoleRepository, UserRepository, RevokedTokenRepository } from '../repositories';
import {
  PasswordHasher,
  UserManagementService,
  validateCredentials,
  validateKeyPassword,
} from '../services';
import { OPERATION_SECURITY_SPEC } from '../utils';
import {
  CredentialsRequestBody,
  PasswordResetRequestBody,
  UserProfileSchema,
} from './specs/user-controller.specs';
import isemail from 'isemail';
import { SentMessageInfo } from 'nodemailer';

@model()
export class NewUserRequest extends User {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}

export class UserManagementController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(RoleRepository)
    public roleRepository: RoleRepository,
    @repository(RevokedTokenRepository)
    public revokedTokenRepo: RevokedTokenRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserService<User, Credentials>,
    @inject(UserServiceBindings.USER_SERVICE)
    public userManagementService: UserManagementService,
  ) { }

  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: ['*'] })
  @post('/users', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUserRequest, {
            title: 'NewUser',
          }),
        },
      },
    })
    newUserRequest: NewUserRequest,
    @inject(AuthenticationBindings.CURRENT_USER, { optional: true })
    currentUser?: any,
  ): Promise<User> {
    const isAdmin =
      currentUser?.permissions?.includes(PermissionKey.AdministratorAccess) ||
      currentUser?.permissions?.includes(PermissionKey.SuperAdminAccess);

    if (!isAdmin) {
      const customerRole = await this.roleRepository.findOne({
        where: { name: 'customer' },
      });
      if (!customerRole) {
        throw new HttpErrors.InternalServerError('Customer role not found');
      }
      newUserRequest.roleId = customerRole.id as string;
    } else if (!newUserRequest.roleId) {
      throw new HttpErrors.BadRequest('Role is required');
    }

    // ensure a valid email value and password value
    validateCredentials(_.pick(newUserRequest, ['email', 'password']));

    try {
      newUserRequest.resetKey = '';
      return await this.userManagementService.createUser(newUserRequest);
    } catch (error) {
      // MongoError 11000 duplicate key
      if (error.code === 11000 && error.errmsg.includes('index: uniqueEmail')) {
        throw new HttpErrors.Conflict('Email value is already taken');
      } else {
        throw error;
      }
    }
  }

  @authorize({ permissions: ['*'] })
  @post('/users/sign-up', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async signUp(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUserRequest, {
            title: 'NewUser',
          }),
        },
      },
    })
    newUserRequest: NewUserRequest,
    @inject(AuthenticationBindings.CURRENT_USER, { optional: true })
    currentUser?: any,
  ): Promise<User> {
    const customerRole = await this.roleRepository.findOne({
      where: { name: 'customer' },
    });
    if (!customerRole) {
      throw new HttpErrors.InternalServerError('Customer role not found');
    }
    newUserRequest.roleId = customerRole.id as string;

    // ensure a valid email value and password value
    validateCredentials(_.pick(newUserRequest, ['email', 'password']));

    try {
      newUserRequest.resetKey = '';
      return await this.userManagementService.createUser(newUserRequest);
    } catch (error) {
      // MongoError 11000 duplicate key
      if (error.code === 11000 && error.errmsg.includes('index: uniqueEmail')) {
        throw new HttpErrors.Conflict('Email value is already taken');
      } else {
        throw error;
      }
    }
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({
    permissions: [
      PermissionKey.AdministratorAccess,
      PermissionKey.CustomerAccess,
    ],
  })
  @put('/users/{userId}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async set(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: any,
    @param.path.string('userId') userId: string,
    @requestBody({ description: 'update user' }) user: User,
  ): Promise<void> {
    try {
      // Only admin can assign roles
      if (currentUserProfile.roleName !== 'admin') {
        delete (user as any).roleId;
      }
      return await this.userRepository.updateById(userId, user);
    } catch (e) {
      return e;
    }
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({
    permissions: [
      PermissionKey.AdministratorAccess,
      PermissionKey.CustomerAccess,
    ],
  })
  @get('/users/{userId}', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async findById(@param.path.string('userId') userId: string): Promise<User> {
    return this.userRepository.findById(userId);
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: ['*'] })
  @get('/users/me', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'The current user profile',
        content: {
          'application/json': {
            schema: UserProfileSchema,
          },
        },
      },
    },
  })
  async printCurrentUser(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: any,
  ): Promise<any> {
    const userId = currentUserProfile[securityId];
    const user = await this.userRepository.findById(userId);
    const role = await this.roleRepository.findById(user.roleId);
    return {
      ...user,
      roleName: role.name,
      permissions: role.permissions,
    };
  }

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{ token: string }> {
    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    const role = await this.roleRepository.findById(user.roleId);
    user.role = role;

    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = await this.userService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);

    return { token };
  }

  @authenticate(STRATEGY.BEARER)
  @put('/users/forgot-password', {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      '200': {
        description: 'The updated user profile',
        content: {
          'application/json': {
            schema: UserProfileSchema,
          },
        },
      },
    },
  })
  async forgotPassword(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUserProfile: any,
    @requestBody(PasswordResetRequestBody) credentials: Credentials,
  ): Promise<{ token: string }> {
    const { email, password } = credentials;
    const { id } = currentUserProfile;

    const user = await this.userRepository.findById(id, {
      include: [{ relation: 'role' }],
    });

    if (!user) {
      throw new HttpErrors.NotFound('User account not found');
    }

    if (email !== user?.email) {
      throw new HttpErrors.Forbidden('Invalid email address');
    }

    validateCredentials(_.pick(credentials, ['email', 'password']));

    const passwordHash = await this.passwordHasher.hashPassword(password);

    await this.userRepository
      .userCredentials(user.id)
      .patch({ password: passwordHash });

    const userProfile = await this.userService.convertToUserProfile(user);

    const token = await this.jwtService.generateToken(userProfile);

    return { token };
  }

  @post('/users/reset-password/init', {
    responses: {
      '200': {
        description: 'Confirmation that reset password email has been sent',
      },
    },
  })
  async resetPasswordInit(
    @requestBody() resetPasswordInit: ResetPasswordInit,
  ): Promise<string> {
    if (!isemail.validate(resetPasswordInit.email)) {
      throw new HttpErrors.UnprocessableEntity('Invalid email address');
    }

    const sentMessageInfo: SentMessageInfo =
      await this.userManagementService.requestPasswordReset(
        resetPasswordInit.email,
      );

    if (sentMessageInfo.accepted.length) {
      return 'Successfully sent reset password link';
    }
    throw new HttpErrors.InternalServerError(
      'Error sending reset password email',
    );
  }

  @put('/users/reset-password/finish', {
    responses: {
      '200': {
        description: 'A successful password reset response',
      },
    },
  })
  async resetPasswordFinish(
    @requestBody() keyAndPassword: KeyAndPassword,
  ): Promise<string> {
    validateKeyPassword(keyAndPassword);

    const foundUser = await this.userRepository.findOne({
      where: { resetKey: keyAndPassword.resetKey },
    });

    if (!foundUser) {
      throw new HttpErrors.NotFound(
        'No associated account for the provided reset key',
      );
    }

    const user = await this.userManagementService.validateResetKeyLifeSpan(
      foundUser,
    );

    const passwordHash = await this.passwordHasher.hashPassword(
      keyAndPassword.password,
    );

    try {
      await this.userRepository
        .userCredentials(user.id)
        .patch({ password: passwordHash });

      await this.userRepository.updateById(user.id, user);
    } catch (e) {
      return e;
    }

    return 'Password reset successful';
  }

  @authenticate(STRATEGY.BEARER)
  @authorize({ permissions: ['*'] })
  @post('/users/logout', {
    responses: {
      '204': {
        description: 'User successfully logged out',
      },
    },
  })
  async logout(
    @inject(RestBindings.Http.REQUEST) request: Request,
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new HttpErrors.Unauthorized('Authorization header not found');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new HttpErrors.Unauthorized('Token not found in Authorization header');
    }

    await this.revokedTokenRepo.set(token, { token });
  }
}
