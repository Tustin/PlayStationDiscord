# PlayStationDiscord

[![Actions Status](https://github.com/Tustin/PlayStationDiscord/workflows/PlayStationDiscord%20Deploy/badge.svg)](https://github.com/Tustin/PlayStationDiscord/actions)
![License](https://img.shields.io/github/license/Tustin/PlayStationDiscord.svg?style=flat)

Discord Rich Presence for PlayStation 5, PlayStation 4, PlayStation 3, and PlayStation Vita games.

|PlayStation 5 | PlayStation 4                                                                                     | PlayStation 3                                                                                     | PlayStation Vita                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ![rich presence ps5 img](https://i.imgur.com/JFWj0LQ.png) | ![rich presence ps4 img](https://tusticles.com/PlayStationDiscord/assets/images/previews/ps4.png) | ![rich presence ps3 img](https://tusticles.com/PlayStationDiscord/assets/images/previews/ps3.png) | ![rich presence vita img](https://tusticles.com/PlayStationDiscord/assets/images/previews/vita.png) |

## Download

### Windows and macOS

You can download the compiled build for both of these platforms on the official [PlayStationDiscord page](https://tusticles.com/PlayStationDiscord/). Windows uses a proper installer and macOS has a dmg you can mount and install.

### Linux

I don't have any Linux builds because there's too many combinations of Linux to test. If you want to use this on Linux, follow the guide below for developing so you can manually build the application.

## Supported Games

Supported games will have their game icon show while playing it in the Discord Rich Presence window. Due to the way Discord works, these images need to be pre-set as app assets and can't be set programmatically. As a result, you can see which games are currently supported on the [PlayStationDiscord-Games repository](https://github.com/Tustin/PlayStationDiscord-Games).

The PlayStationDiscord-Games repo has the script used to generate the games supported in PlayStationDiscord. You could also manually add a game you want and open a PR on the PlayStationDiscord-Games repo. The PR will be merged depending on if you added the game properly. There's a possibilty that this process will be streamlined in the future.

## Developing

PlayStationDiscord is currently built on Electron using TypeScript. Simply follow the steps below to get it up and running:

1. `git clone https://github.com/Tustin/PlayStationDiscord/`
2. `cd` into PlayStationDiscord folder
3. `npm install` (or `yarn install`)
4. `npm run start` (or `yarn start`)

Yes, Electron is bloated. But until we have a better way to build cross platform UI applications, we just have to deal with it. Sorry.
