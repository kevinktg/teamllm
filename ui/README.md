# TEAM LLM — ARIA Live2D UI

Steps:

- Install deps

```
cd ui
npm i
```

- Configure API URL
  Create `.env` and set:

```
VITE_API_URL=http://localhost:8080
```

- Place Live2D core + model
  Put `live2dcubismcore.min.js` in `ui/public/lib/`
  Put ARIA folder in `ui/public/models/aria/` with `aria.model3.json`

- Run

```
npm run dev
```
