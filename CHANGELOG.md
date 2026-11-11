# Changelog

## Service 0.3.9 + VPN (modified version)

- YouTube through a VPN on the car: while a SOCKS5 proxy listens on `127.0.0.1:1065` (bmw-vpn, jap-wireproxy), the
  fetch helper, thumbnails and yt-dlp (with the audio's Range requests) go through it, the names resolved by the
  proxy; nothing listening: directly. Checked through a real Hysteria2 tunnel: InnerTube search and robots.txt on
  Node 8.16.2, a thumbnail on Node 22, yt-dlp extract and a full fetch on Python 3.12 (stream URLs bound to the
  tunnel's address).

## Service 0.3.9

- Videos play again: each video's folder was 0700, so BMW's media engine (its own uid) could not open the audio
  and the car answered `ITEM_UNPLAYABLE`. The folders are now 0711: the engine opens the audio by name, and
  nobody can list them. Folders cached by 0.3.8 are fixed when they are played.

## App 0.3.8

- Search: the menu opened from the rail's Search stays open. Before, the video page came back over it about a
  second later, because the head unit keeps that page listed under the menu. The kit now shows the page only
  while it is the screen of ours that came to the front last.

## App 0.3.7, service 0.3.8

- Video while driving takes effect only once switched on while the car is parked.
- The download stops when less than 256 MiB is left free on the head unit.
- README: data use, tested on, uninstall.

## App 0.3.6, service 0.3.7

First public release.
