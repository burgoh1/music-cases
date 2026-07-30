# Development Process

This section outlines the development process for creating music cases.

# July 28, 2026

## Hooking up spotify api!!

- get clientid, client secret, and redirect URL from spotify dashboard

- create CSRF nonce to make sure we ensure incoming requests are actually coming from the logged in user instead of a hacker :0

- user clicks on 'connect spotify' ->

- generate random string ->

- set string in httpOnly cookie in logged in user's browser ->

- server sends server generated nonce inside req when fetching spotify api ->

- server recieved a res back from spotify api with nonce value ->

- server compares res nonce with server nonce inside cookies ->

- if everything dosent explode, we process the res and delete nonce cookie :D

## implementing middleware to handle spotify redirect!!

- we use this middleware inorder to verify which user the res from the redirect belongs to

- grab refresh token from req header from spotify redirect ->

- verify the refresh token we got from req header by our refresh token secret ->

- if we did it right, set req userID header to the verified userID.

## implementing spotify route!!

- frontend calls /connect which will make a nonce. stores nonce in browser cookies and as a URL parameter..

- to spotify auth link ->

- redirect to spotify, answer spotify auth stuff, then redirect back to app (/callback) with refreshtoken...

- and serverspotifynonce still in tack ->

- refreshcookie middleware handles the refresh token varification and modifies req.userId ->

- /callback route check if both nonce are the same then clears server nonce cookies ->

- server makes a fetch call to spotify's token endpoint and comes back with spotify access tokens, etc...

- update database with spotify token info by userId.

## implementing logic when spotify needs to refresh an expired access token!!!

- I need to check if my stores spotify access token is still valid before using it duhhh

- were fetching spotify auth endpoint for a new access token everytime we make a req to spotify...

- resource server

- if the user's spotify access token is expired, call auth endpoint for a new one, if its not expired...

- keep using the current spotify access token associated with the user account.

## implementing actually getting something from spotify's api. FINALLYYY!!!

- were fetching the top tracks from the users spotify and returning them to the console for now.

## what I learned :D

- our requireAuth middleware does not work when spotify redirects us to our callback URL because...

- there is no code in that path that could attach an Authorization: Bearer 'access_token' header to...

- thus we need to create a new middleware that

- how data moves so far: login->requireAuth(verify accessToken)->/connect->redirect to SpotifyAuth->...

- refreshCookie(verify refreshToken)->/callback
