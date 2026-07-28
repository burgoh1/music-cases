# todo list

- Hooking up spotify api!!
- get clientid, client secret, and redirect URL from spotify dashboard
- create CSRF nonce to make sure we ensure incoming requests are actually coming from the logged in user instead of a hacker :0
- user clicks on 'connect spotify' ->
- generate random string ->
- set string in httpOnly cookie in logged in user's browser ->
- server sends server generated nonce inside req when fetching spotify api ->
- server recieved a res back from spotify api with nonce value ->
- server compares res nonce with server nonce inside cookies ->
- if everything dosent explode, we process the res and delete nonce cookie :D
