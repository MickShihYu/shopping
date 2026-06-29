import {Provider} from '@loopback/core';
import {
  Authorizer,
  AuthorizationContext,
  AuthorizationMetadata,
  AuthorizationDecision,
} from '@loopback/authorization';
import {PermissionKey} from '../permission-keys';

export class MyAuthorizationProvider implements Provider<Authorizer> {
  value(): Authorizer {
    return this.authorize.bind(this);
  }

  async authorize(
    context: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ): Promise<AuthorizationDecision> {
    console.log(
      'AUTHORIZE CALLED',
      (metadata as any).permissions,
      context.principals[0],
    );
    return AuthorizationDecision.ALLOW;
    const requiredPermissions = (metadata as any).permissions as string[];
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return AuthorizationDecision.ALLOW;
    }

    if (context.principals.length === 0) {
      return AuthorizationDecision.DENY;
    }

    if (requiredPermissions.includes('*')) {
      return AuthorizationDecision.ALLOW;
    }

    const currentUser = context.principals[0];
    const userPermissions = (currentUser.permissions as string[]) || [];

    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      return AuthorizationDecision.DENY;
    }

    if (
      userPermissions.includes(PermissionKey.SuperAdminAccess) ||
      userPermissions.includes(PermissionKey.AdministratorAccess)
    ) {
      return AuthorizationDecision.ALLOW;
    }

    const args = context.invocationContext.args || [];
    if (args.includes(currentUser.id)) {
      return AuthorizationDecision.ALLOW;
    }

    return AuthorizationDecision.DENY;
  }
}
