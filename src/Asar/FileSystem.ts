import path = require('path');
import fs = require('fs');
import AsarHeader from './AsarHeader';
const tmp = require('tmp');
const long = require('cuint').UINT64;

export default class FileSystem
{
	private _src : string;
	private _header : any;
	private _offset : any;

	public get src() : string
	{
		return this._src;
	}
	public get header() : any
	{
		return this._header;
	}

	public get offset() : any
	{
		return this._offset;
	}

	constructor(src: string, header: AsarHeader)
	{
		this._src = path.resolve(src);
		this._header = header;
		this._offset = long(0);
	}

	public getFile(p: string, followLinks: boolean) : any
	{
		const info = this.getNode(p);

		if (info.link && followLinks)
		{
			return this.getFile(info.link, true);
		}
		else
		{
			return info;
		}
	}

	public listFiles(options?: any) : Promise<string[]>
	{
		return new Promise((resolve, reject) => {
			const files : string[] = [];

			function fillFilesFromHeader(p: string, header: any) : any[]
			{
				if (!header.files)
				{
					return undefined;
				}

				const result = [];
				for (const file of Object.keys(header.files))
				{
					const fullPath = path.join(p, file);
					const packState = header.files[file].unpacked ? 'unpack' : 'pack  '; // Why is there 2 spaces at the end??

					files.push((options && options.isPack) ? `${packState} : ${fullPath}` : fullPath);
					result.push(fillFilesFromHeader(fullPath, header.files[file]));
				}

				return result;
			}

			fillFilesFromHeader('/', this.header.header);

			return resolve(files);
		});
	}

	private searchNodeFromDirectory(p: string)
	{
		let json = this.header.header;
		const dirs = p.split(path.sep);
		for (const dir of dirs)
		{
			if (dir !== '.')
			{
				json = json.files[dir];
			}
		}

		return json;
	}
	private searchNodeFromPath(p: string)
	{
		p = path.relative(this.src, p);

		if (!p)
		{
			return this.header;
		}

		const name = path.basename(p);
		const node = this.searchNodeFromDirectory(path.dirname(p));

		if (node.files == null)
		{
			node.files = {};
		}

		if (node.files[name] == null)
		{
			node.files[name] = {};
		}

		return node.files[name];
	}

	private insertDirectory(p: string, shouldUnpack: boolean)
	{
		const node = this.searchNodeFromPath(p);

		if (shouldUnpack)
		{
			node.unpacked = shouldUnpack;
		}
		node.files = {};

		return node.files;
	}

	// TODO: I don't know if callback should have any args.
	private insertFile(p: string, shouldUnpack: boolean, file: any, options: any, callback: () => void)
	{
		const dirNode = this.searchNodeFromPath(path.dirname(p));
		const node = this.searchNodeFromPath(p);

		if (shouldUnpack || dirNode.unpacked)
		{
			node.size = file.stat.size;
			node.unpacked = true;
			process.nextTick(callback);

			return;
		}

		const handler = () => {
			const size = file.transformed ? file.transformed.stat.size : file.stat.size;

			// JavaScript can not precisely present integers >= UINT32_MAX.
			if (size > 4294967295)
			{
				throw new Error(`${p}: file size can not be larger than 4.2GB`);
			}

			node.size = size;
			node.offset = this.offset.toString();

			if (process.platform !== 'win32' && (file.stat.mode & 0o100))
			{
				node.executable = true;
			}

			this.offset.add(long(size));

			return callback();
		};

		const tr = options.transform && options.transform(p);

		if (tr)
		{
			return tmp.file((err: any, newPath: string) => {
				if (err)
				{
					return handler();
				}

				const out = fs.createWriteStream(newPath);
				const stream = fs.createReadStream(p);

				stream.pipe(tr).pipe(out);

				return out.on('close', () => {
					fs.lstat(newPath, (lstatErr: any, stat: fs.Stats) => {
						if (lstatErr)
						{
							throw new Error(lstatErr);
						}

						file.transformed = {
							path,
							stat
						};

						return handler();
					});
				});
			});
		}
		else
		{
			return process.nextTick(handler);
		}
	  }

	private insertLink(p: string) : Promise<string>
	{
		return new Promise((resolve, reject) => {
			fs.realpath(this.src, (err: any, resolvedPathSrc: string) => {
				if (err)
				{
					return reject(err);
				}

				fs.realpath(p, (realPathError2: any, resolvedPath: string) => {
					if (realPathError2)
					{
						return reject(realPathError2);
					}

					const link = path.relative(resolvedPathSrc, resolvedPath);

					if (link.substr(0, 2) === '..')
					{
						return reject(new Error(`${p}: file links out of the package`));
					}

					const node = this.searchNodeFromPath(p);
					node.link = link;

					return resolve(link);
				});
			});
		});
	}

	private getNode(p: string) : any
	{
		const node = this.searchNodeFromDirectory(path.dirname(p));
		const name = path.basename(p);

		if (name)
		{
			return node.files[name];
		}
		else
		{
			return node;
		}
	}
}