import { app, dialog } from 'electron';
import axios from 'axios';
import events = require('events');
const packageJson = require('../package.json');
import log = require('electron-log');
import asar from './Asar/Asar';
const path = require('path');
const appPath = app.getAppPath()  + '/';
const appPathFolder = appPath + '../';
const extractedAsarFolder = appPathFolder + 'update';
const currentAsarFile = appPathFolder + 'app.farts';
const fs = require('fs');
const blobObject = require('blob');
const progress = require('progress-stream');
const rimraf = require('rimraf');

const username = 'Tustin';
const repoName = 'PlayStationDiscord-Test';

const eventEmitter = new events.EventEmitter();

function craftUrl() : string
{
	return `https://api.github.com/repos/${username}/${repoName}/`;
}

function latestRelease() : string
{
	return craftUrl() + 'releases/latest';
}

export function on(eventName: string, callback: (...eventArgs: any[]) => void) : void
{
	eventEmitter.on(eventName, (args) => callback(args));
}

eventEmitter.on('update-available', (info) => {
	const asarAsset = info.assets.find((asset: any) => {
		return path.extname(asset.name) === '.asar';
	});

	if (asarAsset === undefined)
	{
		eventEmitter.emit('update-error', new Error('Update available but could not find .asar file.'));

		return;
	}

	const downloadUrl = asarAsset.browser_download_url;
	console.log(appPathFolder);
	const streamWriter = fs.createWriteStream(currentAsarFile);
	const asarSize = asarAsset.size;
	const progressPipe = progress({
		length: asarSize,
		time: 100
	});
	streamWriter.on('open', () => {
		axios.get(downloadUrl, {
			responseType: 'stream'
		}).then((response) => {
			response.data
			.pipe(progressPipe)
			.pipe(streamWriter);
		}).catch((err) => {
			eventEmitter.emit('update-error', new Error('Failed downloading .asar file'));
		});

		progressPipe.on('progress', (p: any) => {
			eventEmitter.emit('download-progress', {
				percent: Math.round(p.percentage)
			});
		});
	});

	streamWriter.on('finish', () => {
		asar(currentAsarFile)
		.then((archive) => {
			archive.extractAll(extractedAsarFolder)
			.then(() => {
				rimraf(appPath, (err: any) => {
					if (err)
					{
						eventEmitter.emit('update-error', new Error('Failed removing old app contents'));
						log.error('Failed removing old app contents', err);

						return;
					}

					fs.rename(extractedAsarFolder, appPath, (renameErr: any) => {
						if (renameErr)
						{
							eventEmitter.emit('update-error', new Error('Failed copying over new app contents'));
							log.error('Failed removing old app contents', renameErr);

							 // Throw up a dialog here since this is a bad error.
							dialog.showErrorBox('A catastrophic error occurred during the update process.', 'While trying to copy over the new app contents, an error occurred which made this process fail. As a result, you might need to redownload the program again.');

							return;
						}

						eventEmitter.emit('update-downloaded');
					});
				});
			}).catch((err) => {
				console.error(err);
			});
		});
	});

	streamWriter.on('error', (err: any) => {
		eventEmitter.emit('update-error', new Error('Failed writing update to file ' + err));
	});
});

export function checkForUpdates() : void
{
	const releaseUrl = latestRelease();

	eventEmitter.emit('checking-for-update');

	axios.get(releaseUrl, {
		headers: {
			'User-Agent': 'PlayStationDiscord'
		}
	}).then((response) => {
		const responseBody = response.data;
		if (responseBody.tag_name !== packageJson.version)
		{
			eventEmitter.emit('update-available', responseBody);
		}
		else
		{
			eventEmitter.emit('update-not-available', responseBody);
		}
	}).catch((err) => eventEmitter.emit('update-error', err));
}