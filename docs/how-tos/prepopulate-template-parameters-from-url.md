# Pre-populate template parameters from a URL

Workflow template forms can be pre-populated using URL query parameters. This is useful for bookmarking common configurations, sharing pre-configured templates, integrating with external systems, and reproducing submissions without entering the same values manually.

Users can review and edit all pre-populated values before submitting the workflow.

## Simple parameters

Strings, numbers, booleans, and enum values can be added directly to the URL.

For example:

```text
/templates/xrf-tomography?outputFolder=testing&alignmentBand=15&normalise=true
```

The first parameter follows `?`. Add further parameters using `&`.

```text
?outputFolder=testing&alignmentBand=15&normalise=true
```

Parameter names and enum values are case-sensitive and must match the template parameter schema. For the XRF tomography template, examples include:

```text
elementToAlign=H
transitionToAlign=Ka
alignmentSection=top
```

## Array and object parameters

Array and object parameters must be supplied as valid JSON. The JSON must be URL-encoded before being added to the URL.

### Multiple edges

The decoded JSON value for two edges is:

```json
[
  {
    "edgeElement": "Tl",
    "edgeTransition": "La"
  },
  {
    "edgeElement": "Ga",
    "edgeTransition": "Ka"
  }
]
```

The URL-encoded value can be used as follows:

```text
/templates/xrf-tomography?multiEdge=%5B%7B%22edgeElement%22%3A%22Tl%22%2C%22edgeTransition%22%3A%22La%22%7D%2C%7B%22edgeElement%22%3A%22Ga%22%2C%22edgeTransition%22%3A%22Ka%22%7D%5D
```

### Multiple scans

The decoded JSON value for two scan ranges is:

```json
[
  {
    "multiScan": {
      "start": 436147,
      "end": 436230,
      "excluded": []
    }
  },
  {
    "multiScan": {
      "start": 436300,
      "end": 436350,
      "excluded": []
    }
  }
]
```

The URL-encoded value can be used as follows:

```text
/templates/xrf-tomography?multiScan=%5B%7B%22multiScan%22%3A%7B%22start%22%3A436147%2C%22end%22%3A436230%2C%22excluded%22%3A%5B%5D%7D%7D%2C%7B%22multiScan%22%3A%7B%22start%22%3A436300%2C%22end%22%3A436350%2C%22excluded%22%3A%5B%5D%7D%7D%5D
```

## Single-item arrays

A parameter whose schema type is `array` must still use a JSON array when it contains only one item.

Correct:

```json
[
  {
    "edgeElement": "Tl",
    "edgeTransition": "La"
  }
]
```

Incorrect:

```json
{
  "edgeElement": "Tl",
  "edgeTransition": "La"
}
```

The first value is an array containing one object. The second value is an object and is rejected when the schema expects an array.

## Generate a URL with Python

The following script builds a URL and performs the required JSON and URL encoding:

```python
import json
import urllib.parse

BASE_URL = "https://workflows.diamond.ac.uk/templates/xrf-tomography"


def encode_param(value):
    return urllib.parse.quote(
        json.dumps(value, separators=(",", ":"))
    )


multi_edge = [
    {
        "edgeElement": "Tl",
        "edgeTransition": "La",
    },
    {
        "edgeElement": "Ga",
        "edgeTransition": "Ka",
    },
]

multi_scan = [
    {
        "multiScan": {
            "start": 436147,
            "end": 436230,
            "excluded": [],
        },
    },
    {
        "multiScan": {
            "start": 436300,
            "end": 436350,
            "excluded": [],
        },
    },
]

parameters = {
    "outputFolder": "testing",
    "elementToAlign": "H",
    "transitionToAlign": "Ka",
    "alignmentSection": "top",
    "alignmentBand": "15",
    "normalise": "true",
    "stacking": "false",
    "multiEdge": encode_param(multi_edge),
    "multiScan": encode_param(multi_scan),
}

query = "&".join(
    f"{key}={value}"
    for key, value in parameters.items()
)

print(f"{BASE_URL}?{query}")
```

Run the script with:

```bash
python build_url.py
```

Copy the generated URL into a browser to open the pre-populated template form.

## Validation and error handling

- URL parameters override values reused from an existing workflow.
- Parameters that are not present in the template schema are ignored.
- Invalid JSON values for array or object parameters are ignored.
- An object is rejected when the schema expects an array.
- An array is rejected when the schema expects an object.
- Both single-item and multi-item arrays are supported.
- Template schema validation still applies after the form is populated.
- Enum values must exactly match an allowed schema value.
- Pre-populated values remain editable before submission.

## Security consideration

Query parameters can appear in browser history, bookmarks, server logs, and shared links. Do not include passwords, access tokens, secrets, or other sensitive values in a template URL.
