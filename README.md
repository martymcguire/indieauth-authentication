# IndieAuth Authentication aka IndieAuthentication

An [IndieAuth](https://indieauth.spec.indieweb.org/) authentication helper library for JavaScript.

## Docs

TBD, but similar to the documentation at [https://grantcodes.github.io/micropub/](https://grantcodes.github.io/micropub/).

The major difference is that this library is for authentication only - it
doesn't deal with token or micropub endpoints, and it only verifies
authentication codes. Its purpose is to use IndieAuth to verify a person's
domain as their authentication identity.

## Thanks

* [grantcodes](https://github.com/grantcodes) - For Micropub.js, from which I have whittled this
* with transitory thanks to these fine folks
    * [sknebel](https://github.com/sknebel) - For helping with the rel scraping function
    * [Zegnat](https://github.com/Zegnat) - For helping with the rel scraping function
    * [myfreeweb](https://github.com/myfreeweb) - For fixing Link header handling and help with Accept headers
    * [00dani](https://github.com/00dani) - For fixing base tag support in the rel scraper
    * [pstuifzand](https://github.com/pstuifzand) - For fixing form encoded arrays
