import * as dependencies from './dependencies';
const qsParse = dependencies.qsParse;
const relScraper = dependencies.relScraper;
const qsStringify = dependencies.qsStringify;
const objectToFormData = dependencies.objectToFormData;
const appendQueryString = dependencies.appendQueryString;
if (dependencies.FormData && !global.FormData) {
  global.FormData = dependencies.FormData;
}
if (dependencies.JSDOM && !global.DOMParser) {
  global.DOMParser = new dependencies.JSDOM().window.DOMParser;
}
if (dependencies.URL && !global.URL) {
  global.URL = dependencies.URL;
}

const defaultSettings = {
  me: '',
  token: '',
  // want more endpoints, or name them differently?
  // you can override relEndpoints when creating an IndieAuthentication!
  relEndpoints: {
    'authorization_endpoint': 'auth',
    'token_endpoint': 'token',
    'micropub': 'micropub'
  }
  // pass in `scope` when creating a new instance if you want to
  // get an access token suitable for micropub/-sub
};

// FIXME: internal mappings, always capture authorization and
// token endpoints so we can use them to build URLs etc.!

const iauthnError = (message, status = null, error = null) => {
  return {
    message: message,
    status: status,
    error: error,
  };
};

class IndieAuthentication {
  constructor(userSettings = {}) {
    this.options = Object.assign({}, defaultSettings, userSettings);

    // Bind all the things
    this.checkRequiredOptions = this.checkRequiredOptions.bind(this);
    this.getAuthUrl = this.getAuthUrl.bind(this);
    this.getEndpointsFromUrl = this.getEndpointsFromUrl.bind(this);
  }

  /**
   * Checks to see if the given options are set
   * @param  {array} requirements An array of option keys to check
   * @return {object}             An object with boolean pass property and array missing property listing missing options
   */
  checkRequiredOptions(requirements) {
    let missing = [];
    let pass = true;
    for (var i = 0; i < requirements.length; i++) {
      const optionName = requirements[i];
      const option = this.options[optionName];
      if (!option) {
        pass = false;
        missing.push(optionName);
      }
    }
    return {
      pass: pass,
      missing: missing,
    };
  }

  /**
   * Canonicalize the given url according to the rules at
   * https://indieauth.spec.indieweb.org/#url-canonicalization
   * @param  {string} url The url to canonicalize
   * @return {string}     The canonicalized url.
   */
  getCanonicalUrl(url) {
    return (new URL(url)).href;
  }

  /**
   * Fetch a URL, keeping track of 301 redirects to update
   * https://indieauth.spec.indieweb.org/#redirect-examples
   * @param  {string} url The url to scrape
   * @return {Promise}    Passes the fetch response object and the "final" url.
   */
   getUrlWithRedirects(url) {
    return new Promise((fulfill, reject) => {
      // fetch the url
      fetch(url, { redirect: 'manual' })
        .then(res => {
          if (res.ok) {
            // response okay! return the response and the canonical url we found
            return fulfill({ response: res, url: url });
          } else {
            if (res.status == 301 || res.status == 308) {
              // permanent redirect means we use this new url as canonical
              // so, recurse on the new url!
              this.getUrlWithRedirects(res.headers.get('location'))
                .then(result => fulfill(result))
                .catch(err => reject(err));
            } else if (res.status == 302 || res.status == 307) {
              // temporary redirect means we use the new url for discovery, but
              // don't treat it as canonical
              const followUrl = res.headers.get('location');
              fetch(followUrl)
                .then(res => {
                  if (res.ok) {
                    return fulfill({ response: res, url: followUrl });
                  } else {
                    return reject(iauthnError('Error getting page', res.status, followUrl));
                  }
                });
            } else {
              return reject(iauthnError('Error getting page', res.status, url));
            }
          }
        })
      .catch(err => {
        reject(iauthnError(`Error fetching ${url}`, null, err));
       });
    });
   }

  /**
   * Get the authorization endpoint needed from the given url
   * @param  {string} url The url to scrape
   * @return {Promise}    Passes an object of endpoints on success based on relEndpoints mapping
   */
  getEndpointsFromUrl(url) {
    return new Promise((fulfill, reject) => {
      let endpoints = { };
      let rels_to_endpoints = this.options.relEndpoints;
      // Make sure the url is canonicalized
      url = this.getCanonicalUrl(url);
      let baseUrl = url;
      this.getUrlWithRedirects(url)
        .then(result => {
          let res = result.response;
          url = result.url;
          baseUrl = result.url;
          // Check for endpoints in headers
          const linkHeaders = res.headers.get('link');
          if (linkHeaders) {
            const links = linkHeaders.split(',');
            links.forEach(link => {
              Object.keys(rels_to_endpoints).forEach(key => {
                const rel = link.match(/rel=("([^"]*)"|([^,"<]+))/);
                if (
                  rel &&
                  rel[1] &&
                  (' ' + rel[1].toLowerCase() + ' ').indexOf(' ' + key + ' ') >=
                    0
                ) {
                  const linkValues = link.match(/[^<>|\s]+/g);
                  if (linkValues && linkValues[0]) {
                    let endpointUrl = linkValues[0];
                    endpointUrl = new URL(endpointUrl, url).toString();
                    endpoints[rels_to_endpoints[key]] = endpointUrl;
                  }
                }
              });
            });
          }

          return res.text();
        })
        .then(html => {
          // Get rel links
          const rels = relScraper(html, baseUrl);

          // Save necessary endpoints.
          this.options.me = url;
          if (rels) {
            Object.keys(rels_to_endpoints).forEach(key => {
              if (rels[key] && rels[key][0]) {
                endpoints[rels_to_endpoints[key]] = rels[key][0];
              }
            });
          }

          let endpoint_keys = Object.keys(endpoints);
          if ( endpoint_keys.length > 0 ) {
            // duplicate into this.options for later reference
            this.options.endpoints = endpoints;
            // keep backwards-compatible entries:
            let authEndpointKey = rels_to_endpoints['authorization_endpoint'];
            if( endpoints[authEndpointKey] ){
              this.options.authEndpoint = endpoints[authEndpointKey];
            }
            let tokenEndpointKey = rels_to_endpoints['token_endpoint'];
            if( endpoints[tokenEndpointKey] ){
              this.options.tokenEndpoint = endpoints[tokenEndpointKey];
            }
            let micropubEndpointKey = rels_to_endpoints['micropub'];
            if( endpoints[micropubEndpointKey] ){
              this.options.micropubEndpoint = endpoints[micropubEndpointKey];
            }

            return fulfill(endpoints);
          }

          return reject(iauthnError('Error getting authorization header data'));
        })
        .catch(err => reject(err));
      });
  }

  verifyCode(code) {
    return new Promise((fulfill, reject) => {
      let requiredOptions = ['me','clientId','redirectUri'];
      if( this.options.scope ){
        requiredOptions = requiredOptions.concat(['tokenEndpoint']);
      } else {
        requiredOptions = requiredOptions.concat(['authEndpoint']);
      }
      const requirements = this.checkRequiredOptions(requiredOptions);
      if (!requirements.pass) {
        return reject(
          iauthnError(
            'Missing required options: ' + requirements.missing.join(', '),
          ),
        );
      }

      let data = {
        code: code,
        client_id: this.options.clientId,
        redirect_uri: this.options.redirectUri,
      };

      let endpoint = this.options.authEndpoint;

      if( this.options.scope ){
        data = data.assign({
          grant_type: 'authorization_code'
        });
        endpoint = this.options.tokenEndpoint;
      }

      const request = {
        method: 'POST',
        body: qsStringify(data),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json, application/x-www-form-urlencoded',
        },
        // mode: 'cors',
      };
      fetch(endpoint, request)
        .then(res => {
          if (!res.ok) {
            return reject(iauthnError('Error validating auth code', res.status));
          }
          const contentType = res.headers.get('Content-Type');
          if (contentType && contentType.indexOf('application/json') === 0) {
            return res.json();
          } else {
            return res.text();
          }
        })
        .then(result => {
          // Parse the response from the indieauth server
          if (typeof result === 'string') {
            result = qsParse(result);
          }
          if (result.error_description) {
            return reject(iauthnError(result.error_description));
          } else if (result.error) {
            return reject(iauthnError(result.error));
          }
          if (!result.me) {
            return reject(
              iauthnError(
                'The auth endpoint did not return the expected parameters',
              ),
            );
          }
          // Check me is the same (removing any trailing slashes)
          if (
            result.me &&
            result.me.replace(/\/+$/, '') !==
              this.options.me.replace(/\/+$/, '')
          ) {
            return reject(iauthnError('The me values did not match'));
          }
          // Successfully verified the code
          // FIXME: if scope, send back the token, too!
          fulfill(result.me);
        })
        .catch(err =>
          reject(iauthnError('Error verifying authorization code', null, err)),
        );
    });
  }

  /**
   * Get the authentication url based on the set options
   * @return {string|boolean} The authentication url or false on missing options
   */
  getAuthUrl() {
    return new Promise((fulfill, reject) => {
      let requirements = this.checkRequiredOptions(['me']);
      if (!requirements.pass) {
        return reject(
          iauthnError(
            'Missing required options: ' + requirements.missing.join(', '),
          ),
        );
      }
      this.getEndpointsFromUrl(this.options.me)
        .then(() => {
          let requirements = this.checkRequiredOptions([
            'me',
            'clientId',
            'redirectUri',
          ]);
          if (!requirements.pass) {
            return reject(
              iauthnError(
                'Missing required options: ' + requirements.missing.join(', '),
              ),
            );
          }
          const authParams = {
            me: this.options.me,
            client_id: this.options.clientId,
            redirect_uri: this.options.redirectUri,
            state: this.options.state,
          };
          if( this.options.scope ){
            // if there's a scope, we'll request a code to exchange for an
            // access token.
            authParams['scope'] = this.options.scope;
            authParams['response_type'] = 'code';
          } else {
            // otherwise we just want to auth this user
            authParams['response_type'] = 'id';
          }

          fulfill(this.options.authEndpoint + '?' + qsStringify(authParams));
        })
        .catch(err =>
          reject(iauthnError('Error getting auth url', null, err)),
        );
    });
  }

}

export default IndieAuthentication;
