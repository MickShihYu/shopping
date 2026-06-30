// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {inject} from '@loopback/context';
import {
  FindRoute,
  HttpErrors,
  InvokeMethod,
  InvokeMiddleware,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
} from '@loopback/rest';
import {AuthenticateFn, AuthenticationBindings} from 'loopback4-authentication';
import {
  AuthorizationBindings,
  AuthorizeErrorKeys,
  AuthorizeFn,
} from 'loopback4-authorization';
import {PermissionKey} from './permission-keys';

const SequenceActions = RestBindings.SequenceActions;

export class ShoppySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.INVOKE_MIDDLEWARE)
    protected invokeMiddleware: InvokeMiddleware,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
    @inject(AuthenticationBindings.USER_AUTH_ACTION)
    protected authenticateRequest: AuthenticateFn<any>,
    @inject(AuthorizationBindings.AUTHORIZE_ACTION)
    protected checkAuthorisation: AuthorizeFn,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;

      // Invoke loopback middleware (handles static files, body parser, etc.)
      const finished = await this.invokeMiddleware(context);
      if (finished) {
        return;
      }

      const route = this.findRoute(request);
      const args = await this.parseParams(request, route);

      let authUser;
      try {
        authUser = await this.authenticateRequest(request, response);
      } catch (ex) {
        const rawMsg = ex?.message?.message ?? ex?.message;
        const errMsg = typeof rawMsg === 'string' ? rawMsg : (rawMsg ? String(rawMsg) : '');

        // Match the exact messages expected by the acceptance tests
        if (errMsg === 'Bearer realm="Users"') {
          const authHeader = request.headers.authorization;
          if (!authHeader) {
            throw new HttpErrors.Unauthorized(
              'Authorization header not found.',
            );
          } else if (!authHeader.startsWith('Bearer ')) {
            throw new HttpErrors.Unauthorized(
              "Authorization header is not of type 'Bearer'.",
            );
          }
        }

        if (errMsg && errMsg.startsWith('Invalid Token: ')) {
          const detail = errMsg.substring('Invalid Token: '.length);
          throw new HttpErrors.Unauthorized(
            `Error verifying token : ${detail}`,
          );
        }

        throw new HttpErrors.Unauthorized(errMsg);
      }

      // Check standard loopback4-authorization permissions
      const isAccessAllowed = await this.checkAuthorisation(
        authUser?.permissions,
        request,
      );

      if (!isAccessAllowed) {
        throw new HttpErrors.Forbidden(AuthorizeErrorKeys.NotAllowedAccess);
      }

      // Enforce the custom role and user-ownership restrictions of the shopping app
      const roleName = authUser?.roleName;
      const isAdmin = roleName === 'admin';
      const isSupport = roleName === 'support';
      const isCustomer = roleName === 'customer';

      const path = request.path;
      const method = request.method;

      // POST /users/{userId}/orders -> only customers can create orders
      if (method === 'POST' && /^\/users\/[^\/]+\/orders$/.test(path)) {
        if (!isCustomer) {
          throw new HttpErrors.Forbidden(AuthorizeErrorKeys.NotAllowedAccess);
        }
      }

      // Admin and support bypass ownership check. Customers must match targetUserId if present.
      if (!isAdmin && !isSupport) {
        const targetUserId = args[0];
        if (targetUserId && typeof targetUserId === 'string' && authUser) {
          // If the target userId does not match authUser.id, deny access
          if (authUser.id !== targetUserId) {
            throw new HttpErrors.Forbidden(AuthorizeErrorKeys.NotAllowedAccess);
          }
        }
      }

      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (err) {
      this.reject(context, err);
    }
  }
}
