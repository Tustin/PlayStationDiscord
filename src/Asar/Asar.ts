import fs = require('fs');
import FileSystem from './FileSystem';
import AsarHeader from './AsarHeader';
import path = require('path');
const rimraf = require('rimraf');

const pickle = require('chromium-pickle-js');

export class AsarArchive
{
	private _header : AsarHeader;
	private _archive : string;
	private _fs : FileSystem;

	get header() : AsarHeader
	{
		return this._header;
	}

	get fileSystem() : FileSystem
	{
		return this._fs;
	}

	constructor(archive: string, header: any)
	{
		this._archive = archive;
		this._header = header;
		this._fs = new FileSystem(archive, this.header);
	}

	public getFile(fileName: string, followLinks: boolean)
	{
		return this.fileSystem.getFile(fileName, followLinks);
	}

	public readFile(fileName: string, info: any) : Promise<Buffer>
	{
		return new Promise((resolve, reject) => {
			const buffer = Buffer.alloc(info.size);

			if (info.size <= 0)
			{
				return resolve(buffer);
			}

			if (info.unpacked)
			{
				fs.readFile(path.join(`${this.fileSystem.src}.unpacked`, fileName), (err: any, newBuffer: Buffer) => {
					if (err)
					{
						return reject(err);
					}

					return resolve(newBuffer);
				});
			}
			else
			{
				fs.open(this.fileSystem.src, 'r', (err: any, fd: number) => {
					if (err)
					{
						return reject(err);
					}

					const offset = 8 + this.header.size + parseInt(info.offset, 10);

					fs.read(fd, buffer, 0, info.size, offset, (fileReadErr: any, fileBytesRead: number) => {
						if (fileReadErr)
						{
							return reject(fileReadErr);
						}

						return resolve(buffer);
					});
				});
			}
		});
	}

	public extractAll(destination: string) : Promise<void>
	{
		return new Promise((resolve, reject) => {
			this.fileSystem.listFiles()
			.then((files) => {
				if (fs.existsSync(destination))
				{
					rimraf(destination, (rmrfError: any) => {
						if (rmrfError)
						{
							return reject(rmrfError);
						}

						this.writeFiles(destination, files)
						.then(() => {
							return resolve();
						})
						.catch(() => {
							return reject();
						});
					});
				}
				else
				{
					this.writeFiles(destination, files)
					.then(() => {
						return resolve();
					})
					.catch(() => {
						return reject();
					});
				}
			})
			.catch((err) => {
				return reject(err);
			});
		});
	}

	private writeFiles(destination: string, files: string[]) : Promise<void>
	{
		return new Promise((resolve, reject) => {
			const followLinks = process.platform === 'win32';

			fs.mkdir(destination, (err) => {
				if (err)
				{
					// Rreturn reject(err);
				}

				files.map((fileName) => {
					fileName = fileName.substr(1);
					const destFileName = path.join(destination, fileName);
					const file = this.getFile(fileName, followLinks);
					if (file.files)
					{
						fs.mkdir(destFileName, (mkdirErr) => {
							if (mkdirErr)
							{
								return reject(err);
							}

							return resolve();
						});
					}
					else if (file.link)
					{
						const linkSrcPath = path.dirname(path.join(destination, file.link));
						const linkDestPath = path.dirname(destFileName);
						const relativePath = path.relative(linkDestPath, linkSrcPath);
						fs.unlink(destFileName, (unlinkErr) => {
							const linkTo = path.join(relativePath, path.basename(file.link));
							fs.symlink(linkTo, destFileName, (symlinkErr) => {
								if (symlinkErr)
								{
									return reject(symlinkErr);
								}

								return resolve();
							});
						});
					}
					else
					{
						this.readFile(fileName, file)
						.then((fileBuffer: Buffer) => {
							fs.writeFile(destFileName, fileBuffer, (writeFileErr: NodeJS.ErrnoException) => {
								if (writeFileErr)
								{
									return reject('Failed writing file from fileBuffer ' + writeFileErr);
								}

								// Dconsole.log('wrote' , destFileName);
							});
						})
						.catch((readFileErr: any) => {
							return reject('Failed reading file ' + readFileErr);
						})
						.then(() => {
							return resolve();
						});
					}
				});
			});
		});
	}
}

function readArchiveHeader(archive: string) : Promise<any>
{
	return new Promise((resolve, reject) => {
		fs.open(archive, 'r', (err, fd) => {
			if (err)
			{
				return reject(new Error('Failed opening asar archive'));
			}

			const headerSizeBuffer = Buffer.alloc(8);

			fs.read(fd, headerSizeBuffer, 0, 8, null, (headerReadErr, headerBytesRead) => {
				if (headerReadErr)
				{
					return reject(new Error('Failed reading asar archive header'));
				}
				const size = pickle.createFromBuffer(headerSizeBuffer).createIterator().readUInt32();

				const headerBuffer = Buffer.alloc(size);

				fs.read(fd, headerBuffer, 0, size, null, (pickleReadErr, pickleReadBytes) => {
					if (pickleReadErr)
					{
						return reject(new Error('Failed reading asar archive header (pickle-read)'));
					}

					const header = pickle.createFromBuffer(headerBuffer).createIterator().readString();

					return resolve({
						header: JSON.parse(header),
						size
					});
				});
			});
		});
	});
}

export default function asar(archive: string) : Promise<AsarArchive>
{
	return new Promise((resolve, reject) => {
		readArchiveHeader(archive)
		.then((header) => {
			return resolve(new AsarArchive(archive, header));
		})
		.catch((err) => {
			return reject(err);
		});
	});
}