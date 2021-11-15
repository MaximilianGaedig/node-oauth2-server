'use strict';

/**
 * Module dependencies.
 */

const AuthorizationCodeGrantType = require('../../../lib/grant-types/authorization-code-grant-type');
const InvalidArgumentError = require('../../../lib/errors/invalid-argument-error');
const InvalidGrantError = require('../../../lib/errors/invalid-grant-error');
const InvalidRequestError = require('../../../lib/errors/invalid-request-error');
const Request = require('../../../lib/request');
const ServerError = require('../../../lib/errors/server-error');
const should = require('chai').should();

/**
 * Test `AuthorizationCodeGrantType` integration.
 */

describe('AuthorizationCodeGrantType integration', function() {

  const defaultModel = {
    getAuthorizationCode: function() { 
      return Promise.resolve({
        authorizationCode: 12345,
        expiresAt: new Date(new Date() * 2),
        user: {},
        client: { id: 'foobar' },
      }); 
    },
    revokeAuthorizationCode: function() {
      return Promise.resolve(true);
    },
    saveToken: function() {
      return Promise.resolve({});
    },
    validateScope: function() { return 'read'; }
  };

  const defaultRequest = new Request(
    {
      body: { 
        code: 12345
      },
      headers: {},
      method: {},
      query: {}
    }
  );

  describe('constructor()', function() {

    it('should throw an error if `model` is missing', function() {
      try {
        new AuthorizationCodeGrantType();

        should.fail();
      } catch (e) {
        e.should.be.an.instanceOf(InvalidArgumentError);
        e.message.should.equal('Missing parameter: `model`');
      }
    });

    it('should throw an error if the model does not implement `getAuthorizationCode()`', function() {
      try {
        new AuthorizationCodeGrantType({ model: {} });

        should.fail();
      } catch (e) {
        e.should.be.an.instanceOf(InvalidArgumentError);
        e.message.should.equal('Invalid argument: model does not implement `getAuthorizationCode()`');
      }
    });

    it('should throw an error if the model does not implement `revokeAuthorizationCode()`', function() {
      try {
        const model = {
          getAuthorizationCode: function() {}
        };

        new AuthorizationCodeGrantType({ model: model });

        should.fail();
      } catch (e) {
        e.should.be.an.instanceOf(InvalidArgumentError);
        e.message.should.equal('Invalid argument: model does not implement `revokeAuthorizationCode()`');
      }
    });

    it('should throw an error if the model does not implement `saveToken()`', function() {
      try {
        const model = {
          getAuthorizationCode: function() {},
          revokeAuthorizationCode: function() {}
        };

        new AuthorizationCodeGrantType({ model: model });

        should.fail();
      } catch (e) {
        e.should.be.an.instanceOf(InvalidArgumentError);
        e.message.should.equal('Invalid argument: model does not implement `saveToken()`');
      }
    });
  });

  describe('handle()', function() {

    it('should throw an error if `request` is missing', async function() {

      const model = {...defaultModel};
      model.getAuthorizationCode = function() {};
      model.revokeAuthorizationCode = function() {};
      model.saveToken = function() {};

      const grantType = new AuthorizationCodeGrantType(
        {
          accessTokenLifetime: 123,
          model: model
        }
      );

      let result;
      try {
        result = await grantType.handle();
      } catch (err) {
        should.exist(err);
        err.should.be.an.instanceOf(InvalidArgumentError);
        err.message.should.equal('Missing parameter: `request`');
      }

      should.not.exist(result);

    });


    it('should throw an error if `client` is invalid', async function() {

      const client = {};
      const model = {...defaultModel};
      model.getAuthorizationCode = function() { 
        return Promise.resolve({
          authorizationCode: 12345,
          expiresAt: new Date(new Date() * 2),
          user: {},
          // client: { id: 'foobar' },
        }); 
      };

      const grantType = new AuthorizationCodeGrantType(
        {
          accessTokenLifetime: 123,
          model: model
        }
      );

      let result;

      try {
        result = await grantType.handle(defaultRequest, client);
      } catch (err) {
        should.exist(err);
        err.should.be.an.instanceOf(ServerError);
        err.message.should.equal('Server error: `getAuthorizationCode()` did not return a `client` object');
      }

      should.not.exist(result);

    });

    it('should throw an error if `client` is missing', async function() {
      
      const client = null;
      const model = {...defaultModel};
      model.getAuthorizationCode = function() { 
        return Promise.resolve({
          authorizationCode: 12345,
          expiresAt: new Date(new Date() * 2),
          user: {},
        }); 
      };

      const grantType = new AuthorizationCodeGrantType(
        {
          accessTokenLifetime: 123,
          model: model
        }
      );

      let result;

      try {
        result = await grantType.handle(defaultRequest, client);
      } catch (err) {
        should.exist(err);
        err.should.be.an.instanceOf(InvalidArgumentError);
        err.message.should.equal('Missing parameter: `client`');
      }

      should.not.exist(result);

    });

    it('should return a token', async function() {

      const client = { id: 'foobar' };
      const grantType = new AuthorizationCodeGrantType(
        {
          accessTokenLifetime: 123,
          model: defaultModel
        }
      );

      let result;

      try {
        result = await grantType.handle(defaultRequest, client);
      } catch (err) {
        should.not.exist(err, err.stack);
      }
      should.exist(result);
      result.should.eql({}, 'data should equal ');

    });


    it('should support promises', function() {

      const client = { id: 'foobar' };
      const grantType = new AuthorizationCodeGrantType({ accessTokenLifetime: 123, model: defaultModel });

      grantType.handle(defaultRequest, client).should.be.an.instanceOf(Promise);
    });

    it('should support non-promises', function() {
      const client = { id: 'foobar' };

      const model = {...defaultModel};
      model.getAuthorizationCode = function() { 
        return {
          authorizationCode: 12345,
          client: { id: 'foobar' },
          expiresAt: new Date(new Date() * 2),
          user: {} 
        }; 
      },
      model.revokeAuthorizationCode = function() { return true; },
      model.saveToken = function() {};

      const grantType = new AuthorizationCodeGrantType(
        {
          accessTokenLifetime: 123,
          model: model
        }
      );

      grantType.handle(defaultRequest, client).should.be.an.instanceOf(Promise);
    });

    it.skip('should not support callbacks', function() {

      const client = { id: 'foobar' };
      const model = {...defaultModel};
      
      model.getAuthorizationCode =  function(code, callback) {
        callback( null, 
          {
            authorizationCode: 12345,
            client: { id: 'foobar' },
            expiresAt: new Date(new Date() * 2),
            user: {}
          }
        ); 
      };

      model.revokeAuthorizationCode =  function(code, callback) {
        callback( null, 
          {
            authorizationCode: 12345,
            client: { id: 'foobar' },
            expiresAt: new Date(new Date() / 2),
            user: {} 
          }
        ); 
      };

      model.saveToken =  function(tokenToSave, client, user, callback) {
        callback( null, tokenToSave);
      };

      const grantType = new AuthorizationCodeGrantType(
        {
          accessTokenLifetime: 123,
          model: model
        }
      );

      grantType.handle(defaultRequest, client);

    });
  });

  describe('getAuthorizationCode()', function() {

    it('should throw an error if the request body does not contain `code`', async function() {

      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: defaultModel 
      }); 
      const request = {...defaultRequest};
      request.body = {};

      try {
        await grantType.getAuthorizationCode(request, {});
      } catch (err) {
        err.should.be.an.instanceOf(InvalidRequestError);
        err.message.should.equal('Missing parameter: `code`');
      }
    });

    it('should throw an error if `code` is invalid', async function() {

      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: defaultModel 
      });
      const request = {...defaultRequest};
      request.body = {code: 'øå€£‰'};

      try {
        await grantType.getAuthorizationCode(request, {});
      } catch (err) {
        err.should.be.an.instanceOf(InvalidRequestError);
        err.message.should.equal('Invalid parameter: `code`');
      }
    });

    it('should throw an error if `authorizationCode` is missing', function() {

      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: defaultModel 
      });
      const request = {...defaultRequest};
      request.body = {code: 12345};

      return grantType.getAuthorizationCode(request, {})
        .then(should.fail)
        .catch(function(e) {
          e.should.be.an.instanceOf(InvalidGrantError);
          e.message.should.equal('Invalid grant: authorization code is invalid');
        });
    });

    it('should throw an error if `authorizationCode.client` is missing', function() {

      const model = {...defaultModel};
      model.getAuthorizationCode = function() { 
        return { authorizationCode: 12345 }; 
      };
      
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      return grantType.getAuthorizationCode(defaultRequest, {})
        .then(should.fail)
        .catch(function(e) {
          e.should.be.an.instanceOf(ServerError);
          e.message.should.equal('Server error: `getAuthorizationCode()` did not return a `client` object');
        });
    });

    it('should throw an error if `authorizationCode.expiresAt` is missing', function() {

      const model = {...defaultModel};
      
      model.getAuthorizationCode = function() { 
        return { authorizationCode: 12345, client: {}, user: {} }; 
      };

      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      return grantType.getAuthorizationCode(defaultRequest, {})
        .then(should.fail)
        .catch(function(e) {
          e.should.be.an.instanceOf(ServerError);
          e.message.should.equal('Server error: `expiresAt` must be a Date instance');
        });
    });

    it('should throw an error if `authorizationCode.user` is missing', function() {
      const client = {};
      const model = {
        getAuthorizationCode: function() { return { authorizationCode: 12345, client: {}, expiresAt: new Date() }; },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      return grantType.getAuthorizationCode(request, client)
        .then(should.fail)
        .catch(function(e) {
          e.should.be.an.instanceOf(ServerError);
          e.message.should.equal('Server error: `getAuthorizationCode()` did not return a `user` object');
        });
    });

    it('should throw an error if the client id does not match', function() {
      const client = { id: 123 };
      const model = {
        getAuthorizationCode: function() {
          return { authorizationCode: 12345, expiresAt: new Date(), client: { id: 456 }, user: {} };
        },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      return grantType.getAuthorizationCode(request, client)
        .then(should.fail)
        .catch(function(e) {
          e.should.be.an.instanceOf(InvalidGrantError);
          e.message.should.equal('Invalid grant: authorization code is invalid');
        });
    });

    it('should throw an error if the auth code is expired', function() {
      const client = { id: 123 };
      const date = new Date(new Date() / 2);
      const model = {
        getAuthorizationCode: function() {
          return { authorizationCode: 12345, client: { id: 123 }, expiresAt: date, user: {} };
        },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      return grantType.getAuthorizationCode(request, client)
        .then(should.fail)
        .catch(function(e) {
          e.should.be.an.instanceOf(InvalidGrantError);
          e.message.should.equal('Invalid grant: authorization code has expired');
        });
    });

    it('should throw an error if the `redirectUri` is invalid', function() {
      const authorizationCode = { authorizationCode: 12345, client: { id: 'foobar' }, expiresAt: new Date(new Date() * 2), redirectUri: 'foobar', user: {} };
      const client = { id: 'foobar' };
      const model = {
        getAuthorizationCode: function() { return authorizationCode; },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      return grantType.getAuthorizationCode(request, client)
        .then(should.fail)
        .catch(function(e) {
          e.should.be.an.instanceOf(InvalidGrantError);
          e.message.should.equal('Invalid grant: `redirect_uri` is not a valid URI');
        });
    });

    it('should return an auth code', function() {
      const authorizationCode = { authorizationCode: 12345, client: { id: 'foobar' }, expiresAt: new Date(new Date() * 2), user: {} };
      const client = { id: 'foobar' };
      const model = {
        getAuthorizationCode: function() { return authorizationCode; },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      return grantType.getAuthorizationCode(request, client)
        .then(function(data) {
          data.should.equal(authorizationCode);
        })
        .catch(should.fail);
    });

    it('should support promises', function() {
      const authorizationCode = { authorizationCode: 12345, client: { id: 'foobar' }, expiresAt: new Date(new Date() * 2), user: {} };
      const client = { id: 'foobar' };
      const model = {
        getAuthorizationCode: function() { return Promise.resolve(authorizationCode); },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      grantType.getAuthorizationCode(request, client).should.be.an.instanceOf(Promise);
    });

    it('should support non-promises', function() {
      const authorizationCode = { authorizationCode: 12345, client: { id: 'foobar' }, expiresAt: new Date(new Date() * 2), user: {} };
      const client = { id: 'foobar' };
      const model = {
        getAuthorizationCode: function() { return authorizationCode; },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      grantType.getAuthorizationCode(request, client).should.be.an.instanceOf(Promise);
    });

    it.skip('should support callbacks', function() {
      const authorizationCode = { authorizationCode: 12345, client: { id: 'foobar' }, expiresAt: new Date(new Date() * 2), user: {} };
      const client = { id: 'foobar' };
      const model = {
        getAuthorizationCode: function(code, callback) { callback(null, authorizationCode); },
        revokeAuthorizationCode: function() {},
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      grantType.getAuthorizationCode(request, client).should.be.an.instanceOf(Promise);
    });
  });

  describe('validateRedirectUri()', function() {
    it('should throw an error if `redirectUri` is missing', function() {
      const authorizationCode = { authorizationCode: 12345, client: {}, expiresAt: new Date(new Date() / 2), redirectUri: 'http://foo.bar', user: {} };
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() { return authorizationCode; },
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345 }, headers: {}, method: {}, query: {} });

      try {
        grantType.validateRedirectUri(request, authorizationCode);

        should.fail();
      } catch (e) {
        e.should.be.an.instanceOf(InvalidRequestError);
        e.message.should.equal('Invalid request: `redirect_uri` is not a valid URI');
      }
    });

    it('should throw an error if `redirectUri` is invalid', function() {
      const authorizationCode = { authorizationCode: 12345, client: {}, expiresAt: new Date(new Date() / 2), redirectUri: 'http://foo.bar', user: {} };
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() { return true; },
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });
      const request = new Request({ body: { code: 12345, redirect_uri: 'http://bar.foo' }, headers: {}, method: {}, query: {} });

      try {
        grantType.validateRedirectUri(request, authorizationCode);

        should.fail();
      } catch (e) {
        e.should.be.an.instanceOf(InvalidRequestError);
        e.message.should.equal('Invalid request: `redirect_uri` is invalid');
      }
    });
  });

  describe('revokeAuthorizationCode()', function() {
    it('should revoke the auth code', function() {
      const authorizationCode = { authorizationCode: 12345, client: {}, expiresAt: new Date(new Date() / 2), user: {} };
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() { return true; },
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      return grantType.revokeAuthorizationCode(authorizationCode)
        .then(function(data) {
          data.should.equal(authorizationCode);
        })
        .catch(should.fail);
    });

    it('should throw an error when the auth code is invalid', function() {
      const authorizationCode = { authorizationCode: 12345, client: {}, expiresAt: new Date(new Date() / 2), user: {} };
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() { return false; },
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      return grantType.revokeAuthorizationCode(authorizationCode)
        .then(function(data) {
          data.should.equal(authorizationCode);
        })
        .catch(function(e) {
          e.should.be.an.instanceOf(InvalidGrantError);
          e.message.should.equal('Invalid grant: authorization code is invalid');
        });
    });

    it('should support promises', function() {
      const authorizationCode = { authorizationCode: 12345, client: {}, expiresAt: new Date(new Date() / 2), user: {} };
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() { return Promise.resolve(true); },
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      grantType.revokeAuthorizationCode(authorizationCode).should.be.an.instanceOf(Promise);
    });

    it('should support non-promises', function() {
      const authorizationCode = { authorizationCode: 12345, client: {}, expiresAt: new Date(new Date() / 2), user: {} };
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() { return authorizationCode; },
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      grantType.revokeAuthorizationCode(authorizationCode).should.be.an.instanceOf(Promise);
    });

    it.skip('should support callbacks', function() {
      const authorizationCode = { authorizationCode: 12345, client: {}, expiresAt: new Date(new Date() / 2), user: {} };
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function(code, callback) { callback(null, authorizationCode); },
        saveToken: function() {}
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      grantType.revokeAuthorizationCode(authorizationCode).should.be.an.instanceOf(Promise);
    });
  });

  describe('saveToken()', function() {
    it('should save the token', function() {
      const token = {};
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() {},
        saveToken: function() { return token; },
        validateScope: function() { return 'foo'; }
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      return grantType.saveToken(token)
        .then(function(data) {
          data.should.equal(token);
        })
        .catch(should.fail);
    });

    it('should support promises', function() {
      const token = {};
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() {},
        saveToken: function() { return Promise.resolve(token); }
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      grantType.saveToken(token).should.be.an.instanceOf(Promise);
    });

    it('should support non-promises', function() {
      const token = {};
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() {},
        saveToken: function() { return token; }
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      grantType.saveToken(token).should.be.an.instanceOf(Promise);
    });

    it.skip('should support callbacks', function() {
      const token = {};
      const model = {
        getAuthorizationCode: function() {},
        revokeAuthorizationCode: function() {},
        saveToken: function(tokenToSave, client, user, callback) { callback(null, token); }
      };
      const grantType = new AuthorizationCodeGrantType({ 
        accessTokenLifetime: 123,
        model: model 
      });

      grantType.saveToken(token).should.be.an.instanceOf(Promise);
    });
  });
});
