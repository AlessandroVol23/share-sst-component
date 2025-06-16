# MyBucket - Custom SST Bucket Component

A custom S3 bucket component for SST v3 that adds prefix functionality to organize your buckets.

## Installation

```bash
npm install @awsfundamentals/my-sst-bucket
```

## Usage

### 1. Initialize the package in your SST app

First, initialize the package with your SST context in your `sst.config.ts`:

```typescript
import { initMyBucket, MyBucket } from "@awsfundamentals/my-sst-bucket";

export default $config({
  app(input) {
    return {
      name: "my-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Initialize the MyBucket package with SST context
    initMyBucket({
      app: {
        name: $app.name,
        stage: $app.stage,
      },
      dev: $dev,
    });

    // Now you can use MyBucket components
    const bucket = new MyBucket("UserAssets", {
      prefix: "myapp",
      access: "public",
      versioning: true,
    });

    return {
      bucketName: bucket.name,
      bucketArn: bucket.arn,
    };
  },
});
```

### 2. Use the component

```typescript
const bucket = new MyBucket("UserAssets", {
  prefix: "myapp",           // Required: adds prefix to bucket name
  access: "public",          // Optional: enable public read access
  versioning: true,          // Optional: enable versioning
  cors: {                    // Optional: CORS configuration
    allowOrigins: ["https://myapp.com"],
    allowMethods: ["GET", "POST", "PUT"]
  }
});

// Access bucket properties
console.log(bucket.name);              // The actual S3 bucket name
console.log(bucket.getPrefixedName()); // "myapp-UserAssets"
console.log(bucket.arn);               // The bucket ARN
console.log(bucket.domain);            // The bucket domain
```

### 3. Link to other resources

You can link the bucket to other SST resources just like regular SST components:

```typescript
new sst.aws.Nextjs("MyWeb", {
  link: [bucket]
});
```

Then use it in your app:

```typescript
import { Resource } from "sst";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const command = new PutObjectCommand({
  Key: "file.txt",
  Bucket: Resource.UserAssets.name // This will be the actual bucket name
});
await getSignedUrl(new S3Client({}), command);
```

## API Reference

### `initMyBucket(context: SSTContext)`

Initialize the package with SST context. Must be called before using any MyBucket components.

**Parameters:**
- `context.app.name` - Your SST app name
- `context.app.stage` - Your SST app stage
- `context.dev` - Whether running in dev mode

### `MyBucket`

**Constructor:** `new MyBucket(name: string, args: MyBucketArgs, opts?: ComponentResourceOptions)`

**Properties:**
- `name` - The actual S3 bucket name
- `arn` - The bucket ARN
- `domain` - The bucket domain
- `prefix` - The prefix used for this bucket

**Methods:**
- `getPrefixedName()` - Returns the prefixed name format

### `MyBucketArgs`

- `prefix: string` - **Required.** Prefix to add to bucket name
- `access?: "public" | "cloudfront"` - Enable public access
- `versioning?: boolean` - Enable versioning
- `cors?: boolean | CorsConfig` - CORS configuration
- `transform?` - Transform underlying resources

## Examples

### Basic bucket with prefix
```typescript
const bucket = new MyBucket("Assets", {
  prefix: "prod"
});
// Creates bucket: "prod-assets"
```

### Public bucket with versioning
```typescript
const bucket = new MyBucket("PublicFiles", {
  prefix: "cdn",
  access: "public",
  versioning: true
});
```

### Development vs Production
```typescript
const bucket = new MyBucket("Data", {
  prefix: $app.stage, // Use stage as prefix
  versioning: $app.stage === "production"
});
```

## License

MIT 