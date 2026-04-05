What’s happening is that the **Claude Code CLI defaults to the hosted Anthropic service**, so if you just run `claude-code` it opens the docs instead of talking to Vertex AI. To make it use your GCP project, you need to wire in **gcloud auth + Vertex AI environment variables** so the CLI knows to route requests through Vertex.

Here’s the missing pieces:

---

### 1. Authenticate with gcloud
Run:
```powershell
gcloud auth application-default login
```
This creates local credentials that Vertex AI SDKs (and the Claude Code CLI) can pick up.

---

### 2. Check your project and region
Make sure your active project matches the one where you enabled Claude:
```powershell
gcloud config set project YOUR_PROJECT_ID
gcloud config list
```

---

### 3. Environment variables for Claude Code CLI
In your `.env` (or exported in PowerShell), you need:

```powershell
$env:CLAUDE_CODE_USE_VERTEX="1"
$env:ANTHROPIC_VERTEX_PROJECT_ID="your-project-id"
$env:CLOUD_ML_REGION="global"
$env:VERTEX_REGION_CLAUDE_4_6_SONNET="europe-west1"
$env:ANTHROPIC_DEFAULT_SONNET_MODEL="claude-sonnet-4-6"
```

Make sure PowerShell actually loads these before you run `claude-code`. You can check with:
```powershell
echo $env:CLAUDE_CODE_USE_VERTEX
```

---

### 4. Run the CLI
Now try:
```powershell
claude-code
```
It should open the interactive REPL, but this time requests will go through Vertex AI using your gcloud auth.

---

### 5. Debugging if it still opens docs
- If it still drops you into docs, it means the CLI didn’t detect `CLAUDE_CODE_USE_VERTEX=1`. Double‑check that you’re exporting variables in the same shell session.
- If you see auth errors, confirm that `gcloud auth application-default login` succeeded and that your account has `roles/aiplatform.user`.

---

👉 Once this works, you’ll be able to use Claude Code natively in CLI and VS Code, but all traffic will be billed and routed through your Vertex AI project. Do you want me to show you how to **persist these env vars permanently in Windows** so you don’t have to re‑export them every time you open PowerShell?