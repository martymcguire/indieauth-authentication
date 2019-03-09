const assert = require('assert')
const fetch = require('node-fetch');
const IndieAuthentication = require('../src/main.js');

describe('URL resolution', function() {
  // https://indieauth.spec.indieweb.org/#url-canonicalization
  it('should canonicalize a URL', function() {
		const indieauthn = new IndieAuthentication();
		var canon = indieauthn.getCanonicalUrl('http://example.com');
    assert.equal(canon, 'http://example.com/');
  });

	it('should get response with url', async () => {
		const indieauthn = new IndieAuthentication();
    let result = await indieauthn.getUrlWithRedirects('https://martymcgui.re/');
    assert.equal(result.url, 'https://martymcgui.re/');
    assert.equal(result.response.ok, true);
  });

  // https://indieauth.spec.indieweb.org/#discovery-by-clients
	it('should get response with updated url on 301 redirect', async () => {
		const indieauthn = new IndieAuthentication();
    let result = await indieauthn.getUrlWithRedirects('http://mmg.re');
    assert.equal(result.url, 'https://martymcgui.re/');
    assert.equal(result.response.ok, true);
  });
});

describe('endpoint resolution', function() {
	it('should find authorization endpoint', async () => {
		const indieauthn = new IndieAuthentication();
    let endpoints = await indieauthn.getEndpointsFromUrl('https://martymcgui.re/');
    assert.equal(endpoints.auth, 'https://indieauth.com/auth');
  });
	it('should get authorization redirect url', async () => {
		const indieauthn = new IndieAuthentication({
      me: 'http://mmg.re',
      clientId: 'https://example.com/',
      redirectUri: 'https://example.com/indieauth-redirect'
    });
    let redirect_url = await indieauthn.getAuthUrl();
    assert.equal(redirect_url, 'https://indieauth.com/auth?me=https%3A%2F%2Fmartymcgui.re%2F&client_id=https%3A%2F%2Fexample.com%2F&redirect_uri=https%3A%2F%2Fexample.com%2Findieauth-redirect&response_type=id');
  });
});

describe('endpoint resolution overrides', function() {
  it('should find microsub endpoint', async () => {
    const indieauthn = new IndieAuthentication({
      'relEndpoints': {
        'microsub': 'microsub'
      }
    });
    let endpoints = await indieauthn.getEndpointsFromUrl('https://martymcgui.re/');
    assert.equal(endpoints.microsub, 'https://aperture.maktro.net/microsub/1');
  });
  it('should find "authz" endpoint', async () => {
    const indieauthn = new IndieAuthentication({
      'relEndpoints': {
        'authorization_endpoint': 'authz'
      }
    });
    let endpoints = await indieauthn.getEndpointsFromUrl('https://martymcgui.re/');
    assert.equal(endpoints.authz, 'https://indieauth.com/auth');
  });
	it('should get authorization redirect url after renaming', async () => {
		const indieauthn = new IndieAuthentication({
      me: 'http://martymcgui.re',
      clientId: 'https://example.com/',
      redirectUri: 'https://example.com/indieauth-redirect',
      relEndpoints: {
        'authorization_endpoint': 'authz'
      }
    });
    let redirect_url = await indieauthn.getAuthUrl();
    assert.equal(redirect_url, 'https://indieauth.com/auth?me=https%3A%2F%2Fmartymcgui.re%2F&client_id=https%3A%2F%2Fexample.com%2F&redirect_uri=https%3A%2F%2Fexample.com%2Findieauth-redirect&response_type=id');
  });
});
