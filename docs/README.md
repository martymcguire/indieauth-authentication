# IndieAuth Authentication aka IndieAuthentication

An [IndieAuth](https://indieauth.spec.indieweb.org/) authentication helper library for JavaScript.

## Usage

### Client side useage

Although this library is intended to be usable client side you will likely run into [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) issues so be careful about that.

### Setup

The library is setup as an es6 class, and is initalized by passinging an object of options consisting of `clientId`, `redirectUri`, `me`, and `state`.

```js
import IndieAuthentication from 'indieauth-authentication';
const indieauthn = new IndieAuthentication({
  clientId: 'https://myclientapp.com',
  redirectUri: 'https://myclientapp.com/indieauthhandler',
  me: 'https://userindiewebsite.com',
  state: 'This should be secret or randomly generated per user',
});
```

The available options are:

* `me` - The url of the user you are authenticating with
* `clientId` - The url of your micropub client
* `redirectUri` - The redirect url of your micropub client from indieauth. This is the page where you will get the code to exchange for an access token.
* `state` - A custom identifier to validate a response from the auth endpoint
* `authEndpoint` - The authorization endpoint

You can directly retrieve and modify the options on an instanciated class with the `options` property:

```js
// Get the user domain
const me = indieauthn.options.me;
```

### Getting authorization url

The first step is likely to be getting the authorization url to direct the user to.

```js
indieauthn
  .getAuthUrl()
  .then(url => {
    // You should probably store indieauthn.options.authEndpoint here
    // and then handle directing user to this url to authenticate
  })
  .catch(err => console.log(err));
```

### Verify your authentication code

Once the user authenticates, they will be redirected to your application. At
that point you will want to verify the authentication code you receive. You
first need to initialize the library with the details you used to get the auth
code and then pass the code to the verify method:

```js
indieauthn
  .verifyCode('XXX_auth_code_here')
  .then(response => {
    // Successfully verified! You can use response.me for the user's
    // identity and store that in a session however you like.
  })
  .catch(err => console.log(err));
```

### Error handling

If there are any errors then the methods will reject with an object:

```js
{
  message: 'Human readable string',
  status: null or the http status code,
  error: null or further error information,
}
```

Generally if there is a `status` code that means the micropub endpoint returned an http error.
And if there is `error` then there was an error sending the request at your end.
This might not be 100% accurate as there are a lot of potential errors.

## Thanks

* [grantcodes](https://github.com/grantcodes) - For Micropub.js, from which I whittled this lib.
* transitory thanks:
    * [sknebel](https://github.com/sknebel) - For helping with the rel scraping function
    * [Zegnat](https://github.com/Zegnat) - For helping with the rel scraping function
    * [myfreeweb](https://github.com/myfreeweb) - For fixing Link header handling and help with Accept headers
    * [00dani](https://github.com/00dani) - For fixing base tag support in the rel scraper
    * [pstuifzand](https://github.com/pstuifzand) - For fixing form encoded arrays
