<div align="center">

# Array Buffer Schema

</div>

---

## Caveats

- Uses magic numbers to keep track of schemas, arrays, and nested objects
- Max array length of 65535 (uint16)
- Max number of schemas is 255 (uint8)
- No null or undefined properties (all properties of the schema definition must be present on an object to be serialized)
