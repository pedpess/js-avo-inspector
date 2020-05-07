import { AvoInspector } from "./AvoInspector";
import { AvoInspectorEnv } from "./AvoInspectorEnv";

test('Parses basic types', () => {
    // Given
    let eventProperties = { "prop0": true, "prop1": 1, "prop2": "str", 
    "prop3": 0.5, "prop4": undefined, "prop5": null,
    "prop6": { "an": "object" }, "prop7": ["a", "list", {"obj in list": true, "int field": 1}, ["another", "list"]] };
  
    // When
    let inspector = new AvoInspector("apiKey", AvoInspectorEnv.Dev);
    let res = JSON.parse(inspector.extractSchema(eventProperties));
  
    expect(res[0]["propertyValue"]).toBe("boolean");
    expect(res[1]["propertyValue"]).toBe("int");
    expect(res[2]["propertyValue"]).toBe("string");
    expect(res[3]["propertyValue"]).toBe("float");
    expect(res[4]["propertyValue"]).toBe("null");
    expect(res[5]["propertyValue"]).toBe("null");
    expect(res[6]["propertyValue"]).toBe("object");
    expect(res[6]["children"]).toMatchObject([{"propertyName": "an", "propertyValue": "string"}]);

    expect(res[7]["propertyValue"]).toBe("list");
    expect(res[7]["children"]).toMatchObject(["string", [{"propertyName": "obj in list", "propertyValue": "boolean"},
      {"propertyName": "int field", "propertyValue": "int"}], ["string"]]);
  });
