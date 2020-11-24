<div align="center">

# Superbuffer

</div>

---

## Introduction

## Usage API

##

## Caveats

- Schemas must be created in the same order on both the client and server side, unless `id` is specified.
- Uses magic numbers to keep track of schemas, arrays, and nested objects
- Max array length of 65535 (uint16)
- Max number of schemas is 255 (uint8)
- No null or undefined properties (all properties of the schema definition must be present on an object to be serialized)

## License

MIT
