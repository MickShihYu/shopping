import {Provider, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors, RestBindings, Request} from '@loopback/rest';
import {verify} from 'jsonwebtoken';
import {VerifyFunction, IAuthUser} from 'loopback4-authentication';
import {securityId} from '@loopback/security';
import {PermissionKey} from '../permission-keys';

export interface AuthUser extends IAuthUser {
  id: string;
  name: string;
  roleName: string;
  permissions: string[];
}

export const AuthenticateErrorKeys = {
  TokenRevoked: 'Token has been revoked',
};

export const UserTenantsErrorKeys = {
  UserDoesNotExist: 'User does not exist',
};

export class BearerTokenVerifyProvider
  implements Provider<VerifyFunction.BearerFn>
{
  constructor(
    @inject(RestBindings.Http.REQUEST) private readonly request: Request,
    @inject('jwt.public.key') private readonly jwtPublicKey: string,
    @inject('jwt.issuer') private readonly jwtIssuer: string,
  ) {}

  value(): VerifyFunction.BearerFn {
    return async (token: string) => {
      let user: AuthUser;
      try {
        user = verify(token, this.jwtPublicKey, {
          issuer: this.jwtIssuer,
          algorithms: ['RS256'],
        }) as AuthUser;
      } catch (err) {
        throw new HttpErrors.Unauthorized(`Invalid Token: ${err.message}`);
      }

      if (!user) {
        throw new HttpErrors.Unauthorized(
          UserTenantsErrorKeys.UserDoesNotExist,
        );
      }

      if (!user.permissions) {
        user.permissions = [];
      }

      (user as any)[securityId] = user.id;

      return user;
    };
  }
}
