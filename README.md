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

# July 30, 2026

## Design decisions for music cases

- user can choose 1 out of 3 cases

- each case is specified by the users top 3 genres they listen to the most

- each case will contain 6-10 songs from its corresponding genre pulled from the users top tracks

- rarity uses 3 tiers: Legendary, Epic, Rare (from rarest to most common)

- there will be only 1 legendary card for each case.

- Note: maybe add a pity system later on!?!?!?!

- Note: right now im making a fetch to spotify api only when the user initially connects to spotify. maybe update the users card pool every week or two. implement this later on.

## Cards table

- user_id: tracks where these cards belong to

- spotify_track_id: spotify's unique id for each track. I want cases to never have duplicates. check if the track id you are trying to add to a case is already included before adding the card into the case.

- track_name: display to the user

- artist_name: display to the user

- genres: display to the user, i know some artists may not have a genre listed so if they dont default to an empty array

- time_range: spotify lets me pull top tracks from 3 time ranges somewhere around 4 weeks, 6 months, and 6 years. not sure if thats right but its somewhere around there.

- rank: a tracks position within its time_range. The first track in the array is the user's most-listened-to track for the selected time range. ties into rarity ;D

- rarity: to label how rare a track is going to be (legendary, epic, or rare)

- created_at: when the row was created

- spotify api's top tracks endpoint has three distinct time ranges that gives us three distinct lists. once all the tracks for a case are collected, sort the list by ascending order then assign rarity from the lowest position being the legendary and so forth.

# August 3, 2026

## Merging and deduping top tracks

- get top songs from each time range, merge all three lists and remove any duplicate tracks

- if the same track appears in more than one time_range window, keep the track that has the highest rank

- keeping SpotifyTrackItem and RankedTrack separate helps prevent issues where spotify changes their res shape. RankedTrack provides us with a stable source of truth that keeps merging, genre tagging and rarity implementation functions from breaking.

- Spotify wraps the actual track list in an items field.

## Genre tagging

- each track needs to be assigned a genre

- spotify's track objects have no genres field so we have to find each tracks primary artist, make a api call for the primary artist, look up their genre then copy them onto the track.

- spotify's 'Get Several Artists' endpoint lets us batch up to 50 artist id's into a single call. Wow! Very useful in our case.

# August 22, 2026

## Top ranking genres

- went ahead and implemented a function that takes each track's genre and tallies them by occurence and returns the top three genres of the user.

- a track can have multiple genres. Each one of those genres gets one tally.
