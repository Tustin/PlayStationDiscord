import { app, dialog } from 'electron';
import axios from 'axios';
import events = require('events');
import * as compareVersions from 'compare-versions';
import asar from './Asar/Asar';

import log = require('electron-log');

const packageJson = require('../package.json');
const path = require('path');
const appPath = app.getAppPath()  + '/';
const appPathFolder = path.resolve(appPath, '../');
const extractedAsarFolder = appPathFolder + 'update';
const currentAsarFile = appPathFolder + 'app.farts';
const fs = require('fs');
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
		log.error('Update available but could not find .asar file on GitHub.');

		return;
	}

	const downloadUrl = asarAsset.browser_download_url;
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
			log.error('Failed download .asar archive', err);
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
							dialog.showErrorBox('A catastrophic error occurred during the update process.', 'While trying to copy over the new app contents, an error occurred which made this process fail. As a result, you might need to download the program again.');

							return;
						}

						eventEmitter.emit('update-downloaded');

						log.info('Update downloaded successfully');
					});
				});
			}).catch((err) => {
				eventEmitter.emit('update-error', new Error('Failed extracting update files'));

				log.error('Failed extracting update files from .asar archive', err);
			});
		});
	});

	streamWriter.on('error', (err: any) => {
		eventEmitter.emit('update-error', new Error('Failed writing update to disk'));

		log.error('Failed writing update to disk', err);
	});
});

export function checkForUpdates() : void
{
	const releaseUrl = latestRelease();

	eventEmitter.emit('checking-for-update');

	axios.get(releaseUrl, {
		headers: {
			'User-Agent': 'PlayStationDiscord ' + (packageJson.version || '')
		}
	})
	.then((response) => {
		const responseBody = response.data;
		if (compareVersions(responseBody.tag_name, packageJson.version) === 1)
		{
			eventEmitter.emit('update-available', responseBody);
		}
		else if (compareVersions(responseBody.tag_name, packageJson.version) === 0)
		{
			eventEmitter.emit('update-not-available', responseBody);
		}
	})
	.catch((err) => {
		eventEmitter.emit('update-error', new Error('Failed checking GitHub for updates'));

		log.error('Failed checking GitHub for updates', err);
	});
}