import { ComponentResourceOptions } from "@pulumi/pulumi";

// SST Context that needs to be provided
export interface SSTContext {
	app: {
		name: string;
		stage: string;
	};
	dev: boolean;
}

// Global context storage
let sstContext: SSTContext | null = null;
let BucketClass: any = null;

/**
 * Initialize the MyBucket package with SST context
 * Call this once in your SST app before using MyBucket components
 */
export function initMyBucket(context: SSTContext) {
	sstContext = context;
	
	// Override the global variables that SST expects
	if (typeof globalThis !== 'undefined') {
		(globalThis as any).$app = context.app;
		(globalThis as any).$dev = context.dev;
	}

	// Dynamically import the Bucket class at runtime
	try {
		const bucketModule = require('../.sst/platform/src/components/aws/bucket');
		BucketClass = bucketModule.Bucket;
	} catch (error) {
		throw new Error(
			'Could not load SST Bucket component. Make sure you are running this in an SST project with .sst folder available.'
		);
	}
}

export interface MyBucketArgs {
	/**
	 * A prefix to add to the bucket name for organization
	 */
	prefix: string;
	/**
	 * Enable public read access for all the files in the bucket.
	 */
	access?: "public" | "cloudfront";
	/**
	 * The CORS configuration for the bucket.
	 */
	cors?: boolean | {
		allowHeaders?: string[];
		allowMethods?: string[];
		allowOrigins?: string[];
		exposeHeaders?: string[];
		maxAge?: string;
	};
	/**
	 * Enable versioning for the bucket.
	 */
	versioning?: boolean;
	/**
	 * Transform how this component creates its underlying resources.
	 */
	transform?: {
		bucket?: any;
		cors?: any;
		policy?: any;
		versioning?: any;
		publicAccessBlock?: any;
	};
}

/**
 * A custom bucket component that extends SST's bucket functionality with a prefix.
 * Make sure to call initMyBucket() before using this component.
 */
export class MyBucket {
	private bucket: any;
	public readonly prefix: string;
	private readonly originalName: string;

	constructor(
		name: string,
		args: MyBucketArgs,
		opts?: ComponentResourceOptions,
	) {
		if (!sstContext) {
			throw new Error(
				'MyBucket package not initialized. Call initMyBucket(context) first.'
			);
		}

		if (!BucketClass) {
			throw new Error(
				'SST Bucket class not loaded. Make sure initMyBucket() was called successfully.'
			);
		}

		this.prefix = args.prefix;
		this.originalName = name;

		// Apply the prefix to the bucket name using transform
		const prefixedArgs: any = {
			...args,
			transform: {
				...args.transform,
				bucket: (bucketArgs: any, opts: any, resourceName: string) => {
					// Apply prefix to the bucket name
					if (args.prefix) {
						bucketArgs.bucket = `${args.prefix}-${name.toLowerCase()}`;
					}
					// Apply any existing bucket transform
					if (args.transform?.bucket) {
						if (typeof args.transform.bucket === 'function') {
							args.transform.bucket(bucketArgs, opts, resourceName);
						} else {
							Object.assign(bucketArgs, args.transform.bucket);
						}
					}
				},
			},
		};

		// Create the SST Bucket instance
		this.bucket = new BucketClass(name, prefixedArgs, opts);
	}

	/**
	 * The generated name of the S3 Bucket.
	 */
	public get name() {
		return this.bucket.name;
	}

	/**
	 * The domain name of the bucket.
	 */
	public get domain() {
		return this.bucket.domain;
	}

	/**
	 * The ARN of the S3 Bucket.
	 */
	public get arn() {
		return this.bucket.arn;
	}

	/**
	 * The underlying resources this component creates.
	 */
	public get nodes() {
		return this.bucket.nodes;
	}

	/**
	 * Get the full prefixed name of the bucket
	 */
	public getPrefixedName(): string {
		return this.prefix ? `${this.prefix}-${this.originalName}` : this.originalName;
	}

	/**
	 * Subscribe to event notifications from this bucket.
	 */
	public notify(args: any) {
		return this.bucket.notify(args);
	}

	/**
	 * Get the SST context used to initialize this package
	 */
	public static getContext(): SSTContext | null {
		return sstContext;
	}

	/**
	 * Reference an existing bucket with the given bucket name.
	 */
	public static get(
		name: string,
		bucketName: string,
		opts?: ComponentResourceOptions,
	) {
		if (!BucketClass) {
			throw new Error(
				'SST Bucket class not loaded. Make sure initMyBucket() was called successfully.'
			);
		}
		return BucketClass.get(name, bucketName, opts);
	}
} 