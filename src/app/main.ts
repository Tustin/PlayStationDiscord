"use strict";

import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell, Tray, Menu, Notification, MenuItemConstructorOptions, MenuItem, session } from 'electron';
const { resolve, join } = require("path");
const { format } = require("url");
import _store = require('electron-store');
import log = require('electron-log');
import { autoUpdater } from 'electron-updater';
import axios from 'axios';
import * as _ from 'lodash';
import appEvent from './Events';

// Discord RPC handlers.
import { DiscordController } from './DiscordController';
import { IDiscordPresenceModel, IDiscordPresenceUpdateOptions } from './Model/DiscordPresenceModel';

// Consoles
import {PlayStationConsole, PlayStationConsoleType } from './Consoles/PlayStationConsole';
import PlayStation5 from './Consoles/PlayStation5';
import PlayStation4 from './Consoles/PlayStation4';
import PlayStation3 from './Consoles/PlayStation3';
import PlayStationVita from './Consoles/PlayStationVita';

// PlayStation account classes.
import {PlayStationAccount as v2 } from './PlayStation/v2/Account';
import {PlayStationAccount as v3 } from './PlayStation/v3/Account';

import { IAccount } from './PlayStation/IAccount';
import AbstractPresence from './PlayStation/AbstractPresence';
import { IOAuthTokenResponse } from './Model/IOAuthTokenResponse';

const isDev = process.env.NODE_ENV === 'dev';

// Games that have an image saved in the respective application.
const supportedGames = require('./SupportedGames');

// Application setting store.
const store = new _store();

const logoIcon = nativeImage.createFromPath(join(__dirname, '../assets/images/logo.png'));

const trayLogoIcon = nativeImage.createFromPath(join(__dirname, '../assets/images/trayLogo.png'));

// Application windows.
let mainWindow : BrowserWindow;
let loginWindow : BrowserWindow;

// Instance of the logged in PlayStation account.
let playstationAccount : IAccount;

// Discord controllers.
// @TODO: Consolidate these into the DiscordController class and make it static since there's only ever one instance of a Discord connection.
let discordController : DiscordController;
let previousPresence : AbstractPresence;

// Loops
let updateRichPresenceLoop : NodeJS.Timeout; // Updates rich presence.
let refreshAuthTokensLoop : NodeJS.Timeout; // Refreshes PlayStation account token when required.

autoUpdater.autoDownload = false;

if (isDev)
{
    log.transports.file.level = 'debug';
    log.transports.console.level = 'debug';
}
else
{
    log.transports.file.level = 'info';
    log.transports.console.level = 'info';
}

const instanceLock = app.requestSingleInstanceLock();

if (!instanceLock)
{
    app.quit();
}

app.setAppUserModelId('com.tustin.playstationdiscord');

// Relevant: https://i.imgur.com/7QDkNqx.png
function showMessageAndDie(message: string, detail?: string) : void
{
    dialog.showMessageBoxSync(null, {
        type: 'error',
        title: 'PlayStationDiscord Error',
        message,
        detail,
        icon: logoIcon
    });

    app.quit();
}

const createWindow = () => {

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Application',
            click:  () => mainWindow.show()
        },
        {
            label: 'Toggle Presence',
            click:  () => ipcMain.emit('toggle-presence')
        },
        {
            label: 'Quit',
            click:  () => {
                mainWindow.destroy();
                app.quit();
            }
        }
    ]);

    const tray = new Tray(trayLogoIcon); // For macOS

    tray.setContextMenu(contextMenu);
    tray.setToolTip('PlayStationDiscord');

	const mainWindow = new BrowserWindow({
        width: 512,
        height: 512,
        minWidth: 512,
        minHeight: 512,
        backgroundColor: '#23272a',
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        },
        frame: false,
		icon: resolve(__dirname, "./assets/icon.png"),
	});

    mainWindow.on('show', () => {
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    mainWindow.on('minimize', () => {
        mainWindow.hide();

        if (process.platform === 'darwin') {
            app.dock.hide();
        }

        if (Notification.isSupported())
        {
            if (!store.get('trayNotificationSeen', false))
            {
                let bodyText : string;

                if (process.platform === 'darwin') {
                    bodyText = 'PlayStationDiscord is still running. You can restore it by clicking the icon in the menubar.';
                } else {
                    bodyText = 'PlayStationDiscord is still running in the tray. You can restore it by double clicking the icon in the tray.';
                }
                const notification = new Notification({
                    title: 'Still Here!',
                    body: bodyText,
                    icon: logoIcon
                });

                notification.show();
                store.set('trayNotificationSeen', true);
            }
        }

        tray.on('double-click', () => {
            if (!mainWindow.isVisible())
            {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    });

	// Remove menu from browser window.
	mainWindow.setMenu(null);

	// Load the index.html of the app.
	mainWindow.loadURL(process.env.NODE_ENV === "development" ? format({
		hostname: "localhost",
		pathname: "index.html",
		protocol: "http",
		slashes: true,
		port: 8080
	}) : format({
		pathname: resolve(__dirname, "../renderer/index.html"),
		protocol: "file",
		slashes: true
	}));

	// Open the DevTools.
	if(process.env.NODE_ENV === "development") {
		mainWindow.webContents.openDevTools();
		// require("devtron").install(); // TypeError: electron.BrowserWindow.addDevToolsExtension is not a function
		// require("vue-devtools").install(); // not supported yet
	}
};

app.on("ready", () => createWindow());

app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());