# GitHub upload

Create a new empty GitHub repository named `spatial_sensitivity_lab`, then upload the **contents of this folder** to its root.

Do not upload `node_modules`, `.next` or an enclosing folder. The ZIP already excludes them.

Important new files:

- `public/data/grid_priority.geojson`
- `public/data/evidence.json`
- `public/data/project_context.geojson`
- `scripts/export_web_data.py`

Do not upload these files to the existing `who-gets-cooled-ai-pilot` repository. That site remains unchanged.

After GitHub finishes uploading, confirm the commit and import the new repository into Vercel. The tested production command is `pnpm build`.
