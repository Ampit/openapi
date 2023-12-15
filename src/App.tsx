import "./styles.css";
import { useEffect, useState } from "react";
import Select from "react-select";
import { OpenAPIV3 } from "openapi-types";
import { pick } from "lodash";
import ReactJson from "react-json-view";

function generateSelectOptionsFromSpec(spec: OpenAPIV3.Document) {
  const items: { value: any; label: string }[] = [];
  const paths = spec.paths;

  for (const path in paths) {
    const path_object = paths[path];
    const methods = [
      OpenAPIV3.HttpMethods.POST,
      OpenAPIV3.HttpMethods.GET,
      OpenAPIV3.HttpMethods.PUT,
      OpenAPIV3.HttpMethods.DELETE,
    ];
    const operations = pick(path_object, methods);

    for (const method_string in operations) {
      const method = method_string as OpenAPIV3.HttpMethods;
      const operation = operations[method];

      const item = {
        label: path + ` (${method.toUpperCase()})`,
        value: operation,
      };

      items.push(item);
    }
  }
  return items;
}

interface FormField {
  name: string;
  input_type: string;
  required: boolean;
  param_type: string;
}

function createFormFields(operation: any) {
  let fields: FormField[] = [];

  // Extract query and path parameters
  operation.parameters?.forEach((param: any) => {
    if (param.in === "query" || param.in === "path") {
      const field: FormField = {
        name: param.name,
        input_type: "text", // Simplification, ideally should be based on param schema
        required: param.required ?? false,
        param_type: param.in,
      };
      fields.push(field);
    }
  });

  // Extract headers
  operation.parameters?.forEach((param: any) => {
    if (param.in === "header") {
      const field: FormField = {
        name: param.name,
        input_type: "text", // Headers are generally text
        required: param.required ?? false,
        param_type: param.in,
      };
      fields.push(field);
    }
  });

  // Extract request body fields
  if (operation.requestBody && "content" in operation.requestBody) {
    const content: any = operation.requestBody.content;
    const mediaType = content["application/x-www-form-urlencoded"]; // Assuming JSON. Adjust as needed.
    if (mediaType && mediaType.schema) {
      // Handle schema (simple case)
      if (mediaType.schema.type === "object" && mediaType.schema.properties) {
        for (let property in mediaType.schema.properties) {
          fields.push({
            name: property,
            input_type: "text", // Simplification, ideally should be based on schema type
            required: mediaType.schema.required?.includes(property) ?? false,
            param_type: "body",
          });
        }
      }
      // For more complex schemas, you'll need to handle them accordingly
    }
  }

  return fields;
}

export default function App() {
  const [open_api, setOpenApi] = useState<OpenAPIV3.Document>();
  const [options, setOptions] = useState<any>([]);
  const [selected, setSelected] = useState<any>();
  const [formFields, setFormFields] = useState<FormField[]>([]);

  function handleSelectChange(selectedOption: any | null) {
    if (!selectedOption) return;
    setSelected(selectedOption);
    const fields = createFormFields(selectedOption.value);
    console.log("Field", fields);
    setFormFields(fields);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // To iterate over all values:
    for (let [key, value] of formData.entries()) {
      console.log(key + "=", value);
    }
  }

  useEffect(() => {
    async function loadOpenApiSpec() {
      const response = await fetch(
        "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json",
      );
      const contents = await response.json();
      const opts = generateSelectOptionsFromSpec(contents);
      console.log("Spec", contents);
      setOpenApi(contents);
      setOptions(opts);
    }

    loadOpenApiSpec();
  }, []);

  return (
    <div className="App">
      <h1>Stripe</h1>
      <Select options={options} onChange={handleSelectChange} />
      {open_api && selected && (
        <>
          <form onSubmit={handleSubmit}>
            {formFields.map((field) => (
              <div key={field.name}>
                <label>
                  {field.name} - ({field.param_type.toUpperCase()})
                </label>
                <input
                  type={field.input_type}
                  required={field.required}
                  name={field.name}
                />
              </div>
            ))}
            <button type="submit">Submit</button>
          </form>
          <ReactJson style={{ marginTop: "100px" }} src={selected} collapsed />
        </>
      )}
    </div>
  );
}
