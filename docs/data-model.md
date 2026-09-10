# Data model

Project exports/imports use a versioned envelope:

```ts
{ schemaVersion, applicationVersion, regulation: { id, version }, userData }
```

`schemaVersion` controls the serialized-data contract. `applicationVersion` identifies the producing application. `regulation` pins the dataset used by the project. `userData` is an opaque record until feature-specific schemas are approved.
