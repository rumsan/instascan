function cameraName( label: string ) {
	let clean = label.replace( /\s*\([0-9a-f]+(:[0-9a-f]+)?\)\s*$/, '' );
	return clean || label || null;
}

class MediaError extends Error {
	type: string;
	inner: Error;

	constructor( type, inner?: Error ) {
		super( inner
			? `Cannot access video stream (${type}: ${inner.message}).`
			: `Cannot access video stream (${type}).` );

		this.type = type;
		this.inner = inner;
	}
}

export default class Camera {
	id: string;
	name: string;

	private _stream: MediaStream;

	constructor( id: string, name: string ) {
		this.id = id;
		this.name = name;
		this._stream = null;
	}

	async start() {
		let constraints: any = {
			audio: false,
			video: {
				facingMode: 'environment'
			}
		};

		this._stream = await Camera.wrapErrors( async () => {
			return await navigator.mediaDevices.getUserMedia( constraints );
		} );

		return this._stream;
	}

	stop() {
		if ( !this._stream ) {
			return;
		}

		for ( let stream of this._stream.getVideoTracks() ) {
			stream.stop();
		}

		this._stream = null;
	}

	static async getCameras() {
		await Camera.ensureAccess();

		let devices = await navigator.mediaDevices.enumerateDevices();

		return devices
			.filter( d => d.kind === 'videoinput' )
			.map( d => new Camera( d.deviceId, cameraName( d.label ) ) );
	}

	static async getBackCamera(options){
		let defaults = { video: { facingMode: 'environment' }, audio:false };
		let constraints = Object.assign({}, defaults, options);
		console.log(constraints)
		let stream = await navigator.mediaDevices.getUserMedia(constraints);
	
		if (stream.getVideoTracks().length > 0) {
		  const cameras = stream.getVideoTracks();
		  let currentCamera = cameras[0];
		  
		  let devices = await navigator.mediaDevices.enumerateDevices();
		  return devices
			.filter(d => d.deviceId === currentCamera.getSettings().deviceId)
			.map(d => new Camera(d.deviceId, cameraName(d.label)));
		}
		return null;
	  }

	static async ensureAccess() {
		return await this.wrapErrors( async () => {
			let access = await navigator.mediaDevices.getUserMedia( { video: true } );
			for ( let stream of access.getVideoTracks() ) {
				stream.stop();
			}
		} );
	}

	static async wrapErrors<T>( fn: () => Promise<T> ): Promise<T> {
		try {
			return await fn();
		} catch ( e ) {
			if ( e.name && process.env.NODE_ENV !== "development" ) {
				throw new MediaError( e.name, e );
			} else {
				throw e;
			}
		}
	}
}