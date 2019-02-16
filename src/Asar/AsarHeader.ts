export default class AsarHeader
{
	private _size : number;
	private _header : any;

	get size() : number
	{
		return this._size;
	}

	get header() : any
	{
		return this._header;
	}

	get files() : any
	{
		return this._header.files;
	}

	constructor(size: number, header: any)
	{
		this._size = size;
		this._header = header;
	}
}