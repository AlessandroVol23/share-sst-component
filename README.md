# MyBucket - Example SST Component Sharing

**⚠️ This is an experimental example showcasing how to share and abstract SST v3 components across projects.** 

This package demonstrates one approach to creating reusable SST components that can be shared between teams and projects. It extends SST's built-in Bucket component with prefix functionality as a proof of concept.

## Purpose & Scope

This project serves as an **exampl** on how to share SST components.
This is done by bundling the `.sst` packages. 

**This is not production-ready** and serves primarily as a foundation for further development and experimentation.

## Known Issues & Limitations

### 🚨 Current Challenges

- **Version Mismatches**: SST version differences between this package and consuming apps can cause conflicts
- **Pulumi Version Issues**: Different Pulumi versions may lead to compatibility problems  
- **Large Package Size**: Including SST dependencies makes the package unnecessarily large
- **Type Safety**: Current implementation uses `any` types in several places, reducing type safety
- **Global Variable Pollution**: Sets global `$app` and `$dev` variables which could conflict

## Local Development & Testing

Since this is an experimental package, focus on local testing rather than publishing:

### Method 1: Using npm link (Recommended for active development)

1. **In this package directory:**
   ```bash
   npm run build
   npm link
   ```

2. **In your SST project directory:**
   ```bash
   npm link @awsfundamentals/my-sst-bucket
   ```

## Usage Example

### 1. Initialize the Package

In your test SST project's `sst.config.ts`:

```typescript
import { initMyBucket, MyBucket } from "@awsfundamentals/my-sst-bucket";

export default $config({
  app(input) {
    return {
      name: "test-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Initialize the package with SST context
    initMyBucket({
      app: {
        name: $app.name,
        stage: $app.stage,
      },
      dev: $dev,
    });

    // Test the custom bucket component
    const bucket = new MyBucket("TestBucket", {
      prefix: "example",
      access: "public",
      versioning: true,
    });

    return {
      bucketName: bucket.name,
      bucketArn: bucket.arn,
      prefixedName: bucket.getPrefixedName(), // "example-TestBucket"
    };
  },
});
```

### 2. Test the Implementation

```bash
# In your test SST project
sst dev
```

## API Reference

### `initMyBucket(context: SSTContext)`

**Must be called before using MyBucket components.** Initializes global SST variables.

```typescript
initMyBucket({
  app: {
    name: $app.name,    // SST app name
    stage: $app.stage,  // SST app stage
  },
  dev: $dev,           // SST dev mode
});
```

### `MyBucket`

Example component that wraps SST's Bucket with prefix functionality.

```typescript
const bucket = new MyBucket("Storage", {
  prefix: "team-alpha",        // Required: prefix for bucket name
  access?: "public",           // Optional: public access
  versioning?: true,           // Optional: enable versioning
  cors?: { /* config */ },     // Optional: CORS settings
  transform?: { /* config */ } // Optional: transform resources
});
```

**Properties:**
- `name` - Actual S3 bucket name (Output<string>)
- `arn` - Bucket ARN (Output<string>)  
- `domain` - Bucket domain (Output<string>)
- `prefix` - Prefix used (string)

**Methods:**
- `getPrefixedName()` - Display name with prefix
- `notify(args)` - Subscribe to bucket events

## Testing Your Changes

1. **Make changes to the package**
2. **Rebuild:**
   ```bash
   npm run build
   ```
3. **Test in your SST app:**
   ```bash
   sst dev
   ```

Changes are reflected immediately with npm link!

## Unlinking When Done

**In your SST project:**
```bash
npm unlink @awsfundamentals/my-sst-bucket
npm install  # Restore normal dependencies
```

**In the package directory:**
```bash
npm unlink
```

## Production Considerations

**This package is not ready for production use.** If you want to publish similar components:

1. **Resolve version compatibility issues**
2. **Improve type safety throughout** 
3. **Optimize bundle size**

When ready for production (needs to be tested still):
```bash
npm run build
npm login  
npm publish --access public
```


---

**This is an experimental example. Use at your own risk and expect to encounter issues that need resolution for production use.** 


(yes this readme is ai generated)