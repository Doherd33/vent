# Argilla Annotation Setup

Argilla provides human-in-the-loop annotation for evaluating and improving Vent's AI agents.

## Quick Start

### 1. Run Argilla locally (Docker)

```bash
docker run -d --name argilla \
  -p 6900:6900 \
  -e ARGILLA_AUTH_SECRET_KEY=your-secret \
  argilla/argilla-server:latest
```

Open http://localhost:6900 (default user: `argilla` / password: `1234`).

### 2. Export data from Vent

```bash
# Export feedback sessions
cd server
node evals/argilla-export.js

# Export agent outputs from LangSmith
node evals/argilla-export.js --type agent-outputs

# Filter by date
node evals/argilla-export.js --since 2025-06-01
```

### 3. Import into Argilla

```python
pip install argilla

import argilla as rg
import json

rg.init(api_url="http://localhost:6900", api_key="argilla.apikey")

# Load exported data
with open("server/evals/exports/feedback-2025-07-11.json") as f:
    data = json.load(f)

# Create dataset from schema
schema = data["schema"]
fields = [rg.TextField(name=f["name"], title=f["title"]) for f in schema["fields"]]
questions = []
for q in schema["questions"]:
    if q["type"] == "label_selection":
        questions.append(rg.LabelQuestion(name=q["name"], title=q["title"], labels=q["labels"]))
    elif q["type"] == "rating":
        questions.append(rg.RatingQuestion(name=q["name"], title=q["title"], values=q["values"]))
    elif q["type"] == "multi_label_selection":
        questions.append(rg.MultiLabelQuestion(name=q["name"], title=q["title"], labels=q["labels"]))
    elif q["type"] == "text":
        questions.append(rg.TextQuestion(name=q["name"], title=q["title"], required=q.get("required", False)))

dataset = rg.FeedbackDataset(fields=fields, questions=questions, guidelines=schema["guidelines"])

records = [rg.FeedbackRecord(fields=r["fields"], metadata=r["metadata"]) for r in data["records"]]
dataset.add_records(records)
dataset.push_to_argilla(name=schema["name"], workspace="default")
```

## Datasets

### 1. Feedback Sessions (`vent-operator-feedback`)

Annotators review Charlie's feedback conversation analysis to verify:
- **Sentiment** accuracy (positive/negative/neutral/mixed)
- **Severity** appropriateness (low/medium/high/critical)
- **Category** completeness (UX, bug, missing_feature, etc.)
- **Summary** quality (1-5 rating)

### 2. Agent Outputs (`vent-agent-outputs`)

Annotators review agent responses to rate:
- **Accuracy** (1-5)
- **Completeness** (1-5)
- **Issues** found (hallucination, wrong_priority, missing_sop_ref, etc.)

## Workflow

1. QA team reviews exported sessions weekly
2. Annotations feed back into eval datasets (`evals/datasets/*.json`)
3. New test cases are added when issues are found
4. Run `npm run eval` to check agent quality against updated datasets
5. Prompt changes are tested via regression before deployment

## CI Integration

```yaml
# In your CI pipeline
- name: Run evals
  run: cd server && npm run eval
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```
