# Changelog

## App 0.3.23 (VPN build, modified version)

- The icon the owner chose (20.11.2026, «Т9 Старт» of the logo canvas): the engine START button, a play mark in place
  of the word; in the Store and the car's app list (apps/jap_ridetube/icon.svg, icon.png 140 px).

## App 0.3.22 (VPN build, modified version)

- Its own icon (owner, 19.11.2026): a big «Т», its bar a screen with the play mark, its stem the road
  (apps/jap_ridetube/icon.svg; icon.png 140 px rendered from it). tools/patch_app.py now puts it into the package
  (rhmiData/.../jap_ridetube_icon.png, the car's app list); the Store's icon is the same file.

## App 0.3.21 (VPN build, modified version)

- A name of its own (owner, 19.11.2026): «ТвойТюб» in the MGU Store, the app list, the screens' titles and the Russian
  texts; the service is «ТвойТюб: служба» in the Store (its catalog title only, the package stays 0.3.19). The ids
  (jap_ridetube, jap-ridetube-d) stay, so the update goes in place and the sign-in and the settings stay.
- kit/tools/test_runtime.js runs to the end on Node 8 (no fs.rmSync there).

## App 0.3.20, service 0.3.19 (VPN build, modified version)

- Faster start (owner, 19.11.2026: a long video sat on «Загрузка звука…» for a long time). The service started only
  once the first part of the sound covered the whole download's estimated time, and it estimated that time from a
  single connection, although the rest comes over four. For an hour-long video over the VPN that meant half a minute
  or more. Now it starts with 15 s of sound. While the rest comes, longer parts follow (audio.head.<n>.m4a, each twice
  as long), and the service moves to the longest one when the part playing runs out: a short hitch instead of a wait.
- My queue (the rail's «Очередь»):
  - «Набрать видео», then a tap on a tile on any page adds it to the queue (its place shows on the tile); a second tap
    removes it.
  - «Смотреть очередь» plays the videos one after another; a video that plays leaves the queue.
  - «Очистить» takes two presses.
  - The queue is kept in data/queue.json.
- Sleep timer (Settings): 15 / 30 / 60 min or to the video's end. At its time playback pauses; set to the video's end,
  the next video does not start.
- The rail fits eight entries.
- Tests:
  - the daemon: the longer head when the one playing runs out, when waiting at its end, and on a seek;
  - the fetcher: heads of a growing prefix, each a valid MP4;
  - the app: the queue (pick, unpick, play in order, Clear twice), the sleep timer (the chip, the pause, to the end).

## App 0.3.19 (VPN build, modified version; the service stays 0.3.18)

- After a Store update the pages say for two minutes (from the first look at the screen) that the settings came back
  from the bmw-vpn copy - «Настройки восстановлены после обновления: изменённых N» (green) - or, the service there but
  no copy, «Настройки по умолчанию: сохранённой копии не нашлось» (yellow).
- Tests: the line on the page (restored, the defaults, no service: nothing); how many settings came back; the Russian
  check no longer takes the stage name of «Загрузка видео…» for a text.

## Service 0.3.18 (VPN build, modified version; the app stays 0.3.18)

- «Загрузить видео» (the picture of a video started while driving) no longer downloads its sound again: the whole
  audio.m4a stays and only the video is fetched (about a megabyte a minute of the video less). The same for a quality
  change while playing and for a fetch that broke after the sound was in.
- The traffic counter takes the sound as it downloads: a video stopped before its sound was whole now counts what it
  fetched (before, nothing).
- ytfetch.py: `fetch --keep-audio`; `audio` events carry `bytes` (downloaded so far), `audio_ready` carries `dl`
  (downloaded for it) or `kept: true`.
- Tests: the daemon (fake fetcher: the kept sound on fullvideo and on a quality change, not counted again; a fetch
  stopped mid-sound counted), the fetcher against YouTube (--audio-only, then --keep-audio: the same audio.m4a, only
  the video comes).

## App 0.3.18, service 0.3.17 (VPN build, modified version)

- Sound only while driving (a setting, on by default): a video started while the car moves (the picture is not shown
  then anyway) is fetched as its sound alone - about a megabyte a minute instead of five to eight, and it starts
  without waiting for the video. Parked, the player keeps its podcast look with «Загрузить видео»: the video is
  fetched then, at the quality set, and plays on from where the sound is (not on its own: every red light would
  fetch it). A video started while parked is fetched in full, as before. With Video while driving on (a car coded for
  it) nothing changes.
- How much was fetched, on the Settings page: «Видео и звук: сегодня … · за 30 дней …» - the sound and the video of
  every play and the speed check's download, by day, 62 days kept on the car (feeds and thumbnails are not counted).
- The Settings page fits the screen again: «Текущее видео тоже в …p» sits beside the quality chips, the switches take
  two rows (the last row was cut at the bottom).
- Service: `play` takes `audio_only`, `fullvideo` fetches the video of a sound-only play, state events say
  `audio_only`, `net` events carry `traffic`; ytfetch.py `fetch --audio-only`.
- Tests: the sound-only play and the traffic counter in the daemon (fake fetcher), the fetcher against YouTube
  (`--audio-only`: 3.4 MB for 213 s), the app (the play asked while moving, the button, the Settings page);
  tools/stage_for_tests.sh stages the app for kit/tools/test_ridetube.js; RT_SHOTS draws the full-screen player too.

## App 0.3.17, service 0.3.16 (VPN build, modified version)

- Preparing says what it is at under the ring: «Ищу видео на YouTube…» (the stream lookup), «Загружаю звук… N %»,
  «Загружаю видео… N %» — before, «Подготовка… 2 %» for ten seconds looked stuck.
- How long each part of the last preparing took (lookup, sound, video, ms) goes to the log, a `prep` event and the
  Settings page («Последняя подготовка: поиск 6,2 с · звук 3 с · видео 1 с»): what to make faster, measured in the car.
- The yellow diagnostic lines on the player are off by default: «Диагностика» on the Settings page (and in all
  settings) brings them back.
- The page redraws at once when a setting changes (the settings sheet's too).

## App 0.3.16, service 0.3.15 (VPN build, modified version)

- Settings, a gear on the left rail (above Exit), on one page:
  - Video quality: Auto / 720p / 480p / 360p. A choice is for the next video; the one playing is fetched again only
    with «Текущее видео тоже в …p (перекачать)», offered when it differs. Auto says what it is now (720p on Wi-Fi,
    480p on phone data).
  - Connection: Check speed (YouTube's response time, the best of three, then an 8 s download through the VPN while
    it is up, nothing kept) with what it is enough for; whether the videos come through the VPN and over Wi-Fi or
    phone data; how fast the last video came (times faster than it plays, Mbit/s).
  - Pause on leaving, Fill the screen, All settings (the kit's sheet with the rest); the app's and service's versions.
- The player's Quality button: each press still takes the next one, but the video is fetched again once, 2.5 s after
  the last press («Сейчас применится…» meanwhile), so pressing past the one wanted costs no wait.
- Service: `netinfo` and `speedtest` (`net` events), state events say the playing video's height.
- Tests: the Settings page, the quality wait; RT_SHOTS=<dir> writes the Settings page as PNG (English and Russian).

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
