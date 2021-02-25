import { Client } from 'discord-rpc';
import { dialog } from 'electron';
import log = require('electron-log');
import { IDiscordPresenceModel, IDiscordPresenceUpdateOptions } from './Model/DiscordPresenceModel';
import { PlayStationConsole } from './Consoles/PlayStationConsole';
import appEvent from './Events';

const packageJson = require('../package.json');

interface IDiscordPresenceDefaultDataModel
{
    instance : boolean;
    largeImageKey : string;
    largeImageText : string;
    smallImageKey : string;
    smallImageText : string;
}

export class DiscordController
{
    private _client : Client;
    private _currentConsole : PlayStationConsole;
    private _ready : boolean = false;
    private _lastStartTimestamp : number;

    // Most of these properties get replaced in the constructor for the respective console.
    private _defaultInfo : IDiscordPresenceDefaultDataModel =  {
        instance: true,
        largeImageKey: 'ps4_main',
        largeImageText: 'PlayStation 4',
        smallImageKey: 'ps4_main',
        smallImageText: 'PlayStationDiscord ' + (packageJson.version || '')
    };

    constructor()
    {
        this._client = new Client({ transport: 'ipc' });

        this._client.once('ready', () => {
            this._ready = true;
            log.info('DiscordController ready');

            appEvent.emit('discord-ready');
        });
    }

    private init(console: PlayStationConsole) : Promise<void>
    {
        return new Promise((resolve, reject) => {
            this._client.login({ clientId: console.clientId }).then(() => {
                log.info('Logged into Discord with clientId', console.clientId);
                this._currentConsole = console;

                // Set assets.
                this._defaultInfo.largeImageKey = console.assetName;
                this._defaultInfo.largeImageText = console.consoleName;
                this._defaultInfo.smallImageKey = console.assetName;

                appEvent.emit('discord-init');

                resolve();
            })
            .catch((err) => {
                this.error(err);
            });
        });
    }

    public switch(console: PlayStationConsole) : Promise<void>
    {
        return new Promise((resolve, reject) => {
            if (!this.ready()) {
                return reject('DiscordController not ready');
            }

            this.init(console).then(() => {
                appEvent.emit('discord-switched');

                return resolve();
            }).catch((err) => {
                log.error('Failed switching to console', console, err);
                reject(err);
            });
        });
    }

    public ready() : boolean
    {
        return this._ready;
    }

    private error(err: any) : void
    {
        log.error('An error occurred while communicating with Discord', err);

        dialog.showMessageBox(null, {
            type: 'error',
            title: 'PlayStationDiscord Error',
            message: 'An error occurred while communicating with Discord',
            detail: 'Please check the log file for additonal information.'
        });

        appEvent.emit('discord-error', err);

        this.stop();
    }

    public async stop() : Promise<void>
    {
        try {
            if (this.ready()) {
                this._client.clearActivity();
                this._client.destroy();
                this._ready = false;
            }

            appEvent.emit('discord-stop');

        } catch (err) {
            log.error('Failed stopping Discord RPC', err);
        }
    }

    public update(presence: IDiscordPresenceModel, options?: IDiscordPresenceUpdateOptions) : Promise<void>
    {
        return new Promise((resolve, reject) => {
            if (!this.ready())
            {
                reject('Discord controller not ready');
            }
            else
            {
                const usingOptions = options !== undefined;

                if (!usingOptions || !options.hideTimestamp)
                {
                    if (presence.startTimestamp === undefined)
                    {
                        presence.startTimestamp = this._lastStartTimestamp;
                    }
                    else
                    {
                        this._lastStartTimestamp = presence.startTimestamp;
                    }
                }

                this._client.setActivity({...this._defaultInfo, ...presence});
                resolve();
            }
        });
    }
}