# Changelog

## App 0.3.15, service 0.3.14 (VPN build, modified version)

- Paused, the sound came back on its own about a minute later, the app away (car, 2026-11-13): after a voice input
  (or a call, a navigation prompt) the car gives the sound back to the last source and plays the car's player
  again. The service now stops the player again whenever it plays (or its time moves) while paused; Play in the app
  plays on from where it was paused.
- Exit: the last entry of the left rail and a button in the HMI menu («Выйти из RideTube (видео остановится)»).
  The video stops (the sound and the car's audio source are released) and the app's screens close.
- The app needs service 0.3.14 (the warning line says so for an older one).

## App 0.3.14, service 0.3.13 (VPN build, modified version)

- The settings survive a Store update: the Store installs an update afresh (an empty data/), so every update lost
  them (the quality, the battery pause, ...). Each save also goes to the bmw-vpn service (1.1.4 on: its keep store,
  as Радар-ассистент's), and a fresh install with no settings takes them back from there once. No bmw-vpn: local
  only, as before. This first update still starts from the defaults (0.3.13 kept no copy).
- The service says its version in every state event; the app updated without its service (older than 0.3.13, or one
  that does not say it) shows "Обнови «RideTube service» в MGU Store: в машине …, нужна 0.3.13" on its pages and on
  the HMI's main screen. Before, the new parts of playback would quietly not work.

## App 0.3.13, service 0.3.12 (VPN build, modified version)

- A seek past the video fetched so far (or a link slower than the video): the sound and the picture wait together
  until 10 s of video past that point are fetched, then play on there (the service stops the player and restarts
  it, as a pause and resume). Before, the sound played on over a frozen picture. The time events carry `fetched`;
  the app draws the part fetched on the bar and, while waiting, keeps the overlay with "Загружаю видео до этого
  места: 0:12 из 0:40".
- Tests: every HMI button and every target of the results and the player pressed once; the HMI keyboard's search;
  the app's own hide; the wait (seek, pause/resume while waiting, the picture off, on the audio head, a slow link);
  the zoom test waits for ytdec's seek instead of a fixed moment (it failed now and then). Real searches checked
  against YouTube (hl ru, gl RU): 13-19 videos a query.

## App 0.3.12 (VPN build, modified version)

- The 12 V battery pause goes back to Never once ("reset": 1): a car that had saved any setting kept the old
  65 % with it, and paused a video on a healthy battery.
- Pause when leaving the app also on the app's own hide (changeVisibility): the HMI can keep a screen in the
  app's stack behind Home, so it never read as hidden.
- Diagnostics on the player, two lines under the title (Russian, while the car is checked without SSH): the speed
  and its age, which screens are shown, the GPU, the video file and the picture, the battery and its limit, the
  preparing time, the last visibility events. kit parked.js gets age().

## App 0.3.11, service 0.3.11 (VPN build, modified version)

- In Russian: the service asks YouTube's feeds and search in Russian, for Russia (hl ru, gl RU: shelf titles,
  "N просмотров", "N дней назад"; the player request stays English, its refusals are read). The app's own words
  (tr.js, locale-ru.json), the settings and sheets (the kit's locale.json, whole texts only, so video titles are
  never touched) and the HMI's static texts are Russian; the search suggestions too.
- Pause when leaving the app (a setting, on by default): none of the app's screens shown for 2 s, the video
  pauses; still being prepared, it pauses once it starts. A check box added to the HMI menu's settings.
- The tests remove their folders (the renderer stream there grew to tens of MB a run).

## App 0.3.10 (VPN build, modified version)

- The controller's knob turns through the videos one by one: along a shelf, then on to the next shelf's first
  (turned back: the previous one's last), each brought into view. Before, turning scrolled the page and only a
  push moved between the videos. From the rail (pushed left) a turn goes back to the video it was on. The kit
  gets ctx.onKnob for it; the player, the sheets and the HMI menu keep the kit's ring.

## App 0.3.9 (VPN build, modified version)

- Russian titles: the published app is the English build and drew Cyrillic as nothing (only the punctuation and
  digits showed). Cyrillic atlases baked from the same Ubuntu font (regular and bold), and fonts.js picks the bold
  one for bold text.
- The 12 V battery pause is off by default ("Never"): a parked car with the engine running reported a charging
  condition under 65 % and the video kept pausing. It can still be switched on in the settings.
- Built by tools/patch_app.py from JustAnotherPU's published 0.3.8 package.

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
