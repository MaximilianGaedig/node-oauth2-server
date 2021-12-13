'use strict';

/**
 * Module dependencies.
 */

const AuthenticateHandler = require('./handlers/authenticate-handler');
const AuthorizeHandler = require('./handlers/authorize-handler');
const InvalidArgumentError = require('./errors/invalid-argument-error');
const TokenHandler = require('./handlers/token-handler');

/**
 * Constructor.
 */
function OAuth2Server(options) {
  options = options || {};

  if (!options.model) {
    throw new InvalidArgumentError('Missing parameter: `model`');
  }

  this.options = options;
}

/**
 * Authenticate a token.
 */
OAuth2Server.prototype.authenticate = function(request, response, options) {

  if (typeof options === 'string') {
    options = {scope: options};
  }

  options = Object.assign({
    addAcceptedScopesHeader: true,
    addAuthorizedScopesHeader: true,
    allowBearerTokensInQueryString: false
  }, this.options, options);

  const handler = new AuthenticateHandler(options);
  
  return handler.handle(request, response);

};

/**
 * Authorize a request.
 */
OAuth2Server.prototype.authorize = function(request, response, options) {

  options = Object.assign({
    allowEmptyState: false,
    authorizationCodeLifetime: 300 // 5 * 60 = 5 minutes.
  }, this.options, options);

  const handler = new AuthorizeHandler(options);

  return handler.handle(request, response);

};

/**
 * Create a token.
 */
OAuth2Server.prototype.token = function(request, response, options) {

  options = Object.assign({
    accessTokenLifetime: 3600, // 60 * 60 = 1 hour.
    refreshTokenLifetime: 1209600,  // 60 * 60 * 24 * 14 = 2 weeks.
    allowExtendedTokenAttributes: false,
    requireClientAuthentication: {}  // defaults to true for all grant types
  }, this.options, options);

  const handler = new TokenHandler(options);

  return handler.handle(request, response);

};

/**
 * Export constructor.
 */

module.exports = OAuth2Server;
